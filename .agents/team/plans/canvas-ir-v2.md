# Plan: Canvas IR v2 (pages, responsive layout, reusable components, multi-framework export)

Status: proposed · Owner: orchestrator · Written: 2026-11-27 · Revised: 2026-11-27 (added pages, page frame and Flow wiring as phase 2)

## Why one plan

Five things the owner asked for change the same core, the canvas IR and the export pipeline:

1. **A visible page**: people can't tell where the screen ends on an infinite canvas, and the export currently sizes the page from wherever elements happen to be.
2. **Multipage apps**: several pages with routes, linked by **dragging a wire from an element to a page** and releasing it (and dragging it off to unlink).
3. **Responsive output**: exports should work on every device, not only at the size they were drawn.
4. **Reusable components**: people and agents define a component once and drag instances of it.
5. **Multi-framework export**: Next.js, TanStack Start, Vue, SvelteKit, Astro and HTML, not only React + Vite.

Done separately, each would rework the IR and the generator. Done in this order, each step builds on the last.

## Where we are

- IR: `CanvasNode { id, type, x, y, width, height, props }` in a Yjs map `nodes`, mirrored in `client/src/figma/types.ts` and `server/src/export/ir.ts`. Groups store children in `props.childIds`, children use group-relative coordinates.
- Export: `GENERATORS` in `server/src/export/index.ts` maps a target id to a pure function `(IR) → FileMap`. Only `react-vite` exists. The other six targets are listed with `ready: false` and return 501.
- Layout is absolute everywhere. Groups already become components on export, but nothing is reusable and nothing adapts to screen size.
- There is no page boundary: the canvas is an infinite plane, and the export takes the bounding box of all elements plus 32px as the page. An element dropped far to the right makes the exported page that wide.
- One workspace = one screen. There are no pages, routes or links between elements and pages.

## Target design

### IR v2 (additive; old boards keep working)

```ts
type Sizing = { kind: 'fixed'; px: number } | { kind: 'fill' } | { kind: 'hug' };

type Layout =
  | { mode: 'free' }                                   // today's absolute positioning
  | {
      mode: 'stack';
      direction: 'row' | 'column';
      gap: number;
      padding: [number, number, number, number];       // top right bottom left
      align: 'start' | 'center' | 'end' | 'stretch';   // cross axis
      justify: 'start' | 'center' | 'end' | 'between'; // main axis
      wrap: boolean;                                   // rows wrap into columns on narrow screens
    };

type Breakpoint = 'tablet' | 'mobile';                 // base values are desktop

type CanvasNode = {
  id: string;
  type: NodeType | 'page' | 'instance';
  x: number; y: number; width: number; height: number; // still used in free layout
  props: Record<string, unknown>;
  layout?: Layout;                                     // containers: page, frame, card, group
  sizing?: { w: Sizing; h: Sizing };                   // how a child sizes inside a stack
  overrides?: Partial<Record<Breakpoint, NodePatch>>;  // phase 6
};

// phase 2: pages
type Page = {
  id: string;
  name: string;                                        // "Pricing"
  path: string;                                        // "/pricing", unique per workspace
  width: number;                                       // frame width: 1440 / 768 / 390 / custom
  foldHeight: number;                                  // dashed "first screen" line, e.g. 900
  flow: { x: number; y: number };                      // where the frame sits in Flow mode
  order: number;
};
type Link = { kind: 'page'; pageId: string } | { kind: 'url'; href: string };
// top-level nodes get props.pageId; elements that can be clicked get props.link?: Link

// phase 4
type ComponentDef = { id: string; name: string; rootId: string; props: PropDef[] };
type PropDef = { id: string; name: string; nodeId: string; field: 'text' | 'label' | 'placeholder' | 'alt' | 'on'; default: string | boolean };
// an instance node: type 'instance', props.componentId, props.values: Record<propId, value>
```

- A doc-level `meta` map gets `irVersion: 2`. Nodes without `layout` are `free`, nodes without `sizing` are `fixed`, so every v1 board is a valid v2 board without a migration script.
- Pages live in a third Yjs map, `pages`, in the same canvas doc. A v1 board has no pages: on first open it gets one page at `/` named "Home", sized to fit its existing elements, and every top-level node without a `pageId` belongs to it. That is the only write the upgrade makes, and it is idempotent.
- Component definitions live in a second Yjs map, `components`, in the same canvas doc, so they sync and persist like nodes. Their node subtrees stay in `nodes` under a root the canvas shows on a separate "Components" page.

