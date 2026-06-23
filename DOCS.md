# Lazy Builder — File-by-File Documentation

A real-time collaborative workspace with two surfaces: a Notion-like block editor and a Figma-like infinite canvas. The canvas exports to runnable React+Vite projects.

---

## Project Structure

```
lazy_builder/
├── .env                          # Environment config (VITE_WEBSOCKET_PORT)
├── package.json                  # Root package (server deps + some misplaced client deps)
├── DOCS.md                       # ← you are here
│
├── client/                       # React SPA (Vite)
│   ├── package.json              # Client dependencies
│   ├── vite.config.ts            # Vite + Tailwind + React plugin config
│   ├── tsconfig*.json            # TypeScript configs
│   ├── index.html                # HTML entry point
│   ├── public/                   # Static assets
│   └── src/
│       ├── main.tsx              # React entry point
│       ├── App.tsx               # Root component (renders Workspace)
│       ├── App.css               # Tailwind import
│       ├── index.css             # Global styles (Tailwind, highlight.js, TipTap)
│       │
│       ├── components/           # Editor-related components
│       │   ├── Editor.tsx        # TipTap rich-text editor with Yjs collaboration
│       │   ├── FigmaRef.ts       # TipTap inline node: cross-surface link to canvas
│       │   ├── SlashCommand.ts   # TipTap extension: "/" command palette
│       │   └── SlashMenu.tsx     # React component: floating dropdown for slash commands
│       │
│       ├── figma/                # Canvas system
│       │   ├── types.ts          # CanvasNode type + NodeType union (the IR seed)
│       │   └── Canvas.tsx        # Infinite canvas: nodes, drag, resize, grouping, layers
│       │
│       └── workspace/            # App shell
│           ├── Workspace.tsx     # Top-level layout: sidebar, surface tabs, state mgmt
│           └── FigmaStub.tsx     # Dead placeholder (unused, from earlier phase)
│
└── server/                       # y-websocket relay
    ├── package.json              # Server dependencies
    └── src/
        └── server.ts             # Minimal WebSocket relay for Yjs sync
```

---

## Root Files

### `.env`
```
VITE_WEBSOCKET_PORT=1234
```
Single config: the port the y-websocket server listens on. Client reads this via Vite's `import.meta.env`.

### `package.json` (root)
Named `"server"` (historical accident). Contains a mix of server deps (`ws`, `dotenv`, `tsx`) and misplaced client deps (`tailwindcss`, `@tiptap/extension-placeholder`). The actual server runs from `server/package.json`. This file's `dev` script points at a nonexistent `src/server.ts` at root — ignore it.

---

## Client — Entry & Global

### `client/src/main.tsx`
React 19 entry point. Mounts `<App />` into `#root` with `StrictMode`. Standard Vite scaffold.

### `client/src/App.tsx`
Single line: renders `<Workspace />`. No routing, no providers — all state lives in Workspace.

### `client/src/App.css`
Just `@import "tailwindcss"`. Loads Tailwind CSS 4 via the Vite plugin.

### `client/src/index.css`
Global styles:
- Tailwind import (`@import "tailwindcss"`)
- `@tailwindcss/typography` plugin for `.prose` classes
- highlight.js theme (`github-dark`) for code blocks
- TipTap editor caret styling (`.tiptap p.is-editor-empty`)
- TipTap placeholder text via `::before` pseudo-element

---

## Client — Components (Editor Surface)

### `client/src/components/Editor.tsx`
**The Notion surface.** A TipTap rich-text editor backed by Yjs for real-time collaboration.

**Props:**
- `docId: string` — Yjs room name (e.g., `"workspace-id:notion"`)
- `figmaBoardId?: string` — if set, connects to the Figma board to list nodes for cross-referencing
- `onFigmaRefClick?: (nodeId: string) => void` — callback when a FigmaRef pill is clicked

**What it does:**
- Creates a `Y.Doc` + `WebsocketProvider` for the Notion doc
- If `figmaBoardId` is set, opens a second read-only Yjs connection to the Figma board to populate the "Insert Figma ref" dropdown
- Renders TipTap with extensions: StarterKit, Collaboration, CodeBlockLowlight, Placeholder, FigmaRef, SlashCommand
- Click delegation: clicks on `[data-node-id]` elements fire `onFigmaRefClick` (cross-surface nav)

