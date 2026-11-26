import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { z } from "zod";
import { db } from "../db/client.ts";
import { users } from "../db/schema.ts";
import { comparePassword, hashPassword, TOKEN_COOKIE } from "../lib/auth.ts";
import { issueSession } from "../lib/session.ts";
import { body } from "../lib/validate.ts";
import { authenticate, type AuthEnv } from "../middleware/authenticate.ts";

const credentials = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(200),
});
const registration = credentials.extend({ name: z.string().trim().min(1).max(100).optional() });

const router = new Hono<AuthEnv>();

const publicUser = { id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl };

router.post("/register", async (c) => {
  const { email, password, name } = await body(c, registration);
  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .onConflictDoNothing({ target: users.email })
    .returning(publicUser);
  if (!user) return c.json({ error: "Email already registered." }, 409);

  // token is also returned so agents/CLIs can use it as a Bearer token
  const token = await issueSession(c, user);
  return c.json({ user, token }, 201);
});

router.post("/login", async (c) => {
  const { email, password } = await body(c, credentials);
  const row = await db.query.users.findFirst({ where: eq(users.email, email) });
  // same message for both cases so emails can't be enumerated
  // provider-only accounts have no password; same message so it isn't a probe
  if (!row?.passwordHash || !(await comparePassword(password, row.passwordHash))) {
    return c.json({ error: "Invalid email or password." }, 401);
  }
  const user = { id: row.id, email: row.email, name: row.name, avatarUrl: row.avatarUrl };
  const token = await issueSession(c, user);
  return c.json({ user, token });
});

router.post("/logout", (c) => {
  deleteCookie(c, TOKEN_COOKIE, { path: "/" });
  return c.body(null, 204);
});

router.get("/me", authenticate, async (c) => {
  const [user] = await db.select(publicUser).from(users).where(eq(users.id, c.var.user.sub));
  // valid token for a deleted account: treat as logged out and drop the cookie
  if (!user) {
    deleteCookie(c, TOKEN_COOKIE, { path: "/" });
    return c.json({ error: "Session expired." }, 401);
  }
  return c.json({ user });
});

export default router;
