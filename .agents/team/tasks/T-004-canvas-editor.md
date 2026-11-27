# T-004 Canvas and editor chrome
Owner: builder | Status: review | Branch: feat/google-oauth

## Goal
Bring the two working surfaces in line with the system without changing how they behave.

## Context
- system.md §1 "Canvas chrome", §6.5 (canvas side panel), §6.6 (layer tree), §6.7 (Canvas link pill), §6.8 (slash menu), §6.9 (editor surface), §6.10 (node chrome, selection halo, guides)
- client/src/figma/Canvas.tsx (NodeView, ResizeHandles, NodeInner, LayerTree, palette, docs panel), client/src/components/Editor.tsx, FigmaRef.ts, SlashMenu.tsx, SlashCommand.ts

## Done when
- [ ] Canvas background, node chrome, selection ring + halo (the one glow), cyan snap guides, resize handles and group outline use the canvas tokens.
- [ ] NodeInner previews use tokens (they are what users see before export; keep sizes and layout identical so nothing jumps).
- [ ] Palette, layer tree and docs panel per §6.5/§6.6, with Phosphor icons instead of emoji/glyphs and aria-labels.
- [ ] Canvas link pill per §6.7 (label "Canvas link" where a label is shown); "Insert canvas link" control replaces the "＋ Insert Figma ref…" select, styled per §6.2.
- [ ] Slash menu per §6.8 with keyboard highlight state; editor typography per §6.9.
- [ ] §6.13 export trace: after a successful export (T-003 added `useExportWorkspace` in client/src/lib/queries.ts and the success toast in Workspace.tsx), the exported nodes' outlines trace once on the canvas when it is visible. One-shot, no loop, skipped under reduced motion. Wire it with a small prop or event from Workspace to Canvas; don't move the export logic.
- [ ] Delete `client/src/workspace/FigmaStub.tsx` (dead code, not imported anywhere).
- [ ] No behaviour changes: drag, snap, resize, group/ungroup, marquee, layer rename, cross-surface navigation all still work (try each once in the browser).
- [ ] Checks pass.

## Out of scope
Export generator output styling (server). Three.js.

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
- Canvas chrome, node previews, side panel, layer tree (role=tree, arrow keys, Right/Left expand, F2 rename), docs panel and zoom chip use tokens and Phosphor icons. Interaction logic untouched.
- Added: zoom +/- buttons (centre-anchored, same clamp as the wheel), "Delete selected" always rendered (disabled with no selection) so the layer list no longer jumps on select.
- Canvas link pill: CSS in index.css (Phosphor icon as mask), broken / no-canvas state via a ProseMirror decoration in FigmaRef.ts; Enter opens a focused or selected pill.
- Export trace: `exportTick` prop from Workspace; one-shot SVG outline per node, skipped under reduced motion.
- Not built: group bounding box with handles for multi-select (handles remain per node, as before); distance labels on guides (spec says "when added").
- Pre-existing, untouched: React "setState while rendering" warning from toggleSelect calling onNodeSelect inside a state updater.
