# PehoejiFont

Adding **Pe̍h-ōe-jī (POJ)**, the Latin-script orthography for Taiwanese Hokkien, to open-source fonts from the Google Fonts catalog, and contributing the changes back upstream.

## What POJ needs from a font

Most Latin fonts already have the base letters and the common tone marks. POJ adds three characters that most fonts lack:

| Codepoint | Character | Used for |
|---|---|---|
| U+0358 | ͘ COMBINING DOT ABOVE RIGHT | the vowel **o͘** (e.g. *Pe̍h-ōe-jī*, *o͘*) |
| U+030D | ̍ COMBINING VERTICAL LINE ABOVE | 8th tone (e.g. *pe̍h*, *si̍t*) |
| U+207F | ⁿ SUPERSCRIPT LATIN SMALL LETTER N | nasalisation (e.g. *sⁿ*, *iⁿ*) |

It also uses these combining tone marks, which most Latin fonts already have:

| Codepoint | Mark | Tone |
|---|---|---|
| U+0301 | ◌́ acute | 2nd |
| U+0300 | ◌̀ grave | 3rd |
| U+0302 | ◌̂ circumflex | 5th |
| U+0304 | ◌̄ macron | 7th |
| U+0306 | ◌̆ breve | 9th (some dialects) |

Having the codepoints isn't enough. The marks also need anchors so they sit correctly: U+030D centred above the vowel or syllabic `m`/`ng`, and U+0358 at the top right of `o`, combining with any tone mark on the same letter (e.g. *ō͘*).

## License survey

Source: [`google/fonts`](https://github.com/google/fonts) at commit `cc5661d`, 2026-11-19. That's 2,067 families.

**Every family's license allows modifying it and releasing the result publicly.** The difference is whether a fork you release can keep the font's name.

| License | Families | Released fork can keep the name? |
|---|---|---|
| SIL OFL 1.1, no Reserved Font Name | 1,460 | Yes |
| SIL OFL 1.1, with a Reserved Font Name | 558 | No, it must be renamed |
| Apache 2.0 | 44 | Yes (keep the license and notices, state your changes) |
| Ubuntu Font Licence 1.0 | 5 | No, it must be renamed |

OFL derivatives must stay under the OFL and can't be sold on their own. Changes merged by the font's own upstream project keep the original name in every case.

Per-family data is in [`data/google-fonts.json`](data/google-fonts.json).

## Shortlist

This project works on fonts that meet all three conditions:

1. Open license (OFL 1.1 or Apache 2.0).
2. **No reserved name**, so a modified version can be released under the same name.
3. Source repository **on GitHub**, so the change can be sent upstream as a pull request.

That gives **1,471 families**. I checked each one's main font file for the POJ characters:

| Status | Families | Meaning |
|---|---|---|
| Needs work | 1,393 | Missing at least one POJ character |
| Has POJ characters | 55 | Has all three POJ characters and all five tone marks |
| Not Latin | 23 | No basic Latin letters, out of scope |

Of the 1,393 that need work:
- 1,242 are missing all three POJ characters.
- 371 are also missing one or more combining tone marks.
- 365 have no `mark` positioning feature at all, so the marks need anchors built from scratch.

Fonts that already have the characters include Noto Sans, Noto Serif, Montserrat, Inter Tight, Arimo, Cousine, the Cormorant and Libertinus families, and LXGW WenKai TC. Full list: [`data/shortlist.json`](data/shortlist.json) (filter on `"status": "has-poj-chars"`).

This check only reads which characters each font maps. It doesn't confirm that the marks are positioned well, so even the "has POJ characters" fonts should be checked visually.

## Forks

The 1,393 families that need work come from 989 unique GitHub repositories, after leaving out `googlefonts/googlefontdirectory-hg`, an archive of the old Mercurial repo rather than a real source. Each one is forked into the [PehoejiFont](https://github.com/PehoejiFont) organization, using only its default branch. The list is in [`data/fork-list.tsv`](data/fork-list.tsv) (columns: upstream, fork name, families).

Three repo names exist under more than one owner (`baloo2-variable`, `signika`, `wixmadefor`). Those forks are named `<owner>-<repo>` so they don't collide.

## Workflow for each font

1. Add or reuse glyphs in the fork's sources:
   - U+030D: reuse a vertical stroke, or the shape of the acute accent.
   - U+0358: reuse the dot from U+0307.
   - U+207F: a superior `n`.
2. Add `mark` and `mkmk` anchors so the marks sit correctly on `a e i o u m n` (upper and lower case) and stack with tone marks.
3. Build the font with the project's own build process, and check it with [fontbakery](https://github.com/fonttools/fontbakery).
4. Open a pull request upstream. Once the upstream project releases it, Google Fonts picks up the new version and it keeps the original name.

## Upstream efforts

- [googlefonts/glyphsets#5](https://github.com/googlefonts/glyphsets/issues/5) has been open since 2020. It asks to add U+030D, U+0358 and U+207F to the GF Latin Plus glyph set. If they were added, POJ support would become part of Google Fonts' own requirements.
- [googlefonts/lang](https://github.com/googlefonts/lang) has no language definition for Taiwanese in Latin script (`nan_Latn`). Adding one would let Google Fonts' tools report which fonts support POJ.

## Plain-language guide

The website at <https://pehoejifont.github.io/> (`index.html` and the pages next to it) explains the findings for non-specialists, with pictures drawn from the real fonts by `tools/poj_guide_svg.py`.

## Research notes

[`docs/poj-font-implementation.md`](docs/poj-font-implementation.md) explains how POJ differs from an English font, every Unicode form POJ text arrives in (NFC, NFD, mark order, ⁿ/NFKC, PUA, IVS), the four ways existing fonts implement it, a survey of the free fonts listed on [oh.taigi.info › 字體](https://oh.taigi.info/siataibun/jithe/), and a recipe for the forks. Model reviews are in `docs/reviews/`.

## Repository layout

```
data/
  google-fonts.json   every Google Fonts family: license, reserved name, designer, upstream repo
  shortlist.json      the 1,471 shortlisted families with POJ coverage results
  fork-list.tsv       upstream repo → fork name → families
  poj-font-audit.json audit + HarfBuzz shaping results for the fonts in docs/poj-font-implementation.md
docs/
  poj-font-implementation.md  research report
  img/                specimens (NFC and NFD rows per font)
  reviews/            agy (Gemini 4) reviews of the report and the prompt used
tools/
  build_catalog.py    builds google-fonts.json from a sparse checkout of google/fonts
  download_fonts.py   downloads one main font file per family
  check_coverage.py   checks POJ characters and the mark feature (needs fonttools)
  fork_repos.sh       forks the repos in fork-list.tsv into the org
  poj_font_audit.py   per-font POJ audit: cmap, features, anchors, IVS, PUA (needs fonttools, uharfbuzz)
  poj_shape_test.py   HarfBuzz test: how each POJ cluster is built, NFC vs NFD
  poj_specimen.py     renders a PNG specimen (needs pillow)
  poj_guide_svg.py    draws the website's example pictures as SVG (needs fonttools, uharfbuzz)
  build_site_fonts.sh rebuilds the website's GenYo Min font subsets
```

The scripts were written for a single run, and their input and output paths are hard-coded relative to the working directory.
