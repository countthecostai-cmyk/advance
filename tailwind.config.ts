import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce7ff',
          200: '#b8ceff',
          300: '#8babff',
          400: '#5f83ff',
          500: '#3d60f5',
          600: '#2c46d9',
          700: '#2537ad',
          800: '#233189',
          900: '#212d6d',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e1',
          300: '#aab1c1',
          400: '#7b849a',
          500: '#5a6479',
          600: '#434b5e',
          700: '#333a4b',
          800: '#222733',
          900: '#14171f',
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
        card: '0 1px 2px 0 rgb(20 23 31 / 0.04), 0 1px 8px 0 rgb(20 23 31 / 0.06)',
      },
    },
  },
  plugins: [],
}

export default config
