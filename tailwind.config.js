/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./blog/**/*.html"],
  theme: {
    extend: {
      colors: {
        teal:   { DEFAULT:'#0B6B6B', dark:'#085555', light:'#E8F5F2' },
        gold:   { DEFAULT:'#C8A96A', light:'#F5EDD8' },
        warm:   { DEFAULT:'#FAF7F2', dark:'#F0EAE0' },
        ink:    { DEFAULT:'#1C1C1C' },
        muted:  { DEFAULT:'#5A6472' },
      },
      fontFamily: {
        display: ['Cormorant Garamond','Georgia','serif'],
        sans:    ['DM Sans','system-ui','sans-serif'],
      }
    }
  },
  plugins: [],
}
