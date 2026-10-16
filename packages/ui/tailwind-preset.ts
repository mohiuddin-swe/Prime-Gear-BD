import type { Config } from "tailwindcss";

/** Prime Gear BD design tokens. The only place hex values, fonts and radii are defined. */
export const colors = {
  brand: { 50: "#eef4ff", 600: "#1a56db", 800: "#0d3b8f" },
  ink: { 900: "#111827", 950: "#0b1220" },
  surface: "#f5f7fb",
  glow: "#22d3ee",
  deal: "#f59e0b",
  success: "#16a34a",
  danger: "#dc2626",
} as const;

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors,
      fontFamily: {
        heading: ["var(--font-heading)", "var(--font-bangla)", "sans-serif"],
        sans: ["var(--font-body)", "var(--font-bangla)", "sans-serif"],
        bangla: ["var(--font-bangla)", "sans-serif"],
      },
      borderRadius: { card: "16px", btn: "12px" },
      boxShadow: {
        card: "0 4px 20px rgb(13 59 143 / 0.08)",
        "card-lift": "0 8px 28px rgb(13 59 143 / 0.14)",
      },
      backgroundImage: {
        "brand-gradient": `linear-gradient(135deg, ${colors.brand[600]}, ${colors.brand[800]})`,
        // Soft blue + cyan glow for dark showcase sections (layered under content)
        "glow-blue": `radial-gradient(60% 60% at 20% 0%, rgb(26 86 219 / 0.45), transparent 70%)`,
        "glow-cyan": `radial-gradient(50% 50% at 90% 100%, rgb(34 211 238 / 0.18), transparent 70%)`,
      },
      keyframes: {
        "sheet-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "drawer-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "sheet-up": "sheet-up 240ms cubic-bezier(0.32, 0.72, 0, 1)",
        "drawer-in": "drawer-in 240ms cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
};

export default preset;
