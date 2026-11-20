export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface Session {
  id: string;
  title: string;
  history: ChatMessage[];
  botId?: string | null;
  projectId?: string | null;
}

export interface Project {
  id: string;
  name: string;
  instructions: string;
}

export interface Bot {
  id: string;
  name: string;
  emoji?: string;
  instructions: string;
}

export interface CronJob {
  id: string;
  prompt: string;
  system?: string;
  scheduleMinutes: number;
  createdAt: number;
  lastRunAt?: number;
  lastResult?: string;
}

export type FeatureView = "chat" | "projects" | "bots" | "cron";
export type PanelTab = "artifact" | "kernel-code";
export type Theme = "dark" | "light";
