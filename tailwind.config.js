
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand_signature: {
          baby_blue: '#A0D8EF',
          cream: '#F9EBD1',
          taupe: '#475569',
          brown: '#101D34',
        },
        'brand-primary': '#89cff0',
        'brand-accent': '#0F172A',
        'brand-muted': '#475569',
        'brand-cream': '#ffeacd',
        surface: {
          background: '#FFFFFF',
          dark: '#121212',
          darkBase: '#0D0D0D',
        },
        text: {
          executive_dark: '#101D34',
          light: '#E0E0E0',
        },
        cyanAccent: '#28FAFC',
        emerald: '#10B981',
        orangeWarm: '#F97316',
        darkBase: '#0A0A0A',
        // Extended slate palette for dark UI
        slate: {
          750: '#293548',
          850: '#172033',
        },
        // Extended cyan palette for subtle tinting
        cyan: {
          50: '#f0fdfe',
          100: '#ccfbfd',
          200: '#99f6fb',
          300: '#5ceef7',
          400: '#28FAFC',
          500: '#06d6dd',
          600: '#08abb8',
          700: '#0e8895',
          800: '#156c79',
          900: '#165966',
        },
        // Sidebar & panel tints
        panel: {
          soft: 'rgba(40, 250, 252, 0.03)',
          hover: 'rgba(40, 250, 252, 0.06)',
          active: 'rgba(40, 250, 252, 0.10)',
          border: 'rgba(40, 250, 252, 0.12)',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        headings: ['"Inter"', 'sans-serif'],
        data: ['"Inter"', 'monospace'],
        anthropic: ['"Satoshi"', 'sans-serif'],
        anthropicSerif: ['"Newsreader"', 'serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px rgba(0,31,38,0.04), 0 8px 24px rgba(0,31,38,0.06)',
        'card-lg': '0 4px 12px rgba(0,31,38,0.04), 0 20px 48px rgba(0,31,38,0.08)',
        'card-hover': '0 8px 32px rgba(40,250,252,0.10), 0 24px 64px -12px rgba(0,31,38,0.10)',
        'sidebar': '4px 0 32px rgba(0,31,38,0.04), 1px 0 0 rgba(40,250,252,0.06)',
        'header': '0 1px 0 rgba(0,31,38,0.04), 0 4px 16px rgba(0,31,38,0.03)',
        'glow-sm': '0 0 12px rgba(40,250,252,0.15)',
        'glow': '0 0 24px rgba(40,250,252,0.20)',
        'glow-lg': '0 4px 40px rgba(40,250,252,0.25)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-sidebar': 'linear-gradient(195deg, rgba(40,250,252,0.04) 0%, rgba(250,249,245,0.98) 50%, rgba(137,207,240,0.03) 100%)',
        'gradient-header': 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(250,249,245,0.75) 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,249,245,0.7) 100%)',
      },
      animation: {
        'shimmer': 'shimmer 2.5s infinite linear',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    }
  },
  plugins: [],
}
