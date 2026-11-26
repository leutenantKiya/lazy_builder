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

export type ExportInput = { projectName: string; nodes: CanvasNode[] };

// relative path -> file contents
export type FileMap = Record<string, string>;
