/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "./public/**/*.html",
    "./sidepanel.html",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cm: {
          bg: "#0b1020",
          card: "#121a2d",
          card2: "#18233a",
          surface: "#1b2544",
          line: "#27344f",
          text: "#edf2ff",
          muted: "#9ba9c5",
          accent: "#8b9dff",
          accent2: "#6678f5",
          accent3: "#7c8cff",
          green: "#64d9ad",
          red: "#ff6b6b",
          orange: "#ffb347",
          yellow: "#ffd93d",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        cm: "14px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(102, 120, 245, 0)" },
          "50%": { boxShadow: "0 0 12px 2px rgba(102, 120, 245, 0.3)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
