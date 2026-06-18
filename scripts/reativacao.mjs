// scripts/reativacao.mjs
// P0 — Gerador de Reativação de Leads Frios ("minerar a pilha morta").
//
// Lê um CSV de leads que perguntaram e sumiram, e para CADA UM gera, via IA:
//   - uma mensagem de WhatsApp personalizada e CFM-segura (reativação, sem pressão)
//   - uma prioridade (alta/media/baixa) pra equipe trabalhar os melhores primeiro
//   - um sinal de red-flag (caso médico urgente → atendimento humano imediato)
//   - um ângulo alternativo + um porquê (1 linha pra equipe)
// Depois escreve um dashboard HTML "1 toque pra enviar" (abre o WhatsApp já com a
// mensagem pronta). Sem Meta Cloud API, sem banco, sem verba de anúncio.
//
// Por que é caixa rápido: reativa gente que você JÁ pagou pra adquirir e que está
// parada na sua caixa de entrada. Mesma verba, mais consultas.
//
// Rodar:
//   export ANTHROPIC_API_KEY=sk-ant-...
//   node scripts/reativacao.mjs scripts/leads.csv
//   # ou puxando os leads direto do Supabase (P1), só os com opt-in e status "novo":
//   node scripts/reativacao.mjs --from-supabase --days=7
//   # teste do pipeline sem gastar token (mensagens stub):
//   node scripts/reativacao.mjs scripts/leads.exemplo.csv --dry
//
// Saída: scripts/reativacao.html (abra no navegador; é local, não vai pro deploy).
// (este diretório scripts/ está no .vercelignore — nada daqui vai a público.)

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MODEL = 'claude-sonnet-4-6'; // boa copy em pt-BR; troque se quiser
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const CONCURRENCY = 5;
const WHATSAPP_CLINICA = '5537998419396'; // só referência; as mensagens vão DA clínica PRO lead

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FROM_SUPABASE = args.includes('--from-supabase');
const daysArg = args.find((a) => a.startsWith('--days='));
const COLD_DAYS = daysArg ? (parseInt(daysArg.split('=')[1], 10) || 0) : 0;
const inputPath = resolve(args.find((a) => !a.startsWith('--')) || 'scripts/leads.csv');
const OUT = join(process.cwd(), 'scripts', 'reativacao.html');

