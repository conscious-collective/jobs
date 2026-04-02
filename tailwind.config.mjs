/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#060608',
        surface: '#0d0d10',
        'surface-2': '#121216',
        border: '#1a1a22',
        accent: '#00e5ff',
        'accent-warm': '#ff6b35',
        'accent-purple': '#a855f7',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.02em',
        wide: '0.08em',
        wider: '0.15em',
      },
    },
  },
  plugins: [],
};
