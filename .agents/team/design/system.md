# Lazy Builder design system: "Lit workbench"

> **Palette v2 (2026-11-27): "Workshop" replaces the violet palette.** The owner rejected the
> violet-on-violet-black scheme as the generic AI default (antislop: "purple-and-black schemes").
> Source of truth for every colour value is now `tokens.css` (and `client/src/index.css`); hex values
> and ratios in §1 and §2 below describe v1 and are superseded. Token names and the colour budget in §0
> are unchanged: the accent (safety orange: `#ff5a1f` dark, `#c2410c` light) marks only the primary
> action, canvas selection, links and focus. Errors use a pink-leaning crimson and warnings use yellow
> so neither reads as accent. Canvas node previews and exported code use neutral ink, never the accent,
> so the selection ring is the only orange on the canvas. All text pairs measure >= 4.5:1 and all UI
> boundaries >= 3:1 in both themes.


Source of truth for how Lazy Builder looks. Token names here match `tokens.css` one to one.
Research and reasoning: `research.md`. Version 1, 2026-11-26.

**The direction in one line:** a deep, violet-tinted dark workbench where colour means "live". The
brand violet marks the one main action, the selection and doc-to-canvas links, and cyan marks snap
guides. Everything else is calm neutral, readable for a long session.

## 0. Ground rules

- **Dark is primary, light must work.** Every token has both values. Test every screen in both.
- **Colour budget.** Violet `accent` is used for: the primary button on a screen (one per view),
  the canvas selection, ref pills and links, and the focus ring. Nowhere else. No violet section
  headings, no violet icons at rest.
- **No ornaments:** no gradients, glass/backdrop blur, decorative glows, dot grids, emoji, pill
  badges, uppercase letter-spaced labels. The one glow is the canvas selection halo (§6.10).
- **No other product names in the UI.** Surface names:
  | Today | New UI name | Docs-only description |
  |---|---|---|
  | "Notion" tab | **Doc** | Notion-like editor |
  | "Figma" tab | **Canvas** | Figma-like canvas |
  | "＋ Add Figma page" | **Add canvas** | |
  | "has Figma board" tooltip | "Has a canvas" | |
  | FigmaRef pill | **Canvas link** (pill) | FigmaRef node in code |
  Code identifiers (`FigmaRef`, `surface === 'figma'`) can stay; only visible strings change.
- **Icons:** one set, Phosphor Icons (`@phosphor-icons/react`, MIT), "regular" weight at 16px in
  the chrome, 14px in dense rows. It has a 1.5px-ish stroke that matches Plex Sans at 13px.
  Every icon-only button has an `aria-label`; icons are `aria-hidden`.
- **Theme default:** when nothing is stored, start in **dark** (today the code follows the OS).
  The toggle stays and is remembered. Open question for the owner in the report.

## 1. Palette

All values are sRGB hex. "Pairs" lists what each colour sits on; ratios are in §2.

### Grounds and surfaces

| Token | Dark | Light | Use |
|---|---|---|---|
| `bg` | `#0B0B12` | `#F7F7FA` | App ground, top bar, login page |
| `surface` | `#12121B` | `#FFFFFF` | Sidebar, right panel, login card, editor page |
| `surface-raised` | `#1A1A26` | `#FFFFFF` + `shadow-float` | Menus, popovers, slash menu, toasts, select popup |
| `surface-hover` | `#1C1C29` | `#F0F0F5` | Hover on rows, ghost buttons, tabs |
| `surface-active` | `#1F1F2E` | `#ECECF2` | Selected sidebar row, active tab, pressed ghost |
| `canvas` | `#0E0E16` | `#EFEFF4` | The canvas ground |

The dark ladder steps roughly evenly in lightness: bg → canvas → surface → raised → hover → active.
Surfaces are separated by these tone steps, with a `border` line only where two surfaces of the same
tone meet (sidebar edge, top bar bottom).

### Lines

| Token | Dark | Light | Use |
|---|---|---|---|
| `border` | `#26263A` | `#E2E2EA` | Decorative separators only (panel edges, menu outline). Never the only edge of a control. |
| `border-strong` | `#6B6B85` | `#7A7A90` | Boundaries of interactive controls: inputs, select, secondary buttons, checkbox. ≥ 3:1 on every surface. |

### Text

| Token | Dark | Light | Use |
|---|---|---|---|
| `text` | `#ECECF4` | `#15151E` | Body, labels, names, editor text |
| `text-muted` | `#A1A1B5` | `#50506A` | Secondary labels, section headings in panels, metadata |
| `text-subtle` | `#8A8AA0` | `#6A6A80` | Captions, keyboard hints, placeholder text, zero states |
| `text-disabled` | `#6B6B85` | `#8A8AA0` | Disabled controls only (WCAG-exempt; still ≥ 3:1 in dark) |

### Brand

| Token | Dark | Light | Use |
|---|---|---|---|
| `accent` | `#6A45F5` | `#6A45F5` | Primary button fill, toggle on, active progress |
| `accent-hover` | `#5B3BE0` | `#5B3BE0` | Primary hover |
| `accent-pressed` | `#4E30C9` | `#4E30C9` | Primary active |
| `accent-fg` | `#FFFFFF` | `#FFFFFF` | Text/icon on `accent*` |
| `accent-text` | `#B9A6FF` | `#5B3BE0` | Violet text: links, "Register" link, active tab underline, caret |
| `accent-subtle` | `#241D45` | `#EEE9FF` | Canvas-link pill background, text selection |
| `accent-subtle-text` | `#CFC2FF` | `#4B2FC4` | Text in pills |
| `accent-subtle-hover` | `#2B2052` | `#E2D9FF` | Pill hover |
| `focus` | `#B9A6FF` | `#6A45F5` | Focus ring, 2px, offset 2px. Only for focus. |

