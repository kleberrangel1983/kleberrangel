# Guia — Duplicidade de PageView do Meta Pixel

> Não deployado (`.md` está no `.vercelignore`). Documento de handoff.

## Problema observado (validação em produção)

O Meta Pixel `877941071024223` dispara **PageView duas vezes** por
carregamento — confirmado no smoke-test:

- `facebook.com/tr/?id=877941071024223&ev=PageView` → 200 **duas vezes**
  (uma via `tmgoogletagmanager`, outra via `tmSimo-GTM-WebTemplate-2.0.3-GA4`)

Impacto: infla PageView/alcance e distorce custo por resultado e
otimização de campanhas no Meta. Não é erro de CSP nem do site em si.

## Causa raiz (duas fontes de PageView)

1. **Container GTM `GTM-KRCJVG3`** tem **duas tags de Meta Pixel**
   disparando no trigger *All Pages* (uma tag "clássica" + um template
   da comunidade — Simo). Isso é configuração do container, **fora do
   repositório** (editável só na UI do Google Tag Manager).
2. **Código do site**: 6 páginas hardcodam `fbq('init',...)` **e**
   `fbq('track','PageView')` no `<head>`, em paralelo ao que o GTM faz:
   - `index.html`
   - `lp-dor-coluna.html`
   - `prp.html`
   - `ombro.html`
   - `medicina-regenerativa.html`
   - `ozonoterapia-divinopolis.html`

   (As demais páginas inicializam o Pixel só via GTM.)

> Resultado: pode haver até **3 PageViews** (2 tags GTM + 1 hardcoded)
> nas 6 páginas acima, e 2 nas demais.

## Princípio: uma única fonte de verdade

Escolha **um** dono do Pixel. Recomendado: **GTM é o dono** (centraliza
consentimento/LGPD, que já é gerido no GTM via Consent Mode).

### Opção A — GTM é o dono (recomendada)

1. **No GTM (UI):**
   - Tags → filtrar por "Pixel"/"Facebook"/"Meta".
   - Manter **uma** tag de Meta Pixel no trigger *All Pages* (de
     preferência a baseada em template oficial/consent-aware).
   - **Pausar/excluir** a tag duplicada (a redundante do par
     clássico/Simo). Publicar uma nova versão do container.
2. **No site (código — PR à parte):** remover **apenas a linha**
   `fbq('track','PageView');` das 6 páginas listadas, mantendo o
   `fbq('init',...)` apenas se o GTM não fizer o init (ver passo 3).
   - Se o GTM já faz `init`+`PageView`, remover do site tanto o
     bloco `<!-- Meta Pixel -->` quanto o `<noscript>` do Pixel,
     deixando o GTM como única fonte.
3. Confirmar quem faz o `init`: se a tag GTM já inicializa o Pixel,
   **não** deixar `fbq('init')` hardcoded (init duplicado também gera
   warning e PageView extra).

### Opção B — Site é o dono

- Remover **todas** as tags de Meta Pixel do GTM.
- Manter o bloco hardcoded só em **um** lugar comum a todas as páginas
  (hoje está em 6 — as outras ficariam sem Pixel). Menos recomendado:
  perde gestão central de consentimento.

## Como validar (após a mudança)

1. **Meta Pixel Helper** (extensão Chrome): deve mostrar **1× PageView**.
2. **DevTools → Network**, filtrar `tr/?`: contar
   `facebook.com/tr/?id=877941071024223&ev=PageView` → deve ser **1**.
3. **Events Manager → Test Events**: 1 PageView por carga; sem
   "duplicate event" / sem aviso de eventos redundantes.
4. Repetir nas 6 páginas hardcoded **e** numa página só-GTM
   (ex.: `/coluna`).
5. Conferir Consent Mode: PageView só dispara **após** aceite (o site
   já faz `fbq('consent','revoke')` por padrão).

## Rollback

- GTM: republicar a versão anterior do container (histórico de versões).
- Site: revert do PR de remoção do `fbq` hardcoded.

## Checklist

- [ ] GTM: 1 única tag Meta Pixel no *All Pages* (duplicada pausada)
- [ ] Container publicado (nova versão)
- [ ] Site: `fbq('track','PageView')` hardcoded tratado nas 6 páginas
- [ ] Sem `fbq('init')` duplicado (site vs GTM)
- [ ] Pixel Helper = 1 PageView; Network `/tr/` = 1; Test Events ok
- [ ] Consent Mode preservado (revoke por padrão, grant após aceite)
