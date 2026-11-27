# QA T-doc-canvas-wiring: PASS WITH NOTES
Branch: feat/doc-canvas-wiring @ 9dfd7a5

## Done-when checklist
- [x] CI: server typecheck clean, `bun test` 18 pass / 0 fail, client build OK (only the usual >500 kB chunk warning).
- [~] 1. Docs card: real mouse hover on a pill opens a card with name ("Click me"), type ("Button") and docs textarea. Typing docs in it showed up live in the canvas Docs panel in a second tab (textarea value "Submits the form"), and the canvas docs badge (canvas corner + layer row) appeared. Clicking outside closes it. Arrowing right onto a pill (PM node selection) opens it, arrowing right again closes it. Deleted element: card says "This canvas element was deleted." with no name, textarea or button. FAILS in part: Escape (bug 1 below).
- [x] 2. Live pill names: renaming via layer tree F2 ("Click me" -> "Submit btn") updated both pills in the Doc in the same tab and the second tab (textContent and aria-label) without reload. Deleting the element: pills get data-state=broken, line-through, and show the stored insert-time name ("Click me", not the renamed one).
- [x] 3. Backlinks: two links to one element in different paragraphs showed "Mentioned in Doc (2)" with both sentences (snippets also follow live renames). Clicking snippet 2 switched to the Doc and selected pill index 2 (the second link to that element; card opened); clicking snippet 1 selected index 0. Element with no links ("Type here...") shows "Not linked from the Doc yet."
- [x] 4. Zoom/pan survive: at 144% with a pan, Doc -> Canvas gave an identical transform (translate(-202.42px, -277.32px) scale(1.44)). With the element panned fully off-screen, clicking its pill in the Doc switched to the canvas, selected it and centred it (element centre ~(405,428) vs canvas centre (407,427)). "Show on canvas" button from the card also centres at 100%.
- [x] 5. Safety: with an element selected on the canvas, in the Doc End/Backspace/Backspace/Delete changed the Doc text; the element, layers and selection were intact. Ctrl+G did not group, Ctrl+A in the Doc did not select all canvas elements.
- [x] 6. Viewer (joined by invite code, owner PATCH role=viewer -> 200): card is read-only (0 textareas; shows name, type, docs text and "Show on canvas"); canvas Docs textarea is readOnly; Delete key did nothing; backlinks listed ("Mentioned in Doc (1)") and clicking one switched to the Doc and selected that pill.
- [x] 7. Regression: export zip 200 (11 files) and contains the element docs comment ("Greeting heading"); two-tab collab works (docs, renames, delete all synced); logout redirects to /login; console errors only a 401 (/me while logged out); no React errors seen.

## Bugs (most severe first)
1. [minor] Escape does not close the card on the first press when focus is in the doc/card. Steps: click in doc text, hover a pill until the card opens, press Escape (or Escape from inside the card textarea). Expected: card closes, focus on pill. Actual: focus moves to the pill, but the editor's onFocus handler (Editor.tsx, `onFocus` -> showCard) immediately reopens the card; a second Escape (focus already on the pill) closes it. Cause: closeCardAndFocusPill() focuses the pill, which fires the onFocus that opens the card.
2. [minor] A newly created pill node view shows the stored (insert-time) label instead of the live one until the next canvas change. Steps: rename element, then in the Doc put the caret at the end of paragraph 1 and press Delete to merge paragraph 2 into it. Expected: pill in merged paragraph shows "Submit btn". Actual: it shows "Click me" while its data-live-label attribute is "Submit btn". Cause: FigmaRef addNodeView paints `node.attrs.label` on creation and only applies the live label in `update()`; the factory ignores its decorations argument. Likely also hits remote inserts, undo/redo, paste and a paragraph split.
3. [cosmetic] Backlink snippet joins adjacent pills without a space ("Hello canvasClick me"); that is because the doc has no text between them. Insertion via the "Insert canvas link" dropdown also puts the pill at the end of the doc/previous selection rather than the caret in my automated run (pre-existing, not part of this commit).

## Not verified
- Phone width (375x812) and dark theme, contrast tool, and the design spec: not exercised in this run (UI behaviour only).
- Viewer write refusal was checked in the UI (readOnly textarea, Delete ignored); I did not attempt a raw websocket write as the viewer.
- Full "add node via palette" regression sweep beyond the pre-created canvas elements (Delete selected via the toolbar worked).

Cleanup: test users qa-owner@ / qa-viewer@test.localhost deleted; server (3501/1734) and Vite (5673) stopped; browser tabs closed; viewport emulation never changed. Nothing committed.
