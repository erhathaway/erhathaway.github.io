/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F1EB',
        warmwhite: '#FFFCF7',
        walnut: '#2C2218',
        oak: '#8B6914',
        maple: '#C4A35A',
        ash: '#8A8078',
        charcoal: '#1A1714',
        copper: '#B87333',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    }
  },
  plugins: [],
}