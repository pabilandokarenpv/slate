import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

interface CardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  pill?: string;
  onClick: () => void;
  onDelete: () => void;
}

export function Card({ icon, title, subtitle, pill, onClick, onDelete }: CardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-[18px] border border-[var(--border)] bg-[var(--bg-glass)] p-4 transition-colors hover:bg-[var(--bg-glass-strong)] active:scale-[0.98]"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-[var(--text-tertiary)] opacity-0 transition-opacity hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
      <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-[11px] bg-[var(--bg-elevated)] text-lg">{icon}</div>
      <div className="mb-[3px] text-sm font-semibold">{title}</div>
      <div className="line-clamp-2 text-xs leading-[1.4] text-[var(--text-tertiary)]">{subtitle}</div>
      {pill && <span className="mt-2 inline-block rounded-lg bg-[var(--bg-elevated)] px-2 py-0.5 text-[10.5px] text-[var(--text-tertiary)]">{pill}</span>}
    </div>
  );
}

export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="col-span-full flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-10 text-center text-[var(--text-tertiary)]">
      <div className="opacity-40">{icon}</div>
      <p className="m-0 max-w-[280px] text-[13px]">{text}</p>
    </div>
  );
}

export function FeatureHeader({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="mb-[18px] flex items-center justify-between">
      <div>
        <h2 className="m-0 text-xl font-bold tracking-[-0.015em]">{title}</h2>
        <p className="m-0 mt-1 text-[13px] text-[var(--text-tertiary)]">{description}</p>
      </div>
      <button
        onClick={onAction}
        className="flex shrink-0 items-center gap-1.5 rounded-[14px] bg-[var(--accent)] px-4 py-2.5 text-[13.5px] font-semibold text-[var(--accent-contrast)] hover:opacity-85"
      >
        + {actionLabel}
      </button>
    </div>
  );
}
