/* <doc-chart height="320">
     <script type="application/json">{ "xAxis": { "type": "category", "data": ["08","09"] }, "yAxis": {}, "series": [{ "type": "line", "data": [38, 341] }] }</script>
   </doc-chart>
   Body = an Apache ECharts option as JSON (https://echarts.apache.org/en/option.html): line, bar, pie, heatmap,
   scatter, time axes, dataZoom… Use <script type="text/x-echarts"> for a JS object literal when formatter
   functions are needed (evaluated as code — only for your own docs). Follows the page theme; resizes with the page. */
(() => {
  class DocChart extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const holder = this.querySelector(':scope > script');
      let option;
      try {
        const text = holder ? holder.textContent : this.textContent;
        option = holder?.type === 'text/x-echarts' ? new Function(`return (${text});`)() : JSON.parse(text);
      } catch (e) {
        return Docs.fail(this, `doc-chart: cannot read the option — ${e.message}`);
      }
      const box = Object.assign(document.createElement('div'), { className: 'dchart-box' });
      box.style.height = `${parseInt(this.getAttribute('height'), 10) || 320}px`;
      this.replaceChildren(box);
      try {
        await Docs.lib('echarts');
        const font = getComputedStyle(document.documentElement).getPropertyValue('--sans').trim();
        const chart = echarts.init(box, Docs.theme() === 'dark' ? 'dark' : null, { renderer: 'svg' });
        const opt = { backgroundColor: 'transparent', textStyle: { fontFamily: font || 'sans-serif' }, ...option };
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
