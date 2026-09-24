#!/usr/bin/env bash
# Render gallery.html in headless Chrome and check that every kind of component actually drew.
# The gallery shows every component, so a kit change that breaks one shows up here.
#   gallery-check.sh            (uses google-chrome; CHROME=... to override)
set -euo pipefail

KIT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-google-chrome}"
dom="$(mktemp)"
trap 'rm -f "$dom"' EXIT

"$CHROME" --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader \
  --virtual-time-budget=15000 --dump-dom "file://$KIT/gallery.html" 2>/dev/null > "$dom"

count() { { grep -o "$1" "$dom" || true; } | wc -l | tr -d ' '; }   # zero matches is a result, not an error
errors=$(count 'class="doc-error"')
mermaid=$(count '<svg[^>]*id="mermaid')
flow=$(count 'class="df-node')
map=$(count 'maplibregl-canvas"')
echo "doc-error=$errors mermaid-svg=$mermaid flow-node=$flow map-canvas=$map"

fail=0
[ "$errors" -eq 1 ] || { echo "expected exactly 1 doc-error (the intentional one in the Errors section)"; fail=1; }
[ "$mermaid" -ge 1 ] || { echo "no Mermaid diagram rendered"; fail=1; }
[ "$flow" -ge 1 ] || { echo "doc-flow drew no nodes"; fail=1; }
[ "$map" -ge 1 ] || { echo "doc-map created no MapLibre canvas"; fail=1; }
exit $fail
