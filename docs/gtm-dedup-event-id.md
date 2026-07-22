# Deduplicação Pixel ↔ CAPI — corrigir o `event_id` no GTM

> Nos nomes de tag/variável abaixo, `<PIXEL_ID>` é o ID do Pixel principal — o valor de
> `window.META_PIXEL_ID` em `assets/meta-config.js` (fonte única). Não hardcode o número
> em código; aqui é só referência aos nomes que já existem no container.

## O problema (diagnóstico verificado no painel, jul/2026)

O mesmo Lead/Contact chega ao Meta por dois caminhos com **`event_id` diferentes**, então
o Meta conta como **dois eventos** (conversões infladas, otimização com dado errado):

| Caminho | `event_id` que usa |
|---|---|
| Browser Pixel (tag do GTM) | `gtm.start.uniqueEventId` — gerado pela variável **`Get_Event_ID`** do próprio GTM |
| CAPI (`capi-client.js`) | `evt_...` — gerado pelo site |

A tag `FB_CONVERSIONS_API-<PIXEL_ID>-Web-Tag-Pixel_Template` usa, no campo **Event ID**,
a variável `...-Web-Variable-Event_ID_Constant`, que aponta para `...-Web-Variable-Get_Event_ID`
(o id do GTM) — **não** o id que o site envia ao CAPI. Por isso os dois nunca casam, e existe
o "monkeypatch" de 2s em `advanced-matching.js` (linhas ~147-171) tentando suprimir o duplicado.

## Passo 1 — Código (JÁ FEITO nesta branch)

`assets/capi-client.js` passou a **anexar o `event_id` ao item do dataLayer ANTES do
`originalPush`**. A tag do Pixel dispara *dentro* do `originalPush`, então agora o `event_id`
já está disponível no push quando a tag lê. É uma mudança **preparatória e segura**: enquanto
o GTM ainda usar `Get_Event_ID`, nada muda no comportamento atual.

Asset renomeado `capi-client.4d796c9c.js` → `capi-client.9d2e3ae2.js` (hash de conteúdo) +
18 páginas atualizadas.

## Passo 2 — GTM (a fazer, com teste no modo Preview)

> ⚠️ **Publicar o container afeta o site ao vivo.** Faça no modo **Visualizar (Preview)** primeiro.

1. **Criar a variável** (Variáveis → Nova → Variável da camada de dados):
   - Nome: `DLV - event_id`
   - Nome da variável da camada de dados: `event_id`
   - Versão: 2

2. **Apontar a tag do Pixel** para essa variável:
   - Abrir `FB_CONVERSIONS_API-<PIXEL_ID>-Web-Tag-Pixel_Template`
   - No campo **Event ID** (em *More Settings*), trocar
     `{{...-Web-Variable-Event_ID_Constant}}` por **`{{DLV - event_id}}`**

3. **Testar no Preview** (Tag Assistant):
   - Abrir o site pelo Preview, clicar num CTA de WhatsApp e num telefone.
   - No evento `whatsapp_click` / `phone_call`, conferir que a variável `DLV - event_id`
     resolve para um valor `evt_...` (o mesmo que aparece no POST para `/api/capi` na aba Rede).
   - Confirmar no **Events Manager → Test Events** que o Lead/Contact chega **uma vez só**
     (browser + servidor deduplicados), não duas.

4. **Publicar** o container só depois que o Preview confirmar o id igual nos dois caminhos.

## Passo 3 — Código (SÓ depois do Passo 2 publicado e validado)

Remover o monkeypatch de `assets/advanced-matching.js` (o bloco que sobrescreve `window.fbq`
por 2s, ~linhas 142-171). Ele só existe porque a tag do GTM disparava com id diferente; com o
`event_id` unificado, o Lead/Contact do `advanced-matching` (disparo direto do `fbq`) e o da
tag do GTM passam a ter o **mesmo** id e o Meta deduplica sozinho — a gambiarra vira ruído.

> **Ordem importa:** remover o monkeypatch ANTES do GTM estar corrigido reintroduz o Lead
> duplicado. Faça só quando o Passo 2 estiver no ar e validado.

## Como confirmar que deu certo

- Events Manager → o pixel para de acusar eventos duplicados / "event_id ausente".
- No Test Events, cada Lead/Contact aparece com `Deduplicated: yes` (browser + server).
- O EMQ tende a subir (mais sinais consolidados num evento só).