### Page frame (the boundary people asked for)

- Each page is drawn as a frame on the canvas at its chosen width: presets Desktop 1440, Tablet 768, Mobile 390, or custom. Outside the frame the canvas is dimmed, so "inside the page" reads at a glance.
- A dashed fold line marks the first screen (default 900px desktop, 800px tablet, 700px mobile), labelled "First screen".
- **Off-page warning:** an element that ends up fully or partly outside the frame gets a warning outline while dragging and afterwards, and a "Not on the page" marker in the layer list. Export skips fully-outside elements and lists them in the export toast ("2 elements outside the page were left out"); partly-outside elements are clipped by the frame.
- **Snapping to the page:** the existing snap guides also catch the frame's left/right edges, centre line, and a 24px margin on each side.
- **Export uses the frame:** the page frame is the root and its width is the layout width. Nothing is measured from stray elements any more.
- The frame is a plain bounded container (free layout) at first. Phase 3 makes new frames default to vertical auto-layout (T-011).

### Pages and routes

- A Pages list in the canvas panel: add, rename, edit the path (validated: starts with `/`, unique, lowercase, no spaces), reorder, duplicate, delete (with a confirm listing incoming links).
- Design mode shows one page at a time; switching pages keeps each page's zoom and scroll. The layer list shows the current page only.
- Export (React first): one file per page in `src/pages/`, a router (TanStack Router), and `<Link to>` for links. Other printers emit their native routing as they ship (Next.js `app/<path>/page.tsx`, SvelteKit `routes/<path>/+page.svelte`, Astro `src/pages/<path>.astro`, plain HTML one file per page).
- The Doc stays one document per workspace. Canvas links can point at elements on any page; following one switches to that page and centres the element.

### Flow mode: drag to wire, drag to release

A **Design | Flow** toggle above the canvas. Flow is a separate mode because in Design, dragging already means move, resize and marquee.

- Flow lays every page frame out side by side at its `flow` position (frames can be dragged to rearrange the map).
- **Wire:** selecting a clickable element (button, text, image, card, badge) shows a round handle on its right edge. Drag from the handle: a curved wire follows the pointer, page frames highlight as valid targets, release on a frame to set `props.link = { kind: 'page', pageId }`. Release on empty canvas cancels.
- **Release / re-route:** grab the arrow end of an existing wire. Drop it on empty canvas to remove the link; drop it on another frame to re-route. A selected wire can also be removed with Delete.
- **Reading many wires:** wires are neutral; only the selected wire and the selected element's wires use the accent. Hovering a frame highlights all incoming wires. An element shows a small "→ Pricing" tag. A wire to a deleted page turns into a dashed warning.
- **Non-drag path (required):** a "Link to" picker in the side panel (pages, external URL, none) writes the same `props.link`. Keyboard, touch and precise edits use it; it works in Design mode too.
- **Preview mode:** a play button opens the current page in a preview where links navigate between pages, like the exported app.
- Collaboration: links are node props in the canvas Yjs doc, so wires appear live for everyone.

### Export pipeline v2

```
IR → lower() → ViewTree → printer(target) → FileMap → zip
```

- **`lower()`** (written once): splits the board into pages (one root per page frame, `pages: [{ path, root }]`), resolves links to routes, resolves instances and components, turns `free` containers into absolute children and `stack` containers into flex boxes, computes sizing, collects which primitives and components each file needs, normalizes positions, applies breakpoint overrides as responsive style variants, and escapes nothing (printers own escaping for their syntax).
- **`ViewTree`**: framework-neutral elements `{ kind: 'stack' | 'free' | primitive | 'instance', style, responsive?: { tablet?, mobile? }, text?, props? }` plus one entry per component with its prop list.
- **Shared Tailwind mapper**: `style → class string` (`flex flex-col gap-4 w-full max-md:flex-col ...`). Every Tailwind-based printer uses it, so layout output is identical across frameworks.
- **Printers**: React (TSX), Next.js and TanStack Start (React printer + their scaffolds), Vue (SFC), Svelte, Astro, HTML. Each owns its template syntax, escaping, scaffold and how the toggle keeps state (`useState`, `ref()`, `$state`, a small script or island).

### Responsive rules