const SYSTEM_PROMPT = `Você escreve UMA mensagem curta de WhatsApp para reativar um lead frio da Clínica Trate a Dor / Dr. Kleber Rangel, ortopedista em Divinópolis-MG (CRM-MG 68724). O lead é alguém que perguntou sobre dor ortopédica e sumiu sem agendar.

OBJETIVO: retomar a conversa de forma humana e acolhedora, reduzir atrito e convidar (sem pressão) para uma avaliação. Você NÃO está vendendo de forma agressiva.

REGRAS OBRIGATÓRIAS (CFM — Res. 2.336/2023):
- NUNCA faça diagnóstico.
- NUNCA prometa cura, regeneração de cartilagem ou resultado.
- NUNCA indique procedimento específico (PRP, BMA, infiltração, bloqueio, cirurgia).
- NUNCA diga "evita cirurgia".
- NUNCA use medo para convencer.
- Sem antes/depois, sem sensacionalismo, sem superlativos ("melhor", "único").
- Responda em português brasileiro.

ESTILO DA MENSAGEM:
- Curta: 2 a 4 linhas, tom de WhatsApp, caloroso e natural — como a Maysa (equipe) escreveria.
- Use só o PRIMEIRO nome da pessoa, de forma natural.
- Personalize pelo que ela perguntou (coluna, joelho, ombro, medicina regenerativa) e pelo tempo decorrido, se houver essa informação.
- CTA suave: oferecer ajuda/avaliação ou retomar a conversa. Nada de "compre agora".
- Cada mensagem deve ser ÚNICA (nada de texto padrão idêntico — evita cara de spam e é mais seguro).

CLASSIFICAÇÃO:
- priority "alta": dor relatada recente + tema de maior valor (ex.: medicina regenerativa) OU sinais claros de intenção de agendar.
- priority "media": interesse real mas vago ou contato mais antigo.
- priority "baixa": contato muito vago, sem dor clara ou muito antigo.
- red_flag true: se a mensagem do lead indicar sinal de alerta (perda de força progressiva, perda de controle de urina/fezes, dormência na região íntima, febre com dor na coluna, trauma importante, dificuldade súbita de andar, câncer prévio com dor nova forte). Nesse caso a "message" deve orientar procurar avaliação com urgência, com cuidado.

reason: 1 linha curta para a equipe (por que essa prioridade / como abordar).
alt_message: um ângulo alternativo da mensagem (ex.: mais educativo vs. mais convite), mesmas regras.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    priority: { type: 'string', enum: ['alta', 'media', 'baixa'] },
    red_flag: { type: 'boolean' },
    message: { type: 'string' },
    alt_message: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['priority', 'red_flag', 'message', 'alt_message', 'reason'],
};

// ── CSV parser mínimo (lida com aspas, vírgulas e quebras dentro de aspas) ──
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  text = text.replace(/^﻿/, ''); // remove BOM
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* ignora */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Detecta colunas por palavra-chave (pt/en), tolerante a CSV bagunçado
function detectColumns(header) {
  const norm = header.map((h) => h.trim().toLowerCase());
  const find = (keys) => {
    for (let i = 0; i < norm.length; i++) if (keys.some((k) => norm[i].includes(k))) return i;
    return -1;
  };
  return {
    name: find(['nome', 'name', 'contato', 'cliente', 'paciente']),
    phone: find(['telefone', 'phone', 'whats', 'celular', 'fone', 'número', 'numero']),
    message: find(['mensagem', 'message', 'última', 'ultima', 'texto', 'pergunta', 'dúvida', 'duvida', 'obs']),
    topic: find(['tema', 'topic', 'assunto', 'tratamento', 'interesse', 'dor']),
    date: find(['data', 'date', 'quando', 'criado']),
    city: find(['cidade', 'city', 'município', 'municipio']),
    source: find(['origem', 'source', 'campanha', 'fonte', 'canal']),
  };
}

// Normaliza telefone BR para o formato do wa.me (55 + DDD + número)
function normalizePhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  d = d.replace(/^0+/, '');
  if (d.length === 13 && d.startsWith('55')) return d;
  if (d.length === 12 && d.startsWith('55')) return d;
  if (d.length === 11 || d.length === 10) return '55' + d;
  if (d.length >= 12 && d.startsWith('55')) return d;
  return d.length >= 10 ? d : null;
}

function firstName(name) {
  return (name || '').trim().split(/\s+/)[0] || '';
}

async function generateForLead(lead) {
  if (DRY) {
    const fn = firstName(lead.name) || 'tudo bem';
    return {
      priority: lead.message && /joelho|coluna|prp|regenerativ/i.test(lead.message) ? 'alta' : 'media',
      red_flag: /perda de for|urin|fezes|febre|trauma|n[ãa]o consigo andar|c[âa]ncer/i.test(lead.message || ''),
      message: `Oi ${fn}! Aqui é da equipe do Dr. Kleber Rangel 🙂 Vi que você comentou sobre sua dor e queria saber como você está. Se quiser, posso te ajudar a entender os próximos passos, sem compromisso. Como você tá se sentindo?`,
      alt_message: `Olá ${fn}! Passando pra retomar nossa conversa sobre sua dor. Se ainda estiver incomodando, a gente pode marcar uma avaliação com o Dr. Kleber pra entender direitinho o seu caso. Quer que eu veja um horário?`,
      reason: '[DRY] stub — rode sem --dry com ANTHROPIC_API_KEY para gerar de verdade.',
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não definida no ambiente.');

  const userContent =
    'Dados do lead frio (use o que houver, ignore campos vazios):\n' +
    JSON.stringify(
      { nome: lead.name, tema: lead.topic, ultima_mensagem: lead.message, quando: lead.date, cidade: lead.city, origem: lead.source },
      null, 2
    );

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(clean);
}

// Busca leads frios direto do Supabase (status=novo, com opt-in). Fecha o ciclo P1→P0.
async function fetchFromSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não definidas no ambiente.');
  let q = `${url.replace(/\/$/, '')}/rest/v1/leads?status=eq.novo&consent_whatsapp=eq.true&order=created_at.asc&select=name,phone,topic,source_url,created_at`;
  if (COLD_DAYS > 0) {
    const cutoff = new Date(Date.now() - COLD_DAYS * 86400000).toISOString();
    q += `&created_at=lte.${encodeURIComponent(cutoff)}`;
  }
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  const rows = await res.json();
  return rows
    .map((r) => ({ name: r.name || '', phone: normalizePhone(r.phone), message: '', topic: r.topic || '', date: r.created_at || '', city: '', source: r.source_url || '' }))
    .filter((l) => l.phone);
}

// Pool de concorrência simples
async function mapPool(items, fn, size) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); }
      catch (e) { out[idx] = { error: String(e.message || e) }; }
      process.stdout.write(`\r  processados: ${out.filter(Boolean).length}/${items.length}   `);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

function buildHTML(records) {
  const json = JSON.stringify(records).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Fila de Reativação — Dr. Kleber</title>
<style>
:root{--azul:#0B2444;--verde:#25D366;--alerta:#c0392b}
*{box-sizing:border-box}
body{font-family:-apple-system,Segoe UI,Arial,sans-serif;margin:0;background:#f4f5f7;color:#1a1a1a}
header{background:var(--azul);color:#fff;padding:14px 18px;position:sticky;top:0;z-index:10}
header h1{margin:0;font-size:1.05rem}
.bar{display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;font-size:.85rem;opacity:.95}
.bar b{font-size:1.05rem}
.filters{padding:10px 18px;display:flex;gap:8px;flex-wrap:wrap;background:#fff;border-bottom:1px solid #e3e3e3}
.filters button{border:1px solid #ccc;background:#fff;border-radius:20px;padding:5px 12px;font-size:.8rem;cursor:pointer}
.filters button.on{background:var(--azul);color:#fff;border-color:var(--azul)}
.wrap{max-width:760px;margin:0 auto;padding:16px}
.card{background:#fff;border:1px solid #e3e3e3;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.card.flag{border-color:var(--alerta);box-shadow:0 0 0 2px rgba(192,57,43,.12)}
.card.done{opacity:.5}
.top{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.top strong{font-size:1rem}
.pill{font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase}
.p-alta{background:#fde8e8;color:#c0392b}.p-media{background:#fef3cd;color:#8a6d00}.p-baixa{background:#e8f0fe;color:#1e6fbf}
.flagtag{background:var(--alerta);color:#fff;font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:20px}
.reason{font-size:.78rem;color:#666;margin:0 0 8px}
textarea{width:100%;min-height:84px;border:1px solid #d8d8d8;border-radius:8px;padding:9px;font:inherit;font-size:.9rem;resize:vertical}
.alt{font-size:.78rem;color:#1e6fbf;cursor:pointer;margin-top:6px;display:inline-block}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.btn{border:none;border-radius:8px;padding:9px 14px;font-size:.85rem;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.send{background:var(--verde);color:#fff}.copy{background:#eef0f3;color:#333}
.st{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.st button{border:1px solid #ccc;background:#fff;border-radius:20px;padding:4px 10px;font-size:.75rem;cursor:pointer}
.st button.sel{background:var(--azul);color:#fff;border-color:var(--azul)}
.tel{font-size:.8rem;color:#888}
.err{color:#c0392b;font-size:.8rem}
</style></head><body>
<header>
  <h1>Fila de Reativação — leads frios</h1>
  <div class="bar">
    <span>Total: <b id="c-total">0</b></span>
    <span>Enviados: <b id="c-sent">0</b></span>
    <span>Agendaram: <b id="c-won">0</b></span>
    <span>Conversão: <b id="c-rate">0%</b></span>
  </div>
</header>
<div class="filters">
  <button data-f="todos" class="on">Todos</button>
  <button data-f="flag">🚨 Urgente</button>
  <button data-f="alta">Alta</button>
  <button data-f="media">Média</button>
  <button data-f="baixa">Baixa</button>
  <button data-f="pendentes">Pendentes</button>
</div>
<div class="wrap" id="list"></div>
<script>
const DATA = ${json};
const KEY = 'reativacao_status_v1';
const status = JSON.parse(localStorage.getItem(KEY) || '{}');
const ORDER = { alta:0, media:1, baixa:2 };
let filter = 'todos';

function save(){ localStorage.setItem(KEY, JSON.stringify(status)); render(); }
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function waLink(phone, text){ return 'https://wa.me/'+phone+'?text='+encodeURIComponent(text); }

function visible(r){
  const st = status[r.phone] || {};
  if(filter==='todos') return true;
  if(filter==='flag') return r.red_flag;
  if(filter==='pendentes') return !st.state;
  return r.priority===filter;
}

function render(){
  const sorted = [...DATA].sort((a,b)=>{
    if(a.red_flag!==b.red_flag) return a.red_flag?-1:1;
    return (ORDER[a.priority]??9)-(ORDER[b.priority]??9);
  });
  const list = document.getElementById('list');
  list.innerHTML='';
  let sent=0, won=0;
  DATA.forEach(r=>{ const s=status[r.phone]||{}; if(s.sent)sent++; if(s.state==='won')won++; });
  document.getElementById('c-total').textContent=DATA.length;
  document.getElementById('c-sent').textContent=sent;
  document.getElementById('c-won').textContent=won;
  document.getElementById('c-rate').textContent=(sent? Math.round(won/sent*100):0)+'%';

  sorted.filter(visible).forEach(r=>{
    const st = status[r.phone] || {};
    const card = document.createElement('div');
    card.className = 'card'+(r.red_flag?' flag':'')+(st.state?' done':'');
    if(r.error){
      card.innerHTML = '<div class="top"><strong>'+esc(r.name||'(sem nome)')+'</strong><span class="tel">'+esc(r.phone||'')+'</span></div><div class="err">Erro ao gerar: '+esc(r.error)+'</div>';
      list.appendChild(card); return;
    }
    const msg = st.edited!=null ? st.edited : r.message;
    card.innerHTML =
      '<div class="top"><strong>'+esc(r.name||'(sem nome)')+'</strong>'+
        (r.red_flag?'<span class="flagtag">🚨 URGENTE</span>':'')+
        '<span class="pill p-'+r.priority+'">'+r.priority+'</span>'+
        '<span class="tel">'+esc(r.phone)+'</span></div>'+
      (r.reason?'<p class="reason">'+esc(r.reason)+'</p>':'')+
      '<textarea>'+esc(msg)+'</textarea>'+
      (r.alt_message?'<span class="alt">↺ usar ângulo alternativo</span>':'')+
      '<div class="actions">'+
        '<a class="btn send" target="_blank" rel="noopener">📲 Enviar no WhatsApp</a>'+
        '<button class="btn copy">Copiar</button>'+
      '</div>'+
      '<div class="st">'+
        '<button data-s="sent">Enviado</button>'+
        '<button data-s="won">Agendou ✅</button>'+
        '<button data-s="noreply">Sem resposta</button>'+
        '<button data-s="no">Sem interesse</button>'+
      '</div>';

    const ta = card.querySelector('textarea');
    const send = card.querySelector('.send');
    const refreshLink = ()=>{ send.href = waLink(r.phone, ta.value); };
    refreshLink();
    ta.addEventListener('input', ()=>{ status[r.phone]={...(status[r.phone]||{}), edited:ta.value}; localStorage.setItem(KEY,JSON.stringify(status)); refreshLink(); });
    send.addEventListener('click', ()=>{ status[r.phone]={...(status[r.phone]||{}), sent:true}; save(); });
    card.querySelector('.copy').addEventListener('click', ()=>{ navigator.clipboard.writeText(ta.value); });
    const alt = card.querySelector('.alt');
    if(alt) alt.addEventListener('click', ()=>{ ta.value=r.alt_message; ta.dispatchEvent(new Event('input')); });
    card.querySelectorAll('.st button').forEach(b=>{
      const s=b.dataset.s;
      if(st.state===s || (s==='sent'&&st.sent&&!st.state)) b.classList.add('sel');
      b.addEventListener('click', ()=>{
        if(s==='sent'){ status[r.phone]={...(status[r.phone]||{}), sent:true}; }
        else { status[r.phone]={...(status[r.phone]||{}), state:(st.state===s?null:s), sent:true}; }
        save();
      });
    });
    list.appendChild(card);
  });
}

document.querySelectorAll('.filters button').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.filters button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); filter=b.dataset.f; render();
  });
});
render();
</script>
</body></html>`;
}

