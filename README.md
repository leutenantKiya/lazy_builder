<p align="center">
  <h1 align="center">🧱 Lazy Builder</h1>
  <p align="center">
    <strong>A Figma like visual builder meets Notion like notepad — that exports to real React projects.</strong>
  </p>
  <p align="center">
    Design components on an infinite canvas. Document them in a rich text editor. Export everything as a runnable React + Vite project.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React 19 61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite 8 646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript 6 3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Yjs CRDT FF6B6B" />
  <img src="https://img.shields.io/badge/TipTap 3 1a1a2e" />
  <img src="https://img.shields.io/badge/Tailwind_CSS 4 06B6D4?logo=tailwindcss&logoColor=white" />
</p>

   

## 🤔 What Is This?

**Lazy Builder** is a developer tool that lets you prototype React UIs visually — combining a **Figma like canvas** for laying out components with a **Notion like editor** for writing developer documentation — then **exporting the result as a real, runnable React + Vite project**.

Think of it as the missing middle ground between Figma (designers) and VS Code (developers).

### The Problem

1. **Figma → Code is lossy.** Designers hand off mockups, developers re interpret them. Context gets lost.
2. **Low code builders are closed ecosystems.** They generate proprietary code you can't maintain.
3. **Developer notes live separately.** Documentation about _why_ a component exists lives in Notion/Confluence/Slack — disconnected from the thing it describes.

### The Solution

Lazy Builder gives you **two linked surfaces**:

| Surface | What it does |
|         |             |
| 🎨 **Canvas** (Figma like) | Drag, drop, resize, snap, and group UI primitives on an infinite canvas |
| 📝 **Editor** (Notion like) | Write rich text documentation with slash commands, code blocks, and cross references to canvas nodes |

The surfaces are **cross linked**: click a reference pill in the editor → jump to that component on the canvas. Canvas nodes can carry inline docs visible in the sidebar.

When you're done, **export** → get a clean `src/components/*.tsx` + `App.tsx` + `vite.config.ts` + `package.json`.

   

## ✨ Features

### 🎨 Canvas Surface
  **Infinite canvas** with pan (middle click drag) and zoom (scroll wheel)
  **10 UI primitives**: Frame, Card, Box, Text, Button, Input, Image, Divider, Badge, Toggle
  **Drag & drop** from component palette with smart **snap guides** (6px threshold, 3 anchors per axis)
  **Multi select** (Shift+Click) and **marquee selection** (Shift+Drag on empty space)
  **Resize** via 8 directional handles (corners + edges) with proportional group scaling
  **Grouping** (`Ctrl+G`) and **ungrouping** (`Ctrl+Shift+G`) with relative coordinate system
  **Layer tree** panel with expand/collapse, click to select, double click to rename, and doc indicators
  **Per node documentation** panel in the sidebar

### 📝 Editor Surface
  **TipTap based** rich text editor with real time collaboration
  **Slash commands** (`/`) — Heading 1, Heading 2, Bullet List, Numbered List, Code Block
  **Syntax highlighting** via highlight.js (github dark theme)
  **FigmaRef pills** — inline cross references to canvas nodes (violet `🎨 Component Name` pills)
  **Click to navigate**: click a FigmaRef pill → switch to canvas → node auto selected

### 🔗 Cross Surface Integration
  Editor can reference any canvas node via FigmaRef inline nodes
  Clicking a reference switches surfaces and selects the target node
  Canvas nodes with docs show a 📄 badge
  Both surfaces share workspace context

### 🌐 Real Time Collaboration
  **Yjs CRDT** for conflict free real time sync across all connected clients
  Separate Yjs documents per surface (`{workspaceId}:notion`, `{workspaceId}:figma`)
  **y websocket** relay server for multi client synchronization
  Binary CRDT updates over WebSocket — no server side conflict resolution needed

### 🗂️ Workspace Management
  Multiple workspaces with independent canvas + editor pairs
  Workspace list persisted in localStorage
  Inline rename (double click)
  Dark mode toggle (persisted)

