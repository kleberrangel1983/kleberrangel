/** @type {import('tailwindcss').Config} */
// Build dedicado das landings de tratamento (tema próprio: teal #0d7c7c + Playfair/Inter).
// Substitui o antigo Tailwind via CDN runtime nessas páginas.
// Build: npx tailwindcss@3.4.13 -c tailwind.landing.config.cjs -i src/landing-input.css -o assets/tailwind-landing.css --minify
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
