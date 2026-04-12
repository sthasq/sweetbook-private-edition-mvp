export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          low: "#f8fafc",
          high: "#f1f5f9",
          highest: "#e2e8f0",
          lowest: "#ffffff",
        },
        ink: "#0f172a",
        warm: {
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
        },
        brand: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        gold: {
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#475569",
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

