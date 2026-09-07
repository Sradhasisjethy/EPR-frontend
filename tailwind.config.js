/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    // Declared on the theme rather than in `extend` because ORDER matters and
    // extend can only append. Tailwind emits media queries in the order the
    // screens are declared, and equal-specificity rules are resolved by source
    // order — so an appended `tall` sat AFTER `2xl` and quietly overrode it.
    //
    // The visible symptom: a 2560x1310 display matched both, `tall` won, and a
    // 27" monitor rendered the 48px headline meant for a cramped laptop while a
    // 1707x860 one (same monitor at 150% scaling) correctly got 84px.
    //
    // `tall` first means width breakpoints override it, which is the intent:
    // height decides how much vertical rhythm the card can afford, width decides
    // how large everything looks, and where they set the same property width wins.
    screens: {
      tall: { raw: '(min-height: 880px)' },
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
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
  future: {
    // Compiles every `hover:` utility inside `@media (hover: hover)`.
    //
    // Without it, hover styles apply on devices that cannot really hover, and
    // iPadOS resolves that by spending the first tap activating the hover state
    // and only the second as a click — which is why buttons needed several
    // Pencil taps. It is Tailwind's own recommended default and will be the
    // behaviour in v4.
    hoverOnlyWhenSupported: true,
  },

  plugins: [
    // `coarse:` targets touch and Pencil without guessing from screen width —
    // an iPad in landscape is as wide as a laptop, so `lg:` would hand a tablet
    // the desktop's small hit areas.
    function coarsePointerVariant({ addVariant }) {
      addVariant('coarse', '@media (pointer: coarse)');
      addVariant('fine', '@media (pointer: fine)');
    },
  ],
};
