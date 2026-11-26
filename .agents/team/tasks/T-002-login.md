# T-002 Login page per §6.11
Owner: builder | Status: review | Branch: feat/google-oauth

## Goal
Rebuild the login/register screen to the spec: the first screen people see should feel finished.

## Context
- system.md §6.1 (buttons), §6.2 (inputs), §6.11 (login card with Google sign-in), §6.14, §7 (only the static SVG fallback part)
- client/src/auth/LoginPage.tsx (current form, Google button, error codes from ?error=, `providers` query)
- Keep all behaviour: login/register toggle, error messages for each OAuth code, Google button only when `providers.google`.

## Done when
- [ ] Layout, copy, headline and card follow §6.11 (headline can mention export plainly).
- [ ] Static SVG backdrop from §7 ("the IR assembling", still picture) as the visual; no Three.js, no animation. Hidden from assistive tech.
- [ ] Google button per §6.11 custom-fallback spec (colours, G mark, sizing) in Plex Sans; then the "or" divider; then the email form.
- [ ] Inputs and the primary button use the §6.1/§6.2 states: hover, focus-visible ring, disabled, loading ("Please wait…" or spinner), error text using the danger token with `role="alert"`.
- [ ] Works at 390px width with no horizontal scroll; dark and light both match the contrast table.
- [ ] `client/index.html` title is "Lazy Builder" (it says "client").
- [ ] Checks pass.

## Out of scope
Three.js scene (T-005). Workspace screens.

## Shared rules for this batch
- Work on the current branch `feat/google-oauth`. Do NOT create or switch branches (this overrides the branch step in builder.md). Commit your task as one commit on this branch.
- Source of truth: `.agents/team/design/system.md` and `tokens.css`. Read §0 (ground rules) and the sections listed below before editing.
- Owner decisions already made (apply them): dark is the default theme when nothing is stored; keep our own Google button (no Google Fonts request; use Plex Sans with Google's colours and the unmodified full-colour G); placeholder 16px violet monogram for the logo; export has shipped, so copy can say so plainly.
- Use semantic utilities from tokens.css (`bg-surface`, `text-text-muted`, `border-border-strong`, `ring-focus`...). No raw `neutral-*`/`violet-*` + `dark:` pairs in files you touch.
- Icons: `@phosphor-icons/react`, regular weight. Icon-only buttons get `aria-label`; icons get `aria-hidden`.
- Every interactive element needs a visible focus ring (`ring-focus` or equivalent from tokens). No `outline-none` without a replacement.
- Visible strings: "Notion" → "Doc", "Figma" → "Canvas", "Add Figma page" → "Add canvas", FigmaRef pill → "Canvas link". Code identifiers stay.
- Done for every task: `cd server && bun run typecheck && bun test` and `cd client && bun run build` pass.

## Notes
- Headline is three block lines ("Lay it out." / "Write it down." / "Ship React.") because two lines at 48px do not fit the 416px content width of the 480px column.
- `oauth_cancelled` copy now follows §6.11's error text ("Google sign-in didn't finish. Try again, or use email."). OAuth and server errors share one `role="alert"` block above the button.
- Google button: Plex Sans (owner decision), Google colours per theme, unmodified G, "Connecting to Google…" + spinner after click.
- Poster: `client/src/auth/LoginPoster.tsx`, static inline SVG, shown as 200px band under 1024px and as right column at >=1024px. T-005 can swap in the scene over it.
