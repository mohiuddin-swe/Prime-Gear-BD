import type { ReactNode } from "react";
import { cn } from "./cn";

type Glow = "hero" | "cyan" | "smart" | "warm" | "banner";

const glowLayers: Record<Glow, string[]> = {
  // Blue top-left + cyan low-right: home hero
  hero: ["bg-glow-blue", "bg-glow-cyan-low"],
  // Cyan top-right: "why people love it" on the product page
  cyan: ["bg-glow-cyan"],
  // Slightly stronger cyan just inside the top-right corner: home smart-home block
  smart: ["bg-glow-cyan-corner"],
  // Warm lamp light on the right: featured category link on the categories screen
  warm: ["bg-glow-warm"],
  // Soft blue top-left + warm lamp low-right: category page banner
  banner: ["bg-glow-blue-soft", "bg-glow-warm-low"],
};

/**
 * Dark showcase block: ink-950 with a soft glow.
 * `card` is the rounded 20 px panel used inside the page; without it the block is full-bleed.
 */
export function SectionDark({
  children,
  className,
  contentClassName,
  glow = "hero",
  card = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  glow?: Glow;
  card?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-ink-950 text-white",
        card && "rounded-panel",
        className,
      )}
    >
      {glowLayers[glow].map((layer) => (
        <div key={layer} aria-hidden="true" className={cn("absolute inset-0 -z-10", layer)} />
      ))}
      <div
        className={cn(
          card ? "px-5 py-5.5" : "mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Small uppercase label on dark: "SMART HOME", "24 PRODUCTS".
 * `pill` = the outlined hero tag ("BESTSELLER · 360° ROTATION").
 */
export function Eyebrow({
  children,
  pill = false,
  className,
}: {
  children: ReactNode;
  pill?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-xs font-semibold uppercase text-glow-soft",
        pill
          ? "inline-block self-start rounded-full border border-glow/45 px-2.5 py-1.5 tracking-tag"
          : "block tracking-eyebrow",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Outlined cyan pill with an icon, for feature lists on dark ("Motion sensing"). */
export function GlowChip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-glow/35 px-3 text-caption text-mist-bright">
      {icon && <span className="text-glow">{icon}</span>}
      {children}
    </span>
  );
}

/** Feature tile on dark: icon, title, one line of copy ("360° rotating head"). */
export function GlowTile({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-tile border border-glow/25 p-3">
      <span className="text-glow">{icon}</span>
      <span className="text-copy font-semibold text-white">{title}</span>
      <span className="text-caption text-mist-muted">{children}</span>
    </div>
  );
}
