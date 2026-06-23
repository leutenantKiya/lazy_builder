import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import type { Editor, Range } from '@tiptap/core';

// one menu entry: a label + what it does to the current block
export type CommandItem = {
  title: string;
  run: (editor: Editor, range: Range) => void;
};

type Props = {
  items: CommandItem[];
  command: (item: CommandItem) => void;
};

// the extension drives keyboard nav through this ref
export type SlashMenuRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const SlashMenu = forwardRef<SlashMenuRef, Props>((props, ref) => {
  const [selected, setSelected] = useState(0);

  // reset highlight whenever the filtered list changes
  useEffect(() => setSelected(0), [props.items]);

  const select = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        select(selected);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-2 text-sm text-neutral-500 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
        No results
      </div>
    );
  }

  return (
    <div className="min-w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      {props.items.map((item, i) => (
        <button
          key={item.title}
          onClick={() => select(i)}
          onMouseEnter={() => setSelected(i)}
          className={`block w-full px-3 py-1.5 text-left text-sm text-neutral-800 dark:text-neutral-100 ${
            i === selected ? 'bg-neutral-100 dark:bg-neutral-700' : ''
          }`}
        >
          {item.title}
        </button>
      ))}
    </div>
  );
});
