/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background layers
        bg: {
          base: '#0A0A0B',
          elevated: '#141416',
          surface: '#1C1C1F',
          overlay: '#242428',
        },
        // Text hierarchy
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A1AA',
          tertiary: '#71717A',
          muted: '#52525B',
        },
        // Borders
        border: {
          subtle: '#27272A',
          medium: '#3F3F46',
          strong: '#52525B',
        },
        // Accent
        accent: {
          DEFAULT: '#8B5CF6',
          hover: '#7C3AED',
          muted: 'rgba(139, 92, 246, 0.15)',
        },
        // Semantic
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Mood colors (solid)
        mood: {
          move: '#F97316',
          chill: '#06B6D4',
          connect: '#EC4899',
          learn: '#10B981',
          celebrate: '#FBBF24',
          create: '#8B5CF6',
          explore: '#14B8A6',
        },
        // Vertical colors
        holistic: '#14B8A6',
        dance: '#EC4899',
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display-sm': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-mood': '0 0 30px var(--tw-shadow-color, rgba(139, 92, 246, 0.2))',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'gradient-move': 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
        'gradient-chill': 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
        'gradient-connect': 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
        'gradient-learn': 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
        'gradient-celebrate': 'linear-gradient(135deg, #FBBF24 0%, #F97316 100%)',
        'gradient-create': 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
        'gradient-explore': 'linear-gradient(135deg, #14B8A6 0%, #22C55E 100%)',
        'gradient-holistic': 'linear-gradient(135deg, #14B8A6 0%, #10B981 100%)',
        'gradient-dance': 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
      },
    },
  },
  plugins: [],
};