### 📦 React Export *(planned)*
  Each canvas node maps 1:1 to a React component
  Groups become parent components with nested children
  Outputs a complete Vite + React project scaffold

   

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                        │
│                                                                 │
│  ┌─────────────┐    cross ref     ┌──────────────────────┐     │
│  │  Notion      │◄──────────────►│  Figma Canvas         │     │
│  │  (TipTap +   │  FigmaRef pill  │  (React DOM +         │     │
│  │   Yjs)       │  click to nav   │   CSS transforms)     │     │
│  └──────┬───────┘                 └──────────┬───────────┘     │
│         │                                     │                 │
│         │  binary CRDT updates                │                 │
│         └──────────────┬──────────────────────┘                 │
│                        │ WebSocket                              │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Node.js Server    │
              │   (y websocket      │
              │    relay)           │
              │                     │
              │  • merges Yjs deltas│
              │  • broadcasts to    │
              │    all peers        │
              │  • no persistence   │
              │  • no auth          │
              └─────────────────────┘
```

### Multi Client Sync Flow

```
USER A (browser)               NODE SERVER              USER B (browser)
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ types "h"        │    │ y websocket      │    │                  │
│   ↓              │    │ relay            │    │                  │
│ TipTap edit      │    │                  │    │ Yjs applies      │
│   ↓              │───►│ (merges +        │───►│ update           │
│ Y.Doc mutates    │    │  broadcasts      │    │   ↓              │
│   ↓              │    │  Yjs deltas)     │    │ TipTap re        │
│ provider sends   │    │                  │    │ renders → "h"    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
   binary CRDT update        WebSocket              update
   via WebSocket                                    WebSocket
```

   

## 🛠️ Tech Stack

### Client

| Technology | Version | Purpose |
|           |         |         |
| [React](https://react.dev) | 19 | UI framework — component rendering and state management |
| [Vite](https://vite.dev) | 8 | Dev server, HMR, and production bundler |
| [TypeScript](https://www.typescriptlang.org) | 6 | Static typing across the entire client |
| [TipTap](https://tiptap.dev) | 3 | Headless rich text editor framework (Notion surface) |
| [Yjs](https://yjs.dev) | 13 | CRDT library for real time conflict free collaboration |
| [y websocket](https://github.com/yjs/y websocket) | 3 | WebSocket provider connecting Yjs to the relay server |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Utility first CSS framework |
| [highlight.js](https://highlightjs.org) | 11 | Syntax highlighting for code blocks in the editor |
| [lowlight](https://github.com/wooorm/lowlight) | 3 | highlight.js integration for TipTap's CodeBlockLowlight |
| [@floating ui/dom](https://floating ui.com) | 1 | Positioning engine for slash command dropdown |

### Server

| Technology | Version | Purpose |
|           |         |         |
| [Node.js](https://nodejs.org) | — | Runtime for the WebSocket relay |
| [ws](https://github.com/websockets/ws) | 8 | WebSocket server implementation |
| [y websocket](https://github.com/yjs/y websocket) | 1.5 | Yjs WebSocket connection handler (`setupWSConnection`) |
| [Yjs](https://yjs.dev) | 13 | Server side CRDT document management |
| [tsx](https://github.com/privatenumber/tsx) | 4 | TypeScript execution (replaces ts node) |
| [dotenv](https://github.com/motdotla/dotenv) | 17 | Environment variable loading |

### Why These Choices?

  **React DOM over `<canvas>`**: Canvas nodes *are* DOM elements — they'll export as React components. Using `<canvas>` would add an abstraction layer that needs to be reversed on export.
  **Yjs CRDTs over OT**: CRDTs are peer to peer friendly. The server is a "dumb relay" — no conflict resolution logic. Scales horizontally.
  **TipTap over Slate/ProseMirror directly**: TipTap wraps ProseMirror with a batteries included extension API. Native Yjs collaboration plugin out of the box.
  **No external canvas library**: Fabric.js, Konva, etc. render to `<canvas>` — wrong abstraction for a tool that exports DOM based components.

   

## 📁 Project Structure

```
lazy_builder/
├── .env                          # VITE_WEBSOCKET_PORT=1234
├── package.json                  # Root (monorepo ish)
├── DOCS.md                       # Detailed file by file documentation
├── README.md                     # ← you are here
│
├── client/                       # React SPA (Vite + Tailwind)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx              # React entry point
│       ├── App.tsx               # Root component → <Workspace />
│       ├── App.css               # Tailwind import
│       ├── index.css             # Global styles + TipTap + highlight.js
│       │
│       ├── components/           # Editor surface
│       │   ├── Editor.tsx        # TipTap editor with Yjs collaboration
│       │   ├── FigmaRef.ts       # Inline node: cross reference to canvas
│       │   ├── SlashCommand.ts   # "/" command palette extension
│       │   └── SlashMenu.tsx     # Floating dropdown for slash commands
│       │
│       ├── figma/                # Canvas surface
│       │   ├── types.ts          # CanvasNode IR (Intermediate Representation)
│       │   └── Canvas.tsx        # Infinite canvas with full interaction
│       │
│       └── workspace/            # App shell
│           ├── Workspace.tsx     # Layout, surface tabs, state management
│           └── FigmaStub.tsx     # (unused placeholder)
│
└── server/                       # y websocket relay (22 lines)
    ├── package.json
    └── src/
        └── server.ts             # WebSocket server for Yjs sync