Why `#6A45F5`: it keeps today's violet-600 hue family (owner's brand) but is tuned so white text on
it passes 4.5:1 (5.55) and the fill still reads ≥ 3:1 against the dark ground (3.35–3.53).
Tailwind's `violet-500` with white text fails (4.2:1).

### Status

| Token | Dark | Light | Use |
|---|---|---|---|
| `success` | `#3DD68C` | `#117A3A` | Success text/icon (export done, saved) |
| `success-subtle` | `#102219` | `#E6F6EC` | Success toast/inline background |
| `warning` | `#F5B544` | `#9A5B00` | Warning text/icon (view-only, "coming soon") |
| `warning-subtle` | `#2A1F0C` | `#FDF3E1` | Warning background |
| `danger` | `#FF7A7A` | `#C62828` | Error text, destructive ghost text |
| `danger-fill` | `#C93A3A` | `#C62828` | Destructive confirm button fill |
| `danger-fg` | `#FFFFFF` | `#FFFFFF` | Text on `danger-fill` |
| `danger-subtle` | `#2A1416` | `#FDECEC` | Destructive hover, error field background |

Status is never colour alone: always an icon (check, warning, x-circle) or words with it.

### Canvas chrome

| Token | Dark | Light | Use |
|---|---|---|---|
| `selection` | `#A78BFA` | `#6A45F5` | Selection ring, handle borders, selected layer-row marker |
| `selection-halo` | `rgb(167 139 250 / .22)` | `rgb(106 69 245 / .18)` | The one glow: 4px spread outside the selection ring |
| `guide` | `#22D3EE` | `#0E7490` | Snap guides and distance labels. Cyan, a different hue family from selection, so "snapping" never looks like "selected". |
| `group-outline` | `#8B7FD6` | `#7C6FD0` | Dashed group outline at rest (lower chroma than selection) |
| `marquee` | `#A78BFA` | `#6A45F5` | Marquee border (1px dashed) |
| `marquee-fill` | `rgb(167 139 250 / .10)` | `rgb(106 69 245 / .08)` | Marquee fill |
| `handle-fill` | `#0E0E16` | `#FFFFFF` | Resize handle fill |
| `hud-bg` | `#1A1A26` | `#15151E` | Zoom chip, coordinates readout (solid, no blur) |
| `hud-text` | `#ECECF4` | `#FFFFFF` | Text in the HUD |

The user's own nodes (button, card, badge and so on inside the canvas) are **content**, not
chrome. They keep their current default look until style editing ships; this system only changes
the chrome drawn around them.

## 2. Contrast table

Measured with the antislop contrast checker (`contrast-check.py`, WCAG 2.x formula) on 2026-11-26.
Thresholds: body text 4.5:1, large text (≥ 18px or 14px bold) and UI boundaries 3:1.

### Dark

| Foreground | Background | Ratio | Needs | Result |
|---|---|---|---|---|
| `text` #ECECF4 | `bg` #0B0B12 | 16.69 | 4.5 | Pass |
| `text` | `surface` #12121B | 15.84 | 4.5 | Pass |
| `text` | `surface-raised` #1A1A26 | 14.65 | 4.5 | Pass |
| `text` | `surface-hover` #1C1C29 | 14.33 | 4.5 | Pass |
| `text` | `surface-active` #1F1F2E | 13.81 | 4.5 | Pass |
| `text` | `canvas` #0E0E16 | 16.35 | 4.5 | Pass |
| `text-muted` #A1A1B5 | `bg` | 7.73 | 4.5 | Pass |
| `text-muted` | `surface` | 7.34 | 4.5 | Pass |
| `text-muted` | `surface-raised` | 6.79 | 4.5 | Pass |
| `text-muted` | `surface-hover` | 6.64 | 4.5 | Pass |
| `text-muted` | `surface-active` | 6.40 | 4.5 | Pass |
| `text-subtle` #8A8AA0 | `bg` | 5.81 | 4.5 | Pass |
| `text-subtle` | `surface` | 5.52 | 4.5 | Pass |
| `text-subtle` | `surface-raised` | 5.10 | 4.5 | Pass |
| `text-subtle` | `surface-active` | 4.81 | 4.5 | Pass |
| `text-subtle` | `canvas` | 5.69 | 4.5 | Pass |
| `accent-fg` #FFFFFF | `accent` #6A45F5 | 5.55 | 4.5 | Pass |
| `accent-fg` | `accent-hover` #5B3BE0 | 6.67 | 4.5 | Pass |
| `accent-fg` | `accent-pressed` #4E30C9 | 8.11 | 4.5 | Pass |
| `accent` (fill edge) | `bg` | 3.53 | 3.0 | Pass |
| `accent` (fill edge) | `surface` | 3.35 | 3.0 | Pass |
| `accent-text` #B9A6FF | `bg` | 9.30 | 4.5 | Pass |
| `accent-text` | `surface` | 8.83 | 4.5 | Pass |
| `accent-text` | `surface-raised` | 8.17 | 4.5 | Pass |
| `accent-text` | `surface-active` | 7.70 | 4.5 | Pass |
| `accent-subtle-text` #CFC2FF | `accent-subtle` #241D45 | 9.59 | 4.5 | Pass |
| `accent-subtle-text` | `accent-subtle-hover` #2B2052 | 8.95 | 4.5 | Pass |
| `focus` #B9A6FF (ring) | `canvas` | 9.11 | 3.0 | Pass |
| `border-strong` #6B6B85 | `bg` | 3.80 | 3.0 | Pass |
| `border-strong` | `surface` | 3.61 | 3.0 | Pass |
| `border-strong` | `surface-raised` | 3.33 | 3.0 | Pass |
| `border-strong` | `surface-active` | 3.14 | 3.0 | Pass |
| `border` #26263A | `surface` | 1.26 | none (decorative) | n/a |
| `text-disabled` #6B6B85 | `surface` | 3.61 | exempt | n/a |
| `success` #3DD68C | `surface` | 9.92 | 4.5 | Pass |
| `success` | `success-subtle` #102219 | 8.85 | 4.5 | Pass |
| `warning` #F5B544 | `surface` | 10.26 | 4.5 | Pass |
| `warning` | `warning-subtle` #2A1F0C | 8.91 | 4.5 | Pass |
| `danger` #FF7A7A | `surface` | 7.37 | 4.5 | Pass |
| `danger` | `surface-raised` | 6.82 | 4.5 | Pass |
| `danger` | `danger-subtle` #2A1416 | 6.87 | 4.5 | Pass |
| `danger-fg` #FFFFFF | `danger-fill` #C93A3A | 5.06 | 4.5 | Pass |
| `selection` #A78BFA | `canvas` | 7.06 | 3.0 | Pass |
| `guide` #22D3EE | `canvas` | 10.63 | 3.0 | Pass |
| `group-outline` #8B7FD6 | `canvas` | 5.58 | 3.0 | Pass |
| `hud-text` #ECECF4 | `hud-bg` #1A1A26 | 14.65 | 4.5 | Pass |
| Google dark text #E3E3E3 | Google dark fill #131314 | 14.47 | 4.5 | Pass |
| Google dark stroke #8E918F | `surface` (card) | 5.85 | 3.0 | Pass |

