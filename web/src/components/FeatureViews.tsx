import { useState } from "react";
import { FolderKanban, Bot as BotIcon, Clock } from "lucide-react";
import { Card, EmptyState, FeatureHeader } from "./Card";
import { Modal } from "./Modal";
import type { Bot, CronJob, Project } from "../lib/types";

export function ProjectsView({
  projects,
  sessionCounts,
  onCreate,
  onDelete,
  onOpen,
}: {
  projects: Project[];
  sessionCounts: Record<string, number>;
  onCreate: (name: string, instructions: string) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-7">
      <FeatureHeader title="Projects" description="Group related chats and give them shared instructions." actionLabel="New project" onAction={() => setModalOpen(true)} />
      {projects.length === 0 ? (
        <EmptyState icon={<FolderKanban size={40} />} text="No projects yet. Group related chats together with shared instructions." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              icon={<FolderKanban size={18} />}
              title={p.name}
              subtitle={p.instructions || "No instructions set"}
              pill={`${sessionCounts[p.id] ?? 0} chats`}
              onClick={() => onOpen(p.id)}
              onDelete={() => onDelete(p.id)}
            />
          ))}
        </div>
      )}
      <Modal
        open={modalOpen}
        title="New project"
        fields={[
          { key: "name", label: "Name", type: "text", placeholder: "e.g. Kernel-lang docs" },
          { key: "instructions", label: "Instructions (optional)", type: "textarea", placeholder: "Shared context/instructions for every chat in this project" },
        ]}
        onCancel={() => setModalOpen(false)}
        onConfirm={(v) => {
          if (!v.name?.trim()) return;
          onCreate(v.name.trim(), v.instructions?.trim() ?? "");
          setModalOpen(false);
        }}
      />
    </div>
  );
}

export function BotsView({
  bots,
  onCreate,
  onDelete,
  onOpen,
}: {
  bots: Bot[];
  onCreate: (name: string, emoji: string, instructions: string) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-7">
      <FeatureHeader title="Bots" description="Create a custom bot with its own persona and instructions." actionLabel="New bot" onAction={() => setModalOpen(true)} />
      {bots.length === 0 ? (
        <EmptyState icon={<BotIcon size={40} />} text="No bots yet. Create a custom bot with its own persona and instructions." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((b) => (
            <Card key={b.id} icon={<span>{b.emoji || "🤖"}</span>} title={b.name} subtitle={b.instructions || "No instructions set"} onClick={() => onOpen(b.id)} onDelete={() => onDelete(b.id)} />
          ))}
        </div>
      )}
      <Modal
        open={modalOpen}
        title="New bot"
        fields={[
          { key: "name", label: "Name", type: "text", placeholder: "e.g. Code Reviewer" },
          { key: "emoji", label: "Emoji (optional)", type: "text", placeholder: "🤖" },
          { key: "instructions", label: "Instructions", type: "textarea", placeholder: "How should this bot behave?" },
        ]}
        onCancel={() => setModalOpen(false)}
        onConfirm={(v) => {
          if (!v.name?.trim()) return;
          onCreate(v.name.trim(), v.emoji?.trim() ?? "", v.instructions?.trim() ?? "");
          setModalOpen(false);
        }}
      />
    </div>
  );
}

export function CronView({
  jobs,
  loading,
  onCreate,
  onDelete,
}: {
  jobs: CronJob[];
  loading: boolean;
  onCreate: (prompt: string, scheduleMinutes: number) => void;
  onDelete: (id: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-7">
      <FeatureHeader title="Cron Jobs" description="Schedule a prompt to run automatically, even when this tab is closed." actionLabel="New cron job" onAction={() => setModalOpen(true)} />
      {loading ? (
        <EmptyState icon={<Clock size={40} />} text="Loading…" />
      ) : jobs.length === 0 ? (
        <EmptyState icon={<Clock size={40} />} text="No scheduled jobs yet. A job keeps running on our server every N minutes, even with this closed." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <Card
              key={j.id}
              icon={<Clock size={18} />}
              title={`every ${j.scheduleMinutes} min`}
              subtitle={j.lastResult ? `${j.prompt}\n↳ ${j.lastResult.slice(0, 80)}` : j.prompt}
              pill={j.lastResult ? undefined : "not run yet"}
              onClick={() => {}}
              onDelete={() => onDelete(j.id)}
            />
          ))}
        </div>
      )}
      <Modal
        open={modalOpen}
        title="New cron job"
        fields={[
          { key: "prompt", label: "Prompt", type: "textarea", placeholder: "e.g. Summarize today's Kernel-lang commits" },
          { key: "scheduleMinutes", label: "Run every (minutes, minimum 5)", type: "number", defaultValue: "60" },
        ]}
        onCancel={() => setModalOpen(false)}
        onConfirm={(v) => {
          if (!v.prompt?.trim()) return;
          onCreate(v.prompt.trim(), parseInt(v.scheduleMinutes, 10) || 60);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
