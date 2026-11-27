# T-023 + T-024 Page frame, and export from the frame
Owner: builder | Status: building | Branch: feat/page-frame

## Goal
People can see where the page is. Today the canvas is an infinite plane and the export sizes the page from the bounding box of whatever is on it, so nobody can tell whether an element is "on the screen". Draw a page frame, warn about elements outside it, snap to it, and make the export use the frame and leave out what's outside.

Plan context: `.agents/team/plans/canvas-ir-v2.md`, sections "Page frame" and "Phase 2: pages and flow". This task covers T-023 and T-024 only: one page, no Pages list, no routing, no Flow mode.

## Owner decisions (apply exactly)
- **Default frame is 16:9: 1440 × 810.** Width 1440; the first-screen (fold) line sits at y = 810, so the first screen is exactly 16:9.
- **The page grows downward.** Frame height = max(fold, lowest element bottom on the page + 80). Content below the fold is normal scrolling content and is NOT "outside".
- **Outside means** left of x = 0, right of the frame width, or above y = 0. Export **skips** elements that are fully outside and reports how many; elements partly outside are kept and clipped by the frame (`overflow-hidden` on the root).
- Multipage routing later will use React Router (not in this task).

## Data model (forward-compatible with T-025)
- Add a Yjs map `pages` in the canvas doc (same doc as `nodes`). This task creates exactly one page record under the **fixed id `home`**: `{ id: 'home', name: 'Home', path: '/', width: 1440, foldHeight: 810, order: 0 }`. Create it on first sync if missing, from a read-write connection only (viewers never write; same rule as the existing INITIAL_NODES seeding in `client/src/figma/Canvas.tsx`). The fixed id makes concurrent first-opens merge into one record.
- Top-level nodes don't need a `pageId` yet; every node belongs to `home` for now.
- Add the `Page` type to both IR mirrors: `client/src/figma/types.ts` and `server/src/export/ir.ts` (keep them in sync), plus a `readPage(doc)` helper next to `readCanvas` in `server/src/export/ir.ts` that returns the `home` page or the default `{ width: 1440, foldHeight: 810 }` when the map is empty (old boards exported before anyone opened them).
- Frame origin is canvas world (0, 0). Existing boards keep their element coordinates; the starter nodes (`INITIAL_NODES`, x ≥ 40) already sit inside.

## Canvas (client/src/figma/Canvas.tsx; consider a new `figma/PageFrame.tsx` for the drawing)
- Draw the frame inside the transformed world layer (it pans/zooms with content): surface-coloured page area at (0, 0, width, height), 1px `border-border-strong` outline, and the rest of the canvas visibly dimmed outside it (e.g. the canvas ground stays `bg-canvas` and the page area uses `bg-surface`; check both themes).
- Page label above the top-left corner: "Home · 1440" in `text-text-subtle` (hidden below 50% zoom like the group label).
- Fold line: dashed horizontal line at `foldHeight` across the frame, with a small "First screen" label at its right end. Neutral colour (not the accent).
- Width presets: a small control in the canvas side panel (new "Page" section at the top of the panel): Desktop 16:9 (1440, fold 810) · Tablet (768, fold 1024) · Mobile (390, fold 844) · Custom width (number input, 320–3840). Writes to the `home` record. Hidden for viewers (show the current size as text instead).
- **Off-page warning:** while dragging/resizing and at rest, an element that is fully or partly outside (by the rule above) gets a warning outline (`--lb-warning` token, dashed) and the layer row shows a small warning icon with tooltip "Outside the page: left out of the export" (fully outside) or "Partly outside the page: clipped in the export" (partly). Group children: judge by the group's absolute box (`absoluteBox` in `client/src/figma/labels.ts`).
- **Page snapping:** add frame left edge (0), right edge (width), centre line (width / 2), and 24px margins (24, width − 24) to the existing x snap targets in `snapAxis` usage during drag; add y = 0 and the fold to y targets. Guides render like the existing ones.
- Initial view: on first mount, if the view is the default (scale 1, tx 0, ty 0), fit the frame width into the visible canvas area (zoom out if needed, never zoom in above 100%) with ~32px margin, so a 1440 frame isn't half off-screen on a laptop. Don't change the view on later re-renders, and keep the existing "jump to element" behaviour.

## Export (server/src/export/)
- `generateReactVite` takes the page: `{ projectName, nodes, page }`. Origin is the frame (0, 0), no more bounding-box normalisation; root `<main>` gets `style={{ width: page.width, minHeight: <frame height> }}` and `overflow-hidden`, centred (`mx-auto`).
- Skip top-level nodes that are fully outside (rule above). Return the skipped count alongside the files: change the generator result to `{ files, skipped }` and update `generatorFor` / `zipProject` call sites in `server/src/export/index.ts` and `server/src/routes/workspace.routes.ts`.
- Route: read the page with `readPage(conn.document)` and pass it in; add response header `x-lazy-skipped: <n>` (and expose it via CORS `exposeHeaders` in `server/src/app.ts`; dev uses the Vite proxy so it's same-origin, but keep production correct).
- Client: `api.download` (client/src/lib/api.ts) also returns the header value; the export success toast in `client/src/workspace/Workspace.tsx` adds "N elements outside the page were left out." when N > 0.
- Tests (`server/src/export/react-vite/generate.test.ts` + fixtures): update the layout-normalisation test for frame-origin coordinates; add tests for: fully-outside node skipped and counted, partly-outside node kept, node below the fold kept and the min-height grows, default page when none given. Keep the kitchen-sink fixture building (`tsc -b && vite build` on an exported copy, like before).

## Done when
- [ ] New and existing boards show a 1440 × 810 frame with fold line and "Home · 1440" label; switching presets resizes it live in a second tab.
- [ ] Elements outside the frame (left, right, above) get the warning outline and layer-row icon with the right tooltip; elements below the fold do not.
- [ ] Dragging snaps to page edges, centre, 24px margins, top and fold, with guides.
- [ ] A fresh canvas fits the frame width in view on a ~900px-wide canvas area.
- [ ] Export: frame-origin coordinates, `overflow-hidden` root at page width, fully-outside elements missing from `App.tsx`, toast says how many were left out; exported project still builds.
- [ ] Viewers can't change the page size and never trigger the `pages` seeding write.
- [ ] `cd server && bun run typecheck && bun test` and `cd client && bun run build` pass.

## Out of scope
Pages list, routing, multiple pages, Flow mode, Preview, auto-layout, breakpoints.

## Rules for this run
- Work on the current branch `feat/page-frame` (already created; do not create or switch branches). One commit for the task.
- Use semantic tokens only (`.agents/team/design/system.md` §0 and the palette note at its top; tokens in `client/src/index.css`). Warnings use the warning token, not the accent.
- Every new control needs a visible focus ring and an accessible name.
