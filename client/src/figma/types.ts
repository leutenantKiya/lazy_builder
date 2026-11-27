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

// one record per page in the Y.Map "pages". Only the fixed id "home" exists for now.
// Mirror of server/src/export/ir.ts; keep in sync.
export type Page = {
  id: string;
  name: string;
  path: string;
  width: number;
  // y of the first-screen line; the page grows downward past it
  foldHeight: number;
  order: number;
};

export const HOME_PAGE_ID = 'home';
export const DEFAULT_PAGE: Page = { id: HOME_PAGE_ID, name: 'Home', path: '/', width: 1440, foldHeight: 810, order: 0 };
