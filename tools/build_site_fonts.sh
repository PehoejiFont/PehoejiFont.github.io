#!/bin/sh
# Rebuild the site's web fonts: 源樣明體 GenYo Min (Regular + Bold), cut down to what the pages need.
# usage: tools/build_site_fonts.sh <dir with GenYoMin2TW-R.otf and GenYoMin2TW-B.otf>
#   run from the repo root; needs fonttools + brotli (pyftsubset).
# GenYo: https://github.com/ButTaiwan/genyo-font (OFL; the only Reserved Font Name is Adobe's "Source",
# so a subset may keep the GenYo name).
#
# Kept: every character used in *.html (this picks up the Han characters), plus all of Latin,
# combining marks and POJ/Tâi-lô extras, so new POJ text never needs a rebuild. The GSUB closure keeps
# GenYo's precomposed POJ glyphs (o͘ ó͘ … reached through ccmp).
set -eu
src="$1"
tmp=$(mktemp)
python3 -c '
import glob, sys
chars = {c for p in glob.glob("*.html") for c in open(p, encoding="utf-8").read() if ord(c) >= 0x20}
sys.stdout.write("".join(sorted(chars)))' > "$tmp"
ranges='U+0020-024F,U+0250-02FF,U+0300-036F,U+1D00-1DBF,U+1E00-1EFF,U+2000-206F,U+2070-209F,U+20AC,U+2190-21FF,U+25A1,U+25CC,U+3000-303F,U+FF01-FF5E'
for w in R B; do
  pyftsubset "$src/GenYoMin2TW-$w.otf" --text-file="$tmp" --unicodes="$ranges" \
    --layout-features='*' --flavor=woff2 --output-file="assets/fonts/GenYoMin2TW-$w-site.woff2"
done
echo "kept $(wc -m < "$tmp" | tr -d ' ') page characters + Latin/POJ ranges"
ls -l assets/fonts/GenYoMin2TW-*-site.woff2
rm -f "$tmp"