- New canvases start with a `page` node: vertical stack, width `fill`, content max-width 1200px centered. Whatever is dropped into it is responsive by default; free positioning becomes an opt-in per container.
- Horizontal stacks with `wrap: true` collapse into a column on narrow screens without any breakpoint work.
- Breakpoints (phase 5): base values are desktop. Tablet (< 1024px) and mobile (< 768px) store only what changes. Export uses Tailwind's `max-lg:` / `max-md:` variants so the design-desktop-first habit maps directly.
- "Make responsive" helper: detects rows and columns in a free container from positions and **suggests** a stack layout. The user (or an agent) accepts it; it never converts silently.
- Free containers that remain at export keep absolute positioning inside a box that scales down to fit narrow screens, so even unconverted designs don't overflow sideways.

### Canvas behaviour changes

- Children of a stack are laid out by real flexbox in the canvas DOM (the canvas is already DOM-based, so the preview *is* the CSS). Dragging a child inside a stack **reorders** it instead of moving it; dragging it out makes it free in the target container.
- A layout panel appears for selected containers: mode, direction, gap, padding, alignment, wrap. Children get a sizing control: fixed / fill / hug, per axis.
- Snap guides only apply in free containers.

### Reusable components

- "Make component" on a selection: the subtree becomes the component's definition; the selection is replaced with an instance.
- "Your components" section in the palette; drag to place instances.
- Editing the definition updates every instance live (Yjs observers on the definition subtree).
- Props (phase 3b): mark a text, label, placeholder, alt or toggle state inside the component as a prop; instances set their own values in the side panel. Export emits real props: `<HeroCard title="Pricing" />`.
- Detach instance: turns it back into a plain group copy.

### Code components (last; needs a sandbox and the MCP server)

- Someone, or an agent via MCP, writes a TSX component with a declared props schema; it appears in the palette like any other component.
- Preview runs in a sandboxed `<iframe sandbox="allow-scripts">` served from a **separate origin** with no access to the app's cookies or storage, compiled in the browser with esbuild-wasm. Without the separate origin, a shared workspace would be a way to run code as another logged-in user.
- Export copies the source into `src/components/` for React-family targets; other targets show it as "React only" until there's a story for them.

## Phases and tasks

| ID | Task | Size | Depends on |
|----|------|------|------------|
| **Phase 1: foundation** | | | |
| T-006 | Split the React generator into `lower()` + `ViewTree` + React printer + shared Tailwind mapper. **No output change**: golden test asserts the kitchen-sink export is byte-identical before and after | S | — |
| T-007 | IR v2 types in both mirrors, `meta.irVersion`, defaults for missing `layout`/`sizing`, tests that v1 boards load unchanged | S | — |
| T-008 | CI matrix: for every `ready` target, generate the kitchen-sink project, `install`, `build`. A target can't flip to ready until it passes | S | T-006 |
| **Phase 2: pages and flow** | | | |
| T-023 | Page frame on the existing single page: frame drawn at a chosen width, dimmed outside, fold line, page-edge snapping, off-page warnings in canvas and layer list | M | T-007, design spec |
| T-024 | Export from the frame: frame is the root and sets the width; fully-outside elements skipped and reported in the export toast | S | T-006, T-023 |
| T-025 | `pages` map, v1 → one "Home" page at `/` on first open, Pages list (add, rename, path, reorder, duplicate, delete with incoming-link warning), per-page view state | M | T-023 |
| T-026 | Multipage React export: `src/pages/*`, TanStack Router, `<Link to>`; golden test + CI build of a 3-page fixture | M | T-024, T-025, T-008 |
| T-027 | Flow mode: frames side by side and draggable, drag-to-wire from element handle, drag the wire end off to release or onto another frame to re-route, wire styling and hover highlights, "Link to" picker as the non-drag path | L | T-025 |
| T-028 | Preview mode: render a page from the IR with working links between pages | M | T-027 |
| **Phase 3: responsive** | | | |
| T-009 | Canvas: stack containers rendered with flexbox, reorder-by-drag inside stacks, drag in/out, layout panel, sizing controls | L | T-007, design spec |
| T-010 | Export: stacks → flex classes via the mapper, sizing → `w-full` / `w-fit` / fixed, free containers absolute inside a fit-to-width box | M | T-006, T-007 |
| T-011 | New page frames default to vertical auto-layout (existing frames keep free layout until converted); "Make responsive" suggestion for free containers | M | T-009, T-023 |
| **Phase 4: components** | | | |
| T-012 | `components` map, Make component, palette section, instances, live propagation, detach, export one file per component | L | T-007, T-006 |
| T-013 | Props: mark fields as props, per-instance values, export as typed props | M | T-012 |
| T-029 | Shared layout: a header/footer component placed once and applied to every page (Next.js `layout.tsx`, SvelteKit `+layout.svelte`, ...) | M | T-012, T-026 |
| **Phase 5: more targets** (each = printer + scaffold + multipage routing + CI entry) | | | |
| T-014 | Next.js (App Router, `'use client'` where state is needed) | S | T-008 |
| T-015 | Plain HTML + Tailwind (components flattened, toggle as a small script) | S | T-008 |
| T-016 | TanStack Start | S | T-008 |
| T-017 | Vue 3 + Vite (SFC printer) | M | T-008 |
| T-018 | SvelteKit (Svelte 5 printer) | M | T-008 |
| T-019 | Astro (static output, toggle via island or script) | M | T-008 |
| **Phase 6: breakpoints** | | | |
| T-020 | Desktop / Tablet / Mobile switch, overrides stored per node, canvas preview per breakpoint, export as `max-lg:` / `max-md:` variants | L | T-009, T-010 |
| **Phase 7: code components and agents** | | | |
| T-021 | Sandboxed preview origin, esbuild-wasm compile, props schema, palette entry, export copy | L | T-012, separate-origin hosting |
| T-022 | MCP tools: `page.create`, `page.link`, `layout.makeResponsive`, `component.create`, `component.instantiate`, `export.run` | M | MCP server plan (not written yet) |

