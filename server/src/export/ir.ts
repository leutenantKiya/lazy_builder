import type * as Y from "yjs";

// Mirror of client/src/figma/types.ts. Keep the two in sync.
export type NodeType =
  | "frame"
  | "box"
  | "text"
  | "button"
  | "input"
  | "image"
  | "divider"
  | "card"
  | "badge"
  | "toggle"
  | "group";

export type CanvasNode = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
};

// the canvas stores nodes in a Y.Map called "nodes"; map order is z-order
export const readCanvas = (doc: Y.Doc): CanvasNode[] => Array.from(doc.getMap<CanvasNode>("nodes").values());

// one record per page in the Y.Map "pages". Only the fixed id "home" exists for now.
export type Page = {
  id: string;
  name: string;
  path: string;
  width: number;
  // y of the first-screen line; the page grows downward past it
  foldHeight: number;
  order: number;
};

export const HOME_PAGE_ID = "home";
export const DEFAULT_PAGE: Page = { id: HOME_PAGE_ID, name: "Home", path: "/", width: 1440, foldHeight: 810, order: 0 };

// the home page, or the default for boards exported before anyone opened them
export const readPage = (doc: Y.Doc): Pick<Page, "width" | "foldHeight"> => {
  const p = doc.getMap<Page>("pages").get(HOME_PAGE_ID);
  return {
    width: p && Number.isFinite(p.width) && p.width > 0 ? p.width : DEFAULT_PAGE.width,
    foldHeight: p && Number.isFinite(p.foldHeight) && p.foldHeight > 0 ? p.foldHeight : DEFAULT_PAGE.foldHeight,
  };
};

export type ExportInput = { projectName: string; nodes: CanvasNode[]; page?: Pick<Page, "width" | "foldHeight"> };
export type ExportResult = { files: FileMap; skipped: number };

// relative path -> file contents
export type FileMap = Record<string, string>;