```

   

## 🚀 Getting Started

### Prerequisites

  **Node.js** ≥ 18
  **npm** (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/your username/lazy builder.git
cd lazy builder

# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

### Environment Setup

The project uses a single `.env` file at the root:

```env
VITE_WEBSOCKET_PORT=1234
```

This is the port the WebSocket relay server listens on. The client reads it via Vite's `import.meta.env`.

### Running Locally

You need **two terminals**:

| Terminal | Folder | Command | What | Port |
|          |        |         |      |      |
| 1 | `client/` | `npm run dev` | Vite frontend | 5173 |
| 2 | `server/` | `npm run dev` | WebSocket server | 1234 |

```bash
# Terminal 1 — start the client
cd client
npm run dev

# Terminal 2 — start the server
cd server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Open a second tab to see real time sync in action.

   

## ⌨️ Keyboard Shortcuts

| Key | Action |
|     |        |
| `Ctrl + G` | Group selected nodes |
| `Ctrl + Shift + G` | Ungroup selected group |
| `Delete` / `Backspace` | Delete selected nodes |
| `Escape` | Deselect all |
| `Ctrl + A` | Select all top level nodes |
| `Shift + Click` | Toggle node in multi selection |
| `Shift + Drag` (empty space) | Marquee selection |
| `/` (in editor) | Open slash command menu |

   

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
|            |             |           |
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

   

## 🗺️ Roadmap

  [x] Infinite canvas with pan, zoom, drag, snap, resize
  [x] Multi select and marquee selection
  [x] Node grouping/ungrouping with relative coordinates
  [x] TipTap rich text editor with Yjs collaboration
  [x] Cross surface references (FigmaRef pills)
  [x] Slash command menu
  [x] Layer tree with rename, expand/collapse
  [x] Dark mode
  [x] Multiple workspaces
  [ ] **React export** — IR → Vite + React project scaffold
  [ ] **Server persistence** — save documents to disk/database
  [ ] **Authentication** — user accounts and access control
  [ ] **Undo/redo** — Yjs `UndoManager` integration
  [ ] **Style editing** — per node CSS properties (color, padding, font, etc.)
  [ ] **Component library** — save and reuse custom component groups
  [ ] **Responsive breakpoints** — design for multiple screen sizes
  [ ] **Asset management** — upload and use real images
  [ ] **Cursor presence** — show collaborator cursors (Yjs awareness)

   

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout  b feature/amazing feature`)
3. Commit your changes (`git commit  m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing feature`)
5. Open a Pull Request

See [`DOCS.md`](./DOCS.md) for detailed file by file documentation.

   

   

<p align="center">
  <sub>Built with ☕ and questionable variable names by a developer who was too lazy to write React by hand.</sub>
</p>
