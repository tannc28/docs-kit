/* <doc-code lang="java" file="order-service/…/OrderService.java" start="80" mark="84,86-87">
     <script type="text/plain">
     long total = subtotal - discount;
     </script>
   </doc-code>
   Code inside <script type="text/plain"> needs no escaping of "<" or "&" (plain text content works too).
   Header: file:start, language, Copy. Line numbers begin at `start`; `mark` lists source line numbers to highlight.
   Highlighting: highlight.js common bundle (java, sql, yaml, json, bash, typescript, xml, …); any other language loads
   from vendor/highlightjs/<v>/languages/<lang>.min.js if it is vendored (add it with bin/vendor-fetch.py). lang="text" skips it. */
(() => {
  const dedent = text => {
    const lines = text.replace(/\t/g, '    ').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const widths = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length);
    const indent = widths.length ? Math.min(...widths) : 0;
    return lines.map(l => l.slice(indent)).join('\n');
  };

  const parseMarks = s => {
    const set = new Set();
    (s || '').split(',').forEach(part => {
      const [a, b] = part.split('-').map(n => parseInt(n, 10));
      if (!isNaN(a)) for (let i = a; i <= (isNaN(b) ? a : b); i++) set.add(i);
    });
    return set;
  };

  class DocCode extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const holder = this.querySelector(':scope > script[type="text/plain"]');
      const code = dedent(holder ? holder.textContent : this.textContent);
      const lang = (this.getAttribute('lang') || '').toLowerCase();
      const file = this.getAttribute('file');
      const start = parseInt(this.getAttribute('start'), 10) || 1;
      const marks = parseMarks(this.getAttribute('mark'));
      const lines = code.split('\n');

      const head = '<div class="dcode-head">'
        + (file ? `<span class="dcode-file">${Docs.esc(file)}${this.hasAttribute('start') ? `:${start}` : ''}</span>` : '')
        + (lang ? `<span class="badge">${Docs.esc(lang)}</span>` : '')
        + '<span class="sp"></span><button type="button" class="btn" data-a="copy">Copy</button></div>';
      const gutter = lines.map((_, i) => `<span${marks.has(start + i) ? ' class="on"' : ''}>${start + i}</span>`).join('');
      const bands = lines.map((_, i) => (marks.has(start + i) ? `<i style="top:${i * 1.6}em"></i>` : '')).join('');
      this.innerHTML = `${head}<div class="dcode-body"><div class="dcode-gutter">${gutter}</div>`
        + `<div class="dcode-scroll"><div class="dcode-bands">${bands}</div><pre><code class="hljs">${Docs.esc(code)}</code></pre></div></div>`;
      this.querySelector('[data-a="copy"]').addEventListener('click', async () => {
        await navigator.clipboard?.writeText(code).catch(() => {});
        Docs.toast(Docs.t('copied', { what: 'Code' }));
      });

      if (!lang || lang === 'text' || lang === 'plain') return;
      try {
        const [known] = await Promise.all([Docs.hljsLang(lang), Docs.hljsTheme()]);
        if (!known) return console.warn('[docs] doc-code: unknown language', lang);
        // one highlight pass over the whole snippet keeps multi-line tokens (block comments, text blocks) intact;
        // line numbers and marks live in separate layers aligned by line-height
        this.querySelector('code').innerHTML = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      } catch (e) {
        console.error('[docs] doc-code', e);
      }
    }
  }

  customElements.define('doc-code', DocCode);
})();
