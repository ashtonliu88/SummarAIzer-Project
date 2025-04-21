import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        nunito: ["Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#2563eb', // blue-600
          fg: '#fff'
        },
        secondary: {
          DEFAULT: '#f1f5f9', // slate-100
        },
        card: {
          DEFAULT: '#f6f8fc',
        },
        accent: { DEFAULT: '#e0e7ef' },
      },
      borderRadius: {
        lg: '1rem',
        md: '0.75rem',
        sm: '0.5rem'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: "translateY(20px)" },
          to: { opacity: '1', transform: "translateY(0)" }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out'
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
