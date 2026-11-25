"""Render comprehensive test strings (All Letters & Full Sentences across NFC & NFD)
with HarfBuzz positions + fontTools outlines to PNG.
"""
import sys, unicodedata as ud
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from PIL import Image, ImageDraw

SAMPLES = [
    ("Vowels and dotted o", "a e i o u | o͘ ó͘ ò͘ ô͘ ō͘ ŏ͘ ő͘ o̍͘ | O͘ Ó͘ Ò͘ Ô͘ Ō͘ Ŏ͘ Ő͘ O̍͘"),
    ("Tone 8", "a̍ e̍ i̍ o̍ u̍ m̍ n̍g | A̍ E̍ I̍ O̍ U̍ M̍ N̍g"),
    ("Nasals and tone 9", "ḿ m̀ m̂ m̄ ǹ n̂ n̄ | iⁿ sⁿ o͘ⁿ i̋ I̋"),
    ("Connected text", "Chhù-piⁿ tńg--khì-o͘h, saⁿ-koan lóng hó-sè, kiⁿ-á-ji̍t chin hoaⁿ-hí!"),
    ("Connected text", "Pe̍h-ōe-jī Mi̍h-kiāⁿ. Ô͘-chhiû, A̍k--ah!"),
]

class Poly(BasePen):
    def __init__(s, gs, tf):
        super().__init__(gs)
        s.tf = tf
        s.polys = []
        s.cur = []

    def _moveTo(s, p):
        s.cur = [s.tf(p)]

    def _lineTo(s, p):
        s.cur.append(s.tf(p))

    def _curveToOne(s, a, b, c):
        p0 = s.cur[-1]
        a, b, c = s.tf(a), s.tf(b), s.tf(c)
        for i in range(1, 9):
            t = i / 8
            u = 1 - t
            s.cur.append(tuple(u**3*p0[k] + 3*u*u*t*a[k] + 3*u*t*t*b[k] + t**3*c[k] for k in (0, 1)))

    def _qCurveToOne(s, a, b):
        p0 = s.cur[-1]
        a, b = s.tf(a), s.tf(b)
        for i in range(1, 7):
            t = i / 6
            u = 1 - t
            s.cur.append(tuple(u*u*p0[k] + 2*u*t*a[k] + t*t*b[k] for k in (0, 1)))

    def _closePath(s):
        s.polys.append(s.cur)
        s.cur = []

    _endPath = _closePath

def render(path, out, label):
    tt = TTFont(path, fontNumber=0)
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    upm = tt['head'].unitsPerEm
    sc = 64 / upm
    font = hb.Font(hb.Face(hb.Blob.from_file_path(path)))

    rows = []
    max_ink_x = 0
    for _, text in SAMPLES:
        for form in ('NFC', 'NFD'):
            buf = hb.Buffer()
            buf.add_str(ud.normalize(form, text))
            buf.guess_segment_properties()
            hb.shape(font, buf)
            glyphs = []
            advance = 0
            for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
                x = advance + pos.x_offset
                bounds = font.get_glyph_extents(info.codepoint)
                if bounds:
                    max_ink_x = max(max_ink_x, x + bounds.x_bearing + bounds.width)
                glyphs.append((info.codepoint, x, pos.y_offset))
                advance += pos.x_advance
            rows.append(glyphs)

    left, line_height, group_height = 76, 88, 206
    width = left + round(max_ink_x * sc) + 32
    img = Image.new('L', (width, 44 + len(SAMPLES) * group_height), 255)
    d = ImageDraw.Draw(img)
    d.text((14, 12), f"{label} - POJ outline specimen", fill=0, font_size=18)

    for group, (title, _) in enumerate(SAMPLES):
        top = 44 + group * group_height
        d.line((14, top, width - 14, top), fill=200)
        d.text((14, top + 6), title, fill=0, font_size=16)
        for row, form in enumerate(('NFC', 'NFD')):
            base = top + 92 + row * line_height
            d.text((14, base - 14), form, fill=0, font_size=14)

            for gid, x, y in rows[group * 2 + row]:
                gx, gy = left + x * sc, y * sc
                pen = Poly(gs, lambda q: (gx + q[0] * sc, base - gy - q[1] * sc))
                gs[order[gid]].draw(pen)
                for poly in pen.polys:
                    if len(poly) > 2:
                        d.polygon(poly, outline=0)
                if gid == 0:
                    d.rectangle([gx, base - 26, gx + 16, base], outline=0)

    img.save(out)

if __name__ == '__main__':
    for path in sys.argv[2:]:
        name = path.split('/')[-1].rsplit('.', 1)[0]
        render(path, f"{sys.argv[1]}/{name}.png", name)
