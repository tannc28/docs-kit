/* doc-chart — a chart from CSV and a type (bar, line, area, pie…) or from any ECharts option.
   Short form — a chart type plus CSV (first column = x axis or labels, one series per other column):
   <doc-chart type="bar|hbar|line|area|scatter|pie|donut" [stack] [title="…"] [height="320"]>
     <script type="text/csv">
       Hour,Orders,Failed
       08,40,1
       09,96,2
     </script>
   </doc-chart>
   Also TSV or JSON rows (see doc-table), or src="id". In Markdown: ```chart bar  (then the CSV).

   Full form — any Apache ECharts option as JSON (https://echarts.apache.org/en/option.html): heatmap, gauge,
   sankey, radar, time axes, dataZoom…
   <doc-chart height="320">
     <script type="application/json">{ "xAxis": { "type": "category", "data": ["08","09"] }, "yAxis": {}, "series": [{ "type": "line", "data": [38, 341] }] }</script>
   </doc-chart>
   Use <script type="text/x-echarts"> for a JS object literal when formatter functions are needed (evaluated as
   code — only for your own docs). Follows the page theme; resizes with the page. */
(() => {
  const num = v => { const n = parseFloat(String(v).replace(/[\s,%]/g, '')); return Number.isFinite(n) ? n : null; };

  // ECharts option for the short form, from rows (header first).
  function shortOption(type, rows, el) {
    const [head, ...body] = rows;
    const title = el.getAttribute('title');
    const base = { tooltip: { trigger: type === 'pie' || type === 'donut' ? 'item' : 'axis' }, ...(title ? { title: { text: title, left: 'center', textStyle: { fontSize: 14 } } } : {}) };
    if (type === 'pie' || type === 'donut') {
      return { ...base, legend: { top: title ? 28 : 0, type: 'scroll' },
        series: [{ type: 'pie', radius: type === 'donut' ? ['45%', '70%'] : '70%', top: title ? 40 : 24,
          data: body.map(r => ({ name: r[0], value: num(r[1]) })) }] };
    }
    const kind = { hbar: 'bar', area: 'line' }[type] || type;
    const cats = body.map(r => r[0]);
    const series = head.slice(1).map((name, i) => ({
      name, type: kind, data: body.map(r => num(r[i + 1])),
      ...(type === 'area' ? { areaStyle: { opacity: 0.25 } } : {}),
      ...(kind === 'line' ? { smooth: true, showSymbol: body.length <= 24 } : {}),
      ...(el.hasAttribute('stack') ? { stack: 'total' } : {}),
    }));
    const catAxis = { type: 'category', data: cats }, valAxis = { type: 'value' };
    return { ...base, legend: series.length > 1 ? { top: title ? 28 : 0 } : undefined,
      grid: { left: 8, right: 16, top: (title ? 32 : 0) + (series.length > 1 ? 32 : 16), bottom: 8, containLabel: true },
      xAxis: type === 'hbar' ? valAxis : catAxis, yAxis: type === 'hbar' ? { ...catAxis, inverse: true } : valAxis, series };
  }

  class DocChart extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const holder = this.querySelector(':scope > script');
      const type = this.getAttribute('type');
      let option;
      try {
        if (type) option = shortOption(type, await Docs.rows(this), this);
        else {
          const text = holder ? holder.textContent : this.textContent;
          option = holder?.type === 'text/x-echarts' ? new Function(`return (${text});`)() : JSON.parse(text);
        }
      } catch (e) {
        return Docs.fail(this, `doc-chart: cannot read the ${type ? 'data' : 'option'} — ${e.message}`);
      }
      const box = Object.assign(document.createElement('div'), { className: 'dchart-box' });
      box.style.height = `${parseInt(this.getAttribute('height'), 10) || 320}px`;
      this.replaceChildren(box);
      try {
        await Docs.lib('echarts');
        const font = getComputedStyle(document.documentElement).getPropertyValue('--sans').trim();
        const chart = echarts.init(box, Docs.theme() === 'dark' ? 'dark' : null, { renderer: 'svg' });
        // series colours come from the kit tokens, so charts match the page in light and dark (an option's own `color` wins)
        const token = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
        const palette = ['--accent', '--accent2', '--ok', '--warn', '--bad', '--idea', '--ink3'].map(token).filter(Boolean);
        const opt = { backgroundColor: 'transparent', textStyle: { fontFamily: font || 'sans-serif' }, color: palette, ...option };
        // ECharts 6 places the legend at the bottom, over the x-axis labels; the kit puts it on top unless the doc says otherwise
        if (opt.legend && !Array.isArray(opt.legend) && opt.legend.top === undefined && opt.legend.bottom === undefined) {
          opt.legend = { top: 0, ...opt.legend };
        }
        chart.setOption(opt);
        new ResizeObserver(() => chart.resize()).observe(box);
        this.chart = chart;
      } catch (e) {
        Docs.fail(this, `doc-chart: ${e.message}`);
      }
    }
  }

  customElements.define('doc-chart', DocChart);
})();
