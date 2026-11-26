// shared class strings for workspace chrome (system.md 6.1 / 6.2). Semantic tokens only.
const base =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-[background-color,color,transform] duration-fast ease-out active:scale-[.98] active:duration-press disabled:active:scale-100';

export const btnPrimary = `${base} bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-pressed disabled:bg-surface-active disabled:text-text-disabled`;
export const btnSecondary = `${base} border border-border-strong text-text hover:bg-surface-hover active:bg-surface-active disabled:border-border disabled:text-text-disabled`;
export const btnGhost = `${base} text-text-muted hover:bg-surface-hover hover:text-text active:bg-surface-active disabled:text-text-disabled`;
export const btnDangerGhost = `${base} text-danger hover:bg-danger-subtle active:bg-danger-subtle disabled:text-text-disabled`;
export const btnDanger = `${base} bg-danger-fill text-danger-fg hover:brightness-90 active:brightness-75 disabled:bg-surface-active disabled:text-text-disabled`;
export const btnIcon = `${btnGhost} !w-8 !px-0`;

export const inputCls =
  'h-8 min-w-0 rounded-md border border-border-strong bg-transparent px-2.5 text-base text-text placeholder:text-text-subtle hover:border-text-muted disabled:border-border disabled:bg-surface-hover disabled:text-text-disabled max-sm:text-[16px]';
