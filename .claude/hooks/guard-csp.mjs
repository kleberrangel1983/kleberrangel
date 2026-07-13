#!/usr/bin/env node
// PreToolUse (Edit|Write) — o CSP deste site não é higiene genérica: é contenção ativa.
//
// POR QUE ISTO EXISTE:
// o gateway "Datahash" (capig.datah04.com) está configurado NO PIXEL da clínica e NUNCA foi
// autorizado pelo dono. Quem impede esse cano de exfiltrar dado hoje é o Content-Security-Policy
// do site — nada mais. Uma linha distraída afrouxando script-src/connect-src reabre um canal de
// dado de terceiro num site de saúde, e o sintoma é ZERO: nada quebra, nada aparece nos logs.
//
// COMO EVITA FALSO POSITIVO (a versão ingênua era inservível):
//   1. A linha de base é o CSP QUE JÁ ESTÁ NO vercel.json EM DISCO. O que já está lá é, por
//      definição, o estado aprovado — o guarda só reclama do que é NOVO em relação a isso.
//      Assim ele se auto-mantém: endureça ou afrouxe o CSP legitimamente e a nova base é aquela.
//   2. Se o CSP da edição é IDÊNTICO ao do disco, cala a boca. Reescrever o vercel.json para
//      adicionar um rewrite (o que /nova-landing faz sempre) não pode virar atrito.
//   3. Nome de arquivo NÃO é domínio. "coluna.html" e "ebook.pdf" casam com qualquer regex
//      ingênua de host — e a primeira versão deste hook acusou 28 deles.

import fs from 'node:fs';
import path from 'node:path';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input;
try { input = JSON.parse(raw); } catch { process.exit(0); }

const conteudo = input?.tool_input?.content ?? input?.tool_input?.new_string ?? '';
if (!conteudo) process.exit(0);

if (!/Content-Security-Policy|script-src|connect-src|frame-src/i.test(conteudo)) process.exit(0);

const REPO = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..', '..'
);

// O valor do CSP dentro de um blob de texto (vercel.json ou <meta http-equiv>).
function extrairCsp(texto) {
  const m = texto.match(/(?:default-src|script-src)[^"']*/i);
  return m ? m[0].replace(/\s+/g, ' ').trim() : '';
}

const EXTENSOES = /\.(html?|pdf|js|css|json|xml|txt|webp|jpe?g|png|svg|ico|mjs|map|webmanifest)$/i;

function hosts(csp) {
  return new Set(
    (csp.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}/gi) || [])
      .map(h => h.replace(/^https?:\/\//, '').toLowerCase())
      .filter(h => !EXTENSOES.test(h)) // nome de arquivo não é domínio
  );
}

const cspNovo = extrairCsp(conteudo);
if (!cspNovo) process.exit(0);

let cspAtual = '';
try { cspAtual = extrairCsp(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8')); } catch { /* segue */ }

// CSP inalterado -> silêncio. É o caso de reescrever o vercel.json por outro motivo.
if (cspAtual && cspNovo === cspAtual) process.exit(0);

const base = hosts(cspAtual);
const novos = [...hosts(cspNovo)].filter(h => !base.has(h));

const datahash = /datah04|datahash|capig/i.test(conteudo);
const suspeito = datahash || novos.length > 0;

const razao = suspeito
  ? `Edição do CSP introduz domínio de terceiro que NÃO está no CSP atual:\n` +
    `  ${datahash ? 'GATEWAY DATAHASH detectado — ' : ''}${novos.join(', ') || '(padrão do Datahash)'}\n\n` +
    `O CSP deste site é o ÚNICO controle que hoje impede o gateway Datahash (capig.datah04.com),\n` +
    `configurado no pixel SEM autorização do dono, de exfiltrar dado. Afrouxar script-src ou\n` +
    `connect-src reabre um canal de dado de terceiro num site de saúde — sem sintoma nenhum.\n\n` +
    `Se o domínio é legítimo, adicione-o ao CSP num commit próprio e explicado, para que a\n` +
    `decisão fique registrada e revisável.`
  : `Esta edição altera o Content-Security-Policy (sem introduzir domínio novo).\n\n` +
    `O CSP aqui é contenção ativa — é o que impede o gateway Datahash (não autorizado) de\n` +
    `exfiltrar dado do pixel. Confirme que a mudança não afrouxa script-src/connect-src.`;

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: suspeito ? 'deny' : 'ask',
    permissionDecisionReason: razao,
  },
}));
