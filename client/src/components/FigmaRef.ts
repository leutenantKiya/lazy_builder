import { Node, mergeAttributes } from '@tiptap/core';

// clickable pill that lives inside the Notion editor and points to a canvas node.
// this is the bridge between the two surfaces.
export const FigmaRef = Node.create({
  name: 'figmaRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      nodeId: { default: null },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-figma-ref]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-figma-ref': node.attrs.nodeId,
        'data-node-id': node.attrs.nodeId,
        class:
          'figma-ref inline-flex cursor-pointer items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-sm text-violet-700 no-underline hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60',
      }),
      `🎨 ${node.attrs.label || node.attrs.nodeId}`,
    ];
  },
});
