import type { Config } from "tailwindcss";

/**
 * Prime Gear BD design tokens. The only place hex values, fonts, radii and shadows are defined.
 * Extracted from the approved 390 px mockups (design/mockups); every value below is used there.
 */
export const colors = {
  brand: {
    50: "#eef4ff", // selected, info
    100: "#d4def5", // progress track on brand-50
    400: "#60a5fa", // "BD" in the wordmark on dark only
    600: "#1a56db", // actions, links
    800: "#0d3b8f", // gradient end, hover, text on brand-50
  },
  ink: {
    400: "#6b7385", // struck-through compare price, remove icon (AA on white)
    500: "#5b6475", // muted text, placeholders, inactive nav (AA on white and surface-sunken)
    700: "#374151", // secondary text, unselected option labels
    900: "#111827", // body text on light
    950: "#0b1220", // dark showcase sections, footer
  },
  surface: {
    DEFAULT: "#f5f7fb", // page background
    sunken: "#eef1f6", // product image backdrop, search field, hairline dividers inside cards
  },
  line: {
    DEFAULT: "#e6eaf2", // header / nav / bar hairlines
    track: "#e2e7f0", // unselected light-mode swatch ring, load-more progress track
    strong: "#d6dce8", // input, stepper and unselected option borders
    swatch: "#b8c1d1", // ring around a body-colour swatch dot
    stronger: "#b3bccb", // unselected radio ring
  },
  mist: {
    pale: "#e6edf7", // caption on translucent chips over dark photos
    bright: "#d6e6f5", // GlowChip labels on ink-950
    DEFAULT: "#c3cde0", // body text on ink-950
    muted: "#b9c6da", // secondary copy in dark tiles and banners
    dim: "#8f9bb2", // struck-through price on ink-950
  },
  glow: {
    DEFAULT: "#22d3ee", // small highlights on dark only, never body text
    soft: "#67e8f9", // eyebrow labels on dark
  },
  warm: "#ffd27a", // lamp light in category banners and product art
  deal: {
    DEFAULT: "#f59e0b", // flash sale, % off badges, timers only
    soft: "#fef3c7", // "Save ৳X" badge background
    cream: "#fffbeb", // order-bump background
    ink: "#92400e", // text on deal-soft / deal-cream
    deep: "#b45309", // icon on deal-soft
  },
  success: { DEFAULT: "#16a34a", ink: "#15803d" }, // ink = text (AA on white)
  danger: "#dc2626",
  // Payment brand chips (checkout)
  pay: { bkash: "#c2185b", nagad: "#c2410c", rocket: "#7e22ce" },
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
      // Sizes the mockups use that Tailwind's scale lacks: 10, 11, 13, 15, 17, 22 px.
      // (12 = xs, 14 = sm, 16 = base, 18 = lg, 20 = xl, 24 = 2xl, 30 = 3xl, 36 = 4xl)
      fontSize: {
        "3xs": ["10px", { lineHeight: "1" }], // bottom-nav count bubble
        "2xs": ["11px", { lineHeight: "1.3" }],
        caption: ["13px", { lineHeight: "1.4" }],
        copy: ["15px", { lineHeight: "1.35" }],
        lead: ["17px", { lineHeight: "1.3" }],
        title: ["22px", { lineHeight: "1.25" }],
      },
      letterSpacing: {
        heading: "-0.01em",
        display: "-0.02em",
        tag: "0.08em",
        eyebrow: "0.1em",
        tagline: "0.18em", // GEAR UP · LEVEL UP
      },
      // Line heights the mockups set explicitly (Tailwind's named ones don't match)
      lineHeight: {
        hero: "1.12", // hero h1
        display: "1.15", // dark-section h2, banner titles
        label: "1.3", // trust-strip labels, mini card names
        card: "1.35", // product card names
        copy: "1.4", // dark tile copy, checkout notes
        body: "1.45", // reviews, light-mode description
      },
      borderRadius: {
        tag: "7px", // flash-tile discount badge, "Save ৳X" badge
        control: "10px", // stepper, small buttons, view toggle
        btn: "12px", // buttons, inputs, header icon buttons
        tile: "14px", // selectable cards, category icon tiles, dark feature tiles
        card: "16px", // product cards, cart lines, small panels
        feature: "18px", // featured-category link on the categories screen
        panel: "20px", // hero, dark sections, white section panels
        sheet: "24px", // top corners of bottom sheets
      },
      boxShadow: {
        card: "0 4px 20px rgb(13 59 143 / 0.08)",
        "card-soft": "0 4px 20px rgb(13 59 143 / 0.06)", // secondary info cards, category tiles
        "card-lift": "0 8px 28px rgb(13 59 143 / 0.14)",
        selected: "0 6px 18px rgb(26 86 219 / 0.18)", // selected bulk tier
        cta: "0 8px 20px rgb(26 86 219 / 0.35)", // primary buttons
        "cta-hero": "0 8px 24px rgb(26 86 219 / 0.45)", // primary button on dark hero
        bar: "0 -8px 24px rgb(13 59 143 / 0.08)", // sticky action bar
        sheet: "0 -12px 40px rgb(11 18 32 / 0.3)", // bottom sheet / cart
        hairline: `0 1px 0 ${colors.line.DEFAULT}`, // header bottom edge
        // Cyan halo for hero product shots on dark sections
        glow: "0 0 80px rgb(34 211 238 / 0.28)",
        "glow-sm": "0 0 16px currentColor", // selected light-mode swatch
      },
      backgroundImage: {
        "brand-gradient": `linear-gradient(135deg, ${colors.brand[600]}, ${colors.brand[800]})`,
        // Glows for dark showcase sections, layered over ink-950 (see SectionDark `glow`)
        "glow-blue": "radial-gradient(circle at 0% 0%, rgb(26 86 219 / 0.5), transparent 55%)",
        "glow-blue-soft": "radial-gradient(circle at 0% 0%, rgb(26 86 219 / 0.45), transparent 55%)",
        "glow-cyan": "radial-gradient(circle at 100% 0%, rgb(34 211 238 / 0.2), transparent 45%)",
        "glow-cyan-corner": "radial-gradient(circle at 95% 0%, rgb(34 211 238 / 0.22), transparent 45%)",
        "glow-cyan-low": "radial-gradient(circle at 80% 70%, rgb(34 211 238 / 0.22), transparent 40%)",
        "glow-warm": "radial-gradient(circle at 100% 50%, rgb(255 210 122 / 0.35), transparent 45%)",
        "glow-warm-low": "radial-gradient(circle at 85% 60%, rgb(255 210 122 / 0.4), transparent 38%)",
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
