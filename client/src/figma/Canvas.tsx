import { useEffect, useRef, useState, useCallback } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { CanvasNode, NodeType } from './types';

// ── Constants ────────────────────────────────────────────────────────

const INITIAL_NODES: CanvasNode[] = [
  { id: 'n1', type: 'card', x: 40, y: 40, width: 360, height: 220, props: { label: 'Card' } },
  { id: 'n2', type: 'text', x: 72, y: 80, width: 240, height: 28, props: { text: 'Hello canvas' } },
  { id: 'n3', type: 'input', x: 72, y: 120, width: 200, height: 36, props: { placeholder: 'Type here…' } },
  { id: 'n4', type: 'button', x: 72, y: 170, width: 140, height: 44, props: { label: 'Click me' } },
];

const DEFAULTS: Record<NodeType, { width: number; height: number; props: Record<string, unknown> }> = {
  frame:   { width: 240, height: 160, props: { label: 'Frame' } },
  box:     { width: 120, height: 80,  props: {} },
  text:    { width: 160, height: 28,  props: { text: 'Text' } },
  button:  { width: 140, height: 44,  props: { label: 'Button' } },
  input:   { width: 200, height: 36,  props: { placeholder: 'Enter text…' } },
  image:   { width: 200, height: 150, props: { alt: 'Image' } },
  divider: { width: 200, height: 2,   props: {} },
  card:    { width: 240, height: 160, props: { label: 'Card' } },
  badge:   { width: 80,  height: 24,  props: { text: 'Badge' } },
  toggle:  { width: 44,  height: 24,  props: { on: false } },
  group:   { width: 0,   height: 0,   props: { childIds: [] as string[] } },
};

const PALETTE: { type: NodeType; icon: string; label?: string }[] = [
  { type: 'card',    icon: '🃏' },
  { type: 'frame',   icon: '▭' },
  { type: 'box',     icon: '■' },
  { type: 'text',    icon: 'T' },
  { type: 'button',  icon: '◉' },
  { type: 'input',   icon: '⌨' },
  { type: 'image',   icon: '🖼' },
  { type: 'divider', icon: '—' },
  { type: 'badge',   icon: '⬡' },
  { type: 'toggle',  icon: '⊘' },
];

const SNAP = 6;

