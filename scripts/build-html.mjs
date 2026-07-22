#!/usr/bin/env node
// build-html.mjs — monta os fragmentos de fonte única (partials/) nas páginas .html.
//
// MODELO "regiões com sentinela": cada bloco compartilhado vive UMA vez em partials/<nome>.html.
// Nas páginas, o bloco fica entre marcadores:
//
//   <!--partial:head-compliance ga4=1-->
//   ...conteúdo renderizado (fica inline — Vercel serve o .html direto, SEO/ordem do pixel intactos)...
//   <!--/partial:head-compliance-->
//
// Este script REGENERA o conteúdo entre os marcadores a partir do partial. É idempotente:
// rodar 2x não muda nada. Fonte da verdade = o partial. Fluxo: edite partials/x.html -> rode
// `npm run build:html` -> commit. Os guard hooks e o driver continuam vendo HTML inline real.
//
// Parâmetros no marcador (ex.: ga4=1) viram variáveis {{NOME}} no partial. Hoje só GA4_CONFIG.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARTIALS = path.join(ROOT, 'partials');
const IGNORE = new Set(['.git', 'node_modules', 'partials', '.claude', 'assets', 'api', 'scripts', 'src', 'docs', 'supabase']);

// GA4 direto (config no próprio boot) — só nas páginas marcadas ga4=1.
const GA4_CONFIG = "gtag('js',new Date());gtag('config','G-KHC1QSGV36',{'anonymize_ip':true,'restricted_data_processing':true});";

const cache = {};
function loadPartial(name) {
  if (!(name in cache)) cache[name] = fs.readFileSync(path.join(PARTIALS, name + '.html'), 'utf8').replace(/\n$/, '');
  return cache[name];
}

function render(name, params) {
  const vars = { GA4_CONFIG: params.ga4 === '1' ? GA4_CONFIG : '' };
  return loadPartial(name).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function parseParams(str) {
  const p = {};
  for (const m of str.matchAll(/(\w+)=(\S+)/g)) p[m[1]] = m[2];
  return p;
}

function collect(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) collect(fp, acc);
    else if (e.name.endsWith('.html')) acc.push(fp);
  }
}

const REGION = /<!--partial:([\w-]+)([^>]*?)-->[\s\S]*?<!--\/partial:\1-->/g;

const files = [];
collect(ROOT, files);
let changed = 0, regions = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const eol = html.includes('\r\n') ? '\r\n' : '\n'; // preserva o EOL do arquivo (repo é CRLF no Windows)
  const out = html.replace(REGION, (full, name, paramStr) => {
    regions++;
    const block = `<!--partial:${name}${paramStr}-->\n${render(name, parseParams(paramStr))}\n<!--/partial:${name}-->`;
    return block.replace(/\r?\n/g, eol);
  });
  if (out !== html) {
    fs.writeFileSync(f, out);
    changed++;
    console.log('  built', path.relative(ROOT, f));
  }
}
console.log(`\nbuild-html: ${regions} região(ões), ${changed} arquivo(s) atualizado(s).`);
