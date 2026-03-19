"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

const CYCLE: ("system" | "light" | "dark")[] = ["system", "light", "dark"];

const ICON_MAP = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

const LABEL_MAP = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
} as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render nothing until mounted
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        aria-label="Toggle theme"
      >
        <Monitor className="h-5 w-5" />
      </button>
    );
  }

  const current = (theme as "system" | "light" | "dark") ?? "system";
  const Icon = ICON_MAP[current] ?? Monitor;
  const label = LABEL_MAP[current] ?? "Toggle theme";

  function cycle() {
    const idx = CYCLE.indexOf(current);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setTheme(next);
  }

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
