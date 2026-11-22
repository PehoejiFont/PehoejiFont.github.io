# How POJ fonts work: research notes

Research date: 2026-11-20. Source list: [狗公會曉學台語 › 字體（font）](https://oh.taigi.info/siataibun/jithe/).
Reviewed by Gemini 4 Neon (XHigh) and Gemini 4 Hydrogen (XHigh) through `agy`; see §6.

Tools and raw data in this repo:

| Path | What |
|---|---|
| `tools/poj_font_audit.py` | cmap coverage, GSUB/GPOS features, U+0358/U+030D anchor bases, IVS and PUA counts |
| `tools/poj_shape_test.py` | per-cluster mechanism (ligature / anchor / overstrike / floating / notdef), NFC vs NFD |
| `tools/poj_specimen.py` | PNG specimen: NFC row then NFD row |
| `data/poj-font-audit.json` | results for the 24 fonts below |
| `docs/img/specimen-{0,1,2}.png` | specimens for the same fonts |

**Scope of the tests:** all shaping results come from **HarfBuzz** (uharfbuzz), the engine in Chrome, Firefox, Android, LibreOffice and Linux. CoreText (macOS/iOS apps, Safari) and DirectWrite (Windows, Word) were **not** tested. Statements about those two engines are marked *(reviewer claim, not verified)* where they come only from the model review.

---

## 1. How POJ differs from an English font

An English font maps one key to one glyph. POJ text is mostly **base letter + one or two combining marks**, and Unicode has no single code point for most of the results.

| Need | Why it is hard |
|---|---|
| **o͘** = `o` + U+0358 COMBINING DOT ABOVE RIGHT | No precomposed o͘. The dot goes at the **top right**, not centred like other accents. |
| **o͘ + tone** (ó͘ ò͘ ô͘ ō͘ ŏ͘ o̍͘ and capitals) | **Two marks at once**: tone centred above, dot at top right. They must not collide, and the dot must not hit the next letter (`o͘h`, `o͘ⁿ`, `o͘"`). |
| **8th tone** U+030D COMBINING VERTICAL LINE ABOVE | No precomposed letter has it (a̍ e̍ i̍ o̍ u̍ m̍ n̍ are always sequences). Most Latin fonts lack the glyph. |
| **Tones on m and n** (syllabic ḿ m̀ m̂ m̄ m̍, ń ǹ n̂ n̄ n̍g) | Only ḿ ń ǹ (and capitals) are precomposed, and ḿ/ǹ live in blocks many Latin fonts skip. The rest are built from marks. |
| **i + tone** (í ì î ī ĭ i̍ i̋) | `i` is Soft_Dotted: its dot must go when an **above** mark sits on it. Precomposed í etc. already do this. The **sequences** i + U+030D and i + U+030B need the font to swap in dotless ı. |
| **ⁿ** U+207F | A letter (Lm), not a mark. Many fonts lack it. NFKC turns it into plain `n` (§2.4). |
| **Tâi-lô** (same readers, same fonts) | Adds 9th tone U+030B double acute (only ő ű precomposed), the 6th-tone caron U+030C used for dialects that keep tone 6 (ǎ ě ǐ ǒ ǔ ň precomposed, m̌ not), and spells o͘/ⁿ as `oo`/`nn`. |
| **Hyphens** | `-` joins syllables, `--` marks the neutral tone (`tńg--khì`). `--` must stay two hyphens (§2.7). |
| **Han-Lo** (漢羅) | The Latin part of a CJK font has to support all of the above. Ruby (POJ over Hanji) needs IVS or HTML `<ruby>` (§2.6). |

Test line used for the specimens (the shaping test also covers e̍ o̍ u̍ and the other capitals):

```
o͘ ó͘ ò͘ ô͘ ō͘ o̍͘ ŏ͘ O͘ Ó͘ Ō͘ | a̍ i̍ m̍ n̍ n̍g I̍ | ḿ m̄ m̂ ǹ n̄ | iⁿ i̋ | Pe̍h-ōe-jī Lâu Ô͘-chhiû
```

Fuller line to use in future tests:

```
o͘ ó͘ ò͘ ô͘ ō͘ ŏ͘ o̍͘ ő͘ ǒ͘ O͘ Ó͘ Ò͘ Ô͘ Ō͘ Ŏ͘ O̍͘ | a̍ e̍ i̍ o̍ u̍ m̍ n̍g A̍ E̍ I̍ O̍ U̍ M̍ N̍g | ḿ m̀ m̂ m̄ m̌ ǹ n̂ n̄ | iⁿ sⁿ Sⁿ o͘ⁿ o͘h | i̋ ő ǎ | tńg--khì | Pe̍h-ōe-jī Lâu Ô͘-chhiû
```

> POJ rule to remember when testing: in syllabic **ng** the tone goes on the **n**: `n̍g`, `n̂g`, not `ng̍`. In Tâi-lô `oo` the tone goes on the first `o` (`óo`), and with `nn` it goes on the vowel before it (`ánn`).

---

## 2. How Unicode combines characters (every input form a font must accept)

The same visible syllable can reach the font as several different code point sequences. **A POJ font has to render all of them the same way.**

### 2.1 Precomposed (NFC) and decomposed (NFD)

| Form | ó͘ (o + acute + dot) | Who produces it |
|---|---|---|
| NFC | `U+00F3 ó` + `U+0358` | Most web text, most IMEs, NFC-normalising databases |
| NFD | `U+006F o` + `U+0301` + `U+0358` | macOS file names, some IMEs, PDF copy-out |
| Non-canonical order | `o` + `U+0358` + `U+0301` | Sequential/dead-key IMEs where the user types o͘ as a unit, then the tone |
| Mixed | Any of the above in one document | Text edited by several tools |

Precomposed code points available for POJ/Tâi-lô letters (Unicode 17.0; checked with Python `unicodedata`):

| base | ´ 2 | ` 3 | ^ 5 | ˇ 6 (TL) | ¯ 7 | ̍ 8 | ˘ 9 (POJ) | ̋ 9 (TL) |
|---|---|---|---|---|---|---|---|---|
| a e i | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| o u | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ ő ű |
| m | ✓ ḿ | – | – | – | – | – | – | – |
| n | ✓ ń | ✓ ǹ | – | ✓ ň | – | – | – | – |

Capitals follow the same pattern. Nothing with U+0358 or U+030D is precomposed. **None will be added**: UTC/WG2 policy is not to encode new precomposed letters that can be written as base + combining mark. When POJ was proposed, Unicode encoded U+0358 (Unicode 4.1, 2005) instead of a precomposed o͘. The Normalization Stability Policy (2001) also guarantees that NFC of an existing sequence never changes, so no new character could ever become the NFC form of `o + U+0358`.

### 2.2 Canonical ordering (mark order)

| Mark | Canonical Combining Class (ccc) |
|---|---|
| U+0300 0301 0302 0304 0306 030B 030C **030D** | 230 (above) |
| **U+0358** dot above right | **232** (above right) |

Normalisation sorts marks by ccc, so `o + U+0358 + U+0301` becomes `o + U+0301 + U+0358`, and NFC is `ó + U+0358`. Consequences:

- After normalisation, **the tone mark always comes before the dot**.
- For tones 2, 3, 5, 6, 7 and 9, NFC is **precomposed toned vowel + U+0358**. A font must be able to attach U+0358 to `óòôǒōŏő ÓÒÔǑŌŎŐ`, not only to `o O`.
- For the 8th tone there is no precomposed vowel, so NFC of `o̍͘` stays `o + U+030D + U+0358`.
- **HarfBuzz** reorders marks by ccc and recomposes through the cmap **before** GSUB. Verified: `o 0358 0301`, `o 0301 0358` and `ó 0358` shaped identically in every font tested. So in HarfBuzz:
  - a ligature written for the non-canonical order (`o 0358 0301`) never matches;
  - `o acutecomb uni0358` never matches either when the font maps `ó`, because the input reaches GSUB as `oacute uni0358`.

  These rules are still worth keeping for engines that do not normalise (see §2.3).
- Equal-ccc marks keep their order: `o̍͘` is `o 030D 0358`.

### 2.3 How shaping engines join it up

**HarfBuzz** (verified in this study, and from `hb-ot-shape-normalize.cc` / `hb-ot-shape-fallback.cc`):

1. **Normalise**: decompose, sort marks by ccc, then recompose wherever the font's cmap has the composite (Latin uses the `COMPOSED_DIACRITICS` mode). If a precomposed letter is missing from the cmap, HarfBuzz decomposes it and shapes base + mark.
2. **GSUB `ccmp`**: always on, cannot be switched off by users or CSS. Fonts use it for dotless-i, capital-form marks and precomposed ligatures.
3. Other GSUB features (`locl`, `liga`, `case`, …).
4. **GPOS `mark` / `mkmk`**: anchors.
5. **Fallback positioning, all or nothing**: HarfBuzz positions marks by ccc and glyph bounding boxes **only if the font has no GPOS `mark` feature at all**. If the font has `mark` but no anchor for a particular pair, the mark stays at raw offset (0,0). Verified:
   - Arial (has `mark`, no U+0358 anchors): the dot sits at (0,0) and is drawn wherever its outline puts it.
   - Source Sans 3: `ŏ + U+0358` and `Ŏ + U+0358` have no anchor → (0,0).
   - Geneva / Helvetica / Menlo and the taigivs IVS fonts (no `mark`) go through fallback. Fallback lifts U+0358 above the whole ink box of `Ó`/`Ō`, accent included, so the dot floats far above capitals (specimen-0.png).

**CoreText and DirectWrite** *(reviewer claims, not verified here; test before relying on them)*:

- Neither runs HarfBuzz-style ccc/bounding-box fallback positioning. Unanchored marks render where their outlines are drawn.
- DirectWrite is said not to reorder marks or recompose NFD through the cmap the way HarfBuzz does, so `o + U+0301` may stay two glyphs and non-canonical orders may reach GSUB.
- When a precomposed letter (e.g. `ḿ`, `ǹ`, `ŏ`) is missing from the cmap, both are said to use **system font fallback** for that character rather than decompose it. A single letter then shows in a different font.
- Apple system fonts may use AAT tables (`morx`/`kerx`) under CoreText, so HarfBuzz results for Geneva/Helvetica/Menlo don't predict how they look in Pages or Safari.

That is why a font should cover **both** mark orders and **both** NFC and NFD inputs in GSUB, and should map every precomposed letter in §2.1.

**Optional features can be turned off:**

- `liga` and `clig` are optional. CSS Text 3 tells browsers not to apply optional ligatures when `letter-spacing` is non-zero; Chrome, Safari and Firefox follow it. `font-variant-ligatures: none` turns them off too.
- Microsoft Word leaves ligatures off unless the user enables them (Font › Advanced). Many code editors do the same.
- So **POJ glyph building must never live in `liga`/`clig`**; use `ccmp`.
- `case` is also **off by default** in browsers and Word: `text-transform: uppercase` does not enable it. Capital-form marks therefore need contextual rules in `ccmp`, not only in `case`.

### 2.4 Superscript ⁿ (U+207F) and capital ᴺ (U+1D3A)

- U+207F is a letter (Lm), not a mark. It takes its own advance width and needs no anchors.
- Its compatibility decomposition is `<super> n`, so **NFKC/NFKD turn `hiⁿ` into `hin`**. Search engines, some databases and "normalise width" functions do this, and the nasal mark is lost. Text pipelines must use **NFC, never NFKC**.
- Unicode has no case mapping for it: `"sⁿ".upper()` gives `Sⁿ`. All-caps text sometimes uses **U+1D3A ᴺ MODIFIER LETTER CAPITAL N** (`SIᴺ`), or `NN`. A POJ font should include U+1D3A.
- A `.case` form of ⁿ may raise it to cap-height alignment. It should **not** turn ⁿ into ᴺ, because that changes the text's meaning, which is not what `case` is for.
- `<sup>n</sup>` in HTML and `ₙ` (U+2099), `ª` are wrong-character inputs, not font problems.

### 2.5 Legacy and substitute encodings seen in real text

| Method | Example | What the font needs |
|---|---|---|
| Combining U+0358 (standard since Unicode 4.1, 2005) | `o͘` | Anchors and/or `ccmp` ligatures (§3) |
| Middle dot / similar spacing dot: U+00B7, U+02D9, U+2022, U+30FB | `o·` | Nothing (punctuation). Convert to U+0358 on input. |
| Vietnamese horn o (U+01A1 ơ, ớ ờ …) | `ơ` | Nothing. A common legacy look-alike. Convert on input. |
| Dot above U+0307 used for o͘ or 8th tone; U+02C8 `ˈ` or apostrophe for 8th tone | `ȯ`, `aˈ` | Nothing. Convert on input. |
| ASCII / typewriter spellings | `oo`, `ou`, `o'`, `nn`, `N` | Nothing. `oo`/`nn` are also the Tâi-lô spellings. |
| **Private Use Area** | aiongg POJ fonts / NunitoPOJ: U+E400–E435 = precomposed o͘ forms "for legacy software that does not support OpenType". Other communities used other PUA ranges, and pre-Unicode fonts reused Windows-1252/MacRoman slots 0x80–0xFF *(reviewer report)*. | Works only with that exact font. Avoid in new text. A font may keep mapping old slots so old documents still render. |
| Numbered tones (TLPA, POJ numbers) | `peh8-oe7-ji7` | Nothing. A converter or IME turns them into marks. |

Rows 3–4 and the extra PUA schemes come from the model review. They are plausible but this study did not check corpora for them.

### 2.6 Ideographic Variation Sequences (Han-Lo ruby)

ButTaiwan's **字咍 taigivs** fonts (TaigiHuninn, TaigiIansui, TaigiKaiStd, TaigiGenRyuMin, …; fonts OFL 1.1, build scripts Apache-2.0) use a cmap format 14 table:

- A Han character + a variation selector (U+E0100…) selects a glyph that has the Taigi reading drawn **into** the glyph as ruby. There are 8,021 IVS mappings per font.
- Variants, from the fonts' `name` tables: POJ (白話字), TL (台羅 Tâi-lô), HI (方音, Taiwanese Phonetic Symbols), KN (假名, Taiwanese kana), and the two-reading combinations POJHI, POJKN, TLHI, TLKN.
- The README says the Taiwanese version uses **IVS only, no GSUB**. Changing the font file changes which romanisation is shown.

This is the only way to get "POJ above Hanji" in plain text without HTML `<ruby>`, and it is a separate track from Latin POJ support. The **Latin part** of these fonts has no GPOS `mark` and no dotless-i swap (i̍ keeps its dot), so their running POJ text depends on HarfBuzz fallback. Subsetters and PDF tools often drop the format 14 table or the variation selectors.

### 2.7 Hyphen and neutral-tone double hyphen

- `-` (U+002D) joins syllables. `--` marks the neutral tone: `chhù--nih`, `khòaⁿ--tio̍h`.
- A font must **not** turn `--` into a dash through `liga`/`calt`, and the hyphens should not touch.
- Editors that "smart-convert" `--` to `–` corrupt POJ. That is an editor setting, not a font issue.
- Line breaking inside `--` (`chhù- / -nih`) is a layout-engine issue. U+2011 NON-BREAKING HYPHEN is sometimes used and is missing from many fonts.

---

## 3. How the fonts implement POJ

Each font below was measured with HarfBuzz on 26 test clusters, in NFC and in NFD. Four techniques turned up:

| Technique | What happens | Examples | Pros | Cons |
|---|---|---|---|---|
| **A. GPOS mark anchors** | `o` plus separate mark glyph(s), placed by `mark` (`top` / `topright` anchors) and `mkmk` | Source Sans 3, POJ Chhiu-ki, Arial (for U+030D) | Small, works for any base, standard OpenType | Needs a `topright` anchor on **every** base the dot can follow, including precomposed `óòôōŏ…`. Easy to miss: Source Sans 3 misses `ŏ Ŏ`; I.Ming has the anchor only on `o ō`. |
| **B. Precomposed glyphs through `ccmp` ligatures** | `o 0301 0358` → one glyph (e.g. `oopoj_acutecomb`) | Lesson One, jf open 粉圓, Iansui, TASA, Tauhu, I.Ming, GenYo, WD-XL | Designer controls every shape, including collision fixes. Doesn't depend on mark positioning. | Glyph count grows. Must cover both mark orders and NFC + NFD input. Anything uncovered falls back to A, so anchors are still needed. Ligatures lose `o`'s kerning unless added to kerning classes. |
| **C. Spacing dot** | U+0358 is a **base glyph** (GDEF class 1) with its own advance (Gentium 200, Charis 279, Doulos 255 units) | SIL Charis, Doulos, Gentium | The dot can never collide with the next letter | Wider `o͘`. It must stay GDEF class 1: a class-3 mark would have its advance zeroed. PDF text extraction may insert a space. |
| **D. Zero-width overstrike or shaper fallback** | Mark has 0 advance and is drawn at a fixed spot, or the font has no `mark` and the shaper guesses | Arial (U+0358), Geneva, Helvetica, Menlo, taigivs Latin, Tauhu (for uncovered clusters) | Nothing to build | Right only for the base it was drawn for. Capitals, toned vowels and other engines go wrong. |

**What good POJ fonts combine: A + B.** `ccmp` ligatures for the common clusters, and anchors as the safety net.

### 3.1 Survey results (Regular weights)

All fonts below map U+0358, U+030D, U+207F and U+030B, **except EB Garamond, which has no U+0358**. "mark" means the font has a GPOS `mark` feature.

| Font | License | Technique | mark | Dotless i̍ | Notes |
|---|---|---|---|---|---|
| Source Sans 3 (Adobe) | OFL | A | ✓ | ✓ | `ŏ͘` and `Ŏ͘` unanchored: dot at (0,0), no fallback. The rest is clean. |
| POJ Chhiu-ki (aiongg) | Apache-2.0 (release LICENSE) | A | ✓ | ✓ | Built for POJ. Clean. |
| NunitoPOJ (aiongg, ships with the taigivs IME) | OFL | B in `liga`, A, PUA E400–E435 | ✓ | ✓ | `liga` ligatures are keyed in the non-canonical order (`O 0358 030B`) and never fire in HarfBuzz. With `liga` off, `ccmp` + anchors still give correct `o͘` and `i̍` (verified), so it's robust anyway. |
| Lesson One (But) | OFL | B (`ccmp`, both orders) + A | ✓ | ✓ | Best practice. |
| TASA Explorer / Orbiter | OFL | B + A | ✓ | ✓ | **Google Fonts web version lacks U+0358/U+030D/ⁿ** (§3.2). |
| jf open 粉圓 2.1 (Huninn) | OFL | B + A | ✓ | ✓ | On Google Fonts, with a dedicated Taigi subset (§3.2). |
| 芫荽 Iansui (But) | OFL | B + A | ✓ | ✓ | Same as Huninn. |
| WD-XL Lubrifont TC | OFL | B (`ccmp` "dynamic composition") + A | ✓ | ✓ | |
| 一點明體 I.Ming | IPA Font License 1.0 | B + A | ✓ | ✓ | U+0358 anchors only on `o ō`. Ligatures cover the rest of the test set. |
| 源樣明體 GenYoMin2 TW | OFL | B only | ✗ | ✓ | Dot drawn close to the bowl (horn-like). Uncovered clusters depend on the engine. |
| Tāu-hū Khu-lé-iòng / Môo-tn̄g / 豆腐烏 | OFL | B only | ✗ | ✓ | Same caveat as GenYo. |
| Charis / Doulos / Gentium (SIL) | OFL with Reserved Font Names | A + C | ✓ | ✓ | Excellent. A fork must be renamed. |
| EB Garamond | OFL | A (no U+0358) | ✓ | ✗ | U+0358 is tofu. U+030D unanchored (a misplaced tick). Listed on the site, **not usable for o͘**. |
| 字咍 Taigi IVS fonts | OFL / Apache-2.0 | D + IVS ruby | ✗ | ✗ | Great for Hanji ruby. Weak for running POJ. |
| Arial (macOS copy, proprietary) | — | A (U+030D) + D (U+0358) | ✓ | ✓ | U+0358 is an unanchored overstrike. Because Arial has `mark`, HarfBuzz gives it no fallback. |
| Helvetica / Geneva / Menlo (macOS, proprietary) | — | D | ✗ | ✗ | HarfBuzz fallback only. Capital `Ó͘ Ō͘` dot floats high. CoreText may differ (AAT). |

**Not tested** (no direct file or not a font licence):

- **Caivun** (itch.io, page says SIL OFL)
- **Kaukhia** (itch.io, **CC BY 4.0**; Creative Commons advises against CC licences for fonts, although it still allows reuse)
- **Indeciso** (the site is JavaScript-only)
- **Chiron 昭源** (OFL; no POJ claim on its site)
- **嘉市體** (free to use, but **no modification**, so not open)

**Free & open picks:**

- **Running POJ:** Lesson One, POJ Chhiu-ki, TASA Explorer/Orbiter (from GitHub, not Google Fonts), Charis/Doulos/Gentium, jf open 粉圓, 芫荽 Iansui, Source Sans 3 (avoid `ŏ͘`).
- **Han-Lo:** jf open 粉圓, 芫荽 Iansui, WD-XL Lubrifont. 源樣明體 and the 豆腐烏 family work for common clusters but have no `mark` safety net. I.Ming is good too but uses the IPA licence, not OFL.

### 3.2 Google Fonts web delivery (verified 2026-11-20)

The Google Fonts CSS API (`fonts.googleapis.com/css2`, Chrome user agent) serves fonts as `unicode-range` slices.

| Family | Slices | Slice containing U+0358 / U+030D / ⁿ |
|---|---|---|
| TASA Explorer | 2 (`latin`, `latin-ext`) | **none**: the marks are not served at all |
| Source Sans 3 | 7 | **none** |
| EB Garamond | 7 | none (and the font lacks U+0358 anyway) |
| Iansui | 108 | slice #104, a Taigi slice holding the POJ marks, ḿ ǹ ő ű ı ᴺ and base letters |
| Huninn | 111 | slice #106, same pattern |

What this means:

- On a web page that loads **TASA Explorer from Google Fonts**, every o͘ and every 8th tone falls back to another font, even though the full TASA font from GitHub has them. 狗公會曉學台語 lists TASA Explorer/Orbiter under 線頂 Google 字體 白話字台文, so that entry is affected.
- For Iansui and Huninn, `o` is in both the Taigi slice and the `latin` slice. Whether `o` + U+0358 stays in one font file depends on the browser's per-cluster fallback. Check it in Chrome, Safari and Firefox.
- Google Docs/Slides may deliver fonts differently. That wasn't tested.
- Self-host the full font, or use the Google Fonts `&text=` parameter, when POJ must render reliably.
- The same risk applies to any subsetter (`pyftsubset`, build plugins). Keep U+0358, U+030D, U+030B, U+030C, U+207F, U+1D3A, U+0131, ḿ ǹ, the `ccmp`/`mark`/`mkmk` features and, for IVS fonts, the cmap format 14 table.

---

## 4. Recipe for adding POJ to a font (what this project's forks should do)

### 4.1 Glyphs and cmap

| Glyph (production name) | Code point | Build from |
|---|---|---|
| `uni0358` dot above right | U+0358 | the dot of U+0307. GDEF mark, zero advance (or a deliberate SIL-style spacing base). |
| `uni030D` vertical line above | U+030D | a short vertical stroke in the same height band as U+0301 |
| `uni030B` double acute | U+030B | usually present already |
| `uni030C` caron | U+030C | usually present already (Tâi-lô 6th tone) |
| `uni207F` ⁿ | U+207F | superior `n` (55–65 %, weight-compensated). Reuse `n.sups` if the font has `sups`. |
| `uni1D3A` ᴺ | U+1D3A | superior `N`, for all-caps nasal |
| `dotlessi`, `uni0237` (dotless j) | U+0131, U+0237 | for the Soft_Dotted swap |
| `.case` marks | — | for capitals, triggered from `ccmp` |
| precomposed letters | ḿ Ḿ ǹ Ǹ ń Ń ň Ň ŏ Ŏ ĭ Ĭ ă Ă ĕ Ĕ ŭ Ŭ ā ē ī ō ū (and caps) ő ű ǎ ě ǐ ǒ ǔ | composites, so engines that don't decompose never need fallback |

### 4.2 Anchors

- `top` on every base that can take a tone: `a e ı o u m n` (and `j`/`uni0237`), capitals, and any `ccmp` ligature that can still receive a mark (e.g. `o_uni0358`).
- `topright` on `o O` **and** on the precomposed toned vowels `ó ò ô ǒ ō ŏ ő` and their capitals.
  - Check wide accents (`ō ô ŏ ő`) and bold weights. The dot may need to move right or down, or the ligature glyph may need a narrowed accent, as Vietnamese fonts do with ố/ớ.
  - U+0358 attaches to the **base** through `mark`, not on top of the tone mark through `mkmk`.
- Marks: `_top` on tone marks, `_topright` on U+0358, and `top` on tone marks for `mkmk` stacking.
- The tone in `ng` goes on `n`, so `g` needs nothing.
- Variable fonts: anchors must be set in every master. Check interpolation at the extremes.

### 4.3 Feature code sketch (AFDKO / feaLib syntax)

Coordinates are placeholders: every glyph needs its own anchor position.

```fea
languagesystem DFLT dflt;
languagesystem latn dflt;
# keep any existing languagesystem lines (latn TRK, hani, ...) and register the lookups under all of them

@TopMarks   = [uni0300 uni0301 uni0302 uni0303 uni0304 uni0306 uni0307 uni0308 uni030A uni030B uni030C uni030D];
@AllMarks   = [@TopMarks uni0358 uni0323];

markClass [uni0300 uni0301 uni0302 uni0304 uni0306 uni030B uni030C uni030D] <anchor 0 500> @MC_top;
markClass uni0358 <anchor 0 450> @MC_topright;

table GDEF {
    GlyphClassDef
        [a e i o u m n dotlessi uni0237 oacute ograve ocircumflex omacron obreve ohungarumlaut ocaron
         o_uni0358 oacute_uni0358 o_uni030D_uni0358],   # bases (ligature outputs are BASES, not class 2)
        ,                                               # ligatures
        [@AllMarks],                                    # marks
        ;
} GDEF;

# 1. Soft-dotted i/j: drop the dot before any ccc-230 mark, skipping other marks in between
lookup DotlessI {
    lookupflag UseMarkFilteringSet @TopMarks;
    sub i' @TopMarks by dotlessi;
    sub j' @TopMarks by uni0237;
} DotlessI;

# 2. Precomposed POJ glyphs: longest sequences first; canonical order, NFC spelling, and reverse order
#    (DotlessI runs first, so any i-ligatures must start from dotlessi.)
lookup POJLigatures {
    sub o uni0301 uni0358 by oacute_uni0358;      # NFD, canonical
    sub o uni0358 uni0301 by oacute_uni0358;      # non-canonical (engines that don't reorder)
    sub o uni030D uni0358 by o_uni030D_uni0358;
    sub o uni0358 uni030D by o_uni030D_uni0358;
    sub oacute uni0358 by oacute_uni0358;         # NFC
    sub o uni0358 by o_uni0358;                   # 2-glyph prefix comes LAST
    # ... repeat for ò ô ǒ ō ŏ ő and capitals
} POJLigatures;

feature ccmp {
    lookup DotlessI;
    lookup POJLigatures;
    # contextual capital marks, because `case` is off by default:
    # sub [A-Z ...] [@TopMarks]' by [@TopMarks.case];
} ccmp;

lookup MarkTop {
    pos base [a e dotlessi u m n uni0237 o_uni0358] <anchor 250 500> mark @MC_top;   # one statement per base in real fonts
    pos base o <anchor 280 500> mark @MC_top;
} MarkTop;

lookup MarkTopRight {
    pos base [o oacute ograve ocircumflex ocaron omacron obreve ohungarumlaut] <anchor 470 420> mark @MC_topright;
    # ... capitals
} MarkTopRight;

feature mark { lookup MarkTop; lookup MarkTopRight; } mark;
feature mkmk { pos mark [uni0300 uni0301 uni0302 uni0304 uni0306 uni030B uni030C uni030D] <anchor 0 700> mark @MC_top; } mkmk;
```

Rules from the survey and the review:

1. Put POJ composition in **`ccmp`**, never in `liga`/`clig`.
2. Write ligatures **longest first** (feaLib and makeotf sort them, but other tools may not). Cover the canonical order, the non-canonical order and the NFC spelling.
3. Keep **anchors even when ligatures exist**, so anything uncovered still works.
4. Always ship a GPOS `mark` feature. Don't rely on shaper fallback, which is HarfBuzz-only and is switched off by any `mark` feature.
5. Add the dotless-i/j swap, using a mark filtering set.
6. Give ligature outputs GDEF class **base**, and add them to the `o` kerning classes.
7. Use AGL-style production names (`uni0358`, `uni030D`, `o_uni0358`) so PDF `ToUnicode` reconstruction works. Names like `oopoj_acutecomb` copy out as garbage in tools that rely on glyph names. `dotlessi + uni030D` may copy out of PDFs as `ı̍`; producers should write `/ActualText`.
8. Don't put POJ rules in `locl`. Make sure new rules don't break existing `locl` TRK/AZE/LTH dotted-i logic.

### 4.4 Other engineering checks

- **Vertical metrics:** `O̍͘`, `Ő`, `M̍`, `Ó͘` are taller than Western accents. Raise `OS/2.usWinAscent` / `hhea.ascender` or they clip on Windows and in tight CSS line boxes.
- **Collision after o͘:** a zero-width dot can hit `h k l t ⁿ " ’`. Add right sidebearing to the ligature glyphs, or contextual kerning.
- **Small caps:** `smcp`/`c2sc` need `.sc` versions of the ligatures, or lookups ordered so that small caps still work.
- **CFF vs TrueType:** TrueType `glyf` composites make technique B cheap. CFF/CFF2 have no components, so every ligature duplicates its outline in every master. Hint the thin U+030D stroke carefully.
- **Variable fonts:** precomposed ligatures multiply the per-master drawing work. That favours anchors (technique A) plus composites.

### 4.5 Testing

```sh
python3 -m venv venv && venv/bin/pip install fonttools uharfbuzz pillow
venv/bin/python -I tools/poj_font_audit.py Font.ttf > audit.json     # cmap, features, anchors, IVS, PUA
venv/bin/python -I tools/poj_shape_test.py Font.ttf > shape.json     # mechanism per cluster, NFC vs NFD
venv/bin/python -I tools/poj_specimen.py out_dir Font.ttf            # PNG specimen, NFC + NFD rows
```

Then check by eye:

- **Chrome/Firefox** (HarfBuzz), **Safari/Pages** (CoreText) and **Word** (DirectWrite).
- A browser page with `letter-spacing: 0.1em`, to catch fonts that depend on `liga`.
- The font as served by Google Fonts, if it is meant to be used from there.

fontbakery `--profile googlefonts` checks mark features in general, but it doesn't know the POJ clusters yet (see the README's "Upstream efforts").