**Key function:** `nodeLabel(n)` — maps CanvasNode to a human-readable label for the FigmaRef dropdown. Handles all node types.

### `client/src/components/FigmaRef.ts`
**A TipTap custom inline node.** Represents a cross-surface reference to a Figma canvas node, embedded inside the Notion editor.

**Attributes:**
- `nodeId: string` — the CanvasNode ID being referenced
- `label: string` — display text

**Rendering:** A violet pill (`🎨 label`) with:
- `data-figma-ref` and `data-node-id` attributes for click delegation
- Hover state (slightly darker bg)
- Cursor pointer (clickable)

**Purpose:** Bridges Notion ↔ Figma. Click a ref → navigate to that node on the canvas. Used for dev documentation: write notes about a component in Notion, link to its canvas representation.

### `client/src/components/SlashCommand.ts`
**TipTap extension.** Adds a "/" command menu that appears when the user types `/` at the start of a block.

**Commands:** Heading 1, Heading 2, Bullet List, Numbered List, Code Block.

**How it works:**
- Uses `@tiptap/suggestion` to detect the `/` trigger character
- Filters commands by query
- Renders `SlashMenu` via `ReactRenderer`
- On selection: deletes the `/query` text and applies the block transform

### `client/src/components/SlashMenu.tsx`
**React component.** The floating dropdown that appears for slash commands.

**Features:**
- Keyboard navigation (↑↓ arrows, Enter to select, Escape to close)
- Mouse hover highlighting
- "No results" state

**Interface:** `CommandItem` = `{ title, run(editor, range) }`. The `SlashMenuRef` exposes `onKeyDown` for the suggestion framework to drive keyboard events.

---

## Client — Figma Surface (Canvas)

### `client/src/figma/types.ts`
**The IR (Intermediate Representation) seed.** Defines the data model for canvas nodes.

```typescript
type NodeType = 'frame' | 'box' | 'text' | 'button' | 'input' | 'image' 
              | 'divider' | 'card' | 'badge' | 'toggle' | 'group';

type CanvasNode = {
  id: string;
  type: NodeType;
  x: number;  y: number;
  width: number;  height: number;
  props: Record<string, unknown>;
};
```

**Design rationale:**
- `props` is loose (`Record<string, unknown>`) for now — each node type stores what it needs (`label`, `text`, `placeholder`, `docs`, `childIds`, `parentId`, etc.)
- `group` nodes use `props.childIds` to reference children
- Children use `props.parentId` to reference their group
- Children store coordinates **relative to their group**
- On export, each node type maps 1:1 to a React component

**Props by node type:**

| Type | Key props | Description |
|------|-----------|-------------|
| frame | `label` | Dashed-border container |
| card | `label` | Solid-border container with shadow |
| box | — | Solid rectangle |
| text | `text` | Text content |
| button | `label` | Button label |
| input | `placeholder` | Input placeholder |
| image | `alt` | Image alt text |
| divider | — | Horizontal line |
| badge | `text` | Badge text |
| toggle | `on` | Boolean on/off state |
| group | `childIds: string[]` | Array of child node IDs |
| *(all)* | `docs?: string` | Dev documentation |
| *(child)* | `parentId?: string` | Parent group ID |

### `client/src/figma/Canvas.tsx`
**The Figma surface.** A ~900-line component implementing an infinite canvas with pan, zoom, drag, snap, resize, grouping, multi-select, and a layers panel.

#### Constants

- `INITIAL_NODES` — 4 demo nodes seeded on first open
- `DEFAULTS` — default size + props per NodeType
- `PALETTE` — icon + type for the component picker
- `SNAP = 6` — snap threshold in pixels

#### State

