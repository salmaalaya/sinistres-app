/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F7F4EC',
          warm: '#FDFBF6',
          deep: '#16211B',
        },
        sidebar: '#FFFFFF',
        panel: {
          DEFAULT: '#FFFFFF',
          raised: '#F5F8F0',
          border: 'rgba(62,138,76,0.16)',
        },
        hairline: 'rgba(20,32,26,0.08)',
        brand: {
          DEFAULT: '#3E8A4C',
          deep: '#1B4D2E',
          bright: '#8DC63F',
        },
        gold: {
          DEFAULT: '#D9A441',
          deep: '#B27F2E',
        },
        teal: '#2E8A8F',
        text: {
          primary: '#16211B',
          muted: '#5C6B60',
          faint: '#8C9990',
        },
        success: '#2E8A8F',
        danger: '#C85A42',
        status: {
          'ouvert-bg': 'rgba(62,138,76,0.10)',
          'ouvert-text': '#3E8A4C',
          'cloture-bg': 'rgba(46,138,143,0.10)',
          'critique-bg': 'rgba(200,90,66,0.10)',
        },
      },
      fontFamily: {
        serif: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        control: '9px',
      },
      maxWidth: {
        content: '1380px',
      },
      spacing: {
        sidebar: '252px',
      },
    },
  },
  plugins: [],
};
