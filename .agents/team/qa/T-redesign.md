# QA T-001..T-004 + palette v2: PASS WITH NOTES
Branch: feat/google-oauth @ 4ad6775 (no source edits, nothing committed)

CI: server `bun run typecheck` clean, `bun test` 18 pass / 0 fail, client `bun run build` OK (only the existing chunk-size warning).
Run on server 3501/1734, Vite 5673. Chromium via the browser pane, desktop ~800-890px wide plus 390px emulation.

## Done-when checklist

### T-001 tokens/theme
- [x] Fresh profile starts dark: new origin, localStorage empty -> `<html class="dark">`, body bg rgb(18,18,18), title "Lazy Builder" (T-002 title item also OK).
- [x] Toggle persists: toggled to light in workspace, `localStorage.theme=light`, hard navigate -> class "" (light) and workspace light.
- [~] No flash: inline script in index.html sets the class before CSS. `dist/index.html` has a render-blocking `<link rel=stylesheet>` in the head and CSS sets `color-scheme: dark`, so production should not flash. In Vite dev, polling an iframe during load showed one interval with class=dark but body background still transparent (CSS injected by the module script). Not measurable as a paint in dev; see Bugs 6.
- [x] Fonts render as IBM Plex; Phosphor icons everywhere; no `violet` string anywhere in client src; no `window.confirm`; FigmaStub gone.

### T-002 login
- [x] Layout/poster/Google button/"or"/form render; poster hidden from AT (static SVG). Google link only shows when `providers.google` (code: conditional wraps the button and the divider, form gets `mt-6` otherwise). Not exercised with Google disabled in the browser (server was started with creds, as instructed).
- [x] OAuth errors, all via `?error=`: oauth_cancelled "Google sign-in didn't finish. Try again, or use email."; oauth_failed; oauth_state; oauth_unavailable; unknown code -> "Sign-in failed. Please try again.". All in `role=alert`.
- [x] Password login: wrong password -> "Invalid email or password." alert; correct password -> redirected to the workspace. Loading state ("Logging in…" + spinner) seen.
- [x] 390px: scrollWidth 390 = clientWidth, with the error shown. Poster becomes a band above the card.
- [x] Focus: first Tab = Google link (2px ring), then email, password, submit, Create one; every stop has a 2px outline (light: orange ring on Google button, dark: white on inputs).

### T-003 workspace chrome
- [x] Sidebar (monogram, list, active bar, "Has a canvas" icon on QA Main, join, account row, theme toggle, log out), top bar tabs Doc/Canvas, "Add canvas" when no canvas, export select, Export a real `<button>` (disabled on the no-canvas workspace; `title` on the enabled one "Download a React + Vite project").
- [x] Export: fetch -> blob (`application/zip`, 4781 bytes seen via a patched createObjectURL), button flips to "Downloaded", toast "qa-main.zip downloaded / React + Vite project. Unzip, then npm install && npm run dev" (role=status).
- [x] Export errors via a real server error: PATCH exportTarget=nextjs while the page was stale -> click Export -> 501 -> toast "Export failed: Export to Next.js (App Router) isn't available yet." with a "Try again" button (role=alert). PATCH hasCanvas=false -> 400 -> "Export failed: This workspace has no canvas to export." Both restored afterwards. No trace fired on error.
- [x] Invite code: shown in the More menu in mono with a copy button ("Copy invite code" menuitem). Clipboard copy and the "Copied" confirmation not clicked.
- [x] Delete dialog (native `<dialog>`), tested in light and in dark on QA NoCanvas: focus starts on Cancel; Tab and Shift+Tab cycle Cancel <-> Delete workspace only (3 Tabs from Cancel ends on Delete); Escape closes it (`open=false`); focus returns to the "More" button (the menu item that opened it unmounts, so More is the sensible target). Title "Delete QA NoCanvas?", label via aria-labelledby. Deletion itself not executed.
- [x] Empty state, 1440: only an 800-890px pane was available; the no-canvas workspace with "Add canvas" looks right. 1440 not measured.
- [x] 390px: sidebar becomes an off-canvas drawer (aside is `inert` when closed), hamburger in the top bar, no horizontal scroll on doc or canvas (scrollWidth 390). See Bugs 3 and 4.
- [x] View only: see section below.

