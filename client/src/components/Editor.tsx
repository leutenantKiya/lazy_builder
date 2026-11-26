import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import { createLowlight, common } from 'lowlight';
import * as Y from 'yjs';
import { connectDoc } from '../lib/collab';
import { SlashCommand } from './SlashCommand';
import { FigmaRef, type RefStatus } from './FigmaRef';
import type { CanvasNode } from '../figma/types';
import { inputCls } from '../workspace/ui';

// shared highlight.js instance — covers ~35 popular languages
const lowlight = createLowlight(common);

type RefOption = { id: string; label: string };

function nodeLabel(n: CanvasNode): string {
  if (n.type === 'text') return String(n.props.text ?? 'Text');
  if (n.type === 'badge') return String(n.props.text ?? 'Badge');
  if (n.type === 'button' || n.type === 'frame' || n.type === 'card') return String(n.props.label ?? n.type);
  if (n.type === 'input') return String(n.props.placeholder ?? 'Input');
  if (n.type === 'group') return `Group (${(n.props.childIds as string[])?.length ?? 0})`;
  return n.type;
}

const Editor = ({
  docId,
  figmaBoardId,
  onFigmaRefClick,
  readOnly = false,
}: {
  docId: string;
  figmaBoardId?: string;
  onFigmaRefClick?: (nodeId: string) => void;
  readOnly?: boolean;
}) => {
  const [ydoc] = useState(() => new Y.Doc());
  const [figmaRefs, setFigmaRefs] = useState<RefOption[]>([]);
  const [refsReady, setRefsReady] = useState(false);
  // read by the Canvas link pill to decide between normal, deleted and no-canvas
  const statusRef = useRef<(nodeId: string) => RefStatus>(() => 'ok');
  statusRef.current = (nodeId) =>
    !figmaBoardId ? 'nocanvas' : refsReady && !figmaRefs.some((r) => r.id === nodeId) ? 'broken' : 'ok';

  // connect to the Notion doc via Yjs
  useEffect(() => {
    const provider = connectDoc(docId, ydoc);
    return () => provider.destroy();
  }, [docId, ydoc]);

  // tap into the Figma board (read-only) so we can list its nodes for the ref dropdown
  useEffect(() => {
    setRefsReady(false);
    if (!figmaBoardId) {
      setFigmaRefs([]);
      return;
    }
    const bdoc = new Y.Doc();
    const bnodes = bdoc.getMap<CanvasNode>('nodes');
    const provider = connectDoc(figmaBoardId, bdoc);
    const sync = () =>
      setFigmaRefs(Array.from(bnodes.values()).map((n) => ({ id: n.id, label: nodeLabel(n) })));
    const onSynced = () => {
      sync();
      setRefsReady(true);
    };
    bnodes.observe(sync);
    provider.on('synced', onSynced);
    return () => {
      provider.off('synced', onSynced);
      bnodes.unobserve(sync);
      provider.destroy();
      bdoc.destroy();
    };
  }, [figmaBoardId]);

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({ undoRedo: false, codeBlock: false }),
      Collaboration.configure({ document: ydoc }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Write, or type / for commands' }),
      FigmaRef.configure({ getStatus: (nodeId) => statusRef.current(nodeId) }),
      SlashCommand,
    ],
    editorProps: {
      attributes: {
        class:
          'prose doc-prose min-h-[200px] focus:outline-none',
      },
    },
  });

  // refresh pill states (deleted / no canvas) when the canvas contents change
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('figmaRefStatus', true));
  }, [editor, figmaRefs, refsReady, figmaBoardId]);

  const insertRef = (id: string) => {
    const ref = figmaRefs.find((r) => r.id === id);
    if (!ref || !editor) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: 'figmaRef', attrs: { nodeId: ref.id, label: ref.label } })
      .run();
  };

  // the pill that was clicked, or the one selected with the arrow keys
  const pillOf = (e: { target: EventTarget; currentTarget: HTMLElement }) =>
    (e.target as HTMLElement).closest?.<HTMLElement>('.figma-ref') ??
    e.currentTarget.querySelector<HTMLElement>('.figma-ref.ProseMirror-selectednode');

  const openPill = (pill: HTMLElement | null) => {
    if (!pill || pill.dataset.state) return; // deleted or no canvas: nothing to open
    const id = pill.getAttribute('data-node-id');
    if (id) onFigmaRefClick?.(id);
  };

  return (
    <div
      onClick={(e) => openPill((e.target as HTMLElement).closest?.<HTMLElement>('[data-node-id]') ?? null)}
      onKeyDownCapture={(e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        const pill = pillOf(e);
        if (!pill) return;
        e.preventDefault();
        e.stopPropagation();
        openPill(pill);
      }}
    >
      {figmaBoardId && !readOnly && (
        <div className="relative mb-3 inline-block">
          <select
            value=""
            aria-label="Insert canvas link"
            onChange={(e) => {
              if (e.target.value) insertRef(e.target.value);
              e.currentTarget.value = '';
            }}
            className={`${inputCls} appearance-none pr-8`}
          >
            <option value="">Insert canvas link</option>
            {figmaRefs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <CaretDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
          />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};

export default Editor;
