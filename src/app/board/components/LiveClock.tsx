"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right leading-tight">
      <p className="text-base sm:text-2xl font-bold tabular-nums tracking-tight">
        {now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="hidden sm:block text-xs text-blue-300">
        {now.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}
