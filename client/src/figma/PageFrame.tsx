import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { type CanvasNode, type Page } from './types';

// The page frame: origin is canvas (0, 0). It grows downward with the content, and the
// "first screen" (fold) sits at page.foldHeight. Mirror of the export rules in
// server/src/export/react-vite/generate.ts.

export const BOTTOM_PADDING = 80;
export const MARGIN = 24;
export const WIDTH_MIN = 320;
export const WIDTH_MAX = 3840;

export const PAGE_PRESETS: { id: string; label: string; width: number; foldHeight: number }[] = [
  { id: 'desktop', label: 'Desktop 16:9', width: 1440, foldHeight: 810 },
  { id: 'tablet', label: 'Tablet', width: 768, foldHeight: 1024 },
  { id: 'mobile', label: 'Mobile', width: 390, foldHeight: 844 },
];

type Box = { x: number; y: number; width: number; height: number };
export type OffPage = 'partly' | 'outside';

export const OFF_PAGE_TIP: Record<OffPage, string> = {
  outside: 'Outside the page: left out of the export',
  partly: 'Partly outside the page: clipped in the export',
};

/** Outside = left of 0, right of the page width, or above 0. Below the fold is normal content. */
export function offPage(box: Box, pageWidth: number): OffPage | null {
  if (box.x + box.width <= 0 || box.x >= pageWidth || box.y + box.height <= 0) return 'outside';
  if (box.x < 0 || box.x + box.width > pageWidth || box.y < 0) return 'partly';
  return null;
}

/** x / y snap targets contributed by the page: edges, centre, 24px margins, top and the fold. */
export function pageSnapTargets(page: Pick<Page, 'width' | 'foldHeight'>) {
  const w = page.width;
  return { x: [0, w, w / 2, MARGIN, w - MARGIN], y: [0, page.foldHeight] };
}

/** Frame height: never less than the fold, grows to the lowest top-level element + 80. */
export function frameHeight(rootBoxes: Box[], page: Pick<Page, 'foldHeight'>) {
  const lowest = rootBoxes.reduce((m, b) => Math.max(m, b.y + b.height), -Infinity);
  return Math.max(page.foldHeight, rootBoxes.length ? lowest + BOTTOM_PADDING : 0);
}

/** Warning state per node id. Children take their group's state (judged by the group's absolute box). */
export function offPageMap(nodes: CanvasNode[], pageWidth: number): Map<string, OffPage> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map<string, OffPage>();
  const rootState = new Map<string, OffPage | null>();
  for (const n of nodes) {
    let top = n;
    for (let hops = 0; top.props.parentId && hops < 32; hops++) {
      const parent = byId.get(top.props.parentId as string);
      if (!parent) break;
      top = parent;
    }
    if (!rootState.has(top.id)) rootState.set(top.id, offPage(top, pageWidth));
    const state = rootState.get(top.id);
    if (state) out.set(n.id, state);
  }
  return out;
}

export function PageFrame({
  page,
  height,
  zoom,
}: {
  page: Pick<Page, 'name' | 'width' | 'foldHeight'>;
  height: number;
  zoom: number;
}) {
  // keep the outline and fold line 1px on screen at any zoom
  const hair = 1 / zoom;
  const area: CSSProperties = { left: 0, top: 0, width: page.width, height, outline: `${hair}px solid var(--lb-border-strong)` };
  // labels live in the scaled layer; counter-scale them so they stay 11px on screen
  const showLabels = zoom >= 0.15;
  const labelSize = 11 / zoom;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0">
      <div style={area} className="absolute bg-surface" />
      {showLabels && (
        <span
          style={{ left: 0, bottom: '100%', marginBottom: 6 / zoom, fontSize: labelSize, lineHeight: 1.3 }}
          className="absolute whitespace-nowrap font-medium text-text-subtle"
        >
          {page.name} · {page.width}
        </span>
      )}
      <div
        style={{ left: 0, top: page.foldHeight, width: page.width, borderTop: `${hair}px dashed var(--lb-border-strong)` }}
        className="absolute"
      />
      {showLabels && (
        <span
          style={{ left: page.width, top: page.foldHeight, transform: 'translate(-100%, -100%)', marginTop: -4 / zoom, marginLeft: -8 / zoom, fontSize: labelSize, lineHeight: 1.3 }}
          className="absolute whitespace-nowrap text-text-subtle"
        >
          First screen
        </span>
      )}
    </div>
  );
}

/** Width input with a draft, so typing "1" on the way to "1200" doesn't clamp mid-edit. */
export function WidthInput({ width, onCommit, id }: { width: number; onCommit: (w: number) => void; id: string }) {
  const [draft, setDraft] = useState(String(width));
  useEffect(() => setDraft(String(width)), [width]);
  const commit = () => {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n) || draft.trim() === '') {
      setDraft(String(width));
      return;
    }
    const next = Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, n));
    setDraft(String(next));
    if (next !== width) onCommit(next);
  };
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={WIDTH_MIN}
      max={WIDTH_MAX}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
      className="h-8 w-20 rounded-md border border-border-strong bg-transparent px-2 text-sm tabular-nums text-text hover:border-text-muted"
    />
  );
}
