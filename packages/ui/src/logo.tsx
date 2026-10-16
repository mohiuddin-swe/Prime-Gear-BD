import { cn } from "./cn";

export type LogoProps = {
  /** mobile = 28 px tall (the minimum), desktop = 36 px */
  size?: "mobile" | "desktop";
  /** `dark` for ink-950 backgrounds (footer, showcase sections) */
  tone?: "light" | "dark";
  className?: string;
};

/**
 * Lightning-bolt icon in a dark rounded square + PRIME GEAR BD wordmark, all SVG.
 * TODO: swap the bolt path for the supplied brand SVG; the wrapper and sizing stay the same.
 */
export function Logo({ size = "mobile", tone = "light", className }: LogoProps) {
  return (
    <svg
      role="img"
      aria-label="Prime Gear BD"
      viewBox="0 0 200 40"
      className={cn(size === "mobile" ? "h-7" : "h-9", "w-auto shrink-0", className)}
    >
      <rect
        width="40"
        height="40"
        rx="10"
        className={cn("fill-ink-950", tone === "dark" && "stroke-white/20")}
        strokeWidth={tone === "dark" ? 1 : 0}
      />
      <path d="M23 6 11 22.5h8L17 34l12-17h-8z" className="fill-glow" />
      <text
        x="50"
        y="27"
        textLength="148"
        lengthAdjust="spacingAndGlyphs"
        className={cn(
          "font-heading text-[20px] font-extrabold",
          tone === "dark" ? "fill-white" : "fill-ink-950",
        )}
      >
        PRIME GEAR BD
      </text>
    </svg>
  );
}
