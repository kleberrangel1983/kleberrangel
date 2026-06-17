// driver.mjs — dirige o site estático do Dr. Kleber Rangel com Playwright (Chromium headless).
//
// Pré-requisito: um servidor estático servindo a raiz do repo (default http://127.0.0.1:8000).
//   python -m http.server 8000 --bind 127.0.0.1
// (rode a partir da raiz do repo `kleberrangel/`).
//
// Uso:
//   node .claude/skills/run-kleberrangel/driver.mjs            # sweep compliance (todas) + smoke home+landings
//   node .claude/skills/run-kleberrangel/driver.mjs /joelho.html /coluna.html   # páginas específicas
//   BASE_URL=http://127.0.0.1:8000 node .claude/skills/run-kleberrangel/driver.mjs
//
// O server estático NÃO aplica os rewrites de URL limpa do vercel.json — navegue por
// caminhos .html explícitos (/prp.html), não pelas rotas limpas (/prp).
//
// Screenshots full-page caem em .claude/skills/run-kleberrangel/screenshots/.
// Exit 0 = todos os checks passaram; exit 1 = sweep CFM falhou ou alguma página com problema.

import { chromium } from 'playwright';
import { mkdirSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const __dir = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dir, '..', '..', '..'); // .claude/skills/run-kleberrangel -> raiz do repo
const shotDir = join(__dir, 'screenshots');
mkdirSync(shotDir, { recursive: true });

// As 4 landings de tratamento que foram migradas do Tailwind CDN -> CSS local
// e tiveram depoimentos identificáveis trocados por avaliação agregada (compliance CFM).
const LANDINGS = ['/prp.html', '/ombro.html', '/medicina-regenerativa.html', '/ozonoterapia-divinopolis.html'];
const DEFAULT_PAGES = ['/index.html', ...LANDINGS];

// Marcadores de depoimento IDENTIFICÁVEL (risco CFM Art. 11 / Art. 75 CEM). Devem estar
// ausentes de TODA página servida — independentemente de o browser visitá-la ou não.
const IDENTIFIABLE_TESTIMONIAL = /Voltei a fazer minhas caminhadas|\bM\.C\.S\.|\bJ\.A\.R\.|· Google ✓/;

// ── Sweep estático (sem browser) sobre todas as páginas: a guarda anti-regressão
// não pode cobrir só as 4 landings — qualquer página nova clonada de template antigo
// que reintroduza um depoimento identificável precisa falhar o smoke test.
function complianceSweep() {
  const files = [];
  for (const f of readdirSync(REPO)) if (f.endsWith('.html')) files.push(join(REPO, f));
  try {
    for (const f of readdirSync(join(REPO, 'blog'))) if (f.endsWith('.html')) files.push(join(REPO, 'blog', f));
  } catch { /* sem blog/ */ }
  const violations = [];
  for (const f of files) {
    if (IDENTIFIABLE_TESTIMONIAL.test(readFileSync(f, 'utf8'))) violations.push(f);
  }
  return violations;
}

const args = process.argv.slice(2);
const targets = args.length ? args.map(p => (p.startsWith('/') ? p : '/' + p)) : DEFAULT_PAGES;

let failures = 0;

// 1) Sweep CFM em TODAS as páginas (estático)
const sweepViolations = complianceSweep();
if (sweepViolations.length) {
  failures++;
  console.log(`FAIL sweep CFM: depoimento identificável em ${sweepViolations.length} página(s):`);
  for (const v of sweepViolations) console.log(`      :: ${v}`);
} else {
  console.log('OK   sweep CFM: nenhum depoimento identificável em nenhuma página');
}

// 2) Smoke visual + checks nas páginas-alvo (browser)
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

for (const path of targets) {
  const page = await ctx.newPage();
  const url = BASE + path;
  const resp = await page
    .goto(url, { waitUntil: 'load', timeout: 30000 })
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
  if (IDENTIFIABLE_TESTIMONIAL.test(html)) probs.push('depoimento identificável presente (risco CFM Art. 11)');
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
console.log(`\n${failures ? `${failures} verificação(ões) com problema` : 'todos os checks passaram'}`);
process.exit(failures ? 1 : 0);
