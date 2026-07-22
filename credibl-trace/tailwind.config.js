/** @type {import('tailwindcss').Config} */
// Credibl Trace — design tokens.
// Fuses Credibl Essentials (white canvas, IBM Plex Sans, pill buttons, 8–12px radii)
// with Credibl ESG Enterprise (status lifecycle tints, collaboration patterns).
// Brand blue #0A7AEB is shared by both systems and anchors this third platform.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: '#FFFFFF',
        foreground: '#030711',
        body: '#0F172A',
        canvas: '#FAFBFC',
        primary: { DEFAULT: '#0A7AEB', fg: '#FFFFFF', hover: '#0967CE', deep: '#0E5297' },
        secondary: { DEFAULT: '#7ABA26', fg: '#FFFFFF' },
        muted: { DEFAULT: '#F3F4F6', fg: '#6B7280' },
        'border-base': '#E5E7EB',
        'border-strong': '#D1D5DB',
        ring: '#0A7AEB',
        indigo: { brand: '#4338CA', soft: '#EEF2FF' },
        // AI / verification accent — purple carries every machine-generated surface
        ai: { DEFAULT: '#7C3AED', soft: '#F5F3FF', border: '#DDD6FE', deep: '#5B21B6' },
        // Earth / outside-in accent — cyan marks every physical-monitoring surface
        // (Rule 8 of the Earth Watch spec: same family, different accent)
        earth: { DEFAULT: '#2790AA', soft: '#E9F5F9', border: '#B8E2F1', deep: '#18627E' },
        soft: {
          blue: '#EFF6FF',
          green: '#F0FDF4',
          amber: '#FFFBEB',
          red: '#FEF2F2',
          lavender: '#EEF2FF',
          violet: '#F5F3FF',
        },
        amber: { border: '#FDE68A', text: '#D97706', deep: '#B45309' },
        status: {
          info: '#1E40AF',
          success: '#15803D',
          warning: '#B45309',
          error: '#B91C1C',
          neutral: '#374151',
        },
        risk: '#EF4444',
        // Verification confidence ladder — the spine of the whole product
        conf: {
          attested: '#15803D', // third-party attested
          crosschecked: '#0A7AEB', // cross-checked against an independent source
          document: '#7C3AED', // document-backed, AI-extracted
          declared: '#D97706', // self-declared only
          missing: '#DC2626', // no evidence
        },
        chart: {
          1: '#0A7AEB',
          2: '#3398DB',
          3: '#2790AA',
          4: '#73778C',
          5: '#E85530',
          6: '#7C3AED',
        },
      },
      borderRadius: { sm: '6px', DEFAULT: '8px', md: '8px', lg: '12px', xl: '16px', full: '9999px' },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0,0,0,.05)',
        sm: '0 1px 3px 0 rgba(0,0,0,.08)',
        md: '0 4px 12px -2px rgba(0,0,0,.10)',
        lg: '0 12px 32px -8px rgba(0,0,0,.16)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'none' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'none' } },
        shimmer: { '0%': { backgroundPosition: '-500px 0' }, '100%': { backgroundPosition: '500px 0' } },
        pulsedot: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
      },
      animation: {
        'fade-up': 'fade-up .22s ease-out both',
        'slide-in': 'slide-in .2s ease-out both',
        shimmer: 'shimmer 1.4s linear infinite',
        pulsedot: 'pulsedot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
