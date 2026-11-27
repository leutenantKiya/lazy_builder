import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export type RefStatus = 'ok' | 'broken' | 'nocanvas';

export const refStatusKey = new PluginKey('figmaRefStatus');

const TITLES: Record<Exclude<RefStatus, 'ok'>, string> = {
  broken: 'This canvas element was deleted',
  nocanvas: 'This workspace has no canvas',
};

// clickable pill that lives inside the doc editor and points to a canvas node ("Canvas link").
// this is the bridge between the two surfaces.
export const FigmaRef = Node.create<{ getStatus: (nodeId: string) => RefStatus }>({
  name: 'figmaRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { getStatus: () => 'ok' };
  },

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
    const label = node.attrs.label || 'Canvas link';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-figma-ref': node.attrs.nodeId,
        'data-node-id': node.attrs.nodeId,
        class: 'figma-ref',
        role: 'link',
        tabindex: '0',
        'aria-label': `Canvas link: ${label}`,
      }),
      label,
    ];
  },

  // broken / no-canvas state comes from the editor (it knows which nodes exist), shown as a
  // decoration so the stored document stays untouched
  addProseMirrorPlugins() {
    const { getStatus } = this.options;
    return [
      new Plugin({
        key: refStatusKey,
        props: {
          decorations: (state) => {
            const decos: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== this.name) return;
              const status = getStatus(node.attrs.nodeId);
              if (status === 'ok') return;
              decos.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  'data-state': status,
                  title: TITLES[status],
                })
              );
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
