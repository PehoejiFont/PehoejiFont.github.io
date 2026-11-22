"""Analyze POJ support in font files: cmap, GSUB/GPOS features, anchors, IVS, PUA,
and HarfBuzz shaping of NFC vs NFD test syllables."""
import sys, json, unicodedata as ud
from fontTools.ttLib import TTFont
import uharfbuzz as hb

KEY = {
    'U+0358 dot above right (o͘)': 0x358, 'U+030D vertical line (tone 8)': 0x30D,
    'U+207F superscript n (ⁿ)': 0x207F, 'U+0301 acute': 0x301, 'U+0300 grave': 0x300,
    'U+0302 circumflex': 0x302, 'U+0304 macron': 0x304, 'U+0306 breve (POJ t9)': 0x306,
    'U+030B double acute (Tâi-lô t9)': 0x30B, 'U+0131 dotless i': 0x131,
    'U+00B7 middle dot (o· fallback)': 0xB7, 'U+1D3A/ᴺ cap superscript N': 0x1D3A,
}
PRECOMP = 'áàâāăÁÀÂĀĂéèêēĕÉÈÊĒĔíìîīĭÍÌÎĪĬóòôōŏÓÒÔŌŎúùûūŭÚÙÛŪŬḿńǹŃǸḾ'
# syllables/clusters covering every way POJ is encoded
TESTS = ['o͘', 'O͘', 'ó͘', 'ò͘', 'ô͘', 'ō͘', 'ŏ͘', 'o̍͘', 'Ó͘', 'Ō͘', 'O̍͘',
         'a̍', 'e̍', 'i̍', 'o̍', 'u̍', 'm̍', 'n̍', 'A̍', 'I̍', 'M̍', 'N̍',
         'í', 'ī', 'î', 'ḿ', 'm̄', 'm̂', 'm̀', 'n̂', 'n̄', 'n̍g', 'iⁿ', 'sⁿ', 'i̋', 'ő']

def anchors_report(f):
    """Which base glyphs get mark attachment for 0358 / 030D via GPOS MarkBase."""
    out = {}
    if 'GPOS' not in f: return out
    cmap = f.getBestCmap()
    targets = {cmap[c]: c for c in (0x358, 0x30D) if c in cmap}
    lk = f['GPOS'].table.LookupList
    if not lk: return out
    for L in lk.Lookup:
        for st in L.SubTable:
            if L.LookupType == 9: st = st.ExtSubTable
            if getattr(st, 'Format', None) == 1 and st.__class__.__name__ == 'MarkBasePos':
                marks = st.MarkCoverage.glyphs
                for g, c in targets.items():
                    if g in marks:
                        out.setdefault(f'U+{c:04X}', set()).update(st.BaseCoverage.glyphs)
    return out

def shape(blob_face, text, feats=None):
    font = hb.Font(blob_face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, feats or {})
    return [(i.codepoint, p.x_offset, p.y_offset, p.x_advance) for i, p in zip(buf.glyph_infos, buf.glyph_positions)]

def analyze(path, idx=0):
    f = TTFont(path, fontNumber=idx, lazy=True)
    cmap = f.getBestCmap() or {}
    gorder = f.getGlyphOrder()
    name = f['name'].getDebugName(4)
    r = {'file': path.split('/dl/')[-1], 'name': name, 'glyphs': len(gorder)}
    r['has'] = {k: (v in cmap) for k, v in KEY.items()}
    r['precomposed_missing'] = ''.join(c for c in PRECOMP if ord(c) not in cmap)
    pua = [c for c in cmap if 0xE000 <= c <= 0xF8FF or c >= 0xF0000]
    r['pua_count'] = len(pua)
    ivs = 0
    for t in f['cmap'].tables:
        if t.format == 14:
            ivs = sum(len(v) for v in t.uvsDict.values())
    r['ivs_mappings'] = ivs
    for tag in ('GSUB', 'GPOS'):
        feats = set()
        if tag in f and f[tag].table.FeatureList:
            feats = {fr.FeatureTag for fr in f[tag].table.FeatureList.FeatureRecord}
        r[tag] = sorted(feats)
    a = anchors_report(f)
    r['mark_bases'] = {k: len(v) for k, v in a.items()}
    # does precomposed o-acute etc. accept U+0358?
    if 'U+0358' in a:
        bases = a['U+0358']
        r['0358_on'] = {c: (cmap.get(ord(c)) in bases) for c in 'oOóòôōŏÓŌ' if ord(c) in cmap}
    # HarfBuzz tests
    blob = hb.Blob.from_file_path(path); face = hb.Face(blob, idx)
    tests = {}
    for t in TESTS:
        res = {}
        for form in ('NFC', 'NFD'):
            s = ud.normalize(form, t)
            g = shape(face, s)
            notdef = any(x[0] == 0 for x in g)
            # a mark that is "attached" has a non-zero offset or zero advance after the base
            marks = g[1:]
            unpositioned = any(m[1] == 0 and m[2] == 0 and m[3] > 0 for m in marks)
            res[form] = {'n': len(g), 'notdef': notdef, 'floating_mark': unpositioned}
        bad = res['NFC']['notdef'] or res['NFD']['notdef']
        weak = res['NFC']['floating_mark'] or res['NFD']['floating_mark']
        tests[t] = 'MISSING' if bad else ('unattached' if weak else 'ok')
    r['shaping'] = tests
    return r

if __name__ == '__main__':
    out = [analyze(p) for p in sys.argv[1:]]
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
