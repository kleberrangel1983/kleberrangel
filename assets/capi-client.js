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
