// /assets/capi-client.js — Envia eventos browser → /api/capi com event_id sincronizado
//
// Estrategia:
// 1. Escutar dataLayer.push de eventos relevantes (whatsapp_click, phone_call)
// 2. Para cada evento: gerar event_id único (uuid v4 simplificado)
// 3. Disparar fbq browser COM event_id (já feito pela tag GTM)
// 4. Disparar fetch POST /api/capi COM o MESMO event_id pra dedup server-side
//
// Resultado: cada evento vai por DOIS caminhos (browser + server) e o Meta deduplica.
// Beneficio: 20-40% de eventos iOS que o browser perderia (Safari ITP + ATT)
// agora chegam via server-side com IP/UA real.

(function() {
  'use strict';

  // Mapear evento dataLayer → evento Meta CAPI
  var EVENT_MAP = {
    'whatsapp_click': 'Lead',  // whatsapp_click vira Lead no Meta (dedup com tag GTM)
    'phone_call': 'Contact',   // phone_call vira Contact
  };

  // Gerar event_id determinístico curto (UUID v4-like)
  function genEventId() {
    return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 11);
  }

  // Ler cookie por nome (fbp, fbc)
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  // Capturar fbc da URL (Meta passa fbclid em links)
  function getFbcFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var fbclid = params.get('fbclid');
    if (!fbclid) return null;
    // Formato fbc: fb.1.{timestamp}.{fbclid}
    return 'fb.1.' + Date.now() + '.' + fbclid;
  }

  // Disparar evento server-side
  function sendCapi(eventName, eventId, contentName, contentCategory) {
    // Sem consentimento de publicidade, NÃO envia. O gate de consentimento do GTM só
    // vale para o navegador; o server-side passaria por fora dele e mandaria IP,
    // user-agent e cookies _fbp/_fbc de quem nunca aceitou — num site de saúde, dado
    // sensível por inferência (LGPD Art. 11). Fonte da verdade: /assets/consent.js.
    // Fail-closed de propósito: se o consent.js não carregou, não envia.
    if (typeof window.temConsentimentoPublicidade !== 'function' || !window.temConsentimentoPublicidade()) {
      return;
    }

    // Não bloqueia navegação — usa keepalive
    try {
      var payload = {
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        content_name: contentName,
        content_category: contentCategory,
        fbp: getCookie('_fbp'),
        fbc: getCookie('_fbc') || getFbcFromUrl(),
      };

      fetch('/api/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true, // crucial pra clique em link que navega pra outra URL
      }).then(function(r) {
        if (!r.ok && window.console) {
          console.warn('[CAPI client] /api/capi returned', r.status);
        }
      }).catch(function(e) {
        if (window.console) console.warn('[CAPI client] error', e);
      });
    } catch (e) {
      if (window.console) console.warn('[CAPI client] exception', e);
    }
  }

  // Escutar dataLayer pushes
  function setupListener() {
    window.dataLayer = window.dataLayer || [];

    var originalPush = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function() {
      var result = originalPush.apply(window.dataLayer, arguments);

      // Processar cada arg pushed
      for (var i = 0; i < arguments.length; i++) {
        var item = arguments[i];
        if (item && typeof item === 'object' && item.event && EVENT_MAP[item.event]) {
          // Skip se advanced-matching já enviou CAPI com PII (evita duplicar)
          if (item.am_enriched === true) continue;

          var metaEvent = EVENT_MAP[item.event];
          // event_id já no item, ou gerar novo
          var eventId = item.event_id || genEventId();
          // Sincronizar com browser pixel: anexar event_id ao item pra GTM tag usar
          if (!item.event_id) {
            item.event_id = eventId;
          }
          // Disparar Meta evento principal (Lead/Contact) via CAPI
          sendCapi(metaEvent, eventId, item.content_name, item.content_category);
        }
      }
      return result;
    };
  }

  // Inicializar quando DOM pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupListener);
  } else {
    setupListener();
  }
})();