type Guides = { x: number[]; y: number[] };
type View = { scale: number; tx: number; ty: number };
type Marquee = { x1: number; y1: number; x2: number; y2: number } | null;
type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type Resize = { id: string; dir: HandleDir; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ── Helpers ──────────────────────────────────────────────────────────

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

/** Absolute bounding box of a set of nodes. */
function boundingBox(nodes: CanvasNode[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ── Canvas ───────────────────────────────────────────────────────────

export default function Canvas({
  boardId,
  selectedNodeId,
  onNodeSelect,
}: {
  boardId: string;
  selectedNodeId?: string | null;
  onNodeSelect?: (id: string | null) => void;
}) {
  const [{ ydoc, ynodes }] = useState(() => {
    const ydoc = new Y.Doc();
    const ynodes = ydoc.getMap<CanvasNode>('nodes');
    return { ydoc, ynodes };
  });

  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guides>({ x: [], y: [] });
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; childIds: Set<string> } | null>(null);
  const pan = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);
  const marqueeRef = useRef<{ sx: number; sy: number } | null>(null);
  const resize = useRef<Resize>(null);

  // ── Selection helpers ──────────────────────────────────────────────

  const selectSingle = useCallback((id: string | null) => {
    if (id) {
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
      onNodeSelect?.(id);
    } else {
      setSelectedIds(new Set());
      setLastSelectedId(null);
      onNodeSelect?.(null);
    }
  }, [onNodeSelect]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setLastSelectedId(id);
      onNodeSelect?.(id);
      return next;
    });
  }, [onNodeSelect]);

  // called when user clicks a FigmaRef in the Notion doc
  useEffect(() => {
    if (selectedNodeId && !selectedIds.has(selectedNodeId)) {
      selectSingle(selectedNodeId);
    }
  }, [selectedNodeId]);

  // ── Yjs connection ────────────────────────────────────────────────

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

  // ── Keyboard shortcuts ─────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Ctrl+G → group
      if (mod && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        groupSelected();
        return;
      }
      // Ctrl+Shift+G → ungroup
      if (mod && e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        ungroupSelected();
        return;
      }
      // Delete/Backspace → delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // skip if user is typing somewhere
        if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;
        e.preventDefault();
        deleteSelected();
        return;
      }
      // Escape → deselect
      if (e.key === 'Escape') {
        selectSingle(null);
        return;
      }
      // Ctrl+A → select all
      if (mod && e.key === 'a') {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;
        e.preventDefault();
        const allIds = nodes.filter((n) => !n.props.parentId).map((n) => n.id);
        setSelectedIds(new Set(allIds));
        if (allIds.length) setLastSelectedId(allIds[allIds.length - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, selectedIds]);

  // ── Coordinate conversion ──────────────────────────────────────────

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

  // ── Node CRUD ──────────────────────────────────────────────────────

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
    selectSingle(node.id);
  };

  const deleteSelected = () => {
    if (!selectedIds.size) return;
    ydoc.transact(() => {
      for (const id of selectedIds) {
        const node = ynodes.get(id);
        // clean up children's parentId when deleting a group
        if (node?.type === 'group' && Array.isArray(node.props.childIds)) {
          for (const cid of node.props.childIds as string[]) {
            const child = ynodes.get(cid);
            if (child) {
              const { parentId: _, ...restProps } = child.props as Record<string, unknown> & { parentId?: string };
              ynodes.set(cid, { ...child, props: restProps });
            }
          }
        }
        // also remove from parent's childIds list
        if (node?.props.parentId) {
          const parent = ynodes.get(node.props.parentId as string);
          if (parent && Array.isArray(parent.props.childIds)) {
            const childIds = (parent.props.childIds as string[]).filter((cid) => cid !== id);
            ynodes.set(parent.id, { ...parent, props: { ...parent.props, childIds } });
          }
        }
        ynodes.delete(id);
      }
    });
    selectSingle(null);
  };

  const updateDocs = (docs: string) => {
    if (!lastSelectedId) return;
    const node = ynodes.get(lastSelectedId);
    if (!node) return;
    ynodes.set(lastSelectedId, { ...node, props: { ...node.props, docs } });
  };

  const renameNode = (id: string, name: string) => {
    const node = ynodes.get(id);
    if (!node) return;
    const key = ['text', 'badge'].includes(node.type) ? 'text' : node.type === 'input' ? 'placeholder' : 'label';
    ynodes.set(id, { ...node, props: { ...node.props, [key]: name } });
  };

  const toggleExpand = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Group / Ungroup ────────────────────────────────────────────────

  const groupSelected = () => {
    // need at least 2 ungrouped nodes selected
    const toGroup = Array.from(selectedIds)
      .map((id) => ynodes.get(id))
      .filter((n): n is CanvasNode => !!n && !n.props.parentId);

    if (toGroup.length < 2) return;

    const box = boundingBox(toGroup);
    const groupId = crypto.randomUUID();

    ydoc.transact(() => {
      // make the group container
      const group: CanvasNode = {
        id: groupId,
        type: 'group',
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        props: { childIds: toGroup.map((n) => n.id) },
      };
      ynodes.set(groupId, group);

      // shift children to group-relative coords
      for (const child of toGroup) {
        ynodes.set(child.id, {
          ...child,
          x: child.x - box.x,
          y: child.y - box.y,
          props: { ...child.props, parentId: groupId },
        });
      }
    });

    selectSingle(groupId);
  };

  const ungroupSelected = () => {
    const groups = Array.from(selectedIds)
      .map((id) => ynodes.get(id))
      .filter((n): n is CanvasNode => !!n && n.type === 'group');

    if (!groups.length) return;

    ydoc.transact(() => {
      for (const group of groups) {
        const childIds = group.props.childIds as string[] | undefined;
        if (!childIds) continue;

        for (const cid of childIds) {
          const child = ynodes.get(cid);
          if (!child) continue;
          // back to world coords
          const { parentId: _, ...restProps } = child.props as Record<string, unknown> & { parentId?: string };
          ynodes.set(cid, {
            ...child,
            x: child.x + group.x,
            y: child.y + group.y,
            props: restProps,
          });
        }
        ynodes.delete(group.id);
      }
    });

    selectSingle(null);
  };

  // ── Resize ──────────────────────────────────────────────────────────

  const MIN_SIZE = 20;

  const startResize = (e: ReactPointerEvent, nodeId: string, dir: HandleDir) => {
    e.stopPropagation();
    const node = ynodes.get(nodeId);
    if (!node) return;
    const w = toWorld(e.clientX, e.clientY);
    resize.current = { id: nodeId, dir, startX: w.x, startY: w.y, origX: node.x, origY: node.y, origW: node.width, origH: node.height };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const applyResize = (e: ReactPointerEvent) => {
    const r = resize.current;
    if (!r) return;
    const node = ynodes.get(r.id);
    if (!node) return;

    const w = toWorld(e.clientX, e.clientY);
    const dx = w.x - r.startX;
    const dy = w.y - r.startY;

    let x = r.origX, y = r.origY, width = r.origW, height = r.origH;

    if (r.dir === 'e' || r.dir === 'ne' || r.dir === 'se') {
      width = Math.max(MIN_SIZE, r.origW + dx);
    }
    if (r.dir === 'w' || r.dir === 'nw' || r.dir === 'sw') {
      const newW = Math.max(MIN_SIZE, r.origW - dx);
      x = r.origX + r.origW - newW;
      width = newW;
    }
    if (r.dir === 's' || r.dir === 'se' || r.dir === 'sw') {
      height = Math.max(MIN_SIZE, r.origH + dy);
    }
    if (r.dir === 'n' || r.dir === 'ne' || r.dir === 'nw') {
      const newH = Math.max(MIN_SIZE, r.origH - dy);
      y = r.origY + r.origH - newH;
      height = newH;
    }

    // groups scale their children too
    if (node.type === 'group' && Array.isArray(node.props.childIds)) {
      const scaleX = width / r.origW;
      const scaleY = height / r.origH;
      ydoc.transact(() => {
        ynodes.set(r.id, { ...node, x, y, width, height });
        for (const cid of node.props.childIds as string[]) {
          const child = ynodes.get(cid);
          if (child) {
            ynodes.set(cid, {
              ...child,
              x: Math.round(child.x * scaleX),
              y: Math.round(child.y * scaleY),
              width: Math.max(MIN_SIZE, Math.round(child.width * scaleX)),
              height: Math.max(MIN_SIZE, Math.round(child.height * scaleY)),
            });
          }
        }
      });
    } else {
      ynodes.set(r.id, { ...node, x, y, width, height });
    }
  };

  // ── Pointer events ─────────────────────────────────────────────────

  const startDrag = (e: ReactPointerEvent, node: CanvasNode) => {
    e.stopPropagation();

    // shift+click toggles into/out of multi-select
    if (e.shiftKey) {
      toggleSelect(node.id);
      return;
    }

    // clicking something new → solo select it
    if (!selectedIds.has(node.id)) {
      selectSingle(node.id);
    }

    const w = toWorld(e.clientX, e.clientY);

    // track group children so we don't snap to them
    if (node.type === 'group' && Array.isArray(node.props.childIds)) {
      drag.current = { id: node.id, dx: w.x - node.x, dy: w.y - node.y, childIds: new Set(node.props.childIds as string[]) };
    } else {
      drag.current = { id: node.id, dx: w.x - node.x, dy: w.y - node.y, childIds: new Set() };
    }

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const startPan = (e: ReactPointerEvent) => {
    // shift+drag = marquee select
    if (e.shiftKey) {
      const w = toWorld(e.clientX, e.clientY);
      marqueeRef.current = { sx: w.x, sy: w.y };
      setMarquee({ x1: w.x, y1: w.y, x2: w.x, y2: w.y });
      return;
    }
    selectSingle(null);
    pan.current = { sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent) => {
    if (resize.current) {
      applyResize(e);
      return;
    }

    if (marqueeRef.current) {
      const w = toWorld(e.clientX, e.clientY);
      setMarquee({ x1: marqueeRef.current.sx, y1: marqueeRef.current.sy, x2: w.x, y2: w.y });
      return;
    }

    // dragging a node
    if (drag.current) {
      const moving = ynodes.get(drag.current.id);
      if (!moving) return;
      const w = toWorld(e.clientX, e.clientY);
      const rawX = w.x - drag.current.dx;
      const rawY = w.y - drag.current.dy;

      const others = Array.from(ynodes.values()).filter(
        (n) => n.id !== drag.current!.id && !drag.current!.childIds.has(n.id)
      );
      const mx = [rawX, rawX + moving.width / 2, rawX + moving.width];
      const my = [rawY, rawY + moving.height / 2, rawY + moving.height];
      const ox = others.flatMap((o) => [o.x, o.x + o.width / 2, o.x + o.width]);
      const oy = others.flatMap((o) => [o.y, o.y + o.height / 2, o.y + o.height]);

      const sx = snapAxis(mx, ox);
      const sy = snapAxis(my, oy);
      const x = Math.round(rawX + sx.delta);
      const y = Math.round(rawY + sy.delta);

      // just move the group — DOM handles children via relative positioning
      ydoc.transact(() => {
        ynodes.set(drag.current!.id, { ...moving, x, y });
      });

      setGuides({ x: sx.lines, y: sy.lines });
      return;
    }

    // regular pan
    if (pan.current) {
      const p = pan.current;
      setView((v) => ({ ...v, tx: p.tx + (e.clientX - p.sx), ty: p.ty + (e.clientY - p.sy) }));
    }
  };

  const end = (e?: ReactPointerEvent) => {
    // finish marquee selection
    if (marqueeRef.current && marquee) {
      const x1 = Math.min(marquee.x1, marquee.x2);
      const y1 = Math.min(marquee.y1, marquee.y2);
      const x2 = Math.max(marquee.x1, marquee.x2);
      const y2 = Math.max(marquee.y1, marquee.y2);

      const enclosed = nodes
        .filter((n) => !n.props.parentId) // only top-level
        .filter((n) => n.x >= x1 && n.y >= y1 && n.x + n.width <= x2 && n.y + n.height <= y2);

      if (enclosed.length) {
        setSelectedIds(new Set(enclosed.map((n) => n.id)));
        setLastSelectedId(enclosed[enclosed.length - 1].id);
      }
      marqueeRef.current = null;
      setMarquee(null);
    }

    drag.current = null;
    pan.current = null;
    resize.current = null;
    setGuides({ x: [], y: [] });
  };

  // ── Derived state ──────────────────────────────────────────────────

  const selected = lastSelectedId ? (nodes.find((n) => n.id === lastSelectedId) ?? null) : null;
  const isGroupSelected = selected?.type === 'group';
  const canGroup = selectedIds.size >= 2;
  const canUngroup = !!isGroupSelected;

  // only root nodes — children live inside their group
  const rootNodes = nodes.filter((n) => !n.props.parentId);

  const worldStyle: CSSProperties = {
    transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
    transformOrigin: '0 0',
  };

  // convert marquee to screen pixels for rendering
  const marqueeRect = marquee
    ? {
        left: Math.min(marquee.x1, marquee.x2) * view.scale + view.tx,
        top: Math.min(marquee.y1, marquee.y2) * view.scale + view.ty,
        width: Math.abs(marquee.x2 - marquee.x1) * view.scale,
        height: Math.abs(marquee.y2 - marquee.y1) * view.scale,
      }
    : null;

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
          {rootNodes.map((node) => (
            <NodeView
              key={node.id}
              node={node}
              allNodes={nodes}
              selected={selectedIds.has(node.id)}
              onPointerDown={(e) => startDrag(e, node)}
              onResizeStart={startResize}
            />
          ))}
        </div>

        {/* snap guides */}
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

        {/* marquee rect */}
        {marqueeRect && (
          <div
            style={marqueeRect}
            className="pointer-events-none absolute border-2 border-dashed border-violet-400 bg-violet-400/10"
          />
        )}

        {/* HUD */}
        {selected && (
          <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-1 font-mono text-xs text-white">
            {selected.type} · {selected.width}×{selected.height} @ {selected.x},{selected.y}
            {selectedIds.size > 1 && ` (${selectedIds.size} selected)`}
          </div>
        )}

        {/* zoom controls */}
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

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 overflow-auto border-l border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Components
        </h3>
        <div className="grid grid-cols-2 gap-1">
          {PALETTE.map(({ type, icon }) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1.5 text-left text-xs capitalize hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <span className="text-neutral-500">{icon}</span>
              {type}
            </button>
          ))}
        </div>

        {/* group/ungroup */}
        <div className="mt-3 flex gap-1">
          <button
            onClick={groupSelected}
            disabled={!canGroup}
            className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            title="Ctrl+G"
          >
            ⊞ Group
          </button>
          <button
            onClick={ungroupSelected}
            disabled={!canUngroup}
            className="flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            title="Ctrl+Shift+G"
          >
            ⊟ Ungroup
          </button>
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={deleteSelected}
            className="mt-3 w-full rounded-md border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete {selectedIds.size > 1 ? `(${selectedIds.size})` : ''}
          </button>
        )}

        <LayerTree
          nodes={nodes}
          selectedIds={selectedIds}
          expandedGroups={expandedGroups}
          onSelect={(id) => selectSingle(id)}
          onToggleExpand={toggleExpand}
          onRename={renameNode}
        />

        {/* docs panel */}
        {selected && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              📄 Docs
            </h3>
            <textarea
              value={String(selected.props.docs ?? '')}
              onChange={(e) => updateDocs(e.target.value)}
              placeholder="Add documentation for this node…"
              rows={6}
              className="w-full resize-y rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-600"
            />
          </div>
        )}

        {/* shortcuts hint */}
        <div className="mt-4 text-[10px] leading-relaxed text-neutral-400">
          <p><kbd className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">Shift</kbd>+click → multi-select</p>
          <p><kbd className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">Shift</kbd>+drag → marquee</p>
          <p><kbd className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">Ctrl+G</kbd> → group</p>
          <p><kbd className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">Ctrl+Shift+G</kbd> → ungroup</p>
          <p><kbd className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">Ctrl+A</kbd> → select all</p>
          <p><kbd className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">Del</kbd> → delete</p>
        </div>
      </aside>
    </div>
  );
}

