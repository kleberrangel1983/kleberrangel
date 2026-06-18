-- 0002_leads_hardening.sql — endurecimento da tabela leads (P1).
-- Aplicar via CLI/migration versionada (nunca colar no SQL Editor à mão).
--   supabase db push   (ou psql -f este arquivo)
--
-- 1) Índice de reativação PARCIAL: a query de reativação só busca quem deu opt-in,
--    então indexar apenas consent_whatsapp = true deixa o índice bem menor e mais
--    rápido em escrita/leitura (query-partial-indexes). Substitui o índice cheio
--    leads_reativacao_idx criado em 0001.
-- 2) Integridade do consentimento LGPD: se consent_whatsapp = true, consent_at NÃO
--    pode ser nulo — o "quando" do opt-in é a base legal exigível (schema-constraints).

drop index if exists public.leads_reativacao_idx;
create index if not exists leads_reativacao_idx
  on public.leads (status, created_at)
  where consent_whatsapp = true;

alter table public.leads
  add constraint leads_consent_chk
  check (not consent_whatsapp or consent_at is not null);
