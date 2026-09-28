/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        base: {
          900: '#080C14',
          800: '#0B0F1A',
          700: '#0F1520',
          600: '#111827',
        },
        surface: {
          1: '#111827',
          2: '#1A2235',
          3: '#1F2D45',
          4: '#243350',
        },
        border: {
          subtle: '#1E2D42',
          DEFAULT: '#2A3A52',
          strong: '#3A4F6A',
        },
        // Text
        text: {
          primary: '#E8EDF5',
          secondary: '#8FA3BF',
          tertiary: '#5A7090',
          inverse: '#0B0F1A',
        },
        // Accent
        accent: {
          DEFAULT: '#1D6FA4',
          hover: '#2580BA',
          muted: '#1A3A5C',
        },
        // Status
        status: {
          completed: '#22C55E',
          'completed-bg': '#052E16',
          'completed-border': '#166534',
          active: '#3B82F6',
          'active-bg': '#0C1A3A',
          'active-border': '#1D4ED8',
          warning: '#F59E0B',
          'warning-bg': '#2D1A00',
          'warning-border': '#92400E',
          critical: '#EF4444',
          'critical-bg': '#2D0A0A',
          'critical-border': '#991B1B',
          pending: '#4B5563',
          'pending-bg': '#111827',
          'pending-border': '#374151',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.5' }],
        md: ['15px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.4' }],
        xl: ['18px', { lineHeight: '1.4' }],
        '2xl': ['20px', { lineHeight: '1.3' }],
        '3xl': ['24px', { lineHeight: '1.2' }],
        '4xl': ['30px', { lineHeight: '1.1' }],
      },
      spacing: {
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.4)',
        DEFAULT: '0 2px 6px rgba(0,0,0,0.45)',
        md: '0 4px 12px rgba(0,0,0,0.5)',
        lg: '0 8px 24px rgba(0,0,0,0.6)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      transitionDuration: {
        fast: '120ms',
        DEFAULT: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-out',
      },
    },
  },
  plugins: [],
};
