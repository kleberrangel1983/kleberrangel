#!/usr/bin/env node
// Reads _partials/{name}.html and syncs them into all HTML files via sentinel comments.
// Sentinel pattern: <!-- partial:NAME:start --> ... <!-- partial:NAME:end -->
// Usage: node scripts/sync-partials.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const partialsDir = path.join(root, '_partials');

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

const partials = {};
for (const f of fs.readdirSync(partialsDir)) {
  if (!f.endsWith('.html')) continue;
  const name = f.replace('.html', '');
  partials[name] = fs.readFileSync(path.join(partialsDir, f), 'utf8').trimEnd();
}

let updated = 0, unchanged = 0, errors = 0;

for (const htmlFile of findHtmlFiles(root)) {
  let content = fs.readFileSync(htmlFile, 'utf8');
  const original = content;

  for (const [name, partialContent] of Object.entries(partials)) {
    const startMarker = `<!-- partial:${name}:start -->`;
    const endMarker = `<!-- partial:${name}:end -->`;
    let startIdx = content.indexOf(startMarker);
    let endIdx = content.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) continue;
    if (endIdx < startIdx) {
      console.error(`✗ ${path.relative(root, htmlFile)}: mismatched sentinels for ${name}`);
      errors++;
      continue;
    }

    const before = content.slice(0, startIdx + startMarker.length);
    const after = content.slice(endIdx);
    content = before + '\n' + partialContent + '\n' + after;
  }

  if (content !== original) {
    fs.writeFileSync(htmlFile, content, 'utf8');
    console.log(`✓ ${path.relative(root, htmlFile)}`);
    updated++;
  } else {
    unchanged++;
  }
}

console.log(`\nDone: ${updated} updated, ${unchanged} unchanged${errors ? `, ${errors} errors` : ''}.`);
