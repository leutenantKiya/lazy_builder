import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { CanvasNode, NodeType } from './types';

// seeded once, by the first client to open an empty board
const INITIAL_NODES: CanvasNode[] = [
  { id: 'n1', type: 'frame', x: 40, y: 40, width: 360, height: 220, props: { label: 'Card' } },
  { id: 'n2', type: 'text', x: 72, y: 80, width: 240, height: 28, props: { text: 'Hello canvas' } },
  { id: 'n3', type: 'box', x: 72, y: 120, width: 120, height: 60, props: {} },
  { id: 'n4', type: 'button', x: 72, y: 200, width: 140, height: 44, props: { label: 'Click me' } },
];

const DEFAULTS: Record<NodeType, { width: number; height: number; props: Record<string, unknown> }> = {
  frame: { width: 240, height: 160, props: { label: 'Frame' } },
  box: { width: 120, height: 80, props: {} },
  text: { width: 160, height: 28, props: { text: 'Text' } },
  button: { width: 140, height: 44, props: { label: 'Button' } },
};

const PALETTE: { type: NodeType; icon: string }[] = [
  { type: 'frame', icon: '▭' },
  { type: 'box', icon: '■' },
  { type: 'text', icon: 'T' },
  { type: 'button', icon: '◉' },
];

const SNAP = 6;

