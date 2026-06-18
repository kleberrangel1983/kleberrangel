---
name: run-kleberrangel
description: Build, serve, screenshot and smoke-test the Dr. Kleber Rangel ortopedia site (static HTML5 + Tailwind + Vercel functions). Use when asked to run, serve, preview, screenshot, smoke-test, or verify the kleberrangel / drkleberrangel.com.br site, its landing pages, or its CFM-compliance blocks.
---

# Run the Dr. Kleber Rangel site (`kleberrangel`)

Static marketing/conversion site (HTML5 + Vanilla JS + Tailwind v3, ~30 pages: home,
city/treatment landing pages, blog) deployed on Vercel, plus three serverless functions:

- `api/capi.js` — Meta Conversions API (`META_CAPI_TOKEN`, `META_PIXEL_ID`, `META_CAPI_TEST_EVENT_CODE`)
- `api/chat.js` — site chatbot, calls Anthropic (`ANTHROPIC_API_KEY`)
- `api/lead.js` — lead capture, writes to Supabase via `service_role` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

It's driven headless with **Playwright/Chromium** via
[`driver.mjs`](driver.mjs): it serves nothing itself — you start a static
server, then the driver navigates pages, writes full-page screenshots, and runs
**CFM/perf smoke checks** (no Tailwind CDN runtime, CRM/RQE present, the 4 treatment
landings show the aggregated-rating block and no identifiable testimonials).

All paths below are relative to the repo root (`kleberrangel/`). The driver lives at
`.claude/skills/run-kleberrangel/driver.mjs`; screenshots land in
`.claude/skills/run-kleberrangel/screenshots/`.

## Prerequisites

Node 20+, Python 3 (for the static server). Install the browser harness (one-time;
`node_modules` is gitignored, so re-run after a fresh clone):

```bash
npm install --no-save playwright
npx playwright install chromium
```

## Build

The 4 treatment landings (`prp`, `ombro`, `medicina-regenerativa`,
`ozonoterapia-divinopolis`) use their **own** purged Tailwind theme (teal `#0d7c7c` +
Playfair/Inter), built to a **content-hashed** file `assets/tailwind-landing.<hash>.css` —
separate from the main `assets/tailwind.css`. Both are prebuilt and committed. Rebuild the
landing CSS whenever you change classes on those 4 pages (otherwise new classes are missing
from the purged build):

```bash
npm run build:css
```

That runs `scripts/build-landing-css.mjs`, which rebuilds with Tailwind v3.4.13, fingerprints
the output with a content hash, deletes the old hashed file, and rewrites the `<link>` in the
4 pages. The hash keeps the year-long immutable cache (`/assets/(.*)` in `vercel.json`) correct
across rebuilds. Commit the new `assets/tailwind-landing.<hash>.css` and the 4 updated pages.

## Run (agent path)

1. Start a static server from the repo root, in the background:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

2. Drive the site — default smoke run screenshots the home + 4 landings and runs checks:

```bash
node .claude/skills/run-kleberrangel/driver.mjs
```

Expected tail:

```
OK   /index.html  [200]  h1="Dor crônica na coluna, joelho ou ombro?..."  -> ...screenshots/index.png
OK   /prp.html  [200]  ...
...
todos os checks passaram
```

Screenshot specific pages (pass names **without a leading slash** — see Gotchas):

```bash
node .claude/skills/run-kleberrangel/driver.mjs joelho.html coluna.html
```

Exit 0 = all checks passed; exit 1 = a page 404'd or a CFM/perf check failed (details printed).
Override the server URL with `BASE_URL=http://127.0.0.1:8000`.

## Run (human path)

Open `http://127.0.0.1:8000/index.html` in a browser while the static server runs.
Note: the static server does **not** apply the `vercel.json` clean-URL rewrites, so use
`.html` paths. The static server also serves **no** `api/*` route (those are serverless
functions — 404 under `python -m http.server`). To exercise them you need `vercel dev`
with the matching env vars set (per function, see the intro). None are needed for UI work.

## Test

There is no unit-test suite (`npm run build` is a stub). The driver above **is** the smoke
test. The serverless functions can be syntax-checked without running them:

```bash
node --check api/capi.js && node --check api/chat.js && node --check api/lead.js
```

## Gotchas

- **Git Bash mangles leading-slash args.** `driver.mjs /joelho.html` under Git Bash becomes
  `/C:/Program Files/Git/joelho.html` (MSYS path conversion) → 404. Pass `joelho.html`
  (no slash; the driver prepends `/`), or run from PowerShell. The default no-arg run is unaffected.
- **Static server ≠ Vercel.** No clean-URL rewrites (`/prp` won't resolve — use `/prp.html`),
  and every `/api/*` route returns 404 (`capi`, `chat`, `lead` are serverless functions, only
  live under `vercel dev`).
- **The 4 landings have a separate Tailwind build.** They load `assets/tailwind-landing.css`
  (config: `tailwind.landing.config.cjs`), NOT `assets/tailwind.css`. Editing utility classes
  on those pages without rebuilding that file = silently missing styles (purged build).
- **`node_modules` is gitignored** and Playwright was installed with `--no-save`; a fresh
  checkout must re-run the Prerequisites install before the driver works.
- **Must serve from the repo root.** If every page reports `status=404`, the static server
  was started in the wrong directory.

## Troubleshooting

- `browserType.launch: Executable doesn't exist` → run `npx playwright install chromium`.
- Driver exits 1 with `status=404` on every page → static server not running, or not started
  from the repo root.
- `Cannot find package 'playwright'` → run `npm install --no-save playwright` from the repo root.
