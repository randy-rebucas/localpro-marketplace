import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#eef5fc",
          100: "#d5e9f8",
          200: "#acd3f1",
          300: "#78b5e6",
          400: "#4594d8",
          500: "#2678c6",
          600: "#1a5fa8",
          700: "#154e8c",
          800: "#113d6e",
          900: "#0c2c50",
          950: "#071c35",
          DEFAULT: "#1a5fa8",
        },
        brand: {
          50:  "#f0faf0",
          100: "#d8f2d8",
          200: "#b0e5b0",
          300: "#7dd27d",
          400: "#52ba52",
          500: "#3ea53e",
          600: "#318b31",
          700: "#267126",
          800: "#1c571c",
          900: "#123c12",
          950: "#092509",
          DEFAULT: "#3ea53e",
        },
        surface: {
          DEFAULT: "#f8fafc",
          card: "#ffffff",
          muted: "#f1f5f9",
        },
      },
      fontFamily: {
        // Picks up the --font-inter CSS variable injected by next/font
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
