// scripts/build-landing-css.mjs
// Builda o Tailwind dedicado das 4 landings de tratamento, faz fingerprint do CSS
// com um hash de conteúdo, e reescreve o <link> dessas páginas para o caminho com hash.
//
// Por que o hash: /assets/(.*) é servido com Cache-Control immutable de 1 ano (vercel.json).
// Sem hash no nome, um rebuild deixaria visitantes recorrentes com o CSS velho em cache.
// Com o hash, cada rebuild gera uma URL nova -> o cache immutable passa a ser correto.
//
// Rodar: npm run build:css   (ou: node scripts/build-landing-css.mjs)
// (este diretório scripts/ está no .vercelignore — não vai pro deploy.)

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ROOT = process.cwd();
const ASSETS = join(ROOT, 'assets');
const TMP = join(ASSETS, 'tailwind-landing.tmp.css');
const PAGES = ['prp.html', 'ombro.html', 'medicina-regenerativa.html', 'ozonoterapia-divinopolis.html'];
// versão fixada — a mesma usada para substituir o Tailwind CDN runtime nessas páginas
const TAILWIND = 'tailwindcss@3.4.13';

// 1) Build para um arquivo temporário
execSync(
  `npx ${TAILWIND} -c tailwind.landing.config.cjs -i src/landing-input.css -o "${TMP}" --minify`,
  { stdio: 'inherit', cwd: ROOT }
);
if (!existsSync(TMP)) throw new Error('build falhou: CSS temporário não foi gerado');

// 2) Hash de conteúdo (8 chars)
const css = readFileSync(TMP);
const hash = createHash('sha256').update(css).digest('hex').slice(0, 8);
const finalName = `tailwind-landing.${hash}.css`;

// 3) Remove qualquer tailwind-landing*.css antigo (hashado/sem hash/tmp) e grava o novo
for (const f of readdirSync(ASSETS)) {
  if (/^tailwind-landing(\.[0-9a-z]+)?\.css$/.test(f)) rmSync(join(ASSETS, f));
}
writeFileSync(join(ASSETS, finalName), css);

// 4) Reescreve o href nas 4 landings (cobre o nome sem hash e qualquer hash anterior)
const linkRe = /\/assets\/tailwind-landing(?:\.[0-9a-f]+)?\.css/g;
let rewritten = 0;
for (const p of PAGES) {
  const file = join(ROOT, p);
  const html = readFileSync(file, 'utf8');
  const updated = html.replace(linkRe, `/assets/${finalName}`);
  if (updated !== html) { writeFileSync(file, updated); rewritten++; }
}

console.log(`OK: assets/${finalName} gerado; ${rewritten}/${PAGES.length} páginas atualizadas.`);
