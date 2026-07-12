# Sanitização CFM 2.336/2023 — pendências do site (revisão jurídica/ética)

Checklist de itens que **não** foram corrigidos por edição mecânica nesta PR — ou porque o
arquivo está bloqueado (PR #13 aberto), ou porque a decisão exige avaliação jurídica/ética do
dono. Esta pasta `docs/` não é deployada (`.vercelignore`); serve apenas de checklist interno.

## Pendências de revisão jurídica / decisão do dono (`owner`)

- **index.html** — Seção "Medicina regenerativa" (~linha 789-791) lista **PRP**, **BMA (aspirado de
  medula óssea)** e **Proloterapia** como serviços oferecidos. Proloterapia e terapias com aspirado
  de medula têm status restrito/sem reconhecimento pleno pelo CFM; publicizá-las como oferta pode
  caracterizar promessa de procedimento não consagrado (paralelo Art. 16). — *O que fazer:* decidir
  entre **manter**, **requalificar** ("em casos selecionados conforme evidência") ou **retirar**
  Proloterapia/BMA da vitrine. Não é edição mecânica; depende de avaliação jurídica/ética sobre o
  reconhecimento da técnica pelo CFM.

## Pendências documentais (`doc`)

- **lp-dor-coluna.html** (linha 446) — Contém o mesmo superlativo não verificável "o maior da região
  Oeste de MG" ("...trabalhei anos no Hospital São João de Deus — o maior da região Oeste de MG."), em
  redação diferente da corrigida em `joelho.html`/`coluna.html`. Não estava na lista de achados verificados
  desta área, então **não foi editado** para não inventar correção fora de escopo. — *O que fazer:* aplicar
  a mesma sanitização do Art. 13 (remover o superlativo, manter o vínculo institucional factual) numa próxima
  passada.


- **medicina-regenerativa.html** — **ARQUIVO BLOQUEADO (PR #13 aberto, não editar aqui).** Anuncia
  "Concentrado com células-tronco mesenquimais e fatores de crescimento" (linha 116) e "Proloterapia"
  como tratamentos oferecidos. Publicidade de células-tronco/terapias regenerativas de status restrito
  pode conflitar com o Art. 16 e normas do CFM sobre técnicas não consagradas. — *O que fazer:* avaliar
  juridicamente a divulgação de células-tronco mesenquimais e proloterapia e ajustar **dentro do PR #13**
  antes do merge.

- **prp-joelho-divinopolis.html** — No corpo (hero-summary, linha 140) o texto afirma "redução de dor e
  melhora de função por 6 a 24 meses, superiores ao corticoide e comparáveis ao ácido hialurônico". É
  afirmação de resultado/comparação que, embora apoiada em dados, deveria vir acompanhada de citação
  visível da fonte e de ressalva de que o resultado é individual (Art. 11). — *O que fazer:* explicitar a
  fonte do dado e acrescentar a ressalva "resultados variam conforme o caso". Pendência leve, não
  bloqueio.
