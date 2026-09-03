import { X } from "lucide-react";
import type { ReactNode } from "react";

// Same shell as features/admin/components/ConfirmDialog — duplicated rather
// than imported, matching this codebase's "no feature imports another
// feature's internals" convention (features/admin is meant to stay
// self-contained, and Settings isn't an admin surface).
export function ConfirmActionDialog({
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  isPending = false,
  disabled = false,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-ink">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-stone-600">{description}</p>
        {children && <div className="mt-3">{children}</div>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending || disabled}
            className={`w-full rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-brand-purple hover:bg-brand-purple/90"
            }`}
          >
            {isPending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
