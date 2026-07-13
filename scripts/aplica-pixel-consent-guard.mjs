// scripts/aplica-pixel-consent-guard.mjs
// Insere o guarda de consentimento do Meta Pixel ANTES do snippet do GTM, em toda página que
// carrega o GTM. Idempotente: rodar de novo não duplica.
//
// Rodar: node scripts/aplica-pixel-consent-guard.mjs
// (scripts/ está no .vercelignore — não vai pro deploy.)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MARCA = 'pixel-consent-guard';

// Inline, e não <script src>, por dois motivos: precisa rodar ANTES do GTM (um src bloqueante
// custaria um RTT no caminho crítico) e é a mesma convenção do consent-boot, que já é inlinado
// em todas as páginas por ser lógica crítica pré-GTM.
const GUARDA = `<script>/* ${MARCA}: o Pixel NÃO pode disparar antes do opt-in (site de saúde — IP, user-agent e cookie de publicidade são dado sensível por inferência, LGPD Art. 11). O Consent Mode do Google só gate-ia tags do Google; a tag do Pixel é Custom HTML e ignora o gtag('consent'). Truque: o snippet oficial da Meta começa com "if(f.fbq)return" — plantando um fbq ANTES, o snippet aborta e o fbevents.js nunca é injetado. Sem consentimento a fila fica represada e nada sai. Ao aceitar, injetamos o fbevents, que DRENA a fila — então o PageView desta página é enviado, resolvendo de quebra o problema de tag Custom HTML não re-disparar (ver commit 89c9101). Correção definitiva continua sendo exigir ad_storage na tag do GTM; isto é a rede de segurança que não depende do container. */
(function(w,d){if(w.fbq)return;function ok(){try{var c=localStorage.getItem('drkleberrangel_consent')||localStorage.getItem('kleber_consent');return c==='all';}catch(e){return false;}}
var n=w.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!w._fbq)w._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
var feito=false;function injetar(){if(feito)return;feito=true;var t=d.createElement('script');t.async=!0;t.src='https://connect.facebook.net/en_US/fbevents.js';var s=d.getElementsByTagName('script')[0];s.parentNode.insertBefore(t,s);}
if(ok()){injetar();return;}
w.dataLayer=w.dataLayer||[];var p=w.dataLayer.push.bind(w.dataLayer);
w.dataLayer.push=function(){var r=p.apply(null,arguments);for(var i=0;i<arguments.length;i++){var it=arguments[i];if(it&&it.event==='consent_granted'&&ok())injetar();}return r;};
})(window,document);</script>
`;

// Âncora: a linha que injeta o gtm.js. O guarda tem de vir ANTES dela.
const RE_GTM = /^.*googletagmanager\.com\/gtm\.js.*$/m;

const paginas = [];
const varrer = (dir) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === '.git' || f.name === '.claude') continue;
    const p = join(dir, f.name);
    if (f.isDirectory()) varrer(p);
    else if (f.name.endsWith('.html')) paginas.push(p);
  }
};
varrer(ROOT);

let inseridos = 0, jaTinham = 0, semGtm = 0;

for (const p of paginas) {
  const html = readFileSync(p, 'utf8');
  if (!html.includes('GTM-KRCJVG3')) { semGtm++; continue; }
  if (html.includes(MARCA)) { jaTinham++; continue; }

  const m = html.match(RE_GTM);
  if (!m) {
    console.warn(`AVISO: ${p} tem GTM mas não achei a linha do gtm.js — pulado`);
    continue;
  }
  writeFileSync(p, html.replace(RE_GTM, GUARDA + m[0]));
  inseridos++;
}

console.log(`guarda inserido em ${inseridos} página(s); ${jaTinham} já tinham; ${semGtm} sem GTM.`);