// ── main ──
(async () => {
  let leads = [];
  let skipped = 0;

  if (FROM_SUPABASE) {
    try { leads = await fetchFromSupabase(); }
    catch (e) { console.error(`\n✗ Supabase: ${e.message}\n`); process.exit(1); }
  } else {
    let raw;
    try { raw = readFileSync(inputPath, 'utf8'); }
    catch (e) { console.error(`\n✗ Não consegui ler o CSV em: ${inputPath}\n  ${e.message}\n  Uso: node scripts/reativacao.mjs <caminho.csv> [--dry]\n     ou: node scripts/reativacao.mjs --from-supabase [--days=7]\n`); process.exit(1); }

    const rows = parseCSV(raw);
    if (rows.length < 2) { console.error('✗ CSV vazio ou sem linhas de dados.'); process.exit(1); }

    const cols = detectColumns(rows[0]);
    if (cols.phone === -1) { console.error('✗ Não encontrei a coluna de telefone no cabeçalho do CSV.'); process.exit(1); }

    for (let r = 1; r < rows.length; r++) {
      const get = (idx) => (idx >= 0 ? (rows[r][idx] || '').trim() : '');
      const phone = normalizePhone(get(cols.phone));
      if (!phone) { skipped++; continue; }
      leads.push({
        name: get(cols.name), phone,
        message: get(cols.message), topic: get(cols.topic),
        date: get(cols.date), city: get(cols.city), source: get(cols.source),
      });
    }
  }

  if (leads.length === 0) { console.error('✗ Nenhum lead para processar.'); process.exit(1); }
  console.log(`\n📋 ${leads.length} leads válidos${skipped ? ` (${skipped} sem telefone, ignorados)` : ''}${FROM_SUPABASE ? ' (do Supabase)' : ''}.`);
  console.log(DRY ? '⚙️  Modo --dry (sem chamar a IA, mensagens stub).' : `🤖 Gerando com ${MODEL}...`);

  const results = await mapPool(leads, generateForLead, CONCURRENCY);
  const records = leads.map((l, i) => ({ name: l.name, phone: l.phone, ...(results[i] || { error: 'sem resultado' }) }));

  writeFileSync(OUT, buildHTML(records), 'utf8');
  const ok = records.filter((r) => !r.error).length;
  const flags = records.filter((r) => r.red_flag).length;
  console.log(`\n\n✅ Pronto: ${ok}/${records.length} mensagens geradas${flags ? `, ${flags} com 🚨 red-flag (priorize!)` : ''}.`);
  console.log(`📄 Abra no navegador: ${OUT}\n`);
})();
