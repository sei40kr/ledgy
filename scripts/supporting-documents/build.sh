#!/usr/bin/env sh
# Regenerates the sample supporting documents the seed uploads: each Markdown
# file is rendered by pandoc to HTML, then printed to PDF (or, for the taxi
# receipt, captured as a PNG to have an image example too) by headless
# Chromium. The generated files are checked in, so seeding needs neither tool.
set -eu
cd "$(dirname "$0")"
for name in receipt-stationery invoice-rent receipt-mobile receipt-office-supplies invoice-electricity receipt-taxi; do
  pandoc "$name.md" --standalone --css style.css --embed-resources --metadata pagetitle="$name" -o "$name.html"
done
for name in receipt-stationery invoice-rent receipt-mobile receipt-office-supplies invoice-electricity; do
  chromium --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$name.pdf" "file://$PWD/$name.html" 2>/dev/null
done
chromium --headless --no-sandbox --disable-gpu --hide-scrollbars \
  --window-size=560,420 --screenshot="receipt-taxi.png" "file://$PWD/receipt-taxi.html" 2>/dev/null
rm -f ./*.html
ls -la ./*.pdf ./*.png
