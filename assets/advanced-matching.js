// /assets/advanced-matching.js
// Modal opcional de captura de nome+phone ANTES do clique no WhatsApp.
//
// Objetivo: subir EMQ do Pixel 877941071024223 de 6.1 → 8+ enviando
// email/phone hashados como user_data quando o paciente preenche.
//
// Princípio: NÃO BLOQUEAR. O modal aparece, mas tem botão grande
// "Ir direto pro WhatsApp" — quem não quer preencher tem experiência
// igual à atual. Quem preencher 1 vez, não vê de novo (localStorage).
//
// Fluxo:
// 1. Usuário clica em link wa.me
// 2. Se PRIMEIRA vez no dispositivo + nunca preencheu: intercepta,
//    abre modal com 2 campos opcionais + 2 botões
// 3. Se já preencheu antes OU pulou: usa dados salvos do localStorage
// 4. Dispara fbq Lead+Contact COM advanced matching (em/ph hashados)
// 5. POST /api/capi com email/phone em texto (server hasheia)
// 6. Redireciona pro wa.me
//
// Sem deps externas. Sem framework. Vanilla JS.

(function() {
  'use strict';

  var STORAGE_KEY = 'drkr_am_v1'; // versão pra invalidar se trocar formato
  var MODAL_ID = 'drkr-am-modal';
  var WHATSAPP_NUMBER = '5537998419396';

  // SHA-256 client-side (pra Advanced Matching no fbq)
  // Implementação minimalista usando Web Crypto API (todos browsers modernos)
  async function sha256(str) {
    if (!str) return null;
    var normalized = String(str).trim().toLowerCase();
    var buf = new TextEncoder().encode(normalized);
    var hashBuf = await crypto.subtle.digest('SHA-256', buf);
    var hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // Normaliza phone BR: remove tudo que não é dígito, garante código país 55
  function normalizePhone(raw) {
    if (!raw) return null;
    var digits = String(raw).replace(/\D/g, '');
    if (digits.length === 11) digits = '55' + digits;        // (37) 99841-9396 → 5537998419396
    else if (digits.length === 10) digits = '55' + digits;   // (37) 9841-9396 → 553798419396
    else if (digits.length === 13 && digits.startsWith('55')) ; // já está ok
    else if (digits.length < 10) return null;                // muito curto, descartar
    return digits;
  }

  // Capitaliza primeira letra de cada palavra (pra exibição apenas)
  function titleCase(s) {
    if (!s) return '';
    return s.toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  // Lê dados salvos do localStorage
  function getStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      // Validar shape mínimo
      if (typeof parsed !== 'object') return null;
      return parsed;
    } catch (e) { return null; }
  }

  // Salva dados no localStorage
  function setStored(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* localStorage indisponível, segue sem persistir */ }
  }

  // Marca que usuário pulou — não mostrar modal de novo neste device
  function markSkipped() {
    setStored({ skipped: true, t: Date.now() });
  }

  // Verifica se deve mostrar o modal (primeira vez no device)
  function shouldShowModal() {
    var stored = getStored();
    return !stored; // se já tem qualquer coisa (preenchido OU pulado), não mostra
  }

  // Hasheia dados pra fbq advanced matching
  async function hashUserData(name, phone) {
    var first_name = name ? name.trim().split(/\s+/)[0] : null;
    var last_name_arr = name ? name.trim().split(/\s+/).slice(1) : [];
    var last_name = last_name_arr.length > 0 ? last_name_arr.join(' ') : null;
    var phone_normalized = normalizePhone(phone);

    var result = {};
    if (first_name) result.fn = await sha256(first_name);
    if (last_name) result.ln = await sha256(last_name);
    if (phone_normalized) result.ph = await sha256(phone_normalized);
    return result;
  }

  // Dispara eventos pro Pixel + CAPI server-side com PII
  // contentName/contentCategory: opcionais — se vier de onclick inline, preserva
  async function fireEnrichedEvents(name, phone, destinationUrl, contentName, contentCategory) {
    var eventId = 'evt_am_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 11);
    var finalContentName = contentName || 'WhatsApp Click (Enhanced)';
    var finalContentCategory = contentCategory || 'CTA';

    // 1. Advanced Matching no Pixel: re-init com user_data
    try {
      if (typeof fbq === 'function') {
        var userData = await hashUserData(name, phone);
        // Re-init pixel com user_data — sobrescreve init original pra esse evento
        fbq('init', '877941071024223', userData);
        // Disparar Lead+Contact com eventID pra dedup com CAPI server
        fbq('track', 'Lead', {
          content_name: finalContentName,
          content_category: finalContentCategory
        }, { eventID: eventId });
        fbq('track', 'Contact', {}, { eventID: eventId });
      }
    } catch (e) {
      if (window.console) console.warn('[AM] fbq error', e);
    }

    // 2. dataLayer push (GA4 + outras tags GTM)
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'whatsapp_click',
        event_id: eventId,
        content_name: finalContentName,
        content_category: finalContentCategory,
        am_enriched: true // sinal pra audit: este evento tem advanced matching
      });
    } catch (e) {}

    // 3. CAPI server-side com PII em claro (servidor hasheia)
    try {
      var phoneClean = normalizePhone(phone);
      var nameParts = name ? name.trim().split(/\s+/) : [];
      var payload = {
        event_name: 'Lead',
        event_id: eventId,
        event_source_url: window.location.href,
        content_name: finalContentName,
        content_category: finalContentCategory,
        first_name: nameParts[0] || undefined,
        last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined,
        phone: phoneClean || undefined,
        fbp: getCookie('_fbp'),
        fbc: getCookie('_fbc') || getFbcFromUrl(),
      };
      fetch('/api/capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function(){});
    } catch (e) {}
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function getFbcFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var fbclid = params.get('fbclid');
      if (!fbclid) return null;
      return 'fb.1.' + Date.now() + '.' + fbclid;
    } catch (e) { return null; }
  }

  // Constrói URL de WhatsApp com nome pré-preenchido se disponível
  function buildWaUrl(originalHref, name) {
    try {
      var url = new URL(originalHref);
      var text = url.searchParams.get('text') || '';
      if (name && !text.includes(name.split(' ')[0])) {
        var greeting = 'Olá! Sou ' + titleCase(name.split(' ')[0]) + '. ';
        if (text) text = greeting + text;
        else text = greeting + 'Gostaria de agendar uma avaliação com o Dr. Kleber.';
        url.searchParams.set('text', text);
      }
      return url.toString();
    } catch (e) {
      return originalHref;
    }
  }

  // CSS injetado uma vez
  function injectStyles() {
    if (document.getElementById('drkr-am-styles')) return;
    var style = document.createElement('style');
    style.id = 'drkr-am-styles';
    style.textContent = '\
#' + MODAL_ID + '{position:fixed;inset:0;background:rgba(28,28,28,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity 0.2s ease;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,sans-serif;}\
#' + MODAL_ID + '.open{opacity:1;}\
#' + MODAL_ID + ' .drkr-am-box{background:#fff;border-radius:16px;max-width:420px;width:100%;padding:28px 24px;box-shadow:0 24px 80px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);}\
#' + MODAL_ID + '.open .drkr-am-box{transform:translateY(0);}\
#' + MODAL_ID + ' .drkr-am-title{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.5rem;font-weight:700;color:#1C1C1C;margin:0 0 6px 0;line-height:1.2;}\
#' + MODAL_ID + ' .drkr-am-sub{font-size:0.85rem;color:#666;margin:0 0 18px 0;line-height:1.4;}\
#' + MODAL_ID + ' .drkr-am-field{margin-bottom:12px;}\
#' + MODAL_ID + ' .drkr-am-label{display:block;font-size:0.75rem;color:#444;margin-bottom:4px;font-weight:500;}\
#' + MODAL_ID + ' .drkr-am-input{width:100%;padding:10px 12px;border:1.5px solid #E5E5E5;border-radius:8px;font-size:0.95rem;font-family:inherit;background:#FAFAFA;transition:border-color 0.15s;}\
#' + MODAL_ID + ' .drkr-am-input:focus{outline:none;border-color:#25D366;background:#fff;}\
#' + MODAL_ID + ' .drkr-am-actions{display:flex;flex-direction:column;gap:10px;margin-top:18px;}\
#' + MODAL_ID + ' .drkr-am-btn-primary{background:#25D366;color:#fff;border:none;padding:14px 18px;border-radius:10px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;}\
#' + MODAL_ID + ' .drkr-am-btn-primary:hover{background:#1DA851;}\
#' + MODAL_ID + ' .drkr-am-btn-secondary{background:transparent;color:#666;border:none;padding:10px;font-size:0.85rem;cursor:pointer;font-family:inherit;text-decoration:underline;}\
#' + MODAL_ID + ' .drkr-am-btn-secondary:hover{color:#1C1C1C;}\
#' + MODAL_ID + ' .drkr-am-privacy{font-size:0.7rem;color:#999;text-align:center;margin-top:14px;line-height:1.4;}\
';
    document.head.appendChild(style);
  }

  // Mostra modal e retorna Promise com {action, name, phone}
  function showModal(originalHref) {
    return new Promise(function(resolve) {
      injectStyles();

      var overlay = document.createElement('div');
      overlay.id = MODAL_ID;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'drkr-am-title-text');
      overlay.innerHTML = '\
<div class="drkr-am-box">\
<h2 id="drkr-am-title-text" class="drkr-am-title">Antes de abrir o WhatsApp</h2>\
<p class="drkr-am-sub">Se preferir, deixe seu nome e telefone — a Maysa, da nossa equipe, já te chama pelo nome. <strong>Opcional.</strong></p>\
<div class="drkr-am-field">\
<label class="drkr-am-label" for="drkr-am-name">Nome</label>\
<input id="drkr-am-name" class="drkr-am-input" type="text" placeholder="Como você gosta de ser chamado(a)" autocomplete="given-name">\
</div>\
<div class="drkr-am-field">\
<label class="drkr-am-label" for="drkr-am-phone">WhatsApp</label>\
<input id="drkr-am-phone" class="drkr-am-input" type="tel" placeholder="(37) 99999-9999" autocomplete="tel" inputmode="tel">\
</div>\
<div class="drkr-am-actions">\
<button type="button" class="drkr-am-btn-primary" id="drkr-am-submit">Conversar no WhatsApp</button>\
<button type="button" class="drkr-am-btn-secondary" id="drkr-am-skip">Pular e ir direto</button>\
</div>\
<p class="drkr-am-privacy">Seus dados são usados apenas para o contato com a clínica. Veja a <a href="/politica-privacidade.html" style="color:#666;">política de privacidade</a>.</p>\
</div>';

      document.body.appendChild(overlay);

      // Animar entrada
      requestAnimationFrame(function() {
        overlay.classList.add('open');
      });

      var nameInput = overlay.querySelector('#drkr-am-name');
      var phoneInput = overlay.querySelector('#drkr-am-phone');
      var submitBtn = overlay.querySelector('#drkr-am-submit');
      var skipBtn = overlay.querySelector('#drkr-am-skip');

      // Focar primeiro campo
      setTimeout(function() { try { nameInput.focus(); } catch (e) {} }, 250);

      function cleanup() {
        overlay.classList.remove('open');
        setTimeout(function() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
      }

      function handleSubmit() {
        var name = (nameInput.value || '').trim();
        var phone = (phoneInput.value || '').trim();
        cleanup();
        resolve({ action: 'submit', name: name, phone: phone });
      }

      function handleSkip() {
        cleanup();
        resolve({ action: 'skip' });
      }

      submitBtn.addEventListener('click', handleSubmit);
      skipBtn.addEventListener('click', handleSkip);

      // Enter no input → submit
      [nameInput, phoneInput].forEach(function(el) {
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        });
      });

      // ESC → skip
      overlay.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          handleSkip();
        }
      });

      // Click fora da box → skip
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) handleSkip();
      });
    });
  }

  // Handler de clique interceptado
  async function onWaClick(e, link) {
    // Antes de prevenir o clique padrão: capturar content_name de qualquer
    // onclick inline (em pages como prp.html, ombro.html, medicina-regenerativa.html etc.
    // o onclick faz dataLayer.push com content_name granular tipo "PRP Hero",
    // "Ombro Floating" etc — esse sinal é valioso e precisa ser preservado).
    var inlineContentName = null;
    var inlineContentCategory = null;
    try {
      var onclickAttr = link.getAttribute('onclick');
      if (onclickAttr) {
        // Tentar extrair content_name do código do onclick sem executá-lo
        // (executá-lo dispararia outro dataLayer.push duplicado)
        var nameMatch = onclickAttr.match(/content_name\s*:\s*['"]([^'"]+)['"]/);
        var catMatch = onclickAttr.match(/content_category\s*:\s*['"]([^'"]+)['"]/);
        if (nameMatch) inlineContentName = nameMatch[1];
        if (catMatch) inlineContentCategory = catMatch[1];
      }
    } catch (extractErr) { /* não bloquear se extração falhar */ }

    // Sempre prevenir o clique padrão pra controlar o fluxo
    e.preventDefault();
    e.stopPropagation();

    // Prevenir múltiplos modais abertos simultaneamente
    if (document.getElementById(MODAL_ID)) return;

    var originalHref = link.href;
    var stored = getStored();

    // Caso 1: já tem dados preenchidos antes → usar e dispara enhanced events
    if (stored && stored.name) {
      await fireEnrichedEvents(stored.name, stored.phone, originalHref, inlineContentName, inlineContentCategory);
      // Pequeno delay pra eventos saírem antes da navegação
      setTimeout(function() {
        window.location.href = buildWaUrl(originalHref, stored.name);
      }, 150);
      return;
    }

    // Caso 2: já pulou antes — não mostra modal de novo, comportamento padrão
    if (stored && stored.skipped) {
      // Disparar evento padrão (sem PII) — preservando content_name granular se houver
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'whatsapp_click',
          content_name: inlineContentName || 'WhatsApp Click',
          content_category: inlineContentCategory || 'CTA'
        });
      } catch (e2) {}
      setTimeout(function() {
        window.location.href = originalHref;
      }, 100);
      return;
    }

    // Caso 3: primeira vez — mostra modal
    var result = await showModal(originalHref);

    if (result.action === 'skip') {
      markSkipped();
      // Disparar evento padrão (sem PII) — preservando content_name granular se houver
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'whatsapp_click',
          content_name: inlineContentName || 'WhatsApp Click',
          content_category: inlineContentCategory || 'CTA'
        });
      } catch (e2) {}
      setTimeout(function() {
        window.location.href = originalHref;
      }, 100);
      return;
    }

    // Submit — pode ter dados, pode estar vazio (usuário clicou no botão sem preencher)
    var name = result.name || '';
    var phone = result.phone || '';

    if (name || phone) {
      // Salvar pra próxima
      setStored({ name: name, phone: phone, t: Date.now() });
      await fireEnrichedEvents(name, phone, originalHref, inlineContentName, inlineContentCategory);
      setTimeout(function() {
        window.location.href = buildWaUrl(originalHref, name);
      }, 150);
    } else {
      // Submetido vazio = tratar como skip
      markSkipped();
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'whatsapp_click',
          content_name: inlineContentName || 'WhatsApp Click',
          content_category: inlineContentCategory || 'CTA'
        });
      } catch (e2) {}
      setTimeout(function() {
        window.location.href = originalHref;
      }, 100);
    }
  }

  // Setup global: intercepta todos os cliques em a[href*="wa.me"]
  function setup() {
    // Failsafe: requer Web Crypto API (sha256 client-side)
    // Se navegador não suporta, NÃO interceptar — deixa o clique passar normal
    if (!window.crypto || !window.crypto.subtle) {
      if (window.console) console.warn('[AM] crypto.subtle indisponível, advanced-matching desativado');
      return;
    }

    // Failsafe: requer fetch (pra CAPI)
    if (typeof fetch !== 'function') {
      if (window.console) console.warn('[AM] fetch indisponível, advanced-matching desativado');
      return;
    }

    // Event delegation no document — funciona pra elementos adicionados dinamicamente
    document.addEventListener('click', function(e) {
      try {
        // Achar o <a> mais próximo
        var target = e.target;
        while (target && target !== document) {
          if (target.tagName === 'A' && target.href && target.href.indexOf('wa.me') > -1) {
            onWaClick(e, target);
            return;
          }
          target = target.parentNode;
        }
      } catch (err) {
        // Qualquer erro: NÃO bloquear o clique, deixar comportamento padrão
        if (window.console) console.warn('[AM] click handler error', err);
      }
    }, true); // capture phase pra rodar antes de outros handlers
  }

  // Inicializar quando DOM pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
