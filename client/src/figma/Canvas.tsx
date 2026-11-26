import { useEffect, useRef, useState, useCallback } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import * as Y from 'yjs';
import { connectDoc } from '../lib/collab';
import {
  FrameCorners,
  Cards,
  Square,
  TextT,
  CursorClick,
  Textbox,
  Image as ImageIcon,
  Minus,
  Tag,
  ToggleRight,
  SelectionPlus,
  SelectionSlash,
  Note,
  CaretRight,
  CaretDown,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { CanvasNode, NodeType } from './types';
import { btnSecondary, btnDangerGhost } from '../workspace/ui';

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

const NODE_ICONS: Record<string, Icon> = {
  frame: FrameCorners,
  card: Cards,
  box: Square,
  text: TextT,
  button: CursorClick,
  input: Textbox,
  image: ImageIcon,
  divider: Minus,
  badge: Tag,
  toggle: ToggleRight,
  group: SelectionPlus,
};

const PALETTE: { type: NodeType }[] = [
  { type: 'card' },
  { type: 'frame' },
  { type: 'box' },
  { type: 'text' },
  { type: 'button' },
  { type: 'input' },
  { type: 'image' },
  { type: 'divider' },
  { type: 'badge' },
  { type: 'toggle' },
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
  exportTick = 0,
}: {
  boardId: string;
  selectedNodeId?: string | null;
  onNodeSelect?: (id: string | null) => void;
  /** bumps once per successful export; the canvas traces node outlines in response */
  exportTick?: number;
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
  const [trace, setTrace] = useState(0);
  const lastTick = useRef(exportTick);

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

  // export finished: trace every node outline once (skipped under reduced motion)
  useEffect(() => {
    if (exportTick === lastTick.current) return;
    lastTick.current = exportTick;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setTrace(exportTick);
    const t = setTimeout(() => setTrace(0), 1200);
    return () => clearTimeout(t);
  }, [exportTick]);

  // ── Yjs connection ────────────────────────────────────────────────

  useEffect(() => {
    const provider = connectDoc(boardId, ydoc);
    const sync = () => setNodes(Array.from(ynodes.values()));
    ynodes.observe(sync);
    sync();

    // seed a brand-new board; read-only connections can't write, so skip them
    const onSync = ({ state }: { state: boolean }) => {
      if (state && ynodes.size === 0 && provider.authorizedScope === 'read-write') {
        ydoc.transact(() => INITIAL_NODES.forEach((n) => ynodes.set(n.id, n)));
      }
    };
    provider.on('synced', onSync);

    return () => {
      provider.off('synced', onSync);
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

  const end = () => {
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

  const zoomBy = (factor: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const sx = rect ? rect.width / 2 : 0;
    const sy = rect ? rect.height / 2 : 0;
    setView((prev) => {
      const scale = clamp(prev.scale * factor, 0.2, 4);
      const worldX = (sx - prev.tx) / prev.scale;
      const worldY = (sy - prev.ty) / prev.scale;
      return { scale, tx: sx - worldX * scale, ty: sy - worldY * scale };
    });
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

  // absolute boxes for the export trace (children are stored relative to their group)
  const traceBoxes = trace
    ? nodes.map((n) => {
        const parent = n.props.parentId ? nodes.find((p) => p.id === n.props.parentId) : undefined;
        return { id: n.id, x: n.x + (parent?.x ?? 0), y: n.y + (parent?.y ?? 0), width: n.width, height: n.height };
      })
    : [];

  // convert marquee to screen pixels for rendering
  const marqueeRect = marquee
    ? {
        left: Math.min(marquee.x1, marquee.x2) * view.scale + view.tx,
        top: Math.min(marquee.y1, marquee.y2) * view.scale + view.ty,
        width: Math.abs(marquee.x2 - marquee.x1) * view.scale,
        height: Math.abs(marquee.y2 - marquee.y1) * view.scale,
      }
    : null;

  const kbd = 'rounded-sm bg-surface-active px-[5px] py-px font-sans text-[11px] font-medium text-text-muted';
  const sectionHeading = 'text-xs font-medium text-text-muted';

  return (
    <div className="flex h-full w-full">
      <div
        ref={canvasRef}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerDown={startPan}
        className="relative h-full flex-1 cursor-grab touch-none overflow-hidden bg-canvas active:cursor-grabbing"
      >
        <div className="absolute left-0 top-0" style={worldStyle}>
          {rootNodes.map((node) => (
            <NodeView
              key={node.id}
              node={node}
              allNodes={nodes}
              selected={selectedIds.has(node.id)}
              multi={selectedIds.size > 1}
              zoom={view.scale}
              onPointerDown={(e) => startDrag(e, node)}
              onResizeStart={startResize}
            />
          ))}

          {/* export trace: each outline draws once, staggered by layer order */}
          {traceBoxes.map((b, i) => (
            <svg
              key={`${trace}-${b.id}`}
              aria-hidden="true"
              className="pointer-events-none absolute overflow-visible"
              style={{ left: b.x, top: b.y, width: b.width, height: b.height }}
            >
              <rect
                x="0.5"
                y="0.5"
                rx="4"
                pathLength={1}
                vectorEffect="non-scaling-stroke"
                className="fill-none stroke-selection"
                style={{
                  width: 'calc(100% - 1px)',
                  height: 'calc(100% - 1px)',
                  strokeWidth: 1,
                  strokeDasharray: 1,
                  strokeDashoffset: 1,
                  animation: `lb-trace var(--duration-moment) var(--ease-out) ${Math.min(i * 20, 200)}ms both`,
                }}
              />
            </svg>
          ))}
        </div>

        {/* snap guides */}
        {guides.x.map((gx, i) => (
          <div
            key={`vx${i}`}
            style={{ left: gx * view.scale + view.tx }}
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-guide"
          />
        ))}
        {guides.y.map((gy, i) => (
          <div
            key={`hy${i}`}
            style={{ top: gy * view.scale + view.ty }}
            className="pointer-events-none absolute left-0 right-0 h-px bg-guide"
          />
        ))}

        {/* marquee rect */}
        {marqueeRect && (
          <div
            style={marqueeRect}
            className="pointer-events-none absolute border border-dashed border-marquee bg-marquee-fill"
          />
        )}

        {/* HUD */}
        {selected && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-sm bg-hud-bg px-1.5 py-0.5 font-mono text-2xs tabular-nums text-hud-text">
            {selected.type} · {selected.width}×{selected.height} @ {selected.x},{selected.y}
            {selectedIds.size > 1 && ` (${selectedIds.size} selected)`}
          </div>
        )}

        {/* zoom controls */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-hud-bg p-1 text-hud-text"
        >
          <button
            onClick={() => zoomBy(1 / 1.2)}
            aria-label="Zoom out"
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/15 focus-visible:outline-offset-0"
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <span className="min-w-[3ch] text-center font-mono text-2xs tabular-nums" aria-live="off">
            {Math.round(view.scale * 100)}%
          </span>
          <button
            onClick={() => zoomBy(1.2)}
            aria-label="Zoom in"
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/15 focus-visible:outline-offset-0"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => setView({ scale: 1, tx: 0, ty: 0 })}
            aria-label="Reset zoom to 100%"
            className="h-6 rounded-md px-2 text-xs font-medium hover:bg-white/15 focus-visible:outline-offset-0"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Side panel ──────────────────────────────────────────────── */}
      <aside
        aria-label="Canvas tools"
        className="flex w-[232px] shrink-0 flex-col gap-5 overflow-auto border-l border-border bg-surface p-3"
      >
        <section aria-labelledby="canvas-add">
          <h3 id="canvas-add" className={`mb-2 ${sectionHeading}`}>
            Add
          </h3>
          <div className="grid grid-cols-2 gap-1">
            {PALETTE.map(({ type }) => {
              const TypeIcon = NODE_ICONS[type];
              return (
                <button
                  key={type}
                  onClick={() => addNode(type)}
                  className="flex h-8 items-center gap-1.5 rounded-md bg-surface-hover px-2 text-left text-xs capitalize text-text transition-[background-color,transform] duration-fast ease-out hover:bg-surface-active active:scale-[.98] active:duration-press"
                >
                  <TypeIcon size={16} aria-hidden="true" className="shrink-0 text-text-muted" />
                  {type}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Selection actions" className="flex flex-col gap-1">
          <div className="flex gap-1">
            <button
              onClick={groupSelected}
              disabled={!canGroup}
              className={`${btnSecondary} !h-7 flex-1 !px-2`}
              title="Group (Ctrl+G)"
              aria-keyshortcuts="Control+G"
            >
              <SelectionPlus size={16} aria-hidden="true" />
              Group
            </button>
            <button
              onClick={ungroupSelected}
              disabled={!canUngroup}
              className={`${btnSecondary} !h-7 flex-1 !px-2`}
              title="Ungroup (Ctrl+Shift+G)"
              aria-keyshortcuts="Control+Shift+G"
            >
              <SelectionSlash size={16} aria-hidden="true" />
              Ungroup
            </button>
          </div>
          {/* always rendered so the layer list below doesn't jump when a selection appears */}
          <button
            onClick={deleteSelected}
            disabled={selectedIds.size === 0}
            className={`${btnDangerGhost} !h-7 w-full`}
          >
            <Trash size={16} aria-hidden="true" />
            Delete selected{selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}
          </button>
        </section>

        <LayerTree
          nodes={nodes}
          selectedIds={selectedIds}
          expandedGroups={expandedGroups}
          onSelect={(id) => selectSingle(id)}
          onToggleExpand={toggleExpand}
          onRename={renameNode}
          headingClass={sectionHeading}
        />

        {/* docs panel */}
        {selected && (
          <section>
            <label htmlFor="node-docs" className={`mb-2 block ${sectionHeading}`}>
              Docs
            </label>
            <textarea
              id="node-docs"
              value={String(selected.props.docs ?? '')}
              onChange={(e) => updateDocs(e.target.value)}
              placeholder="Add documentation for this node…"
              rows={6}
              className="w-full resize-y rounded-md border border-border-strong bg-transparent px-2.5 py-1.5 text-sm text-text placeholder:text-text-subtle hover:border-text-muted"
            />
          </section>
        )}

        {/* shortcuts hint */}
        <section aria-label="Shortcuts" className="space-y-1 text-xs text-text-subtle">
          <p><kbd className={kbd}>Shift</kbd> + click: Multi-select</p>
          <p><kbd className={kbd}>Shift</kbd> + drag: Marquee</p>
          <p><kbd className={kbd}>Ctrl</kbd> + <kbd className={kbd}>G</kbd>: Group</p>
          <p><kbd className={kbd}>Ctrl</kbd> + <kbd className={kbd}>Shift</kbd> + <kbd className={kbd}>G</kbd>: Ungroup</p>
          <p><kbd className={kbd}>Ctrl</kbd> + <kbd className={kbd}>A</kbd>: Select all</p>
          <p><kbd className={kbd}>Del</kbd>: Delete</p>
        </section>
      </aside>
    </div>
  );
}

// ── LayerTree ────────────────────────────────────────────────────────

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
  headingClass,
}: {
  nodes: CanvasNode[];
  selectedIds: Set<string>;
  expandedGroups: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onRename: (id: string, name: string) => void;
  headingClass: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);

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

  // roving tab stop: the first selected visible row, else the first row
  const visible: string[] = [];
  const walk = (n: CanvasNode) => {
    visible.push(n.id);
    if (n.type === 'group' && expandedGroups.has(n.id)) childrenOf(n.id).forEach(walk);
  };
  rootNodes.forEach(walk);
  const tabStop = visible.find((id) => selectedIds.has(id)) ?? visible[0];

  const onRowKey = (e: ReactKeyboardEvent<HTMLDivElement>, node: CanvasNode, isGroup: boolean, isExpanded: boolean) => {
    if (e.target !== e.currentTarget) return; // keys typed in the rename field stay there
    const items = Array.from(treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []);
    const i = items.indexOf(e.currentTarget);
    const level = Number(e.currentTarget.getAttribute('aria-level'));
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[i + 1]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[i - 1]?.focus();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (isGroup && !isExpanded) onToggleExpand(node.id);
        else if (isGroup) items[i + 1]?.focus();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (isGroup && isExpanded) onToggleExpand(node.id);
        else if (level > 1) {
          for (let j = i - 1; j >= 0; j--) {
            if (Number(items[j].getAttribute('aria-level')) < level) {
              items[j].focus();
              break;
            }
          }
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(node.id);
        break;
      case 'F2':
        e.preventDefault();
        startRename(node);
        break;
    }
  };

  const renderNode = (node: CanvasNode, depth: number) => {
    const isGroup = node.type === 'group';
    const isExpanded = expandedGroups.has(node.id);
    const isSelected = selectedIds.has(node.id);
    const children = isGroup ? childrenOf(node.id) : [];
    const RowIcon = NODE_ICONS[node.type] ?? Square;

    return (
      <div key={node.id} role="none">
        <div
          role="treeitem"
          aria-level={depth + 1}
          aria-selected={isSelected}
          aria-expanded={isGroup ? isExpanded : undefined}
          tabIndex={node.id === tabStop ? 0 : -1}
          className={`group flex h-7 cursor-pointer items-center gap-1 rounded-sm pr-1 text-sm focus-visible:-outline-offset-2 ${
            isSelected ? 'bg-accent-subtle text-accent-subtle-text' : 'text-text hover:bg-surface-hover'
          }`}
          style={{ paddingLeft: depth * 12 + 4 }}
          onClick={() => onSelect(node.id)}
          onKeyDown={(e) => onRowKey(e, node, isGroup, isExpanded)}
        >
          {/* expand/collapse chevron for groups */}
          {isGroup ? (
            <button
              tabIndex={-1}
              aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
              onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-text-subtle hover:bg-surface-active"
            >
              {isExpanded ? <CaretDown size={12} aria-hidden="true" /> : <CaretRight size={12} aria-hidden="true" />}
            </button>
          ) : (
            <span className="h-4 w-4 shrink-0" />
          )}

          <RowIcon size={14} aria-hidden="true" className={`shrink-0 ${isSelected ? '' : 'text-text-subtle'}`} />

          {editingId === node.id ? (
            <input
              ref={inputRef}
              value={editValue}
              aria-label="Layer name"
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
              onClick={(e) => e.stopPropagation()}
              className="ml-0.5 h-5 min-w-0 flex-1 rounded-sm border border-selection bg-surface px-1 text-sm text-text"
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); startRename(node); }}
              className={`ml-0.5 flex-1 truncate ${isSelected ? 'font-medium' : ''}`}
            >
              {nodeDisplayName(node)}
            </span>
          )}

          {Boolean(node.props.docs) && (
            <span role="img" aria-label="Has docs" className="shrink-0 text-text-subtle">
              <Note size={12} aria-hidden="true" />
            </span>
          )}
        </div>

        {isGroup && isExpanded && (
          <div role="group">{children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <section>
      <h3 id="canvas-layers" className={`mb-2 ${headingClass}`}>
        Layers
      </h3>
      <div
        ref={treeRef}
        role="tree"
        aria-labelledby="canvas-layers"
        className="max-h-48 space-y-px overflow-auto rounded-md border border-border"
      >
        {rootNodes.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-text-subtle">No layers yet. Add one from the palette above.</p>
        )}
        {rootNodes.map((n) => renderNode(n, 0))}
      </div>
    </section>
  );
}

// ── NodeView ─────────────────────────────────────────────────────────

const RING = {
  hover: 'hover:outline hover:outline-1 hover:outline-selection/50',
  selected:
    'shadow-[0_0_0_1px_var(--lb-canvas),0_0_0_3px_var(--lb-selection),0_0_0_7px_var(--lb-selection-halo)]',
  multi: 'shadow-[0_0_0_1px_var(--lb-selection)]',
};

function DocsBadge() {
  return (
    <span
      role="img"
      aria-label="Has docs"
      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-sm border border-border-strong bg-surface-raised text-text-muted"
    >
      <Note size={12} aria-hidden="true" />
    </span>
  );
}

function NodeView({
  node,
  allNodes,
  selected,
  multi,
  zoom,
  onPointerDown,
  onResizeStart,
}: {
  node: CanvasNode;
  allNodes: CanvasNode[];
  selected: boolean;
  multi: boolean;
  zoom: number;
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
    ? ` transition-shadow duration-fast ${multi ? RING.multi : RING.selected}`
    : ` ${RING.hover}`;
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
        className={`absolute cursor-move rounded-md${ring}`}
      >
        {/* group outline (the selection ring replaces it while selected) */}
        <div
          className={`h-full w-full rounded-md border border-dashed ${
            selected ? 'border-transparent' : 'border-group-outline'
          }`}
        />

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

        {/* group label, hidden below 50% zoom */}
        {zoom >= 0.5 && (
          <span className="pointer-events-none absolute bottom-full left-0 mb-1 flex items-center gap-1 whitespace-nowrap text-2xs font-medium text-text-muted">
            <SelectionPlus size={12} aria-hidden="true" />
            Group · {children.length}
          </span>
        )}

        {hasDocs && <DocsBadge />}

        {selected && <ResizeHandles nodeId={node.id} onResizeStart={onResizeStart} />}
      </div>
    );
  }

  // ── Regular node ───────────────────────────────────────────────────
  return (
    <div style={style} onPointerDown={onPointerDown} className={`${base} ${variantClass(node.type)}`}>
      <NodeInner node={node} />
      {hasDocs && <DocsBadge />}
      {selected && <ResizeHandles nodeId={node.id} onResizeStart={onResizeStart} />}
    </div>
  );
}

// ── ResizeHandles ────────────────────────────────────────────────────

const HANDLE_HIT = 16; // transparent hit area around the 8px visible handle
const HALF = HANDLE_HIT / 2;

const HANDLES: { dir: HandleDir; cursor: string; style: CSSProperties }[] = [
  { dir: 'nw', cursor: 'nwse-resize', style: { left: -HALF, top: -HALF } },
  { dir: 'n',  cursor: 'ns-resize',   style: { left: '50%', top: -HALF, transform: 'translateX(-50%)' } },
  { dir: 'ne', cursor: 'nesw-resize', style: { right: -HALF, top: -HALF } },
  { dir: 'e',  cursor: 'ew-resize',   style: { right: -HALF, top: '50%', transform: 'translateY(-50%)' } },
  { dir: 'se', cursor: 'nwse-resize', style: { right: -HALF, bottom: -HALF } },
  { dir: 's',  cursor: 'ns-resize',   style: { left: '50%', bottom: -HALF, transform: 'translateX(-50%)' } },
  { dir: 'sw', cursor: 'nesw-resize', style: { left: -HALF, bottom: -HALF } },
  { dir: 'w',  cursor: 'ew-resize',   style: { left: -HALF, top: '50%', transform: 'translateY(-50%)' } },
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
          style={{ ...h.style, width: HANDLE_HIT, height: HANDLE_HIT, cursor: h.cursor }}
          className="absolute z-10 flex items-center justify-center"
        >
          <span className="pointer-events-none h-2 w-2 rounded-xs border-[1.5px] border-selection bg-handle-fill" />
        </div>
      ))}
    </>
  );
}

// ── NodeInner: pure visual rendering ─────────────────────────────────

function NodeInner({ node }: { node: CanvasNode }) {
  switch (node.type) {
    case 'frame':
      return (
        <div className="flex h-full w-full items-start justify-start rounded-md border-2 border-dashed border-border-strong p-1 text-xs text-text-subtle">
          {String(node.props.label ?? 'Frame')}
        </div>
      );

    case 'card':
      return (
        <div className="flex h-full w-full items-start justify-start rounded-lg border border-border-strong bg-surface-raised p-2 text-xs text-text-muted">
          {String(node.props.label ?? 'Card')}
        </div>
      );

    case 'button':
      return (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-accent-fg">
          {String(node.props.label ?? 'Button')}
        </div>
      );

    case 'text':
      return (
        <div className="flex h-full w-full items-center justify-start text-sm text-text">
          {String(node.props.text ?? 'Text')}
        </div>
      );

    case 'input':
      return (
        <div className="flex h-full w-full items-center rounded-md border border-border-strong bg-surface-raised px-2 text-sm text-text-subtle">
          {String(node.props.placeholder ?? 'Enter text…')}
        </div>
      );

    case 'image':
      return (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-border-strong bg-surface-hover text-text-subtle">
          <ImageIcon size={24} aria-hidden="true" />
          <span className="mt-1 text-2xs">{String(node.props.alt ?? 'Image')}</span>
        </div>
      );

    case 'divider':
      return <div className="h-0.5 w-full rounded-full bg-border-strong" />;

    case 'badge':
      return (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-accent-subtle px-2 text-xs font-medium text-accent-subtle-text">
          {String(node.props.text ?? 'Badge')}
        </div>
      );

    case 'toggle': {
      const on = Boolean(node.props.on);
      return (
        <div
          className={`flex h-full w-full items-center rounded-full px-0.5 transition-colors ${
            on ? 'bg-accent justify-end' : 'bg-border-strong justify-start'
          }`}
        >
          <div className="h-[18px] w-[18px] rounded-full bg-white shadow-sm" />
        </div>
      );
    }

    case 'box':
    default:
      return <div className="h-full w-full rounded-md bg-border-strong/40" />;
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
