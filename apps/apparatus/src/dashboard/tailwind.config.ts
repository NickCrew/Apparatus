import type { Config } from 'tailwindcss';
import { colors } from './theme/colors';

const config = {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        info: colors.info,
        neutral: colors.neutral,
        surface: colors.surface,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px rgba(0, 240, 255, 0.5)',
        'glow-success': '0 0 20px -5px rgba(0, 255, 148, 0.5)',
        'glow-danger': '0 0 20px -5px rgba(255, 0, 85, 0.5)',
        'panel': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "linear-gradient(to right, #1f2633 1px, transparent 1px), linear-gradient(to bottom, #1f2633 1px, transparent 1px)",
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;