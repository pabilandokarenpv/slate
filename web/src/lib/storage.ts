import type { Bot, CronJob, Project, Session, Theme } from "./types";

const SESS_KEY = "kernel_ai_sessions_v1";
const PROJECTS_KEY = "kernel_ai_projects_v1";
const BOTS_KEY = "kernel_ai_bots_v1";
const THEME_KEY = "kernel_ai_theme_v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  loadSessions: (): Session[] => readJson(SESS_KEY, []),
  saveSessions: (list: Session[]) => writeJson(SESS_KEY, list),

  loadProjects: (): Project[] => readJson(PROJECTS_KEY, []),
  saveProjects: (list: Project[]) => writeJson(PROJECTS_KEY, list),

  loadBots: (): Bot[] => readJson(BOTS_KEY, []),
  saveBots: (list: Bot[]) => writeJson(BOTS_KEY, list),

  loadTheme: (): Theme | null => localStorage.getItem(THEME_KEY) as Theme | null,
  saveTheme: (theme: Theme) => localStorage.setItem(THEME_KEY, theme),
};

export function newId(prefix: string): string {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 7);
}

// Kept for reference/tests; CronJob import above documents the shape
// the /api/cron backend returns, consumed in lib/api.ts.
export type { CronJob };
