"""Shape the POJ test clusters with CoreText and HarfBuzz and compare them.

usage: python tools/poj_coretext_compare.py <poj_coretext binary> <audit.json> <font dir> > out.json

<poj_coretext binary> is tools/poj_coretext.swift compiled with swiftc. Each font from
data/poj-font-audit.json is tested in three input forms:
  nfc  - NFC
  nfd  - NFD (canonical mark order)
  rev  - NFD with U+0358 moved before the tone mark (non-canonical order; only for clusters with both)
For each form it records the CoreText mechanism (same labels as poj_shape_test.py, plus FALLBACK when
CoreText drew any glyph from another font), the HarfBuzz mechanism, and whether CoreText produced the
same glyphs at the same positions as HarfBuzz.
"""
import json, os, subprocess, sys, unicodedata as ud
import uharfbuzz as hb

TESTS = ['o͘', 'O͘', 'ó͘', 'ò͘', 'ô͘', 'ō͘', 'ŏ͘', 'o̍͘', 'Ó͘', 'Ō͘', 'O̍͘', 'a̍', 'i̍', 'm̍', 'n̍', 'I̍', 'M̍', 'N̍',
         'ḿ', 'm̄', 'm̂', 'n̂', 'n̄', 'i̋', 'n̍g', 'iⁿ']
DOT = '͘'


def forms(t):
    nfd = ud.normalize('NFD', t)
    out = {'nfc': ud.normalize('NFC', t), 'nfd': nfd}
    if DOT in nfd and len([c for c in nfd if ud.category(c) == 'Mn']) > 1:
        base = ''.join(c for c in nfd if ud.category(c) != 'Mn')
        tones = ''.join(c for c in nfd if ud.category(c) == 'Mn' and c != DOT)
        out['rev'] = base + DOT + tones
    return out


def hb_shape(font, s):
    buf = hb.Buffer(); buf.add_str(s); buf.guess_segment_properties(); hb.shape(font, buf, {})
    x = 0; out = []
    for i, p in zip(buf.glyph_infos, buf.glyph_positions):
        e = font.get_glyph_extents(i.codepoint)
        box = None
        if e and e.width:
            x0 = x + p.x_offset + e.x_bearing; y1 = p.y_offset + e.y_bearing
            box = (x0, y1 + e.height, x0 + e.width, y1)
        out.append(dict(gid=i.codepoint, pen=x, x=x + p.x_offset, y=p.y_offset, adv=p.x_advance, box=box))
        x += p.x_advance
    return out


def mech(s, g, ps=None):
    if ps and any(x['font'] != ps for x in g): return 'FALLBACK'
    if any(x['gid'] == 0 for x in g): return 'NOTDEF'
    nmarks = sum(1 for c in s if ud.category(c) == 'Mn')
    if nmarks == 0: return 'single'
    nbase = len(s) - nmarks
    mk = g[nbase:]
    off = lambda m: (round(m['x'] - m['pen']), round(m['y'])) != (0, 0)
    if not mk: return 'ligature'
    if any(m['adv'] > 0 for m in mk): return 'FLOATING'
    if len(mk) < nmarks: return 'partial-ligature+' + ('gpos' if any(off(m) for m in mk) else 'overstrike')
    if all(off(m) for m in mk): return 'gpos-anchor'
    if any(off(m) for m in mk): return 'gpos-partial'
    return 'zero-width-overstrike'


def same(h, c):
    if len(h) != len(c): return False
    return all(a['gid'] == b['gid'] and abs(a['x'] - b['x']) <= 1 and abs(a['y'] - b['y']) <= 1 for a, b in zip(h, c))


def dot_check(s, g):
    """Dot geometry from the last glyph when U+0358 is last in the string and stays a separate glyph."""
    if not s.endswith(DOT) or len(g) < 2 or not g[-1]['box'] or not g[0]['box']: return {}
    d, b = g[-1]['box'], g[0]['box']
    others = [x['box'] for x in g[1:-1] if x['box']]
    return {'dot_right': d[0] > (b[0] + b[2]) / 2, 'dot_high': d[1] > b[3] * 0.5,
            'dot_clash': any(not (d[2] <= o[0] or o[2] <= d[0] or d[3] <= o[1] or o[3] <= d[1]) for o in others),
            'dot_past_advance': d[0] >= g[0]['adv']}


def main(binary, audit, fontdir):
    fonts = json.load(open(audit))
    report = []
    for f in fonts:
        path = f['file'] if os.path.isabs(f['file']) else os.path.join(fontdir, f['file'])
        strings, keys = [], []
        for t in TESTS:
            for k, s in forms(t).items():
                strings.append(s); keys.append((t, k))
        ct = json.loads(subprocess.run([binary, 'shape', path, '0'], input=json.dumps(strings).encode(),
                                       capture_output=True, check=True).stdout)
        hbfont = hb.Font(hb.Face(hb.Blob.from_file_path(path), 0))
        res = {}
        for (t, k), s, c in zip(keys, strings, ct['results']):
            h = hb_shape(hbfont, s)
            r = {'ct': mech(s, c, ct['ps']), 'hb': mech(s, h), 'same_as_hb': same(h, c)}
            if r['ct'] == 'FALLBACK':
                r['fallback_fonts'] = sorted({x['font'] for x in c if x['font'] != ct['ps']})
            else:
                r.update({'ct_' + a: v for a, v in dot_check(s, c).items()})
            res.setdefault(t, {})[k] = r
        report.append({'file': f['file'], 'name': f['name'], 'ps': ct['ps'], 'shaping': res})
        print(f['name'], file=sys.stderr)
    json.dump(report, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(*sys.argv[1:4])
