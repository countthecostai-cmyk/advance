import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Redline" — crimson-on-charcoal. Low steps are dark, desaturated
        // washes (tinted panels, selected-state backgrounds); 500 is the
        // one live accent used for borders/fills/glow; high steps are the
        // light tones used for text that sits on top of a dark wash.
        brand: {
          50: '#2a0a0d',
          100: '#3d0f14',
          200: '#591520',
          300: '#7c1b28',
          400: '#a82430',
          500: '#ff2e3e',
          600: '#ff4d58',
          700: '#ffb3b8',
          800: '#ffd9db',
          900: '#fff1f1',
        },
        accent: {
          400: '#22d1c4',
          500: '#0dbfae',
          600: '#0a9c8e',
        },
        // Inverted scale for the dark ground: 50 is the darkest (page
        // background), 900 is the lightest (primary text). Every existing
        // bg-ink-*/text-ink-*/border-ink-* class keeps working, it just
        // now reads as a dark UI instead of a light one.
        ink: {
          50: '#0a0b0d',
          100: '#141618',
          200: '#1f2225',
          300: '#2c3034',
          400: '#71757b',
          500: '#8d9196',
          600: '#aaadb2',
          700: '#c7cacd',
          800: '#e3e5e6',
          900: '#f5f6f7',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Oswald', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      borderRadius: {
        xl2: '0px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.5), 0 1px 10px 0 rgb(0 0 0 / 0.35)',
        elevated: '0 10px 28px -10px rgb(255 46 62 / 0.3), 0 2px 10px -2px rgb(0 0 0 / 0.6)',
        glow: '0 0 0 1.5px rgb(255 46 62 / 0.9), 0 0 22px -4px rgb(255 46 62 / 0.55)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7c1b28 0%, #ff2e3e 55%, #ff6a52 130%)',
        'auth-glow':
          'radial-gradient(80% 60% at 50% 0%, rgb(255 46 62 / 0.14) 0%, rgb(255 46 62 / 0) 60%)',
      },
    },
  },
  plugins: [],
}

export default config
