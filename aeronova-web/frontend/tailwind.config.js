/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Direct tokens for the trustbank palette
        ground: "var(--ground)",
        surface: "var(--surface)",
        sunken: "var(--sunken)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-mute": "var(--ink-mute)",
        "ink-faint": "var(--ink-faint)",
        rule: "var(--rule)",
        "rule-2": "var(--rule-2)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-2": "var(--accent-2)",
        good: "var(--good)",
        "good-soft": "var(--good-soft)",
        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",
        crit: "var(--crit)",
        "crit-soft": "var(--crit-soft)",
        // Bridge — old components use these; map to light-palette equivalents
        mint:  "var(--good)",
        amber: "var(--warn)",
        coral: "var(--crit)",
        pink:  "var(--accent)",
        cyan:  "var(--ink-2)",
        "border-hi": "var(--rule-2)",
        // shadcn bridge (kept so residual card/button primitives still work)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      fontFamily: {
        display: ['"Fraunces"', '"Times New Roman"', "Georgia", "serif"],
        sans:    ['"Geist"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono:    ['"Geist Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