| State | Type | Purpose |
|-------|------|---------|
| `nodes` | `CanvasNode[]` | Mirror of Yjs map for React rendering |
| `selectedIds` | `Set<string>` | Multi-selection |
| `lastSelectedId` | `string \| null` | Last clicked (for docs panel) |
| `guides` | `{ x: number[], y: number[] }` | Snap guide line positions |
| `view` | `{ scale, tx, ty }` | Pan/zoom transform |
| `marquee` | `Marquee` | Marquee selection rect |
| `expandedGroups` | `Set<string>` | Which groups are expanded in layer tree |

#### Refs

| Ref | Purpose |
|-----|---------|
| `drag` | Active drag state (node ID, offset, child IDs for snap exclusion) |
| `pan` | Active pan state (start position, initial transform) |
| `marqueeRef` | Marquee start position |
| `resize` | Active resize state (node ID, handle direction, original dimensions) |

#### Yjs Connection

- Creates `Y.Doc` + `Y.Map<CanvasNode>('nodes')` per mount
- `WebsocketProvider` connects to `ws://localhost:1234` with `boardId` as room name
- Observes map changes → mirrors to React state
- Seeds demo nodes on first sync if map is empty

#### Coordinate System

- **Screen coords:** pixel position on screen
- **World coords:** position in the infinite canvas (accounts for pan + zoom)
- `toWorld(clientX, clientY)` converts screen → world
- All node positions stored in world coords
- DOM transform: `translate(tx, ty) scale(scale)` with `transform-origin: 0 0`

#### Selection

- **Click:** select single node (clear others)
- **Shift+click:** toggle node in selection
- **Shift+drag on empty canvas:** marquee selection (select all enclosed nodes)
- **Ctrl+A:** select all top-level nodes
- **Escape:** deselect all

#### Drag & Snap

- Dragging a node captures pointer and tracks offset
- On move: calculates raw position, runs snap algorithm against all other nodes
- Snap: tests 3 anchors per axis (left/center/right, top/middle/bottom) — if within 6px, snaps
- Snap guide lines rendered as fuchsia `<div>` elements
- Group drag: only group node moves in Yjs; children follow via DOM relative positioning

#### Resize

- 8 handles: 4 corners + 4 edges (nw, n, ne, e, se, s, sw, w)
- Each handle has a cursor style matching its direction
- Dragging a handle changes `x, y, width, height` based on direction
- West/north handles move the origin while shrinking
- East/south handles extend from origin
- Minimum size: 20px
- Group resize: scales children proportionally (ratio-based)

#### Grouping

