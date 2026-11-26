# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-11-26

> Auto-drafted from the repo (README.md, DOCS.md, package.json, source) at commit `cfc4da7`.
> Lines marked **[ASSUMPTION]** are guesses to confirm. Lines marked **[TBD]** need input from the founder.
> Lazy Builder is pre-launch with no users yet, so customer language, proof, and metrics are empty on purpose. Don't invent them.

## Product Overview
**One-liner:** A visual canvas and a doc editor in one workspace, where you lay out a React UI, write down why it exists, and (soon) export it as a real Vite project.
**What it does:** Lazy Builder pairs a Figma-like infinite canvas with a Notion-like rich-text editor. The two surfaces are cross-linked: a reference pill in the doc jumps to the component on the canvas. Both sync in real time over Yjs. The canvas is stored as a plain node model (the IR) that maps 1:1 to React components, so the output is code you can own, not a proprietary format.
**Product category:** Visual React builder / design-to-code tool. People search for: "figma to react", "visual react builder open source", "onlook alternative", "self-hosted design to code".
**Product type:** Developer tool. Web app (React SPA + Node server). Self-hostable. **[ASSUMPTION]** Managed hosted version later.
**Business model:** **[TBD]** Working assumption: open-source self-host (free) plus a paid managed/hosted tier (collaboration, persistence, agent runs). License not chosen yet (no LICENSE file in repo).

### Shipped vs planned (claims ledger: only "shipped" may appear in marketing copy)
| Capability | Status |
|---|---|
| Infinite canvas: pan, zoom, drag, snap guides, resize, multi-select, marquee | Shipped |
| 10 UI primitives (frame, card, box, text, button, input, image, divider, badge, toggle) | Shipped |
| Group / ungroup, layer tree, per-node docs | Shipped |
| TipTap editor with slash commands, code blocks, syntax highlighting | Shipped |
| FigmaRef cross-links (doc ↔ canvas) | Shipped |
| Real-time sync between clients (Yjs + y-websocket) | Shipped (no persistence, no auth on the socket) |
| Multiple workspaces, dark mode | Shipped (workspace list is localStorage only) |
| React + Vite export | Planned, the core promise, not built |
| Accounts / auth | In progress (routes and middleware exist, server does not start at `cfc4da7`) |
| Persistence (SQLite) | Planned |
| Undo/redo, style editing, component library, breakpoints, assets, cursors | Planned |
| AI agent control via MCP (Claude Code, opencode, Hermes, Gemini, GPT) | Idea stage |
| Notion integration for planning | Idea stage |

## Target Audience
**Target companies:** **[ASSUMPTION]** Solo developers, indie hackers, and small product teams (1 to 10 people) building React apps, usually without a dedicated designer.
**Decision-makers:** The developer who builds the UI is also the buyer. In small teams, the tech lead or founder.
**Primary use case:** Sketch a React UI visually, keep the reasoning next to it, and get code out instead of re-typing a mockup.
**Jobs to be done:**
- Get from "rough layout in my head" to a running React screen without hand-writing every div.
- Keep design intent and dev notes attached to the component they describe.
- **[ASSUMPTION]** Let an AI agent plan in the doc and build on the canvas, with me reviewing.
**Use cases:**
- Prototyping a new screen or landing section before coding it.
- Documenting a component library with live references.
- Pairing with a teammate in real time on layout + notes.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Dev without a designer **[ASSUMPTION]** | Shipping UI fast, owning the code | Figma is a design tool, not a build tool; hand-coding layout is slow | Lay it out visually, export React you can keep editing |
| Agent-heavy builder **[ASSUMPTION]** | Using Claude Code / opencode / Gemini to do the work | Agents write code but have nowhere visual to plan or show layout | A shared surface agents can edit (IR + docs) and you can review |
| Small team lead **[TBD]** | Handoff quality, docs that stay current | Notes live in Notion/Slack, away from the UI | Docs and components cross-linked in one workspace |

## Problems & Pain Points
**Core problem:** Going from a design to code loses context. Notes about why a component exists live somewhere else.
**Why alternatives fall short:**
- Figma → code handoff is lossy: developers re-interpret mockups.
- Low-code builders produce proprietary code you can't maintain.
- Docs in Notion/Confluence/Slack drift away from the thing they describe.
**What it costs them:** **[TBD]** Hours rebuilding layouts by hand; rework when design and code disagree.
**Emotional tension:** **[TBD]** Need founder or user quotes.

