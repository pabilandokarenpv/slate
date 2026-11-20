import { useState } from "react";

interface Field {
  key: string;
  label: string;
  type: "text" | "textarea" | "number";
  placeholder?: string;
  defaultValue?: string;
}

interface Props {
  open: boolean;
  title: string;
  fields: Field[];
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (values: Record<string, string>) => void;
}

export function Modal({ open, title, fields, confirmLabel = "Create", onCancel, onConfirm }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  if (!open) return null;

  const get = (k: string, fallback = "") => values[k] ?? fallback;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-5 backdrop-blur-[6px]" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in w-full max-w-[420px] rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-[0_20px_60px_var(--shadow)]"
      >
        <h3 className="m-0 mb-4 text-base font-bold">{title}</h3>
        {fields.map((f) => (
          <div key={f.key} className="mb-3.5">
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea
                rows={3}
                placeholder={f.placeholder}
                defaultValue={f.defaultValue}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5 text-[13.5px] text-[var(--text)] focus:border-[var(--text-tertiary)] focus:outline-none"
              />
            ) : (
              <input
                type={f.type}
                placeholder={f.placeholder}
                defaultValue={f.defaultValue}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5 text-[13.5px] text-[var(--text)] focus:border-[var(--text-tertiary)] focus:outline-none"
              />
            )}
          </div>
        ))}
        <div className="mt-4.5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text)] hover:opacity-85">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(values);
              setValues({});
            }}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-contrast)] hover:opacity-85"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function getFieldValue(values: Record<string, string>, key: string, fallback = ""): string {
  return values[key] ?? fallback;
}
