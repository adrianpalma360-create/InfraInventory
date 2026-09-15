/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        noc: {
          bg: '#0B0F14',
          sidebar: '#0F141B',
          card: '#151B23',
          cardSecondary: '#1A212B',
          border: '#252D38',
          text: '#F1F5F9',
          textSecondary: '#94A3B8',
          textMuted: '#64748B',
        },
        status: {
          green: '#22C55E',
          yellow: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
          cyan: '#06B6D4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
