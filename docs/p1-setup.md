# P1 — Captura de Leads + Supabase (setup)

Captura nome + WhatsApp + opt-in no funil e grava no Supabase, criando a lista
própria que alimenta a reativação (`scripts/reativacao.mjs --from-supabase`).

> `docs/` e `supabase/` estão no `.vercelignore` — não vão pro deploy.

## 1. Criar o projeto Supabase (próprio do site)

Cada projeto Supabase tem custo na org Pro — kleberrangel é **independente** (não
misturar com trafegomed/emagrecimento). Crie um projeto novo (ou use a org Free
pra validar) e anote:

- **Project URL** → `SUPABASE_URL` (ex.: `https://xxxx.supabase.co`)
- **service_role key** (Settings → API) → `SUPABASE_SERVICE_ROLE_KEY` (SECRETA, nunca no front)

## 2. Aplicar a migration (versionada, nunca no SQL Editor à mão)

```bash
# via Supabase CLI (recomendado)
supabase link --project-ref <ref>
supabase db push        # aplica supabase/migrations/0001_leads.sql

# ou via psql (.pgpass já configurado)
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_leads.sql
```

Cria a tabela `public.leads` com RLS ligada (só o `service_role` acessa) e upsert
por telefone.

## 3. Configurar env vars no Vercel

Settings → Environment Variables (Production + Preview):

| Var | Valor |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secreta) |
| `ANTHROPIC_API_KEY` | chave da Anthropic (chat + reativação) |

## 4. Como funciona em produção

1. Visitante clica num botão de WhatsApp → modal do `advanced-matching.js` pede
   nome + telefone + **opt-in** (checkbox de consentimento).
2. Ao enviar, o front chama `POST /api/lead` → upsert no Supabase com
   `consent_whatsapp` + `consent_at` (base legal LGPD).
3. A pilha de leads cresce sozinha. Para reativar:
   ```bash
   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANTHROPIC_API_KEY=...
   node scripts/reativacao.mjs --from-supabase --days=7
   ```
   Gera `scripts/reativacao.html` (fila 1-toque) só com leads `status=novo` e opt-in.

## 5. Conformidade

- Opt-in explícito no modal (checkbox) — consentimento LGPD.
- Política de privacidade atualizada (seção 11) cobre IA (Anthropic/EUA),
  armazenamento (Supabase) e transferência internacional.
- Opt-out: marcar `status='optout'` no lead (some das próximas reativações).

## Próximo (P2)

Automatizar o envio via WhatsApp Cloud API + Vercel Cron (achar lead frio →
gerar msg → enviar → classificar resposta). Exige conta WABA verificada e
templates aprovados pelo Meta.
