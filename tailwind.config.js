/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // dataviz reference palette — categorical slots 1..3 + status
        series: { 1: '#2a78d6', 2: '#eb6834', 3: '#1baf7a' },
        status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
        ink: { DEFAULT: '#0b0b0b', secondary: '#52514e', muted: '#898781' },
        surface: { DEFAULT: '#fcfcfb', plane: '#f9f9f7' },
        hairline: '#e1e0d9',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
