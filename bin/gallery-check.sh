#!/usr/bin/env bash
# Render gallery.html and every page in examples/ in headless Chrome and check that the components actually drew.
# The gallery shows every component; the examples are one-tag pages (no layout markup, Markdown), so a change that
# breaks either path shows up here.
#   gallery-check.sh            (uses google-chrome; CHROME=... to override)
set -euo pipefail

KIT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-google-chrome}"
dom="$(mktemp)"
trap 'rm -f "$dom"' EXIT
fail=0

render() {
  "$CHROME" --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader \
    --virtual-time-budget=15000 --dump-dom "file://$1" 2>/dev/null > "$dom"
}
count() { { grep -o "$1" "$dom" || true; } | wc -l | tr -d ' '; }   # zero matches is a result, not an error
need() { [ "$2" -ge "$3" ] || { echo "  FAIL $1: $4"; fail=1; }; }

render "$KIT/gallery.html"
errors=$(count 'class="doc-error"')
echo "gallery: doc-error=$errors mermaid-svg=$(count '<svg[^>]*id="mermaid') flow-node=$(count 'class="df-node') map-canvas=$(count 'maplibregl-canvas"') table=$(count '<doc-table[^>]*><div class="[a-z]*"><table')"
[ "$errors" -eq 1 ] || { echo "  FAIL gallery: expected exactly 1 doc-error (the intentional one in the Errors section)"; fail=1; }
need gallery "$(count '<svg[^>]*id="mermaid')" 1 "no Mermaid diagram rendered"
need gallery "$(count 'class="df-node')" 1 "doc-flow drew no nodes"
need gallery "$(count 'maplibregl-canvas"')" 1 "doc-map created no MapLibre canvas"
need gallery "$(count '<doc-table[^>]*><div class="[a-z]*"><table')" 1 "doc-table rendered no table"
need gallery "$(count 'class="doc-md"')" 1 "the Markdown block was not rendered"

for page in "$KIT"/examples/*.html; do
  render "$page"
  name="examples/$(basename "$page")"
  echo "$name: doc-error=$(count 'class="doc-error"') toc-link=$(count 'class="l[23]"') page=$(count 'class="page')"
  [ "$(count 'class="doc-error"')" -eq 0 ] || { echo "  FAIL $name: shows an error block"; fail=1; }
  need "$name" "$(count 'class="page')" 1 "the page frame was not built"
  need "$name" "$(count 'class="l[23]"')" 1 "the contents sidebar is empty"
  [ "$(count '<main></main>')" -eq 0 ] || { echo "  FAIL $name: main is empty"; fail=1; }
done
exit $fail
