import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { env, isProd } from "../config/env.ts";
import { db } from "../db/client.ts";
import { users } from "../db/schema.ts";
import { comparePassword, hashPassword, signToken, TOKEN_COOKIE } from "../lib/auth.ts";
import { body } from "../lib/validate.ts";
import { authenticate, type AuthEnv } from "../middleware/authenticate.ts";

const credentials = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(200),
});
const registration = credentials.extend({ name: z.string().trim().min(1).max(100).optional() });

const router = new Hono<AuthEnv>();

const publicUser = { id: users.id, email: users.email, name: users.name };

async function issue(c: Parameters<typeof setCookie>[0], user: { id: string; email: string }) {
  const token = await signToken({ sub: user.id, email: user.email });
  setCookie(c, TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax",
    path: "/",
    maxAge: env.JWT_EXPIRES_IN_SECONDS,
  });
  return token;
}

router.post("/register", async (c) => {
  const { email, password, name } = await body(c, registration);
  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .onConflictDoNothing({ target: users.email })
    .returning(publicUser);
  if (!user) return c.json({ error: "Email already registered." }, 409);

  // token is also returned so agents/CLIs can use it as a Bearer token
  const token = await issue(c, user);
  return c.json({ user, token }, 201);
});

router.post("/login", async (c) => {
  const { email, password } = await body(c, credentials);
  const row = await db.query.users.findFirst({ where: eq(users.email, email) });
  // same message for both cases so emails can't be enumerated
  if (!row || !(await comparePassword(password, row.passwordHash))) {
    return c.json({ error: "Invalid email or password." }, 401);
  }
  const user = { id: row.id, email: row.email, name: row.name };
  const token = await issue(c, user);
  return c.json({ user, token });
});

router.post("/logout", (c) => {
  deleteCookie(c, TOKEN_COOKIE, { path: "/" });
  return c.body(null, 204);
});

router.get("/me", authenticate, async (c) => {
  const [user] = await db.select(publicUser).from(users).where(eq(users.id, c.var.user.sub));
  if (!user) return c.json({ error: "User not found." }, 404);
  return c.json({ user });
});

export default router;
