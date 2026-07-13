#!/usr/bin/env node
// PostToolUse (Write) — avisa quando uma página nova da raiz não foi REGISTRADA no site.
//
// O BUG QUE ISTO EVITA (aconteceu de verdade, com a /unha-encravada):
// criar o .html não publica a página. Ela precisa de três registros, e a falta de qualquer um
// deles é SILENCIOSA — nada quebra, nada avisa, a página só... não existe pra ninguém:
//
//   1. rewrite no vercel.json  -> sem isso a URL limpa /pagina dá 404 (só /pagina.html abre)
//   2. <loc> no sitemap.xml    -> sem isso o Google demora muito mais a descobrir a URL
//   3. link interno de outra página -> sem isso a página nasce ÓRFÃ. Estar no sitemap faz o
//      Google DESCOBRIR a URL; não faz ela VALER nada. Autoridade (PageRank) flui por link.
//      Sitemap é convite; link interno é voto. Uma página sem voto nenhum não ranqueia.
//
// AVISA, não bloqueia: os registros costumam ser feitos logo DEPOIS de escrever o HTML, então
// bloquear a escrita seria hostil. O aviso volta pro modelo como contexto, pra ele fechar o
// serviço em vez de achar que terminou.

import fs from 'node:fs';
import path from 'node:path';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path ?? '';
if (!filePath) process.exit(0);

const norm = filePath.replace(/\\/g, '/');
if (!norm.endsWith('.html')) process.exit(0);

// Raiz do repo = onde este hook mora, dois níveis acima (.claude/hooks/)
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');

const rel = path.relative(REPO, filePath).replace(/\\/g, '/');
// Só páginas da RAIZ. /blog/* tem seu próprio índice e não entra no menu de tratamentos.
if (rel.includes('/') || !rel.endsWith('.html')) process.exit(0);

const slug = rel.replace(/\.html$/, '');
// Páginas institucionais não precisam de link interno nem de menu.
const ISENTAS = new Set(['index', 'termos', 'politica-privacidade', 'design-system']);
if (ISENTAS.has(slug)) process.exit(0);

const ler = (f) => {
  try { return fs.readFileSync(path.join(REPO, f), 'utf8'); } catch { return ''; }
};

const faltando = [];

if (!new RegExp(`"/${slug}"`).test(ler('vercel.json'))) {
  faltando.push(`  • rewrite no vercel.json — sem ele, a URL limpa /${slug} responde 404`);
}

if (!ler('sitemap.xml').includes(`/${slug}<`)) {
  faltando.push(`  • entrada no sitemap.xml (<loc>...${slug}</loc>)`);
}

// Link interno vindo de OUTRA página (a própria não conta).
let temLinkDeFora = false;
const varrer = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === '.git' || f.name === '.claude') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) varrer(p);
    else if (f.name.endsWith('.html') && path.resolve(p) !== path.resolve(filePath)) {
      if (new RegExp(`href="/${slug}"`).test(fs.readFileSync(p, 'utf8'))) temLinkDeFora = true;
    }
  }
};
try { varrer(REPO); } catch { /* varredura é best-effort */ }

if (!temLinkDeFora) {
  faltando.push(
    `  • NENHUM link interno aponta para /${slug} — a página nasce ÓRFÃ.\n` +
    `    Estar no sitemap faz o Google descobrir a URL; não faz ela valer nada: autoridade flui\n` +
    `    por link. Adicione ao menu de tratamentos e ao bloco "Links internos SEO" do rodapé da home.`
  );
}

if (faltando.length === 0) process.exit(0);

const msg =
  `A página /${slug} foi criada mas ainda NÃO está registrada no site:\n${faltando.join('\n')}`;

process.stdout.write(JSON.stringify({
  systemMessage: `⚠️  /${slug}: faltam ${faltando.length} registro(s) — a página ainda não está publicada de verdade.`,
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: msg,
  },
}));
