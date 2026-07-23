# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Site oficial do Dr. Kleber Rangel (ortopedista, drkleberrangel.com.br): ~30 páginas HTML estáticas (home, landings de tratamento/cidade, blog) + Vercel Serverless Functions. Sem framework, sem bundler — HTML5 + Vanilla JS + Tailwind v3 buildado localmente. Site de médico: sujeito a **CFM 2.336/2023** e **LGPD**.

## Comandos

```bash
npm run build:html      # regenera os blocos de partials/ dentro das páginas (idempotente)
npm run build:css:home  # Tailwind da home -> assets/tailwind.css
npm run build:css       # Tailwind das 4 landings de tratamento -> assets/tailwind-landing.<hash>.css (reescreve os <link>)
npm run build:css:all   # os dois acima
npm run build:all       # CSS + HTML
```

Deploy: automático via GitHub → Vercel (push na `main` = produção; PR = preview). Não há step de build no Vercel — os artefatos gerados (`assets/tailwind*.css`, HTML com partials inline) são **commitados**; sempre rodar o build e commitar o output junto com a mudança.

Para servir/screenshot/smoke-test localmente, use o skill `run-kleberrangel` (`.claude/skills/run-kleberrangel/`).

## Arquitetura

- **Páginas `.html` na raiz e em `blog/`** — servidas direto pelo Vercel. URLs limpas, redirects, headers (CSP incluso), cache e o cron do keepalive vivem em `vercel.json`.
- **`partials/head-compliance.html`** — fonte única do boot de consentimento LGPD (Consent Mode v2 + pixel-consent-guard + GTM). O conteúdo é injetado inline entre marcadores `<!--partial:...-->` por `npm run build:html`. **Edite o partial, nunca o bloco gerado nas páginas.** A ordem síncrona no `<head>` é o que faz o gate do Pixel funcionar — NUNCA transformar em injeção client-side. Ver `partials/README.md`.
- **`api/`** — functions deliberadamente **zero-dependência** (fetch nativo, sem SDK; `package.json` está no `.vercelignore`): `capi.js` (Meta Conversions API), `chat.js` (chatbot via Anthropic API), `lead.js` (leads → Supabase via service_role), `reviews.js` (Google Places, avaliações ao vivo), `keepalive.js` (cron diário que impede auto-pause do Supabase Free). Segredos só em env vars no painel Vercel — nunca no código.
- **Tailwind**: dois configs — `tailwind.config.js` (home) e `tailwind.landing.config.cjs` (4 landings teal: `prp`, `ombro`, `medicina-regenerativa`, `ozonoterapia-divinopolis`, com fingerprint/hash por causa do cache immutable de `/assets/`). O CDN runtime do Tailwind já foi removido: **não reintroduzir CDN nem migrar para bundler/framework** — o modelo é build local + output commitado.
- **`scripts/`, `docs/`, `src/`, `supabase/`** — dev-only, excluídos do deploy pelo `.vercelignore`. `supabase/migrations/` versiona a tabela `leads`.

## Compliance (inegociável)

- **CFM**: nada de promessa de resultado, garantia de cura, diagnóstico em conteúdo, preço sensacionalista ou depoimento identificável publicado pelo site. Avaliações só via widget que exibe conteúdo público do Google ao vivo (`api/reviews.js`), com fallback de nota agregada + link. Os disclaimers CFM variam por página **de propósito** (contexto específico) — não "unificar".
- **LGPD**: Pixel/GTM só disparam após consentimento (gate do `head-compliance`). Dados de lead (nome/telefone) são PII — nunca em log, nunca no git (`scripts/reativacao.html` é gitignored por isso).
