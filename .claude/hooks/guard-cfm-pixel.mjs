#!/usr/bin/env node
// PreToolUse (Edit|Write) — bloqueia conteúdo que viola a publicidade médica (CFM 2.336/2023)
// ou que hardcoda o ID do Meta Pixel fora da fonte única.
//
// POR QUE BLOQUEAR EM VEZ DE AVISAR:
// as duas classes aqui são objetivas e caras. Preço numa página médica é infração de
// publicidade (risco de CRM, não de bug). Pixel hardcodado foi exatamente como o browser e o
// server-side se descasaram antes (ver comentário em assets/meta-config.js) — e o sintoma só
// aparece semanas depois, como dado faltando no Meta. Nenhuma das duas se percebe em revisão.
//
// PRECISÃO ACIMA DE COBERTURA: um hook que acusa texto legítimo é desligado, e aí não protege
// nada. Todos os padrões abaixo foram rodados contra o site inteiro com ZERO acusação. Não
// adicione padrão sem repetir esse teste.
//
// DUAS ARMADILHAS JÁ PAGAS (não as reintroduza):
//   1. NEGAÇÃO. Em texto médico/jurídico os termos proibidos aparecem quase sempre NEGADOS:
//      termos.html tem "Obrigação de Meio — SEM Garantia de Resultado". Casar a frase sem olhar
//      o que vem antes acusa justamente o disclaimer que protege o médico. Por isso ehNegado().
//   2. "sem dor" NÃO é promessa: a /unha-encravada diz "o procedimento é realizado sem dor",
//      que é fato clínico sob anestesia. Foi testado e cortado do padrão de propósito.

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0); // sem payload legível, não é papel do guarda travar a sessão
}

const filePath = input?.tool_input?.file_path ?? '';
// Write traz o arquivo inteiro; Edit traz só o trecho novo. Só olhamos o que ESTÁ ENTRANDO —
// conteúdo pré-existente não é responsabilidade desta edição.
const content = input?.tool_input?.content ?? input?.tool_input?.new_string ?? '';

if (!content) process.exit(0);

const norm = filePath.replace(/\\/g, '/');
// O arquivo real carrega hash de conteúdo no nome (meta-config.17f8c64e.js) — casar só com
// "meta-config.js" bloquearia edições na própria fonte única do pixel.
const ehFonteDoPixel = /assets\/meta-config(\.[0-9a-f]+)?\.js$/.test(norm);

const NEGADORES = /\b(sem|não|nao|nenhum[ae]?|inexist\w*|nunca|jamais|livre de)\b/i;

// Um match precedido por negação nos ~40 chars anteriores é o oposto de uma promessa.
function ehNegado(texto, idx) {
  return NEGADORES.test(texto.slice(Math.max(0, idx - 40), idx));
}

const REGRAS = [
  {
    // Preço, honorário ou forma de pagamento. Vedado na publicidade médica.
    re: /R\$\s*\d|\b\d+\s*x\s*sem\s*juros\b|\bparcelamos\b|\bparcelamento\s+em\s+\d/gi,
    motivo: 'preço, honorário ou forma de pagamento — vedado pela Resolução CFM 2.336/2023',
    checarNegacao: false, // "sem juros" já contém "sem"; negar aqui não faz sentido
  },
  {
    // Promessa/garantia de resultado. Frases fechadas de propósito: "cura" ou "garantia"
    // soltos apareceriam em texto clínico legítimo ("procura", "garantia de qualidade").
    re: /resultado[s]?\s+garantido|garantia\s+de\s+(resultado|cura)|cura\s+garantida|100\s*%\s*(de\s*)?(sucesso|efic|garant)|\bcura\s+definitiva\b/gi,
    motivo: 'promessa ou garantia de resultado — vedado pela Resolução CFM 2.336/2023 (o resultado varia por paciente)',
    checarNegacao: true,
  },
  {
    // Imagem de antes/depois — vedada na publicidade médica.
    re: /antes\s+e\s+depois/gi,
    motivo: 'menção/imagem de "antes e depois" — vedado pela Resolução CFM 2.336/2023',
    checarNegacao: true,
  },
];

const achados = [];

for (const regra of REGRAS) {
  for (const m of content.matchAll(regra.re)) {
    if (regra.checarNegacao && ehNegado(content, m.index)) continue;
    achados.push(`  • ${regra.motivo}\n    trecho: "${m[0]}"`);
    break; // um achado por regra basta para bloquear
  }
}

if (!ehFonteDoPixel && /877941071024223/.test(content)) {
  achados.push(
    '  • ID do Meta Pixel hardcodado. A fonte única é assets/meta-config.js (window.META_PIXEL_ID).\n' +
    '    Hardcodar foi como o browser e o server-side já se descasaram uma vez.'
  );
}

if (achados.length === 0) process.exit(0);

const razao =
  `Conteúdo bloqueado em ${norm || 'arquivo'}:\n${achados.join('\n')}\n\n` +
  `Se for falso positivo, ajuste o padrão em .claude/hooks/guard-cfm-pixel.mjs — não contorne o guarda.`;

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: razao,
  },
}));
