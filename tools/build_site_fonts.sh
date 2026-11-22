#!/bin/sh
# Rebuild assets/fonts/Iansui-SiteSubset.woff2 from the Han characters used in the site's HTML pages.
# usage: tools/build_site_fonts.sh <path to Iansui-Regular.ttf>   (run from the repo root; needs fonttools + brotli)
# Iansui: https://github.com/ButTaiwan/iansui (OFL, no Reserved Font Name, so a subset may keep the name).
set -eu
src="$1"
tmp=$(mktemp)
python3 -c '
import glob, sys
chars = {c for p in glob.glob("*.html") for c in open(p, encoding="utf-8").read() if ord(c) >= 0x2E80}
sys.stdout.write("".join(sorted(chars)))' > "$tmp"
pyftsubset "$src" --text-file="$tmp" \
  --unicodes='U+3001-3003,U+300C-300F,U+FF01,U+FF08,U+FF09,U+FF0C,U+FF1A,U+FF1B,U+FF1F' \
  --layout-features='*' --flavor=woff2 --output-file=assets/fonts/Iansui-SiteSubset.woff2
echo "subset $(wc -m < "$tmp" | tr -d ' ') Han characters -> assets/fonts/Iansui-SiteSubset.woff2"
rm -f "$tmp"
