Here is a technical review of the report from a font-engineering and Unicode perspective, based solely on the pasted text and specifications.

---

## 1. Unicode Facts

- **`ccc(U+0358) = 232`, `ccc(U+030D) = 230` (§2.2)** — **VERDICT: Correct.**
  - Per `UnicodeData.txt` (UAX #44), `U+0358` COMBINING DOT ABOVE RIGHT has `ccc = 232` (`Above_Right`) and `U+030D` COMBINING VERTICAL LINE ABOVE has `ccc = 230` (`Above`). All the other tone marks listed (`U+0300, 0301, 0302, 0304, 0306, 030B`) also have `ccc = 230`.

- **Canonical reordering (§2.2)** — **VERDICT: Incomplete (one wrong generalization).**
  - *What is right*: Per the Unicode Canonical Ordering Algorithm (Unicode Standard §3.11, D108–D109; UAX #15), adjacent non-zero `ccc` marks sort in ascending order (`230` before `232`), so `o + U+0358 + U+0301` reorders to `o + U+0301 + U+0358`, which then composes in NFC to `U+00F3 + U+0358`. Equal-`ccc` marks (`230`) preserve relative order.
  - *What is wrong/incomplete*: The sweeping claim *"the NFC form is a precomposed toned vowel + U+0358"* is **false for 8th tone `o̍͘`** (`o + U+030D + U+0358`), because `o̍` has no precomposed code point; its NFC form remains `o + U+030D + U+0358`.

- **Precomposed table in §2.1 (Unicode 17.0)** — **VERDICT: Incomplete.**
  - Every cell shown (`a e i o u` with `0301/0300/0302/0304/0306`, `ő ű`, `ḿ`, `ń ǹ`, and their capitals) is **correct**—and capitals do follow the same availability pattern.
  - *Missing*: The table claims to cover Tâi-lô alongside POJ (`̋ (TL 9)`), but omits **Tâi-lô 6th tone (`ˇ` `U+030C`, caron)**, which has precomposed `ǎ ě ǐ ǒ ǔ ň` (and capitals `Ǎ Ě Ǐ Ǒ Ǔ Ň`) while `m̌`/`M̌` is not precomposed.
  - *Minor formatting flaw*: `a e i` and `u` are marked `–` ("not precomposed") under `͘ (o͘)` whereas `m` and `n` are marked `n/a`; `o` should be separated from `u` so all non-`o` bases use `n/a`.

- **No new precomposed letters will be encoded / "closed the door in 2001" (§2.1)** — **VERDICT: Correct (with precision caveat).**
  - Under the **Unicode Normalization Stability Policy** (adopted in 2001 / Unicode 3.1; UAX #15 & `CompositionExclusions.txt` post-composition-version rule), NFC outputs for existing sequences cannot change, so no newly encoded character can ever be produced by NFC composition from `base + combining mark`. Combined with UTC/WG2 *Principles and Procedures* (specifically cited when `U+0358` was approved in Unicode 4.1 instead of precomposed `o͘`), no precomposed letters with `U+030D` or `U+0358` will be encoded.
  - *Caveat*: Unicode has still encoded new non-decomposable single-codepoint Latin letters (e.g., barred/hooked letters) since 2001; it is specifically *canonically decomposable accented composites* that are closed.

- **NFKC of `U+207F` and `U+1D3A` claims (§2.4)** — **VERDICT: Wrong / Incomplete (specifically on `U+1D3A`).**
  - *Correct*: `U+207F` has `General_Category=Lm` and compatibility decomposition `<super> 006E` (`UnicodeData.txt`), so NFKC/NFKD turn `hiⁿ` into `hin` (destroying nasalization). And `"sⁿ".upper()` is indeed `"Sⁿ"` because `U+207F` has no uppercase mapping in `UnicodeData.txt` or `SpecialCasing.txt`.
  - *Wrong*: §2.4 states *"there is no capital ⁿ"* and then *"Some old text uses ⁿ = U+1D3A"*. **`U+1D3A` is `ᴺ` (`MODIFIER LETTER CAPITAL N`, `<super> 004E`)**, not lowercase `ⁿ`—it is the actual Unicode capital modifier N (occasionally used in all-caps POJ like `Sᴺ`, or mistakenly typed in place of `ⁿ`).
  - *Risky advice*: Suggesting `case` convert `ⁿ` to a `.case` glyph is only appropriate if `.case` merely **raises/resizes `ⁿ` to cap-height alignment**; changing lowercase `ⁿ` into capital `ᴺ` via OpenType `case` violates OpenType's semantic boundary for `case` (which is for case-sensitive alignment of punctuation/marks, not case-changing letters).

- **`Soft_Dotted` handling of `i` (§1, §2.3, §4.1, §4.3)** — **VERDICT: Incomplete.**
  - Unicode Standard §7.1 (*Latin*) and `PropList.txt` (`Soft_Dotted`) specify that `i`, `j`, `į`, etc. lose their dot only when followed by an **above** combining mark (`ccc=230` or `232`), *not* when followed by a below mark (`ccc=220`, e.g., `i + U+0323`). §1 loosely says *"when a mark sits on it"*.
  - §1 only flags `i + U+030D` as needing a font-side `dotlessi` swap, overlooking **Tâi-lô `i̋` (`i + U+030B`)** (also has no precomposed code point) and **any NFD `i + tone`** (`i + U+0301`, etc.) in shapers like DirectWrite that do not auto-compose NFD to `í`, or in fonts lacking precomposed `ǐ` / `ĭ`.

---

## 2. Shaping-Engine Behaviour

- **HarfBuzz reorders marks by `ccc` before GSUB (§2.2, §2.3)** — **VERDICT: Correct (with a crucial nuance).**
  - In `hb-ot-shape-normalize.cc`, Latin uses `HB_OT_SHAPE_NORMALIZATION_MODE_COMPOSED_DIACRITICS` (via `AUTO`), which decomposes, sorts non-zero `ccc` marks in ascending order (`230` before `232`), and recomposes *before* GSUB runs. Thus `o 0358 0301` never reaches GSUB in that order in HarfBuzz.
  - *Nuance*: When `ó` (`U+00F3`) is in `cmap`, HarfBuzz also composes `o + 0301` → `ó` before GSUB, so **`o 0301 0358` does not reach GSUB either**—only `ó + 0358` does (which §4.3 accounts for, though §2.2 understates it).

- **HarfBuzz compose/decompose via `cmap` (§2.3 step 2)** — **VERDICT: Incomplete / Misleading across engines.**
  - The described behaviour (`ó` used if in `cmap`; decomposed to `o + U+0301` if missing from `cmap`; NFD composed to `ó` if in `cmap`) accurately reflects **HarfBuzz** (`COMPOSED_DIACRITICS`). (Note: HarfBuzz also decomposes a `cmap`-present precomposed glyph if a following mark has a lower `ccc` that requires reordering across it, e.g., `á + U+0323`.)
  - However, §2.3 introduces steps 1–6 as what *"HarfBuzz, CoreText, DirectWrite/Uniscribe"* do. **DirectWrite** does **not** perform HarfBuzz-style NFD→NFC composition via `cmap` (`o + U+0301` stays two glyphs), and does not universally fall back to canonical decomposition when a precomposed `cmap` entry is missing. CoreText's normalization/composition rules also differ (especially between AAT and OpenType). Grouping all three engines under HarfBuzz's pipeline masks why NFD-only failures happen on Windows/Word even when Chrome passes.

- **Fallback mark positioning: HarfBuzz vs CoreText vs DirectWrite (§2.3 step 6)** — **VERDICT: Incomplete (critical HarfBuzz rule omitted).**
  - It is **correct** that HarfBuzz has a `ccc`-based geometric fallback (`hb-ot-shape-fallback.cc`) whereas CoreText and DirectWrite do not replicate it, causing mark collisions or floating marks in Word/Pages.
  - *Critical omission*: HarfBuzz **only** runs fallback mark positioning when the font has **no active GPOS `mark` feature** for the script (`!has_gpos_mark`). If a font *does* have a GPOS `mark` table that omits `U+0358` (like Arial) or omits a `topright` anchor on a specific vowel (like `ŏ` in Source Sans 3), HarfBuzz **disables fallback positioning completely**, rendering the unanchored mark at raw `(0, 0)` overstrike.
  - *Helpful explanation missing*: In `Ó͘` / `Ō͘`, HarfBuzz fallback lifts `U+0358` far above the capital because `hb-ot-shape-fallback` positions `ccc=232` relative to the entire ink bounding box (`extents`) of `Ó`/`Ō`, whose top already includes the tone accent.

- **Browsers disabling `liga` when `letter-spacing ≠ 0` (§2.3 step 4)** — **VERDICT: Correct (with one unverifiable attribution).**
  - **CSS Text Level 3 / Level 4** explicitly mandates disabling optional ligatures when effective `letter-spacing ≠ 0`. Under OpenType and CSS, `liga` is optional (disabled by `letter-spacing ≠ 0`, `font-variant-ligatures: none`, and `text-rendering: optimizeSpeed`), whereas `ccmp` and `rlig` remain mandatory.
  - *Minor omission*: **Firefox (Gecko)** also disables `liga` for non-zero `letter-spacing`, not only Chrome and Safari.
  - *Unverifiable*: Attributing Kaukhia's devlog *"Browser Ligature Issue"* to `letter-spacing` is speculative (Kaukhia is listed under *Not tested*).

---

## 3. Missed POJ / Tâi-lô Input Encodings and Font Techniques

1. **Other legacy encodings & PUA conventions**:
   - **8-bit codepage hijacking**: Pre-Unicode-4.1 POJ fonts (e.g., older missionary/Taiwanese TrueType fonts) repurposed Windows-1252 / MacRoman slots (`0x80–0xFF`) for `o͘`, `a̍`, `ⁿ`.
   - **Other PUA ranges & Big5 PUA**: Different Taiwanese communities/IMEs used `U+E000–U+E0FF` / `U+F000–U+F8FF` (including Big5-PUA mappings for Han-Lo and POJ) and SIL's deprecated pre-4.1 PUA slots, not just `U+E400–E435`.
   - **Other mistyped Unicode characters in real corpora**: `U+0307` (dot above, `ȯ`), `U+02DA` / `U+00B0` (`o°`), `U+2022` (`o•`), `U+30FB` (`o・`) for `U+0358`; `U+02C8` (`ˈ`), `U+0027`/`U+2019`, `U+0329` (vertical line below), `U+030E` for `U+030D`; `U+2099` (`ₙ` subscript) or `U+00AA` (`ª`) for `ⁿ`.

2. **IME & PDF input quirks**:
   - Dead-key / sequential IMEs can emit **dot-before-tone (`o + 0358 + 0301`)** or **NFD**, which looks fine in HarfBuzz (masked by canonical reordering) while breaking in engines/apps that do not reorder.
   - PDF copy-paste often yields **visual-order marks** (mark before base) or **spaces inserted around spacing `U+0358`**.

3. **Tâi-lô-specific marks**:
   - **6th tone (`ˇ` `U+030C`)**: Official MOE Tâi-lô tone 6; `ǎ ě ǐ ǒ ǔ ň` exist precomposed, **`m̌` does not**.
   - **Syllable-tone placement**: Tâi-lô `oo` puts the tone on the **first** `o` (`óo`, `o̍o`, `őo`); nasal `nn` puts the tone on the **preceding vowel** (`ánn`, `īnn`, `i̍nn`).

4. **Hyphen and Double-Hyphen (`-` and `--`)**:
   - Neutral tone (khin-siaⁿ) uses **double hyphen `--`** (`U+002D U+002D`, e.g. `chhù--nih`), alongside single `-` for compound syllables (`Pe̍h-ōe-jī`).
   - **Font & pipeline traps**: Some fonts turn `--` into an **en-dash** via `liga`/`calt` (and editors/Markdown auto-convert `--` to `–`), corrupting POJ/Tâi-lô text; `--` can also break awkwardly across lines (`chhù- / -nih`) and needs clean two-glyph spacing/kerning plus raised `.case` alignment in all-caps without collapsing to an en-dash glyph.

5. **Uppercase / All-Caps & Vertical Metrics**:
   - **OS/2 & hhea vertical metrics clipping**: Stacked uppercase `Ó͘`, `Ō͘`, `O̍͘`, `M̍`, `Á` frequently exceed `usWinAscent` / `hheaAscent` and clip in Windows/DirectWrite or tight CSS line-heights unless `usWinAscent` is raised and compact `.case` marks are used.
   - **`case` feature is NOT active by default in browsers** (`text-transform: uppercase` does not enable OpenType `case`). Compact cap-height marks must be triggered via **contextual rules in `ccmp`** (`sub @Uppercase @Marks' by @MarksCase;`), not `case` alone.
   - **Small caps (`smcp`/`c2sc`)**: Precomposed `ccmp` ligatures like `oacute_uni0358` break small caps unless `.sc` variants or proper lookup ordering exist.

6. **`locl` & Multi-script CJK/Han-Lo pitfalls**:
   - In CJK/Han-Lo fonts, if `.fea` registers `languagesystem hani dflt;` (or `ZHT`) and forgets `languagesystem latn dflt;`, POJ `ccmp`/`mark` never activates on Latin runs.
   - If the base Latin font includes Turkish/Azeri `locl` (`TRK`/`AZE`), `i` → `i.loclTRK` can bypass `DotlessI` unless ordered/covered carefully.
   - **Stylistic Sets (`ssXX` / `cvXX`)** are the proper mechanism for optional `o͘` dot styles (horn-like vs detached) or straight vs slanted `U+030D`, rather than `locl`.

7. **Vietnamese-style contextual positioning & post-`o͘` kerning**:
   - §4.2 claims the `topright` anchor on toned `o` *"is usually the same as on the bare o"*. In bold/condensed weights, wide accents (`ō` macron, `ô` circumflex, `ŏ` breve) collide with `U+0358` unless `topright` shifts right/down on those bases (with contextual GPOS `calt`/`kern` adjustments for NFD `o + macroncomb + uni0358`) or Vietnamese-style precomposed `ccmp` glyphs (`omacron_uni0358`) are built with narrowed/left-nudged accents.
   - **Collision after `o͘`**: Zero-width `U+0358` sticks out past `o`'s advance width and collides with following tall letters (`o͘h`, `o͘l`, `o̍͘h`, `O͘h`) or quotes (`o͘"`) unless `o_uni0358` gets extra right sidebearing or contextual `kern` adds space between `uni0358` and following tall glyphs.

8. **Variable Fonts (VF)**:
   - Anchor deltas (`topright`, `_topright`, `top`) must interpolate cleanly across `wght`/`wdth`/`opsz` masters (bold masters often force `topright` outward to clear heavier bowls/macrons).
   - `CFF2` variable fonts cannot use TrueType components, so Technique B precomposed glyphs duplicate outline data across every master.
   - Technique C spacing `uni0358` requires `HVAR` width deltas; scaled `ⁿ` needs weight/optical-size compensation across axes.

9. **CFF (`.otf`) vs TrueType (`.ttf`)**:
   - In `.ttf` (`glyf`), Technique B ligatures can be zero-overhead **composites** (though scaled `ⁿ` / shifted marks need careful hinting / `USE_MY_METRICS` flags to avoid stem distortion and thin `uni030D` dropout at small ppem).
   - In `.otf` (`CFF`), composites are disallowed, so every `ccmp` precomposed glyph duplicates full path outlines (inflating CJK+POJ fonts), and CFF `BlueValues`/`OtherBlues` alignment zones matter for consistent mark height.

10. **Web font subsetting**:
    - **Google Fonts `unicode-range` splitting / `pyftsubset`**: If `o`/`ó` is in the `latin`/`latin-ext` `.woff2` slice and `U+0358`/`U+030D` lands in a different slice (or fallback font), **GSUB/GPOS cannot shape across separate `@font-face` runs**, breaking `ccmp` and `mark` completely.
    - Naive subsetters drop `U+0358`, `U+030D`, `U+207F`, `dotlessi`, OpenType layout features, or cmap **format 14 IVS** tables (for taigivs) unless explicitly preserved.

11. **PDF Text Extraction & Embedding**:
    - Technique B `ccmp` ligatures (`oacute_uni0358`, `dotlessi`) break PDF copy-paste/search unless the PDF generator emits `/ActualText` or relies on strict **AGL-compliant** glyph names (`circumflexcomb`, `macroncomb`, `brevecomb`, and `oopoj` in §3 are *not* in standard AGL 2.0 `ToUnicode` mappings—`uni0302`, `uni0304`, `uni0306`, `uni030D`, `uni0358` are!). Even with AGL names, `dotlessi + uni030D` often copies out as `ı̍` (`U+0131`) instead of `i̍` (`U+0069`).
    - Technique C spacing dots can cause PDF extractors to insert spurious spaces (`o ͘`).
    - PUA-encoded text extracts as PUA garbage, and PDF backends frequently drop `U+E0100+` variation selectors on IVS glyphs.

12. **`GDEF` table**:
    - Never mentioned anywhere in the report, yet required so GPOS `mark` skips intervening marks (NFD `o + acutecomb + uni0358`), `IgnoreMarks` kerning works, and `UseMarkFilteringSet` functions.

---

## 4. Errors and Risky Advice in the §4.3 Feature-File Sketch

1. **Duplicate base glyph `o` across two `pos base` statements in `feature mark` (Syntax/Compilation bug)**:
   - `pos base [a e o u m n dotlessi] ... mark @MC_top;` and `pos base [o oacute ...] ... mark @MC_topright;` both declare `o` inside the same implicit lookup. In AFDKO `makeotf`, a base glyph cannot appear in two separate `pos base` statements in one lookup—this throws a duplicate-base error or overwrites the first anchor. You must either combine both classes in one statement (`pos base o <anchor 250 500> mark @MC_top <anchor 470 420> mark @MC_topright;`) or put them in two separate named `lookup` blocks.

2. **Missing `languagesystem` declarations and `table GDEF`**:
   - Without `languagesystem DFLT dflt; languagesystem latn dflt;`, pasting this into a CJK/Han-Lo `.fea` file that already declares `languagesystem hani dflt;` will prevent `ccmp` and `mark` from firing on Latin text.
   - Without `table GDEF` classifying marks (`Class 3`) and ligatures (`Class 2`), NFD `o + acutecomb + uni0358` cannot skip `acutecomb` to attach `uni0358` to `o`, and `IgnoreMarks`/`UseMarkFilteringSet` fail.

3. **Ligature ordering & `o_uni0358` anchor gap in `POJLigatures`**:
   - Listing `sub o uni0358 by o_uni0358;` *before* 3-glyph rules (`o acutecomb uni0358`, `o uni0358 acutecomb`) is risky: OpenType LookupType 4 takes the first match, so even though `makeotf`/`feaLib` auto-sort longest-first within one lookup, splitting lookups or using tools that preserve source order will swallow the first two glyphs into `o_uni0358` and strand `acutecomb`. Always write 3-glyph ligatures before 2-glyph ligatures.
   - Furthermore, **`o_uni0358` is omitted from `feature mark`**, so if `o_uni0358` is ever formed before a tone mark (e.g., `o + 0358 + 030D`), the tone mark has no `top` anchor.

4. **Flaws in `DotlessI` (`@TopMarks` and `dotlessj`)**:
   - `@TopMarks` omits `U+030C` (`uni030C` / `caroncomb`, Tâi-lô 6th tone), `U+0307`, `U+0308`, `U+0303`, `U+0309`, `U+030A`.
   - `sub i' @TopMarks` fails if a below mark (`ccc=220`, e.g. `U+0323` dot below) precedes the above mark after canonical reordering; it needs `lookupflag UseMarkFilteringSet @TopMarks;` (with `GDEF`).
   - `dotlessj` is not a standard AGL glyph name (`uni0237` is, which matches §4.1's `uniXXXX` convention for `uni0358`, `uni030D`, `uni030B`, `uni207F`), and **`dotlessj` is omitted from `pos base [...] mark @MC_top`**, leaving `j + mark` unanchored after dot removal!

5. **Inconsistent glyph naming & missing `mark` bases/features**:
   - Mixing `gravecomb`/`macroncomb` (non-AGL-2.0 names) with `uni030B`/`uni030D`/`uni0358` causes `ToUnicode` PDF extraction failures if carried into ligature names.
   - `feature mark` omits **`ohungarumlaut` (`ő`)** (and capitals `Ő`, `Ó`, etc.), and uses a single `<anchor 250 500>` for `[a e o u m n dotlessi]` without noting each letter needs distinct x/y coordinates.
   - `markClass` is placed *inside* `feature mark` instead of top-level (which breaks sharing across `mark` and `mkmk`), and **`mkmk` and contextual `.case` (`ccmp`) are completely absent** despite being recommended in §4.1–§4.2.

---

## 5. Inconsistencies in the Survey & Recommendations (§3)

1. **Arial classification contradiction**:
   - The Technique table places `Arial (030D)` under **A** (`GPOS mark`) and `Arial (U+0358)` under **D**, while the Survey table lumps `Arial / Helvetica / Geneva / Menlo` together as **D** (*"depend on the engine's fallback"*), and `Dotless i̍ = mixed` hides that Arial swaps `dotlessi` (notice §4.3 rule 6 omits Arial from the non-dotless-`i` list). Worse, because Arial *has* a GPOS `mark` table, HarfBuzz does **not** run `ccc` fallback on `Arial (U+0358)`—it strictly overstrikes at `(0, 0)`, unlike Helvetica/Geneva/Menlo.

2. **Recommending Technique-B-only fonts without `mark` anchors**:
   - §3 states *"What good POJ fonts combine: A + B"* and *"Keep anchors even when ligatures exist"*, and §4.3 rule 5 says *"Always ship a GPOS `mark` feature."* Yet the Survey table lists `Lesson One`, `jf open 粉圓 2.1`, `芫荽 Iansui`, `WD-XL Lubrifont`, and `GenYoMin2` as **`B` only** (unlike `TASA` and `I.Ming`, marked `B + A`), notes `No mark feature at all` only on `Tāu-hū`, and then recommends `Lesson One`, `jf open 粉圓`, `芫荽` for running POJ—and **`豆腐烏 family` for Han-Lo**—despite lacking Technique A anchors. Either those fonts actually have `mark` (making `B` incomplete) or they share `Tāu-hū`'s fallback vulnerability.

3. **Source Sans 3 (`ŏ`) vs *"Clean"* recommendation**:
   - Source Sans 3 is noted as missing the anchor on **`ŏ`**, yet is labelled *"Clean"* and placed #1 in the recommended picks without noting that `ŏ͘` (9th tone POJ, present in §1's test line) will **fail completely** in HarfBuzz (because having a `mark` feature disables HarfBuzz's fallback positioning!).

4. **NunitoPOJ `Dotless i̍: ✓ (ligature)` vs §2.2**:
   - §3 lists NunitoPOJ's dotless `i̍` as `✓ (ligature)` while noting its ligatures are in `liga`—without clarifying whether `i̍` is in `liga` too (if so, `letter-spacing ≠ 0` breaks `i̍`, and GPOS anchors—which §2.2 says save the other ligatures—cannot remove the dot from `i`).

5. **Test coverage vs §1 / §3 claims (unverifiable items)**:
   - §1's test line omits `Ò͘ Ô͘ Ŏ͘`, `e̍ o̍ u̍`, and `E̍ O̍ U̍ N̍`.
   - The exact 26 test clusters in `poj_shape_test.py`, Source Sans 3 / NunitoPOJ / Lesson One internal lookup counts, and Kaukhia's devlog explanation are **unverifiable** from the report text alone.

---

## Prioritized List of Concrete Corrections and Additions

### P0 — Fix factual errors & broken code in §2, §3, §4.3
1. **Fix `feature mark` and `POJLigatures` in §4.3**:
   - Merge `o`'s two `pos base` anchors into one statement (or split into `lookup MarkTop` / `lookup MarkTopRight`), add `languagesystem DFLT dflt; languagesystem latn dflt;`, add `table GDEF` (`GlyphClassDef`), move `markClass` to top-level, put 3-glyph ligatures *before* 2-glyph ligatures, add `o_uni0358` to `mark` (or handle it), add `ohungarumlaut` (`ő`), add `dotlessj`/`uni0237` to `pos base`, use `UseMarkFilteringSet @TopMarks` + add `uni030C` (TL 6th tone) to `@TopMarks`, and unify on AGL-compliant `uniXXXX` naming.
2. **Correct `U+1D3A` and `case` advice in §2.4**:
   - Clarify `U+1D3A` is `ᴺ` (`MODIFIER LETTER CAPITAL N`), not lowercase `ⁿ`. Specify that a `.case` form of `ⁿ` should adjust cap-height vertical alignment rather than swap lowercase `ⁿ` to `ᴺ`.
3. **Fix NFC claim in §2.2**:
   - Note that 8th tone `o̍͘` (`o + U+030D + U+0358`) has **no** precomposed toned vowel in NFC.
4. **Fix HarfBuzz fallback & cross-engine claims in §2.3**:
   - Clarify that HarfBuzz disables fallback mark positioning whenever *any* active GPOS `mark` table exists (explaining `Arial U+0358` and `Source Sans 3 ŏ͘`), explain why `Ó͘` jumps up in fallback (bbox includes accent), and separate DirectWrite/CoreText from HarfBuzz's `cmap` compose/decompose rules (DirectWrite does not auto-compose NFD via `cmap`).
5. **Resolve Survey inconsistencies in §3**:
   - Separate Arial from Helvetica/Geneva/Menlo; verify and align whether `Lesson One` / `Huninn` / `Iansui` / `GenYoMin2` / `WD-XL` have `mark` (`B + A` vs `B`); flag `Source Sans 3`'s `ŏ͘` failure and `NunitoPOJ`'s `i̍` (`liga` vs `ccmp`) risk.

### P1 — Add critical missing POJ/Tâi-lô & font-engineering topics
6. **Add `GDEF`, contextual `.case` in `ccmp`, `os2.usWinAscent` clipping, and post-`o͘` kerning**:
   - Explain why uppercase `.case` marks must be driven by contextual `ccmp` (since CSS doesn't enable `case` by default), why `usWinAscent`/`hheaAscent` prevent clipping of `Ó͘`/`M̍`, why bold `ō͘`/`ô͘`/`ŏ͘` need shifted `topright` anchors or Vietnamese-style narrowed marks, and how to prevent `o͘h`/`o͘"` collisions.
7. **Add Web font subsetting & `ToUnicode` PDF extraction warnings**:
   - Document Google Fonts `unicode-range` splitting (`o` vs `U+0358` in separate `.woff2` files breaks GSUB/GPOS), `pyftsubset` stripping `U+0358`/`U+030D`/IVS, and `ccmp` ligature / `dotlessi` / AGL naming pitfalls in PDF copy-paste.
8. **Add Tâi-lô 6th tone (`U+030C` + `ǎ ě ǐ ǒ ǔ ň` / `m̌`) and hyphen / double-hyphen (`--`)**:
   - Update §2.1 table and §1/`DotlessI` for `U+030C`; add guidance against `--` → en-dash ligatures/smart-quotes and line-break/all-caps handling of `--`.

### P2 — Structural / Technical Completeness
9. **Add `CFF` vs `TrueType`, Variable Fonts, and CJK `locl`/script pitfalls**:
   - Cover outline duplication vs `glyf` composites, VF master anchor interpolation (`HVAR`/deltas), `languagesystem latn dflt` in Han-Lo fonts, and `ssXX`/`cvXX` for alternate `o͘` dot styles.
10. **Expand the §1 test string and clean up §2.1**:
    - Add `Ò͘ Ô͘ Ŏ͘ e̍ o̍ u̍ E̍ O̍ U̍ N̍` and `m̌` (TL) to the test line; use `n/a` consistently in §2.1 and mention Firefox alongside Chrome/Safari on `letter-spacing ≠ 0`.
