#!/usr/bin/env bash
# Print the next doc path for a slug, plus the relative path to shared/. Writes nothing.
#   doc-name.sh <slug> [source-dir|ungrouped] [html|md]
# Docs are flat under ~/Docs/<first folder below ~>; deeper folders go into the name:
#   ~/Code/order-service      -> ~/Docs/Code/YYYYMMDD_NN_order-service_<slug>.html
#   ~/Code/a/b                -> ~/Docs/Code/YYYYMMDD_NN_a_b_<slug>.html
#   ~/Code                    -> ~/Docs/Code/YYYYMMDD_NN_<slug>.html
#   ungrouped, or run from ~  -> ~/Docs/ungrouped/YYYYMMDD_NN_<slug>.html   (docs tied to no project)
set -euo pipefail

DOCS="$HOME/Docs"
slug="${1:-}"; ext="${3:-html}"
# the keyword is checked before realpath, which would turn it into $PWD/ungrouped
if [[ "${2:-}" == ungrouped ]]; then src="$DOCS/ungrouped"; else src="$(realpath "${2:-$PWD}")"; fi
[[ -n "$slug" ]] || { echo "usage: doc-name.sh <slug> [source-dir|ungrouped] [html|md]" >&2; exit 2; }
[[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "slug must be lowercase ASCII English joined by '-': '$slug'" >&2; exit 2; }
case "$src" in
  "$HOME") src="$DOCS/ungrouped" ;;   # ~ itself belongs to no project
  "$HOME"/*) ;;
  *) echo "source-dir must be a folder below \$HOME: $src" >&2; exit 2 ;;
esac

IFS=/ read -ra parts <<< "${src#"$HOME"/}"
if [[ "${parts[0]}" == Docs ]]; then parts=("${parts[@]:1}"); fi   # already inside ~/Docs
[[ ${#parts[@]} -ge 1 ]] || { echo "cannot place a doc for $src" >&2; exit 2; }
top="${parts[0]}"; dir="$DOCS/$top"
# hidden folders (~/.cache, ~/.claude…) must not become doc folders; checked before anything is created
[[ "$top" != .* ]] || { echo "no doc folder for hidden '$top' — use: doc-name.sh $slug ungrouped" >&2; exit 2; }

prefix=""
if [[ ${#parts[@]} -gt 1 ]]; then
  for part in "${parts[@]:1}"; do   # one segment per folder; '-' stays inside a folder name
    seg="$(printf '%s' "$part" | tr 'A-Z' 'a-z' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
    [[ "$seg" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "folder name is not ASCII: $part" >&2; exit 2; }
    prefix+="${seg}_"
  done
fi
mkdir -p "$dir/archive"

# numbers are unique across <top>/ and <top>/archive/, so a restored doc never collides
today="$(date +%Y%m%d)"
last="$(find "$dir" "$dir/archive" -maxdepth 1 -type f -name "${today}_[0-9][0-9]_*" -printf '%f\n' \
        | sed -E 's/^[0-9]{8}_([0-9]{2})_.*/\1/' | sort -n | tail -1)"
printf 'path=%s/%s_%02d_%s%s.%s\n' "$dir" "$today" $(( 10#${last:-0} + 1 )) "$prefix" "$slug" "$ext"
printf 'shared=../shared\n'
