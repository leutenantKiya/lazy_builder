import type { CanvasNode } from "../ir.ts";

// one of every primitive, a labelled group with docs, a nested group, and hostile strings
export const KITCHEN_SINK: CanvasNode[] = [
  { id: "card", type: "card", x: 40, y: 40, width: 360, height: 220, props: { label: "Card" } },
  { id: "t1", type: "text", x: 72, y: 80, width: 240, height: 28, props: { text: 'Say "hi" </script> {braces} */' } },
  { id: "in", type: "input", x: 72, y: 120, width: 200, height: 36, props: { placeholder: "Type here…" } },
  { id: "btn", type: "button", x: 72, y: 170, width: 140, height: 44, props: { label: "Click me", docs: "Primary CTA */ ends here" } },
  { id: "frame", type: "frame", x: 440, y: 40, width: 240, height: 160, props: {} },
  { id: "img", type: "image", x: 460, y: 60, width: 120, height: 90, props: { alt: "Logo" } },
  { id: "div", type: "divider", x: 40, y: 280, width: 640, height: 2, props: {} },
  { id: "box", type: "box", x: 40, y: 300, width: 80, height: 80, props: {} },
  // hero group with a nested group inside
  { id: "g-outer", type: "group", x: 200, y: 300, width: 300, height: 120, props: { label: "Hero section", childIds: ["badge", "g-inner"], docs: "Landing hero" } },
  { id: "badge", type: "badge", x: 0, y: 0, width: 80, height: 24, props: { text: "New", parentId: "g-outer" } },
  { id: "g-inner", type: "group", x: 100, y: 40, width: 120, height: 60, props: { childIds: ["tog"], parentId: "g-outer" } },
  { id: "tog", type: "toggle", x: 0, y: 0, width: 44, height: 24, props: { on: true, parentId: "g-inner" } },
];
