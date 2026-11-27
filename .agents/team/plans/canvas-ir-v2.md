# Plan: Canvas IR v2 (responsive layout, reusable components, multi-framework export)

Status: proposed · Owner: orchestrator · Written: 2026-11-27

## Why one plan

Three things the owner asked for change the same core, the canvas IR and the export pipeline:

1. **Responsive output**: exports should work on every device, not only at the size they were drawn.
2. **Reusable components**: people and agents define a component once and drag instances of it.
3. **Multi-framework export**: Next.js, TanStack Start, Vue, SvelteKit, Astro and HTML, not only React + Vite.

Done separately, each would rework the IR and the generator. Done in this order, each step builds on the last.

## Where we are

- IR: `CanvasNode { id, type, x, y, width, height, props }` in a Yjs map `nodes`, mirrored in `client/src/figma/types.ts` and `server/src/export/ir.ts`. Groups store children in `props.childIds`, children use group-relative coordinates.
- Export: `GENERATORS` in `server/src/export/index.ts` maps a target id to a pure function `(IR) → FileMap`. Only `react-vite` exists. The other six targets are listed with `ready: false` and return 501.
- Layout is absolute everywhere. Groups already become components on export, but nothing is reusable and nothing adapts to screen size.

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
  overrides?: Partial<Record<Breakpoint, NodePatch>>;  // phase 5
};

// phase 3
type ComponentDef = { id: string; name: string; rootId: string; props: PropDef[] };
type PropDef = { id: string; name: string; nodeId: string; field: 'text' | 'label' | 'placeholder' | 'alt' | 'on'; default: string | boolean };
// an instance node: type 'instance', props.componentId, props.values: Record<propId, value>
```

- A doc-level `meta` map gets `irVersion: 2`. Nodes without `layout` are `free`, nodes without `sizing` are `fixed`, so every v1 board is a valid v2 board without a migration script.
- Component definitions live in a second Yjs map, `components`, in the same canvas doc, so they sync and persist like nodes. Their node subtrees stay in `nodes` under a root the canvas shows on a separate "Components" page.

### Export pipeline v2

```
IR → lower() → ViewTree → printer(target) → FileMap → zip
```

- **`lower()`** (written once): resolves instances and components, turns `free` containers into absolute children and `stack` containers into flex boxes, computes sizing, collects which primitives and components each file needs, normalizes positions, applies breakpoint overrides as responsive style variants, and escapes nothing (printers own escaping for their syntax).
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
| **Phase 2: responsive** | | | |
| T-009 | Canvas: stack containers rendered with flexbox, reorder-by-drag inside stacks, drag in/out, layout panel, sizing controls | L | T-007, design spec |
| T-010 | Export: stacks → flex classes via the mapper, sizing → `w-full` / `w-fit` / fixed, free containers absolute inside a fit-to-width box | M | T-006, T-007 |
| T-011 | New canvases start with a responsive `page` node; "Make responsive" suggestion for free containers | M | T-009 |
| **Phase 3: components** | | | |
| T-012 | `components` map, Make component, palette section, instances, live propagation, detach, export one file per component | L | T-007, T-006 |
| T-013 | Props: mark fields as props, per-instance values, export as typed props | M | T-012 |
| **Phase 4: more targets** (each = printer + scaffold + CI entry) | | | |
| T-014 | Next.js (App Router, `'use client'` where state is needed) | S | T-008 |
| T-015 | Plain HTML + Tailwind (components flattened, toggle as a small script) | S | T-008 |
| T-016 | TanStack Start | S | T-008 |
| T-017 | Vue 3 + Vite (SFC printer) | M | T-008 |
| T-018 | SvelteKit (Svelte 5 printer) | M | T-008 |
| T-019 | Astro (static output, toggle via island or script) | M | T-008 |
| **Phase 5: breakpoints** | | | |
| T-020 | Desktop / Tablet / Mobile switch, overrides stored per node, canvas preview per breakpoint, export as `max-lg:` / `max-md:` variants | L | T-009, T-010 |
| **Phase 6: code components and agents** | | | |
| T-021 | Sandboxed preview origin, esbuild-wasm compile, props schema, palette entry, export copy | L | T-012, separate-origin hosting |
| T-022 | MCP tools: `layout.makeResponsive`, `component.create`, `component.instantiate`, `export.run` | M | MCP server plan (not written yet) |

Phases 2 and 3 can run in parallel after phase 1 if they're on separate branches: T-009 is canvas-heavy, T-012 touches the canvas too, so they need care (or run in sequence). Phase 4 targets are independent of each other once T-008 exists and can be split across builders.

## Testing

- Golden-file tests for `lower()` and every printer (kitchen-sink fixture extended with stacks, wrap, fill/hug, a component with props, instances, breakpoint overrides).
- The CI build matrix (T-008) proves each exported project compiles.
- Visual check per target: render the built kitchen sink at 1440 / 768 / 390px and compare screenshots against the canvas preview at the same breakpoints (QA, manual at first).
- Canvas: QA walks reorder-in-stack, drag in/out, sizing changes and component propagation with two tabs open.

## Risks

- **Canvas.tsx is ~1,100 lines** and drag/snap/resize logic assumes free layout everywhere. T-009 should split stack behaviour into its own module rather than branching inside the existing handlers.
- **Preview/export drift**: canvas and export must use the same layout semantics. The Tailwind mapper's output is the reference; the canvas renders stacks with the equivalent inline flex styles from the same mapping table.
- **Component edits with collaborators**: two people editing a definition while others place instances. Yjs handles merging; the risk is UX (an instance changing under someone). Show "Edited by X" on the definition while it's being edited.
- **Code components are a security boundary.** No shortcuts on the separate origin.

## Open questions for the owner

1. Design desktop-first (base = desktop, overrides for smaller) as planned, or mobile-first?
2. Breakpoints at 1024 and 768, or different values?
3. Components per workspace (planned), or a personal library shared across your workspaces?
4. Which export target matters most after React? The plan does Next.js first because it's smallest.