### Light

| Foreground | Background | Ratio | Needs | Result |
|---|---|---|---|---|
| `text` #15151E | `surface` #FFFFFF | 18.14 | 4.5 | Pass |
| `text` | `bg` #F7F7FA | 16.96 | 4.5 | Pass |
| `text` | `canvas` #EFEFF4 | 15.82 | 4.5 | Pass |
| `text` | `surface-hover` #F0F0F5 | 15.97 | 4.5 | Pass |
| `text` | `surface-active` #ECECF2 | 15.41 | 4.5 | Pass |
| `text-muted` #50506A | `surface` | 7.79 | 4.5 | Pass |
| `text-muted` | `bg` | 7.28 | 4.5 | Pass |
| `text-muted` | `canvas` | 6.79 | 4.5 | Pass |
| `text-muted` | `surface-hover` | 6.86 | 4.5 | Pass |
| `text-muted` | `surface-active` | 6.62 | 4.5 | Pass |
| `text-subtle` #6A6A80 | `surface` | 5.27 | 4.5 | Pass |
| `text-subtle` | `bg` | 4.93 | 4.5 | Pass |
| `text-subtle` | `canvas` | 4.60 | 4.5 | Pass |
| `accent-fg` #FFFFFF | `accent` #6A45F5 | 5.55 | 4.5 | Pass |
| `accent` (fill edge) | `surface` | 5.55 | 3.0 | Pass |
| `accent-text` #5B3BE0 | `surface` | 6.67 | 4.5 | Pass |
| `accent-text` | `bg` | 6.24 | 4.5 | Pass |
| `accent-text` | `canvas` | 5.82 | 4.5 | Pass |
| `accent-text` | `surface-active` | 5.67 | 4.5 | Pass |
| `accent-subtle-text` #4B2FC4 | `accent-subtle` #EEE9FF | 7.09 | 4.5 | Pass |
| `accent-subtle-text` | `accent-subtle-hover` #E2D9FF | 6.23 | 4.5 | Pass |
| `focus` #6A45F5 (ring) | `surface` / `canvas` | 5.55 / 4.84 | 3.0 | Pass |
| `border-strong` #7A7A90 | `surface` | 4.19 | 3.0 | Pass |
| `border-strong` | `bg` | 3.92 | 3.0 | Pass |
| `border-strong` | `canvas` | 3.65 | 3.0 | Pass |
| `border-strong` | `surface-active` | 3.56 | 3.0 | Pass |
| `success` #117A3A | `surface` / `bg` / `canvas` | 5.43 / 5.08 / 4.74 | 4.5 | Pass |
| `success` | `success-subtle` #E6F6EC | 4.85 | 4.5 | Pass |
| `warning` #9A5B00 | `surface` / `bg` | 5.43 / 5.07 | 4.5 | Pass |
| `warning` | `warning-subtle` #FDF3E1 | 4.93 | 4.5 | Pass |
| `danger` #C62828 | `surface` / `bg` / `canvas` | 5.62 / 5.26 / 4.91 | 4.5 | Pass |
| `danger` | `danger-subtle` #FDECEC | 4.92 | 4.5 | Pass |
| `danger-fg` #FFFFFF | `danger-fill` #C62828 | 5.62 | 4.5 | Pass |
| `selection` #6A45F5 | `canvas` | 4.84 | 3.0 | Pass |
| `guide` #0E7490 | `canvas` | 4.67 | 3.0 | Pass |
| `group-outline` #7C6FD0 | `canvas` | 3.63 | 3.0 | Pass |
| `hud-text` #FFFFFF | `hud-bg` #15151E | 18.14 | 4.5 | Pass |
| Google light text #1F1F1F | Google light fill #FFFFFF | 16.48 | 4.5 | Pass |
| Google light stroke #747775 | `surface` #FFFFFF | 4.53 | 3.0 | Pass |
| Google dark hover text #E3E3E3 / stroke #8E918F | hover fill #1F1F22 | 12.81 / 5.16 | 4.5 / 3.0 | Pass |
| Google light hover text #1F1F1F / stroke #747775 | hover fill #F7F8F8 | 15.49 / 4.26 | 4.5 / 3.0 | Pass |
| `text` (code) #15151E | light code block #F3F3F7 | 16.39 | 4.5 | Pass |

