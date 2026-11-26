# QA T-google-oauth: PASS WITH NOTES
Branch: feat/google-oauth @ ab29ff5 (HEAD was eb0f678, docs-only commits on top)

## Done-when checklist
- [x] 1. /api/auth/providers: with placeholder creds `{"google":true,"github":false}`; second server with creds unset (port 3202, killed afterwards) `{"google":false,"github":false}`; /api/auth/google then 404, callback redirects `?error=oauth_unavailable`.
- [x] 2. GET /api/auth/google: 302 to accounts.google.com/o/oauth2/v2/auth with client_id=placeholder-id..., redirect_uri=http://localhost:5373/api/auth/google/callback, code_challenge_method=S256, scope=openid+profile+email (plus prompt=select_account). Both cookies `google_oauth_state` / `google_code_verifier`: HttpOnly; Max-Age=600; Path=/api/auth/google; SameSite=Lax (no Secure in dev, isProd gated). Stopped at the redirect.
- [x] 3. Callback: no cookies -> /login?error=oauth_state; mismatched state -> oauth_state; `?error=access_denied` (with and without cookies) -> oauth_cancelled; bogus code + matching state -> oauth_failed (server logged "invalid_client", stayed up, subsequent requests 200). No `token` set-cookie in any case; flow cookies are cleared each time. (Bogus-code case makes a real outbound request to Google's token endpoint, as expected.)
- [x] 4. Login page (UI): "Continue with Google" is `<a href="/api/auth/google">`, "or" divider shown when google enabled. Messages verified for all 6 codes; unknown code (`zzz<b>`) shows "Sign-in failed. Please try again." (rendered as text, no injection). No alert when no error. Keyboard: first Tab lands on the Google link, focus-visible true, 1px `auto` browser-default outline visible. Contrast (antislop tool): error text light red-600 on white 4.83:1 pass; dark red-400 on #171717 6.48:1 pass; button text #262626 on white 15.13:1 pass (button is white in both themes). Phone 375 wide: no horizontal overflow. See notes for minor findings.
  Not browser-verified: UI with google disabled (hiding of button/divider); covered by `providers?.google` conditional in code and the API result in item 1.
- [x] 5. Register via UI and API 201; password login works (200 + token). Login for `nopw@test.localhost` (password_hash NULL) -> 401 `{"error":"Invalid email or password."}`, identical to wrong password and unknown email.
- [x] 6. Valid JWT for a deleted user: /api/auth/me -> 401 `{"error":"Session expired."}` with `set-cookie: token=; Max-Age=0; Path=/`. In the browser with that cookie set, loading `/` ends on /login with the login form (no error screen); cookie gone. A valid user's /me still returns 200.
- [x] 7. Migration applied: `drizzle.__drizzle_migrations` has 2 rows; `oauth_accounts` exists (provider enum, provider_user_id, user_id, created_at); `users.password_hash` is_nullable=YES; users has avatar_url and email_verified_at. Matches migration SQL/schema.ts columns by inspection (did not run drizzle-kit generate to avoid writing files).
- [x] 8. Regression sweep: CI `bun install --frozen-lockfile`, `bun run typecheck` clean, `bun test` 18 pass / 0 fail, client `bun run build` OK (only the existing 1.3 MB chunk-size warning). UI: register -> redirected to workspace list -> Create workspace -> typed text in Notion editor -> added Figma canvas -> added Badge node -> reload: text persisted -> export (GET /api/workspaces/:id/export, 200 application/zip, 13 files incl. Badge.tsx, App.tsx uses Badge) -> Log out -> loading /w/:id redirects to /login. Console: only expected 401s from /auth/me while logged out.

## Bugs (most severe first)
1. [minor] Focus ring on Google button is the browser default (orange ~#e59700, 1px) with no explicit focus-visible style. On the white button this is roughly 2.3:1, under the 3:1 UI bar; the new link has no `focus-visible:` styling while the existing inputs only change border color. Suggest `focus-visible:outline-2 outline-violet-600` (or ring) on the link.
2. [minor] Dark-mode "or" divider text (neutral-500 #737373 on #171717) is 3.78:1, below 4.5:1 for 12px text. Light is 4.74:1 pass. The same neutral-500 is used for pre-existing subtitle/toggle text.
3. [note, pre-existing] The login page is never dark by default: dark mode is class-based (`.dark` set only in Workspace.tsx), so `prefers-color-scheme: dark` still renders the login page light. Dark styles were checked by adding `dark` to <html> manually: all fine.

## Test gaps (findings)
- No test for /api/auth/login with a NULL password_hash, nor for /me with a deleted user; no client test for the error-code messages.

## Not verified
- Real Google round trip, token exchange success, account creation/linking via resolveOAuthUser (needs real credentials; only unit-tested via decideLink in oauth.test.ts).
- Login UI with google disabled; two-tab collab/viewer refusal (editor unchanged by this task).
- Secure flag on cookies in production mode.

## Cleanup
Servers 59652 (API, 3201/1434) and 59654 (Vite 5373) killed by PID; the temp no-creds server on 3202 killed. Test users deleted (3 rows, 0 remain). Browser tab closed. No source files modified.
