(function() {
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
#tad-btn svg{width:24px;height:24px;fill:white}
#tad-win{position:fixed;bottom:182px;right:16px;width:330px;max-height:440px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.15);display:none;flex-direction:column;z-index:8499;overflow:hidden;font-family:Arial,sans-serif}
#tad-win.open{display:flex}
#tad-hdr{background:#0B2444;color:white;padding:.75rem .85rem;display:flex;align-items:center;gap:.55rem;min-height:52px}
#tad-hdr .av{width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,0.3)}
#tad-hdr .inf{flex:1}
#tad-hdr .inf strong{display:block;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tad-hdr .inf span{font-size:.68rem;opacity:.7}
#tad-x{background:none;border:none;color:rgba(255,255,255,.7);font-size:1.1rem;cursor:pointer;padding:0;line-height:1}
#tad-x:hover{color:white}
#tad-msgs{flex:1;overflow-y:auto;padding:.85rem;display:flex;flex-direction:column;gap:.65rem;background:#f8f8f6}
.tm{max-width:86%;padding:.55rem .85rem;border-radius:12px;font-size:.845rem;line-height:1.55}
.tm.bot{background:white;border:1px solid #e0e0e0;color:#1a1a1a;align-self:flex-start;border-radius:4px 12px 12px 12px}
.tm.usr{background:#0B2444;color:white;align-self:flex-end;border-radius:12px 4px 12px 12px}
.tm.bot a{display:inline-block;background:#25D366;color:white;padding:.3rem .75rem;border-radius:5px;text-decoration:none;font-size:.78rem;font-weight:700;margin-top:.35rem}
#tad-qs{display:flex;flex-wrap:wrap;gap:.35rem;padding:0 .85rem .5rem;background:#f8f8f6}
.tq{background:white;border:1px solid #1E6FBF;color:#1E6FBF;padding:.28rem .6rem;border-radius:20px;font-size:.74rem;cursor:pointer;font-family:Arial,sans-serif;transition:background .15s,color .15s;white-space:nowrap}
.tq:hover{background:#1E6FBF;color:white}
#tad-row{display:flex;padding:.65rem;gap:.45rem;background:white;border-top:1px solid #e0e0e0}
#tad-inp{flex:1;border:1px solid #e0e0e0;border-radius:20px;padding:.45rem .85rem;font-size:.845rem;font-family:Arial,sans-serif;outline:none}
#tad-inp:focus{border-color:#1E6FBF}
#tad-snd{background:#0B2444;border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background .15s}
#tad-snd:hover{background:#1E6FBF}
#tad-snd svg{width:14px;height:14px;fill:white}
#tad-foot{text-align:center;font-size:.65rem;color:#bbb;padding:.35rem;background:white;border-top:1px solid #f0f0f0}
@media(max-width:640px){#tad-btn{bottom:130px;right:auto;left:16px;width:44px;height:44px}#tad-win{bottom:182px;left:8px;right:auto;width:calc(100vw - 16px);max-height:48vh}}`;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML('beforeend', `
<button id="tad-btn" aria-label="Dr. Kleber Responde — falar com assistente">
  <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
</button>
<div id="tad-win" role="dialog" aria-label="Dr. Kleber Responde — assistente virtual">
  <div id="tad-hdr">
    <div class="av"><img src="/assets/dr-kleber-avatar-80.webp" alt="Dr. Kleber" width="36" height="36" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none';this.parentNode.innerHTML='KR'"></div>
    <div class="inf"><strong>Dr. Rangel Responde</strong><span>Assistente do Dr. Kleber · Informativo</span></div>
    <button id="tad-x" aria-label="Fechar">✕</button>
  </div>
  <div id="tad-msgs"></div>
  <div id="tad-qs">
    <button class="tq" onclick="tadQ('Tenho dor na coluna')">Dor na coluna</button>
    <button class="tq" onclick="tadQ('Tenho dor no joelho')">Dor no joelho</button>
    <button class="tq" onclick="tadQ('Tenho dor no ombro')">Dor no ombro</button>
    <button class="tq" onclick="tadQ('Como funciona a consulta?')">Como funciona</button>
    <button class="tq" onclick="tadQ('Quero agendar uma consulta')">Agendar</button>
  </div>
  <div id="tad-row">
    <input id="tad-inp" type="text" placeholder="Digite sua dúvida..." maxlength="300"/>
    <button id="tad-snd" aria-label="Enviar"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
  </div>
  <div id="tad-foot">Informativo — não substitui consulta médica</div>
</div>`);

  let history = [], open = false, init = false;
  const btn = document.getElementById('tad-btn');
  const win = document.getElementById('tad-win');
  const msgs = document.getElementById('tad-msgs');
  const inp = document.getElementById('tad-inp');
  const qs = document.getElementById('tad-qs');

  btn.addEventListener('click', function() {
    open = !open;
    win.classList.toggle('open', open);
    if (open && !init) {
      init = true;
      addMsg('bot', 'Olá! Aqui é o assistente do Dr. Kleber Rangel. Posso te ajudar com dúvidas sobre dor na coluna, joelho, ombro e tratamentos ortopédicos. As respostas são educativas e não substituem uma consulta médica.');
    }
    if (open) inp.focus();
  });

  document.getElementById('tad-x').addEventListener('click', function() {
    open = false; win.classList.remove('open');
  });
  document.getElementById('tad-snd').addEventListener('click', send);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  function addMsg(role, text) {
    const d = document.createElement('div');
    d.className = 'tm ' + role;
    d.innerHTML = text
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, '<br>');
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  window.tadQ = function(text) {
    if (qs) qs.style.display = 'none';
    inp.value = text;
    send();
  };

  async function send() {
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    addMsg('usr', text);
    history.push({role: 'user', content: text});
    const typing = addMsg('bot', '...');
    typing.style.opacity = '0.4';

    setTimeout(function() {
      typing.remove();
      var q = (text || '').toLowerCase();
      var wa = '[Falar com a equipe no WhatsApp](https://wa.me/5537998419396?text=Ol%C3%A1%2C%20vim%20pelo%20chat%20do%20site%20e%20gostaria%20de%20falar%20com%20a%20equipe.)';
      var reply;
      if (/(perda de for|urin|fezes|dorm[\u00eae]ncia|febre|trauma|n[\u00e3a]o consigo andar|c[\u00e2a]ncer)/.test(q)) {
        reply = 'Pelos sinais que voc\u00ea descreveu, o mais seguro \u00e9 procurar atendimento m\u00e9dico com urg\u00eancia. Esse tipo de situa\u00e7\u00e3o precisa ser avaliado presencialmente. ' + wa;
      } else if (/(agendar|marcar|agenda|hor[\u00e1a]rio|pre[\u00e7c]o|valor|quanto custa|exame)/.test(q)) {
        reply = 'A consulta \u00e9 particular e inclui avalia\u00e7\u00e3o m\u00e9dica, exame f\u00edsico, an\u00e1lise dos exames e plano individualizado. Para valores e agendamento, a equipe ajuda diretamente. ' + wa;
      } else if (/(coluna|h[\u00e9e]rnia|lombar|ci[\u00e1a]tic|disco|lombalgia)/.test(q)) {
        reply = 'Nem toda dor na coluna ou h\u00e9rnia de disco precisa de cirurgia. O tratamento depende dos sintomas, do exame f\u00edsico e dos exames de imagem \u2014 por isso a avalia\u00e7\u00e3o presencial \u00e9 o primeiro passo.';
      } else if (/(joelho|artrose|menisco|cartilagem)/.test(q)) {
        reply = 'Dor no joelho e artrose podem ter controle da dor e melhora de fun\u00e7\u00e3o. A conduta depende do grau e da avalia\u00e7\u00e3o individual \u2014 n\u00e3o indico tratamento sem consulta.';
      } else if (/(ombro|manguito|bursite|tendinite)/.test(q)) {
        reply = 'Dor no ombro pode ser bursite, tendinite, les\u00e3o do manguito rotador, rigidez ou dor vinda da coluna cervical. O ideal \u00e9 avaliar a causa antes de tratar.';
      } else if (/(regenerativ|prp|oz[\u00f4o]nio|ozonio|bma|infiltra|ortobiol)/.test(q)) {
        reply = 'Medicina regenerativa (PRP, BMA, oz\u00f4nio) pode ser considerada em casos selecionados. A indica\u00e7\u00e3o depende do diagn\u00f3stico e da avalia\u00e7\u00e3o m\u00e9dica \u2014 n\u00e3o existe procedimento indicado sem consulta.';
      } else if (/(como funciona|consulta|atende|atendimento|primeira vez)/.test(q)) {
        reply = 'A consulta \u00e9 particular, com tempo para ouvir sua hist\u00f3ria, exame f\u00edsico, an\u00e1lise dos exames e um plano individualizado. ' + wa;
      } else {
        reply = 'Posso ajudar com d\u00favidas gerais sobre dor na coluna, joelho, ombro e tratamentos. Para o seu caso espec\u00edfico, o ideal \u00e9 uma avalia\u00e7\u00e3o presencial. ' + wa;
      }
      addMsg('bot', reply);
      history.push({role: 'assistant', content: reply});
      if (history.length > 16) history = history.slice(-16);
    }, 500);
  }
})();
