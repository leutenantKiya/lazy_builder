<p align="center">
  <h1 align="center">🧱 Lazy Builder</h1>
  <p align="center">
    <strong>A Figma-like visual builder meets Notion-like notepad — that exports to real React projects.</strong>
  </p>
  <p align="center">
    Design components on an infinite canvas. Document them in a rich-text editor. Export everything as a runnable React + Vite project.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Yjs-CRDT-FF6B6B" />
  <img src="https://img.shields.io/badge/TipTap-3-1a1a2e" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
</p>

---

## 🤔 What Is This?

**Lazy Builder** is a developer tool that lets you prototype React UIs visually — combining a **Figma-like canvas** for laying out components with a **Notion-like editor** for writing developer documentation — then **exporting the result as a real, runnable React + Vite project**.

Think of it as the missing middle ground between Figma (designers) and VS Code (developers).

### The Problem

1. **Figma → Code is lossy.** Designers hand off mockups, developers re-interpret them. Context gets lost.
2. **Low-code builders are closed ecosystems.** They generate proprietary code you can't maintain.
3. **Developer notes live separately.** Documentation about _why_ a component exists lives in Notion/Confluence/Slack — disconnected from the thing it describes.

### The Solution

Lazy Builder gives you **two linked surfaces**:

| Surface | What it does |
|---------|-------------|
| 🎨 **Canvas** (Figma-like) | Drag, drop, resize, snap, and group UI primitives on an infinite canvas |
| 📝 **Editor** (Notion-like) | Write rich-text documentation with slash commands, code blocks, and cross-references to canvas nodes |

The surfaces are **cross-linked**: click a reference pill in the editor → jump to that component on the canvas. Canvas nodes can carry inline docs visible in the sidebar.

When you're done, **export** → get a clean `src/components/*.tsx` + `App.tsx` + `vite.config.ts` + `package.json`.

---

## ✨ Features

### 🎨 Canvas Surface
- **Infinite canvas** with pan (middle-click drag) and zoom (scroll wheel)
- **10 UI primitives**: Frame, Card, Box, Text, Button, Input, Image, Divider, Badge, Toggle
- **Drag & drop** from component palette with smart **snap guides** (6px threshold, 3 anchors per axis)
- **Multi-select** (Shift+Click) and **marquee selection** (Shift+Drag on empty space)
- **Resize** via 8 directional handles (corners + edges) with proportional group scaling
- **Grouping** (`Ctrl+G`) and **ungrouping** (`Ctrl+Shift+G`) with relative coordinate system
- **Layer tree** panel with expand/collapse, click-to-select, double-click-to-rename, and doc indicators
- **Per-node documentation** panel in the sidebar

### 📝 Editor Surface
- **TipTap-based** rich text editor with real-time collaboration
- **Slash commands** (`/`) — Heading 1, Heading 2, Bullet List, Numbered List, Code Block
- **Syntax highlighting** via highlight.js (github-dark theme)
- **FigmaRef pills** — inline cross-references to canvas nodes (violet `🎨 Component Name` pills)
- **Click-to-navigate**: click a FigmaRef pill → switch to canvas → node auto-selected

### 🔗 Cross-Surface Integration
- Editor can reference any canvas node via FigmaRef inline nodes
- Clicking a reference switches surfaces and selects the target node
- Canvas nodes with docs show a 📄 badge
- Both surfaces share workspace context

### 🌐 Real-Time Collaboration
- **Yjs CRDT** for conflict-free real-time sync across all connected clients
- Separate Yjs documents per surface (`{workspaceId}:notion`, `{workspaceId}:figma`)
- **Hocuspocus** server checks access on connect and saves every document to Postgres
- Binary CRDT updates over WebSocket — no server-side conflict resolution needed

### 🗂️ Workspace Management
- Accounts (email + password) with an httpOnly session cookie
- Workspaces stored in Postgres, each with its own canvas + editor pair
- Roles per workspace: **owner**, **editor**, **viewer** (read-only)
- Invite teammates with a join code
- Inline rename (double-click), dark mode toggle (persisted)

### 📦 Export
- Pick an export stack per workspace: React + Vite today; Next.js, TanStack Start, Vue, SvelteKit, Astro and plain HTML are listed as coming soon
- **Export** downloads a zip with a runnable project: `npm install && npm run dev`
- Each canvas group becomes its own component; every primitive used gets a small component in `src/components/ui/`
- Layout matches the canvas (absolute positioning); per-node docs are kept as code comments