type Guides = { x: number[]; y: number[] };
type View = { scale: number; tx: number; ty: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function snapAxis(mAnchors: number[], targets: number[]) {
  let best = Infinity;
  for (const m of mAnchors) {
    for (const t of targets) {
      const d = t - m;
      if (Math.abs(d) < Math.abs(best)) best = d;
    }
  }
  if (Math.abs(best) > SNAP) return { delta: 0, lines: [] as number[] };

  const lines: number[] = [];
  for (const m of mAnchors) {
    const snapped = m + best;
    for (const t of targets) {
      if (Math.abs(t - snapped) < 0.5 && !lines.includes(t)) lines.push(t);
    }
  }
  return { delta: best, lines };
}

export default function Canvas({ boardId }: { boardId: string }) {
  // ydoc + node map are stable for this mount (parent keys by boardId);
  // the provider lives in the effect (StrictMode-safe).
  const [{ ydoc, ynodes }] = useState(() => {
    const ydoc = new Y.Doc();
    const ynodes = ydoc.getMap<CanvasNode>('nodes');
    return { ydoc, ynodes };
  });

  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guides>({ x: [], y: [] });
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const pan = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);

  // connect + mirror the Yjs map into React state; seed demo nodes once if empty
  useEffect(() => {
    const provider = new WebsocketProvider('ws://localhost:1234', boardId, ydoc);
    const sync = () => setNodes(Array.from(ynodes.values()));
    ynodes.observe(sync);
    sync();

    const onSync = (isSynced: boolean) => {
      if (isSynced && ynodes.size === 0) {
        ydoc.transact(() => INITIAL_NODES.forEach((n) => ynodes.set(n.id, n)));
      }
    };
    provider.on('sync', onSync);

    return () => {
      provider.off('sync', onSync);
      ynodes.unobserve(sync);
      provider.destroy();
    };
  }, [boardId, ydoc, ynodes]);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.tx) / view.scale,
      y: (clientY - rect.top - view.ty) / view.scale,
    };
  };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      setView((prev) => {
        const scale = clamp(prev.scale * (1 - e.deltaY * 0.001), 0.2, 4);
        const worldX = (sx - prev.tx) / prev.scale;
        const worldY = (sy - prev.ty) / prev.scale;
        return { scale, tx: sx - worldX * scale, ty: sy - worldY * scale };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const addNode = (type: NodeType) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = rect ? (rect.width / 2 - view.tx) / view.scale : 80;
    const cy = rect ? (rect.height / 2 - view.ty) / view.scale : 80;
    const def = DEFAULTS[type];
    const node: CanvasNode = {
      id: crypto.randomUUID(),
      type,
      x: Math.round(cx - def.width / 2),
      y: Math.round(cy - def.height / 2),
      width: def.width,
      height: def.height,
      props: { ...def.props },
    };
    ynodes.set(node.id, node);
    setSelectedId(node.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    ynodes.delete(selectedId);
    setSelectedId(null);
  };

  const startDrag = (e: ReactPointerEvent, node: CanvasNode) => {
    e.stopPropagation();
    setSelectedId(node.id);
    const w = toWorld(e.clientX, e.clientY);
    drag.current = { id: node.id, dx: w.x - node.x, dy: w.y - node.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const startPan = (e: ReactPointerEvent) => {
    setSelectedId(null);
    pan.current = { sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent) => {
    if (drag.current) {
      const moving = ynodes.get(drag.current.id);
      if (!moving) return;
      const w = toWorld(e.clientX, e.clientY);
      const rawX = w.x - drag.current.dx;
      const rawY = w.y - drag.current.dy;

      const others = Array.from(ynodes.values()).filter((n) => n.id !== drag.current!.id);
      const mx = [rawX, rawX + moving.width / 2, rawX + moving.width];
      const my = [rawY, rawY + moving.height / 2, rawY + moving.height];
      const ox = others.flatMap((o) => [o.x, o.x + o.width / 2, o.x + o.width]);
      const oy = others.flatMap((o) => [o.y, o.y + o.height / 2, o.y + o.height]);

      const sx = snapAxis(mx, ox);
      const sy = snapAxis(my, oy);
      const x = Math.round(rawX + sx.delta);
      const y = Math.round(rawY + sy.delta);

      ynodes.set(drag.current.id, { ...moving, x, y });
      setGuides({ x: sx.lines, y: sy.lines });
      return;
    }

    if (pan.current) {
      const p = pan.current;
      setView((v) => ({ ...v, tx: p.tx + (e.clientX - p.sx), ty: p.ty + (e.clientY - p.sy) }));
    }
  };

  const end = () => {
    drag.current = null;
    pan.current = null;
    setGuides({ x: [], y: [] });
  };

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const worldStyle: CSSProperties = {
    transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
    transformOrigin: '0 0',
  };

  return (
    <div className="flex h-full w-full">
      <div
        ref={canvasRef}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerDown={startPan}
        className="relative h-full flex-1 cursor-grab touch-none overflow-hidden bg-neutral-50 active:cursor-grabbing dark:bg-neutral-950"
      >
        <div className="absolute left-0 top-0" style={worldStyle}>
          {nodes.map((node) => (
            <NodeView
              key={node.id}
              node={node}
              selected={node.id === selectedId}
              onPointerDown={(e) => startDrag(e, node)}
            />
          ))}
        </div>

        {guides.x.map((gx, i) => (
          <div
            key={`vx${i}`}
            style={{ left: gx * view.scale + view.tx }}
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-fuchsia-500"
          />
        ))}
        {guides.y.map((gy, i) => (
          <div
            key={`hy${i}`}
            style={{ top: gy * view.scale + view.ty }}
            className="pointer-events-none absolute left-0 right-0 h-px bg-fuchsia-500"
          />
        ))}

        {selected && (
          <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-1 font-mono text-xs text-white">
            {selected.type} · x{selected.x} y{selected.y}
          </div>
        )}

        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-2 right-2 flex items-center gap-2 rounded-md bg-black/70 px-2 py-1 text-xs text-white"
        >
          <span className="font-mono">{Math.round(view.scale * 100)}%</span>
          <button
            onClick={() => setView({ scale: 1, tx: 0, ty: 0 })}
            className="rounded bg-white/20 px-1.5 py-0.5 hover:bg-white/30"
          >
            Reset
          </button>
        </div>
      </div>

      <aside className="w-52 shrink-0 overflow-auto border-l border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Components
        </h3>
        <div className="space-y-1">
          {PALETTE.map(({ type, icon }) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              className="flex w-full items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-left text-sm capitalize hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <span className="w-4 text-center text-neutral-500">{icon}</span>
              {type}
            </button>
          ))}
        </div>

        {selected && (
          <button
            onClick={deleteSelected}
            className="mt-4 w-full rounded-md border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete selected
          </button>
        )}
      </aside>
    </div>
  );
}

function NodeView({
  node,
  selected,
  onPointerDown,
}: {
  node: CanvasNode;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
}) {
  const style: CSSProperties = {
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
  };

  const ring = selected
    ? ' ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-neutral-950'
    : '';
  const base = `absolute flex items-center justify-center select-none cursor-move${ring}`;

  const variant: Record<CanvasNode['type'], string> = {
    frame:
      'items-start justify-start rounded-md border-2 border-dashed border-neutral-400 p-1 text-xs text-neutral-400',
    button: 'rounded-md bg-violet-600 text-sm font-medium text-white shadow',
    text: 'justify-start text-sm text-neutral-800 dark:text-neutral-100',
    box: 'rounded-md bg-neutral-300 dark:bg-neutral-700',
  };

  const label =
    node.type === 'frame'
      ? String(node.props.label ?? 'Frame')
      : node.type === 'button'
        ? String(node.props.label ?? 'Button')
        : node.type === 'text'
          ? String(node.props.text ?? 'Text')
          : null;

  return (
    <div style={style} onPointerDown={onPointerDown} className={`${base} ${variant[node.type]}`}>
      {label}
    </div>
  );
}
