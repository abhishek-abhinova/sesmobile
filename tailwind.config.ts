import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem', xl: '2.5rem' },
      screens: { '2xl': '1440px' },
    },
    extend: {
      screens: {
        xs: '375px',
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
        /* ---- S.E.S Mobile World brand system ---- */
        brand: {
          navy: {
            50: '#f2f6fc',
            100: '#e2eaf7',
            200: '#c2d4ee',
            300: '#8fb4e1',
            400: '#548cd0',
            500: '#3069bd',
            600: '#23509f',
            700: '#1c3f80',
            800: '#132c5c',
            900: '#0b1a3a',
            950: '#060f24',
          },
          blue: {
            50: '#eff8ff',
            100: '#dbeefe',
            200: '#bfe3fe',
            300: '#90d3fd',
            400: '#5bb8fb',
            500: '#3899f6',
            600: '#1f7ae9',
            700: '#1863d2',
            800: '#1a53ac',
            900: '#1b488b',
            950: '#152d57',
          },
          orange: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
          },
          gold: {
            200: '#f5e2a8',
            300: '#eccd66',
            400: '#e3b64a',
            500: '#d4a017',
            600: '#b8860b',
          },
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        xl: 'calc(var(--radius) + 6px)',
        '2xl': 'calc(var(--radius) + 14px)',
        '3xl': 'calc(var(--radius) + 22px)',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(6 15 36 / 0.04), 0 4px 16px -2px rgb(6 15 36 / 0.08)',
        card: '0 2px 4px -1px rgb(6 15 36 / 0.06), 0 12px 32px -8px rgb(6 15 36 / 0.12)',
        lift: '0 8px 16px -4px rgb(6 15 36 / 0.10), 0 28px 56px -16px rgb(6 15 36 / 0.20)',
        glow: '0 0 0 1px rgb(31 122 233 / 0.20), 0 12px 40px -8px rgb(31 122 233 / 0.35)',
        'glow-orange': '0 0 0 1px rgb(249 115 22 / 0.22), 0 12px 40px -8px rgb(249 115 22 / 0.40)',
        'inner-top': 'inset 0 1px 0 0 rgb(255 255 255 / 0.10)',
      },
      backgroundImage: {
        'grid-slate': 'linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px)',
        'brand-gradient': 'linear-gradient(120deg, #0b1a3a 0%, #132c5c 45%, #1f7ae9 100%)',
        'accent-gradient': 'linear-gradient(120deg, #f97316 0%, #fb923c 50%, #e3b64a 100%)',
        'surface-gradient': 'linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%)',
        'glass-dark': 'linear-gradient(140deg, rgb(255 255 255 / 0.10) 0%, rgb(255 255 255 / 0.03) 100%)',
        noise:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        'grid-slate': '48px 48px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-up-sheet': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -14px, 0)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          '50%': { transform: 'translate3d(0, -22px, 0) rotate(2.5deg)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.5)', opacity: '0' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.9)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'marquee-vertical': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(-50%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-up-sheet': 'slide-up-sheet 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        marquee: 'marquee 32s linear infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.24, 0, 0.38, 1) infinite',
        'count-up': 'count-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      maxWidth: {
        prose: '68ch',
      },
      typography: ({ theme }: { theme: (path: string) => string }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': 'hsl(var(--foreground))',
            '--tw-prose-headings': 'hsl(var(--foreground))',
            '--tw-prose-links': 'hsl(var(--primary))',
            '--tw-prose-bold': 'hsl(var(--foreground))',
            maxWidth: theme('maxWidth.prose'),
            lineHeight: '1.75',
            p: { marginTop: '1rem', marginBottom: '1rem' },
            h2: { marginTop: '2.5rem', marginBottom: '1rem', fontFamily: theme('fontFamily.display') },
            h3: { marginTop: '2rem', marginBottom: '0.75rem' },
          },
        },
      }),
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};

export default config;
