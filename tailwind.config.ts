import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface-dim": "#0c1324",
        "secondary-fixed": "#d3e4fe",
        "surface-bright": "#33394c",
        "on-background": "#dce1fb",
        "tertiary-fixed": "#ffdbcc",
        "surface-container-lowest": "#070d1f",
        "on-tertiary-fixed": "#351000",
        "tertiary-container": "#a44100",
        "surface-container-highest": "#2e3447",
        "error-container": "#93000a",
        "inverse-surface": "#dce1fb",
        "on-secondary-fixed-variant": "#38485d",
        "surface": "#0c1324",
        "primary": "#c3c0ff",
        "on-error-container": "#ffdad6",
        "on-surface-variant": "#c7c4d8",
        "secondary-fixed-dim": "#b7c8e1",
        "secondary-container": "#3a4a5f",
        "outline-variant": "#464555",
        "surface-tint": "#c3c0ff",
        "primary-container": "#4f46e5",
        "on-primary-fixed": "#0f0069",
        "surface-container-low": "#151b2d",
        "inverse-on-surface": "#2a3043",
        "on-error": "#690005",
        "primary-fixed": "#e2dfff",
        "primary-fixed-dim": "#c3c0ff",
        "on-tertiary-fixed-variant": "#7b2f00",
        "on-primary-container": "#dad7ff",
        "inverse-primary": "#4d44e3",
        "on-primary": "#1d00a5",
        "error": "#ffb4ab",
        "tertiary-fixed-dim": "#ffb695",
        "tertiary": "#ffb695",
        "surface-container-high": "#23293c",
        "on-tertiary-container": "#ffd2be",
        "on-secondary-container": "#a9bad3",
        "on-tertiary": "#571f00",
        "secondary": "#b7c8e1",
        "on-primary-fixed-variant": "#3323cc",
        "on-secondary-fixed": "#0b1c30",
        "background": "var(--background)",
        "foreground": "var(--foreground)",
        "on-surface": "#dce1fb",
        "on-secondary": "#213145",
        "surface-container": "#191f31",
        "surface-variant": "#2e3447",
        "outline": "#918fa1"
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px"
      },
      fontFamily: {
        headline: ["Canela", "var(--font-noto-serif)", "Noto Serif", "serif"],
        body: ["Canela", "var(--font-inter)", "Inter", "sans-serif"],
        label: ["Canela", "var(--font-inter)", "Inter", "sans-serif"]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
};
export default config;