## Competitive Landscape
**Direct:** Onlook, Plasmic, Builder.io, Locofy, Anima. Visual editors or design-to-code for React. **[TBD]** How each falls short for our user (verify, don't guess).
**Secondary:** Figma (Dev Mode) + Notion used side by side. Two tools, no link between doc and component, no code output.
**Secondary:** AI UI generators (v0, Bolt, Lovable). Fast output, but no persistent canvas or doc to plan and iterate on. **[ASSUMPTION]**
**Indirect:** Hand-writing JSX with a coding agent. No visual layout step.

## Differentiation
**Key differentiators (shipped):**
- Canvas and editor in one workspace, cross-linked both ways.
- Canvas nodes are DOM elements, not `<canvas>` pixels, so they map directly to React.
- CRDT real-time sync: the server is a dumb relay.
**Key differentiators (planned, do not claim yet):**
- Export to a clean Vite + React project.
- Self-hostable.
- Agent control over the same IR and docs via MCP.
**How we do it differently:** The IR (`CanvasNode`) is a small, plain, serializable contract between canvas and code.
**Why that's better:** **[TBD]** Confirm once export ships.
**Why customers choose us:** **[TBD]** No customers yet.

## Objections
| Objection | Response |
|-----------|----------|
| "Does it actually export code?" | Not yet. Export is the next milestone. Be upfront. |
| "Why not just use Figma + Notion?" | **[TBD]** |
| "Will the exported code be maintainable?" | **[TBD]** Answer after export ships, with a sample repo. |

**Anti-persona:** **[ASSUMPTION]** Designers who need pixel-perfect vector tools; non-React teams; enterprises needing SSO/compliance today; non-technical users who want a hosted website builder.

## Switching Dynamics
**Push:** Re-typing mockups; docs drifting from code. **[TBD]** confirm with users.
**Pull:** One workspace; code you own; real-time collab. **[TBD]**
**Habit:** Figma + Notion + VS Code already set up and paid for.
**Anxiety:** Early project, export not shipped, no persistence yet: "will my work be there tomorrow?"

## Customer Language
**How they describe the problem:**
- [TBD: no user quotes yet. Collect from Reddit / HN / GitHub issues before writing copy.]
**How they describe us:**
- [TBD]
**Words to use:** canvas, editor, workspace, export, React, real code, cross-reference
**Words to avoid:** **[ASSUMPTION]** "no-code" (we produce code), "AI does everything", "fully autonomous", "pixel-perfect"
**Glossary:**
| Term | Meaning |
|------|---------|
| Canvas | Figma-like surface for laying out UI primitives |
| Editor | Notion-like TipTap rich-text surface |
| IR | `CanvasNode` model, the contract between canvas and export |
| FigmaRef | Inline pill in the editor linking to a canvas node |
| Workspace | One canvas + editor pair |

## Brand Voice
| Attribute | Means | Doesn't mean | Example line |
|-----------|-------|--------------|--------------|
| Self-deprecating | Honest about being a side project, laughs at itself | Sloppy or unserious about the code | "Built with ☕ and questionable variable names by a developer who was too lazy to write React by hand." |
| Developer-direct | Says what it does in dev terms | Jargon for its own sake | "Figma → Code is lossy." |
| Opinionated | Explains its choices | Dismissing other tools | "React DOM over `<canvas>`: canvas nodes *are* DOM elements." |

**Tone by context:**
- Support: **[TBD]**
- Launch: **[TBD]**
- Errors: **[TBD]**
- Sales: n/a for now
- Social: **[TBD]**
**Terms we own:** "Lazy Builder", "the missing middle ground between Figma and VS Code" **[ASSUMPTION]**
**Never use (and why):** "Figma" or "Notion" in the product name or logo (trademark risk; describe as "Figma-like" / "Notion-like" only). **[ASSUMPTION]**

## Proof Points
**Metrics:** None yet.
**Customers:** None yet.
**Testimonials:** None yet.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Doc ↔ canvas cross-linking | Shipped (FigmaRef) |
| Real-time collab | Shipped (Yjs) |
| Code you own | Pending export |

## Goals
**Business goal:** **[TBD]** Working assumption: get 10 design partners using it weekly.
**Conversion action:** **[TBD]** GitHub star → run locally → join waitlist / Discord.
**Current metrics:** None tracked. No analytics installed.

## Paid Ads (optional)
Not running ads.

## Learnings
*Decisions and tested lessons. Newest first. Keep it to about 20 active entries.*
| Date | Learning | Evidence | Applies to | Status |
|------|----------|----------|------------|--------|
| | | | | |

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-11-26) — Initial context, auto-drafted from repo at `cfc4da7`; assumptions and gaps flagged for founder review.