**Known failures to avoid** (measured, do not use): `#7C5CFF` with white text (4.35), `violet-500`
`#8B5CF6` with white (≈4.2), `#5A5A72` as any border on dark (2.57–2.93), light `#8A8AA0` as a
border on `canvas` (2.94). `text-disabled` is never used for information.

## 3. Type

- **UI and doc face:** IBM Plex Sans (variable, `@fontsource-variable/ibm-plex-sans`, SIL OFL).
  Chosen because it is built for technical interfaces: open apertures and distinct `Il1` and `0O`
  at 12–13px, tabular figures, and an engineered character that reads "developer tool" without
  being monospace. It also keeps us off the default roster (Inter/Geist) the rest of the category
  ships with.
- **Mono (code and ids only):** IBM Plex Mono 400/500 (`@fontsource/ibm-plex-mono`, OFL). Same
  family, same x-height and baseline as the sans, so an id inside a sentence sits level. Used for:
  code blocks, inline code, invite codes, node ids, the zoom % and coordinates readout. Never for
  labels, headings or decoration.
- Weights: 400 (text), 500 (labels, buttons, active nav), 600 (headings, the login headline). No 700+.
- Numbers that update or align (zoom %, W/H, x/y, counts) use `font-variant-numeric: tabular-nums`.

| Token | Size / line | Use |
|---|---|---|
| `text-2xs` | 11 / 16 | Canvas chrome labels (group label, size readout) only. Never body. |
| `text-xs` | 12 / 16 | Captions, kbd hints, helper text, sidebar section headings (sentence case, 500, `text-muted`) |
| `text-sm` | 13 / 20 | Default UI: sidebar rows, tabs, buttons, menus, layer tree |
| `text-base` | 14 / 22 | Inputs, login body, toasts |
| `text-doc` | 16 / 26 | Editor body (`max-width: 70ch`) |
| `text-lg` | 20 / 28 | Editor h3, dialog title |
| `text-xl` | 24 / 32 | Editor h2, login card title on phones |
| `text-2xl` | 30 / 38 | Editor h1 |
| `text-display` | 48 / 48, tracking -0.03em, 600 | Login headline at ≥ 1024px only |

Section headings in panels ("Workspaces", "Layers", "Add", "Docs") become sentence case,
12px/500, `text-muted`, no letter-spacing, no uppercase.

## 4. Space, radius, elevation

- **Space (4px base):** 2, 4, 6, 8, 12, 16, 20, 24, 32, 48, 64. Tailwind's default spacing
  already matches; use `gap-1.5`, `px-3` etc. Sidebar padding 12px; panel section gap 20px;
  row height 32px (sidebar, layer tree 28px, menu items 32px); top bar height 48px; controls
  32px tall (28px in the canvas side panel), primary login controls 40px.
- **Radius:** `xs` 2 (resize handles), `sm` 4 (pills, kbd, badges, Google button), `md` 6
  (buttons, inputs, select, tabs, rows), `lg` 8 (menus, popovers, panels, toasts), `xl` 12
  (login card, dialogs). Nothing is fully round except the toggle primitive and avatars.
- **Elevation:** flat by default. Dark: tone steps only, plus `shadow-float` on things that truly
  float (menus, slash menu, select popup, toast) and `shadow-dialog` on dialogs. Light: same, the
  shadows carry the separation that tone does in dark. Nothing at rest has a shadow: sidebar,
  panels, cards and the login card are flat (the card is a tone step: `surface` on `bg`).

## 5. Motion

| Token | Value | Use |
|---|---|---|
| `duration-press` | 80ms | Button press scale (0.98), checkbox tick |
| `duration-fast` | 120ms | Hover colour, focus ring appear |
| `duration-base` | 180ms | Menu/popover open (opacity + 4px translate), tab indicator slide |
| `duration-slow` | 240ms | Sidebar collapse/expand (width), panel slide |
| `duration-moment` | 400ms | Export success moment, login card entrance |
| `ease-out` | `cubic-bezier(.2,.8,.2,1)` | Everything entering or responding |
| `ease-in-out` | `cubic-bezier(.4,0,.2,1)` | Things moving from one place to another |

Rules:
- Animate `transform` and `opacity` only (sidebar width is the one exception; prefer animating a
  transform on an inner wrapper if it janks).
- **No ambient motion in the workspace.** Nothing moves unless the user caused it. The editor
  placeholder's endless "breathe" animation is removed (tokens.css sets a static placeholder).
- Canvas interactions (drag, pan, zoom, resize) are never transitioned: they follow the pointer
  1:1. Only selection ring appearance may fade in (`duration-fast`).
- `prefers-reduced-motion: reduce`: all transitions and animations collapse to 1ms (base layer in
  tokens.css), the Three.js scene is replaced by its static poster, the export moment shows its
  end state at once.

## 6. Components

States key: **D** default, **H** hover, **F** focus-visible, **A** active/pressed, **X** disabled,
**L** loading, **E** error. Focus is always the base-layer ring: 2px `focus`, offset 2px (inset
`-2px` inside scroll containers where the offset would clip).

### 6.1 Buttons

All: height 32px (40px in the login card), radius `md`, padding 0 12px, `text-sm`/500, icon 16px
with 6px gap. Press: `scale(.98)` over `duration-press`.

