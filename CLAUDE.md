# Project Instructions & Guidelines

## Visual Verification Requirement

> **CRITICAL RULE**: After any edit (font modifications, glyph additions, mark positioning, HTML/CSS changes, or documentation updates), you **MUST** do a visualized check and fix all possible issues before concluding.
> **Make sure to generate all visualized results to check!** Do not conclude based solely on exit codes or text logs; always produce the visual outputs (rendered specimen images, browser screenshots, or comparison graphics) and inspect them visually.

### Mandatory Workflow

1. **For Font & Glyph Edits**:
   - Rebuild or export the modified font (`.ttf` / `.woff2`).
   - **Generate comprehensive visual specimens**:
     ```bash
     python tools/poj_specimen.py <output_dir> <path_to_font.ttf>
     ```
   - **Specimen Content Requirements (All Letters & Sentences)**:
     - **All Letters & Marks**: Must include all vowels (`a, e, i, o, u, o͘`), uppercase counterparts (`O͘, Ó͘, Ō͘, A̍, I̍, M̍, N̍g`), syllabic nasals (`m̍, n̍, ḿ, m̄, m̂, n̂, ǹ, n̄`), superscript nasal mark (`ⁿ`), and tone 9 double acute (`i̋`).
     - **Full Sentences & Connectivity**: Must include full sentences/phrases (e.g., `Chhù-piⁿ tńg--khì-o͘h, saⁿ-koan lóng hó-sè, kiⁿ-á-ji̍t chin hoaⁿ-hí!`) to verify horizontal rhythm, advance widths, kerning, and spacing when connecting to the next letter, double hyphens (`--`), and punctuation without awkward gaps or collisions.
   - **Style Consistency Requirement**:
     - All POJ add-ons (combining dot above right `U+0358`, tone diacritics, superscript `ⁿ`, vertical tone lines) **MUST follow the exact design style of the original font**:
       - **Stroke weight & thickness**: Must match the font's primary stem weights and optical sizing (never noticeably thicker or thinner).
       - **Terminals, corners, & serifs**: Follow the original font's terminal treatment (e.g., rounded, sharp, slab, or calligraphic).
       - **Design language**: In stylistic or display fonts (e.g., Amatic SC, Aboreto, Alice), add-on marks must mirror the unique geometry and aesthetic characteristics of the parent font.
   - **Visually inspect generated specimen images**:
     - Mark/dot positioning (e.g., U+0358 combining dot placed upper-right without collision across all tones).
     - Glyphs collisions, clipping, or overlapping accents across both NFC and NFD strings (both rows must render identically).
     - Check connection to adjacent letters to ensure no clipping or improper spacing.
     - Validate geometry with HarfBuzz shape tests:
       ```bash
       python tools/poj_shape_test.py <path_to_font.ttf>
       ```
   - Fix all placement, styling, or rendering defects immediately and regenerate the visual outputs to re-verify.

2. **For Web / HTML / CSS / Documentation Edits**:
   - **Generate visual render screenshots** (e.g. using headless browser):
     ```bash
     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --window-size=1280,1024 --screenshot=<output_path.png> <url_or_file>
     ```
   - Visually inspect the screenshot for layout glitches, broken alignments, dark/light theme regressions, responsive wrapping, and font-rendering fallbacks.
   - Fix all issues and re-capture until pristine.