- **Group:** selected nodes (≥2) → calculate bounding box → create group node → set `parentId` on children → adjust children to group-relative coords
- **Ungroup:** selected group → convert children back to absolute coords → remove `parentId` → delete group
- All in single `Y.Doc` transaction for atomicity

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+G` | Group selected |
| `Ctrl+Shift+G` | Ungroup selected |
| `Delete` / `Backspace` | Delete selected |
| `Escape` | Deselect |
| `Ctrl+A` | Select all top-level |

#### Components (sidebar palette)

10 node types in a 2-column grid: card, frame, box, text, button, input, image, divider, badge, toggle.

#### LayerTree Component

Renders in the sidebar. Shows all root nodes with:
- Type icon + display name
- Expand/collapse for groups (▸/▾ arrow)
- Children indented under parent
- Click to select on canvas
- Double-click to rename inline
- 📄 indicator if node has docs
- Selected state highlighted in violet

#### NodeView Component

Renders a single canvas node. Handles:
- Position/size via CSS `left/top/width/height`
- Selection ring (`ring-2 ring-violet-500`)
- Type-specific visual (delegates to `NodeInner`)
- Group rendering: dashed outline + children inside
- 📄 badge for nodes with docs
- Resize handles when selected

#### NodeInner Component

Pure visual rendering per node type. No state, no interaction — just the styled content:
- frame: dashed border + label
- card: solid border + shadow + label
- button: violet bg + white text
- text: plain text
- input: bordered field + placeholder
- image: gray bg + 🖼 icon + alt
- divider: horizontal line
- badge: violet pill + text
- toggle: on/off switch visual
- box: solid gray rectangle

---

## Client — Workspace Shell

### `client/src/workspace/Workspace.tsx`
**The app shell.** Manages workspaces, surface switching, and cross-surface navigation.

**Layout:**
- **Sidebar (left):** workspace list, dark mode toggle, collapsed → hamburger button
- **Navbar (top):** surface tabs (Notion / Figma), workspace name
- **Main area:** either Editor (Notion surface) or Canvas (Figma surface)

**State:**

| State | Persisted | Purpose |
|-------|-----------|---------|
| `workspaces` | localStorage | List of `{ id, name, figma }` |
| `activeId` | — | Current workspace ID |
| `surface` | — | `'notion'` or `'figma'` |
| `sidebarOpen` | — | Sidebar visibility |
| `selectedNodeId` | — | Cross-surface selection target |
| `editingWsId` | — | Which workspace name is being edited |
| `editWsName` | — | Edit buffer for workspace rename |
| `dark` | localStorage (`theme`) | Dark mode toggle |

**Workspace data:** `{ id: string, name: string, figma: boolean }`. Stored in localStorage under `lazy-builder-workspaces`. Default: one "Welcome" workspace with Figma enabled.

**Surface switching:**
- Tab click → set surface
- FigmaRef click → set surface to 'figma' + set `selectedNodeId`
- Workspace switch → reset to 'notion'

**Workspace renaming:** Double-click workspace name → inline input → Enter/blur to commit, Escape to cancel.

**Cross-surface nav:** `handleFigmaRefClick(nodeId)` → sets `selectedNodeId` + switches to Figma surface → Canvas receives `selectedNodeId` prop → selects that node.

**Yjs room naming:** `{workspaceId}:notion` for the editor, `{workspaceId}:figma` for the canvas.

### `client/src/workspace/FigmaStub.tsx`
**Dead code.** A placeholder component from before Canvas.tsx was built. Not imported anywhere. Safe to delete.

---

## Server

### `server/src/server.ts`
**Minimal y-websocket relay.** 22 lines.

**What it does:**
1. Loads `.env` for `VITE_WEBSOCKET_PORT`
2. Creates a `WebSocketServer` on that port
3. On each connection: delegates to `setupWSConnection` from `y-websocket/bin/utils`

**What it does NOT do:**
- No persistence (in-memory only)
- No authentication
- No data transformation
- No awareness (cursor positions, etc.)

**How Yjs sync works:** Each Yjs document (identified by room name) is stored in memory. When a client connects to a room, the server relays updates between all connected clients. When all clients disconnect, the document is garbage collected.

---

## Architecture Decisions

### Why no external canvas library?
Plain React DOM elements positioned with CSS transforms. Simpler, no extra deps, and the canvas is a UI builder — nodes ARE DOM elements, not drawings. Maps directly to React component export.

### Why Yjs for everything?
Both surfaces need real-time collaboration. Yjs CRDTs handle conflict-free merging. Each surface gets its own Y.Doc (separate room), keeping concerns isolated.

### Why `props: Record<string, unknown>`?
Loose typing for rapid prototyping. Each node type stores what it needs. Will tighten to discriminated unions when the IR stabilizes for export.

### Why children use relative coordinates?
Groups are positioned containers. Children inside use coords relative to the group. This makes group drag O(1) — only the group node moves. DOM handles child positioning automatically.

### Why localStorage for workspaces?
No server persistence yet. localStorage is per-browser, sufficient for prototype. Will move to server-side storage when multi-device sync is needed.

---

## Key Interactions

### Cross-surface flow
```
Notion doc → FigmaRef pill → click → Workspace switches to Figma → Canvas selects node
Canvas node → has docs → 📄 badge visible → docs panel in sidebar
```

### Group flow
```
Select ≥2 nodes → Ctrl+G → group created → children become relative
Select group → Ctrl+Shift+G → ungroup → children back to absolute
Drag group → only group moves in Yjs → children follow via DOM
Resize group → children scale proportionally
```

### Export flow (planned)
```
CanvasNode tree → per-type React component → Vite project scaffold
frame → <Frame> wrapper
button → <button> with label
group → parent component with children nested
input → <input> with placeholder
→ src/components/*.tsx + App.tsx + vite.config.ts + package.json
```
