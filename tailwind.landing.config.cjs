/** @type {import('tailwindcss').Config} */
// Build dedicado das landings de tratamento (tema próprio: teal #0d7c7c + Playfair/Inter).
// Substitui o antigo Tailwind via CDN runtime nessas páginas.
// Build: npm run build:css  (usa src/tailwind-input.css, compartilhado com o build principal)
module.exports = {
  content: [
    "./prp.html",
    "./ombro.html",
    "./medicina-regenerativa.html",
    "./ozonoterapia-divinopolis.html",
  ],
  theme: {
    extend: {
      colors: { 'teal': '#0d7c7c', 'teal-dark': '#0a6363', 'teal-light': '#e8f5f5' },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
