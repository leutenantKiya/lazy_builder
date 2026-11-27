import type { CanvasNode } from './types';

// the name people see for an element, everywhere: layer tree, Doc pills, link picker
export function nodeDisplayName(node: CanvasNode): string {
  if (node.type === 'text' || node.type === 'badge') return String(node.props.text ?? node.type);
  if (node.type === 'input') return String(node.props.placeholder ?? 'Input');
  if (node.type === 'group') return `Group (${(node.props.childIds as string[])?.length ?? 0})`;
  return String(node.props.label ?? node.type);
}

// group children store coordinates relative to their group; walk up to get canvas coordinates
export function absoluteBox(node: CanvasNode, get: (id: string) => CanvasNode | undefined) {
  let x = node.x;
  let y = node.y;
  let parentId = node.props.parentId as string | undefined;
  for (let hops = 0; parentId && hops < 32; hops++) {
    const parent = get(parentId);
    if (!parent) break;
    x += parent.x;
    y += parent.y;
    parentId = parent.props.parentId as string | undefined;
  }
  return { x, y, width: node.width, height: node.height };
}
