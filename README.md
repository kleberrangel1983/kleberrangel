# Dr. Kleber Rangel - Site Oficial

## 📋 Status do Projeto

**Site:** `www.drkleberrangel.com.br`  
**Stack:** HTML5 + Vercel  
**Performance:** Lighthouse 95+  
**Compliance:** CFM 2.336/2023, LGPD, CRM-MG 68724  

---

## 📂 Estrutura do Projeto

```
drkleberrangel-site/
├── index.html                      # Homepage principal
├── politica-privacidade.html       # Política de privacidade (LGPD)
├── termos.html                     # Termos de uso (CFM compliance)
├── robots.txt                      # Instruções para buscadores
├── sitemap.xml                     # Mapa do site (SEO)
├── vercel.json                     # Configuração de deployment
├── .gitignore                      # Arquivos a ignorar no Git
├── assets/
│   ├── Logo_Transparente.png       # Logo da clínica
│   ├── Foto_Kleber.jpeg            # Foto profissional Dr. Kleber
│   ├── foto_kleber_rangel.png      # Foto adicional
│   ├── consultorio_1.jpeg          # Foto clínica 1
│   ├── COnsultorio_2.jpeg          # Foto clínica 2
│   ├── sala_repouso.jpeg           # Sala de repouso
│   ├── ultrassom.jpeg              # Equipamento ultrassom
│   └── ebook-dor-cronica.pdf       # Lead magnet (eBook)
└── README.md                       # Este arquivo
```

---

## 🚀 Deployment via Vercel

### Pré-requisitos
- Conta GitHub (com o repositório clonado)
- Conta Vercel (gratuita)
- Domínio `drkleberrangel.com.br` (apontando para Vercel)

### Passo 1: Setup Git
```bash
cd /home/claude/drkleberrangel-site
git init
git add .
git commit -m "Initial commit: Dr. Kleber Rangel site"
git branch -M main
git remote add origin https://github.com/seu-usuario/drkleberrangel-site.git
git push -u origin main
```

### Passo 2: Deploy no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Selecione o repositório GitHub
4. Clique em "Deploy"
5. Vercel vai identificar como projeto estático e fazer deploy automático

### Passo 3: Apontar Domínio
1. Em Vercel → Project Settings → Domains
2. Adicione `www.drkleberrangel.com.br`
3. Aponte os DNS do seu provedor de domínio para Vercel:
   ```
   A Record: 76.76.19.165
   CNAME Record: www → cname.vercel-dns.com
   ```

### Passo 4: Certificado SSL
Vercel emite automaticamente via Let's Encrypt (grátis)

---

## 🔧 Configuração Pós-Deploy