// ── LayerTree ────────────────────────────────────────────────────────

const NODE_ICONS: Record<string, string> = {
  frame: '▭', card: '🃏', box: '■', text: 'T', button: '◉',
  input: '⌨', image: '🖼', divider: '—', badge: '⬡', toggle: '⊘', group: '⊞',
};

function nodeDisplayName(node: CanvasNode): string {
  if (node.type === 'text' || node.type === 'badge') return String(node.props.text ?? node.type);
  if (node.type === 'input') return String(node.props.placeholder ?? 'Input');
  if (node.type === 'group') return `Group (${(node.props.childIds as string[])?.length ?? 0})`;
  return String(node.props.label ?? node.type);
}

function LayerTree({
  nodes,
  selectedIds,
  expandedGroups,
  onSelect,
  onToggleExpand,
  onRename,
}: {
  nodes: CanvasNode[];
  selectedIds: Set<string>;
  expandedGroups: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startRename = (node: CanvasNode) => {
    setEditingId(node.id);
    setEditValue(nodeDisplayName(node));
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) onRename(editingId, editValue.trim());
    setEditingId(null);
  };

  const rootNodes = nodes.filter((n) => !n.props.parentId);
  const childrenOf = (parentId: string) => nodes.filter((n) => n.props.parentId === parentId);

  const renderNode = (node: CanvasNode, depth: number) => {
    const isGroup = node.type === 'group';
    const isExpanded = expandedGroups.has(node.id);
    const isSelected = selectedIds.has(node.id);
    const children = isGroup ? childrenOf(node.id) : [];

    return (
      <div key={node.id}>
        <div
          className={`group flex items-center gap-1 rounded px-1 py-0.5 text-xs cursor-pointer ${
            isSelected
              ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          style={{ paddingLeft: depth * 12 + 4 }}
          onClick={() => onSelect(node.id)}
        >
          {/* expand/collapse arrow for groups */}
          {isGroup ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="h-4 w-4 shrink-0" />
          )}

          <span className="shrink-0 text-neutral-500">{NODE_ICONS[node.type] ?? '?'}</span>

          {editingId === node.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
              onClick={(e) => e.stopPropagation()}
              className="ml-0.5 flex-1 rounded border border-violet-400 bg-white px-1 py-0 text-xs outline-none dark:bg-neutral-800"
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); startRename(node); }}
              className="ml-0.5 flex-1 truncate"
            >
              {nodeDisplayName(node)}
            </span>
          )}

          {node.props.docs && <span className="shrink-0 text-[9px]">📄</span>}
        </div>

        {isGroup && isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="mt-3">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Layers
      </h3>
      <div className="max-h-48 space-y-px overflow-auto rounded-md border border-neutral-200 dark:border-neutral-700">
        {rootNodes.length === 0 && (
          <p className="px-2 py-1 text-[10px] text-neutral-400">No nodes yet</p>
        )}
        {rootNodes.map((n) => renderNode(n, 0))}
      </div>
    </div>
  );
}

// ── NodeView ─────────────────────────────────────────────────────────

function NodeView({
  node,
  allNodes,
  selected,
  onPointerDown,
  onResizeStart,
}: {
  node: CanvasNode;
  allNodes: CanvasNode[];
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  onResizeStart: (e: ReactPointerEvent, nodeId: string, dir: HandleDir) => void;
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

  const hasDocs = Boolean(node.props.docs);

  // ── Group: render children inside ──────────────────────────────────
  if (node.type === 'group') {
    const childIds = (node.props.childIds as string[]) ?? [];
    const children = childIds.map((cid) => allNodes.find((n) => n.id === cid)).filter(Boolean) as CanvasNode[];

    return (
      <div
        style={style}
        onPointerDown={onPointerDown}
        className={`absolute cursor-move${ring}`}
      >
        {/* group outline */}
        <div className="h-full w-full rounded-lg border-2 border-dashed border-violet-400 bg-violet-50/30 dark:bg-violet-950/20" />

        {/* children (positioned relative to group) */}
        {children.map((child) => (
          <div
            key={child.id}
            style={{ left: child.x, top: child.y, width: child.width, height: child.height }}
            className="absolute flex items-center justify-center select-none"
          >
            <NodeInner node={child} />
          </div>
        ))}

        {/* group label */}
        <span className="absolute -top-5 left-0 text-[10px] font-medium text-violet-500">
          ⊞ Group ({children.length})
        </span>

        {hasDocs && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white shadow">
            📄
          </span>
        )}

        {selected && <ResizeHandles nodeId={node.id} onResizeStart={onResizeStart} />}
      </div>
    );
  }

  // ── Regular node ───────────────────────────────────────────────────
  return (
    <div style={style} onPointerDown={onPointerDown} className={`${base} ${variantClass(node.type)}`}>
      <NodeInner node={node} />
      {hasDocs && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[9px] text-white shadow">
          📄
        </span>
      )}
      {selected && <ResizeHandles nodeId={node.id} onResizeStart={onResizeStart} />}
    </div>
  );
}

// ── ResizeHandles ────────────────────────────────────────────────────

const HANDLE_SIZE = 8;

const HANDLES: { dir: HandleDir; cursor: string; style: CSSProperties }[] = [
  { dir: 'nw', cursor: 'nwse-resize', style: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
  { dir: 'n',  cursor: 'ns-resize',   style: { left: '50%', top: -HANDLE_SIZE / 2, transform: 'translateX(-50%)' } },
  { dir: 'ne', cursor: 'nesw-resize', style: { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 } },
  { dir: 'e',  cursor: 'ew-resize',   style: { right: -HANDLE_SIZE / 2, top: '50%', transform: 'translateY(-50%)' } },
  { dir: 'se', cursor: 'nwse-resize', style: { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 } },
  { dir: 's',  cursor: 'ns-resize',   style: { left: '50%', bottom: -HANDLE_SIZE / 2, transform: 'translateX(-50%)' } },
  { dir: 'sw', cursor: 'nesw-resize', style: { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 } },
  { dir: 'w',  cursor: 'ew-resize',   style: { left: -HANDLE_SIZE / 2, top: '50%', transform: 'translateY(-50%)' } },
];

function ResizeHandles({
  nodeId,
  onResizeStart,
}: {
  nodeId: string;
  onResizeStart: (e: ReactPointerEvent, nodeId: string, dir: HandleDir) => void;
}) {
  return (
    <>
      {HANDLES.map((h) => (
        <div
          key={h.dir}
          onPointerDown={(e) => onResizeStart(e, nodeId, h.dir)}
          style={{ ...h.style, width: HANDLE_SIZE, height: HANDLE_SIZE, cursor: h.cursor }}
          className="absolute z-10 rounded-sm border border-violet-500 bg-white dark:bg-neutral-900"
        />
      ))}
    </>
  );
}

// ── NodeInner: pure visual rendering ─────────────────────────────────

function NodeInner({ node }: { node: CanvasNode }) {
  switch (node.type) {
    case 'frame':
      return (
        <div className="flex h-full w-full items-start justify-start rounded-md border-2 border-dashed border-neutral-400 p-1 text-xs text-neutral-400">
          {String(node.props.label ?? 'Frame')}
        </div>
      );

    case 'card':
      return (
        <div className="flex h-full w-full items-start justify-start rounded-lg border border-neutral-200 bg-white p-2 text-xs text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          {String(node.props.label ?? 'Card')}
        </div>
      );

    case 'button':
      return (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-violet-600 text-sm font-medium text-white shadow">
          {String(node.props.label ?? 'Button')}
        </div>
      );

    case 'text':
      return (
        <div className="flex h-full w-full items-center justify-start text-sm text-neutral-800 dark:text-neutral-100">
          {String(node.props.text ?? 'Text')}
        </div>
      );

    case 'input':
      return (
        <div className="flex h-full w-full items-center rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-400 dark:border-neutral-600 dark:bg-neutral-800">
          {String(node.props.placeholder ?? 'Enter text…')}
        </div>
      );

    case 'image':
      return (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
          <span className="text-2xl">🖼</span>
          <span className="mt-1 text-[10px]">{String(node.props.alt ?? 'Image')}</span>
        </div>
      );

    case 'divider':
      return <div className="h-0.5 w-full rounded-full bg-neutral-300 dark:bg-neutral-600" />;

    case 'badge':
      return (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-violet-100 px-2 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          {String(node.props.text ?? 'Badge')}
        </div>
      );

    case 'toggle': {
      const on = Boolean(node.props.on);
      return (
        <div
          className={`flex h-full w-full items-center rounded-full px-0.5 transition-colors ${
            on ? 'bg-violet-500 justify-end' : 'bg-neutral-300 dark:bg-neutral-600 justify-start'
          }`}
        >
          <div className="h-[18px] w-[18px] rounded-full bg-white shadow-sm" />
        </div>
      );
    }

    case 'box':
    default:
      return <div className="h-full w-full rounded-md bg-neutral-300 dark:bg-neutral-700" />;
  }
}

// ── Variant classes (base styling per type) ──────────────────────────

function variantClass(type: CanvasNode['type']): string {
  switch (type) {
    case 'frame':
      return 'items-start justify-start p-0';
    case 'card':
      return 'items-start justify-start p-0';
    case 'button':
      return '';
    case 'text':
      return 'justify-start';
    case 'input':
      return '';
    case 'image':
      return '';
    case 'divider':
      return 'items-center';
    case 'badge':
      return '';
    case 'toggle':
      return '';
    case 'box':
    default:
      return '';
  }
}
