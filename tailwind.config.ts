import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f0ff',
          100: '#e4e1ff',
          200: '#c9c3ff',
          300: '#a89dff',
          400: '#8b7bfb',
          500: '#6c4ef5',
          600: '#5735dc',
          700: '#4527b3',
          800: '#38228c',
          900: '#2b1c66',
        },
        accent: {
          400: '#22d1c4',
          500: '#0dbfae',
          600: '#0a9c8e',
        },
        ink: {
          50: '#f7f7fa',
          100: '#edeef3',
          200: '#d8dae4',
          300: '#adb1c4',
          400: '#7d829a',
          500: '#5c6180',
          600: '#454a63',
          700: '#33374a',
          800: '#20222f',
          900: '#121319',
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(18 19 25 / 0.04), 0 1px 8px 0 rgb(18 19 25 / 0.06)',
        elevated: '0 8px 24px -8px rgb(43 28 102 / 0.25), 0 2px 8px -2px rgb(43 28 102 / 0.12)',
        glow: '0 0 0 1px rgb(108 78 245 / 0.08), 0 12px 32px -12px rgb(108 78 245 / 0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6c4ef5 0%, #8b7bfb 55%, #0dbfae 130%)',
        'auth-glow':
          'radial-gradient(80% 60% at 50% 0%, rgb(108 78 245 / 0.12) 0%, rgb(108 78 245 / 0) 60%)',
      },
    },
  },
  plugins: [],
}

export default config
