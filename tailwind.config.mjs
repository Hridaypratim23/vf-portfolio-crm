/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Poppins', 'sans-serif'] },
      colors: {
        midnight: '#1a1a3e',
        'fit-red': '#d92d4a',
        'fit-green': '#0ba882',
        'fit-teal': '#2dd4b0',
        'fit-purple': '#8e44ad',
        'fit-orange': '#e67e22',
      },
      borderRadius: { card: '16px' },
      boxShadow: {
        card: '0 6px 20px rgba(0,0,0,0.08)',
        'card-hover': '0 10px 30px rgba(0,0,0,0.13)',
      },
    },
  },
};