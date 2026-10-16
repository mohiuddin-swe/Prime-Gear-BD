import preset from "@primegear/ui/tailwind-preset";
import type { Config } from "tailwindcss";

export default {
  presets: [preset as Config],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
} satisfies Config;
