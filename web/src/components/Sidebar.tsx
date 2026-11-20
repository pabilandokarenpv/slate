import { Plus, LayoutPanelLeft, Code2, FolderKanban, Bot as BotIcon, Clock, Sun, Moon, PanelLeft } from "lucide-react";
import type { FeatureView, Session, Theme } from "../lib/types";

interface Props {
  open: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  sessions: Session[];
  activeId: string | null;
  activeView: FeatureView;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  onOpenPanel: (tab: "artifact" | "kernel-code") => void;
  onSetView: (v: FeatureView) => void;
}

export function Sidebar({
  open,
  theme,
  onToggleTheme,
  sessions,
  activeId,
  activeView,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onOpenPanel,
  onSetView,
}: Props) {
  const navBtn = (icon: React.ReactNode, label: string, onClick: () => void, active = false) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-[11px] rounded-[14px] px-[11px] py-[9px] text-left text-[13.5px] font-medium transition-colors hover:bg-[var(--bg-glass-strong)] active:scale-[0.97] ${
        active ? "bg-[var(--bg-elevated)]" : ""
      }`}
    >
      <span className="opacity-85 shrink-0">{icon}</span>
      {label}
    </button>
  );

  return (
    <div
      className={`fixed inset-y-0 left-0 z-20 flex w-[264px] shrink-0 flex-col gap-3.5 bg-[var(--bg-glass)] p-3 pt-[calc(16px+env(safe-area-inset-top))] pl-[calc(12px+env(safe-area-inset-left))] backdrop-blur-[28px] transition-transform duration-250 ease-[cubic-bezier(.4,0,.2,1)] md:static md:translate-x-0 ${
        open ? "translate-x-0 shadow-[8px_0_32px_var(--shadow)] md:shadow-none" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-[9px] px-1.5 py-1 text-base font-bold tracking-[-0.015em]">
        <LayoutPanelLeft size={22} strokeWidth={1.6} />
        Whitekernel
      </div>

      {navBtn(<Plus size={18} strokeWidth={1.6} />, "New chat", onNewChat)}

      <div className="flex flex-col gap-[3px]">
        {navBtn(<LayoutPanelLeft size={18} strokeWidth={1.6} />, "Artifacts", () => onOpenPanel("artifact"))}
        {navBtn(<Code2 size={18} strokeWidth={1.6} />, "Kernel Code", () => onOpenPanel("kernel-code"))}
        {navBtn(<FolderKanban size={18} strokeWidth={1.6} />, "Projects", () => onSetView("projects"), activeView === "projects")}
        {navBtn(<BotIcon size={18} strokeWidth={1.6} />, "Bots", () => onSetView("bots"), activeView === "bots")}
        {navBtn(<Clock size={18} strokeWidth={1.6} />, "Cron Jobs", () => onSetView("cron"), activeView === "cron")}
      </div>

      <div className="mt-1 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`group flex cursor-pointer items-center justify-between rounded-xl px-[11px] py-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-glass-strong)] ${
              s.id === activeId && activeView === "chat" ? "bg-[var(--bg-elevated)] text-[var(--text)]" : ""
            }`}
          >
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{s.title}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(s.id);
              }}
              className="px-1 text-xs text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100"
            >
              ✕
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-1.5 pt-0.5 text-[11px] text-[var(--text-tertiary)]">
        <span>own from-scratch model</span>
        <button onClick={onToggleTheme} className="rounded-[10px] p-[5px] hover:bg-[var(--bg-glass-strong)]" aria-label="Toggle theme">
          {theme === "light" ? <Sun size={18} strokeWidth={1.6} /> : <Moon size={18} strokeWidth={1.6} />}
        </button>
      </div>
    </div>
  );
}

export function SidebarToggleIcon({ open }: { open: boolean }) {
  return open ? <PanelLeft size={18} strokeWidth={1.6} /> : <PanelLeft size={18} strokeWidth={1.6} className="opacity-60" />;
}
