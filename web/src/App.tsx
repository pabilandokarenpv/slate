import { useState } from "react";
import { useTheme } from "./hooks/useTheme";
import { useSessions } from "./hooks/useSessions";
import { useProjects, useBots } from "./hooks/useCollections";
import { useCron } from "./hooks/useCron";
import { Sidebar } from "./components/Sidebar";
import { ChatPane } from "./components/ChatPane";
import { SidePanel, type PanelTab } from "./components/SidePanel";
import { ProjectsView, BotsView, CronView } from "./components/FeatureViews";
import type { FeatureView } from "./lib/types";

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { bots, create: createBot, remove: removeBot } = useBots();
  const { projects, create: createProject, remove: removeProject } = useProjects();
  const sessionsApi = useSessions(bots);

  const [view, setView] = useState<FeatureView>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("artifact");
  const [artifact, setArtifact] = useState<{ code: string; lang: string } | null>(null);
  const [streamingText, setStreamingText] = useState("");

  const cron = useCron(view === "cron");

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 900) setSidebarOpen(false);
  };

  const openPanel = (tab: PanelTab) => {
    setView("chat");
    setPanelTab(tab);
    setPanelOpen(true);
    closeSidebarOnMobile();
  };

  const sessionCounts: Record<string, number> = {};
  for (const s of sessionsApi.sessions) {
    if (s.projectId) sessionCounts[s.projectId] = (sessionCounts[s.projectId] ?? 0) + 1;
  }

  const runWithStream = (fn: (onDelta: (t: string) => void) => void) => {
    setStreamingText("");
    fn(setStreamingText);
  };

  return (
    <div className="relative flex h-[100dvh] overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-[15] bg-[var(--scrim)] backdrop-blur-[6px] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        open={sidebarOpen}
        theme={theme}
        onToggleTheme={toggleTheme}
        sessions={sessionsApi.sessions}
        activeId={sessionsApi.activeId}
        activeView={view}
        onSelectSession={(id) => {
          sessionsApi.setActiveId(id);
          setView("chat");
          closeSidebarOnMobile();
        }}
        onDeleteSession={sessionsApi.deleteSession}
        onNewChat={() => {
          sessionsApi.newSession();
          setView("chat");
          closeSidebarOnMobile();
        }}
        onOpenPanel={openPanel}
        onSetView={(v) => {
          setView(v);
          closeSidebarOnMobile();
        }}
      />

      <div className="flex min-w-0 flex-1">
        {view === "chat" && (
          <>
            <div className={panelOpen ? "flex min-w-0 flex-1 max-md:hidden" : "flex min-w-0 flex-1"}>
              <ChatPane
                session={sessionsApi.active}
                streaming={sessionsApi.streaming}
                streamingText={streamingText}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen((v) => !v)}
                onSend={(text) => runWithStream((cb) => sessionsApi.sendMessage(text, cb))}
                onStop={sessionsApi.stopGeneration}
                onOpenArtifact={(code, lang) => {
                  setArtifact({ code, lang });
                  setPanelTab("artifact");
                  setPanelOpen(true);
                }}
                onRegenerate={() => runWithStream((cb) => sessionsApi.regenerate(cb))}
                onEditResend={(idx, text) => runWithStream((cb) => sessionsApi.editAndResend(idx, text, cb))}
              />
            </div>
            <SidePanel open={panelOpen} tab={panelTab} artifact={artifact} onSetTab={setPanelTab} onClose={() => setPanelOpen(false)} />
          </>
        )}

        {view === "projects" && (
          <ProjectsView
            projects={projects}
            sessionCounts={sessionCounts}
            onCreate={createProject}
            onDelete={removeProject}
            onOpen={(id) => {
              sessionsApi.newSession({ projectId: id });
              setView("chat");
            }}
          />
        )}

        {view === "bots" && (
          <BotsView
            bots={bots}
            onCreate={createBot}
            onDelete={removeBot}
            onOpen={(id) => {
              sessionsApi.newSession({ botId: id });
              setView("chat");
            }}
          />
        )}

        {view === "cron" && <CronView jobs={cron.jobs} loading={cron.loading} onCreate={cron.create} onDelete={cron.remove} />}
      </div>
    </div>
  );
}
