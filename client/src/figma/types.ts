// every canvas element is a CanvasNode. today these map to divs on screen,
// tomorrow they map to React components on export. the Notion doc references
// these by id via FigmaRef pills.

export type NodeType =
  | 'frame'
  | 'box'
  | 'text'
  | 'button'
  | 'input'
  | 'image'
  | 'divider'
  | 'card'
  | 'badge'
  | 'toggle'
  | 'group';

export type CanvasNode = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  // type-specific data (label, text, color, …) — kept loose for now
  props: Record<string, unknown>;
};
