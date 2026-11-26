import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { btnDanger, btnSecondary } from './ui';

// native <dialog>: showModal() gives the focus trap, Escape and focus return to the opener (system.md 6.14)
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      cancelRef.current?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // scrim click
      }}
      className="m-auto w-[calc(100%-32px)] max-w-[420px] rounded-xl border-0 bg-surface-raised p-6 text-text shadow-dialog backdrop:bg-black/50 dark:border dark:border-border"
    >
      <h2 id="confirm-title" className="text-lg font-semibold">
        {title}
      </h2>
      <p id="confirm-body" className="mt-2 text-sm text-text-muted">
        {children}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} aria-busy={busy} className={btnDanger}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
