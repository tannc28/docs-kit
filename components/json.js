/* <doc-json [open="1"]>{ "orderId": "A-1024", "items": 2 }</doc-json>
   <doc-json src="payload" open="2"></doc-json> + <script type="application/json" id="payload">…</script>
   Collapsible tree; `open` = how many levels start expanded (default 1). Use src for large payloads
   or anything containing "<". Toolbar: expand all, collapse all, copy. */
(() => {
  const esc = s => Docs.esc(s);

  function node(label, val, depth, open) {
    const key = label === null ? '' : `<span class="${typeof label === 'number' ? 'dj-idx' : 'dj-key'}">${esc(label)}</span><span class="dj-punct">: </span>`;
    if (val === null || typeof val !== 'object') {
      const type = val === null ? 'null' : typeof val;
      const shown = type === 'string' ? `"${esc(val)}"` : esc(String(val));
      return `<div class="dj-row">${key}<span class="dj-${type}">${shown}</span></div>`;
    }
    const isArr = Array.isArray(val);
    const entries = isArr ? val.map((v, i) => [i, v]) : Object.entries(val);
    if (!entries.length) return `<div class="dj-row">${key}<span class="dj-muted">${isArr ? '[]' : '{}'}</span></div>`;
    const summary = isArr ? `[${entries.length}]` : `{${entries.length}}`;
    return `<details class="dj-node"${depth < open ? ' open' : ''}><summary>${key}<span class="dj-muted">${summary}</span></summary>`
      + entries.map(([k, v]) => node(k, v, depth + 1, open)).join('') + '</details>';
  }

  class DocJson extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const srcId = this.getAttribute('src');
      const raw = srcId ? document.getElementById(srcId)?.textContent : this.textContent;
      if (raw == null) return Docs.fail(this, `doc-json: no element with id="${srcId}"`);
      let data;
      try { data = JSON.parse(raw); } catch (e) { return Docs.fail(this, `doc-json: invalid JSON — ${e.message}`); }
      const open = this.hasAttribute('open') ? +this.getAttribute('open') : 1;
      this.innerHTML = '<div class="dj-bar">' + Docs.button('expand', 'down', Docs.t('expandAll'))
        + Docs.button('collapse', 'up', Docs.t('collapseAll')) + Docs.button('copy', 'copy', Docs.t('copy')) + '</div>'
        + `<div class="dj-tree">${node(null, data, 0, open)}</div>`;
      this.querySelector('.dj-bar').addEventListener('click', async e => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'copy') {
          await navigator.clipboard?.writeText(JSON.stringify(data, null, 2)).catch(() => {});
          Docs.toast(Docs.t('copied', { what: 'JSON' }));
        } else if (a) {
          this.querySelectorAll('details').forEach(d => { d.open = a === 'expand'; });
        }
      });
    }
  }

  customElements.define('doc-json', DocJson);
})();
