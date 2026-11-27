# QA T-023 + T-024: PASS WITH NOTES
Branch: feat/page-frame @ 10ae31e (e20f9c5 builder + "zoom chip fits the page")

## Done-when checklist
- [x] 1440x810 frame, fold line, "Home · 1440" label; presets resize live in a second tab. New board: frame drawn, `home` record `{id:home,name:Home,path:/,width:1440,foldHeight:810,order:0}` seeded in the stored Yjs doc when the owner opened it. Desktop/Tablet/Mobile set 1440x810 / 768x1024 / 390x844 (frame style width/height read from the DOM, `aria-pressed` follows). The viewer tab updated live (1200 -> 3840 -> 1440 shown in its text line).
- [x] Warning outline and layer icon. All of left-full, left-partly, right-partly, right-full, above-full and above-partly got a 2px dashed `rgb(138,90,0)` (`--lb-warning`) outline. Full cases: tooltip and aria-label "Outside the page: left out of the export". Partly cases: "Partly outside the page: clipped in the export". Below the fold (y=1200): no outline, no icon, frame height 1324 = 1200+44+80. Group dragged to x=1111 (right edge 1471) showed the warning; group children after ungroup were judged by their own box. The viewer tab shows the same icons.
- [x] Snapping, measured during a held drag (guide elements read from the DOM) on a 140x44 element: right edge x=1300, guide at 1440; centre x=650, guide at 720; left margin x=24, guide at 24; right margin x=1276, guide at 1416; left edge x=0, guide at 0 (x=-2 raw; at x=3 the centre snapped to another node's line at 72 instead, which is correct nearest-target behaviour); top y=0, guide at 0; fold y=766 (bottom) and y=810 (top), guide at 810. No guides when far from any target. One real mouse drag (computer drag) to the right edge also landed at x=1300. Persisted value confirmed in the stored doc.
- [x] Fresh canvas fit: at a 1280x800 viewport the canvas area is 800px wide; initial view is scale 0.5111, tx 32 (frame 736px, 32px margins each side). Reload re-fits. After zoom/pan away (0.8832, tx -168) the "Fit" chip restores 32/40/0.5111. A 390 page on reload fits at 100% centred (tx 205), so the fit waits for sync and does not zoom in. "Show on canvas" (Doc pill): switches to Canvas, scale kept, element centre = canvas centre exactly (400, 375.5). Canvas "Mentioned in Doc" button jumps back to the Doc.
- [x] Export. Scene: card inside, text at x=-400 (fully outside), input at x=1380 (partly), button at y=1200 (below fold). `x-lazy-skipped: 1`, `Access-Control-Expose-Headers: x-lazy-skipped`. App.tsx: text node absent; input present at left 1380; root `<main className="relative mx-auto overflow-hidden" style={{ width: 1440, minHeight: 1324 }}>`; coordinates are frame-origin (card at 40,40). Toast "1 element outside the page was left out." and with two outside "2 elements outside the page were left out." Unzipped to a scratch folder: `npm install` then `npm run build` succeeded (19 modules, built in 97ms). Board never opened (no `pages` record) exports with the default `width: 1440, minHeight: 810`, skipped 0. Export without auth returns 401.
- [x] Viewers. Setup: owner created the canvas workspace, second user joined by invite code, owner PATCHed role=viewer (200). The viewer opened the Canvas tab on a brand-new board before the owner ever did: no document row existed in the DB for that workspace (nothing stored, so no `pages` or `nodes` write). Then the owner opened it and the row appeared with `pages.home` and the starter nodes, so the owner seeds, the viewer does not. Viewer sees "Home · 1440 wide, first screen 810" as text, no preset buttons and no number input (0 found), plus the view-only notice.
- [x] CI: server `bun run typecheck` clean, `bun test` 22 pass / 0 fail, client `bun run build` OK (only the existing chunk-size warning).

## Regression
- Multi-select with shift+click (3 selected, Group enabled), Group, Ungroup, group drag, resize via SE handle (360x220 -> 556x337), two-tab collab (viewer tab saw moves and warnings live), docs card and backlinks ("Mentioned in Doc (1)"), Doc pill jump and backlink jump: all worked.
- Keyboard: Shift+Tab onto a preset shows a 2px solid `rgb(194,65,12)` focus ring. Width input has a visible label "Custom width". Width input: typing "1" leaves 1440 unchanged; "1200" then Enter commits; "100" then Tab (blur) commits as 320; "5000" then Enter commits 3840.
- Phone 375x812: no horizontal overflow (scrollWidth 375). The side panel takes most of the width (existing layout).

## Contrast (WCAG ratios, computed from computed styles)
| | light | dark |
|---|---|---|
| page area (#fff / #181818) vs canvas ground (#eceae6 / #0e0e0e) | 1.20 | 1.09 |
| frame outline (#7c7973 / #6e6e6e) vs page area | 4.34 | 3.48 |
| frame outline vs canvas ground | 3.61 | 3.79 |
| "Home · 1440" label (#67645e / #8e8e8e) on ground | 4.91 | 5.89 |
| "First screen" label on page area | 5.90 | 5.42 |
| warning outline (#8a5a00 / #e8b931) vs page area | 5.93 | 9.65 |
| warning outline vs canvas ground | 4.93 | 10.49 |

UI parts all clear 3:1 and text clears 4.5:1. The page area alone does not separate from the ground (1.2 / 1.09): the 1px outline carries the boundary, which passes.

## Bugs (most severe first)
1. [minor] Frame labels shrink with zoom. They live inside the scaled world layer, so at the default fit zoom (0.51) the 11px "Home · 1440" and "First screen" text renders about 5.6px (measured label height 8px). They are hidden under 50%, so they show at 51% but are barely readable. Counter-scaling the font (font-size / zoom) would fix it. Same behaviour as the group label per the brief, so not a spec violation.
2. [minor] The selected-element chip ("card · 360×220 @ 40,40") at the default fit zoom sits right above the page label (chip bottom y=77, label top y=77.7). Not overlapping, but crowded for an element near the top-left.
3. [minor] At phone width the canvas area is about 143px and the zoom floor of 0.2 means a 1440 page cannot be fitted (it shows 20%, frame wider than the pane). Edge case; the side panel layout is existing.
4. [observation, not reproduced] Once, after a long scripted session (doc pill jump, several drags, two exports, group, then dragging the group), the view changed from (6.4, 108.7, 0.511) to (25.8, 109.6, 0.4669) without any zoom or pan action. 0.4669 is 640/1371, which is the jump-fit formula. Three attempts to reproduce (jump, drags, export, group, group drag, ungroup) left the view unchanged. Possibly a stale "show on canvas" re-run; worth a look at the jump effect in `Canvas.tsx` (deps include `selectSingle`) but I cannot confirm it.

## Missing tests (findings, not fixed)
- No client tests for `offPage`, `pageSnapTargets`, `frameHeight` (pure functions in `PageFrame.tsx`, easy to unit test).
- No server test that a viewer connection never writes `pages` (verified manually only).

## Not verified
- Drag with real mouse over many intermediate moves: the held-drag guide checks used synthetic pointer events (guides, snapping and persisted values were all read from the live app); one real mouse drag was done separately.
- Hover tooltip appearance (only the `title` and `aria-label` text were read).
- Light and dark were checked by computed colours plus screenshots at low resolution; no pixel-level look at the "First screen" label position at other zooms.
- No migrations in this task (no `server/drizzle` change).

## Cleanup
Servers (PIDs 35802, 35806) stopped; both browser tabs closed and viewport emulation reset; test users `qa-owner@test.localhost` and `qa-viewer@test.localhost` deleted (2 rows, workspaces cascaded); scratch folders and helper scripts removed; theme returned to light. `git status` is clean apart from this report.