---

## 5. Open questions

- **CoreText and DirectWrite:** how they handle the mark order, NFD recomposition and unanchored U+0358 (§2.3) needs a real test on macOS and Windows.
- **Google Fonts and Iansui/Huninn:** whether a cluster can split across `unicode-range` slices in each browser.
- **Fonts not tested yet:** Caivun, Kaukhia and Indeciso need downloading and testing.
- **Legacy encodings in the wild:** how common the substitutes in §2.5 are would need a corpus scan, for example of ChhoeTaigi data or old web pages.

---

## 6. Model review (agy)

Both models received this report's first draft as plain text and were not given tools. Command:

```
agy -p "<review prompt + report>" --model <model> --print-timeout 1500s
```

Models: `gemini-4-neon-xhigh` and `gemini-4-hydrogen-xhigh`. agy lists no single flagship, and these are the two Gemini 4 tiers with an XHigh level. A first attempt that asked them to read the file failed: headless agy auto-denies file-access tools.

Both reviews confirmed:

- the combining-class values and canonical reordering;
- the precomposed table;
- the NFKC loss of ⁿ;
- the Soft_Dotted requirement;
- HarfBuzz reordering marks before GSUB;
- CSS disabling `liga` under `letter-spacing`.

Corrections taken, with how each was checked:

