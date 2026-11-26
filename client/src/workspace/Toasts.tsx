import { useEffect, useRef, useState } from 'react';
import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react';
import { btnIcon, btnSecondary } from './ui';

export type ToastData = {
  id: number;
  kind: 'success' | 'error';
  title: string;
  body?: string;
  /** body text with `code` pieces: rendered in mono */
  code?: string;
  action?: { label: string; run: () => void };
};

export function Toasts({ toasts, dismiss }: { toasts: ToastData[]; dismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4">
      {toasts.slice(-3).map((t) => (
        <Toast key={t.id} toast={t} dismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

// auto-dismiss after 8s, paused while hovered or focused
function Toast({ toast, dismiss }: { toast: ToastData; dismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => dismissRef.current(), 8000);
    return () => clearTimeout(t);
  }, [paused]);

  const error = toast.kind === 'error';
  return (
    <div
      role={error ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto flex w-full gap-3 rounded-lg p-3 shadow-float animate-[lb-rise_var(--duration-base)_var(--ease-out)_both] sm:w-[360px] ${
        error ? 'border border-border bg-danger-subtle' : 'bg-surface-raised dark:border dark:border-border'
      }`}
    >
      {error ? (
        <WarningCircle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
      ) : (
        <CheckCircle size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium text-text">{toast.title}</p>
        {(toast.body || toast.code) && (
          <p className="mt-0.5 break-words text-xs text-text-muted">
            {toast.body}
            {toast.code && <code className="font-mono">{toast.code}</code>}
          </p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.run();
              dismiss();
            }}
            className={`${btnSecondary} mt-2`}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button onClick={dismiss} aria-label="Dismiss notification" className={`${btnIcon} -mr-1 -mt-1 !h-6 !w-6`}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
