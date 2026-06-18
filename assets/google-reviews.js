/* google-reviews.js — widget de avaliações do Google (ao vivo).
   Renderiza conteúdo de terceiro vindo de /api/reviews (a chave da API fica
   no servidor). Se a API não estiver configurada ou falhar, mostra o fallback
   (nota agregada + link pro Google). Nunca quebra a página.

   Uso no HTML:
     <div data-google-reviews data-fallback-rating="4,8" data-google-url="/google"></div>
     <script src="/assets/google-reviews.js" defer></script>

   Conformidade CFM 2.336/2023: os relatos não são digitados/publicados no HTML
   do médico; vêm do Google em tempo real, com atribuição. */
(function () {
  var containers = document.querySelectorAll('[data-google-reviews]');
  if (!containers.length) return;

  injectStyles();
  Array.prototype.forEach.call(containers, function (el) { render(el); });

  function render(el) {
    var fallbackRating = el.getAttribute('data-fallback-rating') || '4,8';
    var googleUrl = el.getAttribute('data-google-url') || '/google';

    // Fallback imediato — evita página vazia / layout shift enquanto carrega.
    el.innerHTML = fallbackHTML(fallbackRating, googleUrl);

    fetch('/api/reviews', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !data.reviews || !data.reviews.length) return; // mantém fallback
        el.innerHTML = liveHTML(data, googleUrl);
      })
      .catch(function () { /* mantém fallback */ });
  }

  function stars(n) {
    n = Math.max(0, Math.min(5, Math.round(n || 5)));
    var s = '';
    for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function liveHTML(data, googleUrl) {
    var ratingTxt = data.rating ? String(data.rating).replace('.', ',') : '';
    var head =
      '<div class="gr-head">' +
        (ratingTxt ? '<span class="gr-score">' + esc(ratingTxt) + '</span>' : '') +
        '<span class="gr-stars">' + stars(data.rating) + '</span>' +
        (data.total ? '<span class="gr-total">' + esc(data.total) + ' avaliações no Google</span>' : '') +
      '</div>';

    var cards = data.reviews.map(function (rv) {
      return '<figure class="gr-card">' +
        '<div class="gr-stars gr-stars-sm">' + stars(rv.rating) + '</div>' +
        '<blockquote class="gr-text">' + esc(rv.text) + '</blockquote>' +
        '<figcaption class="gr-author">' +
          '<span class="gr-avatar">' + esc(rv.initials) + '</span>' +
          '<span class="gr-meta"><span class="gr-name">' + esc(rv.author) + '</span>' +
          (rv.relative ? '<span class="gr-when">' + esc(rv.relative) + '</span>' : '') + '</span>' +
        '</figcaption>' +
      '</figure>';
    }).join('');

    return head +
      '<div class="gr-grid">' + cards + '</div>' +
      '<div class="gr-foot">' +
        '<a class="gr-link" href="' + esc(googleUrl) + '" target="_blank" rel="noopener noreferrer">Ver todas as avaliações no Google →</a>' +
        '<span class="gr-attr">Avaliações fornecidas pelo Google</span>' +
      '</div>';
  }

  function fallbackHTML(rating, googleUrl) {
    return '<div class="gr-fallback">' +
      '<div class="gr-score">' + esc(rating) + '</div>' +
      '<div class="gr-stars">' + stars(5) + '</div>' +
      '<p class="gr-fb-sub">Média das avaliações públicas no Google — pacientes atendidos em Divinópolis-MG e região.</p>' +
      '<a class="gr-link" href="' + esc(googleUrl) + '" target="_blank" rel="noopener noreferrer">Ver avaliações no Google →</a>' +
      '</div>';
  }

  function injectStyles() {
    if (document.getElementById('gr-styles')) return;
    var css = [
      '[data-google-reviews]{max-width:880px;margin:0 auto}',
      '.gr-head{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:28px}',
      '.gr-score{font-size:2.4rem;font-weight:800;color:#0d7c7c;line-height:1}',
      '.gr-stars{color:#f5b50a;letter-spacing:2px;font-size:1.25rem}',
      '.gr-stars-sm{font-size:1rem;margin-bottom:10px}',
      '.gr-total{font-size:.85rem;color:#6b7280}',
      '.gr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}',
      '.gr-card{background:#fff;border:1px solid #ececec;border-radius:14px;padding:22px;margin:0;box-shadow:0 1px 3px rgba(0,0,0,.04);display:flex;flex-direction:column}',
      '.gr-text{font-size:.9rem;font-style:italic;color:#374151;line-height:1.55;margin:0 0 16px;flex:1}',
      '.gr-author{display:flex;align-items:center;gap:10px}',
      '.gr-avatar{width:38px;height:38px;border-radius:50%;background:#0d7c7c;color:#fff;font-weight:700;font-size:.8rem;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
      '.gr-meta{display:flex;flex-direction:column}',
      '.gr-name{font-size:.82rem;font-weight:600;color:#111827}',
      '.gr-when{font-size:.72rem;color:#9ca3af}',
      '.gr-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:24px}',
      '.gr-link{font-size:.9rem;font-weight:600;color:#0d7c7c;text-decoration:none}',
      '.gr-link:hover{text-decoration:underline}',
      '.gr-attr{font-size:.72rem;color:#9ca3af}',
      '.gr-fallback{max-width:430px;margin:0 auto;background:#fff;border:1px solid #ececec;border-top:3px solid #f5b50a;border-radius:16px;padding:32px;text-align:center}',
      '.gr-fallback .gr-score{margin-bottom:6px}',
      '.gr-fallback .gr-stars{display:block;margin-bottom:14px}',
      '.gr-fb-sub{font-size:.85rem;color:#6b7280;margin:0 0 18px}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'gr-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }
})();
