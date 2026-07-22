#!/usr/bin/env node
// USO ÚNICO (bootstrap do Lote 1). Depois de rodar + conferir o diff, este script pode ser removido.
// Troca o bloco de compliance inline (consent-default -> consent-boot -> pixel-guard -> GTM loader)
// pelo marcador <!--partial:head-compliance ga4=N--><!--/partial:head-compliance-->, detectando N por página.
// Em seguida rode `node scripts/build-html.mjs` para preencher os marcadores a partir do partial.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IGNORE = new Set(['.git', 'node_modules', 'partials', '.claude', 'assets', 'api', 'scripts', 'src', 'docs', 'supabase']);

// Âncoras estáveis (idênticas em todas as páginas com tracking):
const START = "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',";
const END = "'GTM-KRCJVG3');</script>"; // fecho do GTM loader (o noscript usa id=GTM-KRCJVG3" — não casa)

function collect(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) collect(fp, acc);
    else if (e.name.endsWith('.html')) acc.push(fp);
  }
}

const files = [];
collect(ROOT, files);
for (const f of files) {
  const rel = path.relative(ROOT, f);
  let html = fs.readFileSync(f, 'utf8');
  if (html.includes('<!--partial:head-compliance')) { console.log('  já normalizado:', rel); continue; }
  const si = html.indexOf(START);
  if (si === -1) { console.log('  sem tracking (pulado):', rel); continue; }
  const ei = html.indexOf(END, si);
  if (ei === -1) { console.log('  !! âncora END não encontrada:', rel); continue; }
  const region = html.slice(si, ei + END.length);
  // sanidade: o bloco não pode ser gigante (indica âncora END errada capturando meio documento)
  if (region.length > 4000) { console.log(`  !! região suspeita (${region.length} bytes), pulado:`, rel); continue; }
  const ga4 = region.includes("gtag('config','G-KHC1QSGV36'") ? '1' : '0';
  const marker = `<!--partial:head-compliance ga4=${ga4}-->\n<!--/partial:head-compliance-->`;
  html = html.slice(0, si) + marker + html.slice(ei + END.length);
  fs.writeFileSync(f, html);
  console.log(`  normalizado (ga4=${ga4}):`, rel);
}
