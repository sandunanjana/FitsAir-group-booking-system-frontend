import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        text: "hsl(var(--text))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(2, 6, 23, .08)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
