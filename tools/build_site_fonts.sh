#!/bin/sh
# Rebuild the site's web fonts: 源樣明體 GenYo Min (Regular + Bold), cut down to what the pages need.
# usage: tools/build_site_fonts.sh <dir with GenYoMin2TW-R.otf and GenYoMin2TW-B.otf>
#   run from the repo root; needs fonttools + brotli (pyftsubset).
# GenYo: https://github.com/ButTaiwan/genyo-font (OFL; the only Reserved Font Name is Adobe's "Source",
# so a subset may keep the GenYo name).
#
# Output:
#   assets/fonts/GenYoMin2TW-{R,B}-site.woff2  — EN pages (*.html) + all Latin/POJ/KPL ranges (~85 KB)
#   assets/fonts/GenYoMin2TW-{R,B}-zhtw.woff2  — extra CJK/punctuation used only in zh-tw/*.html
#     (browsers on EN pages never download the zhtw subset; zh-tw pages fall through seamlessly).
set -eu
src="$1"
tmp_en=$(mktemp)
tmp_zh=$(mktemp)
python3 - "$tmp_en" "$tmp_zh" <<'PY'
import glob, sys
en_chars = {c for p in glob.glob("*.html") for c in open(p, encoding="utf-8").read() if ord(c) >= 0x20}
zh_all = {c for p in glob.glob("zh-tw/*.html") for c in open(p, encoding="utf-8").read() if ord(c) >= 0x20}
# Exclude basic ranges already included in the base subset
def in_base(c):
    o = ord(c)
    if c in en_chars:
        return True
    for lo, hi in [(0x0020, 0x036F), (0x1D00, 0x1DBF), (0x1E00, 0x1EFF),
                   (0x2000, 0x209F), (0x2190, 0x21FF), (0x3000, 0x303F), (0xFF01, 0xFF5E)]:
        if lo <= o <= hi:
            return True
    return False
zh_extra = sorted(c for c in zh_all if not in_base(c))
open(sys.argv[1], "w", encoding="utf-8").write("".join(sorted(en_chars)))
open(sys.argv[2], "w", encoding="utf-8").write("".join(zh_extra))
print(f"EN page chars: {len(en_chars)}, extra zh-tw CJK chars: {len(zh_extra)}")
PY

ranges='U+0020-024F,U+0250-02FF,U+0300-036F,U+1D00-1DBF,U+1E00-1EFF,U+2000-206F,U+2070-209F,U+20AC,U+2190-21FF,U+25A1,U+25CC,U+3000-303F,U+FF01-FF5E'
for w in R B; do
  pyftsubset "$src/GenYoMin2TW-$w.otf" --text-file="$tmp_en" --unicodes="$ranges" \
    --layout-features='*' --flavor=woff2 --output-file="assets/fonts/GenYoMin2TW-$w-site.woff2"
  if [ -s "$tmp_zh" ]; then
    pyftsubset "$src/GenYoMin2TW-$w.otf" --text-file="$tmp_zh" \
      --layout-features='*' --flavor=woff2 --output-file="assets/fonts/GenYoMin2TW-$w-zhtw.woff2"
  fi
done
ls -lh assets/fonts/GenYoMin2TW-*.woff2
rm -f "$tmp_en" "$tmp_zh"
