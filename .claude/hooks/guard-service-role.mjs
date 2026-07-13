#!/usr/bin/env node
// PreToolUse (Edit|Write) — bloqueia a chave que ignora RLS de sair de api/, e qualquer
// segredo hardcodado.
//
// A FRONTEIRA QUE IMPORTA:
// api/  -> roda no SERVIDOR (função serverless). process.env existe. É onde a chave pode estar.
// assets/, *.html -> roda no NAVEGADOR do paciente. Tudo ali é público, por definição.
//
// SUPABASE_SERVICE_ROLE_KEY passa POR CIMA de RLS — é acesso total ao banco. Ela circula
// legitimamente em api/lead.js e api/keepalive.js, e é justamente por circular no repo que o
// copiar-colar para o arquivo errado é plausível. Se ela chegar a assets/*.js, o banco de
// pacientes fica exposto a qualquer um que abra o DevTools. Não há sintoma: o site funciona.
//
// Também barra segredo hardcodado (JWT literal), independente da pasta: chave em código-fonte
// vai para o Git, e do Git não sai mais — rotacionar vira a única saída.

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input;
try { input = JSON.parse(raw); } catch { process.exit(0); }

const filePath = (input?.tool_input?.file_path ?? '').replace(/\\/g, '/');
const conteudo = input?.tool_input?.content ?? input?.tool_input?.new_string ?? '';
if (!conteudo) process.exit(0);

// O próprio guarda menciona os nomes das chaves; não pode se autobloquear.
if (/\.claude\/hooks\//.test(filePath)) process.exit(0);

const achados = [];

// 1) Chave de service role fora do servidor.
const ehServidor = /(^|\/)api\//.test(filePath);
if (!ehServidor && /SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|service_role/i.test(conteudo)) {
  achados.push(
    `  • Chave de SERVICE ROLE fora de api/ (arquivo: ${filePath || '?'}).\n` +
    `    Ela PASSA POR CIMA de RLS — é acesso total ao banco de pacientes. Fora de api/, o código\n` +
    `    roda no navegador do paciente, e tudo que está lá é público. O site continuaria funcionando\n` +
    `    normalmente; o banco é que estaria aberto.`
  );
}

// 2) Segredo hardcodado: JWT literal (Supabase anon/service key, tokens em geral).
const jwt = conteudo.match(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);
if (jwt) {
  achados.push(
    `  • Segredo hardcodado (JWT literal: ${jwt[0].slice(0, 18)}...).\n` +
    `    Use process.env — chave em código-fonte entra no Git, e do histórico não sai mais:\n` +
    `    rotacionar a chave passa a ser a única saída.`
  );
}

// 3) Token da CAPI / chaves de API coladas direto.
if (/META_CAPI_TOKEN\s*=\s*['"][^'"]{10,}|ANTHROPIC_API_KEY\s*=\s*['"]sk-|GOOGLE_PLACES_API_KEY\s*=\s*['"][^'"]{10,}/i.test(conteudo)) {
  achados.push(
    `  • Token/API key atribuído literalmente no código. Deve vir de process.env (painel da Vercel).`
  );
}

if (achados.length === 0) process.exit(0);

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason:
      `Bloqueado — segredo cruzando a fronteira servidor/navegador:\n\n${achados.join('\n\n')}\n\n` +
      `Se for falso positivo, ajuste .claude/hooks/guard-service-role.mjs — não contorne o guarda.`,
  },
}));
