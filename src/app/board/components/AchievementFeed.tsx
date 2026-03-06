"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "../types";

interface Achievement {
  icon: string;
  message: string;
}

function buildAchievements(entries: LeaderboardEntry[]): Achievement[] {
  const list: Achievement[] = [];

  for (const entry of entries) {
    const firstName = entry.name.split(" ")[0];

    if (entry.rank === 1) {
      list.push({ icon: "🏆", message: `${firstName} is the #1 Top Provider on LocalPro this week!` });
    }
    if (entry.avgRating >= 4.8) {
      list.push({ icon: "⭐", message: `${firstName} is now Top Rated with ${entry.avgRating.toFixed(1)}⭐ — ${entry.completedJobCount} jobs completed!` });
    }
    if (entry.completedJobCount >= 50) {
      list.push({ icon: "🔥", message: `${firstName} just hit ${entry.completedJobCount} completed jobs on LocalPro!` });
    } else if (entry.completedJobCount >= 10) {
      list.push({ icon: "🔥", message: `${firstName} completed ${entry.completedJobCount} jobs and is climbing the leaderboard!` });
    }
    if (entry.isLocalProCertified) {
      list.push({ icon: "✅", message: `${firstName} earned the LocalPro Certified badge — trusted by clients!` });
    }
    if (entry.completionRate >= 95) {
      list.push({ icon: "💯", message: `${firstName} maintains a ${entry.completionRate}% completion rate — one of the best in the platform!` });
    }
    if (entry.rank <= 3 && entry.completedJobCount > 0) {
      list.push({ icon: "📈", message: `${firstName} is in the Top 3 providers — join LocalPro and compete!` });
    }
  }

  return list.length ? list : [
    { icon: "🚀", message: "Be the next top provider — sign up on LocalPro today!" },
  ];
}

const CYCLE_MS = 4000;

export function AchievementFeed({ entries }: { entries: LeaderboardEntry[] }) {
  const achievements = buildAchievements(entries);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (achievements.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % achievements.length);
        setVisible(true);
      }, 300);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [achievements.length]);

  const current = achievements[index];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl min-w-0 overflow-hidden">
      <span className="text-base flex-shrink-0 leading-none" aria-hidden="true">{current.icon}</span>
      <p
        className={`text-xs text-amber-200 leading-snug truncate transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {current.message}
      </p>
    </div>
  );
}
