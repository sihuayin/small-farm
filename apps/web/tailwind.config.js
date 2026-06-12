/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        farm: {
          50: '#FAF7F2',
          100: '#F0EDE3',
          200: '#D6CBB8',
          300: '#B8A88E',
          400: '#9A8B6E',
          500: '#7C6D50',
          600: '#5E503A',
          700: '#403424',
          800: '#2A2014',
          900: '#1A110A',
          green: '#3A7D44',
          'green-light': '#E8F5E9',
          'green-dark': '#2D5E35',
          pumpkin: '#F4A261',
          'pumpkin-light': '#FFF3E0',
          tomato: '#E76F51',
          'tomato-light': '#FFEBEE',
        }
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0,0,0,0.04)',
        'soft-lg': '0 4px 16px rgba(0,0,0,0.06)',
        'soft-xl': '0 8px 32px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'farm': '12px',
      }
    },
  },
  plugins: [],
}