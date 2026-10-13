/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          900: '#070A0E',
          800: '#0A0D12',
          700: '#0D1117',
          600: '#111620',
        },
        surface: {
          1: '#111620',
          2: '#181E2A',
          3: '#1D2535',
          4: '#222C3E',
        },
        border: {
          subtle: '#1C2535',
          DEFAULT: '#263040',
          strong: '#344560',
        },
        text: {
          primary: '#DDE4EE',
          secondary: '#8A9BB5',
          tertiary: '#526070',
          inverse: '#0A0D12',
        },
        // Army olive accent — matches #414D0B / #727A17 gradient midpoint
        accent: {
          DEFAULT: '#5A6B10',
          hover: '#727A17',
          muted: '#1E2206',
          steel: '#2A5F8A',
          'steel-hover': '#3370A0',
        },
        status: {
          completed: '#4A9E6A',
          'completed-bg': '#0A2016',
          'completed-border': '#1A4A2A',
          active: '#3A7EC4',
          'active-bg': '#0A1830',
          'active-border': '#1A4070',
          warning: '#C4882A',
          'warning-bg': '#261800',
          'warning-border': '#6A3E00',
          critical: '#C44040',
          'critical-bg': '#260A0A',
          'critical-border': '#6A1A1A',
          pending: '#445060',
          'pending-bg': '#111620',
          'pending-border': '#2A3545',
        },
        stage: {
          s1: '#6B5B9E',
          s2: '#2A6090',
          s3: '#1E7A7A',
          s4: '#8A6020',
          s5: '#8A4820',
          s6: '#2A7A40',
        },
        // Army gradient stops as named colors
        army: {
          dark: '#414D0B',
          light: '#727A17',
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
        0.5: '2px', 1: '4px', 1.5: '6px', 2: '8px', 2.5: '10px',
        3: '12px', 4: '16px', 5: '20px', 6: '24px', 7: '28px',
        8: '32px', 10: '40px', 12: '48px', 16: '64px',
      },
      borderRadius: {
        none: '0', sm: '2px', DEFAULT: '4px', md: '4px', lg: '6px', xl: '8px', full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.5)',
        DEFAULT: '0 2px 6px rgba(0,0,0,0.55)',
        md: '0 4px 12px rgba(0,0,0,0.6)',
        lg: '0 8px 24px rgba(0,0,0,0.7)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      },
      transitionDuration: {
        fast: '120ms', DEFAULT: '200ms', slow: '300ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-out',
      },
      backgroundImage: {
        // Exact army gradient — #414D0B → #727A17
        'army': 'linear-gradient(to right, #414d0b, #727a17)',
        'army-135': 'linear-gradient(135deg, #414d0b, #727a17)',
        'army-180': 'linear-gradient(180deg, #414d0b, #727a17)',
        // Command header — deep charcoal with olive undertone
        'cmd-header': 'linear-gradient(135deg, #0D1117 0%, #111A0E 60%, #0D1117 100%)',
        // Sidebar
        'sidebar': 'linear-gradient(180deg, #0D1117 0%, #0A0F0C 100%)',
      },
    },
  },
  plugins: [],
};
