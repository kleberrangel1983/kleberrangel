# P2 — Automação de Reativação (WhatsApp Cloud API + Cron) — DESIGN

> Planta de arquitetura. **Ainda não implementado.** Só construir depois do P0
> provar conversão e do WABA (conta WhatsApp Business API) estar aprovado.

## Objetivo

Fechar o ciclo sem humano disparando: um cron acha o lead frio → a IA decide
quando e o quê → envia pelo WhatsApp Cloud API → o webhook recebe a resposta →
a IA classifica → encaminha pra equipe fechar (agendamento) ou encerra (opt-out).

O humano sai do *envio*, mas **continua no agendamento e no clínico** (trava de
segurança CFM). A automação cuida só do empurrãozinho + triagem.

## Mapa

```
Vercel Cron (1x/dia, horário comercial)
   └─> POST /api/cron/reactivate            (protegido por CRON_SECRET)
         ├─ Supabase: leads status=novo, opt-in, next_reactivation_at <= now, touches < 3
         ├─ IA: escolhe template + variáveis (fora da janela 24h só template aprovado)
         ├─ WhatsApp Cloud API: envia template
         └─ Supabase: log em lead_messages, agenda próximo toque, touches++

Meta  ──(mensagem do lead / status)──>  GET/POST /api/whatsapp/webhook
         ├─ verifica assinatura (X-Hub-Signature-256, app secret)
         ├─ log inbound + abre janela 24h
         ├─ IA classifica: quer_agendar | dúvida | não | opt-out | RED-FLAG
         └─ ação:
              quer_agendar  → status=contatado + NOTIFICA equipe (Maysa fecha)
              dúvida        → (opcional) IA responde dentro da janela 24h (CFM-safe)
              opt-out       → status=optout, para já (LGPD)
              RED-FLAG      → escala humano + mensagem de urgência segura
              não           → status=descartado
         └─ conversão → dispara Lead/Schedule no /api/capi (mede ROI)
```

## Pré-requisitos (a parte lenta — Meta)

1. **Meta Business + WhatsApp Business Account (WABA)** + verificação de negócio.
2. **Número dedicado.** O Cloud API usa um número que **sai do app** do WhatsApp
   (ou usar "coexistence", onde suportado). ⚠️ Decisão: o número da Maysa
   (5537998419396) é usado manualmente — provavelmente vale um **número novo** só
   pra automação, pra não tirar o dela do app.
3. **Templates (HSM) aprovados pelo Meta.** Fora da janela de 24h só dá pra mandar
   template pré-aprovado (categoria UTILITY de preferência — entrega melhor e mais
   barato que MARKETING). Personalização limitada a variáveis `{{1}}`.
4. **Token permanente** (System User) + App Secret (assinatura do webhook).
5. **Messaging limits por tier:** número novo começa em **250 conversas/24h**,
   sobe (1k/10k/ilimitado) conforme o *quality rating*. Spam derruba o rating → ban.

## Dados (migration 0002 — esboço)

Estender `leads`:
```sql
alter table public.leads
  add column reactivation_count int not null default 0,
  add column last_reactivation_at timestamptz,
  add column next_reactivation_at timestamptz,
  add column wa_window_expires_at timestamptz,   -- janela de 24h aberta por resposta
  add column opted_out_at timestamptz;
```
Nova tabela de auditoria + memória de conversa (a IA classifica no contexto):
```sql
create table public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id),
  direction text not null check (direction in ('out','in')),
  body text,
  template_name text,
  wa_message_id text,
  status text,                 -- sent|delivered|read|failed (webhook de status)
  classification text,         -- quer_agendar|duvida|nao|optout|red_flag (inbound)
  created_at timestamptz not null default now()
);
```

## Endpoints (todos zero-dependência, fetch nativo, igual aos atuais)

| Rota | Método | Função |
|---|---|---|
| `/api/cron/reactivate` | POST | Disparo outbound. Protegido por `Authorization: Bearer ${CRON_SECRET}` (header do Vercel Cron). **Idempotente** (checa `next_reactivation_at`/status pra não mandar duas vezes). |
| `/api/whatsapp/webhook` | GET | Verificação do Meta (`hub.challenge` + `WHATSAPP_VERIFY_TOKEN`). |
| `/api/whatsapp/webhook` | POST | Inbound + status. Valida `X-Hub-Signature-256`. |
| `/api/capi` | POST | (já existe) dispara conversão quando reativação vira consulta. |

`vercel.json` ganha:
```json
{ "crons": [ { "path": "/api/cron/reactivate", "schedule": "0 13 * * *" } ] }
```
(13h UTC ≈ 10h BRT — horário comercial; nunca de madrugada.)

## Papéis da IA

- **Selecionador/escritor outbound:** decide se vale mandar agora, escolhe template
  e preenche variáveis. (Fora da janela 24h a criatividade é limitada ao template
  aprovado — não dá texto livre.)
- **Classificador inbound:** structured output → intenção + red-flag. Reusa o
  system prompt CFM-safe do `api/chat.js`.
- **Respondente na janela (opcional):** dentro das 24h pode responder dúvida simples
  (CFM-safe), depois passa pro humano agendar.

## Guardrails (a automação tira a revisão humana do envio — então isto importa mais)

- **Caps:** máx **3 toques/lead**, intervalo mínimo, cadência dia 2 / 7 / 21, depois para.
- **Teto diário global** de envios + só horário comercial.
- **Kill switch:** env `REACTIVATION_ENABLED=false` para tudo na hora.
- **Opt-out** (SAIR/PARAR/STOP) → honra imediato (LGPD).
- **Red-flag → humano**, nunca a IA conduz caso de urgência.
- **Só quem te procurou** (consent=true). Nada de número comprado/frio de verdade.
- **Quality rating:** monitorar; se cair (marcações de spam), pausar antes do ban.
- **Auditoria total** em `lead_messages`.

## Env vars novas

`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`,
`WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `CRON_SECRET`
(+ os já existentes `SUPABASE_*`, `ANTHROPIC_API_KEY`).

## Templates a submeter (rascunho CFM-safe)

> Texto final precisa de aprovação do Meta; manter informativo, sem promessa, com opt-out.

1. **Reativação leve** — "Olá {{1}}, aqui é da equipe do Dr. Kleber Rangel. Vimos
   que você buscou ajuda para sua dor e queríamos saber como você está. Se quiser,
   podemos te ajudar com o próximo passo. Para não receber mensagens, responda SAIR."

## Economia (modelar antes de ligar)

Meta cobra **por mensagem/conversa** (tarifa BR varia por categoria). Reativação
só compensa se `conversões × ticket da consulta > custo dos envios`. Com ticket de
consulta particular alto e mensagem utility barata, a margem tende a ser muito boa
— mas **modelar com números reais do P0** antes de escalar.

## Rollout sugerido

- **2a:** WABA + webhook + 1 template + disparo manual (sem cron) → testar c/ poucos leads.
- **2b:** cron + cadência + classificador inbound.
- **2c:** resposta IA na janela 24h + evento de conversão no CAPI + painel.
- Começar no tier de 250/dia; escalar conforme quality rating.

## Riscos honestos

- Aprovação/verificação do Meta leva dias–semanas (gargalo de calendário).
- Decisão do número (dedicado vs coexistence) mexe no fluxo da Maysa.
- Risco de ban por spam → caps + opt-out + copy boa + só quem te procurou.
- Perde-se a revisão humana do P0 → manter humano no agendamento/clínico.
- Custo por mensagem → validar ROI com dados do P0 primeiro.