| Variant | D | H | A | X | L |
|---|---|---|---|---|---|
| **Primary** (one per view: Export, Create workspace, Log in) | `bg-accent text-accent-fg` | `bg-accent-hover` | `bg-accent-pressed` | `bg-surface-active text-text-disabled`, no pointer | label stays, 14px spinner replaces the leading icon, `aria-busy="true"`, width locked |
| **Secondary** (Join, Log out, Group/Ungroup) | `bg-transparent border border-border-strong text-text` | `bg-surface-hover` | `bg-surface-active` | `border-border text-text-disabled` | as primary |
| **Ghost** (sidebar +, collapse, zoom reset) | transparent, `text-text-muted` | `bg-surface-hover text-text` | `bg-surface-active` | `text-text-disabled` | n/a |
| **Danger ghost** (Delete workspace, Delete node) | transparent, `text-danger` | `bg-danger-subtle` | `bg-danger-subtle` + scale | `text-text-disabled` | n/a |
| **Danger confirm** (inside a confirm dialog only) | `bg-danger-fill text-danger-fg` | darken 8% | darken 14% | as primary | as primary |
| **Icon-only** | 32×32 ghost, `aria-label` required, tooltip on hover/focus after 500ms | | | | |

Export, when not ready: render it as a real `<button disabled>` (not `<a aria-disabled>`) with
the reason shown in text next to it or in a tooltip that is also reachable by focus
(`aria-describedby`). Reasons: "Add a canvas first", "<Target> export is coming soon".

Delete workspace replaces `window.confirm` with a dialog: title "Delete <name>?", body "This
deletes the doc and canvas for everyone in this workspace. It can't be undone.", buttons
"Cancel" (secondary, focused first) and "Delete workspace" (danger confirm).

### 6.2 Inputs and select

- Height 32px (40px in login), radius `md`, `bg-transparent`, `border border-border-strong`,
  `text-base` (14px; 16px on phones to stop iOS zoom), padding 0 10px, placeholder `text-subtle`.
- **H:** border `text-muted` colour. **F:** keep border, add the 2px focus ring (no `outline-none`
  without it). **X:** `border-border`, `text-text-disabled`, `bg-surface-hover`. **E:** border
  `danger`, `bg-danger-subtle`, message below in `text-xs text-danger` with a warning icon,
  linked by `aria-describedby`, `aria-invalid="true"`.
- Every field has a visible `<label>` (12px/500 `text-muted`, 6px above). "Join with code" gets a
  label, not only a placeholder.
- Select: same box, 16px caret icon right 8px, native `<select>` kept for accessibility. Options
  not ready keep "(soon)" in text; the popup uses `surface-raised`.
- Invite code chip: `font-mono text-xs`, secondary-button style, label "Copy invite code", on
  click the text changes to "Copied" with a check icon for 1.5s and `aria-live="polite"`
  announces it.

### 6.3 Sidebar

- Width 248px, `bg-surface`, right edge `border-border`. Collapses to 0 with `duration-slow`; the
  "show sidebar" button is a 32px icon button at top-left of the top bar (solid `bg-bg`, no blur).
- Top: product mark (16px violet monogram, see open questions) + "Lazy Builder" 13px/600 `text`,
  collapse icon button right.
- Section heading "Workspaces" (12px/500 `text-muted`, sentence case) with a 24px ghost "+"
  (`aria-label="New workspace"`).
- Workspace row: 32px, radius `md`, padding 0 10px, `text-sm text-text`. **H** `bg-surface-hover`.
  **Active** `bg-surface-active`, text 500, plus a 2px × 16px `accent` mark at the row's left inside
  edge (this marks real state, not decoration). **F** ring inset. Canvas indicator: Phosphor
  `square-half` 14px `text-subtle` with `aria-label="Has a canvas"`, replaces 🎨.
- Rename (double-click or F2): the row becomes an input in place, same height, focus ring, Enter
  saves, Escape cancels.
- Join with code: label + input + secondary "Join" in one row; **L** "Joining…" on the button;
  **E** message under the row in `danger`.
- Footer: name/email (`text-xs text-muted`, truncate with title), theme toggle as icon button
  (sun/moon Phosphor icons, `aria-label="Switch to light theme"`), "Log out" ghost.

### 6.4 Top bar and tabs

- Height 48px, `bg-bg`, bottom `border-border`, padding 0 16px, items centred vertically.
- Left: tabs "Doc" and "Canvas" as a segmented control: container `bg-surface` radius `md`
  padding 2px; each tab 28px tall, padding 0 12px, `text-sm`, icon 14px (Phosphor `file-text`,
  `selection`). **D** `text-text-muted`. **H** `text-text`. **Active** `bg-surface-active text-text`
  500 (the tone step is the indicator; `aria-selected="true"`, `role="tab"`). **F** ring.
  Arrow keys move between tabs.
- "Add canvas" when there is none: secondary button with `plus` icon. Hidden for viewers.
- Workspace name after the tabs: `text-sm text-text-muted`, truncate. View-only shows a
  `warning`-coloured "View only" label with an eye icon (text, not colour alone).
- Right: "Export to" label + select, then Export (primary), invite code chip, Delete (danger ghost,
  owner only). On widths < 900px the invite chip and Delete move into a "More" menu (icon button,
  `dots-three`), keeping Export visible.

### 6.5 Canvas side panel (palette, actions, layers, docs)

- Width 232px, `bg-surface`, left `border-border`, padding 12px, sections 20px apart.
- Palette tiles ("Add"): 2-column grid, each tile 32px, radius `md`, `bg-surface-hover`
  (tone, no border), icon 16px `text-muted` + label `text-xs text-text` sentence case. **H**
  `bg-surface-active`. **A** scale .98. **F** ring. Replaces emoji/text icons with Phosphor
  (`frame-corners`, `cards`, `square`, `text-t`, `cursor-click`, `textbox`, `image`, `minus`,
  `tag`, `toggle-right`).
