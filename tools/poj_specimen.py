"""Render comprehensive test strings (All Letters & Full Sentences across NFC & NFD)
with HarfBuzz positions + fontTools outlines to PNG.
"""
import sys, unicodedata as ud
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from PIL import Image, ImageDraw

LETTERS = "o͘ ó͘ ò͘ ô͘ ō͘ o̍͘ ŏ͘ O͘ Ó͘ Ō͘ | a̍ e̍ i̍ o̍ u̍ m̍ n̍ n̍g A̍ E̍ I̍ O̍ U̍ M̍ N̍g | ḿ m̀ m̂ m̄ ǹ n̂ n̄ | iⁿ sⁿ o͘ⁿ i̋"
SENTENCE = "Chhù-piⁿ tńg--khì-o͘h, saⁿ-koan lóng hó-sè, kiⁿ-á-ji̍t chin hoaⁿ-hí! Pe̍h-ōe-jī Mi̍h-kiāⁿ"

ROWS = [
    ("NFC Letters", "NFC", LETTERS),
    ("NFD Letters", "NFD", LETTERS),
    ("NFC Sentences", "NFC", SENTENCE),
    ("NFD Sentences", "NFD", SENTENCE)
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
    sc = 36 / upm
    font = hb.Font(hb.Face(hb.Blob.from_file_path(path)))

    W, H = 1960, 310
    img = Image.new('L', (W, H), 255)
    d = ImageDraw.Draw(img)
    d.text((12, 6), f"{label} — POJ Comprehensive Specimen (All Letters, Tones, Marks & Connectivity)", fill=0)

    for row_idx, (row_label, form, raw_text) in enumerate(ROWS):
        s = ud.normalize(form, raw_text)
        buf = hb.Buffer()
        buf.add_str(s)
        buf.guess_segment_properties()
        hb.shape(font, buf, {})

        x = 100
        base = 65 + row_idx * 60
        d.text((12, base - 16), row_label, fill=0)

        for i, p in zip(buf.glyph_infos, buf.glyph_positions):
            gx, gy = x + p.x_offset * sc, p.y_offset * sc
            pen = Poly(gs, lambda q, gx=gx, gy=gy: (gx + q[0] * sc, base - gy - q[1] * sc))
            gs[order[i.codepoint]].draw(pen)
            for poly in pen.polys:
                if len(poly) > 2:
                    d.polygon(poly, outline=0)
            if i.codepoint == 0:
                d.rectangle([gx, base - 26, gx + 16, base], outline=0)
            x += p.x_advance * sc

    img.save(out)

if __name__ == '__main__':
    for path in sys.argv[2:]:
        name = path.split('/')[-1].rsplit('.', 1)[0]
        render(path, f"{sys.argv[1]}/{name}.png", name)
