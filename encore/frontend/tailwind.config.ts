import type { Config } from 'tailwindcss';

/**
 * Tailwind config IS the design-token system (per
 * encore-v1.5/architecture/frontend-architecture.md). Every semantic
 * token in styles/globals.css is surfaced here as a utility color so no
 * component ever references a raw hex value.
 */
const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: withAlpha('--color-primary'),
          foreground: withAlpha('--color-primary-foreground'),
        },
        secondary: {
          DEFAULT: withAlpha('--color-secondary'),
          foreground: withAlpha('--color-secondary-foreground'),
        },
        background: withAlpha('--color-background'),
        foreground: withAlpha('--color-foreground'),
        surface: {
          DEFAULT: withAlpha('--color-surface'),
          foreground: withAlpha('--color-surface-foreground'),
        },
        border: withAlpha('--color-border'),
        muted: withAlpha('--color-muted'),
        success: withAlpha('--color-success'),
        warning: withAlpha('--color-warning'),
        error: withAlpha('--color-error'),
        info: withAlpha('--color-info'),
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        display: ['36px', { lineHeight: '44px', fontWeight: '700' }],
        h1: ['28px', { lineHeight: '36px', fontWeight: '600' }],
        h2: ['24px', { lineHeight: '32px', fontWeight: '600' }],
        h3: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h4: ['16px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '24px' }],
        label: ['13px', { lineHeight: '16px', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '16px' }],
        data: ['15px', { lineHeight: '20px' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};

export default config;
