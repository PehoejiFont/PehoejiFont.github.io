# Project Instructions & Guidelines

## Visual Verification Requirement

> **CRITICAL RULE**: After any edit (font modifications, glyph additions, mark positioning, HTML/CSS changes, or documentation updates), you **MUST** do a visualized check and fix all possible issues before concluding.
> **Make sure to generate all visualized results to check!** Do not conclude based solely on exit codes or text logs; always produce the visual outputs (rendered specimen images, browser screenshots, or comparison graphics) and inspect them visually.

### Mandatory Workflow

1. **For Font & Glyph Edits**:
   - Rebuild or export the modified font (`.ttf` / `.woff2`).
   - **Generate visual specimens**:
     ```bash
     python tools/poj_specimen.py <output_dir> <path_to_font.ttf>
     ```
   - **Visually inspect generated specimen images**:
     - Mark/dot positioning (e.g., U+0358 combining dot above right placed upper-right without collision).
     - Glyphs collisions, clipping, or overlapping accents across all tones.
     - Fallback / `.notdef` boxes across both NFC and NFD strings (both rows must render identically).
     - Validate geometry with HarfBuzz shape tests:
       ```bash
       python tools/poj_shape_test.py <path_to_font.ttf>
       ```
   - Fix all placement or rendering defects immediately and regenerate the visual outputs to re-verify.

2. **For Web / HTML / CSS / Documentation Edits**:
   - **Generate visual render screenshots** (e.g. using headless browser):
     ```bash
     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --window-size=1280,1024 --screenshot=<output_path.png> <url_or_file>
     ```
   - Visually inspect the screenshot for layout glitches, broken alignments, dark/light theme regressions, responsive wrapping, and font-rendering fallbacks.
   - Fix all issues and re-capture until pristine.
