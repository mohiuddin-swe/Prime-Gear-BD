import { Truck } from "lucide-react";
import { formatTaka } from "@primegear/shared/format";
import { ICON_STROKE } from "@primegear/ui/icon";

export function FreeDeliveryBar({
  threshold,
  remaining,
  qualifies,
}: {
  threshold: number | null;
  remaining: number;
  qualifies: boolean;
}) {
  if (threshold === null) return null;
  const percent = qualifies
    ? 100
    : Math.min(100, Math.round(((threshold - remaining) / threshold) * 100));
  return (
    <div className="space-y-2 rounded-card bg-brand-50 p-3">
      <p className="flex items-center gap-2 text-base font-semibold">
        <Truck
          size={20}
          strokeWidth={ICON_STROKE}
          className="shrink-0 text-brand-600"
          aria-hidden="true"
        />
        {qualifies ? (
          "You've unlocked free delivery"
        ) : (
          <span>
            Add <span className="tabular-nums">{formatTaka(remaining)}</span> more for free delivery
          </span>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-white"
      >
        <div
          className="h-full rounded-full bg-brand-gradient motion-safe:transition-[width] motion-safe:duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
