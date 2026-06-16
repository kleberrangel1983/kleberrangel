// /api/capi.js — Vercel Serverless Function
// CAPI server-side para Meta Pixel (ID via env var META_PIXEL_ID)
//
// Recebe eventos do browser via POST e encaminha pra Conversions API com:
// - event_id sincronizado (dedup nativa com browser pixel)
// - IP do cliente + User-Agent capturados server-side (impossível via browser)
// - fbp/fbc cookies extraídos se enviados
// - SHA-256 hash para qualquer PII (futuro: nome, email, telefone)
//
// Por que isso importa:
// - Recupera 20-40% eventos iOS perdidos por ATT + Safari 3rd party cookie block
// - EMQ sobe (mais sinais de matching: IP, UA, fbc, fbp)
// - Algoritmo Meta otimiza melhor → CAC cai 15-25%
//
// Token armazenado em env var META_CAPI_TOKEN (configurar no Vercel dashboard)

import crypto from 'crypto';

const PIXEL_ID = process.env.META_PIXEL_ID; // Configurar no painel Vercel: Settings → Environment Variables
const CAPI_VERSION = 'v21.0';
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE || null; // opcional, pra debug

// Eventos permitidos (whitelist anti-abuse)
const ALLOWED_EVENTS = new Set([
  'Lead',
  'Contact',
  'PageView',
  'ViewContent',
  'Schedule',
  'CompleteRegistration',
  'whatsapp_click', // custom event
  'phone_call',     // custom event
]);

function sha256(value) {
  if (!value) return undefined;
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

function getClientIp(req) {
  // Vercel passa o IP real do cliente em x-forwarded-for (primeiro IP da lista)
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const ips = xff.split(',').map(s => s.trim());
    return ips[0];
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || null;
}

function getUserAgent(req) {
  return req.headers['user-agent'] || '';
}

function isValidEventName(name) {
  return typeof name === 'string' && ALLOWED_EVENTS.has(name);
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

  // Validar token configurado
  const TOKEN = process.env.META_CAPI_TOKEN;
  if (!TOKEN) {
    console.error('[CAPI] META_CAPI_TOKEN env var não configurada');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Parse body
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const {
    event_name,
    event_id,
    event_source_url,
    content_name,
    content_category,
    fbp,
    fbc,
    email,
    phone,
    first_name,
    last_name,
    city,
    external_id,
  } = body || {};

  if (!isValidEventName(event_name)) {
    return res.status(400).json({ error: 'Invalid or missing event_name' });
  }

  if (!event_id) {
    return res.status(400).json({ error: 'Missing event_id (required for dedup with browser pixel)' });
  }

  // Capturar contexto do request (impossível via browser)
  const client_ip = getClientIp(req);
  const client_user_agent = getUserAgent(req);

  // Montar user_data — Meta usa esses sinais pra match
  const user_data = {
    client_ip_address: client_ip,
    client_user_agent: client_user_agent,
  };
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;
  if (email) user_data.em = [sha256(email)];
  if (phone) user_data.ph = [sha256(phone.replace(/\D/g, ''))];
  if (first_name) user_data.fn = [sha256(first_name)];
  if (last_name) user_data.ln = [sha256(last_name)];
  if (city) user_data.ct = [sha256(String(city).replace(/\s+/g, ''))];
  if (external_id) user_data.external_id = [sha256(external_id)];

  // Montar custom_data
  const custom_data = {};
  if (content_name) custom_data.content_name = content_name;
  if (content_category) custom_data.content_category = content_category;

  // Payload Meta CAPI
  const payload = {
    data: [{
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id,
      event_source_url: event_source_url || origin,
      action_source: 'website',
      user_data,
      custom_data,
    }],
  };

  if (TEST_EVENT_CODE) {
    payload.test_event_code = TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${CAPI_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`;

  try {
    const fbRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      console.error('[CAPI] Meta error:', fbData);
      return res.status(502).json({ error: 'Meta CAPI rejected', details: fbData });
    }

    return res.status(200).json({
      success: true,
      events_received: fbData.events_received,
      fbtrace_id: fbData.fbtrace_id,
    });
  } catch (e) {
    console.error('[CAPI] Network/fetch error:', e);
    return res.status(502).json({ error: 'Failed to reach Meta CAPI', message: e.message });
  }
}