- Group / Ungroup: secondary, 28px, with kbd hint in tooltip. **X** when not applicable.
- Delete selected: danger ghost, full width.
- Keyboard hints block: `text-xs text-subtle`, each shortcut in `<kbd>` (`font-sans` 11px/500,
  `bg-surface-active`, radius `sm`, padding 1px 5px). Arrows "→" become words: "Shift + click
  — Multi-select". Move this block into a "Shortcuts" popover (icon button `keyboard`) once the
  panel gets style controls.

### 6.6 Layer tree

- Row 28px, `text-sm` (13px), indent 12px per depth, radius `sm`. Icon 14px `text-subtle`
  (same Phosphor set as the palette). Name `text-text`, truncate.
- **H** `bg-surface-hover`. **Selected** `bg-accent-subtle`, name `accent-subtle-text` 500
  (in light `#4B2FC4` on `#EEE9FF`, 7.09:1; dark `#CFC2FF` on `#241D45`, 9.59:1).
  **F** ring inset. Expand chevron 16px ghost with `aria-expanded`. Docs indicator: Phosphor
  `note` 12px `text-subtle` with `aria-label="Has docs"`, replaces 📄.
- Tree semantics: `role="tree"`/`treeitem`, arrow keys to move, Right/Left expand/collapse.
- Zero state inside the box: "No layers yet. Add one from the palette above." `text-xs text-subtle`.

### 6.7 FigmaRef pill ("Canvas link")

- Inline, `inline-flex`, height 22px, padding 0 6px, radius `sm`, `bg-accent-subtle`,
  `text-accent-subtle-text`, font size inherits the doc (16px) at 500 weight, 12px Phosphor
  `selection` icon before the label.
- **H** `bg-accent-subtle-hover`. **F** ring (the pill must be focusable: `tabindex="0"`,
  `role="link"`, Enter opens). **A** scale .98.
- **Broken link** (node deleted): `bg-surface-active text-text-muted`, line-through on the label,
  icon `link-break`, tooltip "This canvas element was deleted". **X** (workspace has no canvas):
  same as broken with tooltip "This workspace has no canvas".
- On arrival on the canvas, the target node's selection ring appears with the halo, no flashing.

### 6.8 Slash menu

- `bg-surface-raised`, border `border-border`, radius `lg`, `shadow-float`, min-width 240px,
  max-height 320px scroll, padding 4px. Opens with `duration-base` (opacity + 4px rise).
- Item 32px, radius `md`, padding 0 8px: icon 16px `text-muted`, title `text-sm text-text`,
  optional shortcut right-aligned `text-xs text-subtle`. **Highlighted** (keyboard or hover)
  `bg-surface-active`, the only state the keyboard needs; `aria-activedescendant` on the list.
- Empty: "No commands match "<query>"" `text-sm text-text-subtle`, padding 8px.

### 6.9 Editor surface

- Page `bg-surface` in light, `bg-bg` in dark (the doc reads as paper on a dim desk in light;
  in dark it sits on the ground to keep one fewer tone). Column `max-width: 70ch`, padding 48px
  32px. Body `text-doc` `text`. Headings 600, `text-2xl/xl/lg`. Links `accent-text`, underline
  on hover. Inline code `font-mono` 0.875em, `bg-surface-active`, radius `sm`, padding 1px 4px.
- Code blocks: `bg-[#0E0E16]` dark / `bg-[#F3F3F7]` light, radius `lg`, padding 16px,
  `font-mono` 13px/20px. Swap the `github-dark.css` import for a theme that follows the app theme
  (builder: pick `github.css` + `github-dark.css` scoped under `.dark`).
- Placeholder: static, `text-subtle`, text "Write, or type / for commands".

### 6.10 Canvas node chrome

| Element | Spec |
|---|---|
| Canvas ground | `bg-canvas`, edge to edge. No dot grid (none today; keep it that way until a snap-to-grid feature needs one). |
| Hover (not selected) | 1px `selection` outline at 50% opacity, offset 0. |
| Selected | 2px `selection` ring, offset 1px, plus `box-shadow: 0 0 0 5px var(--lb-selection-halo)`. This halo is the one glow in the product. |
| Multi-selected | Each node: 1px `selection` ring. The group bounding box: 2px ring + handles. |
| Resize handles | 8×8, radius `xs`, fill `handle-fill`, 1.5px `selection` border. Hit area 16×16 (transparent padding). |
| Group outline | 1px dashed `group-outline`, radius `md`, no fill at rest (remove the violet wash). Selected group: the selection ring replaces it. |
| Group label | 11px/500 `text-muted`, 4px above the top-left corner, "Group · 3" (Phosphor `selection-plus` 12px before it). Replaces "⊞ Group (3)". Hidden below 50% zoom. |
| Docs badge | 16×16 at the top-right corner, offset −6px, radius `sm`, `bg-surface-raised`, 1px `border-strong`, Phosphor `note` 12px `text-muted`. `aria-label="Has docs"`. No violet fill, no shadow. |
| Snap guides | 1px `guide`, full height/width of the viewport; the distance label (when added) is `text-2xs` on `hud-bg`. |
| Marquee | 1px dashed `marquee`, fill `marquee-fill`. |
| Coordinates readout | top-left 8px, `hud-bg`, `hud-text`, `font-mono text-2xs tabular-nums`, radius `sm`, padding 2px 6px. Solid, no `bg-black/70`. |
| Zoom chip | bottom-right 12px, `hud-bg` radius `lg` padding 4px, contains −, `100%` (mono, tabular), +, and "Reset" ghost button 24px. Each has `aria-label`. |

### 6.11 Login card (with Google sign-in)