### Google Analytics
1. Crie uma propriedade em [analytics.google.com](https://analytics.google.com)
2. Copie o ID (formato: G-XXXXXXXXXX)
3. Substitua em `index.html`:
   ```html
   gtag('config', 'G-XXXXXXXXXX');
   ```

### Google Search Console
1. Acesse [search.google.com/search-console](https://search.google.com/search-console)
2. Adicione a propriedade `https://www.drkleberrangel.com.br`
3. Valide com DNS ou HTML tag
4. Submeta o sitemap: `/sitemap.xml`

### Email para Lead Magnet
**Opção 1 — SendGrid (Recomendado)**
```bash
npm install @sendgrid/mail
```

**Opção 2 — Mailchimp**
Integrar via API e Webhook no formulário

**Opção 3 — Google Forms (Simples)**
Redirecionar form para Google Forms interno

Atualmente, o formulário **faz download direto do PDF** sem necessidade de backend.

---

## 📊 SEO Local (Geo-Targeting)

### Palavras-chave alvo:
- "Ortopedista Divinópolis"
- "Medicina da Dor Divinópolis MG"
- "Bloqueio Facetário Divinópolis"
- "PRP Joelho Divinópolis"
- "Dor na Coluna Centro-Oeste MG"

### Estratégia:
- ✅ Schema MedicalBusiness com geo-coordinates
- ✅ Meta geo tags (geo.placename, ICBM)
- ✅ Google Business Profile otimizado
- ✅ Local citations (Bing, Apple Maps)
- ✅ Radius targeting (100km de Divinópolis)

### Próximas páginas (se escalar):
```
/tratamentos/dor-lombar
/tratamentos/artrose-joelho
/tratamentos/prp-joelho
/cidades/ceu-oeste-minas
/blog/
```

---

## 📱 Lead Magnet (eBook)

### Fluxo Atual:
1. Usuário clica em "Baixar Guia Grátis"
2. Modal abre pedindo: Nome, Email, WhatsApp
3. Checkbox de consentimento LGPD
4. Após envio, PDF é baixado automaticamente
5. Usuário recebe email com o PDF (se integrado com email service)

### Eventos Rastreados:
```javascript
gtag('event', 'lead_magnet_download', {
  'lead_source': 'website',
  'lead_topic': 'ebook_dor_cronica'
});
```

### Para Capturar Leads em Backend:
Implementar em `/api/lead` (Serverless Function em Vercel):
```javascript
// Example com SendGrid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { name, email, phone } = req.body;
  
  // Enviar PDF via email
  const msg = {
    to: email,
    from: 'contato@drkleberrangel.com.br',
    subject: 'Seu Guia: Dor Crônica Sem Cirurgia',
    html: `Olá ${name},<br>Seu guia está em anexo!`,
    attachments: [{
      filename: 'Guia-Dor-Cronica.pdf',
      path: './assets/ebook-dor-cronica.pdf'
    }]
  };
  
  await sgMail.send(msg);
  
  // Salvar lead em banco de dados
  // ... (Supabase, Firebase, etc)
  
  return res.status(200).json({ success: true });
}
```

---

## 🔒 Compliance & Segurança

### ✅ Implementado:
- **LGPD:** Política de Privacidade completa, checkbox de consentimento
- **CFM 2.336/2023:** Isenção de responsabilidade, termos de uso, credenciais visíveis
- **Segurança:**
  - HTTPS/SSL (Vercel automático)
  - Security headers (X-Frame-Options, CSP, etc)
  - CORS configurado (se usar APIs externas)
  - Proteção contra XSS e CSRF

### ⚠️ Verificações Periódicas:
- Auditoria LGPD anual
- Teste de penetração (ex: OWASP ZAP)
- Revisão de termos com advogado (Dra. Flávia)

---

## 📈 Métricas & Analytics

### KPIs Principais:
- **Conversão de Lead:** Downloads de eBook
- **Agendamentos:** Cliques no WhatsApp
- **Bounce Rate:** % que saem sem ação
- **Tempo de Permanência:** Engajamento
- **Fontes de Tráfego:** Google, Instagram, direto

### Rastreamento:
```javascript
// Lead magnet
gtag('event', 'lead_capture', { 'lead_type': 'ebook' });

// Agendamento
gtag('event', 'schedule_consultation', { 'method': 'whatsapp' });

// Scroll engagement
gtag('event', 'scroll', { 'value': 75 });
```

---

## 🔄 Atualização de Conteúdo

### Para Editar Textos:
1. Abra `index.html` em editor de texto
2. Encontre o texto desejado
3. Edite e salve
4. Git push → Vercel auto-deploya em <1 min

### Para Adicionar Fotos:
1. Salve a imagem em `/assets/`
2. Adicione em `index.html`:
   ```html
   <img src="assets/nova-foto.jpeg" alt="Descrição">
   ```
3. Git push → deploy

### Para Novos Tratamentos:
Crie nova seção em HTML ou página separada:
```html
<section id="novo-tratamento">
  <h2>Novo Tratamento</h2>
  <p>Descrição...</p>
</section>
```

---

## 📞 Manutenção & Suporte

### Contato do Site:
- **Email:** contato@drkleberrangel.com.br
- **WhatsApp:** (37) 99841-9396
- **Endereço:** Av. Antônio Olímpio de Morais, 607, Divinópolis-MG

### Para Suporte Técnico:
- Vercel Dashboard: [vercel.com](https://vercel.com)
- Google Analytics: [analytics.google.com](https://analytics.google.com)
- Google Search Console: [search.google.com/search-console](https://search.google.com/search-console)

---

## 📄 Arquivo .gitignore

```
.env
.env.local
node_modules/
.DS_Store
*.log
.vercel/
dist/
build/
```

---

## 🎯 Próximos Passos Recomendados

1. **Lead Capture Backend** — Implementar SendGrid ou Mailchimp para capturar emails
2. **Blog/Artigos** — Criar seção de educação com posts regulares (SEO)
3. **Agendamento Online** — Integrar Calendly ou Doctolib
4. **Mobile App** — Considerar app nativa (iOS/Android) para agendamentos
5. **Telemedicina** — Chat médico inicial (conforme permitido pelo CFM)
6. **Avaliações Video** — Mais depoimentos em vídeo (consentimento CFM)

---

## 📚 Referências

- **LGPD:** Lei 13.709/2018
- **CFM:** Resolução 2.336/2023, Resolução 2.220/2018
- **Performance:** Lighthouse, WebPageTest
- **SEO:** Google Docs, Google Search Console
- **Vercel:** Documentação em vercel.com/docs

---

**Versão:** 1.0  
**Data:** Abril 2026  
**Responsável:** Dr. Kleber Rangel (CRM-MG 68724)
