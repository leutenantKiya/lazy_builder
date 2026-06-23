import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { SlashCommand } from './SlashCommand';

// syntax-highlighting registry (`common` = ~35 popular languages)
const lowlight = createLowlight(common);

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  'ws://localhost:1234',
  'lazy-builder-notion',
  ydoc
);

// prove the connection in the console
provider.on('status', (e: { status: string }) => console.log('provider:', e.status));

const Editor = () => {
  const editor = useEditor({
    extensions: [
      // disable StarterKit's history (Yjs owns it) and its plain codeBlock (swapped below)
      StarterKit.configure({ undoRedo: false, codeBlock: false }),
      Collaboration.configure({ document: ydoc }),
      CodeBlockLowlight.configure({ lowlight }),
      SlashCommand,
    ],
    // classes here land on the editable element -> style the doc with `prose`
    editorProps: {
      attributes: {
        class:
          'prose prose-neutral dark:prose-invert max-w-none min-h-[200px] focus:outline-none',
      },
    },
    // NO `content` prop — the shared Y.Doc is the source of truth
  });

  return <EditorContent editor={editor} />;
};

export default Editor;
