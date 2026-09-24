/* docs-kit runtime. One tag is enough:
     <script src="https://cdn.jsdelivr.net/npm/@tannc26/docs-kit@<version>/doc.js"></script>   (in <head>, or with defer)
   It links doc.css itself when the page has not, and keeps the page hidden until the stylesheet arrives.
   Features are opt-in by markup, so a doc only writes content:
     <doc-md> / <script type="text/markdown"> -> Markdown, rendered first. Fences: mermaid, chart <type>, table|csv|tsv,
                                 math, vega-lite, openapi, cast|terminal, cron, any code language. Also [^1] footnotes,
                                 $inline$ / $$block$$ maths, and GitHub alerts (> [!NOTE]) as callouts
     .kpis[data-count]           -> KPI numbers count up when scrolled into view
     no .page/main skeleton      -> content is wrapped in main + a sidebar TOC
     main h2, h3                 -> sidebar TOC + scrollspy + anchor links (ids generated from the text when missing)
     a bare <table> in main      -> styled; more than 5 columns becomes a wide table; headers sort
     pre.mermaid                 -> Mermaid is loaded on demand
     table[data-sortable]        -> click a header to sort
     .filters[data-target] .btn[data-filter] + [data-tags] -> tag filter
     input/textarea[name] in main -> saved to localStorage per file
     [data-action="export"]      -> copies decisions + notes as markdown
     [data-action="reset"|"theme"|"print"]
     [data-reveal="delayMs"]      -> fades in when scrolled into view
     <doc-*> custom elements      -> components/<name>.js + .css loaded only when the tag is on the page
   Components use window.Docs: { shared, esc, toast, fail, loadScript, loadCss, lib, rows, enhance, mermaid, theme, t, icon,
   button, player, stepper }. A doc's own <script> that needs Docs runs on the 'docs:ready' event (or at once when
   Docs.ready is true). Every visible string goes through Docs.t(key) — English defaults, overridable per doc via #doc-labels.
*/
(() => {
  const SHARED = (document.currentScript?.src || '').replace(/\/doc\.js(\?.*)?$/, '');

  // One-tag setup: a page that links only doc.js gets doc.css too. The page stays hidden until the stylesheet
  // arrives (at most 4 s), so it never flashes unstyled when doc.js runs in <head>.
  if (SHARED && !document.querySelector('link[rel="stylesheet"][href$="/doc.css"], link[rel="stylesheet"][href="doc.css"]')) {
    const root = document.documentElement;
    const hide = Object.assign(document.createElement('style'), { textContent: 'html.docs-css-wait{visibility:hidden}' });
    const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${SHARED}/doc.css` });
    const show = () => root.classList.remove('docs-css-wait');
    root.classList.add('docs-css-wait');
    css.onload = css.onerror = show;
    setTimeout(show, 4000);
    (document.head || root).append(hide, css);
  }
  const STORE_KEY = 'docs:' + location.pathname;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- labels: every string the kit shows. English defaults; a doc overrides any key with
  //   <script type="application/json" id="doc-labels">{"play": "Run", "all": "Show every step"}</script>
  // Values are plain strings; {name} placeholders are filled from the vars passed to Docs.t(). ----------
  const LABELS = {
    toc: 'Contents', themeButton: 'Theme', printButton: 'Print',
    tour: 'Take the tour', done: 'Done',
    'alert.note': 'Note', 'alert.tip': 'Tip', 'alert.important': 'Important', 'alert.warning': 'Warning', 'alert.caution': 'Caution',
    play: 'Play', pause: 'Pause', prev: 'Previous step', next: 'Next step', all: 'All steps',
    step: 'Step {n}', steps: '{n} steps', stepOf: '{i} / {n}', seqIdle: '{n} steps · press play to walk through',
    drawing: 'Drawing diagram…',
    filterRows: 'Filter rows…', rows: '{shown} / {total} rows', hideGroup: 'Hide {label}', expandHeight: 'Expand height',
    scrollLeft: 'Scroll left', scrollRight: 'Scroll right',
    fit: 'Fit', zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset', zoomHint: 'Drag to pan · Ctrl + wheel to zoom',
    graphHint: 'Click a node to read its note.',
    expandAll: 'Expand all', collapseAll: 'Collapse all', copy: 'Copy', copied: '{what} copied',
    note: 'Note {n}', noTerms: 'No terms on this page yet.', before: 'Before', after: 'After',
    feedbackCopied: 'Feedback copied — paste it where it is needed', copyFailed: 'Copy failed', cleared: 'Cleared', theme: 'Theme: {t}',
  };
  try {
    const o = document.getElementById('doc-labels');
    if (o) Object.assign(LABELS, JSON.parse(o.textContent));
  } catch (e) { console.error('[docs] #doc-labels is not valid JSON:', e.message); }
  const t = (key, vars = {}) => String(LABELS[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

  // ---------- icons: path data copied from Lucide 1.46.0 (ISC, vendor/lucide) so controls render synchronously,
  // without loading the 440 KB icon library for a handful of glyphs. Regenerate from the vendored file, don't hand-draw. ----------
  const ICONS = {
    play: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
    pause: '<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>',
    prev: '<path d="m15 18-6-6 6-6"/>',
    next: '<path d="m9 18 6-6-6-6"/>',
    list: '<path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    expand: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
    eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    down: '<path d="m7 6 5 5 5-5"/><path d="m7 13 5 5 5-5"/>',
    up: '<path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/>',
    menu: '<path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>',
    search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  };
  const icon = name => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  // <button class="btn"> with an icon; text is shown unless `iconOnly`, and is always the accessible name.
  const button = (action, iconName, label, { iconOnly = false, cls = '' } = {}) =>
    `<button type="button" class="btn${iconOnly ? ' icon' : ''}${cls ? ' ' + cls : ''}" data-a="${action}" aria-label="${esc(label)}"${iconOnly ? ` title="${esc(label)}"` : ''}>${iconName ? icon(iconName) : ''}${iconOnly ? '' : `<span>${esc(label)}</span>`}</button>`;

  // Transport bar shared by doc-steps, doc-seq and doc-flow: ◀ ▶/❚❚ ▶ · progress track · counter · [All].
  function player({ all = false } = {}) {
    const el = document.createElement('div');
    el.className = 'dk-player';
    el.innerHTML = '<div class="dk-transport">'
      + button('prev', 'prev', t('prev'), { iconOnly: true })
      + `<button type="button" class="btn dk-play" data-a="play" aria-label="${esc(t('play'))}" title="${esc(t('play'))}">${icon('play')}</button>`
      + button('next', 'next', t('next'), { iconOnly: true })
      + '</div><div class="dk-track" aria-hidden="true"><i></i></div><span class="dk-count"></span><span class="dk-text"></span>'
      + (all ? button('all', 'list', t('all'), { cls: 'dk-all' }) : '');
    const q = s => el.querySelector(s);
    return {
      el,
      at(i, n) {
        q('.dk-count').textContent = t('stepOf', { i: i + 1, n });
        q('.dk-track i').style.width = `${((i + 1) / n) * 100}%`;
        q('.dk-all')?.setAttribute('aria-pressed', 'false');
      },
      whole(n) {
        q('.dk-count').textContent = t('steps', { n });
        q('.dk-track i').style.width = '100%';
        q('.dk-all')?.setAttribute('aria-pressed', 'true');
      },
      text(s) { q('.dk-text').textContent = s || ''; },
      playing(on) {
        const b = q('.dk-play');
        b.innerHTML = icon(on ? 'pause' : 'play');
        b.classList.toggle('on', on);
        b.setAttribute('aria-label', t(on ? 'pause' : 'play'));
        b.title = t(on ? 'pause' : 'play');
      },
    };
  }

  // Step pills joined by a progress line: done steps turn into ticks, the current one glows.
  function stepper(labels) {
    const el = document.createElement('div');
    el.className = 'dk-stepper';
    el.innerHTML = labels.map((l, i) => (i ? '<i class="dk-sep" aria-hidden="true"></i>' : '')
      + `<button type="button" class="dk-step" data-i="${i}"><b><span>${i + 1}</span>${icon('check')}</b><em>${esc(l || t('step', { n: i + 1 }))}</em></button>`).join('');
    const steps = [...el.querySelectorAll('.dk-step')], seps = [...el.querySelectorAll('.dk-sep')];
    return {
      el,
      at(i) {
        steps.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('done', i >= 0 && k < i); s.setAttribute('aria-current', k === i ? 'step' : 'false'); });
        seps.forEach((s, k) => s.classList.toggle('done', i >= 0 && k < i));
        const cur = steps[i];
        if (cur && el.scrollWidth > el.clientWidth) el.scrollTo({ left: cur.offsetLeft - el.clientWidth / 2 + cur.offsetWidth / 2, behavior: 'smooth' });
      },
    };
  }

  // Range inputs paint their filled part from --pct (see doc.css input[type=range]).
  function rangeFill(r) {
    const min = +r.min || 0, max = r.max === '' ? 100 : +r.max;
    r.style.setProperty('--pct', `${((+r.value - min) / ((max - min) || 1)) * 100}%`);
  }

  const store = {
    load() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; } },
    save(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* storage blocked */ } },
  };

  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.append(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // A heading without an id gets one from its text: lowercase ASCII, accents folded, unique on the page.
  const slug = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
  function ensureId(h) {
    if (h.id) return h.id;
    const base = slug(h.textContent);
    let id = base;
    for (let n = 2; document.getElementById(id); n++) id = `${base}-${n}`;
    h.id = id;
    return id;
  }

  function buildToc() {
    const main = $('main'); const toc = $('.toc nav');
    if (!main || !toc) return;
    const hs = $$('h2, h3', main).filter(h => !h.closest('.uc, .card, details, doc-tabs, doc-steps'));
    hs.forEach(h => {
      const id = ensureId(h);
      const a = document.createElement('a');
      const num = h.querySelector('.num');
      const label = [...h.childNodes].filter(n => n !== num).map(n => n.textContent).join('').trim();
      a.href = '#' + id; a.textContent = num ? `${num.textContent.trim()}  ${label}` : label;
      a.className = h.tagName === 'H3' ? 'l3' : 'l2';
      toc.append(a);
      const link = document.createElement('a');
      link.href = '#' + id; link.className = 'anchor'; link.textContent = '#'; link.setAttribute('aria-hidden', 'true');
      h.append(link);
    });
    // anchor text must not leak into the TOC label, so it is appended after the TOC read the heading
    const links = $$('a', toc);
    const byId = new Map(links.map(a => [a.hash.slice(1), a]));
    const panel = toc.closest('.toc');
    tocToggle(panel);
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.classList.remove('active'));
        const a = byId.get(e.target.id);
        if (!a) return;
        a.classList.add('active');
        centerInPanel(panel, a);
      });
    }, { rootMargin: '0px 0px -75% 0px' });
    hs.forEach(h => io.observe(h));
  }

  // Scrolls only the sidebar's own box; scrollIntoView would also scroll the page when the sidebar sits above the content (phone).
  function centerInPanel(panel, a) {
    if (panel.scrollHeight <= panel.clientHeight) return;
    panel.scrollTop = a.offsetTop - panel.clientHeight / 2;
  }

  // The sidebar is hidden by default; the floating button shows/hides it as a real column that pushes the content.
  function tocToggle(panel) {
    const page = panel.closest('.page') || document.body;
    const btn = document.createElement('button');
    btn.className = 'toc-toggle'; btn.type = 'button'; btn.innerHTML = `${icon('menu')}<span>${esc(t('toc'))}</span>`;
    btn.setAttribute('aria-expanded', 'false');
    document.body.append(btn);
    btn.addEventListener('click', () => {
      const open = page.classList.toggle('toc-open');
      btn.setAttribute('aria-expanded', String(open));
      const active = panel.querySelector('nav a.active');
      if (open && active) centerInPanel(panel, active);
    });
  }

  function currentTheme() {
    const t = document.documentElement.dataset.theme;
    if (t) return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function initTheme() {
    try { const t = localStorage.getItem('docs:theme'); if (t) document.documentElement.dataset.theme = t; } catch {}
  }

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('docs:theme', next); } catch {}
    toast(t('theme', { t: next }));
    if ($('pre.mermaid, doc-seq, doc-chart, doc-graph, doc-code, doc-diff, doc-map, doc-mark')) location.reload(); // these bake theme colors in at render time
  }

  // ---------- asset loading: every script/stylesheet is fetched once, whoever asks ----------
  const assets = new Map();
  function loadScript(src) {
    if (!assets.has(src)) assets.set(src, new Promise((ok, err) => {
      const s = Object.assign(document.createElement('script'), { src });
      s.onload = ok; s.onerror = () => err(new Error('cannot load ' + src));
      document.head.append(s);
    }));
    return assets.get(src);
  }
  function loadCss(href) {
    if (!assets.has(href)) assets.set(href, new Promise(ok => {
      const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
      l.onload = l.onerror = ok;
      document.head.append(l);
    }));
    return assets.get(href);
  }

  // A broken block must be visible in the page, not only in the console.
  function fail(el, msg) {
    const box = Object.assign(document.createElement('div'), { className: 'doc-error', textContent: msg });
    el.replaceChildren(box);
    console.error('[docs]', msg);
  }

  // Third-party libraries, pinned in vendor/manifest.json (fetched by bin/vendor-fetch.py).
  // Scripts load in the listed order; `needs` load first. Upgrading a library = edit this table + the manifest.
  const LIBS = {
    mermaid: { js: ['mermaid/11.17.2/mermaid.min.js'] },
    hljs: { js: ['highlightjs/11.12.0/highlight.min.js'] },  // common languages; others load per block via hljsLang()
    echarts: { js: ['echarts/6.1.0/echarts.min.js'] },
    diff2html: { needs: ['hljs'], js: ['jsdiff/9.0.0/diff.min.js', 'diff2html/3.4.56/diff2html-ui-base.min.js'], css: ['diff2html/3.4.56/diff2html.min.css'] },
    cytoscape: { js: ['cytoscape/3.34.3/cytoscape.min.js', 'cytoscape-dagre/4.0.1/cytoscape-dagre.min.js'] },
    rough: { js: ['roughjs/4.6.6/rough.js'] },
    katex: { js: ['katex/0.18.7/katex.min.js'], css: ['katex/0.18.7/katex.min.css'] },
    lucide: { js: ['lucide/1.46.0/lucide.min.js'] },
    panzoom: { js: ['panzoom/4.6.2/panzoom.min.js'] },
    maplibre: { js: ['maplibre-gl/5.24.0/maplibre-gl.js'], css: ['maplibre-gl/5.24.0/maplibre-gl.css'] },
    turf: { js: ['turf/7.4.0/turf.min.js'] },
    devices: { css: ['devices.css/0.2.0/devices.min.css'] },
    scrollama: { js: ['scrollama/3.2.0/scrollama.min.js'] },
    notation: { js: ['rough-notation/0.5.1/rough-notation.iife.js'] },
    marked: { js: ['marked/18.0.14/marked.umd.js'] },
    papaparse: { js: ['papaparse/5.7.0/papaparse.min.js'] },
    footnote: { js: ['marked-footnote/1.4.0/marked-footnote.umd.js'] },
    mdmath: { needs: ['katex'], js: ['marked-katex-extension/5.1.13/marked-katex-extension.umd.js'] },
    yaml: { js: ['js-yaml/5.4.2/js-yaml.umd.min.js'] },
    redoc: { js: ['redoc/2.5.4/redoc.standalone.js'] },
    cast: { js: ['asciinema-player/3.17.0/asciinema-player.min.js'], css: ['asciinema-player/3.17.0/asciinema-player.css'] },
    cron: { js: ['cronstrue/3.27.0/cronstrue.min.js'] },
    tour: { js: ['driver.js/1.8.0/driver.js.iife.js'], css: ['driver.js/1.8.0/driver.css'] },
    countup: { js: ['countup.js/2.10.1/countUp.umd.js'] },
    vega: { js: ['vega/6.4.0/vega.min.js', 'vega-lite/6.4.3/vega-lite.min.js', 'vega-embed/7.3.0/vega-embed.min.js'] },
  };
  const libReady = new Map();
  function lib(name) {
    const spec = LIBS[name];
    if (!spec) return Promise.reject(new Error(`unknown library "${name}"`));
    if (!libReady.has(name)) libReady.set(name, (async () => {
      for (const dep of spec.needs || []) await lib(dep);
      const css = Promise.all((spec.css || []).map(c => loadCss(`${SHARED}/vendor/${c}`)));
      for (const js of spec.js || []) await loadScript(`${SHARED}/vendor/${js}`);
      await css;
    })());
    return libReady.get(name);
  }
  // A language outside the common bundle loads from vendor/highlightjs/<v>/languages/<lang>.min.js when a block asks for it.
  async function hljsLang(lang) {
    await lib('hljs');
    if (!lang || hljs.getLanguage(lang)) return !!lang;
    try { await loadScript(`${SHARED}/vendor/highlightjs/11.12.0/languages/${encodeURIComponent(lang)}.min.js`); } catch { /* not vendored */ }
    return !!hljs.getLanguage(lang);
  }
  const hljsTheme = () => loadCss(`${SHARED}/vendor/highlightjs/11.12.0/styles/${currentTheme() === 'dark' ? 'github-dark' : 'github'}.min.css`);

  let mermaidReady;
  function mermaidLib() {
    mermaidReady ||= lib('mermaid').then(() => {
      // 'base' is the only Mermaid theme that honours themeVariables: feed it the kit tokens so diagrams follow the palette
      const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const dark = currentTheme() === 'dark';
      window.mermaid.initialize({
        startOnLoad: false, securityLevel: 'loose', theme: 'base', darkMode: dark,
        fontFamily: '"Inter Variable", system-ui, sans-serif',
        themeVariables: {
          background: v('--panel'), primaryColor: dark ? '#1e1b4b' : '#eef2ff', primaryBorderColor: v('--accent'),
          primaryTextColor: v('--ink'), secondaryColor: dark ? '#0c2a3b' : '#f0f9ff', tertiaryColor: v('--panel'),
          lineColor: v('--ink3'), textColor: v('--ink'), mainBkg: dark ? '#1e1b4b' : '#eef2ff', nodeBorder: v('--accent'),
          actorBkg: dark ? '#1e1b4b' : '#eef2ff', actorBorder: v('--accent'), actorTextColor: v('--ink'), actorLineColor: v('--line'),
          signalColor: v('--ink2'), signalTextColor: v('--ink'), labelBoxBkgColor: v('--panel'), labelBoxBorderColor: v('--line'),
          noteBkgColor: dark ? '#422006' : '#fffbeb', noteBorderColor: v('--warn'), noteTextColor: v('--ink'),
          activationBkgColor: dark ? '#312e81' : '#e0e7ff', activationBorderColor: v('--accent'),
          sequenceNumberColor: '#fff', clusterBkg: v('--bg'), clusterBorder: v('--line'), edgeLabelBackground: v('--panel'),
        },
        sequence: { actorFontWeight: 600, messageFontSize: 13, mirrorActors: false },
      });
      return window.mermaid;
    });
    return mermaidReady;
  }

  function loadMermaid() {
    const blocks = $$('pre.mermaid');
    if (!blocks.length) return;
    mermaidLib()
      .then(m => m.run({ nodes: blocks }))
      .then(() => {
        blocks.forEach(b => b.hasAttribute('data-flow') && b.classList.add('flow'));
        document.dispatchEvent(new Event('docs:rendered'));
      })
      .catch(e => console.error('[docs] mermaid', e));
  }

  // tag -> components/<file>.js + .css; a component file may define several tags
  const COMPONENTS = {
    'doc-seq': 'seq', 'doc-steps': 'steps', 'doc-figure': 'figure', 'doc-compare': 'compare',
    'doc-tabs': 'tabs', 'doc-timeline': 'timeline', 'doc-json': 'json', 'doc-term': 'term', 'doc-glossary': 'term',
    'doc-code': 'code', 'doc-chart': 'chart', 'doc-diff': 'diff', 'doc-graph': 'graph', 'doc-icon': 'icon',
    'doc-math': 'math', 'doc-zoom': 'zoom', 'doc-sketch': 'sketch', 'doc-arrow': 'arrow',
    'doc-note': 'note', 'doc-flow': 'flow', 'doc-map': 'map', 'doc-device': 'device', 'doc-scrolly': 'scrolly', 'doc-mark': 'mark',
    'doc-table': 'table', 'doc-vega': 'vega', 'doc-openapi': 'openapi', 'doc-cast': 'cast', 'doc-cron': 'cron', 'doc-tour': 'tour',
  };
  function loadComponents() {
    const files = new Set(Object.entries(COMPONENTS).filter(([tag]) => $(tag)).map(([, file]) => file));
    files.forEach(f => {
      loadCss(`${SHARED}/components/${f}.css`);
      loadScript(`${SHARED}/components/${f}.js`).catch(e => console.error('[docs]', e.message));
    });
  }

  function reveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    document.documentElement.classList.add('docs-js');
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('revealed');
      io.unobserve(e.target);
    }), { rootMargin: '0px 0px -6% 0px' });
    els.forEach(el => {
      if (/^\d+$/.test(el.dataset.reveal)) el.style.transitionDelay = el.dataset.reveal + 'ms';
      io.observe(el);
    });
  }

  function sortableTables(root = document) {
    $$('table[data-sortable]', root).forEach(table => {
      if (table.dataset.sortReady) return;
      table.dataset.sortReady = '1';
      $$('th', table).forEach((th, col) => th.addEventListener('click', () => {
        const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        $$('th', table).forEach(x => x.removeAttribute('aria-sort'));
        th.setAttribute('aria-sort', dir);
        const body = table.tBodies[0];
        const rows = [...body.rows];
        const val = r => {
          const c = r.cells[col]; const raw = c?.dataset.sort ?? c?.textContent.trim() ?? '';
          const n = parseFloat(raw.replace(/[%,\s]/g, ''));
          return isNaN(n) ? raw.toLowerCase() : n;
        };
        rows.sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'ascending' ? 1 : -1); });
        rows.forEach(r => body.append(r));
      }));
    });
  }

  function filters() {
    $$('.filters[data-target]').forEach(bar => {
      const items = $$(bar.dataset.target);
      const btns = $$('.btn[data-filter]', bar);
      const apply = f => {
        btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
        items.forEach(el => {
          const tags = (el.dataset.tags || '').split(/\s+/);
          el.classList.toggle('is-hidden', f !== 'all' && !tags.includes(f));
        });
      };
      btns.forEach(b => b.addEventListener('click', () => apply(b.dataset.filter)));
      apply('all');
    });
  }

  function persistence() {
    const state = store.load();
    const fields = $$('main input[name], main textarea[name]');
    fields.forEach(el => {
      const v = state[el.name];
      if (v === undefined) return;
      if (el.type === 'radio') el.checked = el.value === v;
      else if (el.type === 'checkbox') el.checked = Array.isArray(v) ? v.includes(el.value) : !!v;
      else el.value = v;
    });
    const collect = () => {
      const s = {};
      fields.forEach(el => {
        if (el.type === 'radio') { if (el.checked) s[el.name] = el.value; }
        else if (el.type === 'checkbox') { if (el.checked) (s[el.name] ||= []).push(el.value); }
        else if (el.value.trim()) s[el.name] = el.value;
      });
      store.save(s);
    };
    fields.forEach(el => el.addEventListener(el.tagName === 'TEXTAREA' ? 'input' : 'change', collect));
  }

  const text = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';

  function exportMarkdown() {
    const out = [`# Feedback: ${document.title}`, `File: ${decodeURIComponent(location.pathname)}`, ''];
    const used = new Set();
    const decisions = $$('.decision');
    if (decisions.length) out.push('## Decisions');
    decisions.forEach(d => {
      const q = text($('.dq', d));
      const picked = $('input[type=radio]:checked', d);
      const note = $('textarea', d);
      $$('input, textarea', d).forEach(x => used.add(x));
      out.push(`- **${q}**`, `  - Choice: ${picked ? text(picked.closest('label')) : '(not chosen)'}`);
      if (note?.value.trim()) out.push(`  - Note: ${note.value.trim().replace(/\n/g, '\n    ')}`);
    });
    const checks = $$('.checklist input[type=checkbox]').filter(x => !used.has(x));
    if (checks.length) {
      out.push('', '## Checklist');
      checks.forEach(c => { used.add(c); out.push(`- [${c.checked ? 'x' : ' '}] ${text(c.closest('li'))}`); });
    }
    const notes = $$('main textarea[name]').filter(t => !used.has(t) && t.value.trim());
    if (notes.length) {
      out.push('', '## Notes');
      notes.forEach(t => out.push(`- **${t.dataset.label || t.name}**: ${t.value.trim().replace(/\n/g, '\n  ')}`));
    }
    return out.join('\n');
  }

  async function copy(str) {
    try { await navigator.clipboard.writeText(str); return true; }
    catch {
      const ta = document.createElement('textarea'); ta.value = str; document.body.append(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // accent-insensitive search: diacritics are stripped (NFD) and the letter d-with-stroke is folded to d,
  // so a query typed without accents still matches accented text
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D').toLowerCase();

  // Wide table: fixed column widths from th[data-w], horizontal + vertical scroll, sticky header,
  // first data-freeze columns pinned, th[data-group] columns tinted and hideable, row search.
  function wideTables(root = document) {
    $$('.wide', root).forEach(box => {
      if (box.dataset.wideReady) return;
      box.dataset.wideReady = '1';
      const table = $('table', box);
      const head = table?.tHead?.rows[table.tHead.rows.length - 1];
      if (!head) return;
      const ths = [...head.cells];
      const rows = [...table.tBodies].flatMap(b => [...b.rows]);
      const full = r => r.cells.length === ths.length;            // rows with a colspan (tr.grp) are skipped
      const cols = ths.map((th, i) => ({ w: th.dataset.w || '14rem', group: th.dataset.group, label: th.dataset.groupLabel, cells: [th, ...rows.filter(full).map(r => r.cells[i])] }));
      cols.forEach(c => c.group && c.cells.forEach(cell => cell.classList.add('g-' + c.group)));

      const scroll = document.createElement('div'); scroll.className = 'wide-scroll';
      table.before(scroll); scroll.append(table);
      const cg = document.createElement('colgroup'); table.prepend(cg);
      const hiddenGroups = new Set();
      const layout = () => {
        const vis = cols.filter(c => !hiddenGroups.has(c.group));
        cg.replaceChildren(...vis.map(c => Object.assign(document.createElement('col'), { style: `width:${c.w}` })));
        cols.forEach(c => c.cells.forEach(cell => { cell.hidden = hiddenGroups.has(c.group); }));
        table.style.width = `calc(${vis.map(c => c.w).join(' + ')})`;
        rows.filter(r => !full(r)).forEach(r => { if (r.cells[0]) r.cells[0].colSpan = vis.length; });
        requestAnimationFrame(freeze);
      };
      const freeze = () => {
        const n = +box.dataset.freeze || 0;
        cols.forEach(c => c.cells.forEach(cell => { cell.classList.remove('frozen', 'frozen-edge'); cell.style.position = cell.style.left = ''; }));
        let left = 0;
        cols.slice(0, n).forEach((c, i) => {
          c.cells.forEach(cell => {
            cell.classList.add('frozen'); if (i === n - 1) cell.classList.add('frozen-edge');
            cell.style.position = 'sticky'; cell.style.left = left + 'px';
          });
          left += c.cells[0].getBoundingClientRect().width;
        });
      };

      const bar = document.createElement('div'); bar.className = 'wide-bar';
      const search = Object.assign(document.createElement('input'), { type: 'search', placeholder: t('filterRows') });
      const count = document.createElement('span');
      const dataRows = rows.filter(full);
      const updateCount = () => { count.textContent = t('rows', { shown: dataRows.filter(r => !r.hidden).length, total: dataRows.length }); };
      search.addEventListener('input', () => {
        const q = norm(search.value.trim());
        dataRows.forEach(r => {
          const text = norm(r.textContent + ' ' + $$('textarea', r).map(t => t.value).join(' '));
          r.hidden = !!q && !text.includes(q);
        });
        // a group row stays visible only while one of its rows is
        rows.forEach((r, i) => {
          if (full(r)) return;
          let j = i + 1, any = false;
          while (j < rows.length && full(rows[j])) { if (!rows[j].hidden) any = true; j++; }
          r.hidden = !!q && !any;
        });
        updateCount();
      });
      bar.append(search, count);
      [...new Set(cols.map(c => c.group).filter(Boolean))].forEach(g => {
        const label = cols.find(c => c.group === g && c.label)?.label || g;
        const b = Object.assign(document.createElement('button'), { className: 'btn', type: 'button', innerHTML: `${icon('eyeOff')}<span>${esc(t('hideGroup', { label }))}</span>` });
        b.addEventListener('click', () => {
          hiddenGroups.has(g) ? hiddenGroups.delete(g) : hiddenGroups.add(g);
          b.setAttribute('aria-pressed', String(hiddenGroups.has(g)));
          layout();
        });
        bar.append(b);
      });
      const sp = document.createElement('span'); sp.className = 'sp';
      const mk = (ico, label, fn, iconOnly) => { const w = document.createElement('div'); w.innerHTML = button('', ico, label, { iconOnly }); const b = w.firstChild; b.removeAttribute('data-a'); b.addEventListener('click', fn); return b; };
      const expand = mk('expand', t('expandHeight'), () => { const on = box.classList.toggle('expanded'); expand.setAttribute('aria-pressed', String(on)); });
      bar.append(sp,
        mk('left', t('scrollLeft'), () => scroll.scrollBy({ left: -scroll.clientWidth * 0.6, behavior: 'smooth' }), true),
        mk('right', t('scrollRight'), () => scroll.scrollBy({ left: scroll.clientWidth * 0.6, behavior: 'smooth' }), true),
        expand);
      box.prepend(bar);

      scroll.addEventListener('scroll', () => box.classList.toggle('scrolled-x', scroll.scrollLeft > 0), { passive: true });
      new ResizeObserver(() => requestAnimationFrame(freeze)).observe(scroll);
      layout(); updateCount();
    });
  }

  function actions() {
    document.addEventListener('click', async e => {
      const b = e.target.closest('[data-action]'); if (!b) return;
      const a = b.dataset.action;
      if (a === 'theme') toggleTheme();
      if (a === 'print') window.print();
      if (a === 'export') toast(t(await copy(exportMarkdown()) ? 'feedbackCopied' : 'copyFailed'));
      if (a === 'reset') {
        store.save({});
        $$('main input[name]').forEach(x => { x.checked = false; });
        $$('main textarea[name]').forEach(x => { x.value = ''; });
        toast(t('cleared'));
      }
    });
  }

  // A bare <table> in main gets the kit look: .tbl, or the wide-table box when it has more than 5 columns.
  function wrapTables(root = document) {
    $$('main table', root).forEach(table => {
      if (table.classList.length || table.closest('.tbl, .wide, .mock-web, pre, [data-no-wrap], doc-diff, doc-code, doc-json, doc-table')) return;
      const box = document.createElement('div');
      box.className = (table.rows[0]?.cells.length || 0) > 5 ? 'wide' : 'tbl';
      table.before(box);
      box.append(table);
      if (table.tHead) table.setAttribute('data-sortable', '');
      alignNumbers(table);
    });
  }

  // Columns whose body cells are all numbers (1 240, 12.5, -3, 0.2%) are right-aligned, headers included.
  const NUMBER = /^[-+]?[\d\s.,]*\d[\d\s.,]*%?$/;
  function alignNumbers(table) {
    const head = table.tHead?.rows[0];
    const body = [...table.tBodies].flatMap(b => [...b.rows]).filter(r => head && r.cells.length === head.cells.length);
    if (!head || !body.length) return;
    [...head.cells].forEach((th, i) => {
      const vals = body.map(r => r.cells[i].textContent.trim()).filter(Boolean);
      if (!vals.length || !vals.every(v => NUMBER.test(v))) return;
      th.classList.add('num');
      body.forEach(r => r.cells[i].classList.add('num'));
    });
  }

  // <div class="kpis" data-count>: each tile's number counts up from 0 when it scrolls into view. Prefix, suffix,
  // thousands separator and decimals are read from the text, so "1 284", "99.2%" and "640 ms" all work.
  async function countUp() {
    const tiles = $$('.kpis[data-count] .kpi .v');
    if (!tiles.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try { await lib('countup'); } catch { return; }
    tiles.forEach(el => {
      const m = el.textContent.trim().match(/^(\D*?)(\d(?:[\d\s,.]*\d)?)(.*)$/);   // the number ends on a digit, so "640 ms" keeps " ms"
      if (!m) return;
      const [, prefix, digits, suffix] = m;
      const sep = /\d[ ,]\d{3}/.test(digits) ? (digits.match(/\d([ ,])\d{3}/) || [])[1] || '' : '';
      const clean = sep ? digits.split(sep).join('') : digits;
      const value = parseFloat(clean.replace(',', '.'));
      if (!Number.isFinite(value)) return;
      const decimalPlaces = (clean.split(/[.,]/)[1] || '').length;
      const final = el.textContent;
      new window.countUp.CountUp(el, value, { prefix, suffix, separator: sep, decimalPlaces, enableScrollSpy: true, scrollSpyOnce: true }).start();
      // a page printed (or captured) before the tile scrolled into view must still show the real number
      addEventListener('beforeprint', () => { el.textContent = final; });
    });
  }

  // Re-run the table behaviours on content a component added after start-up.
  function enhance(root) {
    wrapTables(root); sortableTables(root); wideTables(root);
  }

  // A page without the .page/main skeleton gets it: content moves into <main>, a sidebar TOC appears, and a
  // leading h1 + paragraph become the page header.
  function autoLayout() {
    if ($('.page')) return;
    let main = $('main');
    const page = document.createElement('div');
    page.className = 'page';
    if (main) main.replaceWith(page);
    else {
      main = document.createElement('main');
      [...document.body.childNodes].forEach(n => { if (!(n.nodeType === 1 && n.matches('script, style, template, link'))) main.append(n); });
      document.body.prepend(page);
    }
    const aside = document.createElement('aside');
    aside.className = 'toc';
    aside.innerHTML = `<p class="toc-title">${esc(t('toc'))}</p><nav></nav><div class="tools">`
      + `<button class="btn" type="button" data-action="theme">${esc(t('themeButton'))}</button>`
      + `<button class="btn" type="button" data-action="print">${esc(t('printButton'))}</button></div>`;
    page.append(aside, main);
    const first = main.firstElementChild;
    const h1 = first?.classList.contains('doc-md') ? first.firstElementChild : first;
    if (h1?.tagName === 'H1' && !$('.doc-head', main)) {
      const head = document.createElement('header');
      head.className = 'doc-head';
      h1.before(head);
      head.append(h1);
      const p = head.nextElementSibling;
      if (p?.tagName === 'P' && !p.className) { p.className = 'lede'; head.append(p); }
    }
  }

  const dedent = text => {
    const lines = text.replace(/^\s*\n|\n\s*$/g, '').split('\n');
    const pad = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
    return lines.map(l => l.slice(pad || 0)).join('\n');
  };

  // Rows of a data block: CSV (default), TSV or JSON (array of objects, or array of arrays with the header first).
  // `el` holds the data in a child <script type="text/csv|text/tab-separated-values|application/json">, in its own
  // text, or in the element named by its src="id". Returns an array of arrays, header row first.
  async function rows(el) {
    const src = el.getAttribute('src');
    const holder = src ? document.getElementById(src) : el.querySelector(':scope > script');
    if (src && !holder) throw new Error(`no element with id "${src}"`);
    const type = holder?.type || 'text/csv';
    const text = dedent(holder ? holder.textContent : el.textContent);
    if (/json/.test(type)) {
      const data = JSON.parse(text);
      if (!Array.isArray(data) || !data.length) throw new Error('JSON data must be a non-empty array');
      if (Array.isArray(data[0])) return data;
      const keys = [...new Set(data.flatMap(o => Object.keys(o)))];
      return [keys, ...data.map(o => keys.map(k => o[k] ?? ''))];
    }
    await lib('papaparse');
    const parsed = Papa.parse(text.split('\n').map(l => l.trim()).filter(Boolean).join('\n'),
      { delimiter: /tab-separated/.test(type) ? '\t' : '', skipEmptyLines: true });
    if (parsed.errors.length) throw new Error(`${parsed.errors[0].message} (row ${parsed.errors[0].row + 1})`);
    return parsed.data;
  }

  // Markdown (marked, GFM). Fenced blocks become components: mermaid, chart [type], table|csv|tsv, math, and any
  // other language becomes highlighted code. GitHub alerts (> [!NOTE] …) become callouts. Raw HTML passes through,
  // so <doc-*> tags can sit inside the Markdown.
  const FENCE_ATTR = /^([a-z][a-z-]*)=("[^"]*"|\S+)$/;
  const scriptText = text => text.replace(/<\/script/gi, '<\\/script');
  function fence({ text, lang }) {
    const [kind = '', ...args] = (lang || '').trim().match(/[^\s"=]+="[^"]*"|\S+/g) || [];
    const attrs = args.filter(a => FENCE_ATTR.test(a)).map(a => { const [, k, v] = a.match(FENCE_ATTR); return ` ${k}="${esc(v.replace(/^"|"$/g, ''))}"`; }).join('');
    const bare = args.find(a => !a.includes('='));
    if (kind === 'mermaid') return `<pre class="mermaid">${esc(text)}</pre>`;
    if (kind === 'math') return `<doc-math display>${esc(text)}</doc-math>`;
    if (kind === 'chart') {
      return bare ? `<doc-chart type="${esc(bare)}"${attrs}><script type="text/csv">${scriptText(text)}</script></doc-chart>`
        : `<doc-chart${attrs}><script type="application/json">${scriptText(text)}</script></doc-chart>`;
    }
    if (kind === 'vega-lite' || kind === 'vega') return `<doc-vega${attrs}><script type="application/json">${scriptText(text)}</script></doc-vega>`;
    if (kind === 'openapi') return `<doc-openapi${attrs}><script type="text/plain">${scriptText(text)}</script></doc-openapi>`;
    if (kind === 'cast' || kind === 'terminal') return `<doc-cast${attrs}><script type="text/plain">${scriptText(text)}</script></doc-cast>`;
    if (kind === 'cron') return text.split('\n').filter(l => l.trim()).map(l => `<p><doc-cron>${esc(l.trim())}</doc-cron></p>`).join('');
    if (kind === 'table' || kind === 'csv' || kind === 'tsv') {
      return `<doc-table${attrs}><script type="${kind === 'tsv' ? 'text/tab-separated-values' : 'text/csv'}">${scriptText(text)}</script></doc-table>`;
    }
    if (kind) return `<doc-code lang="${esc(kind)}"${attrs}><script type="text/plain">${scriptText(text)}</script></doc-code>`;
    return false;
  }
  const ALERTS = { NOTE: 'data', TIP: 'idea', IMPORTANT: 'why', WARNING: 'warn', CAUTION: 'risk' };
  function alerts(box) {
    $$('blockquote', box).forEach(q => {
      const p = q.firstElementChild;
      const m = p?.tagName === 'P' && p.innerHTML.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br>)?/i);
      if (!m) return;
      const kind = m[1].toUpperCase();
      p.innerHTML = p.innerHTML.slice(m[0].length);
      const c = document.createElement('div');
      c.className = `callout ${ALERTS[kind]}`;
      c.innerHTML = `<div class="ct">${esc(t('alert.' + kind.toLowerCase()))}</div>`;
      c.append(...q.childNodes);
      q.replaceWith(c);
    });
  }
  // Text nodes are read raw and elements as HTML, so both "> quote" lines and inline <doc-*> tags survive.
  const sourceOf = el => [...el.childNodes].map(n => n.nodeType === 3 ? n.textContent : n.nodeType === 1 ? n.outerHTML : '').join('');
  async function renderMarkdown() {
    const blocks = $$('doc-md, script[type="text/markdown"]').filter(el => el.tagName === 'DOC-MD' || el.parentElement?.tagName !== 'DOC-MD');
    if (!blocks.length) return;
    try { await lib('marked'); } catch (e) { blocks.forEach(b => b.replaceWith(Object.assign(document.createElement('div'), { className: 'doc-error', textContent: `markdown: ${e.message}` }))); return; }
    const md = new marked.Marked({ gfm: true, renderer: { code: fence } });
    // extensions load only when the source uses them: footnotes [^1], and $math$ / $$math$$ with KaTeX
    const all = blocks.map(el => el.textContent).join('\n');
    if (/\[\^[^\]]+\]/.test(all)) { await lib('footnote'); md.use(markedFootnote()); }
    if (/\$[^\s$]/.test(all)) { await lib('mdmath'); md.use(markedKatex({ throwOnError: false, nonStandard: false })); }
    // A markdown <script> written right after the kit tag is parsed into <head>; its output belongs at the start of <body>.
    const bodyStart = document.body.firstChild;
    for (const el of blocks) {
      const inner = el.tagName === 'DOC-MD' ? el.querySelector(':scope > script[type="text/markdown"]') : el;
      const box = document.createElement('div');
      box.className = 'doc-md';
      box.innerHTML = md.parse(dedent(inner ? inner.textContent : sourceOf(el)));
      alerts(box);
      if (el.closest('head')) { document.body.insertBefore(box, bodyStart); el.remove(); }
      else el.replaceWith(box);
    }
  }

  initTheme();
  async function init() {
    await renderMarkdown();
    autoLayout(); wrapTables();
    buildToc(); sortableTables(); filters(); wideTables(); persistence(); actions(); reveal(); loadComponents(); loadMermaid(); countUp();
    $$('input[type=range]').forEach(rangeFill);
    document.addEventListener('input', e => { if (e.target.matches?.('input[type=range]')) rangeFill(e.target); });
    window.Docs.ready = true;
    document.dispatchEvent(new Event('docs:ready'));
  }
  window.Docs = { exportMarkdown, shared: SHARED, esc, toast, fail, loadScript, loadCss, lib, hljsLang, hljsTheme, mermaid: mermaidLib, theme: currentTheme,
    t, icon, button, player, stepper, rangeFill, rows, enhance, ready: false };
  // doc.js may arrive after parsing (a fallback copy inserted late, an async tag): initialise right away then,
  // otherwise wait for the DOM. A doc's own script waits for 'docs:ready' (or checks Docs.ready), not DOMContentLoaded.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
