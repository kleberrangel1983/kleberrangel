// /api/keepalive.js — Vercel Serverless Function (acionada por Cron diário).
//
// PROBLEMA: o projeto Supabase da captura de leads está no plano Free, que
// AUTO-PAUSA após ~7 dias sem atividade no banco. Como visitas ao site não
// tocam o banco (só /api/lead, no submit de um lead), uma semana sem nenhum
// lead faz o projeto dormir — e aí o PRÓXIMO lead falha silenciosamente
// (persistLead é fire-and-forget e engole o erro). Resultado: lead perdido.
//
// SOLUÇÃO: um toque trivial no banco, uma vez por dia (cron), reseta o timer
// de inatividade e mantém o projeto acordado. Custo desprezível (1 SELECT/dia).
//
// Segurança: se CRON_SECRET estiver setada no Vercel, exige
// `Authorization: Bearer <CRON_SECRET>` (o Vercel Cron envia isso
// automaticamente). Sem a env var, o endpoint responde mesmo assim — é só um
// ping de leitura, sem dado sensível no retorno.

export default async function handler(req, res) {
  // Opcional: trava por segredo do cron (defesa contra acionamento externo).
  const CRON_SECRET = process.env.CRON_SECRET;
  if (CRON_SECRET) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('[keepalive] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    // SELECT mínimo só pra registrar atividade no banco (HEAD não conta como
    // query no Postgres; um GET com limit=1 garante o toque). Lê 1 id no máximo.
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/leads?select=id&limit=1`;
    const sbRes = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'count=none',
      },
    });

    if (!sbRes.ok) {
      const detail = await sbRes.text().catch(() => '');
      console.error('[keepalive] Supabase respondeu', sbRes.status, detail.slice(0, 200));
      return res.status(502).json({ ok: false, status: sbRes.status });
    }

    return res.status(200).json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    console.error('[keepalive] Falha ao alcançar o Supabase:', e);
    return res.status(502).json({ ok: false, error: 'unreachable' });
  }
}
