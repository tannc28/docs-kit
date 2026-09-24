/* doc-vega — a Vega-Lite chart: raw rows plus a short spec that declares aggregate, bin, filter or facet itself.
   <doc-vega [height="320"]>
     <script type="application/json">{
       "mark": "bar",
       "encoding": { "x": { "field": "service" }, "y": { "aggregate": "mean", "field": "ms" } }
     }</script>
     <script type="text/csv">service,ms
       api,120
       api,140
       worker,60</script>
   </doc-vega>
   The first <script> is the Vega-Lite spec (https://vega.github.io/vega-lite/docs/). When the spec has no `data`,
   the rows come from a second <script type="text/csv|text/tab-separated-values|application/json"> or from src="id".
   Colours and fonts follow the kit tokens and the page theme; the chart fills the width. In Markdown: ```vega-lite. */
(() => {
  const token = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  class DocVega extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const [specEl, dataEl] = [...this.querySelectorAll(':scope > script')];
      let spec;
      try { spec = JSON.parse(specEl?.textContent || this.textContent); } catch (e) { return Docs.fail(this, `doc-vega: invalid JSON spec — ${e.message}`); }
      try {
        if (!spec.data && (dataEl || this.getAttribute('src'))) {
          const holder = dataEl ? Object.assign(document.createElement('div'), { innerHTML: '' }) : this;
          if (dataEl) holder.append(dataEl.cloneNode(true));
          const [head, ...rows] = await Docs.rows(holder);
          const num = v => (v !== '' && !isNaN(Number(String(v).replace(/[\s,]/g, ''))) ? Number(String(v).replace(/[\s,]/g, '')) : v);
          spec.data = { values: rows.map(r => Object.fromEntries(head.map((h, i) => [h, num(r[i])]))) };
        }
      } catch (e) { return Docs.fail(this, `doc-vega: ${e.message}`); }
      const box = document.createElement('div');
      box.className = 'dvega-box';
      this.replaceChildren(box);
      try {
        await Docs.lib('vega');
        const dark = Docs.theme() === 'dark';
        const palette = ['--accent', '--accent2', '--ok', '--warn', '--bad', '--idea', '--ink3'].map(token).filter(Boolean);
        const font = token('--sans') || 'sans-serif';
        await vegaEmbed(box, { width: 'container', height: parseInt(this.getAttribute('height'), 10) || 280, ...spec }, {
          actions: false, renderer: 'svg', theme: dark ? 'dark' : undefined,
          config: { background: null, font, range: { category: palette }, view: { stroke: null },
            axis: { labelColor: token('--ink2'), titleColor: token('--ink2'), gridColor: token('--line'), domainColor: token('--line') },
            axisX: { labelAngle: 0, labelLimit: 160 },
            legend: { labelColor: token('--ink2'), titleColor: token('--ink2') } },
        });
      } catch (e) {
        Docs.fail(this, `doc-vega: ${e.message}`);
      }
    }
  }

  customElements.define('doc-vega', DocVega);
})();
