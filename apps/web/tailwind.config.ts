import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        lab: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          raised: 'var(--surface-raised)',
          soft: 'var(--surface-soft)',
          line: 'var(--line)',
          strong: 'var(--line-strong)',
          text: 'var(--text)',
          softText: 'var(--text-soft)',
          muted: 'var(--text-muted)',
          accent: 'var(--accent)',
          success: 'var(--success)',
          danger: 'var(--coral)',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        lab: 'var(--shadow)',
      },
    },
  },
};

export default config;