| Correction | How checked |
|---|---|
| HarfBuzz fallback is all or nothing (off when any `mark` feature exists). This explains Arial's U+0358 and Source Sans `ŏ͘`. | Verified: offsets (0,0) in those fonts |
| Lesson One, Huninn, Iansui and WD-XL also have `mark`/`mkmk` (B + A, not B only). Only GenYo, Tauhu and the taigivs fonts lack `mark`. | Verified from the GPOS feature lists |
| SIL's spacing U+0358 is a GDEF base, not a mark | Verified: GDEF class 1 |
| U+1D3A is ᴺ (capital modifier N), not a legacy form of ⁿ | Verified against UnicodeData |
| NFC of `o̍͘` keeps `o + 030D + 0358` | Verified |
| HarfBuzz also composes `o + 0301` → `ó` before GSUB | Verified: same glyph runs |
| Tâi-lô 6th-tone caron U+030C | Verified precomposed set |
| Web-font subsetting can split or drop marks | **Verified, and worse than the reviewers expected**: TASA and Source Sans on Google Fonts drop the marks entirely (§3.2) |
| Feature sketch fixes: longest-first ligatures, separate mark lookups, `languagesystem`, GDEF, mark filtering set, `uni0237`, `o_uni0358` and `ő ǒ` bases, top-level `markClass`, `mkmk` | Applied |
| Missing topics: hyphens and `--`, vertical metrics, `case` off by default, collision after o͘, small caps, CFF vs TrueType, variable fonts, PDF names, `locl` interaction, more legacy substitutes | Added. Not independently tested. |

Taken as **unverified** (marked as reviewer claims in the text):

- CoreText/DirectWrite composition, reordering and font fallback;
- Word's ligature default;
- the extra legacy PUA, 8-bit and look-alike encodings.

Rejected or softened:

- "A 2-glyph ligature listed first permanently shadows a 3-glyph one." feaLib and makeotf sort ligatures longest-first within a lookup, so it is only a risk with other tools. Rule 2 still says to write them longest first.
- The NunitoPOJ dotless-i worry: with `liga` off it still produces `dotlessi + uni030D` through `ccmp` (verified).
