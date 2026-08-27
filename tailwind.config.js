/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        // Height-based, not width. The login card's problem is vertical room:
        // a 14" laptop at 150% Windows scaling reports 1280x720 CSS pixels, so
        // it matches the `xl` WIDTH breakpoint while having barely 620px of
        // viewport height. Keying the generous spacing to width therefore gave
        // the tightest screens the roomiest layout, which is backwards.
        tall: { raw: '(min-height: 880px)' },
        // A genuinely large display: wide AND tall. Both are load-bearing.
        // Width alone would fire on a 1920x1080 laptop at 125% scaling, which
        // reports 1536x864 — wide enough to match, with no vertical room.
        // 1000px of height rather than 900 because the largest tier renders a
        // ~960px card, which overflows a 1080p screen's ~955px viewport; only
        // a 1440p-class display actually has room for it.
        big: { raw: '(min-width: 1536px) and (min-height: 1000px)' },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        /* INFIDEEP auth palette. Namespaced so it never shadows the
           shadcn tokens the rest of the app themes through CSS vars. */
        infideep: {
          bg: '#121414',
          'surface-lowest': '#0c0f0f',
          'surface-low': '#1a1c1c',
          surface: '#1e2020',
          'surface-high': '#282a2b',
          'surface-highest': '#333535',
          'on-surface': '#e2e2e2',
          'on-surface-variant': '#e6bcc2',
          outline: '#ad878d',
          'outline-variant': '#5d3f44',
          primary: '#ffb2be',
          'primary-container': '#ff4d7e',
          secondary: '#ffb77a',
          error: '#ffb4ab',
          'grad-start': '#ff0055',
          'grad-end': '#ff8c00',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
