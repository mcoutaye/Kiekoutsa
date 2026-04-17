"use client";

import { X } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <button
          type="button"
          onClick={() => !loading && onCancel()}
          className="absolute right-3 top-3 p-2 rounded-lg text-gray-500 hover:text-white transition-colors"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          aria-label="Fermer"
          disabled={loading}
        >
          <X size={16} />
        </button>

        <h3 className="text-lg font-black text-white pr-10">{title}</h3>
        {message ? <p className="mt-2 text-sm text-gray-400">{message}</p> : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              destructive ? "bg-red-600 hover:bg-red-500" : "bg-purple-600 hover:bg-purple-500"
            }`}
          >
            {loading ? "…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
