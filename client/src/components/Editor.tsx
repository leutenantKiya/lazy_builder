import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import { createLowlight, common } from 'lowlight';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { SlashCommand } from './SlashCommand';
import { FigmaRef } from './FigmaRef';
import type { CanvasNode } from '../figma/types';

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
}: {
  docId: string;
  figmaBoardId?: string;
  onFigmaRefClick?: (nodeId: string) => void;
}) => {
  const [ydoc] = useState(() => new Y.Doc());
  const [figmaRefs, setFigmaRefs] = useState<RefOption[]>([]);

  // connect to the Notion doc via Yjs
  useEffect(() => {
    const provider = new WebsocketProvider('ws://localhost:1234', docId, ydoc);
    const onStatus = (e: { status: string }) => console.log(`provider[${docId}]:`, e.status);
    provider.on('status', onStatus);
    return () => {
      provider.off('status', onStatus);
      provider.destroy();
    };
  }, [docId, ydoc]);

  // tap into the Figma board (read-only) so we can list its nodes for the ref dropdown
  useEffect(() => {
    if (!figmaBoardId) {
      setFigmaRefs([]);
      return;
    }
    const bdoc = new Y.Doc();
    const bnodes = bdoc.getMap<CanvasNode>('nodes');
    const provider = new WebsocketProvider('ws://localhost:1234', figmaBoardId, bdoc);
    const sync = () =>
      setFigmaRefs(Array.from(bnodes.values()).map((n) => ({ id: n.id, label: nodeLabel(n) })));
    bnodes.observe(sync);
    provider.on('sync', sync);
    return () => {
      bnodes.unobserve(sync);
      provider.destroy();
      bdoc.destroy();
    };
  }, [figmaBoardId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false, codeBlock: false }),
      Collaboration.configure({ document: ydoc }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Type Here' }),
      FigmaRef,
      SlashCommand,
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-neutral dark:prose-invert max-w-none min-h-[200px] focus:outline-none',
      },
    },
  });

  const insertRef = (id: string) => {
    const ref = figmaRefs.find((r) => r.id === id);
    if (!ref || !editor) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: 'figmaRef', attrs: { nodeId: ref.id, label: ref.label } })
      .run();
  };

  return (
    <div
      onClick={(e) => {
        const el = (e.target as HTMLElement).closest?.('[data-node-id]');
        if (el) onFigmaRefClick?.(el.getAttribute('data-node-id')!);
      }}
    >
      {figmaBoardId && (
        <div className="mb-3">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) insertRef(e.target.value);
              e.currentTarget.value = '';
            }}
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
          >
            <option value="">＋ Insert Figma ref…</option>
            {figmaRefs.map((r) => (
              <option key={r.id} value={r.id}>
                🎨 {r.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};

export default Editor;
