// /api/reviews.js — Vercel Serverless Function
// Busca avaliações públicas do Google (Places Details) server-side e devolve
// como JSON para o widget do site. A chave da API fica fora do browser.
//
// Por que server-side: exibe conteúdo de terceiro (Google), ao vivo — não
// relatos selecionados/redigidos e publicados pelo médico. Alinhado à
// Resolução CFM nº 2.336/2023 (o site não publica testemunho próprio).
//
// Env vars (painel Vercel → Settings → Environment Variables):
//   GOOGLE_PLACES_API_KEY  — chave da Places API (restringir por aplicação/IP)
//   GOOGLE_PLACE_ID        — Place ID do Perfil da Empresa no Google da clínica
//
// Sem as env vars (ou em erro), retorna { configured:false }/{ ok:false } e o
// widget mostra o fallback (nota agregada + link pro Google). A página nunca quebra.

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — respeita quota e termos do Google
let cache = { at: 0, payload: null };

function initials(name) {
  if (!name) return '★';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const a = parts[0] ? parts[0][0] : '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY = process.env.GOOGLE_PLACES_API_KEY;
  const PLACE_ID = process.env.GOOGLE_PLACE_ID;
  if (!KEY || !PLACE_ID) {
    return res.status(200).json({ configured: false });
  }

  // Cache em memória (entre invocações quentes) pra não estourar a quota.
  const now = Date.now();
  if (cache.payload && now - cache.at < CACHE_TTL_MS) {
    return res.status(200).json(cache.payload);
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', PLACE_ID);
    url.searchParams.set('fields', 'rating,user_ratings_total,reviews');
    url.searchParams.set('reviews_sort', 'newest');
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('key', KEY);

    const r = await fetch(url.toString());
    const data = await r.json();

    if (data.status !== 'OK' || !data.result) {
      console.error('[reviews] Google status:', data.status, data.error_message || '');
      return res.status(200).json({ configured: true, ok: false });
    }

    const result = data.result;
    const reviews = (result.reviews || [])
      .filter((rv) => rv && rv.rating >= 4 && rv.text) // só positivas e com texto
      .slice(0, 6)
      .map((rv) => ({
        author: rv.author_name,
        initials: initials(rv.author_name),
        rating: rv.rating,
        text: rv.text,
        relative: rv.relative_time_description || '',
      }));

    const payload = {
      configured: true,
      ok: true,
      rating: result.rating || null,
      total: result.user_ratings_total || null,
      reviews,
    };
    cache = { at: now, payload };
    return res.status(200).json(payload);
  } catch (e) {
    console.error('[reviews] erro:', e && e.message);
    return res.status(200).json({ configured: true, ok: false });
  }
}
