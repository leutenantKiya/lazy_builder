import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowSquareOut, CaretDown } from '@phosphor-icons/react';
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
import { nodeDisplayName } from '../figma/labels';
import { btnSecondary, inputCls } from '../workspace/ui';

// shared highlight.js instance — covers ~35 popular languages
const lowlight = createLowlight(common);

type RefOption = { id: string; label: string; type: CanvasNode['type']; docs: string };

// the docs card that opens from a Canvas link pill
type Card = { id: string; top: number; left: number };
const CARD_WIDTH = 320;

const Editor = ({
  docId,
  figmaBoardId,
  onFigmaRefClick,
  jumpTo = null,
  readOnly = false,
}: {
  docId: string;
  figmaBoardId?: string;
  onFigmaRefClick?: (nodeId: string) => void;
  /** from the canvas "Mentioned in Doc" list: select the nth link to this element */
  jumpTo?: { id: string; index: number; n: number } | null;
  readOnly?: boolean;
}) => {
  const [ydoc] = useState(() => new Y.Doc());
  const [figmaRefs, setFigmaRefs] = useState<RefOption[]>([]);
  const [refsReady, setRefsReady] = useState(false);
  // the canvas map, kept so the docs card can write element docs back to it
  const boardRef = useRef<Y.Map<CanvasNode> | null>(null);
  // read by the Canvas link pill: status (normal / deleted / no canvas) and live name
  const statusRef = useRef<(nodeId: string) => RefStatus>(() => 'ok');
  statusRef.current = (nodeId) =>
    !figmaBoardId ? 'nocanvas' : refsReady && !figmaRefs.some((r) => r.id === nodeId) ? 'broken' : 'ok';
  const labelRef = useRef<(nodeId: string) => string | undefined>(() => undefined);
  labelRef.current = (nodeId) => figmaRefs.find((r) => r.id === nodeId)?.label;

  // connect to the Notion doc via Yjs
  useEffect(() => {
    const provider = connectDoc(docId, ydoc);
    return () => provider.destroy();
  }, [docId, ydoc]);

  // tap into the canvas so pills know names, docs and which elements still exist
  useEffect(() => {
    setRefsReady(false);
    if (!figmaBoardId) {
      setFigmaRefs([]);
      boardRef.current = null;
      return;
    }
    const bdoc = new Y.Doc();
    const bnodes = bdoc.getMap<CanvasNode>('nodes');
    boardRef.current = bnodes;
    const provider = connectDoc(figmaBoardId, bdoc);
    const sync = () =>
      setFigmaRefs(
        Array.from(bnodes.values()).map((n) => ({
          id: n.id,
          label: nodeDisplayName(n),
          type: n.type,
          docs: typeof n.props.docs === 'string' ? n.props.docs : '',
        })),
      );
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
      boardRef.current = null;
    };
  }, [figmaBoardId]);

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({ undoRedo: false, codeBlock: false }),
      Collaboration.configure({ document: ydoc }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Write, or type / for commands' }),
      FigmaRef.configure({
        getStatus: (nodeId) => statusRef.current(nodeId),
        getLabel: (nodeId) => labelRef.current(nodeId),
      }),
      SlashCommand,
    ],
    editorProps: {
      attributes: {
        class:
          'prose doc-prose min-h-[200px] focus:outline-none',
      },
    },
  });

  // refresh pills (live names, deleted / no canvas) when the canvas contents change
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('figmaRefStatus', true));
  }, [editor, figmaRefs, refsReady, figmaBoardId]);

  // canvas → Doc: select the nth link to this element and scroll it into view
  const handledJump = useRef(0);
  useEffect(() => {
    if (!editor || editor.isDestroyed || !jumpTo || jumpTo.n === handledJump.current) return;
    handledJump.current = jumpTo.n;
    let seen = 0;
    let target = -1;
    editor.state.doc.descendants((node, pos) => {
      if (target >= 0) return false;
      if (node.type.name === 'figmaRef' && node.attrs.nodeId === jumpTo.id) {
        if (seen === jumpTo.index) target = pos;
        seen++;
      }
    });
    if (target < 0) return;
    // the Doc panel becomes visible in the same render; wait a frame before measuring
    const frame = requestAnimationFrame(() => {
      editor.chain().setNodeSelection(target).focus(undefined, { scrollIntoView: false }).run();
      (editor.view.nodeDOM(target) as HTMLElement | null)?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, jumpTo]);

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

  // ── element docs card ─────────────────────────────────────────────
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState<Card | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showCard = (pill: HTMLElement) => {
    const id = pill.getAttribute('data-node-id');
    const wrap = wrapRef.current;
    if (!id || !wrap) return;
    const r = pill.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    window.clearTimeout(timer.current);
    setCard({
      id,
      top: r.bottom - w.top + 6,
      left: Math.max(0, Math.min(r.left - w.left, w.width - CARD_WIDTH)),
    });
  };
  const hideSoon = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCard(null), 200);
  };
  const keepOpen = () => window.clearTimeout(timer.current);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // keyboard: arrowing onto a pill selects it in the editor; show its card then
  useEffect(() => {
    if (!editor) return;
    const onSelection = () => {
      const { selection } = editor.state;
      const picked = (selection as { node?: { type: { name: string } } }).node;
      if (picked?.type.name !== 'figmaRef') {
        // moved on: close, unless someone is typing in the card
        if (!cardRef.current?.contains(document.activeElement)) setCard(null);
        return;
      }
      const dom = editor.view.nodeDOM(selection.from) as HTMLElement | null;
      if (dom) showCard(dom);
    };
    editor.on('selectionUpdate', onSelection);
    return () => {
      editor.off('selectionUpdate', onSelection);
    };
  });

  // a click anywhere outside the card and its pill closes it (also covers leaving the Doc tab)
  useEffect(() => {
    if (!card) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (cardRef.current?.contains(t) || t.closest?.(`.figma-ref[data-node-id="${CSS.escape(card.id)}"]`)) return;
      setCard(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [card]);

  const cardNode = card ? figmaRefs.find((r) => r.id === card.id) : undefined;
  const cardStatus = card ? statusRef.current(card.id) : 'ok';

  const writeDocs = (id: string, docs: string) => {
    const node = boardRef.current?.get(id);
    if (!node || readOnly) return;
    boardRef.current!.set(id, { ...node, props: { ...node.props, docs } });
  };

  const closeCardAndFocusPill = () => {
    const id = card?.id;
    setCard(null);
    if (id) wrapRef.current?.querySelector<HTMLElement>(`.figma-ref[data-node-id="${CSS.escape(id)}"]`)?.focus();
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onClick={(e) => openPill((e.target as HTMLElement).closest?.<HTMLElement>('[data-node-id]') ?? null)}
      onKeyDownCapture={(e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' && card) {
          e.preventDefault();
          closeCardAndFocusPill();
          return;
        }
        if (e.key !== 'Enter' || e.shiftKey) return;
        if (cardRef.current?.contains(e.target as Node)) return; // typing in the card
        const pill = pillOf(e);
        if (!pill) return;
        e.preventDefault();
        e.stopPropagation();
        openPill(pill);
      }}
      onMouseOver={(e) => {
        const pill = (e.target as HTMLElement).closest?.<HTMLElement>('.figma-ref');
        if (pill) {
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => showCard(pill), 250);
        }
      }}
      onMouseOut={(e) => {
        if ((e.target as HTMLElement).closest?.('.figma-ref')) hideSoon();
      }}
      onFocus={(e) => {
        const pill = (e.target as HTMLElement).closest?.<HTMLElement>('.figma-ref');
        if (pill) showCard(pill);
      }}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && (cardRef.current?.contains(next) || (next as HTMLElement).closest?.('.figma-ref'))) return;
        if ((e.target as HTMLElement).closest?.('.figma-ref') || cardRef.current?.contains(e.target as Node)) hideSoon();
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

      {card && (
        <div
          ref={cardRef}
          role="group"
          aria-label={cardNode ? `Canvas element: ${cardNode.label}` : 'Canvas element'}
          onMouseEnter={keepOpen}
          onMouseLeave={hideSoon}
          style={{ top: card.top, left: card.left, width: CARD_WIDTH }}
          className="absolute z-20 rounded-lg border border-border bg-surface-raised p-3 text-sm shadow-[var(--lb-shadow-float)]"
        >
          {cardStatus !== 'ok' || !cardNode ? (
            <p className="text-text-muted">
              {cardStatus === 'nocanvas' ? 'This workspace has no canvas.' : 'This canvas element was deleted.'}
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="truncate font-medium text-text">{cardNode.label}</span>
                <span className="shrink-0 text-xs capitalize text-text-subtle">{cardNode.type}</span>
              </div>
              {readOnly ? (
                <p className="mb-3 whitespace-pre-wrap text-text-muted">{cardNode.docs || 'No docs for this element.'}</p>
              ) : (
                <>
                  <label htmlFor="pill-docs" className="mb-1 block text-xs text-text-subtle">
                    Element docs (also shown on the canvas)
                  </label>
                  <textarea
                    id="pill-docs"
                    value={cardNode.docs}
                    onChange={(e) => writeDocs(cardNode.id, e.target.value)}
                    placeholder="What is this element for?"
                    rows={3}
                    className="mb-3 w-full resize-y rounded-md border border-border-strong bg-transparent px-2.5 py-1.5 text-sm text-text placeholder:text-text-subtle hover:border-text-muted"
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setCard(null);
                  onFigmaRefClick?.(cardNode.id);
                }}
                className={`${btnSecondary} !h-7`}
              >
                <ArrowSquareOut size={16} aria-hidden="true" />
                Show on canvas
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Editor;
