/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // UniMAP palette, read from the university mark:
        // navy crest + wordmark, golden dots, silver ring, grey type.
        navy: {
          DEFAULT: '#1A2A6C',
          50: '#EEF1FA', 100: '#D6DDF3', 200: '#AEBBE6',
          300: '#7F92D6', 400: '#4A7FE0', 500: '#2E5BBF',
          600: '#23459A', 700: '#1A2A6C', 800: '#131F50', 900: '#0C1435',
        },
        gold: {
          DEFAULT: '#FFC627',
          50: '#FFF8E5', 100: '#FFEFBF', 200: '#FFE180',
          300: '#FFD44D', 400: '#FFC627', 500: '#E8A400',
          600: '#B88200', 700: '#8A6100',
        },
        silver: { DEFAULT: '#C9CBCE', light: '#E7E8EA', dark: '#9A9DA1' },
        slate: { DEFAULT: '#6D6E71' },
        status: {
          good: '#0ca30c', warning: '#fab219',
          serious: '#ec835a', critical: '#d03b3b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem' },
      boxShadow: {
        card: '0 1px 2px rgba(12,20,53,0.04), 0 4px 12px rgba(12,20,53,0.06)',
        lift: '0 2px 4px rgba(12,20,53,0.06), 0 12px 28px rgba(12,20,53,0.10)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { 'fade-up': 'fade-up .35s cubic-bezier(.16,1,.3,1) both' },
    },
  },
  plugins: [],
}
