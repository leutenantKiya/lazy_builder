# Design research: Lazy Builder visual direction

Researched 2026-11-26 by the designer agent. Links were fetched or searched on that date. Where a page
gave only text (no CSS or screenshots), what is said about its look comes from what the page says
about itself and from what is publicly known about the product. Those notes are labelled
*(from prior knowledge)*. Nothing here copies another product's brand assets or exact palette.

## The owner's brief, read plainly

"The most captivating design and user friendly", web3-like or very friendly for development, and
Three.js if it fits and looks good in the workspace.

How I read it: people should feel something on the login screen and at the payoff moment (export).
The workspace itself should be calm, readable and fast for hours, and still recognisably the same
product. "Web3-like" here means dark, deep, with luminous colour on things that are live. It does
not mean gradients, glass and neon on every surface.

## Current UI (what exists at this commit)

Read from `client/src/index.css`, `workspace/Workspace.tsx`, `auth/LoginPage.tsx`, `figma/Canvas.tsx`.

- Stock Tailwind neutrals (`neutral-50…950`) with `violet-600` as the only brand colour. No tokens:
  every component spells out its own `bg-neutral-…`/`dark:` pairs, so light and dark drift.
- Emoji used as icons: 📝 Notion, 🎨 Figma, 📄 docs badge, 🖼 image, ☀️/🌙 theme, ⊞ group. They render
  differently on every OS and read as unfinished.
- Product names of other companies appear in the UI ("Notion", "Figma", "Add Figma page",
  "has Figma board"). That is a trademark risk; the brief already forbids it.
- Uppercase, letter-spaced small labels for every section heading ("WORKSPACES", "LAYERS").
- Canvas: snap guides are `fuchsia-500`, the selection ring is `violet-500`, the group outline is a
  dashed `violet-400`, and the docs badge is a violet dot holding an emoji. Selection and group
  outline are nearly the same colour, so a selected group and an unselected group are hard to tell
  apart.
- The editor placeholder "breathes" forever (`animation: breathe 2s infinite`): an endless loop
  with no trigger.
- Focus: inputs use `outline-none` and only change border colour. Buttons have no `:focus-visible`
  style at all.
- Login: a bare form centred on white or near-black. Nothing on that screen says what the product is.

## References

### Owner-named

**1. Atlassian design system (Jira's current language).**
<https://atlassian.design/foundations/color>,
<https://atlassian.design/whats-new/typography-and-iconography-updates/> (fetched 2026-11-26).
- Tokens are named by property, then role, emphasis and state: `color.background.danger.bold.hovered`.
  Roles are neutral, brand, information, success, warning, danger, discovery, plus "accent" colours
  with no meaning. Every token has a light and a dark value; teams don't map colours by hand.
- Focus and selection are separate tokens and must never look the same. Selection also needs a
  second cue (a check, an underline), not colour alone.
- 2025 type refresh: their own sans (derived from Inter) plus a matching mono with the same
  baseline and x-height, so ids and code sit level with text. Icons were redrawn to match the
  font's 1.5px stroke.
- **Borrow:** the role/emphasis/state naming discipline (simplified), focus ≠ selection, a mono
  that sits on the same baseline as the sans, icon stroke matched to type weight.
- **Avoid:** Jira's density of chrome (many toolbars, many blues, many lozenges). Its interface is
  tuned for tickets, not for a canvas that needs every pixel.

**2. "motionsite": interpreted as MotionSites (motionsites.ai).**
<https://motionsites.ai>, <https://www.producthunt.com/products/motionsites> (searched and fetched 2026-11-26).
- What it is: a paid library of prompts for AI coding tools to generate animated landing pages, with
  categories for hero sections, looping video backgrounds and a "3D" section. It is a gallery of
  motion-led marketing pages rather than a product UI.
- What the owner most likely likes: dark heroes with a moving background (video loop or WebGL) behind
  a short, large headline, and the feeling that the page is alive before you touch it.
- **Borrow:** one moving background on the screen that has nothing else to do (our login), a short
  confident headline, motion that starts without input.
- **Avoid:** it is landing-page motion. Copied into a workspace, constant background motion fights
  the user's own work. These pages also lean on the stock AI-page set (purple glows, gradient text,
  glass cards) that the antislop rules ban. We take the *aliveness* and leave the ornaments.

**3. "Scene AI": interpreted as Scene (scene.io).**
<https://scene.io>, <https://www.producthunt.com/p/scene-3/scene-2-0-modular-ai-web-builder>,
<https://www.b12.io/ai-website-builder-directory/scene> (fetched/searched 2026-11-26).
- Scene launched as a modular AI website builder: planning, wireframes and build on one shared
  canvas, with an AI assistant ("Muse") that writes briefs and copy. As of the 2026-11-26 fetch,
  scene.io now presents itself as an AI tool for narrated slide decks with a chat panel beside the
  outline. Both versions share one idea: **the AI's conversation sits next to the artefact it is
  changing, split-screen**, and the artefact is shown working rather than described.
