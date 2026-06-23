import { Extension } from '@tiptap/core';
import Suggestion, {
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { SlashMenu, type CommandItem, type SlashMenuRef } from './SlashMenu';

// command list: label + the block transform to apply
const COMMANDS: CommandItem[] = [
  { title: 'Heading 1', run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 1 }).run() },
  { title: 'Heading 2', run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 2 }).run() },
  { title: 'Bullet List', run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { title: 'Numbered List', run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { title: 'Code Block', run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
];

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<CommandItem>({
        editor: this.editor,
        char: '/',
        items: ({ query }) =>
          COMMANDS.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())),

        // fired when an item is chosen: delete the "/query" text, then apply
        command: ({ editor, range, props }) => props.run(editor, range),

        render: () => {
          let component: ReactRenderer<SlashMenuRef> | null = null;
          let unmount: (() => void) | null = null;

          return {
            onStart: (props: SuggestionProps<CommandItem>) => {
              component = new ReactRenderer(SlashMenu, { props, editor: props.editor });
              // mount() appends the element AND positions it — auto-reposition on
              // scroll/resize via floating-ui's autoUpdate. Returns the teardown fn.
              unmount = props.mount(component.element);
            },
            onUpdate: (props: SuggestionProps<CommandItem>) => {
              component?.updateProps(props);
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') return true; // close
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              unmount?.();
              component?.destroy();
              unmount = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
