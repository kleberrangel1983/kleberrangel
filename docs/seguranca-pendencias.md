# Segurança — pendências e confirmações de postura

Checklist interno (esta pasta `docs/` NÃO é deployada — coberta pelo `.vercelignore`).
Itens que não viraram edição de código por serem falso-positivo, decisão do dono, ou
correção fora do escopo desta branch.

## Hardening de segurança / higiene de código

- **`api/capi.js` — varredura por secrets/PII hardcoded — NENHUMA AÇÃO (falso-positivo confirmado).**
  O único hit de `access_token` está na URL do Graph API (linha 154):
  `https://graph.facebook.com/${CAPI_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`.
  `TOKEN` vem de `process.env.META_CAPI_TOKEN` (linha 80), não há segredo hardcoded.
  Todos os valores sensíveis (`META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_CAPI_TEST_EVENT_CODE`)
  vêm de `process.env`. `.gitignore` e `.vercelignore` cobrem `.env` / `.env.local`.
  Registrado apenas como confirmação de postura de segurança, não como pendência.
