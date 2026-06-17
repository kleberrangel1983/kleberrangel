# Copy compliant para a nova UI (melhoria-de-ui-ux.vercel.app)

**Contexto:** o redesign tem layout superior, mas a copy reintroduz violações da
Resolução CFM 2.336/2023 que o site atual (drkleberrangel.com.br) já havia corrigido.
Abaixo, cada item problemático com a reescrita pronta para colar. **Mantenha o design — troque só o texto.**

> Critério: CFM 2.336/2023, Art. 11 (proibido promessa de resultado, sensacionalismo,
> concorrência desleal/comparativo) e Art. 4 (identificação obrigatória).

---

## 1. H1 do hero — 🔴 promessa de resultado

**Atual:**
> "Volte a viver sem dor crônica — com precisão e cuidado."

**Problema:** "Volte a viver sem dor crônica" promete resultado funcional/cura — mesmo vício
do "Volte a fazer o que ama" já reprovado na auditoria. Medicina é obrigação de meio, não de fim.

**Reescrita (alinhada ao H1 já aprovado no site atual):**
> **"Dor crônica na coluna, joelho ou ombro? Vamos descobrir a causa."**

Subhead atual pode ser mantido (é técnico e compliant):
> "Ortopedia especializada em dor crônica e medicina regenerativa em Divinópolis-MG.
> Procedimentos minimamente invasivos guiados por ultrassom para coluna, joelho e ombro."

---

## 2. Stat callout "95% evitam cirurgia" — 🔴 promessa estatística / garantia

**Atual:** bloco de números com "95% evitam cirurgia".

**Problema:** é o achado mais grave. Número de outcome ("95% evitam cirurgia") = promessa de
resultado + garantia implícita de "sem cirurgia". Não é defensável numa fiscalização do CRM.

**Reescrita:** **remover o "95%"** e substituir por um dado de credibilidade que NÃO seja
promessa de resultado. Sugestão de trio de stats:

| Antes | Depois |
|---|---|
| 15+ anos de experiência | 15+ anos de experiência ✅ (manter) |
| 6.000+ pacientes | 6.000+ pacientes atendidos ✅ (manter — é volume, não outcome) |
| **95% evitam cirurgia** ❌ | **Consulta de 50–60 min** ou **CRM-MG 68724 · RQE 43142** |

---

## 3. Tagline "Tratamento da dor sem cirurgia desnecessária" — 🟡 "sem cirurgia"

**Problema:** "sem cirurgia" categórico pode ser lido como garantia de evitar cirurgia;
há casos em que a cirurgia é a indicação correta.

**Reescrita:**
> "Tratamento da dor com procedimentos minimamente invasivos, quando indicados."

ou

> "Alternativas ao tratamento cirúrgico, avaliadas caso a caso."

---

## 4. "...resolver a causa — não apenas mascarar o sintoma" — 🟡 comparativo desleal

**Problema:** "não apenas mascarar o sintoma" sugere que outros médicos só "mascaram" —
concorrência desleal (Art. 11, II).

**Reescrita:**
> "Diagnóstico detalhado e um plano de tratamento individualizado, focado na causa da dor."

---

## 5. Depoimentos individuais (Luciana M., M.C.S., R.M., J.A.R.) — 🔴 prova social identificável

**Problema:** depoimentos de paciente identificável sugerindo resultado violam o Art. 11 e o
Art. 75 do CEM, mesmo com autorização. O site atual já substituiu isso por avaliação agregada.

**Reescrita:** trocar toda a seção pelo bloco de **avaliação pública agregada** (mesmo padrão
já no ar). Markup de referência (ajuste as classes ao design da nova UI):

```html
<section class="...">
  <h2>Avaliação dos pacientes</h2>
  <p>Avaliação pública agregada, sem divulgação de relatos individuais —
     em conformidade com a Resolução CFM nº 2.336/2023.</p>
  <div class="card">
    <div class="score">4,8</div>
    <div class="stars">★★★★★</div>
    <p>Média das avaliações públicas no Google — pacientes atendidos em Divinópolis-MG e região.</p>
    <a href="https://www.google.com/search?q=Dr+Kleber+Rangel+Divinopolis"
       target="_blank" rel="noopener noreferrer">Ver avaliações no Google →</a>
  </div>
</section>
```

---

## Checklist antes de publicar a nova UI
- [ ] H1 sem promessa de resultado (item 1)
- [ ] Remover "95% evitam cirurgia" dos stats (item 2)
- [ ] "sem cirurgia" → "minimamente invasivos quando indicados" (item 3)
- [ ] Remover "não apenas mascarar o sintoma" (item 4)
- [ ] Depoimentos individuais → avaliação agregada Google (item 5)
- [ ] Confirmar CRM-MG 68724 · RQE 43142 visíveis no header e rodapé (✅ já presentes)
- [ ] Disclaimer "O contato via WhatsApp não constitui consulta médica." no CTA
