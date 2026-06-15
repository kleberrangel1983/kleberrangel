# Dr. Kleber Rangel — Site Oficial

**Site:** www.drkleberrangel.com.br
**Stack:** HTML5 + Vercel Serverless Functions
**Performance:** Lighthouse 95+
**Compliance:** CFM 2.336/2023, LGPD

---

## Estrutura do Projeto

```
kleberrangel/
├── index.html                  # Homepage principal
├── politica-privacidade.html   # Política de privacidade (LGPD)
├── termos.html                 # Termos de uso (CFM compliance)
├── robots.txt                  # Instruções para buscadores
├── sitemap.xml                 # Mapa do site (SEO)
├── site.webmanifest            # Suporte PWA
├── vercel.json                 # Configuração de deployment
├── .gitignore
├── .vercelignore
├── api/
│   └── capi.js                 # Conversions API server-side (Meta)
├── assets/
│   ├── advanced-matching.js    # Advanced Matching modal (Meta Pixel)
│   ├── capi-client.js          # Envia eventos browser → /api/capi
│   ├── ebook-dor-cronica.pdf   # Lead magnet
│   └── ...                     # Imagens, favicons, logos
├── blog/
│   └── *.html                  # Artigos de conteúdo (SEO)
└── src/
    └── tailwind-input.css      # Entrada do build Tailwind (dev only)
```

---

## Deploy

O projeto usa **Vercel** com deploy automático via GitHub.

### Variáveis de Ambiente (configurar no painel Vercel)

| Variável | Descrição |
|---|---|
| `META_CAPI_TOKEN` | Token de acesso da Conversions API do Meta |
| `META_PIXEL_ID` | ID do Meta Pixel |
| `META_CAPI_TEST_EVENT_CODE` | Código de teste (opcional, para debug) |

### Passos

1. Push para `main` → deploy automático em produção
2. PRs → preview deployment automático

---

## Stack Técnico

- **Frontend:** HTML5 + CSS3 + Vanilla JS (sem framework)
- **Backend:** Vercel Serverless Functions (Node.js)
- **CDN/Hosting:** Vercel Pro
- **Analytics:** Google Analytics 4 + Google Tag Manager
- **Conversões:** Meta Conversions API (server-side) + Pixel browser-side
- **SEO:** Schema.org MedicalBusiness, sitemap.xml, robots.txt

---

## Compliance

- **LGPD:** Política de privacidade, checkbox de consentimento, Consent Mode
- **CFM 2.336/2023:** Disclaimer, termos de uso, credenciais visíveis no site
- **Segurança:** Headers CSP, X-Frame-Options, HTTPS via Vercel
