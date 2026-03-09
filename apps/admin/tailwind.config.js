/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#090417',
          card: '#ffffff',
          line: '#3a2b6e',
          accent: '#7c3aed',
          glow: '#22d3ee',
          text: '#130a2f',
          muted: '#6f58b6',
        },
      },
      boxShadow: {
        panel: '0 18px 44px rgba(47, 18, 110, 0.24)',
        glow: '0 0 0 1px rgba(34, 211, 238, 0.4), 0 18px 38px rgba(124, 58, 237, 0.26)',
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(124,58,237,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.14) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '26px 26px',
      },
    },
  },
  plugins: [],
};
