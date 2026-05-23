(function () {
  if (window.__tadChatLoaded) return;
  window.__tadChatLoaded = true;

  const SYSTEM_PROMPT = `Você é o assistente virtual do Dr. Kleber Rangel, ortopedista da Clínica Trate a Dor / Dr. Kleber Rangel, ortopedista em Divinópolis-MG (CRM-MG 68724).

FUNÇÃO: Responder dúvidas simples de pacientes leigos sobre dor ortopédica. Seu objetivo é educar, orientar com segurança e reduzir ansiedade — não vender consulta de forma agressiva.

TEMAS PERMITIDOS: coluna, joelho, ombro, medicina regenerativa ortopédica, funcionamento da consulta.

REGRAS OBRIGATÓRIAS:
1. Respostas curtas — máximo 4 linhas.
2. Linguagem simples, sem termos médicos difíceis.
3. NUNCA faça diagnóstico.
4. NUNCA prescreva medicamentos ou doses.
5. NUNCA interprete exames.
6. NUNCA indique procedimento (infiltração, PRP, BMA, bloqueio, cirurgia).
7. NUNCA prometa cura ou regeneração de cartilagem.
8. NUNCA diga "evita cirurgia".
9. NUNCA use medo para convencer.
10. Responda APENAS em português brasileiro.

SINAIS DE ALERTA — se paciente relatar qualquer um, oriente urgência:
- perda de força progressiva
- perda de controle da urina ou fezes
- dormência na região íntima
- febre com dor na coluna
- trauma importante
- dor intensa e progressiva
- dificuldade súbita para andar
- câncer prévio com dor nova forte

Resposta para alerta: "Pelos sinais que você descreveu, o mais seguro é procurar atendimento médico com urgência. Esse tipo de situação precisa ser avaliado presencialmente."

QUANDO ENCAMINHAR PARA O WHATSAPP:
- quiser agendar consulta
- perguntar preço
- quiser enviar exame
- caso individual complexo
- perguntar se precisa de procedimento
- demonstrar ansiedade importante

Resposta padrão ao encaminhar: "Para te orientar com segurança, a equipe pode ajudar diretamente pelo WhatsApp. → [Falar com a equipe](https://wa.me/5537998419396?text=Olá, vim pelo chat do site e gostaria de falar com a equipe.)"

RESPOSTAS PADRÃO:
- Preço da consulta: "A equipe pode informar o valor pelo WhatsApp. A consulta é particular e inclui avaliação médica, exame físico, análise dos exames e plano individualizado."
- PRP/BMA/infiltração (preço ou se funciona): "O valor e a indicação dependem do diagnóstico e da avaliação médica. Não existe procedimento indicado sem consulta."
- Medicina regenerativa: "Pode ser considerada em casos selecionados. Não funciona igual para todos e não deve ser prometida como cura."
- Hérnia de disco: "Nem toda hérnia de disco precisa operar. O tratamento depende dos sintomas, exame físico e exames de imagem."
- Artrose no joelho: "Artrose pode ter controle da dor e melhora de função. O tratamento depende do grau e da avaliação do paciente."
- Dor no ombro: "Dor no ombro pode ser bursite, tendinite, manguito rotador, rigidez ou dor vinda da cervical. O ideal é avaliar a causa antes de tratar."

TOM: claro, calmo, direto, acolhedor, prudente. Sem prometer resultado. Sem forçar consulta.

IDENTIDADE: Você é o assistente virtual do Dr. Kleber. Não substitui o médico. Não fecha diagnóstico. Orienta com clareza e segurança.`;

  const CSS = `
#tad-btn{position:fixed;bottom:130px;right:20px;width:50px;height:50px;background:#0B2444;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(11,36,68,.3);display:flex;align-items:center;justify-content:center;z-index:8500;transition:transform .2s}
#tad-btn:hover{transform:scale(1.08)}
#tad-btn:focus-visible{outline:3px solid #C8A96A;outline-offset:3px}
#tad-btn svg{width:24px;height:24px;fill:white}
#tad-win{position:fixed;bottom:182px;right:16px;width:330px;max-height:440px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.15);display:none;flex-direction:column;z-index:8499;overflow:hidden;font-family:Arial,sans-serif}
#tad-win.open{display:flex}
#tad-hdr{background:#0B2444;color:white;padding:.75rem .85rem;display:flex;align-items:center;gap:.55rem;min-height:52px}
#tad-hdr .av{width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,0.3)}
#tad-hdr .inf{flex:1}
#tad-hdr .inf strong{display:block;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tad-hdr .inf span{font-size:.7rem;opacity:.85}
#tad-x{background:none;border:none;color:rgba(255,255,255,.85);font-size:1.1rem;cursor:pointer;padding:.25rem .4rem;line-height:1;border-radius:4px}
#tad-x:hover,#tad-x:focus-visible{color:white;background:rgba(255,255,255,0.15);outline:none}
#tad-msgs{flex:1;overflow-y:auto;padding:.85rem;display:flex;flex-direction:column;gap:.65rem;background:#f8f8f6}
.tm{max-width:86%;padding:.55rem .85rem;border-radius:12px;font-size:.845rem;line-height:1.55}
.tm.bot{background:white;border:1px solid #e0e0e0;color:#1a1a1a;align-self:flex-start;border-radius:4px 12px 12px 12px}
.tm.usr{background:#0B2444;color:white;align-self:flex-end;border-radius:12px 4px 12px 12px}
.tm.bot a{display:inline-block;background:#1C7A3F;color:white;padding:.3rem .75rem;border-radius:5px;text-decoration:none;font-size:.78rem;font-weight:700;margin-top:.35rem}
.tm.bot a:focus-visible{outline:2px solid #0B2444;outline-offset:2px}
#tad-qs{display:flex;flex-wrap:wrap;gap:.35rem;padding:0 .85rem .5rem;background:#f8f8f6}
.tq{background:white;border:1px solid #1E6FBF;color:#1E6FBF;padding:.28rem .6rem;border-radius:20px;font-size:.74rem;cursor:pointer;font-family:Arial,sans-serif;transition:background .15s,color .15s;white-space:nowrap}
.tq:hover,.tq:focus-visible{background:#1E6FBF;color:white;outline:none}
#tad-row{display:flex;padding:.65rem;gap:.45rem;background:white;border-top:1px solid #e0e0e0;align-items:center}
#tad-lbl{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
#tad-inp{flex:1;border:1px solid #c0c0c0;border-radius:20px;padding:.45rem .85rem;font-size:.845rem;font-family:Arial,sans-serif;outline:none;color:#1a1a1a}
#tad-inp:focus{border-color:#1E6FBF;box-shadow:0 0 0 2px rgba(30,111,191,0.2)}
#tad-snd{background:#0B2444;border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background .15s}
#tad-snd:hover,#tad-snd:focus-visible{background:#1E6FBF;outline:none}
#tad-snd svg{width:14px;height:14px;fill:white}
#tad-foot{text-align:center;font-size:.7rem;color:#777;padding:.35rem;background:white;border-top:1px solid #f0f0f0}
@media(prefers-reduced-motion:reduce){#tad-btn{transition:none}#tad-btn:hover{transform:none}.tq,#tad-snd{transition:none}}
@media(max-width:640px){#tad-btn{bottom:130px;right:auto;left:16px;width:44px;height:44px}#tad-win{bottom:182px;left:8px;right:auto;width:calc(100vw - 16px);max-height:48vh}}`;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML('beforeend', `
<button id="tad-btn" type="button" aria-label="Dr. Kleber Responde — abrir assistente virtual" aria-expanded="false" aria-controls="tad-win" aria-haspopup="dialog">
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><title>Chat</title><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
</button>
<div id="tad-win" role="dialog" aria-modal="false" aria-labelledby="tad-title" aria-describedby="tad-foot" hidden>
  <div id="tad-hdr">
    <div class="av"><img src="/assets/dr-kleber-avatar-80.webp" alt="" width="36" height="36" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none';this.parentNode.textContent='KR'"></div>
    <div class="inf"><strong id="tad-title">Dr. Rangel Responde</strong><span>Assistente do Dr. Kleber · Informativo</span></div>
    <button id="tad-x" type="button" aria-label="Fechar assistente">✕</button>
  </div>
  <div id="tad-msgs" role="log" aria-live="polite" aria-atomic="false"></div>
  <div id="tad-qs">
    <button class="tq" type="button" data-q="Tenho dor na coluna">Dor na coluna</button>
    <button class="tq" type="button" data-q="Tenho dor no joelho">Dor no joelho</button>
    <button class="tq" type="button" data-q="Tenho dor no ombro">Dor no ombro</button>
    <button class="tq" type="button" data-q="Como funciona a consulta?">Como funciona</button>
    <button class="tq" type="button" data-q="Quero agendar uma consulta">Agendar</button>
  </div>
  <div id="tad-row">
    <label id="tad-lbl" for="tad-inp">Sua dúvida para o assistente</label>
    <input id="tad-inp" type="text" placeholder="Digite sua dúvida..." maxlength="300" autocomplete="off"/>
    <button id="tad-snd" type="button" aria-label="Enviar mensagem"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><title>Enviar</title><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
  </div>
  <div id="tad-foot">Informativo — não substitui consulta médica</div>
</div>`);

  let history = [];
  let open = false;
  let init = false;
  let lastFocus = null;
  const btn = document.getElementById('tad-btn');
  const win = document.getElementById('tad-win');
  const msgs = document.getElementById('tad-msgs');
  const inp = document.getElementById('tad-inp');
  const qs = document.getElementById('tad-qs');
  const closeBtn = document.getElementById('tad-x');

  function setOpen(value) {
    open = value;
    win.classList.toggle('open', open);
    if (open) {
      win.removeAttribute('hidden');
    } else {
      win.setAttribute('hidden', '');
    }
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      lastFocus = document.activeElement;
      if (!init) {
        init = true;
        addMsg('bot', 'Olá! Aqui é o assistente do Dr. Kleber Rangel. Posso te ajudar com dúvidas sobre dor na coluna, joelho, ombro e tratamentos ortopédicos. As respostas são educativas e não substituem uma consulta médica.');
      }
      setTimeout(function () { inp.focus(); }, 50);
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  btn.addEventListener('click', function () { setOpen(!open); });
  closeBtn.addEventListener('click', function () { setOpen(false); });
  document.getElementById('tad-snd').addEventListener('click', send);

  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) { setOpen(false); }
  });

  // focus trap: shift+tab from first focusable wraps to last and vice-versa
  win.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !open) return;
    const focusable = win.querySelectorAll('button, input, a[href]');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  qs.addEventListener('click', function (e) {
    const target = e.target.closest('button[data-q]');
    if (!target) return;
    qs.style.display = 'none';
    inp.value = target.getAttribute('data-q');
    send();
  });

  function addMsg(role, text) {
    const d = document.createElement('div');
    d.className = 'tm ' + role;
    d.innerHTML = text
      .replace(/\[(.*?)\]\((.*?)\)/g, function (_m, label, url) {
        return '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + escapeText(label) + '</a>';
      })
      .replace(/\n/g, '<br>');
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function escapeAttr(s) {
    // only allow http(s), tel, mailto schemes
    const url = String(s).trim();
    if (!/^(https?:|tel:|mailto:)/i.test(url)) return '#';
    return escapeText(url);
  }

  function send() {
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    addMsg('usr', escapeText(text));
    history.push({ role: 'user', content: text });
    const typing = addMsg('bot', '...');
    typing.style.opacity = '0.4';

    setTimeout(function () {
      typing.remove();
      const q = text.toLowerCase();
      const wa = '[Falar com a equipe no WhatsApp](https://wa.me/5537998419396?text=Ol%C3%A1%2C%20vim%20pelo%20chat%20do%20site%20e%20gostaria%20de%20falar%20com%20a%20equipe.)';
      let reply;
      if (/(perda de for|urin|fezes|dorm[êe]ncia|febre|trauma|n[ãa]o consigo andar|c[âa]ncer)/.test(q)) {
        reply = 'Pelos sinais que você descreveu, o mais seguro é procurar atendimento médico com urgência. Esse tipo de situação precisa ser avaliado presencialmente. ' + wa;
      } else if (/(agendar|marcar|agenda|hor[áa]rio|pre[çc]o|valor|quanto custa|exame)/.test(q)) {
        reply = 'A consulta é particular e inclui avaliação médica, exame físico, análise dos exames e plano individualizado. Para valores e agendamento, a equipe ajuda diretamente. ' + wa;
      } else if (/(coluna|h[ée]rnia|lombar|ci[áa]tic|disco|lombalgia)/.test(q)) {
        reply = 'Nem toda dor na coluna ou hérnia de disco precisa de cirurgia. O tratamento depende dos sintomas, do exame físico e dos exames de imagem — por isso a avaliação presencial é o primeiro passo.';
      } else if (/(joelho|artrose|menisco|cartilagem)/.test(q)) {
        reply = 'Dor no joelho e artrose podem ter controle da dor e melhora de função. A conduta depende do grau e da avaliação individual — não indico tratamento sem consulta.';
      } else if (/(ombro|manguito|bursite|tendinite)/.test(q)) {
        reply = 'Dor no ombro pode ser bursite, tendinite, lesão do manguito rotador, rigidez ou dor vinda da coluna cervical. O ideal é avaliar a causa antes de tratar.';
      } else if (/(regenerativ|prp|oz[ôo]nio|ozonio|bma|infiltra|ortobiol)/.test(q)) {
        reply = 'Medicina regenerativa (PRP, BMA, ozônio) pode ser considerada em casos selecionados. A indicação depende do diagnóstico e da avaliação médica — não existe procedimento indicado sem consulta.';
      } else if (/(como funciona|consulta|atende|atendimento|primeira vez)/.test(q)) {
        reply = 'A consulta é particular, com tempo para ouvir sua história, exame físico, análise dos exames e um plano individualizado. ' + wa;
      } else {
        reply = 'Posso ajudar com dúvidas gerais sobre dor na coluna, joelho, ombro e tratamentos. Para o seu caso específico, o ideal é uma avaliação presencial. ' + wa;
      }
      addMsg('bot', reply);
      history.push({ role: 'assistant', content: reply });
      if (history.length > 16) history = history.slice(-16);
    }, 500);
  }
})();
