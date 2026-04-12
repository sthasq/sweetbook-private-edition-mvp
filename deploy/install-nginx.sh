#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_CONF="/etc/nginx/conf.d/gschoen.conf"
SNIPPET_DIR="/etc/nginx/snippets/gscheon-app-locations"
SNIPPET_SOURCE="$SCRIPT_DIR/nginx/sweetbook-demo.locations.conf"
SNIPPET_TARGET="$SNIPPET_DIR/sweetbook-demo.conf"
INCLUDE_LINE="    include /etc/nginx/snippets/gscheon-app-locations/*.conf;"

if [ ! -f "$SNIPPET_SOURCE" ]; then
  echo "nginx snippet not found: $SNIPPET_SOURCE" >&2
  exit 1
fi

if [ ! -f "$TARGET_CONF" ]; then
  echo "nginx config not found: $TARGET_CONF" >&2
  exit 1
fi

sudo mkdir -p "$SNIPPET_DIR"
sudo install -m 0644 "$SNIPPET_SOURCE" "$SNIPPET_TARGET"

if ! sudo grep -Fq "$INCLUDE_LINE" "$TARGET_CONF"; then
  tmp_file="$(mktemp)"
  python3 - "$TARGET_CONF" "$tmp_file" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
text = source.read_text()
needle = "    location / {\n"
replacement = "    include /etc/nginx/snippets/gscheon-app-locations/*.conf;\n\n    location / {\n"

if text.count(needle) < 2:
    raise SystemExit("Expected to find both HTTP and HTTPS root location blocks.")

target.write_text(text.replace(needle, replacement, 2))
PY

  backup_path="${TARGET_CONF}.bak.$(date +%Y%m%d%H%M%S)"
  sudo cp "$TARGET_CONF" "$backup_path"
  sudo install -m 0644 "$tmp_file" "$TARGET_CONF"
  rm -f "$tmp_file"
fi

sudo nginx -t
sudo systemctl reload nginx
