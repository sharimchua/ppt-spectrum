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
        ppt: {
          do: '#E13610',
          re: '#F98016',
          mi: '#F5D432',
          fa: '#43A440',
          fi: '#141414',
          so: '#0032A4',
          la: '#5300A4',
          ti: '#F158A4',
        },
        prime: {
          2: '#6b7280',
          3: '#3b82f6',
          5: '#22c55e',
          7: '#f59e0b',
          11: '#a855f7',
          higher: '#ec4899',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
