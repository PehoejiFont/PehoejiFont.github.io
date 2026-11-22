Below is a technical review of the report from a Unicode and OpenType font-engineering perspective.

---

### 1. Unicode Facts

* **Canonical Combining Classes (`U+0358 = 232`, `U+030D = 230`, other tone marks `= 230`)** — **VERDICT: correct**
  * Confirmed against Unicode `UnicodeData.txt` and UAX #44 §5.7.4 (`Canonical_Combining_Class` values): `U+0300`, `U+0301`, `U+0302`, `U+0304`, `U+0306`, `U+030B`, `U+030D` (and `U+030C` caron) are all `230` (`Above`); `U+0358` COMBINING DOT ABOVE RIGHT is `232` (`Above_Right`).

* **Canonical reordering (§2.2)** — **VERDICT: correct**
  * Per Unicode Standard §3.11 (D109 Canonical Ordering Algorithm) and UAX #15, adjacent non-zero ccc marks are stably sorted in ascending ccc order. Thus `<U+006F, U+0358, U+0301>` reorders to `<U+006F, U+0301, U+0358>` and composes in NFC to `<U+00F3, U+0358>`. Marks sharing ccc `230` keep their relative order, and `o̍͘` canonically orders as `<U+006F, U+030D, U+0358>`.

* **Precomposed table in §2.1** — **VERDICT: correct (for listed marks), incomplete (for dialectal/practical scope)**
  * Every ✓ / – cell for `a e i o u m n` and their capitals is accurate through Unicode 17.0 (`ḿ/Ḿ` = `U+1E3F/1E3E`; `ń/Ń` = `U+0144/0143`; `ǹ/Ǹ` = `U+01F9/01F8`; `ő/Ő` = `U+0151/0150`; `ű/Ű` = `U+0171/0170`; no precomposed character has a canonical decomposition containing `U+030D` or `U+0358`).
  * **Gaps:**
    1. **6th tone (陽上, Quanzhou/Lukang)** uses **caron `U+030C`** in extended Tâi-lô / dialectal POJ (`ǎ ě ǐ ǒ ǔ ň` and capitals *are* precomposed; `m̌` is not; `ǒ͘` = `U+01D2 + U+0358`).
    2. **Practical `cmap` trap:** `ḿ/Ḿ` (Latin Extended Additional) and `ǹ/Ǹ` (Latin Extended-B) sit outside Latin-1 / Latin Extended-A and are frequently absent from Latin fonts (see §2 below on font fallback).
    3. Minor table inconsistency: `͘ (o͘)` is `–` for `a e i u` but `n/a` for `m n`.

* **"No letter with U+030D or U+0358 is precomposed, and none ever will be: Unicode's stability policy closed the door to new precomposed letters in 2001"** — **VERDICT: incomplete (conflates two policies; conclusion is right)**
  * The practical conclusion is right—UTC explicitly rejected precomposed POJ letters and encoded `U+0358` instead in Unicode 4.1 (2005, L2/03-317 / N2628).
  * However, the **Normalization Stability Policy** (effective from Unicode 3.1, 2001) does *not* itself ban encoding precomposed characters; it guarantees that the NFC/NFD of existing character sequences will never change (so any newly encoded precomposed character could never become the NFC primary composite of `o + U+0358`—it would have to be excluded from composition or lack a canonical decomposition).
  * The actual refusal to encode new precomposed Latin+diacritic letters is a **UTC/WG2 encoding policy** (Unicode Standard §2.12 "Equivalent Sequences", Unicode FAQ "Characters and Combining Marks", ISO/IEC 10646 Principles and Procedures), not a formal Stability Policy rule. (Unicode has occasionally encoded non-decomposing precomposed-looking characters in other scripts after 2001.)

