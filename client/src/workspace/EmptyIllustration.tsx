// static picture of the product idea (system.md 6.12): canvas primitives, one selected,
// linked to a doc line with a ref pill. Token colours only, no animation.
export default function EmptyIllustration() {
  return (
    <svg viewBox="0 0 240 120" width="240" height="120" aria-hidden="true" focusable="false">
      {/* card */}
      <rect x="8" y="14" width="76" height="52" rx="6" className="fill-surface stroke-border-strong" strokeWidth="1" />
      <rect x="18" y="26" width="34" height="6" rx="3" className="fill-border-strong" />
      <rect x="18" y="40" width="54" height="4" rx="2" className="fill-border" />
      {/* button, the selected one */}
      <rect x="4" y="80" width="64" height="30" rx="8" className="fill-none stroke-selection-halo" strokeWidth="4" />
      <rect x="8" y="84" width="56" height="22" rx="5" className="fill-surface stroke-selection" strokeWidth="1.5" />
      <rect x="20" y="93" width="32" height="4" rx="2" className="fill-border-strong" />
      {/* text line */}
      <rect x="96" y="30" width="44" height="5" rx="2.5" className="fill-border-strong" />
      {/* link from the selected button to the doc line */}
      <path d="M64 95 H112 V50 H160" className="stroke-guide" strokeWidth="1" fill="none" />
      {/* doc line with a ref pill */}
      <rect x="160" y="42" width="72" height="5" rx="2.5" className="fill-border-strong" />
      <rect x="160" y="52" width="40" height="12" rx="3" className="fill-accent-subtle stroke-accent-text" strokeWidth="1" />
      <rect x="166" y="56.5" width="28" height="3" rx="1.5" className="fill-accent-text" />
      <rect x="160" y="74" width="58" height="5" rx="2.5" className="fill-border" />
    </svg>
  );
}
