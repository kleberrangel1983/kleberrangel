(function () {
  if (window.__drkrConsentLoaded) return;
  window.__drkrConsentLoaded = true;

  const KEY = 'drkleberrangel_consent';
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}

  function applyConsent(level) {
    const analytics = level === 'all' ? 'granted' : 'denied';
    const ads = level === 'all' ? 'granted' : 'denied';
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        'analytics_storage': analytics,
        'ad_storage': ads,
        'ad_user_data': ads,
        'ad_personalization': ads
      });
    }
    if (window.fbq) {
      if (level === 'all') {
        fbq('consent', 'grant');
        try { fbq('track', 'PageView'); } catch (e) {}
      } else {
        fbq('consent', 'revoke');
      }
    }
  }

  window.setConsent = function (level) {
    try { localStorage.setItem(KEY, level); } catch (e) {}
    const banner = document.getElementById('drkr-consent-banner');
    if (banner) banner.remove();
    applyConsent(level);
  };

  if (saved) {
    applyConsent(saved);
    return;
  }

  function injectBanner() {
    if (document.getElementById('drkr-consent-banner')) return;
    // If page already has the legacy inline banner (#consent-banner), don't double-inject.
    const legacy = document.getElementById('consent-banner');
    if (legacy) { legacy.style.display = 'block'; return; }
    const div = document.createElement('div');
    div.id = 'drkr-consent-banner';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'false');
    div.setAttribute('aria-labelledby', 'drkr-consent-title');
    div.setAttribute('aria-describedby', 'drkr-consent-desc');
    div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1C1C1C;color:#fff;padding:16px 20px;z-index:9999;font-size:13px;box-shadow:0 -4px 20px rgba(0,0,0,0.3);font-family:system-ui,-apple-system,Arial,sans-serif;';
    div.innerHTML =
      '<div style="max-width:900px;margin:0 auto;">' +
      '<p id="drkr-consent-title" style="margin:0 0 6px;font-weight:600;font-size:14px;">Utilizamos cookies</p>' +
      '<p id="drkr-consent-desc" style="margin:0 0 12px;color:rgba(255,255,255,0.78);font-size:12px;line-height:1.5;">Usamos cookies essenciais para o funcionamento do site, cookies de análise (Google Analytics) e de publicidade (Meta Pixel). Você pode aceitar todos ou apenas os essenciais. <a href="/politica-privacidade.html" style="color:#C8A96A;text-decoration:underline;">Política de Privacidade</a>.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" data-consent="all" style="background:#C8A96A;color:#fff;border:none;padding:9px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">Aceitar todos</button>' +
      '<button type="button" data-consent="essential" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.4);padding:9px 16px;border-radius:8px;cursor:pointer;font-size:13px;">Apenas essenciais</button>' +
      '<button type="button" data-consent="none" style="background:transparent;color:rgba(255,255,255,0.6);border:none;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:12px;">Rejeitar todos</button>' +
      '</div></div>';
    document.body.appendChild(div);
    div.querySelectorAll('button[data-consent]').forEach(function (btn) {
      btn.addEventListener('click', function () { window.setConsent(btn.getAttribute('data-consent')); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBanner);
  } else {
    injectBanner();
  }
})();
