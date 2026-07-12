# Recurso — categorização restrita da fonte de dados (Meta)

Pixel **877941071024223** ("Pixel Kleber Rangel"). Sintoma no Events Manager:
*"Seu evento está bloqueado devido à forma como suas fontes de dados estão categorizadas."*

Efeito: a Meta aceita a chamada da CAPI (`200`, `events_received: 1`) e **descarta o evento**.
Nenhum evento server-side conta — nem com o token correto. Bloqueio ativo desde ~27/mai/2026.

> `docs/` está no `.vercelignore` — este arquivo não vai a público.

## Onde solicitar a análise

Events Manager → fonte de dados (Pixel Kleber Rangel) → **Configurações** → **Solicitar análise**
(*Request Review*), no aviso de categorização.
https://business.facebook.com/events_manager2/list/dataset/877941071024223/settings

Prazo típico de resposta: 5 a 7 dias úteis (pode chegar a 14).

## Por que a Meta restringiu (e por que o recurso é legítimo)

Os classificadores da Meta olham três sinais, e o site aciona os três **por ser o que é** —
uma clínica de ortopedia e dor:

| Sinal | O que a Meta vê aqui |
|---|---|
| Terminologia do site | "hérnia de disco", "artrose", "dor crônica" |
| Estrutura de URL | `/prp-joelho-divinopolis`, `/ozonioterapia-coluna-divinopolis` |
| Nomes de evento / parâmetros | `content_name`: "PRP WhatsApp Hero", "Ozonio Floating" |

O recurso **não nega** que o anunciante é da área de saúde — ele é. O que se demonstra é que a
fonte **não coleta dado sensível de saúde** e que o consentimento e a privacidade estão tratados
corretamente.

## Argumento do recurso (texto para colar no formulário)

> O Dr. Kleber Rangel é médico ortopedista (CRM-MG 68724, RQE 43142) e o site
> www.drkleberrangel.com.br é institucional e informativo. A fonte de dados **não coleta nem
> transmite dados sensíveis de saúde**: nenhum diagnóstico, condição clínica, prontuário,
> prescrição ou resultado de exame é capturado ou enviado à Meta.
>
> Os únicos eventos enviados são de contato comercial — `whatsapp_click` e `phone_call`
> (clique em botão de contato) e `Lead`/`Contact` — sem qualquer parâmetro que descreva
> condição médica do usuário. Os dados de correspondência avançada limitam-se a nome e
> telefone informados voluntariamente pelo próprio usuário, com hash SHA-256, e **somente
> mediante consentimento explícito**.
>
> O site opera com Google Consent Mode: todo rastreamento nasce com `ad_storage` e
> `analytics_storage` **negados** e só é liberado após aceite ativo do visitante em banner de
> consentimento (opt-in, sem caixa pré-marcada), presente em 100% das páginas, inclusive nos
> artigos do blog. Há painel "Gerenciar cookies" permitindo revogar o consentimento a qualquer
> momento, conforme o Art. 8 §5 da LGPD. A Política de Privacidade divulga o envio server-side
> à Meta (Conversions API), o uso de correspondência avançada e a transferência internacional.
>
> Solicitamos a reclassificação da fonte de dados para permitir o processamento normal dos
> eventos de contato comercial.

## Evidências a anexar

- [ ] Print do **banner de consentimento** numa landing (ex.: `/prp-joelho-divinopolis`),
      mostrando as opções "Aceitar todos" / "Apenas essenciais" / "Rejeitar todos".
- [ ] Print do link **"Gerenciar cookies"** no rodapé (revogação — LGPD Art. 8 §5).
- [ ] Print da **Política de Privacidade** (seções sobre CAPI, correspondência avançada,
      dado sensível e transferência internacional): https://www.drkleberrangel.com.br/politica-privacidade.html
- [ ] Print do Events Manager mostrando os **nomes dos eventos** enviados
      (`whatsapp_click`, `phone_call`, `Lead`, `Contact`, `PageView`) — nenhum descreve condição clínica.
- [ ] Registro do CRM/RQE do médico (identidade profissional legítima).

## Antes de enviar o recurso — limpar os sinais que atrapalham

1. **O GTM está mandando lixo para o Pixel.** Chegam `gtm.init`, `gtm.js`, `gtm.load` e `scroll`
   — eventos internos do Tag Manager, não eventos de negócio. Poluem o dataset e reforçam a
   impressão de coleta indiscriminada em páginas clínicas. **Corrigir no container `GTM-KRCJVG3`**
   antes de pedir a análise.
2. **`content_name` cita procedimentos** ("PRP WhatsApp Hero", "Ozonio Floating", "Regen ..."):
   são rótulos internos de CTA, não condição do paciente — mas alimentam o classificador.
   Neutralizar é opcional (custo: relatórios menos legíveis). Decisão do dono.
3. **O Pixel grava `_fbp` sem consentimento** (comprovado em produção): o Consent Mode do Google
   não controla tag de terceiro. Marcar as *additional consent checks* na tag do Pixel no GTM —
   isso também fortalece o recurso.

## Pendências relacionadas (mesma fonte de dados)

- **Token da CAPI é read-only.** `debug_token` → `scopes: ["read_ads_dataset_quality"]` (Dataset
  Quality API). Gerar pelo usuário do sistema **"Trate a Dor"** (`61584297303976`, Admin, com
  acesso ao Pixel) com **`ads_management`**. Mesmo com o token certo, os eventos só voltam a
  contar **depois** que a categorização for resolvida.
- **Gateway de terceiro** `openbridge → capig.datah04.com` (Datahash) configurado neste Pixel,
  sem autorização do dono. Hoje o CSP do site bloqueia. Remover no Events Manager.
