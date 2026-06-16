"use client";

// In-app confirmation modal (replaces window.confirm). Styled to match the app
// (paper/ink card, hard shadow). `danger` makes the confirm button red.

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "confirm",
  cancelLabel = "cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/55 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-3xl border-[2.5px] border-ink bg-paper-cool p-6 text-center shadow-hard"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-sans text-lg font-bold tracking-tight text-ink">{title}</h3>
        {body && <p className="mt-1.5 font-sans text-[14px] leading-relaxed text-ink-soft">{body}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border-2 border-ink bg-paper-cool px-4 py-2.5 font-sans text-sm font-bold tracking-tight text-ink shadow-hard-xs"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl border-2 border-ink px-4 py-2.5 font-sans text-sm font-bold tracking-tight shadow-hard-xs ${
              danger ? "bg-red text-paper-cool" : "bg-ink text-paper-cool"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
