"""Draw POJ text as SVG with HarfBuzz positions and fontTools outlines (for the website guide).

usage: python tools/poj_guide_svg.py <out.svg> <font> <text> [--boxes] [--mark-color]

--boxes       draw each glyph's advance box (shows how much room a glyph takes)
--mark-color  colour glyphs that come from combining marks (U+0300-U+036F) in the accent colour

Colours come from CSS classes (g = glyph, m = mark glyph, b = advance box) so the page sets them for
light and dark mode. HarfBuzz is the engine in Chrome, Firefox, Android and LibreOffice.
"""
import sys, unicodedata as ud
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen


STYLE = ('.g{fill:#1d1d1f}.m{fill:#d4380d}.b{fill:#eef2fb;stroke:#8ea3d6;stroke-width:5}'
         '@media (prefers-color-scheme:dark){.g{fill:#ececec}.m{fill:#ff7a45}.b{fill:#1f2533;stroke:#5d6f9c}}')


def main(out, path, text, boxes=False, mark_color=False):
    tt = TTFont(path, fontNumber=0)
    gs, order = tt.getGlyphSet(), tt.getGlyphOrder()
    upm = tt['head'].unitsPerEm
    font = hb.Font(hb.Face(hb.Blob.from_file_path(path), 0))
    buf = hb.Buffer()
    buf.add_codepoints([ord(c) for c in text])  # cluster = character index
    buf.guess_segment_properties()
    buf.cluster_level = hb.BufferClusterLevel.MONOTONE_CHARACTERS  # keep marks in their own cluster
    hb.shape(font, buf, {})
    top, bottom = upm * 1.15, -upm * 0.3       # room for stacked marks on capitals
    pad = upm * 0.08
    x, parts, rects = 0, [], []
    for i, p in zip(buf.glyph_infos, buf.glyph_positions):
        ch = text[i.cluster]
        is_mark = ud.category(ch) == 'Mn' and mark_color
        if boxes and p.x_advance:
            rects.append(f'<rect class="b" x="{x}" y="{-top}" width="{p.x_advance}" height="{top - bottom}"/>')
        pen = SVGPathPen(gs)
        gs[order[i.codepoint]].draw(TransformPen(pen, (1, 0, 0, 1, x + p.x_offset, p.y_offset)))
        d = pen.getCommands()
        if d:
            parts.append(f'<path class="{"m" if is_mark else "g"}" d="{d}"/>')
        x += p.x_advance
    w = x + 2 * pad
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-top} {w} {top - bottom}" '
           f'role="img" aria-label="{text}"><style>{STYLE}</style>'
           f'{"".join(rects)}<g transform="scale(1,-1)">{"".join(parts)}</g></svg>')  # glyphs: font space, y up
    open(out, 'w').write(svg)


if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    main(a[0], a[1], a[2], '--boxes' in sys.argv, '--mark-color' in sys.argv)
