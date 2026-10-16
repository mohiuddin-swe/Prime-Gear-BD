import { useId } from "react";
import { colors } from "../tailwind-preset";
import { cn } from "./cn";

export type LogoProps = {
  /** mobile = 32 px tall (min 28), desktop = 36 px */
  size?: "mobile" | "desktop";
  /** `dark` for ink-950 backgrounds (footer, showcase sections) */
  tone?: "light" | "dark";
  /** false = wordmark only, 20 px tall (footer) */
  mark?: boolean;
  className?: string;
};

/**
 * Lightning-bolt icon in a dark rounded square + PRIME GEAR BD wordmark, all SVG.
 * TODO: swap the bolt path for the supplied brand SVG; the wrapper and sizing stay the same.
 */
export function Logo({ size = "mobile", tone = "light", mark = true, className }: LogoProps) {
  // Unique per instance: the header renders two logos and one sits in a display:none parent
  const gradientId = `bolt-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (!mark) {
    // Same text geometry as below, cropped to the wordmark: 1 viewBox unit = 1 px at h-5
    return (
      <svg
        role="img"
        aria-label="Prime Gear BD"
        viewBox="0 6 120 20"
        className={cn("h-5 w-auto shrink-0", className)}
      >
        <Wordmark x={0} tone={tone} />
      </svg>
    );
  }
  return (
    <svg
      role="img"
      aria-label="Prime Gear BD"
      viewBox="0 0 160 32"
      className={cn(size === "mobile" ? "h-8" : "h-9", "w-auto shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={colors.glow.DEFAULT} />
          <stop offset="1" stopColor={colors.brand[600]} />
        </linearGradient>
      </defs>
      <rect
        width="32"
        height="32"
        rx="8"
        className={cn("fill-ink-950", tone === "dark" && "stroke-white/20")}
        strokeWidth={tone === "dark" ? 1 : 0}
      />
      <path
        d="M5 9h4M5 23h4M23 9h4M23 23h4"
        className="stroke-glow"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path d="M18 4 8 18h7l-2 10 10-14h-7z" fill={`url(#${gradientId})`} />
      <Wordmark x={40} tone={tone} />
    </svg>
  );
}

function Wordmark({ x, tone }: { x: number; tone: "light" | "dark" }) {
  return (
    <text
      x={x}
      y="21.5"
      textLength="120"
      lengthAdjust="spacingAndGlyphs"
      className={cn(
        "font-heading text-base font-extrabold",
        tone === "dark" ? "fill-white" : "fill-ink-950",
      )}
    >
      PRIME GEAR <tspan className={tone === "dark" ? "fill-brand-400" : "fill-brand-600"}>BD</tspan>
    </text>
  );
}
