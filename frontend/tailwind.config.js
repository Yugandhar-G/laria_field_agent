/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "pulse-overlay": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "ping-ring": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "75%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "warning-flash": {
          "0%, 100%": { borderColor: "rgb(239 68 68)" },
          "50%": { borderColor: "rgb(239 68 68 / 0.3)" },
        },
        "scan-line": {
          "0%": { top: "0%" },
          "50%": { top: "100%" },
          "100%": { top: "0%" },
        },
        "arrow-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "pulse-overlay": "pulse-overlay 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "ping-ring": "ping-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "fade-in-scale": "fade-in-scale 0.3s ease-out forwards",
        "warning-flash": "warning-flash 0.8s ease-in-out infinite",
        "scan-line": "scan-line 2s ease-in-out infinite",
        "arrow-bounce": "arrow-bounce 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