Layout:
- ≥ 1024px: two columns on `bg`. Left column 480px, holds the card vertically centred with 64px
  left padding. Right column fills the rest: the Three.js scene (§7), or its static poster.
- < 1024px: one column, no WebGL, the poster as a 200px band at the top, card below, 16px side
  gutters.
- Above the card (desktop), the headline in `text-display`: "Lay it out. Write it down. Ship
  React." (32 characters per line max, two lines), and one sentence in `text-base text-muted`:
  "A canvas and a doc in one workspace, cross-linked, exporting a real Vite project." (Only claim
  export once it ships; until then: "…cross-linked, with React export on the way.")
- Card: `bg-surface`, radius `xl`, padding 32px, width 100% max 400px, flat (no shadow), 1px
  `border-border` in dark only. Entrance: opacity 0→1 + 8px rise, `duration-moment`, once.

Card contents, in this order:
1. Title `text-xl`/600 "Log in" or "Create your account"; under it `text-sm text-muted` "to your
   Lazy Builder workspaces".
2. **Continue with Google** button (below).
3. **"or" divider**: a row, 20px vertical margin, two 1px `border` lines with the word "or" between
   them, `text-xs text-subtle`, 12px gap. The lines are `aria-hidden`; the word is plain text.
4. Email form: Name (register only), Email, Password, each 40px with visible labels; password
   helper "At least 8 characters" `text-xs text-subtle` tied by `aria-describedby`.
5. Primary submit, full width 40px: "Log in" / "Create account". **L** "Logging in…" /
   "Creating account…" with spinner.
6. Error block between the fields and the button: `bg-danger-subtle`, radius `md`, padding 8px
   12px, warning icon + message in `danger`, `role="alert"`.
7. Mode switch, centred `text-sm`: "No account? **Create one**" / "Have an account? **Log in**",
   the action word is a `<button>` in `accent-text`, underline on hover.

