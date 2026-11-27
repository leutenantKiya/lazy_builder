import { beforeAll, describe, expect, test } from "bun:test";
import type { Hono } from "hono";

// env is read at import time; these never reach a real DB or Google
let app: Hono;
let decideLink: typeof import("../lib/oauth.ts").decideLink;

beforeAll(async () => {
  Object.assign(process.env, {
    DATABASE_URL: "postgres://test:test@127.0.0.1:1/none",
    JWT_SECRET: "x".repeat(40),
    APP_URL: "http://app.test",
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
  });
  app = (await import("../app.ts")).default;
  decideLink = (await import("../lib/oauth.ts")).decideLink;
});

describe("decideLink", () => {
  const verified = { emailVerified: true };

  test("known provider account logs in, even if the email changed", () => {
    expect(decideLink({ emailVerified: false }, { byProvider: { userId: "u1" }, byEmail: null })).toEqual({
      action: "login",
      userId: "u1",
    });
  });

  test("new verified email creates an account", () => {
    expect(decideLink(verified, { byProvider: null, byEmail: null })).toEqual({ action: "create" });
  });

  test("links only to an account whose email was verified by a provider", () => {
    expect(decideLink(verified, { byProvider: null, byEmail: { id: "u2", emailVerifiedAt: new Date() } })).toEqual({
      action: "link",
      userId: "u2",
    });
  });

  test("never links to an unverified password account (pre-hijack guard)", () => {
    expect(decideLink(verified, { byProvider: null, byEmail: { id: "u3", emailVerifiedAt: null } })).toEqual({
      action: "reject",
      reason: "account_exists",
    });
  });

  test("rejects emails the provider hasn't verified", () => {
    expect(decideLink({ emailVerified: false }, { byProvider: null, byEmail: null })).toEqual({
      action: "reject",
      reason: "email_unverified",
    });
  });
});

describe("google oauth routes", () => {
  test("providers reports google as enabled", async () => {
    const res = await app.request("/api/auth/providers");
    expect(await res.json()).toEqual({ google: true, github: false });
  });

  test("start redirects to Google with PKCE and sets short-lived flow cookies", async () => {
    const res = await app.request("/api/auth/google");
    expect(res.status).toBe(302);
    const url = new URL(res.headers.get("location")!);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://app.test/api/auth/google/callback");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toBe("openid profile email");

    const cookies = res.headers.getSetCookie();
    const state = cookies.find((c) => c.startsWith("google_oauth_state="))!;
    expect(state).toContain("HttpOnly");
    expect(state).toContain("Path=/api/auth/google");
    expect(state).toContain("Max-Age=600");
    expect(state.split(";")[0]!.split("=")[1]).toBe(url.searchParams.get("state")!);
    expect(cookies.some((c) => c.startsWith("google_code_verifier="))).toBe(true);
  });

  test("callback rejects a state that doesn't match the cookie", async () => {
    const res = await app.request("/api/auth/google/callback?code=abc&state=forged", {
      headers: { cookie: "google_oauth_state=real; google_code_verifier=v" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://app.test/login?error=oauth_state");
    // no session was issued
    expect(res.headers.getSetCookie().some((c) => c.startsWith("token="))).toBe(false);
  });

  test("callback without flow cookies is rejected", async () => {
    const res = await app.request("/api/auth/google/callback?code=abc&state=s");
    expect(res.headers.get("location")).toBe("http://app.test/login?error=oauth_state");
  });

  test("user cancelling on Google's screen comes back with a friendly error", async () => {
    const res = await app.request("/api/auth/google/callback?error=access_denied&state=s", {
      headers: { cookie: "google_oauth_state=s; google_code_verifier=v" },
    });
    expect(res.headers.get("location")).toBe("http://app.test/login?error=oauth_cancelled");
  });
});
