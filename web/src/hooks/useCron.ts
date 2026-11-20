import { useCallback, useEffect, useState } from "react";
import type { CronJob } from "../lib/types";
import { cronApi } from "../lib/api";

export function useCron(active: boolean) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await cronApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  const create = async (prompt: string, scheduleMinutes: number) => {
    await cronApi.create(prompt, scheduleMinutes);
    await refresh();
  };

  const remove = async (id: string) => {
    await cronApi.remove(id);
    await refresh();
  };

  return { jobs, loading, create, remove, refresh };
}
