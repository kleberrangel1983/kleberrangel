# partials/ — fonte única de fragmentos compartilhados

Fragmentos que precisam ser **idênticos** em várias páginas vivem aqui, uma vez.
Nas páginas `.html` eles ficam entre marcadores e são **gerados** por `scripts/build-html.mjs`:

```html
<!--partial:head-compliance ga4=1-->
   ...conteúdo gerado (fica inline: Vercel serve o .html direto; SEO e a ordem
   síncrona do pixel-guard no <head> são preservados)...
<!--/partial:head-compliance-->
```

## Fluxo (vale para as duas máquinas)

1. Edite **`partials/<nome>.html`** (a fonte da verdade), nunca o bloco gerado na página.
2. Rode **`npm run build:html`** — regenera o conteúdo entre os marcadores em todas as páginas.
   É idempotente: rodar 2x não muda nada.
3. `git add` + commit das páginas alteradas + do partial.

`npm run build:all` roda CSS (landing + home) **e** HTML de uma vez.

## Parâmetros

Chaves no marcador (`ga4=1`) viram variáveis `{{NOME}}` no partial. Hoje:

| Variável | Vem de | Efeito |
|---|---|---|
| `{{GA4_CONFIG}}` | `ga4=1` | injeta `gtag('config', …)` no boot (só nas páginas com GA4 direto: `index`, `lp-dor-coluna`) |

## Partials atuais

- **`head-compliance.html`** — boot de consentimento LGPD (Consent Mode v2 completo) +
  consent-boot + pixel-consent-guard + GTM loader. **Fonte única do gate do Pixel** — a
  ordem síncrona antes do snippet da Meta é o que faz o bloqueio LGPD funcionar
  (ver commits #34/#39). NUNCA transformar em injeção client-side.

## Por que não há partial de nav/footer (ainda)

Nav e footer hoje variam por família de CSS (home / landing teal / paleta antiga / blog).
Só viram fonte única limpa **depois** da migração visual à identidade da home (Fase 2).
Extraí-los antes disso só geraria partials por-família, de baixo valor.

Os disclaimers CFM **não** são unificados de propósito: o texto é específico do contexto
(método vs. avaliação agregada vs. artigo de blog) — não é deriva, é conteúdo correto.
