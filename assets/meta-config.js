// assets/meta-config.js — fonte ÚNICA do ID do Meta Pixel no front-end.
//
// Antes o ID estava repetido em 4 lugares (advanced-matching, <noscript> de uma
// landing, tag do GTM e a env var META_PIXEL_ID do /api/capi). Foi assim que
// browser e server-side acabaram descasados: trocaram num lugar e esqueceram
// o resto. Aqui é o único ponto do front; carregar ANTES do advanced-matching.
//
// Precisa bater com a env var META_PIXEL_ID (Vercel) usada pelo /api/capi e com
// a tag do Pixel no GTM — se divergirem, o evento do navegador e o server-side
// caem em datasets diferentes e a deduplicação para de funcionar.
//
// Pixel: "Pixel 2 Dr Kleber Rangel" — Business Manager "Trate a Dor - Dr Kleber
// Rangel" (338286065214169), o BM do próprio Dr. Kleber.
window.META_PIXEL_ID = '1252963350362396';
