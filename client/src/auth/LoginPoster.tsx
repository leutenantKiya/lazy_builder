// Static picture of "the IR assembling" (system.md §7): flat primitives drifting at different
// depths, one cluster snapped into a card that is linked to a doc line. Token colours only.

// deterministic scatter so the picture never changes between renders
function scatter() {
  const out: { x: number; y: number; w: number; h: number; o: number; r: number }[] = [];
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  while (out.length < 34) {
    const w = 40 + rnd() * 90;
    const h = rnd() < 0.35 ? 10 + rnd() * 6 : 24 + rnd() * 56;
    const x = rnd() * 760;
    const y = rnd() * 660;
    // keep the focus cluster and the doc line clear
    const hitsCluster = x + w > 270 && x < 540 && y + h > 220 && y < 420;
    const hitsDoc = x + w > 570 && x < 760 && y + h > 270 && y < 390;
    if (hitsCluster || hitsDoc) continue;
    out.push({ x, y, w, h, o: 0.3 + rnd() * 0.6, r: h < 20 ? 3 : 6 });
  }
  return out;
}

const PLANES = scatter();

export default function LoginPoster({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g className="fill-surface-raised stroke-border-strong" strokeWidth="1">
        {PLANES.map((p, i) => (
          <rect
            key={i}
            x={p.x.toFixed(0)}
            y={p.y.toFixed(0)}
            width={p.w.toFixed(0)}
            height={p.h.toFixed(0)}
            rx={p.r}
            opacity={p.o.toFixed(2)}
          />
        ))}
      </g>

      {/* the snapped cluster: a card with a title, a text line and a button */}
      <rect x="300" y="250" width="210" height="140" rx="8" className="fill-surface stroke-selection" strokeWidth="1.5" />
      <rect x="296" y="246" width="218" height="148" rx="11" className="fill-none stroke-selection-halo" strokeWidth="6" />
      <rect x="320" y="272" width="90" height="12" rx="3" className="fill-border-strong" />
      <rect x="320" y="298" width="160" height="8" rx="3" className="fill-border" />
      <rect x="320" y="342" width="72" height="30" rx="6" className="fill-surface-raised stroke-border-strong" />

      {/* cross-link to a doc line */}
      <path d="M510 320 H610" className="stroke-guide" strokeWidth="1.5" fill="none" />
      <g className="fill-surface-raised stroke-border-strong" strokeWidth="1">
        <rect x="610" y="296" width="130" height="48" rx="6" />
      </g>
      <rect x="624" y="308" width="84" height="6" rx="3" className="fill-border-strong" />
      <rect x="624" y="324" width="56" height="6" rx="3" className="fill-border" />
    </svg>
  );
}
