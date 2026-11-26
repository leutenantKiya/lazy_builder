import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { TOKEN_COOKIE, verifyToken, type TokenPayload } from "../lib/auth.ts";

export type AuthEnv = { Variables: { user: TokenPayload } };

// Reads the JWT from the `token` cookie (browser) or a Bearer header (agents/CLI)
// and attaches the payload to c.var.user. 401 when missing or invalid.
export const authenticate = createMiddleware<AuthEnv>(async (c, next) => {
  const bearer = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const token = getCookie(c, TOKEN_COOKIE) ?? bearer;
  if (!token) return c.json({ error: "Authentication required." }, 401);

  try {
    c.set("user", await verifyToken(token));
  } catch {
    return c.json({ error: "Invalid or expired token." }, 401);
  }
  await next();
});
