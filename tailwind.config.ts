import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paper / ink — the warm-handmade base palette. Set as full scales so
        // tailwind can use them with utilities like bg-paper-warm, text-ink-mute.
        paper: {
          DEFAULT: "#f5eedb",
          warm: "#ebe2c4",
          cool: "#faf5e6",
          deep: "#e0d4b0",
        },
        ink: {
          DEFAULT: "#1a1610",
          soft: "#3d3826",
          mute: "#807558",
          faint: "#b8ad8c",
        },
        // Accent palette
        red: {
          DEFAULT: "#e64a3a",
          soft: "#f4a89e",
        },
        lilac: {
          DEFAULT: "#b89dd4",
          soft: "#ddccef",
        },
        yellow: {
          DEFAULT: "#f5d967",
          soft: "#fae9a3",
        },
        teal: "#5fa39a",
        // Chat label colors (used for "you" vs "stranger" labels)
        stranger: "#2a5e8a",
        you: "#4a7d3a",
      },
      fontFamily: {
        // Bound to CSS variables set in app/layout.tsx via next/font/google.
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "cursive"],
      },
      boxShadow: {
        // "Hard" offset shadow — the design's signature paper-stuck-on-paper look.
        // Used on cards, postits, stickers, modal sheets.
        hard: "3px 3px 0 #1a1610",
        "hard-sm": "2px 2px 0 #1a1610",
        "hard-lg": "5px 5px 0 #1a1610",
        "hard-xs": "1.5px 1.5px 0 #1a1610",
      },
    },
  },
  plugins: [],
};

export default config;
