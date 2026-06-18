// /api/lead.js — Vercel Serverless Function
// P1 — Captura de leads do funil → Supabase (tabela public.leads).
//
// Persiste nome + telefone + consentimento (opt-in WhatsApp) + contexto da origem,
// para reativação posterior (scripts/reativacao.mjs --from-supabase).
//
// Arquitetura: fetch nativo (sem SDK), igual a capi.js/chat.js. Usa o
// service_role do Supabase (ignora RLS) — NUNCA expor ao cliente; vive em env var.
//
// Env vars (painel Vercel):
//   SUPABASE_URL                 ex.: https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    service_role key (secreta)

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map();

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

// Normaliza telefone BR para 55 + DDD + número (mesmo formato do wa.me)
function normalizePhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 13 && d.startsWith('55')) return d;
  if (d.length === 12 && d.startsWith('55')) return d;
  if (d.length === 11 || d.length === 10) return '55' + d;
  if (d.length >= 12 && d.startsWith('55')) return d;
  return d.length >= 10 ? d : null;
}

function clip(s, n) {
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  return t ? t.slice(0, n) : undefined;
}

export default async function handler(req, res) {
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

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const client_ip = getClientIp(req);
  if (isRateLimited(client_ip)) return res.status(429).json({ error: 'Too many requests' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('[lead] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const phone = normalizePhone(body?.phone);
  if (!phone) return res.status(400).json({ error: 'phone inválido ou ausente' });

  const consent = body?.consent === true;
  // Monta só os campos presentes (merge-duplicates não sobrescreve o que não vier;
  // status fica de fora de propósito pra não rebaixar um lead já 'agendado').
  const row = {
    phone,
    name: clip(body?.name, 120),
    consent_whatsapp: consent,
    consent_at: consent ? new Date().toISOString() : undefined,
    source_url: clip(body?.source_url, 500),
    content_name: clip(body?.content_name, 120),
    topic: clip(body?.topic, 60),
    utm: body?.utm && typeof body.utm === 'object' ? body.utm : undefined,
    fbp: clip(body?.fbp, 200),
    fbc: clip(body?.fbc, 200),
    last_touch_at: new Date().toISOString(),
  };
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);

  try {
    // Upsert por telefone (constraint leads_phone_unique)
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/leads?on_conflict=phone`;
    const sbRes = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!sbRes.ok) {
      const detail = await sbRes.text().catch(() => '');
      console.error('[lead] Supabase error:', sbRes.status, detail);
      return res.status(502).json({ error: 'Store rejected' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[lead] Network/fetch error:', e);
    return res.status(502).json({ error: 'Failed to reach store' });
  }
}