- **Borrow:** the split layout for our future agent panel (chat or plan beside the canvas, never
  over it), showing the real product on the login/marketing screens instead of illustrations, and
  a neutral, product-led chrome that lets the user's content carry the colour.
- **Avoid:** the no-code positioning. Lazy Builder exports code, so the UI should read as a developer
  tool, not as a website builder for non-technical users.
- **Open question:** if the owner meant a different "Scene" (for example a 3D scene tool), the
  Three.js part of the direction is where it would change.

### My additions

**4. Linear.** <https://linear.app/now/how-we-redesigned-the-linear-ui> (fetched 2026-11-26).
- Themes come from three inputs (base, accent, contrast) in LCH, so surfaces step evenly in
  perceived lightness and a high-contrast mode comes nearly free. Chrome colour was turned down
  on purpose, so the interface ages well. Inter Display for headings, Inter for the rest.
- **Borrow:** an even lightness ladder for surfaces (bg → surface → raised), a near-neutral chrome
  with a faint hue, and aligned icons and labels in the sidebar.
- **Avoid:** copying the look. It is the most-imitated dark UI in the category.

**5. Raycast.** <https://www.raycast.com> (fetched 2026-11-26; look *(from prior knowledge)*).
- Its marketing pages use deep dark grounds with one rendered, luminous object per section, while
  the product window itself is plain, dense and keyboard-first with visible shortcuts.
- **Borrow:** the split between a show-off marketing layer and a quiet tool layer; shortcuts
  printed next to commands in menus (our slash menu and canvas palette).

**6. tldraw.** <https://tldraw.dev> (fetched 2026-11-26; conventions *(from prior knowledge)*).
- Canvas chrome floats at the edges in small solid panels; the canvas runs edge to edge. Selection
  is one strong colour with small square handles; snap lines use a different, warm colour, so
  "selected" and "snapping" never get confused.
- **Borrow:** a selection colour and a guide colour from different hue families; handles as small
  filled squares with a contrasting border; the zoom readout as a small solid chip in a corner.

**7. Zed** (<https://zed.dev>, *(from prior knowledge)*).
- An editor built for long sessions: low-chroma dark theme, one accent, crisp type, no animation
  that isn't feedback. Its speed is part of its look.
- **Borrow:** the restraint inside the work surface. Animate only what the user caused.

**8. Uniswap** (<https://app.uniswap.org>, fetched 2026-11-26; look *(from prior knowledge)*).
- The usable face of web3: one bright brand hue on the primary action and nowhere else, large
  rounded input modules, the amount as the largest type on screen, everything else neutral.
- **Borrow:** one saturated colour reserved for the main action; the thing that matters in the
  largest type.
- **Avoid:** its consumer roundness (very large radii) in a dense tool.

**9. Phantom** (<https://phantom.com>, *(from prior knowledge)*).
- A wallet that feels friendly: a violet brand used confidently, soft but not childish shapes,
  plain-language copy for scary actions.
- **Borrow:** proof that violet can carry a "web3" product without looking like a template, as long
  as it is one tuned violet used sparingly; plain-language confirmations for destructive actions.

## What to avoid (collected)

- Purple-to-blue gradients, gradient text, glows on everything, glass panels, dot or blueprint grids
  as decoration, pill badges, emoji as icons, small uppercase letter-spaced labels.
- Constant motion in the workspace: the canvas and editor must have zero ambient animation.
- Two different violets for "selected" and "grouped" (today's problem).
- Other products' names in the UI.

## The chosen direction: "Lit workbench"

Lazy Builder is a workbench at night: a deep, slightly violet-tinted black ground with even,
calm surface steps, in one technical sans (IBM Plex Sans) with its matching mono for ids and code.
Colour is light, and light means "live": the brand violet appears only on the one main action, the
current selection and the links between the doc and the canvas, and snap guides glow cyan, so the
brightest pixels on screen are always where the user is working. The web3 feeling is carried by
depth and luminosity, not by ornament: one Three.js scene on the login screen shows the product's
own idea (UI primitives assembling into a layout, linked back to lines of a doc), and the export moment
gets a short, 2D confirmation. Inside the canvas and editor there is no ambient motion, no glow except
the selection halo, and every text pair passes WCAG AA, so it stays friendly for an eight-hour session.
The brand violet stays (retuned to `#6A45F5` so white text on it passes 4.5:1); the house rule against
violet in the taste skill is overridden by the existing brand, as that skill's own "existing brand"
clause allows.
