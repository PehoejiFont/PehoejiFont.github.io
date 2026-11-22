"""Per-cluster mechanism + geometry test with HarfBuzz."""
import sys, json, unicodedata as ud
import uharfbuzz as hb
TESTS = ['o͘','O͘','ó͘','ò͘','ô͘','ō͘','ŏ͘','o̍͘','Ó͘','Ō͘','O̍͘','a̍','i̍','m̍','n̍','I̍','M̍','N̍','ḿ','m̄','m̂','n̂','n̄','i̋','n̍g', 'iⁿ']
def placed(font, s):
    buf = hb.Buffer(); buf.add_str(s); buf.guess_segment_properties(); hb.shape(font, buf, {})
    x = 0; out = []
    for i, p in zip(buf.glyph_infos, buf.glyph_positions):
        e = font.get_glyph_extents(i.codepoint)
        box = None
        if e and e.width:
            x0 = x + p.x_offset + e.x_bearing; y1 = p.y_offset + e.y_bearing
            box = (x0, y1 + e.height, x0 + e.width, y1)  # xmin,ymin,xmax,ymax
        out.append(dict(gid=i.codepoint, cl=i.cluster, adv=p.x_advance, off=(p.x_offset, p.y_offset), box=box))
        x += p.x_advance
    return out
def mech(s, g):
    if any(x['gid'] == 0 for x in g): return 'NOTDEF'
    nmarks = sum(1 for c in s if ud.category(c) == 'Mn')
    if nmarks == 0: return 'single'
    nbase = len(s) - nmarks
    mk = g[nbase:]
    if not mk: return 'ligature'           # base+marks became one glyph (ccmp/liga or cmap precomposed)
    if any(x['adv'] > 0 for x in mk): return 'FLOATING'
    if len(mk) < nmarks: return 'partial-ligature+' + ('gpos' if any(x['off'] != (0, 0) for x in mk) else 'overstrike')
    if all(x['off'] != (0, 0) for x in mk): return 'gpos-anchor'
    if any(x['off'] != (0, 0) for x in mk): return 'gpos-partial'
    return 'zero-width-overstrike'
def boxes(g): return sorted(tuple(round(v / 10) for v in x['box']) for x in g if x['box'])
def check(path, idx=0):
    face = hb.Face(hb.Blob.from_file_path(path), idx); font = hb.Font(face)
    res = {}
    for t in TESTS:
        nfc, nfd = ud.normalize('NFC', t), ud.normalize('NFD', t)
        gc, gd = placed(font, nfc), placed(font, nfd)
        r = {'nfc': mech(nfc, gc), 'nfd': mech(nfd, gd), 'same': boxes(gc) == boxes(gd)}
        if '͘' in nfd and r['nfd'] != 'NOTDEF':
            # dot = glyph from U+0358 (if separate); check it sits right of base centre and does not overlap tone mark
            dot = [gd[-1]] if len(gd) > 1 and gd[-1]['box'] else []
            base = gd[0]['box']
            if dot and base:
                d = dot[0]['box']; r['dot_right'] = d[0] > (base[0] + base[2]) / 2
                r['dot_high'] = d[1] > base[3] * 0.5
                others = [x['box'] for x in gd[1:-1] if x['box']]
                r['dot_clash'] = any(not (d[2] <= o[0] or o[2] <= d[0] or d[3] <= o[1] or o[3] <= d[1]) for o in others)
        res[t] = r
    return res
if __name__ == '__main__':
    json.dump({p: check(p) for p in sys.argv[1:]}, sys.stdout, ensure_ascii=False)
