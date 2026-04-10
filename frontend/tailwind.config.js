export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#fbf9f4",
          low: "#f5f3ee",
          high: "#eae8e3",
          highest: "#e4e2dd",
          lowest: "#ffffff",
        },
        ink: "#1b1c19",
        warm: {
          400: "#7f747c",
          500: "#635d5a",
          600: "#4d444b",
        },
        brand: {
          50: "#f7f2f7",
          100: "#efe6ef",
          200: "#dccddb",
          300: "#c2aac2",
          400: "#9b759a",
          500: "#7b597b",
          600: "#5d3a5d",
          700: "#442445",
          800: "#341734",
          900: "#260f26",
        },
        gold: {
          300: "#d5af66",
          400: "#c5a059",
          500: "#8e6a2c",
        },
        success: {
          50: "#eef4ef",
          200: "#c7d8c8",
          600: "#516a54",
        },
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Noto Serif", "ui-serif", "Georgia", "serif"],
        headline: ["Noto Serif", "ui-serif", "Georgia", "serif"],
        body: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        label: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "Cascadia Code", "monospace"],
      },
      boxShadow: {
        editorial: "0 24px 60px -28px rgba(27, 28, 25, 0.14)",
        ambient: "0 18px 40px -24px rgba(27, 28, 25, 0.18)",
      },
      backgroundImage: {
        archival: "linear-gradient(135deg, #442445 0%, #5d3a5d 100%)",
      },
    },
  },
  plugins: [],
}
