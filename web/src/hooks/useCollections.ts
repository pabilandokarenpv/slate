import { useEffect, useState } from "react";
import type { Bot, Project } from "../lib/types";
import { storage, newId } from "../lib/storage";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => storage.loadProjects());
  useEffect(() => storage.saveProjects(projects), [projects]);

  return {
    projects,
    create: (name: string, instructions: string) =>
      setProjects((prev) => [{ id: newId("p"), name, instructions }, ...prev]),
    remove: (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id)),
  };
}

export function useBots() {
  const [bots, setBots] = useState<Bot[]>(() => storage.loadBots());
  useEffect(() => storage.saveBots(bots), [bots]);

  return {
    bots,
    create: (name: string, emoji: string, instructions: string) =>
      setBots((prev) => [{ id: newId("b"), name, emoji, instructions }, ...prev]),
    remove: (id: string) => setBots((prev) => prev.filter((b) => b.id !== id)),
  };
}
