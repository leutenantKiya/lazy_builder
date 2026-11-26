import { sign, verify } from "hono/jwt";
import { env } from "../config/env.ts";

export type TokenPayload = { sub: string; email: string };

// Bun.password defaults to argon2id
export const hashPassword = (plain: string) => Bun.password.hash(plain);
export const comparePassword = (plain: string, hash: string) => Bun.password.verify(plain, hash);

export function signToken(payload: TokenPayload): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + env.JWT_EXPIRES_IN_SECONDS;
  return sign({ ...payload, exp }, env.JWT_SECRET, "HS256");
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const payload = await verify(token, env.JWT_SECRET, "HS256");
  return { sub: String(payload.sub), email: String(payload.email) };
}

export const TOKEN_COOKIE = "token";

// pull the JWT out of a raw Cookie header (used by the collab server)
export function tokenFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === TOKEN_COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}
