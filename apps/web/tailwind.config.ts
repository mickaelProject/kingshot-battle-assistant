import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-rajdhani)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        war: {
          bg: "#0a0c10",
          sidebar: "#0d0f14",
          surface: "#111318",
          surface2: "#13151c",
          panel: "#111318",
          border: "#1e2230",
          border2: "#2a3042",
          muted: "#4b5563",
          amber: "#f59e0b",
          text: "#cbd5e1",
          subtext: "#64748b",
          dim: "#374151",
          danger: "#ef4444",
          ok: "#22c55e",
        },
      },
      boxShadow: {
        "amber-glow": "0 0 28px rgba(245, 158, 11, 0.22)",
        "amber-glow-sm": "0 0 14px rgba(245, 158, 11, 0.18)",
      },
      keyframes: {
        "sitrep-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 158, 11, 0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(245, 158, 11, 0)" },
        },
        "live-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "pulse-border": {
          "0%, 100%": { borderColor: "rgba(127, 29, 29, 0.35)" },
          "50%": { borderColor: "rgba(239, 68, 68, 0.55)" },
        },
        "mission-card": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(245, 158, 11, 0.35), 0 12px 40px rgba(0, 0, 0, 0.45)",
          },
          "50%": {
            boxShadow:
              "0 0 0 1px rgba(245, 158, 11, 0.55), 0 16px 48px rgba(245, 158, 11, 0.12)",
          },
        },
      },
      animation: {
        "sitrep-pulse": "sitrep-pulse 2s ease-in-out infinite",
        "live-pulse": "live-pulse 1.4s ease-in-out infinite",
        "pulse-border": "pulse-border 2s ease-in-out infinite",
        "mission-card": "mission-card 2.8s ease-in-out infinite",
        scan: "scan 6s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
