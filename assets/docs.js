/* PehoejiFont Documentation Shell — zero-dependency static doc chrome:
   - Theme persistence & toggle
   - Mobile sidebar drawer
   - Auto-generated "On this page" TOC with IntersectionObserver scroll-spy
   - Heading permalink anchors & Copy buttons for code blocks
   - Instant client-side search across all documentation pages (Cmd/Ctrl+K or /)
   - Image lightbox for specimens */
(function () {
  'use strict';

  // ── 1. Theme handling ─────────────────────────────────────────────────────
  var root = document.documentElement;
  var savedTheme = localStorage.getItem('poj-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.setAttribute('data-theme', savedTheme);
  }

  function isDark() {
    var attr = root.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function updateThemeBtn(btn) {
    if (!btn) return;
    btn.textContent = isDark() ? '☀ Light' : '☾ Dark';
    btn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
  }

  // ── 2. Site-wide search index ─────────────────────────────────────────────
  var SEARCH_INDEX = [
    { page: './', section: 'Overview', title: 'POJ Font Documentation — Overview', desc: 'Why Taigi Pe̍h-ōe-jī letters like o͘ and a̍ break, visual font comparison, short answers, and documentation map.', tags: 'start home poj o͘ hō͘ chia̍h thiⁿ n̂g genyo lesson one arial helvetica eb garamond' },
    { page: 'letters.html', section: 'Core Concepts', title: 'Unicode & Encoding for POJ and KPL', desc: 'How computers store POJ letters as base + combining marks, precomposed Unicode 17.0 matrix, ccc ordering, shaping engines.', tags: 'u+0358 u+030d u+207f u+1d3a u+030b u+030c unicode nfc nfd combining marks' },
    { page: 'letters.html#precomposed', section: 'Unicode & Encoding', title: 'Precomposed Unicode 17.0 Matrix & Stability Policy', desc: 'Which POJ and KPL combinations exist precomposed, why Unicode will never add precomposed o͘ (2001/2005 policies).', tags: 'precomposed unicodedata ḿ ǹ ő ű ǎ stability policy 2005' },
    { page: 'letters.html#canonical', section: 'Unicode & Encoding', title: 'Canonical Combining Classes (ccc 230 vs 232) & Mark Order', desc: 'Why tone marks (ccc=230) sort before U+0358 (ccc=232), NFC of o̍͘, and how HarfBuzz normalises before GSUB.', tags: 'ccc 230 232 canonical ordering nfc nfd o̍͘ ó͘' },
    { page: 'letters.html#shapers', section: 'Unicode & Encoding', title: 'Shaping Engines: HarfBuzz, CoreText & DirectWrite', desc: 'HarfBuzz 5-stage pipeline, all-or-nothing fallback positioning rule, CoreText AAT tables, DirectWrite differences, optional liga/case switches.', tags: 'harfbuzz coretext directwrite fallback ccmp liga clig case letter-spacing word' },
    { page: 'letters.html#dotted-i', section: 'Unicode & Encoding', title: 'Soft_Dotted i & j (Dotless ı Swap)', desc: 'Why i̍ and i̋ must drop the dot via dotlessi (U+0131) and uni0237 (U+0237) in ccmp.', tags: 'dotless i u+0131 u+0237 soft_dotted i̍ chi̍t' },
    { page: 'letters.html#nasal', section: 'Unicode & Encoding', title: 'Superscript ⁿ (U+207F), Capital ᴺ (U+1D3A) & NFKC Danger', desc: 'Why NFKC corrupts thiⁿ into thin, why ⁿ has no uppercase mapping, and .case alignment rules.', tags: 'nasal u+207f u+1d3a nfkc nfc thiⁿ thin' },
    { page: 'letters.html#legacy', section: 'Unicode & Encoding', title: 'Legacy & Substitute Encodings (PUA, o·, ơ, ASCII)', desc: 'Middle dot U+00B7, Vietnamese horn U+01A1, PUA U+E400-E435, Windows-1252/MacRoman, numbered tones.', tags: 'legacy pua e400 middle dot horn vietnamese ơ tlpa' },
    { page: 'letters.html#ivs', section: 'Unicode & Encoding', title: 'Ideographic Variation Sequences (IVS) for Han-Lo Ruby', desc: 'ButTaiwan 字咍 taigivs cmap format 14, 8,021 IVS mappings, 8 variants (POJ, TL/KPL, HI, KN), subsetter caveats.', tags: 'ivs ruby taigivs cmap format 14 漢羅 字咍 方音 假名' },
    { page: 'letters.html#hyphens', section: 'Unicode & Encoding', title: 'Hyphens & Neutral-Tone Double Hyphen (--)', desc: 'Why -- (tńg--khì) must never become an en-dash, U+2011 non-breaking hyphen, smart-dash editor bugs.', tags: 'hyphen double hyphen neutral tone u+002d u+2011 tńg--khì' },
    { page: 'fonts.html', section: 'Core Concepts', title: 'How Fonts Implement POJ (Techniques A, B, C, D)', desc: 'Snap points (GPOS mark), precomposed ccmp ligatures, SIL spacing dot (GDEF class 1), and zero-width overstrike/fallback.', tags: 'techniques anchor ligature ccmp gpos mark gdef sil charis source sans' },
    { page: 'fonts.html#switches', section: 'How Fonts Implement POJ', title: 'Optional Features & Hidden Switches (liga, clig, case)', desc: 'Why POJ glyph building must live in ccmp and never in liga/clig, and why capital marks need contextual ccmp.', tags: 'liga clig case ccmp letter-spacing word css' },
    { page: 'fonts.html#google-fonts', section: 'How Fonts Implement POJ', title: 'Google Fonts Web Delivery & unicode-range Audit', desc: 'Verified slice audit: TASA Explorer & Source Sans 3 drop POJ marks on Google Fonts; Iansui & Huninn carry a Taigi slice; pyftsubset checklist.', tags: 'google fonts unicode-range subset pyftsubset tasa source sans iansui huninn' },
    { page: 'choose.html', section: 'Font Directory & Data', title: '24-Font Audit, Recommendations & Live Test Bench', desc: 'Free & open picks for running POJ and Han-Lo, fonts to avoid, live interactive POJ test bench, full 24-font audit matrix, and PNG specimens.', tags: 'choose pick recommend lesson one chhiu-ki charis doulos gentium tasa huninn iansui wd-xl iming genyo tauhu' },
    { page: 'choose.html#test', section: 'Font Directory & Data', title: 'Interactive POJ & KPL Test Bench', desc: 'Live editable specimen with font-size & letter-spacing controls, NFC/NFD/Reverse copy buttons, and real-time Unicode codepoint inspector.', tags: 'test bench copy nfc nfd inspector letter-spacing' },
    { page: 'choose.html#audit-explorer', section: 'Font Directory & Data', title: 'Interactive 24-Font HarfBuzz Audit Explorer', desc: 'Inspect every audited font from data/poj-font-audit.json: cmap coverage, GSUB/GPOS features, U+0358 anchors, and all 25 shaped clusters.', tags: 'audit json explorer shaping clusters gpos gsub' },
    { page: 'choose.html#specimens', section: 'Font Directory & Data', title: 'Rendered NFC vs NFD Font Specimens', desc: 'High-resolution PNG specimens comparing NFC and NFD rows across all 24 tested fonts.', tags: 'specimen png visual comparison nfc nfd' },
    { page: 'catalog.html', section: 'Font Directory & Data', title: 'Google Fonts Survey (2,067 Families) & 989 Forks', desc: 'License survey of google/fonts, 1,471-family shortlist, interactive searchable table, 55 ready families, 989 forked repos, upstream efforts.', tags: 'catalog survey license ofl rfn apache ufl shortlist forks 989 glyphsets lang nan_latn' },
    { page: 'catalog.html#shortlist-explorer', section: 'Google Fonts Survey', title: 'Interactive Shortlist Browser (1,471 Families)', desc: 'Search and filter all 1,471 open-licensed Google Fonts families by POJ status, category, variable axes, and mark feature.', tags: 'shortlist filter search google fonts noto montserrat cormorant libertinus wenkai' },
    { page: 'catalog.html#forks-explorer', section: 'Google Fonts Survey', title: 'Upstream Fork Directory (989 Repositories)', desc: 'Browse all 989 repositories forked into github.com/PehoejiFont with upstream links and family lists.', tags: 'forks tsv github upstream pull request' },
    { page: 'problems.html', section: 'Practical Guides', title: 'Troubleshooting & Platform Differences', desc: 'Symptom-by-symptom diagnosis for tofu boxes, floating dots, borrowed glyphs, dotted i̍, NFKC loss, search misses, and macOS/Windows differences.', tags: 'problems fix troubleshoot tofu box mac coretext windows directwrite pdf' },
    { page: 'makers.html', section: 'Practical Guides', title: 'Font Maker’s Implementation Guide', desc: 'Complete recipe for adding POJ & KPL to a font: glyph table, anchors, full AFDKO/feaLib code, 8 OpenType rules, vertical metrics, CFF vs TTF, variable fonts.', tags: 'makers recipe afdko fealib opentype anchors ccmp mark mkmk gdef metrics variable cff' },
    { page: 'makers.html#fea-code', section: 'Font Maker’s Guide', title: 'AFDKO / feaLib OpenType Feature Code Sketch', desc: 'Copy-ready OpenType feature code for DotlessI, POJLigatures (NFC/NFD/reverse), MarkTop, MarkTopRight, GDEF, and mkmk.', tags: 'fea afdko fealib code sketch ccmp mark mkmk gdef' },
    { page: 'tools.html', section: 'Reference', title: 'Tools, Methodology, Open Questions & Model Reviews', desc: 'All 11 CLI scripts in tools/ (audit, shape, specimen, CoreText Swift probe, SVG generator, site font builder), open questions, and Gemini 4 review log.', tags: 'tools scripts python swift coretext fonttools uharfbuzz fontbakery review methodology open questions' }
  ];

  // ── 3. DOM Ready Initialization ───────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Theme toggle
    var themeBtn = document.getElementById('theme-toggle');
    updateThemeBtn(themeBtn);
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var next = isDark() ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem('poj-theme', next);
        updateThemeBtn(themeBtn);
      });
    }

    // Mobile sidebar drawer
    var menuBtn = document.getElementById('menu-toggle');
    var backdrop = document.getElementById('sidebar-backdrop');
    function closeNav() { document.body.classList.remove('nav-open'); }
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        document.body.classList.toggle('nav-open');
      });
    }
    if (backdrop) backdrop.addEventListener('click', closeNav);

    // Heading anchors + Right TOC generation
    var main = document.querySelector('.doc-main');
    var tocList = document.getElementById('toc-list');
    if (main) {
      var headings = Array.prototype.slice.call(main.querySelectorAll('h2, h3'));
      var tocLinks = [];
      headings.forEach(function (h) {
        if (h.closest('.doc-card') || h.closest('.way')) return;
        if (!h.id) {
          h.id = h.textContent.trim().toLowerCase()
            .replace(/[^\w\u00c0-\u024f\u1e00-\u1eff\u4e00-\u9fff]+/g, '-')
            .replace(/^-+|-+$/g, '');
        }
        if (!h.querySelector('.heading-anchor')) {
          var anchor = document.createElement('a');
          anchor.className = 'heading-anchor';
          anchor.href = '#' + h.id;
          anchor.textContent = '#';
          anchor.setAttribute('aria-label', 'Link to section ' + h.textContent.trim());
          h.appendChild(anchor);
        }
        if (tocList) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + h.id;
          a.textContent = h.childNodes[0] ? h.textContent.replace(/#$/, '').trim() : h.textContent;
          if (h.tagName === 'H3') a.className = 'toc-h3';
          li.appendChild(a);
          tocList.appendChild(li);
          tocLinks.push({ id: h.id, el: h, link: a });
        }
      });

      // Scroll-spy for TOC
      if (tocLinks.length && 'IntersectionObserver' in window) {
        var activeId = tocLinks[0].id;
        var setActive = function (id) {
          activeId = id;
          tocLinks.forEach(function (item) {
            item.link.classList.toggle('active', item.id === activeId);
          });
        };
        setActive(activeId);
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) setActive(entry.target.id);
          });
        }, { rootMargin: '-72px 0px -72% 0px', threshold: 0 });
        tocLinks.forEach(function (item) { obs.observe(item.el); });
      }
    }

    // Copy buttons for .code-block
    document.querySelectorAll('.copy-code-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.code-block');
        var code = block ? block.querySelector('code') : null;
        if (!code) return;
        var orig = btn.textContent;
        copyText(code.textContent, function (ok) {
          btn.textContent = ok ? 'Copied' : 'Copy failed';
          setTimeout(function () { btn.textContent = orig; }, 1400);
        });
      });
    });

    // Search modal
    initSearch();

    // Specimen lightbox
    initLightbox();
  });

  function copyText(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(false); });
    } else {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        cb(true);
      } catch (e) { cb(false); }
    }
  }
  window.POJCopyText = copyText;

  function initSearch() {
    var trigger = document.getElementById('search-trigger');
    if (!trigger) return;

    var modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Search documentation');
    modal.innerHTML =
      '<div class="search-modal">' +
        '<div class="search-head">' +
          '<input type="search" id="doc-search-input" placeholder="Search POJ docs (e.g. U+0358, ccmp, CoreText, GenYo, 989 forks)…" autocomplete="off">' +
          '<button type="button" class="copy-code-btn" id="doc-search-close">Esc</button>' +
        '</div>' +
        '<div class="search-results" id="doc-search-results"></div>' +
      '</div>';
    document.body.appendChild(modal);

    var input = modal.querySelector('#doc-search-input');
    var results = modal.querySelector('#doc-search-results');
    var closeBtn = modal.querySelector('#doc-search-close');

    function render(q) {
      var terms = (q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      var matches = SEARCH_INDEX.filter(function (item) {
        if (!terms.length) return true;
        var hay = (item.title + ' ' + item.section + ' ' + item.desc + ' ' + item.tags).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      }).slice(0, 14);

      if (!matches.length) {
        results.innerHTML = '<div class="search-empty">No matching documentation sections found.</div>';
        return;
      }
      results.innerHTML = matches.map(function (m) {
        return '<a class="search-item" href="' + m.page + '">' +
          '<div class="search-item-title">' + escapeHtml(m.title) + '</div>' +
          '<div class="search-item-meta">' + escapeHtml(m.section) + ' — ' + escapeHtml(m.desc) + '</div>' +
        '</a>';
      }).join('');
    }

    function open() {
      modal.classList.add('open');
      render(input.value);
      setTimeout(function () { input.focus(); input.select(); }, 10);
    }
    function close() {
      modal.classList.remove('open');
    }

    trigger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    input.addEventListener('input', function () { render(input.value); });
    results.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      } else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)) {
        e.preventDefault();
        open();
      } else if (e.key === 'Escape' && modal.classList.contains('open')) {
        close();
      }
    });
  }

  function initLightbox() {
    var imgs = document.querySelectorAll('.specimen-fig img');
    if (!imgs.length) return;
    var lb = document.createElement('div');
    lb.className = 'lightbox-backdrop';
    lb.innerHTML = '<img alt="Enlarged specimen">';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img');
    imgs.forEach(function (img) {
      img.addEventListener('click', function () {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lb.classList.add('open');
      });
    });
    lb.addEventListener('click', function () { lb.classList.remove('open'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) lb.classList.remove('open');
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  window.POJEscapeHtml = escapeHtml;
})();
