#!/usr/bin/env node
// PostToolUse (Edit|Write) — avisa quando um JS de assets/ foi editado e o hash do nome
// deixou de bater com o conteúdo.
//
// O BUG INVISÍVEL QUE ISTO EVITA:
// vercel.json serve /assets/(.*) com "max-age=31536000, immutable" — cache de UM ANO. Os JS
// críticos (consent, capi-client, meta-config, advanced-matching) são versionados À MÃO, com
// hash de conteúdo no nome. Editar o arquivo SEM renomear não quebra nada aos seus olhos: você
// faz deploy, abre o site numa aba nova e vê a versão certa. Mas todo visitante RECORRENTE
// continua recebendo o arquivo VELHO, do cache dele, pelo próximo ano — sem erro, sem sintoma.
// Já aconteceu neste repo (commit 9d85314).
//
// Por isso este hook AVISA em vez de bloquear: a edição em si é legítima. O que falta é o
// segundo passo (renomear + atualizar o <script src> nas páginas), e é ele que se esquece.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input;
try { input = JSON.parse(raw); } catch { process.exit(0); }

const filePath = input?.tool_response?.filePath ?? input?.tool_input?.file_path ?? '';
if (!filePath) process.exit(0);

const norm = filePath.replace(/\\/g, '/');
if (!/\/assets\/[^/]+\.js$/.test(norm)) process.exit(0);

const REPO = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..', '..'
);

let conteudo;
try { conteudo = fs.readFileSync(filePath); } catch { process.exit(0); }

const nomeArquivo = path.basename(norm);
const hashReal = crypto.createHash('sha256').update(conteudo).digest('hex').slice(0, 8);
const m = nomeArquivo.match(/^(.+)\.([0-9a-f]{8})\.js$/);

const avisos = [];

if (!m) {
  // Arquivo sem hash nenhum, servido sob cache immutable de 1 ano. É o caso do
  // google-reviews.js: qualquer correção nele nunca chega a quem já visitou o site.
  avisos.push(
    `assets/${nomeArquivo} NÃO tem hash de conteúdo no nome, mas é servido com\n` +
    `  "max-age=31536000, immutable" (1 ano). Esta edição NUNCA chegará a visitantes recorrentes.\n` +
    `  Renomeie para ${nomeArquivo.replace(/\.js$/, '')}.${hashReal}.js e atualize os <script src>.`
  );
} else {
  const [, base, hashNoNome] = m;
  if (hashNoNome !== hashReal) {
    // Quais páginas ainda apontam para o hash velho?
    const refs = [];
    const varrer = (dir) => {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', '.claude'].includes(f.name)) continue;
        const p = path.join(dir, f.name);
        if (f.isDirectory()) varrer(p);
        else if (f.name.endsWith('.html') && fs.readFileSync(p, 'utf8').includes(nomeArquivo)) {
          refs.push(path.relative(REPO, p).replace(/\\/g, '/'));
        }
      }
    };
    try { varrer(REPO); } catch { /* best-effort */ }

    avisos.push(
      `O conteúdo de assets/${nomeArquivo} mudou, mas o hash do NOME não.\n` +
      `  nome diz: ${hashNoNome}   conteúdo agora é: ${hashReal}\n\n` +
      `  Sob "immutable, 1 ano", visitantes recorrentes seguirão recebendo a versão VELHA — sem erro visível.\n` +
      `  Faltam dois passos:\n` +
      `    1. renomear para assets/${base}.${hashReal}.js\n` +
      `    2. atualizar o <script src> nas ${refs.length} página(s) que o referenciam:\n` +
      (refs.length ? `       ${refs.join(', ')}` : '       (nenhuma página encontrada — confira manualmente)')
    );
  }
}

if (avisos.length === 0) process.exit(0);

process.stdout.write(JSON.stringify({
  systemMessage: `⚠️  ${nomeArquivo}: hash de conteúdo desatualizado — cache immutable de 1 ano serviria o arquivo velho.`,
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: `CACHE IMMUTABLE (1 ANO) — ação necessária:\n\n  ${avisos.join('\n\n  ')}`,
  },
}));
