// The Figma-side node model. This is the seed of the shared doc-model IR:
// each node maps 1:1 to a positioned element today, and to a React component
// on export later. A Notion block will reference a node via its `id` (FigmaRef).

export type NodeType = 'frame' | 'box' | 'text' | 'button';

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
