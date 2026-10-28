#!/usr/bin/env sh
# Wraps index.html (artifact source, no <head>) into a standalone page you can open locally.
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="ar"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head><body>\n'; cat index.html; printf '\n</body></html>\n'; } > play.html
echo "built game/play.html"
