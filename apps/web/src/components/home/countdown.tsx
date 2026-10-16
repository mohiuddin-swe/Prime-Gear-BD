"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Amber timer pill. Renders a fixed-width placeholder until mounted so there is no layout shift. */
export function Countdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end]);

  if (left === 0) return null;
  const s = Math.floor((left ?? 0) / 1000);
  const days = Math.floor(s / 86400);
  const time = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(pad)
    .join(" : ");

  return (
    <span
      role="timer"
      aria-label="Time left in the flash sale"
      className="inline-flex h-8 min-w-28 items-center justify-center gap-1.5 rounded-lg bg-deal px-2.5 text-sm font-bold tabular-nums text-ink-950"
    >
      <Clock size={16} strokeWidth={2} aria-hidden="true" />
      {left === null ? "-- : -- : --" : `${days > 0 ? `${days}d ` : ""}${time}`}
    </span>
  );
}
