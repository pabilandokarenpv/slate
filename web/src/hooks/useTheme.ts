import { useCallback, useEffect, useState } from "react";
import type { Theme } from "../lib/types";
import { storage } from "../lib/storage";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = storage.loadTheme();
    if (saved) return saved;
    return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      storage.saveTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
