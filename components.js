// components.js — nav e footer centralizados
// Edite aqui e reflete em TODAS as páginas automaticamente

(function() {

// ── NAV ──
const NAV_HTML = `<nav class="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-20">
            <a href="/" class="flex items-center gap-3" style="text-decoration:none;color:inherit;">
                <img src="/assets/logo.png" alt="Clínica Trate a Dor" width="48" height="48" style="width:48px;height:48px;object-fit:contain;">
                <div style="line-height:1.3;">
                    <div style="font-weight:700;font-size:0.95rem;color:var(--teal);white-space:nowrap;">Dr. Kleber Rangel</div>
                    <div style="font-size:0.7rem;color:var(--muted);white-space:nowrap;">Ortopedista · CRM-MG 68724</div>
                </div>
            </a>
            <div class="nav-desktop-links">
                <a href="#metodo" class="nav-link">Método</a>
                <a href="#tratamentos" class="nav-link">Tratamentos</a>
                <a href="#sobre" class="nav-link">Sobre</a>
                <a href="#videos" class="nav-link">Vídeos</a>
                <a href="#faq" class="nav-link">FAQ</a>
                <a href="/segunda-opiniao" class="nav-link">2ª Opinião</a>
                <a href="/blog" class="nav-link">Blog</a>
                <a href="tel:+5537998419396" class="nav-link font-semibold" style="color:var(--teal);">(37) 99841-9396</a>
                <a href="https://wa.me/5537998419396?text=Olá%20Dr.%20Kleber%2C%20vim%20pelo%20site%20drkleberrangel.com.br%20%28página%20principal%29%20e%20gostaria%20de%20agendar%20uma%20consulta.%20Poderia%20me%20informar%20a%20disponibilidade%3F" target="_blank" rel="noopener noreferrer" class="btn-teal">
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 2C8.268 2 2 8.268 2 16c0 2.428.651 4.703 1.788 6.664L2 30l7.528-1.768A13.94 13.94 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm-3.93 7.62c-.22-.493-.45-.503-.658-.512l-.56-.007c-.195 0-.512.073-.78.366-.268.293-1.024 1.001-1.024 2.44 0 1.44 1.049 2.83 1.195 3.025.147.195 2.025 3.22 4.977 4.388 2.463.972 2.953.779 3.484.73.532-.049 1.708-.698 1.95-1.372.24-.674.24-1.251.168-1.372-.073-.122-.269-.195-.562-.342-.293-.146-1.708-.843-1.977-.94-.268-.097-.463-.146-.659.147-.195.293-.757.94-.927 1.135-.17.195-.341.22-.634.073-.293-.147-1.237-.456-2.357-1.453-.87-.776-1.458-1.734-1.629-2.027-.17-.293-.018-.451.128-.597.13-.13.293-.341.44-.512.146-.17.195-.293.293-.488.097-.195.049-.366-.025-.512-.073-.146-.65-1.592-.903-2.181z" fill="white"/></svg>
                    Agendar Consulta
                </a>
            </div>
            <div class="md:hidden flex items-center gap-2">
                <a href="https://wa.me/5537998419396?text=Olá%20Dr.%20Kleber%2C%20vim%20pelo%20site%20drkleberrangel.com.br%20%28página%20principal%29%20e%20gostaria%20de%20agendar%20uma%20consulta.%20Poderia%20me%20informar%20a%20disponibilidade%3F" target="_blank" rel="noopener noreferrer" class="btn-teal text-xs px-3 py-2">Agendar</a>
                <button id="mob-btn" class="p-2 rounded hover:bg-gray-100" aria-label="Menu">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
            </div>
        </div>
    </div>
    <div id="mob-menu" class="hidden md:hidden border-t border-gray-100 px-4 py-4 space-y-3 text-sm font-medium bg-white">
        <a href="#metodo" class="block text-gray-600 hover:text-teal-DEFAULT" onclick="document.getElementById('mob-menu').classList.add('hidden')">Método</a>
        <a href="#tratamentos" class="block text-gray-600" onclick="document.getElementById('mob-menu').classList.add('hidden')">Tratamentos</a>
        <a href="#sobre" class="block text-gray-600" onclick="document.getElementById('mob-menu').classList.add('hidden')">Sobre</a>
        <a href="#videos" class="block text-gray-600" onclick="document.getElementById('mob-menu').classList.add('hidden')">Vídeos</a>
        <a href="#faq" class="block text-gray-600" onclick="document.getElementById('mob-menu').classList.add('hidden')">FAQ</a>
        <a href="tel:+5537998419396" class="block font-semibold" style="color:var(--teal);">(37) 99841-9396</a>
    </div>
</nav>`;

// ── FOOTER ──
const FOOTER_HTML = `<footer class="text-sm mt-2 font-semibold" style="color:var(--teal);">— Dr. Kleber Rangel, CRM-MG 68724</footer>`;

// Injeta nav
const navPlaceholder = document.getElementById('nav-placeholder');
if (navPlaceholder) {
  navPlaceholder.outerHTML = NAV_HTML;
} else if (!document.querySelector('nav.sticky')) {
  document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
}

// Injeta footer
const footerPlaceholder = document.getElementById('footer-placeholder');
if (footerPlaceholder) {
  footerPlaceholder.outerHTML = FOOTER_HTML;
}

// Marca link ativo na nav baseado na URL atual
setTimeout(function() {
  const path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('nav a').forEach(function(a) {
    const href = a.getAttribute('href') || '';
    if (href !== '#' && href !== '/' && path.includes(href.replace(/\.html$/, ''))) {
      a.style.color = 'var(--teal, #0B6B6B)';
      a.style.fontWeight = '600';
    }
  });
}, 100);

})();
