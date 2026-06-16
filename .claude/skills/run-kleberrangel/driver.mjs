// driver.mjs — dirige o site estático do Dr. Kleber Rangel com Playwright (Chromium headless).
//
// Pré-requisito: um servidor estático servindo a raiz do repo (default http://127.0.0.1:8000).
//   python -m http.server 8000 --bind 127.0.0.1
// (rode a partir da raiz do repo `kleberrangel/`).
//
// Uso:
//   node .claude/skills/run-kleberrangel/driver.mjs            # smoke: home + 4 landings + checks
//   node .claude/skills/run-kleberrangel/driver.mjs /joelho.html /coluna.html   # páginas específicas
//   BASE_URL=http://127.0.0.1:8000 node .claude/skills/run-kleberrangel/driver.mjs
//
// O server estático NÃO aplica os rewrites de URL limpa do vercel.json — navegue por
// caminhos .html explícitos (/prp.html), não pelas rotas limpas (/prp).
//
// Screenshots full-page caem em .claude/skills/run-kleberrangel/screenshots/.
// Exit 0 = todos os checks passaram; exit 1 = alguma página com problema.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const __dir = dirname(fileURLToPath(import.meta.url));
const shotDir = join(__dir, 'screenshots');
mkdirSync(shotDir, { recursive: true });

// As 4 landings de tratamento que foram migradas do Tailwind CDN -> CSS local
// e tiveram depoimentos identificáveis trocados por avaliação agregada (compliance CFM).
const LANDINGS = ['/prp.html', '/ombro.html', '/medicina-regenerativa.html', '/ozonoterapia-divinopolis.html'];
const DEFAULT_PAGES = ['/index.html', ...LANDINGS];

const args = process.argv.slice(2);
const targets = args.length ? args.map(p => (p.startsWith('/') ? p : '/' + p)) : DEFAULT_PAGES;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

let failures = 0;
for (const path of targets) {
  const page = await ctx.newPage();
  const url = BASE + path;
  const resp = await page
    .goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    .catch((e) => { console.error(`NAV FAIL ${path}: ${e.message}`); return null; });
  const status = resp ? resp.status() : 'ERR';

  const name = (path.replace(/[\\/]/g, '_').replace(/^_/, '') || 'index').replace(/\.html$/, '') + '.png';
  const shot = join(shotDir, name);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});

  const h1 = await page.locator('h1').first().textContent().catch(() => null);
  const html = await page.content();

  const isLanding = LANDINGS.includes(path);
  const probs = [];
  if (status !== 200) probs.push(`status=${status}`);
  if (html.includes('cdn.tailwindcss.com')) probs.push('Tailwind CDN runtime ainda presente');
  if (!/CRM-MG\s*68724/.test(html)) probs.push('CRM-MG 68724 ausente (Art. 4 CFM)');
  if (isLanding && /Voltei a fazer minhas caminhadas|M\.C\.S\.|J\.A\.R\.|· Google ✓/.test(html))
    probs.push('depoimento identificável presente (risco CFM Art. 11)');
  if (isLanding && !html.includes('Avaliação dos pacientes'))
    probs.push('bloco de avaliação agregada ausente');

  if (probs.length) failures++;
  console.log(
    `${probs.length ? 'FAIL' : 'OK  '} ${path}  [${status}]  h1="${(h1 || '').trim().slice(0, 60)}"  -> ${shot}` +
      (probs.length ? `\n      :: ${probs.join('; ')}` : '')
  );
  await page.close();
}

await browser.close();
console.log(`\n${failures ? `${failures} página(s) com problema` : 'todos os checks passaram'}`);
process.exit(failures ? 1 : 0);
