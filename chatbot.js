(function() {
  // Evita dupla inicialização
  if (window.__tadChatLoaded) return;
  window.__tadChatLoaded = true;

  const SYSTEM_PROMPT = `Você é o assistente virtual da Clínica Trate a Dor do Dr. Kleber Rangel, ortopedista especialista em dor em Divinópolis-MG (CRM-MG 68724).

Sua função é informar e converter o visitante para agendar uma consulta presencial.

IDENTIDADE E VOZ:
- Direto, claro, honesto. Nunca promete resultado.
- Linguagem acessível, sem jargão desnecessário.
- Tom cálido mas profissional.
- Respostas curtas: máximo 3 parágrafos. Nunca listas longas.

CLÍNICA E MÉDICO:
- Dr. Kleber Rangel: ortopedista, coluna, joelho, ombro, medicina da dor e regenerativa.
- Localização: Divinópolis, MG. Atendimento particular.
- Consulta dura 50-60 minutos. Investigação real, não protocolo genérico.
- Procedimentos: bloqueios guiados por ultrassom, PRP, BMA, ozonioterapia, viscossuplementação.
- WhatsApp para agendamento: (37) 99841-9396
- Horário: Seg–Sex 8h–17h

REGRAS CRÍTICAS:
1. NUNCA faça diagnóstico. Descreva possibilidades, sempre diga que só a avaliação confirma.
2. NUNCA dê dosagem de medicamento ou prescrição.
3. Se dúvida urgente (perda de força, incontinência), oriente buscar pronto-socorro.
4. Quando o paciente demonstrar interesse em consulta, ofereça o WhatsApp.
5. Responda APENAS em português brasileiro.
6. Máximo 150 palavras por resposta.

CONVERSÃO:
Quando perceber interesse real, inclua no final:
"→ Para agendar: [WhatsApp (37) 99841-9396](https://wa.me/5537998419396?text=Olá Dr. Kleber, vim pelo site e gostaria de agendar uma consulta.)"`;

  const CSS = `
#tad-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:#0B2444;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(11,36,68,.35);display:flex;align-items:center;justify-content:center;z-index:9999;transition:transform .2s}
#tad-btn:hover{transform:scale(1.08)}
#tad-btn svg{width:26px;height:26px;fill:white}
#tad-win{position:fixed;bottom:92px;right:24px;width:340px;max-height:500px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);display:none;flex-direction:column;z-index:9998;overflow:hidden;font-family:Arial,sans-serif}
#tad-win.open{display:flex}
#tad-hdr{background:#0B2444;color:white;padding:.85rem 1rem;display:flex;align-items:center;gap:.65rem}
#tad-hdr .av{width:34px;height:34px;background:#1E6FBF;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:700;color:white;flex-shrink:0}
#tad-hdr .inf strong{display:block;font-size:.85rem}
#tad-hdr .inf span{font-size:.68rem;opacity:.7}
#tad-hdr .inf{flex:1}
#tad-x{background:none;border:none;color:rgba(255,255,255,.7);font-size:1.2rem;cursor:pointer;padding:0;line-height:1}
#tad-x:hover{color:white}
#tad-msgs{flex:1;overflow-y:auto;padding:.85rem;display:flex;flex-direction:column;gap:.65rem;background:#f8f8f6}
.tm{max-width:85%;padding:.55rem .85rem;border-radius:12px;font-size:.845rem;line-height:1.5}
.tm.bot{background:white;border:1px solid #e0e0e0;color:#1a1a1a;align-self:flex-start;border-radius:4px 12px 12px 12px}
.tm.usr{background:#0B2444;color:white;align-self:flex-end;border-radius:12px 4px 12px 12px}
.tm.bot a{display:inline-block;background:#25D366;color:white;padding:.35rem .8rem;border-radius:5px;text-decoration:none;font-size:.8rem;font-weight:700;margin-top:.3rem}
#tad-qs{display:flex;flex-wrap:wrap;gap:.35rem;padding:0 .85rem .5rem;background:#f8f8f6}
.tq{background:white;border:1px solid #1E6FBF;color:#1E6FBF;padding:.3rem .65rem;border-radius:20px;font-size:.75rem;cursor:pointer;font-family:Arial,sans-serif;transition:background .15s,color .15s;white-space:nowrap}
.tq:hover{background:#1E6FBF;color:white}
#tad-row{display:flex;padding:.65rem;gap:.45rem;background:white;border-top:1px solid #e0e0e0}
#tad-inp{flex:1;border:1px solid #e0e0e0;border-radius:20px;padding:.45rem .85rem;font-size:.845rem;font-family:Arial,sans-serif;outline:none}
#tad-inp:focus{border-color:#1E6FBF}
#tad-snd{background:#0B2444;border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background .15s}
#tad-snd:hover{background:#1E6FBF}
#tad-snd svg{width:15px;height:15px;fill:white}
#tad-foot{text-align:center;font-size:.65rem;color:#aaa;padding:.35rem;background:white;border-top:1px solid #f0f0f0}
@media(max-width:400px){#tad-win{width:calc(100vw - 20px);right:10px;bottom:80px}#tad-btn{bottom:14px;right:14px}}
`;

  // Injeta CSS
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // Injeta HTML
  document.body.insertAdjacentHTML('beforeend', `
<button id="tad-btn" aria-label="Abrir chat com assistente">
  <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
</button>
<div id="tad-win" role="dialog" aria-label="Chat assistente Trate a Dor">
  <div id="tad-hdr">
    <div class="av">KR</div>
    <div class="inf"><strong>Assistente — Trate a Dor</strong><span>Dr. Kleber Rangel · CRM-MG 68724</span></div>
    <button id="tad-x" aria-label="Fechar chat">✕</button>
  </div>
  <div id="tad-msgs"></div>
  <div id="tad-qs">
    <button class="tq" onclick="tadQ('Tenho dor na coluna')">Dor na coluna</button>
    <button class="tq" onclick="tadQ('Tenho dor no joelho')">Dor no joelho</button>
    <button class="tq" onclick="tadQ('Quero saber sobre PRP')">PRP</button>
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

  btn.addEventListener('click', toggle);
  document.getElementById('tad-x').addEventListener('click', () => { open=false; win.classList.remove('open'); });
  document.getElementById('tad-snd').addEventListener('click', send);
  inp.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} });

  function toggle() {
    open = !open;
    win.classList.toggle('open', open);
    if (open && !init) { init=true; addMsg('bot','Olá! Sou o assistente da Clínica Trate a Dor. Posso ajudar com dúvidas sobre tratamentos, procedimentos ou como funciona a consulta com o Dr. Kleber. Por onde começamos?'); }
    if (open) inp.focus();
  }

  function addMsg(role, text) {
    const d = document.createElement('div');
    d.className = 'tm ' + role;
    d.innerHTML = text.replace(/\[(.*?)\]\((.*?)\)/g,'<a href="$2" target="_blank">$1</a>').replace(/\n/g,'<br>');
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  window.tadQ = function(text) { if(qs) qs.style.display='none'; inp.value=text; send(); };

  async function send() {
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    addMsg('usr', text);
    history.push({role:'user', content:text});
    const typing = addMsg('bot','...');
    typing.style.opacity = '0.5';

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:400,
          system: SYSTEM_PROMPT,
          messages: history
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || 'Desculpe, tive um problema. Fale pelo WhatsApp: (37) 99841-9396';
      typing.remove();
      addMsg('bot', reply);
      history.push({role:'assistant', content:reply});
      if (history.length > 20) history = history.slice(-20);
    } catch(e) {
      typing.remove();
      addMsg('bot','Tive um problema técnico. Fale pelo [WhatsApp (37) 99841-9396](https://wa.me/5537998419396)');
    }
  }
})();
