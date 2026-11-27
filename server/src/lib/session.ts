import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { env, isProd } from "../config/env.ts";
import { signToken, TOKEN_COOKIE } from "./auth.ts";

// sets the httpOnly session cookie; the token is also returned for agents/CLIs
export async function issueSession(c: Context, user: { id: string; email: string }) {
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
