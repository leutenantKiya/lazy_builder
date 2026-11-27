import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export type RefStatus = 'ok' | 'broken' | 'nocanvas';

export const refStatusKey = new PluginKey('figmaRefStatus');

const TITLES: Record<Exclude<RefStatus, 'ok'>, string> = {
  broken: 'This canvas element was deleted',
  nocanvas: 'This workspace has no canvas',
};

type Options = {
  getStatus: (nodeId: string) => RefStatus;
  /** the element's current name on the canvas; undefined when it isn't known (yet) */
  getLabel: (nodeId: string) => string | undefined;
};

// clickable pill that lives inside the doc editor and points to a canvas node ("Canvas link").
// this is the bridge between the two surfaces.
export const FigmaRef = Node.create<Options>({
  name: 'figmaRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { getStatus: () => 'ok', getLabel: () => undefined };
  },

  addAttributes() {
    return {
      nodeId: { default: null },
      // name at insert time: fallback for deleted elements and for copy/paste
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

  // shows the live name instead of the stored one. The label arrives through the
  // decoration below, which changes whenever the canvas does, so ProseMirror calls update().
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'figma-ref';
      dom.setAttribute('role', 'link');
      dom.setAttribute('tabindex', '0');
      const paint = (nodeId: string, label: string) => {
        dom.setAttribute('data-figma-ref', nodeId);
        dom.setAttribute('data-node-id', nodeId);
        dom.setAttribute('aria-label', `Canvas link: ${label}`);
        dom.textContent = label;
      };
      paint(node.attrs.nodeId, node.attrs.label || 'Canvas link');
      return {
        dom,
        update: (updated, decorations) => {
          if (updated.type.name !== this.name) return false;
          const live = decorations.find((d) => (d.spec as { liveLabel?: string }).liveLabel !== undefined);
          paint(updated.attrs.nodeId, (live?.spec as { liveLabel?: string })?.liveLabel || updated.attrs.label || 'Canvas link');
          return true;
        },
        ignoreMutation: () => true,
      };
    };
  },

  // status (deleted / no canvas) and the live label come from the editor, which knows the
  // canvas. They're decorations, so the stored document stays untouched.
  addProseMirrorPlugins() {
    const { getStatus, getLabel } = this.options;
    return [
      new Plugin({
        key: refStatusKey,
        props: {
          decorations: (state) => {
            const decos: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== this.name) return;
              const status = getStatus(node.attrs.nodeId);
              const liveLabel = status === 'ok' ? getLabel(node.attrs.nodeId) ?? node.attrs.label : node.attrs.label;
              const attrs: Record<string, string> = { 'data-live-label': liveLabel };
              if (status !== 'ok') {
                attrs['data-state'] = status;
                attrs.title = TITLES[status];
              }
              decos.push(Decoration.node(pos, pos + node.nodeSize, attrs, { liveLabel }));
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
