import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef4ff", 600: "#1a56db", 800: "#0d3b8f" },
        ink: { 900: "#111827", 950: "#0b1220" },
        surface: "#f5f7fb",
        glow: "#22d3ee",
        deal: "#f59e0b",
        success: "#16a34a",
        danger: "#dc2626",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        sans: ["var(--font-body)", "var(--font-bangla)", "sans-serif"],
        bangla: ["var(--font-bangla)", "sans-serif"],
      },
      borderRadius: { card: "16px", btn: "12px" },
      boxShadow: { card: "0 4px 20px rgb(13 59 143 / 0.08)" },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1a56db, #0d3b8f)",
      },
    },
  },
};

export default preset;
