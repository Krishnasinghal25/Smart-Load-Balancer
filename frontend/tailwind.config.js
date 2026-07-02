/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Neon cyberpunk palette
        void: '#05060d',
        panel: '#0a0e1a',
        neon: {
          cyan: '#00f0ff',
          blue: '#2b6bff',
          purple: '#a855f7',
          magenta: '#ff2bd6',
          pink: '#ff3d8b',
          lime: '#39ff14',
          amber: '#ffb800',
          red: '#ff2e63',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['"Orbitron"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0,240,255,0.5), 0 0 30px rgba(0,240,255,0.25)',
        'neon-magenta': '0 0 10px rgba(255,43,214,0.5), 0 0 30px rgba(255,43,214,0.25)',
        'neon-purple': '0 0 10px rgba(168,85,247,0.5), 0 0 30px rgba(168,85,247,0.25)',
      },
      keyframes: {
        'grid-pan': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 40px' },
        },
        flicker: {
          '0%,19%,21%,23%,25%,54%,56%,100%': { opacity: '1' },
          '20%,22%,24%,55%': { opacity: '0.4' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'grid-pan': 'grid-pan 3s linear infinite',
        flicker: 'flicker 4s infinite',
        scan: 'scan 6s linear infinite',
      },
    },
  },
  plugins: [],
};