// ── Roteamento de WhatsApp por origem de tráfego ──────────────────────────────
// Tráfego PAGO (Google/Meta Ads) deve cair no número Cloud API (9191) para ativar
// a atribuição automática + atendimento do assistente virtual. Tráfego ORGÂNICO
// segue no 9396 (recepção humana, no celular). Detecta pago por gclid/fbclid/utm
// e persiste em sessionStorage (o paciente pode navegar entre páginas antes de
// clicar). Reescreve os links wa.me em runtime — sem tocar nas 17 landing pages.
//
// ⚠️ DESLIGADO por padrão. Só vire `true` DEPOIS que o nome de exibição do 9191
//    estiver APROVADO na Meta — senão o lead pago vê um número sem nome (pior que
//    o 9396). Hoje o nome do 9191 está REJEITADO.
(function whatsappSourceRouting() {
  'use strict';
  var PAID_ROUTING_ENABLED = false;          // ← vire true quando o nome do 9191 for aprovado
  var WA_HUMANO = '5537998419396';           // 9396 — recepção humana (orgânico/ligação)
  var WA_API = '5537991039191';              // 9191 — Cloud API (tráfego pago)
  if (!PAID_ROUTING_ENABLED) return;

  function params() { try { return new URLSearchParams(window.location.search); } catch (e) { return new URLSearchParams(''); } }
  function isPaidUrl(qs) {
    if (qs.get('gclid') || qs.get('gbraid') || qs.get('wbraid') || qs.get('fbclid')) return true;
    var src = (qs.get('utm_source') || '').toLowerCase();
    if (['google', 'adwords', 'meta', 'facebook', 'fb', 'instagram', 'ig'].indexOf(src) !== -1) return true;
    var med = (qs.get('utm_medium') || '').toLowerCase();
    return ['cpc', 'ppc', 'paid', 'paidsocial', 'paid_social'].indexOf(med) !== -1;
  }
  function sourceTag(qs) {
    var src = qs.get('utm_source') || (qs.get('gclid') ? 'google' : (qs.get('fbclid') ? 'meta' : ''));
    return [src, qs.get('utm_campaign')].filter(Boolean).join(' / ');
  }
  // Pura: troca o número humano pelo da API e anexa a origem ao texto (ajuda a
  // atribuição do Google, que não gera o referral da Meta). Só age em link humano.
  function routeWaHref(href, tag) {
    if (!href || href.indexOf('wa.me/' + WA_HUMANO) === -1) return href;
    var out = href.replace(WA_HUMANO, WA_API);
    if (tag && out.indexOf('text=') !== -1) out += encodeURIComponent('\n\n[origem: ' + tag + ']');
    return out;
  }

  var qs = params();
  try {
    if (isPaidUrl(qs) && !sessionStorage.getItem('paidSource')) {
      sessionStorage.setItem('paidSource', '1');
      var t = sourceTag(qs);
      if (t) sessionStorage.setItem('paidTag', t);
    }
  } catch (e) {}

  var paid;
  try { paid = sessionStorage.getItem('paidSource') === '1'; } catch (e) { paid = isPaidUrl(qs); }
  if (!paid) return;
  var tag = '';
  try { tag = sessionStorage.getItem('paidTag') || ''; } catch (e) {}

  function rewriteAll() {
    var links = document.querySelectorAll('a[href*="wa.me/' + WA_HUMANO + '"]');
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute('href', routeWaHref(links[i].getAttribute('href'), tag));
      links[i].setAttribute('data-wa-routed', 'paid');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rewriteAll);
  else rewriteAll();
  setTimeout(rewriteAll, 300);  // re-aplica p/ links injetados tarde

  // Cobre links wa.me criados em runtime (ex.: respostas do chatbot, que só
  // aparecem na interação). rewriteAll é idempotente — só age em link humano.
  if (window.MutationObserver && document.body) {
    new MutationObserver(rewriteAll).observe(document.body, { childList: true, subtree: true });
  }
})();
