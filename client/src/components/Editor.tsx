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

// syntax-highlighting registry (`common` = ~35 popular languages) — shared across docs
const lowlight = createLowlight(common);

const Editor = ({ docId }: { docId: string }) => {
  // ydoc is stable for this mount (parent keys by docId). The PROVIDER lives in
  // the effect so React StrictMode's setup→cleanup→setup recreates it instead of
  // destroying it forever. ydoc is intentionally not destroyed here.
  const [ydoc] = useState(() => new Y.Doc());

  useEffect(() => {
    const provider = new WebsocketProvider('ws://localhost:1234', docId, ydoc);
    const onStatus = (e: { status: string }) => console.log(`provider[${docId}]:`, e.status);
    provider.on('status', onStatus);
    return () => {
      provider.off('status', onStatus);
      provider.destroy(); // tear down only the socket
    };
  }, [docId, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false, codeBlock: false }),
      Collaboration.configure({ document: ydoc }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Type Here' }),
      SlashCommand,
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-neutral dark:prose-invert max-w-none min-h-[200px] focus:outline-none',
      },
    },
  });

  return <EditorContent editor={editor} />;
};

export default Editor;
