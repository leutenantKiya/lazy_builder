import { and, eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { oauthAccounts, users, type OAuthProvider } from "../db/schema.ts";

export type ProviderProfile = {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
};

type Existing = {
  byProvider: { userId: string } | null;
  byEmail: { id: string; emailVerifiedAt: Date | null } | null;
};

export type LinkDecision =
  | { action: "login"; userId: string }
  | { action: "link"; userId: string }
  | { action: "create" }
  | { action: "reject"; reason: "email_unverified" | "account_exists" };

// Pure so it can be tested without a DB. The rule that matters: never attach a
// provider to an account whose email nobody has verified (password signups),
// or someone could pre-register a victim's email and later share their account.
export function decideLink(profile: Pick<ProviderProfile, "emailVerified">, existing: Existing): LinkDecision {
  if (existing.byProvider) return { action: "login", userId: existing.byProvider.userId };
  if (!profile.emailVerified) return { action: "reject", reason: "email_unverified" };
  if (!existing.byEmail) return { action: "create" };
  if (existing.byEmail.emailVerifiedAt) return { action: "link", userId: existing.byEmail.id };
  return { action: "reject", reason: "account_exists" };
}

export async function resolveOAuthUser(
  profile: ProviderProfile,
): Promise<{ ok: true; user: { id: string; email: string } } | { ok: false; reason: "email_unverified" | "account_exists" }> {
  const email = profile.email.toLowerCase();
  const byProvider = await db.query.oauthAccounts.findFirst({
    where: and(eq(oauthAccounts.provider, profile.provider), eq(oauthAccounts.providerUserId, profile.providerUserId)),
    columns: { userId: true },
  });
  const byEmail = byProvider
    ? null
    : ((await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { id: true, emailVerifiedAt: true },
      })) ?? null);

  const decision = decideLink(profile, { byProvider: byProvider ?? null, byEmail });
  switch (decision.action) {
    case "reject":
      return { ok: false, reason: decision.reason };
    case "login": {
      const user = await db.query.users.findFirst({ where: eq(users.id, decision.userId), columns: { id: true, email: true } });
      return user ? { ok: true, user } : { ok: false, reason: "account_exists" };
    }
    case "link": {
      await db
        .insert(oauthAccounts)
        .values({ provider: profile.provider, providerUserId: profile.providerUserId, userId: decision.userId })
        .onConflictDoNothing();
      return { ok: true, user: { id: decision.userId, email } };
    }
    case "create": {
      const user = await db.transaction(async (tx) => {
        const [u] = await tx
          .insert(users)
          .values({ email, name: profile.name, avatarUrl: profile.avatarUrl, emailVerifiedAt: new Date() })
          .returning({ id: users.id, email: users.email });
        await tx.insert(oauthAccounts).values({ provider: profile.provider, providerUserId: profile.providerUserId, userId: u!.id });
        return u!;
      });
      return { ok: true, user };
    }
  }
}
