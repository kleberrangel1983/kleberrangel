// assets/consent.js — gestor único de consentimento (LGPD + Google Consent Mode).
//
// As páginas declaram no <head> `gtag('consent','default', {...'denied'})`, que
// FECHA o portão do rastreamento. Sem um `consent update`, GA4/Google Ads nunca
// gravam cookie e a conversão do anúncio não é atribuída ao clique. Este arquivo
// é quem abre o portão — quando (e só quando) o visitante aceita.
//
// Fonte única para TODAS as páginas. Antes havia banner inline duplicado no
// index.html e no lp-dor-coluna.html, cada um com sua própria chave de storage.
//
// Autossuficiente de propósito: injeta o próprio HTML e não usa variáveis CSS da
// página (as landings de anúncio não definem --gold). Incluir com `defer`.

(function () {
  var STORAGE_KEY = 'drkleberrangel_consent';
  // lp-dor-coluna.html gravava a escolha sob outra chave. Migramos em vez de
  // ignorar: quem já decidiu lá não pode ser perguntado de novo.
  var LEGACY_KEYS = ['kleber_consent'];
  var BANNER_ID = 'consent-banner';

  function comStorage(fn, fallback) {
    try {
      return fn();
    } catch (e) {
      return fallback; // navegação anônima com storage bloqueado
    }
  }

  function gravarEscolha(level) {
    comStorage(function () {
      localStorage.setItem(STORAGE_KEY, level);
    });
  }

  function lerEscolha() {
    var atual = comStorage(function () {
      return localStorage.getItem(STORAGE_KEY);
    }, null);
    if (atual) return atual;

    for (var i = 0; i < LEGACY_KEYS.length; i++) {
      var chave = LEGACY_KEYS[i];
      var legado = comStorage(function () {
        return localStorage.getItem(chave);
      }, null);
      if (legado) {
        gravarEscolha(legado); // migra para a chave única
        return legado;
      }
    }
    return null;
  }

  function gtagSafe() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }
  var gtagFn = typeof window.gtag === 'function' ? window.gtag : gtagSafe;

  // ── Persistência do _fbc (identificador de clique de anúncio da Meta) ──
  // O fbclid só vem na URL no primeiro acesso via anúncio. Se o visitante navega para
  // uma página interna antes de decidir sobre cookies, ele se perde e o matching de
  // cliques pagos despenca. Capturamos o fbclid cedo (buffer técnico de sessão), mas só
  // materializamos o cookie de publicidade _fbc COM consentimento — mesmo rigor do resto
  // do arquivo (LGPD Art. 11: em site de saúde, é dado sensível por inferência).
  var FBCLID_BUFFER = 'drkleberrangel_fbclid';

  function lerCookie(nome) {
    var m = document.cookie.match(new RegExp('(^|; )' + nome + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  }

  function capturarFbclid() {
    try {
      var fbclid = new URLSearchParams(window.location.search).get('fbclid');
      if (!fbclid || lerCookie('_fbc')) return; // sem fbclid, ou o fbevents já gravou o cookie
      comStorage(function () {
        if (!sessionStorage.getItem(FBCLID_BUFFER)) {
          sessionStorage.setItem(FBCLID_BUFFER, 'fb.1.' + Date.now() + '.' + fbclid);
        }
      });
    } catch (e) {}
  }

  function materializarFbc() {
    if (lerCookie('_fbc')) return; // não sobrescreve o cookie do próprio fbevents
    var valor = comStorage(function () { return sessionStorage.getItem(FBCLID_BUFFER); }, null);
    if (!valor) {
      try {
        var fbclid = new URLSearchParams(window.location.search).get('fbclid');
        if (fbclid) valor = 'fb.1.' + Date.now() + '.' + fbclid; // fbclid ainda na URL desta página
      } catch (e) {}
    }
    if (!valor) return;
    document.cookie = '_fbc=' + valor + '; max-age=7776000; path=/; SameSite=Lax'; // 90 dias (janela de atribuição da Meta)
  }

  function aplicar(level) {
    var granted = level === 'all' ? 'granted' : 'denied';
    gtagFn('consent', 'update', {
      analytics_storage: granted,
      ad_storage: granted,
      ad_user_data: granted,
      ad_personalization: granted
    });
    if (level === 'all' && window.fbq) {
      window.fbq('consent', 'grant');
      window.fbq('track', 'PageView');
    }

    // Evento para o GTM re-disparar as tags que ele bloqueou por falta de consentimento.
    // O GTM avalia o consentimento NO INSTANTE do gatilho: a tag do Pixel usa "All Pages",
    // que já passou quando o visitante clica em "Aceitar" — e tags Custom HTML NÃO
    // re-disparam sozinhas quando o consentimento chega depois. Sem um gatilho novo, o
    // Pixel só voltaria a rodar na próxima navegação (perdendo o PageView desta).
    // No GTM: adicionar o gatilho "CE - consent_granted" à tag do Pixel.
    if (level === 'all') {
      materializarFbc(); // agora há consentimento: grava o cookie _fbc do clique de anúncio
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'consent_granted' });
    }
  }

  function setConsent(level) {
    gravarEscolha(level);
    var el = document.getElementById(BANNER_ID);
    if (el) el.remove();
    aplicar(level);
  }
  window.setConsent = setConsent;

  // Fonte única da verdade sobre o consentimento, para quem precisa decidir se pode
  // enviar dado à Meta. O gate do GTM só vale para o navegador — o envio server-side
  // (/api/capi) passaria por fora dele, mandando IP, user-agent e cookies _fbp/_fbc
  // de quem nunca aceitou. Ver capi-client.js.
  window.temConsentimentoPublicidade = function () {
    return lerEscolha() === 'all';
  };

  function abrirBanner() {
    if (document.getElementById(BANNER_ID)) return;

    var wrap = document.createElement('div');
    wrap.id = BANNER_ID;
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Aviso de cookies');
    wrap.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;background:#0F0F0F;color:#fff;' +
      'padding:16px 20px;z-index:9999;font-size:13px;box-shadow:0 -4px 20px rgba(0,0,0,0.3);';
    wrap.innerHTML =
      '<div style="max-width:900px;margin:0 auto;">' +
      '<p style="margin:0 0 6px;font-weight:600;font-size:14px;">🔒 Utilizamos cookies</p>' +
      '<p style="margin:0 0 12px;color:rgba(255,255,255,0.75);font-size:12px;line-height:1.5;">' +
      'Usamos cookies essenciais para o funcionamento do site, cookies de análise (Google Analytics) ' +
      'e cookies de publicidade (Meta Pixel). Você pode aceitar todos ou apenas os essenciais. ' +
      '<a href="/politica-privacidade.html" style="color:#C08A6E;text-decoration:underline;">Política de Privacidade</a>.' +
      '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" data-consent="all" style="background:#B5654A;color:#fff;border:none;padding:12px 20px;min-height:44px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">✓ Aceitar todos</button>' +
      '<button type="button" data-consent="essential" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.4);padding:12px 16px;min-height:44px;border-radius:8px;cursor:pointer;font-size:14px;">Apenas essenciais</button>' +
      '<button type="button" data-consent="none" style="background:transparent;color:rgba(255,255,255,0.5);border:none;padding:12px 14px;min-height:44px;border-radius:8px;cursor:pointer;font-size:13px;">Rejeitar todos</button>' +
      '</div></div>';

    wrap.addEventListener('click', function (ev) {
      var level = ev.target && ev.target.getAttribute('data-consent');
      if (level) setConsent(level);
    });

    document.body.appendChild(wrap);
  }
  window.abrirPreferenciasCookies = abrirBanner;

  // Link "Gerenciar cookies" no rodapé. A Política de Privacidade (Seção 8) promete
  // que o titular revoga o consentimento "reabrindo as preferências pelo banner/painel"
  // — sem este link, a promessa não tinha suporte funcional (LGPD Art. 8 §5: revogar
  // tem de ser tão fácil quanto consentir).
  function renderLinkRodape() {
    var footer = document.querySelector('footer');
    if (!footer || document.getElementById('gerenciar-cookies')) return;

    var link = document.createElement('a');
    link.id = 'gerenciar-cookies';
    link.href = '#';
    link.textContent = 'Gerenciar cookies';
    link.style.cssText = 'text-decoration:underline;cursor:pointer;';
    link.addEventListener('click', function (ev) {
      ev.preventDefault();
      abrirBanner();
    });

    // Anexa ao FIM da linha de links do rodapé (inserir no meio quebraria os
    // separadores existentes) e herda a aparência do link da política, para não
    // destoar — os rodapés variam entre home, landing e blog.
    var vizinho = footer.querySelector('a[href*="politica"]');
    var pai = vizinho && vizinho.parentElement;
    if (pai) {
      link.className = vizinho.className;
      link.style.cssText = vizinho.getAttribute('style') || '';
      link.style.textDecoration = 'underline';
      link.style.cursor = 'pointer';

      // Se o container já espaça os links via CSS (flex/grid com gap), o separador
      // é do layout; num rodapé de texto corrido, o " · " precisa vir de nós.
      var layout = getComputedStyle(pai).display;
      var espacaSozinho = layout === 'flex' || layout === 'grid';
      if (espacaSozinho) pai.appendChild(link);
      else pai.append(' · ', link);
    } else {
      var p = document.createElement('p');
      p.style.cssText = 'margin-top:8px;font-size:12px;opacity:.75;';
      p.appendChild(link);
      footer.appendChild(p);
    }
  }

  function init() {
    capturarFbclid(); // guarda o fbclid cedo (buffer de sessão); só vira cookie com consentimento
    renderLinkRodape();
    var escolha = lerEscolha();
    if (escolha === 'all') aplicar('all'); // reabre o portão numa visita seguinte
    else if (!escolha) abrirBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
