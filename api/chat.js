// /api/chat.js — Vercel Serverless Function
// Assistente virtual do Dr. Kleber Rangel, conectado ao Claude (Anthropic Messages API).
//
// Substitui o fallback por regex do chatbot.js por respostas reais de IA, mantendo
// o system prompt CFM-compliant SERVER-SIDE (o cliente não pode adulterá-lo).
//
// Arquitetura: chamada via fetch nativo (sem SDK), igual a capi.js, porque as
// functions deste projeto são deliberadamente zero-dependência e o package.json
// é excluído do deploy pelo .vercelignore.
//
// Chave em env var ANTHROPIC_API_KEY (configurar no painel Vercel:
// Settings → Environment Variables).

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-haiku-4-5'; // FAQ curto, alto volume → melhor custo-benefício
const MAX_TOKENS = 512;           // respostas curtas (máx. ~4 linhas)

// Limites anti-abuso do payload
const MAX_MESSAGES = 16;          // histórico (user + assistant)
const MAX_CONTENT_CHARS = 600;    // por mensagem

// System prompt: ÚNICA fonte da verdade. Vive no servidor para não ser
// sobrescrito pelo cliente (prompt injection via body).
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

Resposta padrão ao encaminhar: "Para te orientar com segurança, a equipe pode ajudar diretamente pelo WhatsApp. → [Falar com a equipe](https://wa.me/553784161539?text=Olá, vim pelo chat do site e gostaria de falar com a equipe.)"

RESPOSTAS PADRÃO:
- Preço da consulta: "A equipe pode informar o valor pelo WhatsApp. A consulta é particular e inclui avaliação médica, exame físico, análise dos exames e plano individualizado."
- PRP/BMA/infiltração (preço ou se funciona): "O valor e a indicação dependem do diagnóstico e da avaliação médica. Não existe procedimento indicado sem consulta."
- Medicina regenerativa: "Pode ser considerada em casos selecionados. Não funciona igual para todos e não deve ser prometida como cura."
- Hérnia de disco: "Nem toda hérnia de disco precisa operar. O tratamento depende dos sintomas, exame físico e exames de imagem."
- Artrose no joelho: "Artrose pode ter controle da dor e melhora de função. O tratamento depende do grau e da avaliação do paciente."
- Dor no ombro: "Dor no ombro pode ser bursite, tendinite, manguito rotador, rigidez ou dor vinda da cervical. O ideal é avaliar a causa antes de tratar."

TOM: claro, calmo, direto, acolhedor, prudente. Sem prometer resultado. Sem forçar consulta.

IDENTIDADE: Você é o assistente virtual do Dr. Kleber. Não substitui o médico. Não fecha diagnóstico. Orienta com clareza e segurança.`;

// ── Rate limiting (anti-abuso / controle de custo) ──
// Best-effort em memória, por IP e por instância quente. Como cada requisição
// custa tokens, o limite é mais apertado que o do capi.js.
// Defesa primária em produção: regra de rate limit no Vercel WAF na rota /api/chat.
const RATE_LIMIT_MAX = 12;            // máx. de requisições...
const RATE_LIMIT_WINDOW_MS = 60_000;  // ...por janela de 60s, por IP
const rateBuckets = new Map();        // ip -> { count, resetAt }

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || null;
}

function isRateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) { if (now >= v.resetAt) rateBuckets.delete(k); }
  }
  return bucket.count > RATE_LIMIT_MAX;
}

// Normaliza e valida o histórico recebido do cliente.
// Retorna { messages } válido ou { error } com a mensagem.
function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'messages deve ser um array não vazio' };
  }
  if (raw.length > MAX_MESSAGES) {
    return { error: 'histórico muito longo' };
  }

  const out = [];
  for (const m of raw) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) {
      return { error: 'role inválido' };
    }
    if (typeof m.content !== 'string') {
      return { error: 'content deve ser string' };
    }
    const content = m.content.trim();
    if (!content) continue; // ignora vazios
    if (content.length > MAX_CONTENT_CHARS) {
      return { error: 'mensagem muito longa' };
    }
    out.push({ role: m.role, content });
  }

  // A API exige que a conversa comece com 'user' — descarta assistants no início.
  while (out.length && out[0].role === 'assistant') out.shift();

  if (out.length === 0) return { error: 'sem mensagem do usuário' };
  if (out[out.length - 1].role !== 'user') {
    return { error: 'última mensagem deve ser do usuário' };
  }
  return { messages: out };
}

export default async function handler(req, res) {
  // CORS — só aceita do próprio domínio
  const allowedOrigins = [
    'https://www.drkleberrangel.com.br',
    'https://drkleberrangel.com.br',
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting por IP — antes de qualquer trabalho pesado
  const client_ip = getClientIp(req);
  if (isRateLimited(client_ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    console.error('[chat] ANTHROPIC_API_KEY env var não configurada');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Parse body
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { messages, error } = sanitizeMessages(body?.messages);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const apiRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text().catch(() => '');
      console.error('[chat] Anthropic error:', apiRes.status, detail);
      // Não devolve o corpo de erro ao cliente
      return res.status(502).json({ error: 'AI upstream error' });
    }

    const data = await apiRes.json();

    // Defesa: recusa de segurança do modelo
    if (data.stop_reason === 'refusal') {
      return res.status(200).json({
        reply: 'Não consigo te ajudar com isso por aqui. Para o seu caso, o ideal é uma avaliação presencial. → [Falar com a equipe](https://wa.me/553784161539?text=Olá, vim pelo chat do site e gostaria de falar com a equipe.)',
      });
    }

    // Extrai o texto dos blocos de conteúdo
    const reply = Array.isArray(data.content)
      ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      : '';

    if (!reply) {
      console.error('[chat] resposta sem texto:', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'Empty AI response' });
    }

    return res.status(200).json({ reply });
  } catch (e) {
    console.error('[chat] Network/fetch error:', e);
    return res.status(502).json({ error: 'Failed to reach AI' });
  }
}
