# Lazy Builder — File-by-File Documentation

A real-time collaborative workspace with two surfaces: a Notion-like block editor and a Figma-like infinite canvas. The canvas exports to runnable React+Vite projects.

---

## Project Structure

See the tree in [README.md](./README.md#-project-structure). This file goes through each piece.

---

## Root Files

### `.env` / `.env.example`
One `.env` at the repo root serves both apps (`client/vite.config.ts` sets `envDir: '..'`, the server's scripts use `bun --env-file=../.env`). `.env` is git-ignored; `.env.example` lists every variable:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | server | Postgres connection string (required) |
| `JWT_SECRET` | server | Signs session tokens, ≥32 chars (required) |
| `JWT_EXPIRES_IN_SECONDS` | server | Session length, default 7 days |
| `PORT` / `COLLAB_PORT` | server, Vite proxy | HTTP API (3001) and collab WebSocket (1234) |
| `CLIENT_ORIGIN` | server | CORS origin for `/api` |
| `VITE_COLLAB_URL` | client | Optional override for the collab URL in production |

### `package.json` (root)
Left over from the original layout and not used by either app. Each app has its own `package.json` and `bun.lock`.

---

## Client — Entry & Global

### `client/src/main.tsx`
React 19 entry point. Wraps the app in `QueryClientProvider` and `RouterProvider`.

### `client/src/router.tsx`
TanStack Router, code-based routes:

| Route | Guard | Renders |
|-------|-------|---------|
| `/login` | redirects to `/` when logged in | `LoginPage` |
| `/` | needs a session | redirects to the first workspace, or the empty state |
| `/w/$workspaceId` | needs a session | `Workspace` for that id |

Guards call `queryClient.ensureQueryData(meQuery)`, so the session check is cached and shared with the rest of the app.

### `client/src/lib/api.ts`, `queries.ts`, `collab.ts`
- `api.ts`: `fetch` wrapper for `/api` that throws `ApiError(status, message)`, plus the response types.
- `queries.ts`: TanStack Query options and mutations (session, workspaces, export targets, create/update/delete/join, login/logout).
- `collab.ts`: `connectDoc(name, ydoc)` returns a `HocuspocusProvider`. No token is passed; the browser sends the httpOnly cookie on the WebSocket upgrade.

### `client/src/auth/LoginPage.tsx`
Login and register in one form. On success it seeds the `me` query and navigates to `/`.

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
- `readOnly?: boolean` — viewers get a non-editable editor and no ref picker

**What it does:**
- Creates a `Y.Doc` and connects it with `connectDoc` (Hocuspocus)
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
- `connectDoc(boardId, ydoc)` connects through Hocuspocus
- Observes map changes → mirrors to React state
- Seeds demo nodes on first sync if the map is empty and the connection is read-write

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
**The app shell.** Takes `workspaceId` from the route; workspace data comes from the API.

**Layout:**
- **Sidebar (left):** workspace list (double-click to rename), new workspace, join with invite code, account, dark mode, log out
- **Toolbar (top):** surface tabs (Notion / Figma), "Add Figma page", export target picker, **Export**, invite code (owners), Delete (owners)
- **Main area:** Editor, Canvas, or the empty state when the user has no workspaces

**Data:** `workspacesQuery` (list with the caller's role), `workspaceQuery(id)` (detail, including the invite code for owners), `exportTargetsQuery`. Mutations invalidate the list so the sidebar stays current.

**Local state:** `surface`, `sidebarOpen`, `selectedNodeId`, rename buffer, invite input, `dark` (localStorage).

**Viewers:** `role === 'viewer'` makes the editor read-only and hides edit controls. The server enforces this too; the canvas has no read-only mode yet, so a viewer's local changes are rejected by the server and disappear on reload.

**Export:** a plain `<a href="/api/workspaces/:id/export" download>`. Disabled when the workspace has no canvas or the chosen target isn't ready.

**Yjs room naming:** `{workspaceId}:notion` for the editor, `{workspaceId}:figma` for the canvas.

### `client/src/workspace/FigmaStub.tsx`
**Dead code.** A placeholder from before Canvas.tsx existed. Not imported anywhere.

---

## Server

### `server/src/index.ts`
Starts two `Bun.serve` instances: the Hono API on `PORT` and the collab WebSocket on `COLLAB_PORT`. On SIGINT/SIGTERM it closes collab connections, flushes pending document writes, then closes the DB pool.

### `server/src/config/env.ts`
Validates the environment with zod and exits on boot if `DATABASE_URL` or `JWT_SECRET` (≥32 chars) is missing.

### `server/src/db/schema.ts` + `server/drizzle/`
Drizzle schema and generated SQL migrations.

| Table | Key columns |
|-------|-------------|
| `users` | `email` (unique), `password_hash` (argon2id via `Bun.password`) |
| `workspaces` | `owner_id`, `has_canvas`, `export_target`, `invite_code` (unique) |
| `workspace_members` | (`workspace_id`, `user_id`) primary key, `role`: owner/editor/viewer |
| `documents` | `name` = `{workspaceId}:{notion\|figma}`, `state` (Yjs update, `bytea`) |

Change the schema, then `bun run db:generate` to write a new migration and `bun run db:migrate` to apply it.

### `server/src/routes/`
- `auth.routes.ts`: `POST /register`, `POST /login`, `POST /logout`, `GET /me`. Login sets an httpOnly `token` cookie and also returns the token so agents/CLIs can send it as `Authorization: Bearer`.
- `workspace.routes.ts`: list/create/get/update/delete, `POST /join` (invite code), members (list, change role, remove/leave), and `GET /:id/export`.
- `export.routes.ts`: `GET /targets`, the stacks the picker shows.

Non-members get **404** for a workspace (not 403), so ids can't be probed.

### `server/src/collab/server.ts`
Hocuspocus core on `Bun.serve` through the crossws Bun adapter (Hocuspocus' own `Server` class only runs on Node).
- `onAuthenticate`: parses the doc name, reads the JWT from the cookie (or the provider token), checks membership, sets `readOnly` for viewers.
- `Database` extension: `fetch` loads `documents.state`, `store` upserts it (debounced by Hocuspocus).

### `server/src/export/`
- `ir.ts`: server copy of the `CanvasNode` type and `readCanvas(ydoc)`.
- `targets.ts`: every target the picker lists; `ready` marks the ones with a generator.
- `index.ts`: generator registry and `zipProject` (one top-level folder per zip).
- `react-vite/generate.ts`: IR → file map. Groups become components (named from their label), used primitives get a component in `src/components/ui/`, positions are normalized to a padded origin, all text goes through `JSON.stringify` so nothing can break out of JSX.
- `react-vite/generate.test.ts`: `bun test`. The kitchen-sink fixture also builds with `tsc -b && vite build`.

The export route reads the canvas through `hocuspocus.openDirectConnection`, so edits that haven't been saved yet are included.

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

### Why one origin in dev?
Vite proxies `/api` and `/collab`, so the session cookie is first-party for both REST and WebSocket and the client never handles a token. Production does the same with a reverse proxy.

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

### Export flow
```
Toolbar "Export" → GET /api/workspaces/:id/export
  → membership check, has_canvas, target has a generator
  → openDirectConnection("{id}:figma") → readCanvas → CanvasNode[]
  → generateReactVite → { path: source }
  → zipProject → my-workspace.zip (my-workspace/…)
Unzip → npm install → npm run dev
```
