# T-003 Workspace chrome
Owner: builder | Status: review | Branch: feat/google-oauth

## Goal
Restyle the app shell to the system: sidebar, top bar/tabs, export area, empty state, and real dialogs.

## Context
- system.md §6.1, §6.2, §6.3 (sidebar), §6.4 (top bar and tabs), §6.12 (empty state), §6.13 (export success), §6.14 (toasts, tooltips, dialogs)
- client/src/workspace/Workspace.tsx (all of it), client/src/router.tsx (only if needed)

## Done when
- [ ] Sidebar per §6.3: logo monogram, workspace list with active/hover/rename states, "Has a canvas" indicator as an icon (no emoji), join-with-code, account row, theme toggle, log out.
- [ ] Top bar per §6.4: "Doc" / "Canvas" tabs, "Add canvas", export target select, **Export as a real `<button>`** that is `disabled` (with the reason in a tooltip) when not available.
- [ ] Export downloads via fetch → blob → object URL (so success is detectable), then shows the §6.13 success toast. Errors (400/501/other) show an error toast with the server's message.
- [ ] Invite code shown in mono with a copy button (icon + aria-label) and a "Copied" confirmation.
- [ ] Delete workspace uses an accessible dialog per §6.14 (focus trapped, Escape closes, focus returns), not `window.confirm`.
- [ ] Empty state per §6.12 with its static SVG.
- [ ] Viewer state ("view only") styled per spec.
- [ ] 1440px and 390px both usable (sidebar collapses on narrow screens), both themes.
- [ ] Checks pass.

## Out of scope
Canvas internals, editor, slash menu, ref pills (T-004).

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
- Native `<dialog>` for delete (focus trap, Escape, focus return); toasts and tooltip are small local components in client/src/workspace/.
- Export is fetch -> blob -> object URL via `useExportWorkspace`; the 501 path is only reachable by a stale client (button is disabled for "soon" targets), checked with a stubbed fetch.
- Not done: the node-outline trace on the canvas after export (§6.13) touches canvas internals (T-004). Viewer state not exercised in a browser (needs a second user).
