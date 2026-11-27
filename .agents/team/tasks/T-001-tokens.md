# T-001 Design tokens, fonts, dark default
Owner: builder | Status: review | Branch: feat/google-oauth

## Goal
Lay the foundation of the "Lit workbench" system so later tasks only restyle components.

## Context
- system.md §0, §1, §3, §4, §5, §8; tokens.css (whole file)
- client/src/index.css (current globals, TipTap + highlight.js styles, the `breathe` keyframes)
- client/src/main.tsx (font imports go here)
- Theme logic lives today in client/src/workspace/Workspace.tsx (`dark` state + localStorage `theme`), so the login page never gets dark.

## Done when
- [ ] `tokens.css` content is in `client/src/index.css` below `@import "tailwindcss"` (keep the existing `@custom-variant dark`, typography plugin and highlight.js import).
- [ ] Fonts installed with bun and imported in main.tsx: `@fontsource-variable/ibm-plex-sans`, `@fontsource/ibm-plex-mono` 400 and 500. `body` uses `font-sans` and the token background/text colours.
- [ ] Theme moved out of Workspace.tsx into a small module (e.g. `client/src/lib/theme.ts`): reads localStorage `theme`, defaults to **dark** when unset, sets `<html class="dark">` before first paint (inline script in index.html is fine), exposes a hook for the toggle. Workspace.tsx uses it; behaviour of the toggle unchanged.
- [ ] `breathe` animation removed; editor placeholder uses `text-text-faint` (or the token the spec names), static.
- [ ] TipTap caret and highlight.js code block colours use tokens where system.md §6.9 says so.
- [ ] `@phosphor-icons/react` installed (used by later tasks).
- [ ] Login page and workspace render dark on a fresh browser profile (no localStorage).
- [ ] Checks pass (see shared rules).

## Out of scope
Restyling individual components (T-002..T-004). Three.js.

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
- Code-block theming: `github.css` imported as-is; `client/src/hljs-dark.css` is `github-dark.css` nested under `:root.dark`. `.tiptap pre` background uses the two spec hexes.
- Theme: `client/src/lib/theme.ts` (`useTheme`, `setDark`), inline script in index.html sets `<html class="dark">` before paint; dark unless localStorage `theme` is `light`.
