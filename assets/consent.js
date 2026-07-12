// assets/consent.js — banner de consentimento LGPD + Google Consent Mode.
//
// As páginas declaram no <head> `gtag('consent','default', {...'denied'})`, que
// FECHA o portão do rastreamento. Sem um `consent update`, GA4/Google Ads nunca
// gravam cookie e a conversão do anúncio não é atribuída ao clique. Este arquivo
// é quem abre o portão — quando (e só quando) o visitante aceita.
//
// Autossuficiente de propósito: injeta o próprio HTML e não usa variáveis CSS da
// página (as landings de anúncio não definem --gold). Incluir com `defer`.

(function () {
  var STORAGE_KEY = 'drkleberrangel_consent'; // mesma chave do index.html: quem já aceitou lá não revê o banner
  var BANNER_ID = 'consent-banner';

  // index.html e lp-dor-coluna.html já trazem o banner inline — não duplicar.
  if (document.getElementById(BANNER_ID)) return;

  function gtagSafe() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }
  var gtagFn = typeof window.gtag === 'function' ? window.gtag : gtagSafe;

  function applyConsent(level) {
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
  }

  function setConsent(level) {
    try {
      localStorage.setItem(STORAGE_KEY, level);
    } catch (e) {
      /* navegação anônima com storage bloqueado: decisão vale só nesta página */
    }
    var el = document.getElementById(BANNER_ID);
    if (el) el.remove();
    applyConsent(level);
  }
  window.setConsent = setConsent; // paridade com o banner inline do index

  function render() {
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

  var saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    /* storage indisponível: trata como primeira visita */
  }

  if (saved === 'all') applyConsent('all'); // reabre o portão numa visita seguinte
  else if (!saved) render();
})();
