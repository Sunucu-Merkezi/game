import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070b14',
        panel: '#0c1322',
        panel2: '#101a2e',
        line: '#1b2a45',
        neon: '#3b82f6',
        neonSoft: '#60a5fa',
        ok: '#22c55e',
        warn: '#f59e0b',
        bad: '#ef4444',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'ui-monospace', 'monospace'] },
      boxShadow: { neon: '0 0 0 1px rgba(59,130,246,.35), 0 0 24px rgba(59,130,246,.18)' },
    },
  },
  plugins: [],
};
export default config;
