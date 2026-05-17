#!/usr/bin/env bash
#
# optimize-images.sh — gera variantes WebP redimensionadas das imagens
# pesadas REALMENTE referenciadas no HTML. Não altera os originais nem o
# HTML: apenas produz os arquivos otimizados em assets/ e imprime os
# trechos de migração sugeridos.
#
# Por que existe: o ambiente de CI/web do Claude Code não tem cwebp nem
# ImageMagick, então a conversão (maior ganho de LCP) precisa ser rodada
# onde houver tooling. Rode este script localmente:
#
#   bash scripts/optimize-images.sh            # gera as variantes
#   bash scripts/optimize-images.sh --dry-run  # só mostra o que faria
#   bash scripts/optimize-images.sh --force    # regenera mesmo se atual
#
# Requisitos (qualquer um): cwebp (libwebp)  OU  ImageMagick (magick/convert).
#   macOS:  brew install webp
#   Ubuntu: sudo apt-get install webp
#
set -euo pipefail
cd "$(dirname "$0")/.."

DRY=0; FORCE=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --force)   FORCE=1 ;;
    *) echo "arg desconhecido: $a" >&2; exit 2 ;;
  esac
done

# Detecta encoder
ENC=""
if command -v cwebp >/dev/null 2>&1; then ENC="cwebp"
elif command -v magick >/dev/null 2>&1; then ENC="magick"
elif command -v convert >/dev/null 2>&1; then ENC="convert"
fi
if [ -z "$ENC" ]; then
  echo "ERRO: nenhum encoder encontrado. Instale 'webp' (cwebp) ou ImageMagick." >&2
  exit 1
fi
echo "Encoder: $ENC | dry-run=$DRY force=$FORCE"
echo

# Tabela: "origem|larguras separadas por espaço|qualidade"
# Apenas imagens pesadas que aparecem em <img> no HTML (não og-image:
# essa é consumida por crawlers, manter como está).
JOBS=(
  "assets/Foto_Kleber.jpeg|560 1120|80"
  "assets/foto_kleber_rangel.png|560 1120|80"
)

total_before=0; total_after=0

gen() { # src width quality out
  local src="$1" w="$2" q="$3" out="$4"
  if [ "$DRY" = 1 ]; then echo "  [dry] $src -> $out (w=$w q=$q)"; return; fi
  case "$ENC" in
    cwebp)   cwebp -quiet -q "$q" -resize "$w" 0 "$src" -o "$out" ;;
    magick)  magick "$src" -resize "${w}x>" -quality "$q" "$out" ;;
    convert) convert "$src" -resize "${w}x>" -quality "$q" "$out" ;;
  esac
}

for job in "${JOBS[@]}"; do
  IFS='|' read -r src widths q <<<"$job"
  [ -f "$src" ] || { echo "skip (ausente): $src"; continue; }
  base="${src%.*}"
  bsz=$(wc -c <"$src"); total_before=$((total_before+bsz))
  echo "• $src (${bsz} B)"
  primary=""
  for w in $widths; do
    out="${base}-${w}.webp"
    if [ "$FORCE" = 0 ] && [ -f "$out" ] && [ "$out" -nt "$src" ]; then
      echo "  ok (atual): $out"; else gen "$src" "$w" "$q" "$out"; fi
    if [ -f "$out" ]; then
      osz=$(wc -c <"$out"); total_after=$((total_after+osz))
      echo "  -> $out (${osz} B)"
      [ -z "$primary" ] && primary="$out"
    fi
  done
  # cópia "canônica" sem sufixo, na menor largura (drop-in)
  if [ -n "$primary" ] && [ "$DRY" = 0 ]; then cp -f "$primary" "${base}.webp"; echo "  -> ${base}.webp (canônico)"; fi
done

echo
echo "Bytes (referenciados): antes=${total_before}  depois(webp)=${total_after}"
echo
cat <<'NEXT'
PRÓXIMO PASSO (aplicar no HTML — handoff, NÃO feito por este script):
Trocar, nas páginas que usam a foto do herói, por <picture> responsivo:

  <picture>
    <source type="image/webp"
            srcset="/assets/Foto_Kleber-560.webp 560w, /assets/Foto_Kleber-1120.webp 1120w"
            sizes="(max-width:768px) 120px, 560px">
    <img src="/assets/Foto_Kleber.jpeg" alt="Dr. Kleber Rangel"
         width="560" height="640" fetchpriority="high" decoding="async">
  </picture>

E atualizar o <link rel="preload" as="image"> do herói para o .webp
(imagesrcset/imagesizes). Validar LCP no PageSpeed/Lighthouse após deploy.
NEXT
