/* PehoejiFont Documentation Shell — zero-dependency static doc chrome (EN & zh-TW):
   - Theme persistence & localized toggle
   - Mobile sidebar drawer
   - Hash-preserving language switch (EN <-> zh-TW)
   - Auto-generated "On this page" TOC with IntersectionObserver scroll-spy
   - Heading permalink anchors & Copy buttons for code blocks
   - Instant client-side search across all documentation pages (Cmd/Ctrl+K or /)
   - Image lightbox for specimens */
(function () {
  'use strict';

  var root = document.documentElement;
  var IS_ZH = (root.getAttribute('lang') || '').toLowerCase().indexOf('zh') === 0;

  var UI = IS_ZH ? {
    light: '☀ 亮色',
    dark: '☾ 暗色',
    toLight: '切換為亮色主題',
    toDark: '切換為暗色主題',
    copied: '已複製',
    copyFailed: '複製失敗',
    searchPlaceholder: '搜尋 POJ 文件（例：U+0358、ccmp、CoreText、源樣明體、989）…',
    searchEmpty: '找不到符合的文件章節。',
    searchLabel: '搜尋文件',
    anchorLabel: '此章節連結：',
    enlargedAlt: '放大檢視字型樣張'
  } : {
    light: '☀ Light',
    dark: '☾ Dark',
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    searchPlaceholder: 'Search POJ docs (e.g. U+0358, ccmp, CoreText, GenYo, 989 forks)…',
    searchEmpty: 'No matching documentation sections found.',
    searchLabel: 'Search documentation',
    anchorLabel: 'Link to section ',
    enlargedAlt: 'Enlarged specimen'
  };

  // ── 1. Theme handling ─────────────────────────────────────────────────────
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
    btn.textContent = isDark() ? UI.light : UI.dark;
    btn.setAttribute('aria-label', isDark() ? UI.toLight : UI.toDark);
  }

  // ── 2. Site-wide search index (EN & zh-TW) ────────────────────────────────
  var SEARCH_INDEX_EN = [
    { page: './', section: 'Overview', title: 'POJ Font Documentation — Overview', desc: 'Why Taigi Pe̍h-ōe-jī letters like o͘ and a̍ break, visual font comparison, short answers, and documentation map.', tags: 'start home poj o͘ hō͘ chia̍h thiⁿ n̂g genyo lesson one arial helvetica eb garamond' },
    { page: 'letters.html', section: 'Core Concepts', title: 'Unicode & Encoding for POJ', desc: 'How computers store POJ letters as base + combining marks, precomposed Unicode 17.0 matrix, ccc ordering, shaping engines.', tags: 'u+0358 u+030d u+207f u+1d3a unicode nfc nfd combining marks' },
    { page: 'letters.html#precomposed', section: 'Unicode & Encoding', title: 'Precomposed Unicode 17.0 Matrix & Stability Policy', desc: 'Which POJ combinations exist precomposed, why Unicode will never add precomposed o͘ (2001/2005 policies).', tags: 'precomposed unicodedata ḿ ǹ stability policy 2005' },
    { page: 'letters.html#canonical', section: 'Unicode & Encoding', title: 'Canonical Combining Classes (ccc 230 vs 232) & Mark Order', desc: 'Why tone marks (ccc=230) sort before U+0358 (ccc=232), NFC of o̍͘, and how HarfBuzz normalises before GSUB.', tags: 'ccc 230 232 canonical ordering nfc nfd o̍͘ ó͘' },
    { page: 'letters.html#shapers', section: 'Unicode & Encoding', title: 'Shaping Engines: HarfBuzz, CoreText & DirectWrite', desc: 'HarfBuzz 5-stage pipeline, all-or-nothing fallback positioning rule, CoreText AAT tables, DirectWrite differences, optional liga/case switches.', tags: 'harfbuzz coretext directwrite fallback ccmp liga clig case letter-spacing word' },
    { page: 'letters.html#dotted-i', section: 'Unicode & Encoding', title: 'Soft_Dotted i & j (Dotless ı Swap)', desc: 'Why i̍ must drop the dot via dotlessi (U+0131) and uni0237 (U+0237) in ccmp.', tags: 'dotless i u+0131 u+0237 soft_dotted i̍ chi̍t' },
    { page: 'letters.html#nasal', section: 'Unicode & Encoding', title: 'Superscript ⁿ (U+207F), Capital ᴺ (U+1D3A) & NFKC Danger', desc: 'Why NFKC corrupts thiⁿ into thin, why ⁿ has no uppercase mapping, and .case alignment rules.', tags: 'nasal u+207f u+1d3a nfkc nfc thiⁿ thin' },
    { page: 'letters.html#legacy', section: 'Unicode & Encoding', title: 'Legacy & Substitute Encodings (PUA, o·, ơ, ASCII)', desc: 'Middle dot U+00B7, Vietnamese horn U+01A1, PUA U+E400-E435, Windows-1252/MacRoman, numbered tones.', tags: 'legacy pua e400 middle dot horn vietnamese ơ' },
    { page: 'letters.html#ivs', section: 'Unicode & Encoding', title: 'Ideographic Variation Sequences (IVS) for Han-Lo Ruby', desc: 'ButTaiwan 字咍 taigivs cmap format 14, 8,021 IVS mappings for POJ ruby above Han characters, subsetter caveats.', tags: 'ivs ruby taigivs cmap format 14 漢羅 字咍 方音 假名' },
    { page: 'letters.html#hyphens', section: 'Unicode & Encoding', title: 'Hyphens & Neutral-Tone Double Hyphen (--)', desc: 'Why -- (tńg--khì) must never become an en-dash, U+2011 non-breaking hyphen, smart-dash editor bugs.', tags: 'hyphen double hyphen neutral tone u+002d u+2011 tńg--khì' },
    { page: 'fonts.html', section: 'Core Concepts', title: 'How Fonts Implement POJ (Techniques A, B, C, D)', desc: 'Snap points (GPOS mark), precomposed ccmp ligatures, SIL spacing dot (GDEF class 1), and zero-width overstrike/fallback.', tags: 'techniques anchor ligature ccmp gpos mark gdef sil charis source sans' },
    { page: 'fonts.html#switches', section: 'How Fonts Implement POJ', title: 'Optional Features & Hidden Switches (liga, clig, case)', desc: 'Why POJ glyph building must live in ccmp and never in liga/clig, and why capital marks need contextual ccmp.', tags: 'liga clig case ccmp letter-spacing word css' },
    { page: 'fonts.html#google-fonts', section: 'How Fonts Implement POJ', title: 'Google Fonts Web Delivery & unicode-range Audit', desc: 'Verified slice audit: TASA Explorer & Source Sans 3 drop POJ marks on Google Fonts; Iansui & Huninn carry a Taigi slice; pyftsubset checklist.', tags: 'google fonts unicode-range subset pyftsubset tasa source sans iansui huninn' },
    { page: 'choose.html', section: 'Font Directory & Data', title: '24-Font Audit, Recommendations & Live Test Bench', desc: 'Free & open picks for running POJ and Han-Lo, fonts to avoid, live interactive POJ test bench, full 24-font audit matrix, and PNG specimens.', tags: 'choose pick recommend lesson one chhiu-ki charis doulos gentium tasa huninn iansui wd-xl iming genyo tauhu' },
    { page: 'test.html', section: 'Getting Started', title: 'Live POJ Test Bench', desc: 'Live editable specimen with font preview, font-size & letter-spacing controls, NFC/NFD/Reverse copy buttons, and real-time Unicode codepoint inspector.', tags: 'test bench copy nfc nfd inspector letter-spacing' },
    { page: 'showcase.html', section: 'Getting Started', title: '87 Open-Source Fonts Upgraded with POJ', desc: 'Interactive live preview, HarfBuzz specimens, and WOFF2/TTF downloads for 87 open-source Google Fonts families upgraded with native POJ support across 9 batches.', tags: 'showcase 87 fonts batches alata aleo archivo barlow bricolage adlam display akaya kanadaka akaya telivigala akshar akt alegreya sans sc alexandria alien block allison allura alumni sans collegiate one sc alumni sans inline one alumni sans pinstripe alumni sans sc alyamama amarna amita anaheim anton sc antonio anybody ar one sans archivo narrow are you serious arima arizonia arsenal sc asap condensed asimovian asset atkinson hyperlegible mono atkinson hyperlegible next average azeret mono babylonica badeen display bahianita bai jamjuree ballet be vietnam pro beau rivage bellota text besley bevan big shoulders text sc bilbo birthstone birthstone bounce biz udpgothic biz udpmincho black ops one blaka ink bodoni moda sc boldonse bona nova sc bonheur royale brawler brygada 1918 buenard caacupe one cabin condensed cal sans caladea calistoga capriola caramel carattere download woff2 ttf' },
    { page: 'choose.html#audit-explorer', section: 'Font Directory & Data', title: 'Interactive 24-Font HarfBuzz Audit Explorer', desc: 'Inspect every audited font: cmap coverage, GSUB/GPOS features, U+0358 anchors, and all shaped POJ clusters.', tags: 'audit json explorer shaping clusters gpos gsub' },
    { page: 'choose.html#specimens', section: 'Font Directory & Data', title: 'Rendered NFC vs NFD Font Specimens', desc: 'High-resolution PNG specimens comparing NFC and NFD rows across all tested fonts.', tags: 'specimen png visual comparison nfc nfd' },
    { page: 'catalog.html', section: 'Font Directory & Data', title: 'Google Fonts Survey (2,067 Families) & 989 Forks', desc: 'License survey of google/fonts, 1,471-family shortlist, interactive searchable table, 55 ready families, 989 forked repos, upstream efforts.', tags: 'catalog survey license ofl rfn apache ufl shortlist forks 989 glyphsets lang nan_latn' },
    { page: 'catalog.html#shortlist-explorer', section: 'Google Fonts Survey', title: 'Interactive Shortlist Browser (1,471 Families)', desc: 'Search and filter all 1,471 open-licensed Google Fonts families by POJ status, category, variable axes, and mark feature.', tags: 'shortlist filter search google fonts noto montserrat cormorant libertinus wenkai' },
    { page: 'catalog.html#forks-explorer', section: 'Google Fonts Survey', title: 'Upstream Fork Directory (989 Repositories)', desc: 'Browse all 989 repositories forked into github.com/PehoejiFont with upstream links and family lists.', tags: 'forks tsv github upstream pull request' },
    { page: 'problems.html', section: 'Practical Guides', title: 'Troubleshooting & Platform Differences', desc: 'Symptom-by-symptom diagnosis for tofu boxes, floating dots, borrowed glyphs, dotted i̍, NFKC loss, search misses, and macOS/Windows differences.', tags: 'problems fix troubleshoot tofu box mac coretext windows directwrite pdf' },
    { page: 'makers.html', section: 'Practical Guides', title: 'Font Maker’s Implementation Guide', desc: 'Complete recipe for adding POJ to a font: glyph table, anchors, full AFDKO/feaLib code, 8 OpenType rules, vertical metrics, CFF vs TTF, variable fonts.', tags: 'makers recipe afdko fealib opentype anchors ccmp mark mkmk gdef metrics variable cff' },
    { page: 'makers.html#fea-code', section: 'Font Maker’s Guide', title: 'AFDKO / feaLib OpenType Feature Code Sketch', desc: 'Copy-ready OpenType feature code for DotlessI, POJLigatures (NFC/NFD/reverse), MarkTop, MarkTopRight, GDEF, and mkmk.', tags: 'fea afdko fealib code sketch ccmp mark mkmk gdef' }
  ];

  var SEARCH_INDEX_ZH = [
    { page: './', section: '總覽', title: '台語白話字（POJ）字型技術文件 — 總覽', desc: '為什麼 o͘ 與 a̍ 在許多字型會破版？五款字型實測對照、快速解答與完整文件導覽。', tags: '首頁 總覽 白話字 poj o͘ hō͘ chia̍h thiⁿ n̂g 源樣明體 lesson one arial helvetica eb garamond' },
    { page: 'letters.html', section: '核心原理', title: 'Unicode 編碼與字元結構（POJ）', desc: '電腦如何以基礎字母＋組合附加符號儲存白話字、Unicode 17.0 預組字表、ccc 排序與整形引擎流程。', tags: 'u+0358 u+030d u+207f u+1d3a unicode nfc nfd 組合附加符號' },
    { page: 'letters.html#precomposed', section: 'Unicode 與編碼', title: 'Unicode 17.0 預組字元矩陣與穩定性政策', desc: 'POJ 哪些調號字母有預組字元，以及為何 Unicode 永遠不會新增預組 o͘（2001/2005 政策）。', tags: '預組字元 unicodedata ḿ ǹ 穩定性政策 2005' },
    { page: 'letters.html#canonical', section: 'Unicode 與編碼', title: '標準組合類別（ccc 230 與 232）與調號順序', desc: '為什麼聲調（ccc=230）排在右點 U+0358（ccc=232）之前、o̍͘ 的 NFC 形式，以及 HarfBuzz 的預正規化。', tags: 'ccc 230 232 正規化 順序 nfc nfd o̍͘ ó͘' },
    { page: 'letters.html#shapers', section: 'Unicode 與編碼', title: '整形引擎比較：HarfBuzz、CoreText 與 DirectWrite', desc: 'HarfBuzz 五階段管線、全有或全無的備援定位規則、macOS CoreText AAT 與 Windows DirectWrite 差異。', tags: 'harfbuzz coretext directwrite 備援 定位 ccmp liga clig case letter-spacing word' },
    { page: 'letters.html#dotted-i', section: 'Unicode 與編碼', title: 'Soft_Dotted i 與 j（無點 ı 替換）', desc: '為什麼 i̍ 必須透過 ccmp 替換為無點 dotlessi（U+0131）與 uni0237（U+0237）。', tags: '無點 dotless i u+0131 u+0237 soft_dotted i̍ chi̍t' },
    { page: 'letters.html#nasal', section: 'Unicode 與編碼', title: '鼻化上標 ⁿ（U+207F）、大寫 ᴺ（U+1D3A）與 NFKC 風險', desc: '為什麼 NFKC 會把 thiⁿ 變成 thin、無大寫對應問題與 .case 對齊規範。', tags: '鼻化 u+207f u+1d3a nfkc nfc thiⁿ thin' },
    { page: 'letters.html#legacy', section: 'Unicode 與編碼', title: '舊式與替代編碼（PUA、o·、ơ、ASCII）', desc: '中圓點 U+00B7、越南語帶角 o（U+01A1）、私用區 U+E400–E435、舊 8-bit 編碼與數字調號。', tags: '舊編碼 pua e400 中圓點 越南 ơ 私用區' },
    { page: 'letters.html#ivs', section: 'Unicode 與編碼', title: '異體字選擇器序列（IVS）漢羅注音字型', desc: 'ButTaiwan 字咍 taigivs 的 cmap format 14、8,021 筆 IVS 對應（白話字、方音、假名）。', tags: 'ivs ruby taigivs cmap format 14 漢羅 字咍 方音 假名 注音' },
    { page: 'letters.html#hyphens', section: 'Unicode 與編碼', title: '連字號與輕聲雙連字號（--）', desc: '為什麼 tńg--khì 的 -- 絕不能變成破折號、U+2011 不換行連字號與文書軟體自動取代問題。', tags: '連字號 雙連字號 輕聲 u+002d u+2011 tńg--khì' },
    { page: 'fonts.html', section: '核心原理', title: '字型實作白話字的四種技術（A、B、C、D）', desc: 'GPOS 錨點、ccmp 預繪連字、SIL 佔位圓點（GDEF 類別 1）與固定疊印／引擎備援。', tags: '實作 技術 錨點 連字 ccmp gpos mark gdef sil charis source sans' },
    { page: 'fonts.html#switches', section: '字型實作方式', title: '可關閉的隱藏開關（liga、clig、case）', desc: '為什麼 POJ 組字絕不能放在 liga/clig，以及為什麼大寫調號不能只靠 case。', tags: 'liga clig case ccmp letter-spacing word css 字距' },
    { page: 'fonts.html#google-fonts', section: '字型實作方式', title: 'Google Fonts 網頁切塊（unicode-range）實測', desc: 'TASA Explorer 與 Source Sans 3 在 Google Fonts 被刪掉 POJ 調號；芫荽與粉圓內含台語切塊；pyftsubset 保留清單。', tags: 'google fonts unicode-range 子集化 pyftsubset tasa source sans 芫荽 粉圓' },
    { page: 'choose.html', section: '字型目錄與資料', title: '24 款字型實測、推薦清單與即時測試台', desc: '純白話字與漢羅開源字型推薦、避雷清單、即時測試台、24 款字型完整檢驗與 NFC/NFD 樣張。', tags: '推薦 選字型 lesson one chhiu-ki charis doulos gentium tasa 粉圓 芫荽 滑油字 一點明體 源樣明體 豆腐烏' },
    { page: 'test.html', section: '開始使用', title: '即時 POJ 字型測試台與編碼檢視器', desc: '支援即時切換本機字型、字級與 letter-spacing、NFC／NFD／反向順序複製與逐字 U+XXXX 檢視。', tags: '測試台 複製 nfc nfd 編碼檢視器 letter-spacing' },
    { page: 'showcase.html', section: '開始使用', title: '87 套升級支援白話字（POJ）的開源字型展示', desc: '共 9 批 87 套開源字型原生支援白話字（POJ），含即時預覽、HarfBuzz 輪廓樣張與 WOFF2／TTF 下載。', tags: '展示 87 套 alata aleo archivo barlow bricolage adlam display akaya kanadaka akaya telivigala akshar akt alegreya sans sc alexandria alien block allison allura alumni sans collegiate one sc alumni sans inline one alumni sans pinstripe alumni sans sc alyamama amarna amita anaheim anton sc antonio anybody ar one sans archivo narrow are you serious arima arizonia arsenal sc asap condensed asimovian asset atkinson hyperlegible mono atkinson hyperlegible next average azeret mono babylonica badeen display bahianita bai jamjuree ballet be vietnam pro beau rivage bellota text besley bevan big shoulders text sc bilbo birthstone birthstone bounce biz udpgothic biz udpmincho black ops one blaka ink bodoni moda sc boldonse bona nova sc bonheur royale brawler brygada 1918 buenard caacupe one cabin condensed cal sans caladea calistoga capriola caramel carattere 下載 woff2 ttf' },
    { page: 'choose.html#audit-explorer', section: '字型目錄與資料', title: '24 款字型 HarfBuzz 互動檢驗器', desc: '直接查詢每款字型的 cmap 覆蓋、GSUB/GPOS 功能、U+0358 錨點與各 POJ 音節實測結果。', tags: 'audit json 互動 檢驗 整形 音節 gpos gsub' },
    { page: 'choose.html#specimens', section: '字型目錄與資料', title: '高解析度 NFC vs NFD 渲染樣張', desc: '三張完整 PNG 樣張，逐字型並列對照 NFC 與 NFD 兩行渲染結果。', tags: '樣張 specimen png 對照 nfc nfd' },
    { page: 'catalog.html', section: '字型目錄與資料', title: 'Google Fonts 普查（2,067 款）與 989 個上游 Fork', desc: '授權與保留名稱普查、1,471 款候選清單互動搜尋、55 款已有字元清單、989 個 GitHub Fork 與上游標準推動。', tags: '普查 授權 ofl rfn apache ufl 候選清單 forks 989 glyphsets lang nan_latn' },
    { page: 'catalog.html#shortlist-explorer', section: 'Google Fonts 普查', title: '1,471 款候選字型互動篩選表', desc: '依 POJ 狀態、分類、可變字型軸與 GPOS mark 篩選全部 1,471 款開源 Google Fonts 字型。', tags: '候選清單 篩選 搜尋 google fonts noto montserrat cormorant libertinus wenkai' },
    { page: 'catalog.html#forks-explorer', section: 'Google Fonts 普查', title: '989 個上游 Fork 儲存庫清單', desc: '瀏覽 PehoejiFont 組織底下全部 989 個 Fork 與對應上游字型專案。', tags: 'forks tsv github 上游 pull request' },
    { page: 'problems.html', section: '實務指南', title: '疑難排解與跨平台（Mac / Windows）差異', desc: '11 種常見故障症狀診斷：豆腐字、浮動圓點、單字補字、i̍ 殘留點、字距破版、NFKC 遺失鼻化、PDF 亂碼與引擎差異。', tags: '疑難排解 故障 豆腐字 mac coretext windows directwrite pdf 搜尋' },
    { page: 'makers.html', section: '實務指南', title: '字型開發者實作指南（OpenType 配方）', desc: '新增 POJ 支援的完整配方：字形與 cmap、錨點、AFDKO/feaLib 程式碼範本、8 條規則、垂直度量與測試流程。', tags: '字型開發 配方 afdko fealib opentype 錨點 ccmp mark mkmk gdef 度量 可變字型 cff' },
    { page: 'makers.html#fea-code', section: '字型開發者指南', title: 'AFDKO / feaLib OpenType 功能程式碼範本', desc: '可直接複製的 DotlessI、POJLigatures（NFC/NFD/反向）、MarkTop、MarkTopRight、GDEF 與 mkmk 範本。', tags: 'fea afdko fealib 程式碼 範本 ccmp mark mkmk gdef' }
  ];

  var SEARCH_INDEX = IS_ZH ? SEARCH_INDEX_ZH : SEARCH_INDEX_EN;

  // ── 3. DOM Ready Initialization ───────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
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

    document.querySelectorAll('a.lang-switch').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.location.hash && a.href.indexOf('#') === -1) {
          a.href = a.getAttribute('href') + window.location.hash;
        }
      });
    });

    var menuBtn = document.getElementById('menu-toggle');
    var backdrop = document.getElementById('sidebar-backdrop');
    function closeNav() { document.body.classList.remove('nav-open'); }
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        document.body.classList.toggle('nav-open');
      });
    }
    if (backdrop) backdrop.addEventListener('click', closeNav);

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
          anchor.setAttribute('aria-label', UI.anchorLabel + h.textContent.trim());
          h.appendChild(anchor);
        }
        if (tocList) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + h.id;
          a.textContent = h.textContent.replace(/#$/, '').trim();
          if (h.tagName === 'H3') a.className = 'toc-h3';
          li.appendChild(a);
          tocList.appendChild(li);
          tocLinks.push({ id: h.id, el: h, link: a });
        }
      });

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

    document.querySelectorAll('.copy-code-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.code-block');
        var code = block ? block.querySelector('code') : null;
        if (!code) return;
        var orig = btn.textContent;
        copyText(code.textContent, function (ok) {
          btn.textContent = ok ? UI.copied : UI.copyFailed;
          setTimeout(function () { btn.textContent = orig; }, 1400);
        });
      });
    });

    initSearch();
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
    modal.setAttribute('aria-label', UI.searchLabel);
    modal.innerHTML =
      '<div class="search-modal">' +
        '<div class="search-head">' +
          '<input type="search" id="doc-search-input" placeholder="' + escapeHtml(UI.searchPlaceholder) + '" autocomplete="off">' +
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
        results.innerHTML = '<div class="search-empty">' + escapeHtml(UI.searchEmpty) + '</div>';
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
    lb.innerHTML = '<img alt="' + escapeHtml(UI.enlargedAlt) + '">';
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
