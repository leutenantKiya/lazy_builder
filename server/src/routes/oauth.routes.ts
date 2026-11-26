import { decodeIdToken, generateCodeVerifier, generateState, Google } from "arctic";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { env, isProd } from "../config/env.ts";
import { resolveOAuthUser } from "../lib/oauth.ts";
import { issueSession } from "../lib/session.ts";

const router = new Hono();

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${env.APP_URL}/api/auth/google/callback`)
    : null;

// the login page asks which buttons to show
router.get("/providers", (c) => c.json({ google: google !== null, github: false }));

const STATE_COOKIE = "google_oauth_state";
const VERIFIER_COOKIE = "google_code_verifier";
const flowCookie = { httpOnly: true, secure: isProd, sameSite: "Lax", path: "/api/auth/google", maxAge: 600 } as const;

const back = (error?: string) => `${env.APP_URL}${error ? `/login?error=${error}` : "/"}`;

router.get("/google", (c) => {
  if (!google) return c.json({ error: "Google sign-in isn't configured." }, 404);
  const state = generateState();
  const verifier = generateCodeVerifier();
  setCookie(c, STATE_COOKIE, state, flowCookie);
  setCookie(c, VERIFIER_COOKIE, verifier, flowCookie);
  const url = google.createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
  url.searchParams.set("prompt", "select_account");
  return c.redirect(url.toString(), 302);
});

// claims we rely on; Google's token endpoint returns the ID token over TLS
// straight to us, so per OIDC it doesn't need a separate signature check here
const googleClaims = z.object({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean().default(false),
  name: z.string().optional(),
  picture: z.url().optional(),
});

router.get("/google/callback", async (c) => {
  if (!google) return c.redirect(back("oauth_unavailable"), 302);

  const { code, state, error } = c.req.query();
  const storedState = getCookie(c, STATE_COOKIE);
  const verifier = getCookie(c, VERIFIER_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: flowCookie.path });
  deleteCookie(c, VERIFIER_COOKIE, { path: flowCookie.path });

  // user pressed cancel on Google's screen
  if (error) return c.redirect(back("oauth_cancelled"), 302);
  if (!code || !state || !storedState || !verifier || state !== storedState) {
    return c.redirect(back("oauth_state"), 302);
  }

  let claims: z.infer<typeof googleClaims>;
  try {
    const tokens = await google.validateAuthorizationCode(code, verifier);
    claims = googleClaims.parse(decodeIdToken(tokens.idToken()));
  } catch (e) {
    console.error("[oauth:google] code exchange failed", e instanceof Error ? e.message : e);
    return c.redirect(back("oauth_failed"), 302);
  }

  const result = await resolveOAuthUser({
    provider: "google",
    providerUserId: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified,
    name: claims.name ?? null,
    avatarUrl: claims.picture ?? null,
  });
  if (!result.ok) return c.redirect(back(result.reason), 302);

  await issueSession(c, result.user);
  return c.redirect(back(), 302);
});

export default router;