**Continue with Google button**, following Google's sign-in branding guidelines
(<https://developers.google.com/identity/branding-guidelines>, read 2026-11-26):
- Preferred: render it with Google Identity Services (the official button), theme matched to ours:
  dark → `filled_black`, light → `outline`; `text: "continue_with"`, `shape: "rectangular"`,
  `size: "large"`, `width` = card width. That keeps us inside the rules with no work.
- If a custom button is needed (fallback allowed by Google):
  - Label exactly **"Continue with Google"** (approved variants: "Sign in with Google", "Sign up
    with Google"). Do not shorten to "Google".
  - Colours, by our theme: **dark** fill `#131314`, 1px inside stroke `#8E918F`, text `#E3E3E3`;
    **light** fill `#FFFFFF`, 1px inside stroke `#747775`, text `#1F1F1F`. (Neutral `#F2F2F2`/no
    stroke is also allowed; we don't use it.)
  - Font: Google Sans Medium 14/20 as the guidelines specify (load it only on the login route);
    if it can't be loaded, Roboto Medium 14/20 is the older accepted face. Do not set it in Plex.
  - The standard full-colour Google "G" from Google's download bundle, unchanged in size, colour
    and padding. Never monochrome, never redrawn, never on our violet.
  - Padding: 12px left of the G, 10px between G and text, 12px right of the text. Height 40px,
    full card width, label centred in the remaining space is acceptable; G stays at the left.
  - Shape: rectangular (Google's asset radius, use `radius-sm` 4px) to sit with our 6px controls.
  - States: **H** fill lightens/darkens by one step (dark `#1F1F22`, light `#F7F8F8`) with stroke
    unchanged; **F** our focus ring outside the stroke; **A** scale .98; **L** after click,
    replace the label with "Connecting to Google…" and a spinner in the text colour, keep the G,
    disable the button; **E** on failure or cancel, the card's error block reads "Google sign-in
    didn't finish. Try again, or use email." Disabled is never shown at rest.
  - Prominence: it comes first and is never smaller or lower-contrast than other sign-in options.

### 6.12 Empty state (no workspaces)

- Centred in the main area, max-width 420px, left-aligned text block.
- A static illustration drawn in code (SVG, 240×120): three outlined canvas primitives (a card,
  a button, a text line) in `border-strong`, one of them in `selection` with its ring, connected
  by a 1px line to a short doc line with a small ref pill. This shows the product's idea; no
  WebGL, no animation.
- Heading `text-lg`/600 "Start your first workspace"; one sentence `text-sm text-muted`: "A
  workspace holds one doc and, when you add it, one canvas. Invite people with its code."
- Actions: primary "Create workspace"; secondary "Join with a code" which focuses the sidebar's
  join input (or opens it on phones).
- **L** while the workspace list loads: show the sidebar's rows as three 32px `surface-hover`
  blocks for at most the load time, with "Loading workspaces…" as text for screen readers; no
  full-page skeleton. **E** list failed: "Couldn't load your workspaces." + "Try again" secondary.

### 6.13 Export success moment (2D, no WebGL)

Export is the payoff, so it gets one short, clear moment:
- On click, the Export button goes to **L** ("Preparing…" + spinner).
- On success (the builder must switch the plain `<a download>` to a `fetch` + blob download so the
  app knows it finished): the button shows a check icon and "Downloaded" for 2s
  (`duration-moment` cross-fade), and a toast slides in at bottom-right: `bg-surface-raised`,
  radius `lg`, `shadow-float`, 360px, check icon in `success`, title `text-sm`/500 "<workspace>.zip
  downloaded", body `text-xs text-muted` "Vite + React project. Unzip, then npm install && npm run
  dev." (the command in `font-mono`). Close button. Auto-dismiss 8s, paused on hover/focus,
  `role="status"`.
- At the same time, on the canvas, every exported node's outline traces once in `selection`
  (1px, 400ms, staggered 20ms by layer order, capped at 600ms total), then fades. This is the only
  time chrome animates without direct manipulation, and it's a direct result of the user's click.
  Off under reduced motion.
- **E**: toast in `danger-subtle`, "Export failed: <reason>", "Try again" button.

### 6.14 Toasts, tooltips, dialogs (shared)

- Toast: as above; stack upward 8px apart, max 3.
- Tooltip: `bg-hud-bg text-hud-text text-xs`, radius `sm`, padding 4px 8px, 500ms delay, shows on
  focus too, `role="tooltip"`.
- Dialog: `bg-surface-raised`, radius `xl`, `shadow-dialog`, padding 24px, width 420px, scrim
  `rgb(0 0 0 / .5)` (no blur), focus trapped, Escape closes, focus returns to the opener.

## 7. Three.js decision

Owner asked for Three.js where it matches. Decision per surface:

| Surface | Decision | Why |
|---|---|---|
| **Login backdrop** | **Yes** | Nobody works on this screen; it's the first impression, and it can show the product's own idea. Owner wants "captivating". |
| Empty state | **No** | It's a place to act, inside the workspace bundle. A static SVG of the same idea (§6.12) says the same at 0 cost. |
| Export-success moment | **No** (2D instead, §6.13) | It fires inside the workspace while the canvas is on screen; spinning up WebGL there would fight the canvas for the GPU and pull three.js into the workspace route. The outline trace + toast gives the payoff at no cost. |
| Canvas, editor, any workspace chrome | **Never** | They need every frame and every pixel of contrast. |
| Future marketing page | Likely yes, same scene as login | Reuse the login scene module. |

### What the login scene shows: "the IR assembling"

Lazy Builder's idea is that a layout is a plain tree of UI primitives that maps 1:1 to code and to
lines of a doc. The scene shows exactly that:
- 60–90 flat, rounded rectangles in the proportions of our primitives (frames, cards, buttons,
  inputs, text lines) float at different depths in a slow drift, drawn as `surface-raised`-toned
  planes with a 1px edge in `border-strong`. Matte, no bloom.
- Every ~6s one cluster eases into a tidy layout (a card holding a title, a text line and a
  button), its edges brighten to `selection` violet for 1.2s, and a thin `guide`-cyan line draws
  from it to a short "doc line" plane at the side: the cross-link. Then it relaxes back into the
  drift. Only one cluster lights at a time.
- Pointer parallax: up to 2° of camera rotation, eased over 600ms. No scroll interaction.
- **When the user focuses any field or the Google button, the drift eases to a stop over 800ms
  and stays still** until blur + 3s. The screen gets calm when the person starts doing something.
- Colours come from the tokens (read the CSS variables at init), so light theme works too (planes
  in `surface`, edges in `border-strong`, highlight in light `selection`).

### Performance budget

- **Loading:** `three` is imported only by the login route, with `import()` after first paint
  (`requestIdleCallback`, 1.5s timeout). Never in the main bundle; `vite build` must show it as its
  own chunk. Budget for the scene chunk: **≤ 170 KB gzip** including three core (import only
  `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `InstancedMesh`, `PlaneGeometry`,
  `ShaderMaterial`/`MeshBasicMaterial`, `LineSegments`). No loaders, no textures, no
  post-processing, no fonts in WebGL.
- **The form never waits:** the card renders and is usable before the scene chunk starts loading.
  The static poster is shown first and the canvas fades in over it (`duration-moment`) once the
  first frame is drawn.
- **GPU:** ≤ 3 draw calls (one `InstancedMesh` for planes, one for edges, one `LineSegments` for
  links). ≤ 100 instances. `devicePixelRatio` capped at 1.5. `antialias: true`,
  `powerPreference: "low-power"`. Target ≤ 4ms per frame on an integrated GPU.
- **Frame rate:** capped at 30fps (skip every other rAF). Drop to the poster if the average frame
  time is > 33ms over any 3-second window.
- **Paused when hidden:** stop the loop on `document.visibilitychange` (hidden), when the canvas
  leaves the viewport (`IntersectionObserver`), and on route change (dispose renderer, geometry,
  materials; `renderer.forceContextLoss()`).
- **Off under `prefers-reduced-motion: reduce`:** the chunk isn't loaded; the poster stays.
- **Off on** `navigator.connection.saveData === true`, `navigator.deviceMemory < 4`, and viewports
  < 1024px wide.
- **No WebGL / context lost:** catch renderer creation; on failure or `webglcontextlost`, keep the
  poster. No error is shown to the user.
- **Poster:** an inline SVG (≤ 8 KB) of the scene's resting frame in the same token colours,
  `aria-hidden="true"`. The WebGL `<canvas>` is also `aria-hidden="true"` and `tabindex="-1"`.
- **Check before merge:** Lighthouse on `/login` with the scene: LCP element is the headline text,
  CLS 0, total blocking time unchanged vs. no scene (±20ms). Report the measured numbers; don't
  claim them without running it.

Why it's worth it: it's the only screen where motion costs the user nothing, it makes the first
impression the owner asked for, and it explains the product (primitives → layout → linked doc)
before anyone reads a word.

## 8. Builder checklist

- Paste `tokens.css` into `client/src/index.css`; replace every `neutral-*`/`violet-*`/`dark:` pair
  with the semantic utilities (`bg-surface`, `text-text-muted`, `border-border-strong`, …).
- Remove the `breathe` keyframes and every `outline-none` that has no replacement.
- Replace emoji with Phosphor icons and add `aria-label`s to icon-only controls.
- Rename visible strings per §0.
- Run both themes at 1440px and 390px; tab through every control and check the focus ring.