Phase 2 comes first after the foundation because the page frame changes what "the page" means for every later phase (auto-layout, breakpoints and export all hang off the frame). T-023 alone already fixes the "where does the screen end" problem and can ship on its own. Phases 3 and 4 can run in parallel after phase 2 if they're on separate branches: T-009 is canvas-heavy and T-012 touches the canvas too, so they need care (or run in sequence). Phase 5 targets are independent of each other once T-008 exists and can be split across builders.

## Testing

- Golden-file tests for `lower()` and every printer (kitchen-sink fixture extended with stacks, wrap, fill/hug, a component with props, instances, breakpoint overrides).
- The CI build matrix (T-008) proves each exported project compiles.
- Visual check per target: render the built kitchen sink at 1440 / 768 / 390px and compare screenshots against the canvas preview at the same breakpoints (QA, manual at first).
- Canvas: QA walks reorder-in-stack, drag in/out, sizing changes and component propagation with two tabs open.
- Pages and Flow: off-page warnings while dragging; v1 board opens as one "Home" page with nothing moved; wire, re-route and release a link by drag and by the "Link to" picker, with a second tab watching; deleting a linked page shows dashed warning wires; Preview navigates between pages; the 3-page export builds and its links work.

## Risks

- **Canvas.tsx is ~1,100 lines** and drag/snap/resize logic assumes free layout everywhere. T-009 should split stack behaviour into its own module rather than branching inside the existing handlers.
- **Preview/export drift**: canvas and export must use the same layout semantics. The Tailwind mapper's output is the reference; the canvas renders stacks with the equivalent inline flex styles from the same mapping table.
- **Component edits with collaborators**: two people editing a definition while others place instances. Yjs handles merging; the risk is UX (an instance changing under someone). Show "Edited by X" on the definition while it's being edited.
- **Code components are a security boundary.** No shortcuts on the separate origin.
- **Flow mode pointer handling** adds a third drag meaning (wire) on the same surface. Keeping it in a separate mode, with its own pointer handler module, avoids tangling it with move/resize/marquee in Canvas.tsx.
- **The v1 → pages upgrade writes to the board** on first open. It must be idempotent and safe with two people opening an old board at once (create the Home page under a fixed id so concurrent upgrades merge into one).

## Open questions for the owner

1. Design desktop-first (base = desktop, overrides for smaller) as planned, or mobile-first?
2. Breakpoints at 1024 and 768, or different values?
3. Components per workspace (planned), or a personal library shared across your workspaces?
4. Which export target matters most after React? The plan does Next.js first because it's smallest.
5. Default frame width for new pages: Desktop 1440 (planned), or start on Mobile 390?
6. Should export skip elements outside the page (planned, with a note in the toast), or include them and warn?
7. Router for multipage React exports: TanStack Router (planned, matches the app's own stack) or React Router?
