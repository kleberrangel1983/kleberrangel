-- 0001_leads.sql — P1 Ressurreição de Leads: tabela de captura.
-- Aplicar via CLI/migration versionada (nunca colar no SQL Editor à mão).
--   supabase db push   (ou psql -f este arquivo)
--
-- Guarda os leads capturados no funil (nome, telefone, consentimento LGPD,
-- contexto da origem) para reativação posterior. Acesso só via service_role
-- (a função /api/lead). RLS liga e nega anon/authenticated por padrão.

create extension if not exists pgcrypto;  -- gen_random_uuid()

create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  name            text,
  phone           text not null,                 -- normalizado: 55 + DDD + número
  consent_whatsapp boolean not null default false,
  consent_at      timestamptz,                   -- quando o opt-in foi dado (base legal LGPD)
  source_url      text,                          -- página onde capturou
  content_name    text,                          -- CTA/origem (ex.: "PRP Hero")
  topic           text,                          -- coluna/joelho/ombro/regenerativa
  utm             jsonb,                         -- utm_* da URL, se houver
  fbp             text,
  fbc             text,
  status          text not null default 'novo',  -- novo|contatado|agendado|optout|descartado
  last_touch_at   timestamptz,
  notes           text,
  constraint leads_phone_unique unique (phone),
  constraint leads_status_chk check (status in ('novo','contatado','agendado','optout','descartado'))
);

comment on table public.leads is 'Leads capturados no funil para reativação (P1). Acesso só via service_role.';

create index if not exists leads_status_created_idx on public.leads (status, created_at);
create index if not exists leads_reativacao_idx on public.leads (status, consent_whatsapp, created_at);

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

-- RLS: liga e NÃO cria policy para anon/authenticated → ninguém com a anon key
-- consegue ler/escrever. A função /api/lead usa service_role, que ignora RLS.
alter table public.leads enable row level security;
alter table public.leads force row level security;
