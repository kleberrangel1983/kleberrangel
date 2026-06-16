# Rastreamento / Pixel / LGPD — pendências

Checklist das pendências verificadas de máquina na auditoria de rastreamento (Meta Pixel/CAPI/GTM/Google Ads) e conformidade LGPD (política/termos). Esta pasta `docs/` não é roteada pelo `vercel.json` (site estático com rewrites explícitos), serve apenas de checklist interno.

Formato: **arquivo — problema — o que fazer**.

## Consentimento (Consent Mode) — bloqueador de rastreamento

- **critico — coluna.html (+ 14 páginas) — consent fica `denied` para sempre, sem banner.**
  Essas páginas setam `gtag('consent','default',{...:'denied', wait_for_update:500})` mas NÃO têm banner de consentimento nem função `setConsent`. Resultado: o consent fica `denied` permanentemente e toda tag GTM consent-gated (GA4, Google Ads, Meta Pixel via GTM) nunca dispara. Verificado: `consent-banner` só existe em `index.html`; `lp-dor-coluna.html` tem banner próprio (`#consent` + `setConsent`, chave `kleber_consent`). Páginas afetadas SEM banner: `coluna.html`, `joelho.html`, `itauna.html`, `para-de-minas.html`, `nova-serrana.html`, `formiga.html`, `claudio.html`, `segunda-opiniao.html`, `ozonioterapia-coluna-divinopolis.html`, `prp-joelho-divinopolis.html`, `bloqueio-guiado-ultrassom-divinopolis.html` (+ as 4 do PR #13: `ombro.html`, `prp.html`, `medicina-regenerativa.html`, `ozonoterapia-divinopolis.html`).
  **O que fazer:** padronizar UM `assets/consent.js` compartilhado (banner + `setConsent('all'|'essential'|'none')` gravando localStorage + `gtag('consent','update',...)` + `fbq('consent','grant')`) e incluir em TODAS as páginas que têm "consent default denied". Extrair o bloco do `index.html` (setConsent linhas ~1289-1311 + markup `#consent-banner`) para `/assets/consent.js` e dar `<script src>` em todas as LPs. **Atenção às chaves divergentes de localStorage:** `index.html` usa `drkleberrangel_consent` e `lp-dor-coluna.html` usa `kleber_consent` — ao consolidar, padronizar UMA chave e migrar/ler ambas para não re-perguntar a quem já consentiu. Sem banner, gastar em Meta/Google Ads sem nenhum sinal de conversão chegando = dinheiro cego.

- **medio — index.html — banner só aparece na primeira visita, sem "Gerenciar cookies".**
  O banner (`#consent-banner` + `setConsent`) só é exibido se não houver escolha salva (`if(!saved){...display=block}`). Gravada a escolha em localStorage (`drkleberrangel_consent`), não há nenhum controle "Gerenciar cookies"/link no rodapé para reabrir e alterar preferências (verificado em `index.html` linhas ~1262-1311). Logo, o texto da Seção 8 da Política que cita "reabrindo as preferências de cookies pelo banner/painel" hoje não tem suporte funcional; o único caminho real de revogação é o canal por e-mail.
  **O que fazer:** implementar link "Gerenciar cookies" (rodapé, todas as páginas) que reexiba o banner e permita reescolher, e garantir que Pixel/CAPI só disparem após opt-in. Fecha a promessa do Art. 8 §5 da LGPD (revogação tão fácil quanto a concessão).

- **baixo — index.html — `setConsent('all')` chama `fbq` direto, mas o Pixel é carregado via GTM.**
  Em `index.html` (linha ~1301) e nas LPs, `setConsent('all')` chama `fbq('consent','grant')` e `fbq('track','PageView')` só se `window.fbq` existir naquele instante (`if(level==='all' && window.fbq)` e `if(window.fbq)`). Como não há `fbevents.js` inline no `index.html` (Pixel vem via GTM), `window.fbq` pode ainda não existir no clique em "Aceitar", perdendo o grant/PageView até o próximo pageview.
  **O que fazer:** confiar no Consent Mode do GTM — a tag do Pixel no GTM deve ter consent settings (additional checks `ad_storage`/`analytics_storage`) para disparar automaticamente quando o consent muda para granted. Se mantiver o grant manual, enfileirar via `dataLayer.push({event:'consent_granted'})` e deixar a tag reagir, em vez de depender de `window.fbq` estar pronto no clique.

## Dedup Pixel ↔ CAPI / Matching avançado

- **alto — assets/advanced-matching.js — dedup depende de monkeypatch frágil de `window.fbq`.**
  `advanced-matching.js` sobrescreve `window.fbq` por 2s (linhas ~125-149) para suprimir o `Lead`/`Contact` que a tag GTM "Lead + Contact on whatsapp_click" dispara SEM `eventID`. Causa raiz: a tag GTM não passa o `event_id` do dataLayer ao `fbq` como `{eventID:...}`. Enquanto não corrigida, há risco de Lead duplicado (browser sem eventID vs CAPI com eventID não deduplicam) e o monkeypatch é frágil (pode engolir eventos legítimos ou quebrar fora da janela de 2s). Confirmado: re-init `fbq(init,877941071024223,userData)` (linha ~112) e o bloco de sobrescrita (linhas ~125-149) existem.
  **O que fazer:** no GTM, na tag de Pixel que dispara em `whatsapp_click`/`phone_call`, ler `{{DLV - event_id}}` e passar como 3º arg: `fbq('track','Lead',{content_name:...},{eventID:{{DLV - event_id}}})`. O mesmo `event_id` já vai ao `/api/capi` (`capi-client.js`), então o Meta deduplica browser+server. DEPOIS de corrigir a tag, REMOVER o hack de sobrescrever `window.fbq` (linhas ~125-149) e revisar o re-init da linha ~112 — virar só `fbq('track',...,{eventID})`.

- **alto — lp-dor-coluna.html — `submitForm()` dispara Lead sem eventID, sem CAPI, e descarta a cidade.**
  `submitForm()` (linhas ~636-637) dispara `gtag('event','form_submit')` e `fbq('track','Lead')` SEM eventID e SEM enviar ao `/api/capi`, mesmo tendo nome (`f-nome`), whatsapp (`f-wa`) e cidade (`f-cidade`, linha ~631) do quiz em mãos. É o lead de maior intenção (preencheu quiz) e vai ao Meta com EMQ baixo e sem dedup server-side. A cidade é coletada e DESCARTADA (não entra no fbq nem no CAPI). Verificado de máquina.
  **O que fazer:** gerar um `event_id` na submissão, disparar `fbq('track','Lead',{...},{eventID:id})` E fazer `fetch('/api/capi',{...})` com `event_name:'Lead'`, `event_id:id`, `first_name`/`last_name` (de nome), `phone` (de wa), `city` (de cidade), `fbp`/`fbc` dos cookies. O backend (`api/capi.js`) JÁ aceita e hasheia `city` (ct) e `external_id` (verificado: destructuring linhas ~94-108 + user_data linhas ~133-134). É doc (não edit) porque envolve montar payload novo + cookies — risco médio; campos exatos acima para o implementador.

- **medio — assets/capi-client.js — `_fbc` reconstruído do fbclid mas nunca persistido em cookie.**
  `getFbcFromUrl()` (linhas ~34-40) reconstrói `_fbc` a partir do `fbclid` da URL APENAS no momento do evento, mas NUNCA grava o cookie `_fbc`. Se o usuário chega com `?fbclid=...` na home e converte numa página interna (sem fbclid na URL), o `_fbc` se perde — derruba o matching de cliques de anúncio. Mesmo problema em `advanced-matching.js` (`getFbcFromUrl`, linhas ~197-204). Confirmado: ambas só retornam a string, nenhuma escreve `document.cookie`.
  **O que fazer:** persistir `_fbc` no primeiro hit — ao detectar `fbclid` na URL, gravar `document.cookie '_fbc=fb.1.{timestamp}.{fbclid}; max-age=7776000; path=/; SameSite=Lax'` (90 dias) ANTES do GTM/Pixel carregar. Idealmente uma vez no início (no `consent.js` consolidado ou snippet no `<head>`), não só dentro do handler de evento. Assim `getCookie('_fbc')` acha o valor em qualquer página seguinte.

## Google Ads — conversões

- **medio — index.html — nenhuma conversão do Google Ads instrumentada.**
  Busca por `AW-` e `gtag('event','conversion',{send_to:...})` em todo o repo retornou ZERO (verificado de máquina). Há GA4 (`G-KHC1QSGV36`) e GTM, mas se houver campanhas no Google Ads (memória do projeto cita conta `4644778166`), elas otimizam sem sinal de conversão primário (lead WhatsApp/telefone) — ou dependem só de import via GA4.
  **O que fazer:** criar uma Conversion Action no Google Ads (Lead) e disparar via GTM uma tag "Google Ads Conversion" em `whatsapp_click`/`phone_call`/`form_submit` usando `{{DLV - event_id}}` como Order ID para dedup. Alternativa mínima: ativar Enhanced Conversions for Leads passando telefone/e-mail hasheado. Confirmar com o time se a conversão já existe só no GTM (fora do repo) antes de duplicar.

## LGPD — Política de Privacidade e Termos (texto já corrigido; só verificação)

- **alto — politica-privacidade.html — disclosure de envio server-side à Meta (CAPI/advanced matching).**
  Confirmado que o tratamento existe no código (`assets/capi-client.js`, `assets/advanced-matching.js`, `api/capi.js`). VERIFICAÇÃO: o texto corretivo JÁ está no arquivo (Seção 5, parágrafo "Envio server-side de dados à Meta (Conversions API / correspondência avançada)"). Nenhuma edição adicional necessária.

- **alto — politica-privacidade.html — revogação de consentimento (Art. 8 §5).**
  VERIFICAÇÃO: o texto corretivo JÁ está no arquivo (Seção 8 cita revisar/revogar via painel de cookies ou e-mail e que limpar cookies não é o meio adequado). Nenhuma edição adicional. **Atenção:** o trecho "(a) reabrindo as preferências de cookies pelo banner/painel" depende da pendência de implementação do painel reabrível (ver finding "index.html — banner só aparece na primeira visita") — hoje o caminho funcional real é só o e-mail.

- **alto — politica-privacidade.html — cláusula de dado sensível por remarketing (Art. 11).**
  Publicidade/remarketing em site de clínica de dor pode revelar dado de saúde (dado sensível). VERIFICAÇÃO: o texto corretivo JÁ está no arquivo (Seção 2, parágrafo "Publicidade, remarketing e dados sensíveis (Art. 11 da LGPD)"). Nenhuma edição adicional necessária.

- **alto — termos.html — Seção 5 alinhada à nota agregada do Google (sem depoimentos individuais).**
  Evita risco CFM 2.336/2023 (Arts. 13/14). VERIFICAÇÃO: o texto corretivo JÁ está no arquivo (Seção 5 "Avaliações de Pacientes": "não publica depoimentos individuais... nota agregada e pública... Google"). Nenhuma edição adicional necessária.

## LGPD — ação do dono (owner)

- **medio — politica-privacidade.html — nomear o Encarregado (DPO), Art. 41 da LGPD.**
  Confirmado por busca: não há menção a "Encarregado" nem "DPO" na Política; a Seção 1 ("Responsável pelos Dados") identifica só o controlador (Dr. Kleber Rangel) e um e-mail genérico. Art. 41 exige indicação e identificação de um Encarregado.
  **O que fazer (dono):** definir nome e canal próprio do Encarregado (pode ser ele mesmo ou terceiro) e acrescentar à Seção 1. Não cabe inventar — envolve publicar dado pessoal de identificação. Decisão jurídica/config do dono.
