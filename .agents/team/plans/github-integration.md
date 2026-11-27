# Plan: GitHub integration

Status: proposed (not started) · Owner: orchestrator · Written: 2026-11-26

## Goal

People can send what they built in Lazy Builder straight to GitHub: pick a repo, and the exported project lands as a commit on a new branch with a pull request they can review and merge. Later, agents can do the same through MCP.

Today the only way out is the Export zip. This removes the "unzip, copy, commit, push" step.

## Decision: GitHub App, not an OAuth App or personal tokens

| Option | Access | Token lifetime | Verdict |
|---|---|---|---|
| Personal access token pasted by the user | Whatever the user grants, usually too much | Long-lived, we'd have to store it | No: we'd be holding powerful long-lived secrets |
| OAuth App (`repo` scope) | Every repo the user can see, read and write | Long-lived | No: far too broad for "push to one repo" |
| **GitHub App** | Only the repos the user picks at install time | Installation tokens last 1 hour, minted per request | **Yes** |

The same GitHub App also provides "Sign in with GitHub" (its user authorization flow), so one app covers login and repo access.

App permissions (repository): **Contents: read & write**, **Pull requests: read & write**, **Metadata: read**. Nothing org-wide, no Administration (so we can't create or delete repos; users create the repo on GitHub first). Account permission: **Email addresses: read**, for login.

## Phases

### Phase 1: Sign in with GitHub (small, reuses the Google work)

- `arctic`'s `GitHub` provider, routes `GET /api/auth/github` and `/api/auth/github/callback`, same state cookie pattern as Google (PKCE isn't supported by GitHub's web flow; state check is required).
- GitHub's `/user` email can be empty or unverified. Call `GET /user/emails` and use the **primary + verified** address; if none, reject with `email_unverified`.
- Same linking rule as Google (`decideLink` in `server/src/lib/oauth.ts`): known account logs in; verified email links only to a provider-verified account; never to an unverified password account. The `oauth_provider` enum already includes `github`.
- `/api/auth/providers` returns `github: true` when configured; login page shows "Continue with GitHub".

### Phase 2: Connect a workspace to a repo

- "Connect GitHub" in the workspace toolbar (owners/editors) → GitHub's install page for the App → user picks repos → GitHub redirects back with `installation_id`.
- Verify the installation belongs to this user: use the user-to-server token from the App's user auth and check `GET /user/installations` contains it. Never trust `installation_id` from the query string alone.
- Let the user choose repo, base branch (default: the repo's default branch) and a folder inside the repo (default: repo root, or e.g. `apps/web`).
- New table:
  ```
  github_connections
    workspace_id   uuid pk → workspaces (cascade)
    installation_id bigint not null
    repo_id        bigint not null
    repo_full_name text not null      -- owner/name, for display; re-check by repo_id
    base_branch    text not null
    path_prefix    text not null default ''
    connected_by   uuid → users
    created_at, updated_at
  ```
  No tokens stored: installation tokens are minted from the App's private key when needed.

### Phase 3: Push export as a pull request

`POST /api/workspaces/:id/github/push` (editor or owner):

1. Generate the file map with the workspace's export generator (same code as the zip export).
2. Mint an installation token (`POST /app/installations/{id}/access_tokens`, scoped to the one repo).
3. Read the base branch head (`GET /repos/{o}/{r}/git/ref/heads/{base}`).
4. Create a tree on top of the base tree with every file under `path_prefix` (`POST /git/trees`, inline `content` for text files; blobs first for anything over ~1 MB).
5. Create a commit (`POST /git/commits`): author is the app, with a `Co-authored-by: Name <email>` trailer for the user who clicked.
6. Create branch `lazy-builder/<workspace-slug>-<yyyymmdd-hhmm>` (`POST /git/refs`).
7. Open a pull request (`POST /pulls`) with a body listing what changed, linking back to the workspace.
8. Return the PR URL; the toolbar shows it.

If nothing changed compared to the base tree, skip the commit and say "already up to date".

### Phase 4 (later, not in scope now)

- Webhooks (`pull_request`, `push`) to show PR status in the workspace. Requires signature verification with the webhook secret.
- Re-push to the same open PR instead of a new branch each time.
- Import: read a repo's components back into the canvas.
- MCP tool `github.pushExport` so agents can open the PR themselves (goes through the same approval gate as other agent actions).

## Env vars

```
GITHUB_APP_ID=
GITHUB_APP_SLUG=              # for the install URL
GITHUB_APP_PRIVATE_KEY=       # PEM, multi-line; in production from a secret manager
GITHUB_CLIENT_ID=             # the App's OAuth credentials, for sign-in + user checks
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=        # phase 4
```

All optional: features stay hidden until set, same as Google.

## Security checklist

- Private key and client secret only in env / secret manager; never logged, never sent to the client.
- Installation tokens minted per request, never stored, never returned to the browser.
- Every push re-checks: user is editor/owner of the workspace, and the workspace's connection still exists.
- Commit only under `path_prefix`; reject `..` and absolute paths from generators.
- Rate limits: one push in flight per workspace; surface GitHub's 403 rate-limit errors as a clear message.
- Webhooks (phase 4): verify `X-Hub-Signature-256` with a constant-time compare before parsing.

## Tasks (for the orchestrator to brief)

| ID | Task | Size | Depends on |
|----|------|------|------------|
| GH-1 | Register the GitHub App (owner does this on github.com; needs a public callback URL for production) | owner, 15 min | — |
| GH-2 | Sign in with GitHub: routes, `/user/emails` handling, login button, tests | ~0.5 day | GH-1 |
| GH-3 | `github_connections` schema + migration, install callback with installation ownership check | ~0.5 day | GH-1 |
| GH-4 | Connect UI: repo, base branch, folder picker | ~0.5 day | GH-3, design spec |
| GH-5 | GitHub client module: mint installation token, tree/commit/ref/PR calls, with tests against recorded responses | ~1 day | GH-3 |
| GH-6 | Push endpoint + toolbar action + PR link | ~0.5 day | GH-5 |
| GH-7 | QA pass with a throwaway test repo | ~0.5 day | GH-6 |

## Open questions for the owner

1. App owned by your personal account or an organization?
2. Should a push always open a new PR, or update an existing open one? (Plan assumes new PR each time for phase 3.)
3. Do you want "create a new repo" from inside Lazy Builder? That needs the Administration permission, which is much broader. The plan leaves it out.
