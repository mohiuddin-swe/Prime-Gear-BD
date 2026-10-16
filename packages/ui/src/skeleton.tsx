import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/** Pulse only when the user hasn't asked for reduced motion. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-btn bg-ink-900/10 motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-card bg-white shadow-card"
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    </div>
  );
}