---

## 🏗️ Architecture

```
┌──────────────────────────────── Browser ────────────────────────────────┐
│  Editor (TipTap + Yjs)  ◄── FigmaRef ──►  Canvas (React DOM + Yjs)      │
│            │                                     │                      │
│            └──── HocuspocusProvider (cookie) ────┘    REST (TanStack Query)
└───────────────────────────│──────────────────────────────────│───────────┘
                    ws /collab                            http /api
                            ▼                                  ▼
              ┌──────────────────────────┐      ┌──────────────────────────┐
              │ Hocuspocus on Bun.serve  │      │ Hono API on Bun          │
              │ • JWT + membership check │      │ • auth, workspaces,      │
              │ • viewers read-only      │      │   members, export (zip)  │
              │ • debounced persistence  │      │                          │
              └────────────┬─────────────┘      └────────────┬─────────────┘
                           └──────────── Postgres ───────────┘
                         users · workspaces · members · documents (Yjs state)
```

In development Vite proxies `/api` and `/collab` to the server, so the browser talks to one origin and the auth cookie just works. In production, put the same two paths behind your reverse proxy.

---

## 🛠️ Tech Stack

### Client

| Technology | Purpose |
|-----------|---------|
| [React 19](https://react.dev) + [Vite 8](https://vite.dev) + TypeScript | UI, dev server, bundler |
| [TanStack Router](https://tanstack.com/router) | Routes and the login guard |
| [TanStack Query](https://tanstack.com/query) | Server state (session, workspaces, export targets) |
| [TipTap 3](https://tiptap.dev) | Rich-text editor (Notion surface) |
| [Yjs](https://yjs.dev) + [@hocuspocus/provider](https://tiptap.dev/docs/hocuspocus) | Real-time collaboration |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling |

### Server

| Technology | Purpose |
|-----------|---------|
| [Bun](https://bun.sh) | Runtime, password hashing (argon2id), test runner |
| [Hono](https://hono.dev) | HTTP API |
| [Hocuspocus](https://tiptap.dev/docs/hocuspocus) + [crossws](https://crossws.h3.dev) | Yjs collaboration server, run on `Bun.serve` |
| [PostgreSQL](https://www.postgresql.org) + [Drizzle ORM](https://orm.drizzle.team) | Storage and migrations |
| [zod](https://zod.dev) | Env and request validation |
| [fflate](https://github.com/101arrowz/fflate) | Zipping exported projects |

### Why These Choices?

- **React DOM over `<canvas>`**: Canvas nodes *are* DOM elements — they'll export as React components. Using `<canvas>` would add an abstraction layer that needs to be reversed on export.
- **Yjs CRDTs over OT**: CRDTs merge without server-side conflict resolution. The server only checks access and stores the merged state.
- **Hocuspocus over a hand-rolled relay**: auth hooks and persistence come built in, and it speaks the same protocol TipTap's collaboration extension expects.
- **Bun + Hono**: one runtime for dev, tests and production, typed routes, and the same code can later run on other runtimes Hono supports.
- **TipTap over Slate/ProseMirror directly**: TipTap wraps ProseMirror with a batteries-included extension API. Native Yjs collaboration plugin out of the box.
- **No external canvas library**: Fabric.js, Konva, etc. render to `<canvas>` — wrong abstraction for a tool that exports DOM-based components.

---

## 📁 Project Structure

```
lazy_builder/
├── .env.example              # copy to .env (never commit .env)
├── DOCS.md                   # file-by-file documentation
├── client/                   # React SPA
│   ├── vite.config.ts        # reads ../.env, proxies /api and /collab
│   └── src/
│       ├── main.tsx          # QueryClient + RouterProvider
│       ├── router.tsx        # /login, /, /w/$workspaceId
│       ├── auth/LoginPage.tsx
│       ├── lib/              # api.ts, queries.ts, collab.ts
│       ├── components/       # Editor, FigmaRef, SlashCommand, SlashMenu
│       ├── figma/            # Canvas + IR types
│       └── workspace/        # app shell
└── server/
    ├── drizzle/              # SQL migrations
    └── src/
        ├── index.ts          # starts the API and the collab server
        ├── app.ts            # Hono app
        ├── config/env.ts     # validated env
        ├── db/               # schema + client
        ├── collab/server.ts  # Hocuspocus (auth + persistence)
        ├── routes/           # auth, workspaces, export targets
        └── export/           # IR, target registry, react-vite generator
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.4+
- PostgreSQL 15+

### Setup

```bash
git clone https://github.com/leutenantKiya/lazy_builder.git
cd lazy_builder
cp .env.example .env
```

Fill in `.env`:
- `DATABASE_URL`: a Postgres database you own, e.g. `postgres://lazy:lazy@localhost:5432/lazy_builder`
- `JWT_SECRET`: at least 32 characters, e.g. the output of `openssl rand -base64 48`

The server refuses to start if either is missing.

```bash
# create the tables
cd server && bun install && bun run db:migrate && cd ..

cd client && bun install && cd ..
```

### Running Locally

Two terminals:

```bash
cd server && bun run dev     # API :3001, collab :1234
```

```bash
cd client && bun run dev     # http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173), register, and create a workspace. Open a second tab (or a second account with the invite code) to see real-time sync.

### Checks

```bash
cd server && bun run typecheck && bun test
cd client && bun run build
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl + G` | Group selected nodes |
| `Ctrl + Shift + G` | Ungroup selected group |
| `Delete` / `Backspace` | Delete selected nodes |
| `Escape` | Deselect all |
| `Ctrl + A` | Select all top-level nodes |
| `Shift + Click` | Toggle node in multi-selection |
| `Shift + Drag` (empty space) | Marquee selection |
| `/` (in editor) | Open slash command menu |

---

## 🧬 The IR (Intermediate Representation)

The canvas is backed by a simple, serializable node model — the **IR**. This is the "single contract" between the visual canvas and the React export pipeline.

```typescript
type NodeType = 'frame' | 'box' | 'text' | 'button' | 'input'
              | 'image' | 'divider' | 'card' | 'badge' | 'toggle'
              | 'group';

type CanvasNode = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
};
```

### Node Type → React Component Mapping

| Canvas Node | Exported As | Key Props |
|------------|-------------|-----------|
| `frame` | `<div>` with dashed border | `label` |
| `card` | `<div>` with shadow + border | `label` |
| `box` | `<div>` solid rectangle | — |
| `text` | `<p>` or `<span>` | `text` |
| `button` | `<button>` | `label` |
| `input` | `<input>` | `placeholder` |
| `image` | `<img>` | `alt` |
| `divider` | `<hr>` | — |
| `badge` | `<span>` pill | `text` |
| `toggle` | Toggle switch component | `on` |
| `group` | Parent wrapper component | `childIds[]` |

---

## 🗺️ Roadmap

- [x] Infinite canvas with pan, zoom, drag, snap, resize
- [x] Multi-select and marquee selection
- [x] Node grouping/ungrouping with relative coordinates
- [x] TipTap rich-text editor with Yjs collaboration
- [x] Cross-surface references (FigmaRef pills)
- [x] Slash command menu
- [x] Layer tree with rename, expand/collapse
- [x] Dark mode
- [x] Multiple workspaces
- [x] **React export** — IR → Vite + React project scaffold
- [x] **Server persistence** — documents saved to Postgres
- [x] **Authentication** — user accounts, workspace roles, invite codes
- [ ] **More export targets** — Next.js, TanStack Start, Vue, SvelteKit, Astro, HTML
- [ ] **Agent control (MCP)** — let coding agents plan in the editor and build on the canvas
- [ ] **Undo/redo** — Yjs `UndoManager` integration
- [ ] **Style editing** — per-node CSS properties (color, padding, font, etc.)
- [ ] **Component library** — save and reuse custom component groups
- [ ] **Responsive breakpoints** — design for multiple screen sizes
- [ ] **Asset management** — upload and use real images
- [ ] **Cursor presence** — show collaborator cursors (Yjs awareness)

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [`DOCS.md`](./DOCS.md) for detailed file-by-file documentation.

---

## 📄 License

No license has been chosen yet, so all rights are reserved by default.

---

<p align="center">
  <sub>Built with ☕ and questionable variable names by a developer who was too lazy to write React by hand.</sub>
</p>
