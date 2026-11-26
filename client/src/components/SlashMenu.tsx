import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import type { Editor, Range } from '@tiptap/core';
import type { Icon } from '@phosphor-icons/react';

// one menu entry: a label + what it does to the current block
export type CommandItem = {
  title: string;
  icon: Icon;
  /** markdown shortcut shown on the right */
  hint?: string;
  run: (editor: Editor, range: Range) => void;
};

type Props = {
  items: CommandItem[];
  command: (item: CommandItem) => void;
  query?: string;
};

// the extension drives keyboard nav through this ref
export type SlashMenuRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const SlashMenu = forwardRef<SlashMenuRef, Props>((props, ref) => {
  const [selected, setSelected] = useState(0);

  // reset highlight whenever the filtered list changes
  useEffect(() => setSelected(0), [props.items]);

  // keep the highlighted row visible when arrowing through a long list
  useEffect(() => {
    document.getElementById(`slash-item-${selected}`)?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

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

  const shell =
    'max-h-80 min-w-60 overflow-auto rounded-lg border border-border bg-surface-raised p-1 shadow-float animate-[lb-rise_var(--duration-base)_var(--ease-out)_both]';

  if (props.items.length === 0) {
    return (
      <div className={`${shell} p-2 text-sm text-text-subtle`}>
        No commands match &ldquo;{props.query ?? ''}&rdquo;
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Commands"
      aria-activedescendant={`slash-item-${selected}`}
      className={shell}
    >
      {props.items.map((item, i) => {
        const ItemIcon = item.icon;
        return (
          <button
            key={item.title}
            id={`slash-item-${i}`}
            role="option"
            aria-selected={i === selected}
            type="button"
            tabIndex={-1}
            onClick={() => select(i)}
            onMouseEnter={() => setSelected(i)}
            className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-text ${
              i === selected ? 'bg-surface-active' : ''
            }`}
          >
            <ItemIcon size={16} aria-hidden="true" className="shrink-0 text-text-muted" />
            <span className="flex-1 truncate">{item.title}</span>
            {item.hint && <span className="shrink-0 text-xs text-text-subtle">{item.hint}</span>}
          </button>
        );
      })}
    </div>
  );
});
