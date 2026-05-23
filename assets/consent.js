/*!
 * consent.js — Banner LGPD e gating de Google Tag Manager / Meta Pixel.
 *
 * Requer que a página já tenha definido `gtag` (consent default 'denied') e,
 * opcionalmente, inicializado o Meta Pixel com `fbq('consent','revoke')`.
 * Não dispara nenhum `track('PageView')` antes do consentimento.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'drkleberrangel_consent';
  var BANNER_ID = 'consent-banner';

  function grantAnalyticsAndAds() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    }
    if (typeof window.fbq === 'function') {
      window.fbq('consent', 'grant');
      window.fbq('track', 'PageView');
    }
  }

  function denyAnalyticsAndAds() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
  }

  function hideBanner() {
    var el = document.getElementById(BANNER_ID);
    if (el) el.style.display = 'none';
  }

  window.setConsent = function (level) {
    try { localStorage.setItem(STORAGE_KEY, level); } catch (e) {}
    hideBanner();
    if (level === 'all') grantAnalyticsAndAds();
    else denyAnalyticsAndAds();
  };

  function buildButton(level, label, style) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-consent', level);
    b.style.cssText = style;
    b.textContent = label;
    b.addEventListener('click', function () { window.setConsent(level); });
    return b;
  }

  function ensureBanner() {
    if (document.getElementById(BANNER_ID)) return;
    var div = document.createElement('div');
    div.id = BANNER_ID;
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-live', 'polite');
    div.setAttribute('aria-label', 'Aviso de cookies');
    div.style.cssText = 'display:none;position:fixed;bottom:0;left:0;right:0;background:#1C1C1C;color:#fff;padding:16px 20px;z-index:9999;font-size:13px;box-shadow:0 -4px 20px rgba(0,0,0,0.3);font-family:Arial,sans-serif;';

    var inner = document.createElement('div');
    inner.style.cssText = 'max-width:900px;margin:0 auto;';

    var title = document.createElement('p');
    title.style.cssText = 'margin:0 0 6px;font-weight:600;font-size:14px;';
    title.textContent = 'Utilizamos cookies';
    inner.appendChild(title);

    var desc = document.createElement('p');
    desc.style.cssText = 'margin:0 0 12px;color:rgba(255,255,255,0.75);font-size:12px;line-height:1.5;';
    desc.appendChild(document.createTextNode('Usamos cookies essenciais para o funcionamento do site, cookies de análise (Google Analytics) e cookies de publicidade (Meta Pixel). Você pode aceitar todos ou apenas os essenciais. '));
    var policyLink = document.createElement('a');
    policyLink.href = '/privacidade';
    policyLink.style.cssText = 'color:#C8A96A;text-decoration:underline;';
    policyLink.textContent = 'Política de Privacidade';
    desc.appendChild(policyLink);
    desc.appendChild(document.createTextNode('.'));
    inner.appendChild(desc);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    btnRow.appendChild(buildButton('all', 'Aceitar todos', 'background:#C8A96A;color:#fff;border:none;padding:9px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;'));
    btnRow.appendChild(buildButton('essential', 'Apenas essenciais', 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.4);padding:9px 16px;border-radius:8px;cursor:pointer;font-size:13px;'));
    btnRow.appendChild(buildButton('none', 'Rejeitar todos', 'background:transparent;color:rgba(255,255,255,0.5);border:none;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:12px;'));
    inner.appendChild(btnRow);

    div.appendChild(inner);
    document.body.appendChild(div);
  }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    ensureBanner();
    if (!saved) {
      var el = document.getElementById(BANNER_ID);
      if (el) el.style.display = 'block';
    } else if (saved === 'all') {
      grantAnalyticsAndAds();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