### T-004 canvas/editor
- [x] Canvas tokens: neutral surface, orange selection ring + handles, cyan snap guide token. Drag on the canvas works and syncs to a second tab (toggle moved to 239,519, same value read in the other tab).
- [x] Layer tree: role=tree, roving tabindex (first item 0, rest -1), ArrowDown moves focus, F2 opens an inline "Layer name" input pre-filled, Enter commits ("Type here…" -> "Email field", propagates to the select options and the second tab). Zoom -/+ and Reset present.
- [x] Slash menu (`/`): Heading 1/2, Bullet, Numbered, Code Block; ArrowDown moves the highlight (aria-selected true on the row, row bg changes), Enter inserts a bullet list.
- [x] "Insert canvas link" is a labelled select (`aria-label`), lists nodes; picking one inserts the pill "Click me" (class figma-ref, accent-subtle bg).
- [x] Export trace: after a successful export 6 `lb-trace` outlines appeared (one per node) and were gone after ~1.1 s; not repeated. Reduced-motion skip not tested.
- [x] FigmaStub.tsx deleted. Visible strings say Doc/Canvas/Add canvas/Canvas link.
- [x] Multi-select console: shift-click two nodes -> 2 selected, layers highlighted, "Delete selected (2)" enabled; console has NO React "Warning" entries (only 401s from /auth/me while logged out, 501/400 from the export error tests, and a few "WebSocket closed before the connection is established" warnings from page navigations).
- [x] Persistence: doc text and canvas rename survived reload and were visible in a fresh tab and for user B.
- [x] Collab, two tabs same user: typing " LIVE1" in tab A appeared in tab B within 1 s; canvas drag and rename in one tab showed in the other.

