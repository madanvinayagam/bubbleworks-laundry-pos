import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f6f7f9",
        surface: "#ffffff",
        ink: "#16211f",
        muted: "#66736f",
        line: "#dfe5e2",
        brand: "#087f8c",
        accent: "#f2b84b",
        success: "#2f8f5b",
        danger: "#c2413b",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
