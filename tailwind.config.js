/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dota: {
          bg: '#0f141c',
          card: '#161f2c',
          border: '#27364b',
          accent: '#e63946',
          gold: '#f4a261',
          radiant: '#598307',
          dire: '#a8383b',
          mana: '#2b7fff',
          health: '#22c55e',
        }
      },
      fontFamily: {
        dota: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(244, 162, 97, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(244, 162, 97, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