* **NFKC and case of `ⁿ` (`U+207F`) (§1, §2.4)** — **VERDICT: partially wrong (contradicts itself on `U+1D3A`)**
  * **Correct:** `U+207F` has General Category `Lm` (`Modifier_Letter`), compatibility decomposition `<super> 006E`, so NFKC/NFKD map `hiⁿ` → `hin` (`UnicodeData.txt`, UAX #15). It has no uppercase mapping (`Changes_When_Uppercased=No`), so `"sⁿ".upper()` is indeed `"Sⁿ"` (Unicode §3.13).
  * **Wrong / self-contradictory:** §2.4 states *"there is no capital ⁿ"* and then in the next bullet writes *"Some old text uses `ⁿ` = U+1D3A"*. **`U+1D3A` is `ᴺ` (`MODIFIER LETTER CAPITAL N`, `<super> 004E`, Phonetic Extensions)**—it *is* a superscript capital N, used in all-caps POJ (`Sᴺ`, `HIᴺ`), not a legacy encoding for lowercase `ⁿ`. Even though Unicode does not case-map `U+207F` → `U+1D3A`, POJ fonts should include `U+1D3A`.

* **`Soft_Dotted` handling of `i` (§1, §2.3, §4.3)** — **VERDICT: correct in principle, incomplete in details**
  * **Correct:** `i` and `j` have the `Soft_Dotted` property (`PropList.txt`; Unicode Standard §7.1 "Diacritics on i and j"), and shaping engines do **not** automatically substitute `dotlessi` for uncomposed sequences like `i + U+030D`; the font must do it in `ccmp`.
  * **Incomplete:**
    1. Unicode §7.1 requires suppressing the dot before an `Above` (`ccc=230`) mark **even when non-above marks intervene** (e.g., `i + U+0323 + U+030D`). The report's `sub i' @TopMarks by dotlessi;` fails whenever a below mark intervenes (needs `UseMarkFilteringSet`).
    2. `U+0358` is `ccc=232` (`Above_Right`), not `230` (`Above`); including `uni0358` in `@TopMarks` strips the dot from `i + U+0358` unnecessarily, while omitting other standard `ccc=230` marks (`U+030C`, `U+0303`, `U+0307`, `U+0308`, `U+030A`).
    3. NFD `i + U+0301` etc. also depends on `DotlessI` whenever a precomposed glyph (`ĭ`, `ī`) is missing from `cmap` or the engine doesn't recompose NFD.

---

### 2. Shaping-Engine Behaviour

* **Does HarfBuzz reorder marks before GSUB? (§2.2, §2.3)** — **VERDICT: correct for HarfBuzz, wrong if generalized to CoreText/DirectWrite**
  * In HarfBuzz (`hb-ot-shape-normalize.cc`), the default Latin shaper runs `_hb_ot_shape_normalize` in `HB_OT_SHAPE_NORMALIZATION_MODE_AUTO` (`COMPOSED_DIACRITICS`) **before** GSUB, sorting non-zero combining marks by (modified) `ccc`. Thus `o + 0358 + 0301` is reordered to `o + 0301 + 0358` before GSUB, so a non-canonical ligature `sub o uni0358 acutecomb` never matches in HarfBuzz.
  * **Important missed consequence:** Because HarfBuzz *also* runs canonical composition before GSUB when the composite is in `cmap`, `o + 0301 + 0358` becomes `oacute + uni0358` before GSUB too—meaning **`sub o acutecomb uni0358` also never matches in HarfBuzz** whenever `oacute` is in `cmap` (unlike `o + 030D + 0358`, which has no precomposed code point and reaches GSUB as three glyphs).
  * **CoreText / DirectWrite:** §2.3 frames steps 1–2 as what *"A shaping engine (HarfBuzz, CoreText, DirectWrite/Uniscribe)"* does. That is **wrong**: DirectWrite does **not** canonically reorder arbitrary Latin combining marks before GSUB (nor does CoreText consistently match HarfBuzz's pipeline across all OpenType paths). That is actually *why* §4.3's advice to cover both orders and NFC+NFD matters.

* **HarfBuzz compose/decompose via `cmap` (§2.3 step 2)** — **VERDICT: correct for HarfBuzz (with nuance), wrong for CoreText/DirectWrite**
  * **HarfBuzz:** In `COMPOSED_DIACRITICS` mode (`hb-ot-shape-normalize.cc`), HarfBuzz composes NFD `base + mark` if the canonical composite is in `cmap`, and recursively canonically decomposes a precomposed code point if it is missing from `cmap`. (Minor nuance: `COMPOSED_DIACRITICS` short-circuits and will *not* decompose an already-composed `cmap` glyph even if followed by a lower-ccc mark, e.g., `ó + U+0323`.)
  * **CoreText & DirectWrite (CRITICAL ERROR in §2.3):** Neither DirectWrite nor CoreText decomposes missing precomposed `cmap` characters into `base + mark`; instead, they trigger **system font fallback**, rendering missing glyphs like `ḿ`, `ǹ`, or `ŏ` in a completely different font! Likewise, DirectWrite does not recompose NFD `o + U+0301` to `oacute` via `cmap`.

* **Fallback mark positioning: HarfBuzz vs CoreText vs DirectWrite (§2.3 step 6)** — **VERDICT: correct, but incomplete (misses a critical HarfBuzz footgun)**
  * HarfBuzz (`hb-ot-shape-fallback.cc`, `_hb_ot_shape_fallback_mark_position`) positions marks using `ccc` and glyph bounding-box extents when a font lacks GPOS `mark`—which directly explains why `U+0358` (`ccc=232`) jumps above the top of `Ó`/`Ō`'s entire bounding box in fallback. CoreText and DirectWrite do **not** run HarfBuzz-style ccc/bbox fallback; unanchored marks render at raw metric/overstrike offsets.
  * **Critical omission #1 (all-or-nothing switch):** HarfBuzz only runs fallback mark positioning when `!plan->has_gpos_mark` (i.e., the font has **no** enabled GPOS `mark` lookups for that script/language). As soon as a font contains *any* GPOS `mark` feature, HarfBuzz disables fallback completely—leaving unanchored combinations (e.g., `ŏ͘` in Source Sans 3, `U+0358` in Arial, or unanchored bases in I.Ming) at raw glyph origin with zero fallback rescue.
  * **Critical omission #2 (AAT on macOS):** Apple system fonts (Geneva, Helvetica, Menlo) are macOS system fonts that may rely on AAT tables (`morx`/`kerx`/`ankr`) in CoreText rather than OpenType `GPOS`; testing them only via `uharfbuzz` does not show how CoreText renders them.

* **Browsers disabling `liga` when `letter-spacing ≠ 0` (§2.3 step 4)** — **VERDICT: correct, but incomplete**
  * Per **CSS Text Module Level 3 §8.2**, user agents must/should disable optional ligatures (`liga`, `clig`) whenever effective spacing between characters is non-zero (`letter-spacing ≠ 0` or justification), while keeping required features (`ccmp`, `rlig`).
  * **Incomplete:**
    1. **Firefox (Gecko)** also disables `liga`/`clig` on non-zero `letter-spacing`, not just Chrome/Safari.
    2. **Microsoft Word disables `liga` by default** for Latin text (and many terminals/code editors do too), which is an even larger real-world failure mode than CSS `letter-spacing`.
    3. The warning applies equally to `clig`, not just `liga`.

---

### 3. Missed POJ/Tâi-lô Encodings, Typography & Font-Engineering Topics

1. **Web-font subsetting & `unicode-range` splitting (CRITICAL for Google Fonts / web deployment):**
   * Static subsetters (`pyftsubset`, build plugins) routinely strip `U+0358`, `U+030D`, `U+030B`, `U+207F`, `U+1D3A`, `U+0131`, `U+1E3E–1E3F` (`Ḿ/ḿ`), and `U+01F8–01F9` (`Ǹ/ǹ`), or prune `ccmp`/`mark`.
   * **Google Fonts `unicode-range` trap:** OpenType GSUB (`ccmp`) and GPOS (`mark`) **cannot operate across separate `@font-face` WOFF2 subset files**. If a font (especially a CJK Han-Lo font on Google Fonts like Huninn or Iansui) places `o`/`ó` in one `unicode-range` slice and `U+0358`/`U+030D` in another, the browser shapes them in separate font runs and silently breaks `ccmp`, `DotlessI`, and `mark`! Mentioning "Also on Google Fonts" without checking whether `o`/`a`..`n` and `U+0358`/`U+030D` share a subset is risky.
2. **Spacing / collision after `o͘` (`o͘ⁿ`, `o͘h`, `o͘k`, `o͘”`) and `GDEF` mark-width zeroing:**
   * A zero-width `uni0358` placed at the top-right of `o` collides with tall following glyphs (`h`, `k`, `l`, `t`, `”`, `’`) and especially superscript **`ⁿ`** (`o͘ⁿ`, `ó͘ⁿ`). Technique B solves this by giving `o_uni0358` a wider right sidebearing; Technique A needs contextual GPOS spacing/kerning (`kern`/`dist`).
   * **Crucial caveat on Technique C (SIL spacing dot):** Under OpenType/HarfBuzz (`HB_OT_SHAPE_ZERO_WIDTH_MARKS_BY_GDEF_LATE`) and DirectWrite, any glyph classified as `Mark` (class 3) in `GDEF` has its advance width **zeroed**. A spacing `U+0358` cannot simply be a `markClass` glyph with non-zero advance width—it must either be a `GDEF` Base positioned via contextual GPOS (`kern`/`dist`) or paired with a GPOS rule that widens the *base* glyph's advance.
3. **Hyphen `-` and neutral-tone double hyphen `--`:**
   * POJ/Tâi-lô uses `-` (`U+002D`) between syllables, **`--`** for the neutral tone (`lâi--khì`, `khòaⁿ--tio̍h`), and occasionally non-breaking hyphen `‑` (`U+2011`, often missing from fonts) or `U+2E40`.
   * Fonts must ensure `--` does **not** touch/merge into a single dash (and has no `--` → en-dash `calt`/`liga` ligature); documentation should also warn against smart-punctuation auto-converting `--` to `–` (`U+2013`).
4. **Additional legacy/substitute encodings & Tâi-lô/POJ marks:**
   * **6th tone (caron `U+030C`):** `ǎ ě ǐ ǒ ǔ m̌ ň ǒ͘` (also frequently mistyped in place of breve `U+0306` for 9th tone).
   * **Vietnamese o-horn `ơ`/`Ơ` (`U+01A1/01A0`) and `ớ/ờ/ở/ỡ/ợ`** are very common legacy substitutes for `o͘` in older digital POJ corpora.
   * **8th-tone substitutes:** `U+0307` (combining dot above, e.g., `ȯ`) and `U+02C8` appear in older POJ text/IMEs.
   * **Other PUA schemes:** Beyond aiongg's `U+E400–E435`, older POJ/Bible/dictionary fonts used incompatible PUA ranges (e.g., SIL's legacy PUA, early Taiwanese POJ PUA/remapped Latin-1 hack fonts).
   * **Real-world IMEs:** PhahTaigi, FHL (信望愛), MOE Tâi-lô IME, RIME schemas, Lohankha, Keyman—importantly, dead-key/sequential POJ IMEs are *why* non-canonical order (`o + 0358 + tone`) occurs in the wild (users type `o͘` as a vowel unit, then the tone key).
5. **Uppercase / All-Caps (`case`, `smcp`, vertical metrics clipping):**
   * `case` is **off by default** in browsers and Word; capital-form `.case` marks must be triggered contextually in **`ccmp`** for normal Title Case (`Ô͘-chhiû`, `O̍͘`, `I̍`), not only in `case`.
   * `Sⁿ` vs `Iⁿ-á`: blindly swapping `ⁿ` → `ᴺ` after any uppercase letter breaks Title Case `Iⁿ-á`; uppercase nasal should use `U+1D3A` (`ᴺ`) or explicit `case`/all-caps context.
   * **`smcp`/`c2sc`:** Precomposed `ccmp` ligatures like `o_uni0358` will stay lowercase in small caps unless `.sc` ligatures exist or `smcp` coordinates with `ccmp`.
   * **Vertical metrics (`OS/2.usWinAscent`, `hhea.ascender`):** Capital 8th-tone (`O̍͘`, `I̍`, `M̍`) and double-acute (`Ő`, `Ő`) sit much higher than standard Western accents and get **clipped** in Windows GDI/DirectWrite and tight CSS boxes if ascenders are not raised when forking English/CJK fonts.
6. **Vietnamese-style diacritic collision avoidance & `locl`:**
   * On `ó͘`, `ô͘`, `ō͘`, `ő͘`, wide or right-leaning tone marks collide with `U+0358` unless shifted slightly left (as in Vietnamese `ố`/`ớ`) via contextual GPOS or custom `ccmp` glyphs. Also clarify that `U+0358` attaches to the **base** via `mark`, *not* stacked above the tone mark via `mkmk`.
   * **`locl`:** Core POJ rules must **not** be gated behind `locl` (POJ text appears under `DFLT`, `latn`, `zh-TW`/`ZHT`, `nan-Latn`, or `en`). Conversely, when forking a multi-language Latin font, new `ccmp` rules must not break existing `TRK`/`LTH` `locl` dotted-`i` logic, and must register under all existing `latn` language systems.
7. **Variable fonts:**
   * Anchors must interpolate via `GDEF` `ItemVariationStore` across weight/width/opsz axes or marks will drift/collide at extreme masters. Precomposed `ccmp` ligatures multiply master-drawing workload, shifting variable fonts strongly toward Technique A (GPOS anchors) or composite masters.
8. **CFF/CFF2 (`.otf`) vs TrueType (`.ttf`):**
   * TrueType `glyf` supports composite glyphs (cheap Technique B ligatures), whereas OpenType CFF/CFF2 has no general components (every precomposed ligature duplicates outline data, only partially offset by subroutinization). Also, `uni030D` (thin vertical stem) and `uni0358` (small dot) are sensitive to TrueType/CFF hinting at small ppem.
9. **PDF text extraction & AGLFN glyph naming:**
   * Name-based PDF `/ToUnicode` reconstruction follows **AGLFN**: `o_uni0358` / `oacute_uni0358` / `o_uni030D_uni0358` decode cleanly, whereas non-AGLFN names like `oopoj_acutecomb` (§3) break copy-paste in PDF tools that don't emit `/ActualText`.
   * Even with AGLFN names, `i + U+030D` → `dotlessi + uni030D` frequently extracts from PDFs as **`ı̍` (`U+0131 + U+030D`)** instead of `i̍` (`U+0069 + U+030D`) unless the PDF producer writes `/ActualText`.
10. **Kerning (`kern`) & `GDEF`:**
    * Precomposed Technique B ligatures (`o_uni0358`, `oacute_uni0358`) lose `o`'s kerning unless added to `o`'s left kerning class (and a dot-aware right kerning class). Technique A requires `lookupflag IgnoreMarks;` in `kern`.
    * `§4.1` omits checking/adding `cmap` entries for `ḿ/Ḿ`, `ǹ/Ǹ`, `ŏ/Ŏ`, `ĭ/Ĭ`, `ă/Ă`, `ĕ/Ĕ`, `ŭ/Ŭ`, `ā/ē/ī/ō/ū`, `ő/ű`, `U+1D3A`—essential to avoid font fallback on DirectWrite/CoreText.

---

### 4. Errors & Risky Advice in the §4.3 Feature-File Sketch

* **VERDICT: wrong (multiple OpenType/AFDKO logic and spec bugs)**

1. **Shadowed non-canonical ligatures (CRITICAL logic bug):**
   * `sub o uni0358 by o_uni0358;` is placed **first**, while the comment says to add `sub o uni0358 acutecomb by oacute_uni0358;` below.
   * Per OpenType GSUB LookupType 4 and AFDKO Feature File Spec §5.d, ligature matching is **first-match in written order** (not auto-sorted by length). A 2-glyph prefix `sub o uni0358` placed before a 3-glyph `sub o uni0358 acutecomb` **permanently shadows** the 3-glyph rule! Longer sequences must always come before shorter prefixes (same if `sub o uni030D by o_uni030D;` is added before `sub o uni030D uni0358`).
2. **Duplicate base glyph `o` in two `pos base` statements in one lookup (AFDKO spec §6.d error):**
   * Both `pos base [a e o u m n dotlessi] ... mark @MC_top;` and `pos base [o oacute ...] ... mark @MC_topright;` appear inside one implicit `feature mark` lookup.
   * Per AFDKO Spec §6.d, each base glyph may appear in only **one** `pos base` statement per lookup (AFDKO `makeotf` rejects duplicate base `o`; even where `fontTools.feaLib` merges them, mixing disjoint base sets bloats the subtable with NULL anchors). Either combine both anchors in a single `pos base o <anchor ...> mark @MC_top <anchor ...> mark @MC_topright;` or—much cleaner—put `@MC_top` and `@MC_topright` in **two separate named `lookup` blocks**.
   * Also, `markClass` is global in scope (AFDKO Spec §4.c) and should be declared at top level outside `feature mark` (especially if reused in `mkmk`).
3. **Single hardcoded anchor for proportional glyph classes (misleading anti-pattern):**
   * `pos base [a e o u m n dotlessi] <anchor 250 500>` puts the exact same x-coordinate on narrow `dotlessi` and wide `m`, and `markClass [gravecomb ... uni030D] <anchor 0 500>` assumes every mark is drawn centered on `x = 0` at `y = 500`. In any proportional font, each base and mark glyph requires its own coordinates.
4. **Missing anchors on `o_uni0358`, `ohungarumlaut` (`ő`), `ocaron` (`ǒ`), and `dotlessj` (logic bugs):**
   * If `o + uni0358` ligates to `o_uni0358` before an uncovered tone mark (e.g., non-canonical `o + 0358 + 030B`), `o_uni0358` has **no `@MC_top` anchor** in `feature mark`.
   * `ohungarumlaut` (`ő`) is required by §4.2 but missing from `pos base ... @MC_topright` in §4.3.
   * `DotlessI` outputs `dotlessj`, yet `dotlessj` is missing from `pos base ... @MC_top`.
5. **`DotlessI` before `POJLigatures` breaks `i̍` ligatures (ordering trap):**
   * `feature ccmp { lookup DotlessI; lookup POJLigatures; } ccmp;` turns `i + uni030D` into `dotlessi + uni030D` *before* `POJLigatures` runs. Any `sub i uni030D by ...;` added to `POJLigatures` (as recommended in §3) will silently never match unless written against `dotlessi` or ordered before `DotlessI`.
6. **`DotlessI` fails with intervening non-top marks & mis-scoped `@TopMarks`:**
   * Needs `lookupflag UseMarkFilteringSet @TopMarks;` (with `GDEF` marks defined) to satisfy Unicode §7.1 when a below mark intervenes.
   * `@TopMarks` should include all `ccc=230` above marks in the font (e.g., `uni030C`, `uni0303`, `uni0307`, `uni0308`, `uni030A`) and arguably omit `uni0358` (`ccc=232`).
7. **Missing `GDEF` table (breaks `pos base` on ligatures and `UseMarkFilteringSet`):**
   * Without an explicit `table GDEF { GlyphClassDef ...; } GDEF;`, compilers auto-classify `POJLigatures` outputs (`o_uni0358`, etc.) as **Ligature (class 2)** instead of **Base (class 1)**, so `pos base` will not attach to them (and marks must be explicitly class 3).
8. **Missing `languagesystem` declarations (breaks Latin shaping in forks):**
   * Omitting `languagesystem DFLT dflt; languagesystem latn dflt;` defaults to `DFLT` only in `makeotf`; when forking a Latin font that already has `latn` (and `TRK`/`NLD`/`VIT` etc.), lookups registered only under `DFLT` will **never execute** for `latn` text.
9. **Mixed glyph-naming conventions:**
   * Mixes Glyphs.app "nice names" (`circumflexcomb`, `macroncomb`, `brevecomb`, `dotlessj`, plus `dotaccentcomb`/`hungarumlautcomb` in §4.1) with AGLFN production names (`uni030B`, `uni030D`, `uni0358`, `gravecomb`, `acutecomb`, `dotlessi`). In production TTF/OTF forks, `circumflexcomb`/`macroncomb`/`brevecomb`/`dotlessj` usually don't exist (`uni0302`, `uni0304`, `uni0306`, `uni0237` do).
10. **Omitted `mkmk` and `.case` mark rules:**
    * §4.1–§4.2 specify `mkmk` stacking and `.case` capital marks, neither of which appears in §4.3 (and any `.case` mark substituted in `ccmp` must also be added to `markClass` in `feature mark`, or it loses its anchor).

---

### 5. Inconsistencies in the Survey Table (and Cross-Section Contradictions)

1. **Arial contradicts itself between the Techniques table and Survey table — VERDICT: wrong / inconsistent**
   * Techniques table classifies `Arial (030D)` under **A** (GPOS `mark`) and `Arial (U+0358)` under **D**.
   * Survey table lumps `Arial / Helvetica / Geneva / Menlo` into one row as **Technique `D`**, `Dotless i̍: mixed`, and says *"depend on the engine's fallback."*
   * In fact, §4.3 Rule 6 lists `Helvetica, Geneva, Menlo` (not Arial!) as failing dotless `i̍`, and because Arial *has* GPOS `mark`, HarfBuzz does **not** run engine fallback on Arial's `U+0358`—it uses raw overstrike. Arial should be its own row (`A (030D) + D (0358)`, `Dotless i̍: ✓` if confirmed).
2. **Source Sans 3 marked `"Clean."` and top pick despite broken `ŏ͘` — VERDICT: inconsistent**
   * Notes say *"Anchors on o and all toned o except `ŏ`. Clean."* Because Source Sans 3 has GPOS `mark`, HarfBuzz will **not** rescue `ŏ + U+0358` with fallback—so 9th-tone `ŏ͘` (and check `Ŏ͘`!) is broken, contradicting `"Clean."` and an unqualified top recommendation.
3. **Technique-`B`-only fonts vs "No `mark` feature" and "Best-practice" — VERDICT: incomplete / inconsistent**
   * Six fonts (`Lesson One`, `jf open 粉圓 2.1`, `芫荽 Iansui`, `Tāu-hū`, `WD-XL Lubrifont TC`, `源樣明體`) are all listed as **`B`** (not `B + A`), yet only `Tāu-hū` gets the warning *"No `mark` feature at all, so uncovered combinations fall back."*
   * Meanwhile, `Lesson One` is praised as *"Best-practice ccmp design"* and recommended, and `Tāu-hū` is recommended for Han-Lo, even though §3 ("What good POJ fonts combine: A + B") and §4.3 Rules 4–5 explicitly forbid relying on fallback or shipping without GPOS `mark`. Clarify which `B` fonts actually lack `GPOS mark` and how uncovered clusters (e.g., Tâi-lô 9th tone `a̋`/`e̋`/`i̋`/`m̋`/`n̋` or 6th tone) behave in them.
4. **`NunitoPOJ` `Dotless i̍: ✓ (ligature)` — VERDICT: incomplete / inconsistent**
   * §2.2 claims NunitoPOJ's `liga` ligatures *"only look fine because GPOS anchors cover the same cases"*, but GPOS anchors **cannot** replace a dotless-`i` swap! Clarify whether NunitoPOJ's `i̍` ligature is in `liga` (fragile—breaks in Word / `letter-spacing ≠ 0`) or `ccmp`.
5. **`Charis / Doulos / Gentium` — VERDICT: inconsistent across tables**
   * Listed as `C` only in the Techniques table, but `A + C` in the Survey table. Also note their `Reserved Font Names` affect fork naming (relevant to §4's goal).
6. **`EB Garamond` Technique `—` — VERDICT: inconsistent**
   * Listed as `Technique: —`, yet the coverage legend and notes confirm it has `U+030D` ("drawn as a misplaced tick") and fails dotless `i̍` (`✗`). It lacks `U+0358`, not `U+030D`.
7. **Inconsistent `"Also on Google Fonts"` annotations — VERDICT: incomplete**
   * Noted for TASA, Huninn, and Iansui, but omitted for `Source Sans 3`, `Gentium Plus`, and `WD-XL Lubrifont TC` (also on Google Fonts), without warning about Google Fonts `unicode-range` subsetting or version differences.
8. **Licensing commentary (`Kaukhia` vs `POJ Chhiu-ki` vs `I.Ming`) — VERDICT: inconsistent**
   * Dismisses `Kaukhia` (`CC BY 4.0`) as *"not a font licence"* while recommending `POJ Chhiu-ki` (`Apache-2.0`, also not a font-specific license) without explaining why Apache-2.0 works cleanly for font embedding whereas CC BY 4.0 is discouraged by Creative Commons for fonts/software. Also doesn't state why `I.Ming` (IPA Font License 1.0) was omitted from the Han-Lo picks.
9. **Test line in §1 vs "26 test clusters" in §3 — VERDICT: unverifiable / incomplete**
   * Coverage of specific macOS font builds and the 26-cluster audit script outputs cannot be verified from the report alone, and §1's test line omits key cases (`Ò͘`, `Ŏ͘`, `A̍`, `E̍`, `O̍`, `U̍`, `N̍g`, `e̍`, `o̍`, `u̍`, `ń`, capitals of `m`/`n` tones, 6th-tone caron, `o͘ⁿ`/`o͘h` collisions, `Sⁿ`/`Sᴺ`, `--` neutral tone, and non-canonical input order).

---

### 6. Prioritized List of Concrete Corrections & Additions

#### Priority 0 — Fix outright technical errors
1. **Fix §2.3 engine generalization:** Clearly separate **HarfBuzz** (`cmap` compose/decompose + canonical mark reordering + ccc/bbox fallback) from **DirectWrite** and **CoreText** (font fallback on missing `cmap` glyphs; no general Latin NFD recomposition or canonical mark reordering before GSUB; no HarfBuzz-style bbox fallback). Note also that HarfBuzz's `cmap` recomposition means `o + 0301 + 0358` reaches GSUB as `oacute + uni0358`, not 3 glyphs, whenever `oacute` is in `cmap`.
2. **Fix §4.3 feature sketch bugs:**
   * Put 3-glyph ligatures (`o uni0358 acutecomb`, `o acutecomb uni0358`, `o uni030D uni0358`) **before** 2-glyph prefixes (`o uni0358`, `o uni030D`).
   * Split `@MC_top` and `@MC_topright` into **separate `lookup` blocks** (or merge `o`'s anchors into one `pos base o` statement), move `markClass` to top level, and note that per-glyph anchor coordinates (not shared class anchors) are required for proportional fonts.
   * Add `o_uni0358` and `dotlessj` to `@MC_top`, and `ohungarumlaut` (`ő`) / `ocaron` (`ǒ`) to `@MC_topright`.
   * Add explicit `languagesystem DFLT dflt; languagesystem latn dflt;` and `table GDEF` (`o_uni0358` etc. as `Base`, marks as `Mark`).
   * Add `lookupflag UseMarkFilteringSet @TopMarks;` to `DotlessI`, fix `@TopMarks` (include other `ccc=230` marks; drop `uni0358`), warn about `DotlessI`-before-`POJLigatures` breaking `sub i uni030D`, and standardize glyph names to AGLFN production names.
3. **Fix §2.4 `U+1D3A` contradiction:** State accurately that `U+1D3A` is `ᴺ` (`MODIFIER LETTER CAPITAL N`), used in all-caps POJ (not lowercase `ⁿ`), and add `U+1D3A` to §4.1.
4. **Fix HarfBuzz fallback explanation (§2.3 step 6):** Add the **all-or-nothing `!plan->has_gpos_mark` rule**—having *any* GPOS `mark` lookup disables HarfBuzz fallback across the whole font.

#### Priority 1 — High-impact omissions & survey inconsistencies
5. **Add web-font subsetting / `unicode-range` warning:** Warn that splitting Latin bases and `U+0358`/`U+030D` across separate `@font-face` WOFF2 files (common on Google Fonts / CJK fonts) silently breaks `ccmp` and `mark`.
6. **Add missing POJ/Tâi-lô typography essentials:**
   * Required `cmap` coverage in §4.1 for `ḿ/Ḿ` (`U+1E3E–1E3F`), `ǹ/Ǹ` (`U+01F8–01F9`), `ă/ĕ/ĭ/ŏ/ŭ`, `ā/ē/ī/ō/ū`, `ő/ű`, `U+1D3A`, `U+2011` (and 6th-tone caron `U+030C` + `ǎ/ě/ǐ/ǒ/ǔ/ň`).
   * Neutral-tone double hyphen `--` (must stay visually separated; warn against auto-en-dash).
   * Post-`o͘` collision handling (`o͘ⁿ`, `o͘h`, `o͘”`) and why Technique C spacing dots cannot be `GDEF` Marks without advance-width zeroing.
   * Vertical metrics (`usWinAscent`/`hhea.ascender`) to prevent clipping `O̍͘`/`I̍`/`Ő`, plus contextual `ccmp` `.case` marks (since `case` is off by default) and kerning classes for Technique B ligatures.
7. **Expand `liga` warnings (§2.3 step 4):** Add **Firefox** (CSS Text 3 §8.2) and **Microsoft Word** (`liga` off by default), plus `clig`.
8. **Resolve survey-table contradictions:** Split **Arial** out from Helvetica/Geneva/Menlo; qualify **Source Sans 3**'s broken `ŏ͘`; clarify GPOS `mark` status across all `B`-only fonts (`Lesson One`, Huninn, Iansui, Tāu-hū, GenYo, WD-XL); check whether NunitoPOJ's `i̍` ligature is in `liga` or `ccmp`; fix `Charis/Doulos/Gentium` and `EB Garamond` technique labels.

#### Priority 2 — Polish & completeness
9. **Clarify §2.1 stability policy wording:** Distinguish the Normalization Stability Policy (2001) from UTC/WG2's precomposed-character encoding policy.
10. **Add brief engineering notes on:** Variable fonts (interpolated anchors in `GDEF` `ItemVariationStore`), CFF vs TrueType components, PDF `/ToUnicode` (AGLFN naming and `dotlessi` copy-paste), `locl` pitfalls when forking, real-world POJ/TL IMEs & legacy `ơ`/`U+0307` substitutes, and expand §1's test line to cover the missing capitals, `o͘ⁿ`/`o͘h`, `--`, 6th tone, and non-canonical input.
