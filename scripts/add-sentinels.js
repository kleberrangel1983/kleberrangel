#!/usr/bin/env node
// One-time script: inserts sentinel comments into all HTML files.
// Safe to re-run — skips files that already have sentinels.
// Usage: node scripts/add-sentinels.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// Which footer partial each file uses (relative to root)
const footerMap = {
  'coluna.html': 'footer-main',
  'joelho.html': 'footer-main',
  'blog/artrose-joelho.html': 'footer-blog',
  'blog/condromalacia.html': 'footer-blog',
  'blog/dor-cronica.html': 'footer-blog',
  'blog/hernia-de-disco.html': 'footer-blog',
  'blog/prp-tratamento.html': 'footer-blog',
  'blog/quando-fazer-cirurgia-joelho.html': 'footer-blog',
  'claudio.html': 'footer-city',
  'formiga.html': 'footer-city',
  'itauna.html': 'footer-city',
  'nova-serrana.html': 'footer-city',
  'para-de-minas.html': 'footer-city',
  'ombro.html': 'footer-tailwind',
  'prp.html': 'footer-tailwind',
  'medicina-regenerativa.html': 'footer-tailwind',
};

function findHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name === 'node_modules' || entry.name === 'scripts') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findHtmlFiles(full));
    else if (entry.name.endsWith('.html')) results.push(full);
  }
  return results;
}

function wrap(content, name) {
  return `<!-- partial:${name}:start -->\n${content}\n<!-- partial:${name}:end -->`;
}

function hassentinel(content, name) {
  return content.includes(`<!-- partial:${name}:start -->`);
}

let updated = 0, skipped = 0;

for (const htmlFile of findHtmlFiles(root)) {
  const rel = path.relative(root, htmlFile);
  let content = fs.readFileSync(htmlFile, 'utf8');
  const original = content;
  const lines = content.split('\n');
  const out = [];
  let i = 0;

  // Detect fonts block: starts with <link rel="preconnect" href="https://fonts.googleapis.com">
  // and ends after the line containing fonts.googleapis.com/css2
  let inFontsBlock = false;
  let fontsBlockLines = [];
  let fontsInserted = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // --- GTM head script ---
    if (!hassentinel_in_out(out, 'gtm-head') &&
        trimmed.includes('GTM-KRCJVG3') &&
        trimmed.startsWith('<script>') &&
        !trimmed.startsWith('<noscript>')) {
      out.push(`<!-- partial:gtm-head:start -->`);
      out.push(line);
      out.push(`<!-- partial:gtm-head:end -->`);
      i++;
      continue;
    }

    // --- GTM noscript ---
    if (!hassentinel_in_out(out, 'gtm-noscript') &&
        trimmed.includes('GTM-KRCJVG3') &&
        trimmed.startsWith('<noscript>')) {
      out.push(`<!-- partial:gtm-noscript:start -->`);
      out.push(line);
      out.push(`<!-- partial:gtm-noscript:end -->`);
      i++;
      continue;
    }

    // --- Fonts block: detect start ---
    if (!fontsInserted &&
        !hassentinel_in_out(out, 'fonts') &&
        trimmed === '<link rel="preconnect" href="https://fonts.googleapis.com">') {
      inFontsBlock = true;
      fontsBlockLines = [line];
      i++;
      continue;
    }

    if (inFontsBlock) {
      fontsBlockLines.push(line);
      // End of fonts block: the line with css2?family= and display=swap
      if (trimmed.includes('fonts.googleapis.com/css2') && trimmed.includes('display=swap')) {
        out.push(`<!-- partial:fonts:start -->`);
        for (const fl of fontsBlockLines) out.push(fl);
        out.push(`<!-- partial:fonts:end -->`);
        inFontsBlock = false;
        fontsInserted = true;
        fontsBlockLines = [];
      }
      i++;
      continue;
    }

    out.push(line);
    i++;
  }

  content = out.join('\n');

  // --- Footer: find last <footer> ... </footer> and wrap ---
  const footerPartial = footerMap[rel];
  if (footerPartial && !hassentinel_in_content(content, footerPartial)) {
    // Find the last <footer> block
    let lastFooterStart = -1;
    let lastFooterEnd = -1;
    let searchFrom = 0;
    while (true) {
      const fStart = content.indexOf('<footer', searchFrom);
      if (fStart === -1) break;
      const fEnd = content.indexOf('</footer>', fStart);
      if (fEnd === -1) break;
      lastFooterStart = fStart;
      lastFooterEnd = fEnd + '</footer>'.length;
      searchFrom = lastFooterEnd;
    }
    if (lastFooterStart !== -1) {
      const footerContent = content.slice(lastFooterStart, lastFooterEnd);
      const before = content.slice(0, lastFooterStart);
      const after = content.slice(lastFooterEnd);
      content = before +
        `<!-- partial:${footerPartial}:start -->\n` +
        footerContent + '\n' +
        `<!-- partial:${footerPartial}:end -->` +
        after;
    }
  }

  if (content !== original) {
    fs.writeFileSync(htmlFile, content, 'utf8');
    console.log(`✓ ${rel}`);
    updated++;
  } else {
    console.log(`– ${rel} (no changes)`);
    skipped++;
  }
}

console.log(`\nDone: ${updated} files updated, ${skipped} unchanged.`);

function hassentinel_in_out(lines, name) {
  return lines.some(l => l.includes(`<!-- partial:${name}:start -->`));
}

function hassentinel_in_content(content, name) {
  return content.includes(`<!-- partial:${name}:start -->`);
}
