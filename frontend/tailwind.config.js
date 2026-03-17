/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accessibility': {
          'high-contrast': '#000000',
          'text': '#FFFFFF',
          'accent': '#FFFF00',
        }
      },
    },
  },
  plugins: [],
}
