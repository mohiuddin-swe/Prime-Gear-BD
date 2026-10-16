"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { ICON_STROKE } from "@primegear/ui/icon";

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
  const time = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

  return (
    <span
      role="timer"
      aria-label="Time left in the flash sale"
      className="inline-flex h-8 min-w-32 items-center justify-center gap-1.5 rounded-btn bg-deal px-3 text-base font-bold tabular-nums text-ink-950"
    >
      <Timer size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      {left === null ? "--:--:--" : `${days > 0 ? `${days}d ` : ""}${time}`}
    </span>
  );
}