### Viewer ("view only")
Setup via API: user A creates workspace, B joins by invite code (role editor), A PATCHes `/members/:id` -> `viewer`.
- [x] B opens the workspace: yellow "View only" chip (eye icon) in the top bar; editor `contenteditable="false"`; "Insert canvas link" and "Add canvas" and the More menu are not rendered; export-target select disabled; Export remains enabled (API allows viewers to export, per route comment).
- [ ] Canvas as viewer: the palette (Card, Frame, ..., Toggle) is still rendered and enabled, and nodes are draggable/selectable, "Delete selected" enables after selecting. Edit controls are NOT hidden on the canvas. Known gap on local change: clicking palette Badge added a "Badge" layer locally, dragging toggle moved it to 290,662 locally, layer list grew with a second Badge. After reload both were gone: the server refused them (layers back to 6 items, toggle back at 239,519 which is the owner's value). So server enforcement works, local canvas visibly diverges until reload (the known gap).

### Palette / contrast (computed from real rendered colours, fg composited over the real ancestor bg; two spot checks with the antislop contrast tool)
Dark: body text #ededed on #181818 15.17; muted #a3a3a3 on #181818 7.04; subtle/hints #8e8e8e on #181818 5.42; canvas caption "Card" 6.46; canvas node text 16.49; node placeholder 4.97; Export label #121212 on #ff5a1f 6.01; "Create one" link #ff8a5c on #181818 7.65; canvas-link pill #ffb596 on #3a1e12 8.95; error #ff6b81 on #2d1318 6.30 (tool); Delete selected #ff6b81 6.49; View only #e8b931 on #121212 10.18; slash hint "-" on highlighted row 4.50 (borderline).
Light: body #171615 on white 18.07; muted 7.78; hints 5.90; canvas caption 7.78; Export label white on #c2410c 5.18 (tool); "Create one" #b23a0b on white 5.99; pill #9a3209 on #fdede5 6.50 (tool); error #c8203a on #fdecef 4.95 (tool); Delete selected 5.64; View only #8a5a00 on #f5f4f1 5.39 (tool); badge caption 6.24.
All enabled text >= 4.5:1. Disabled Ungroup is 3.09/2.94 (exempt).
- [x] Only orange on canvas is the selection: scan of every element with an orange-ish colour on the canvas page lists the monogram, Export button, editor caret, and the selection handles; node previews are neutral. Button node preview = #ededed fill with dark text (dark) / #171615 fill (light). Badge preview = grey pill. Selected layer rows use the accent-subtle tint (panel, not canvas).
- [x] Light theme looked right on login, workspace, canvas, dialog.

### Exported zip
- [x] `GET /export` 200 `application/zip`, 12 files: index.html, package.json, README.md, src/App.tsx, src/main.tsx, src/index.css, src/components/ui/{Badge,Button,Card,Input,Text,Toggle}.tsx, tsconfig.json, vite.config.ts. `src/App.tsx` exists.
- [x] `grep -ri violet` over the unzipped tree: no hits. Classes: Badge `bg-neutral-200 text-neutral-700`; Button `bg-neutral-900 text-white hover:bg-neutral-800`; Toggle `bg-neutral-900` / `bg-neutral-300`. No orange/accent either. (Did not run `npm install && vite build` on the zip.)

### Keyboard
- [x] Tab order in workspace (dark): Hide sidebar, New workspace, QA Main, QA NoCanvas, invite input, Join, Log out, theme toggle, Doc tab, export select, Export, More. Every stop reports a 2px solid outline (orange #ff8a5c on buttons/inputs, white #ededed on workspace rows and tabs).
- [x] Tabs: roving tabindex (selected 0, other -1); ArrowRight on Doc selects Canvas and moves focus to it.
- [x] Layer tree arrows + F2 (above). Slash menu arrows + Enter (above).
- [x] Regression: register/login via API and UI, logout -> `/w/:id` redirects to /login, two-tab collab, persistence after reload.

## Bugs (most severe first)
1. [major] Viewer on the Canvas surface still gets the full edit UI: palette buttons enabled, nodes draggable/resizable, "Delete selected" enabled after selecting. The server refuses the writes (verified), but the local canvas shows phantom edits until reload (added Badge, moved toggle). Doc surface is correctly read-only. Suggest passing `readOnly` to Canvas: hide/disable palette, group, delete, rename, drag.
2. [minor] Layer rename: after Enter the focus drops to `<body>` instead of returning to the tree item (keyboard users lose their place).
3. [minor] Mobile drawer (390px): opening it with the hamburger leaves focus on BODY (the button goes inert), so the drawer's Escape handler (it is an onKeyDown on the sidebar) never fires; Escape does nothing unless focus is already inside. The drawer is also not modal (page behind stays tabbable), closes on backdrop click.
4. [minor] Canvas at 390px: the 232px side panel covers ~60% of the canvas area; only ~158px of canvas remains, nodes are cut off. No horizontal scroll, but the canvas is hard to use on a phone.
5. [minor] Success toast stack at the bottom right sits over the zoom chip on a narrow pane (two toasts from two exports), and the toast of a second export doesn't replace the first.
6. [note] Dev-only: possible unstyled frame before CSS loads in `vite dev` (not seen in production build structure).
7. [note] Slash menu hint text on the highlighted row measures exactly 4.50:1 (limit).
8. [note] Doc editor placeholder and Export-button disabled reason were not clicked/measured separately; same tokens as measured values above.

## Not verified
- Login UI with Google disabled (server was started with the placeholder credentials); real Google round trip.
- 1440px layout (pane was ~800-890px wide); `prefers-reduced-motion` skip of the export trace; clipboard "Copied" confirmation; workspace rename/join-by-code flows; group/ungroup/marquee/resize-handle behaviour beyond a drag and shift-click (builder claimed them, not repeated); the exported project's own `npm install && build`; Firefox/Safari.

## Cleanup
Server (PID 13659) and Vite (PID 13663) stopped with `kill`; ports 3501/1734/5673 free; processes on 3001/5173 untouched. Test users qa-a/qa-b@test.localhost deleted (2 rows, 0 `@test.localhost` remain, workspaces cascaded). Browser tabs opened by me closed, viewport emulation reset. Temp files removed. No source files modified.
