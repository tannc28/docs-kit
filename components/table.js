/* doc-table — a sortable table from CSV, TSV or JSON, wide ones with filter and pinned columns.
   <doc-table [wide] [freeze="1"] [sort="off"] [html] [caption="…"]>
     <script type="text/csv">
       Order,Status,Total
       A-1024,PAID,480000
       A-1023,PENDING,150000
     </script>
   </doc-table>
   A table from data instead of <tr>/<td> markup. The data is CSV (default), <script type="text/tab-separated-values">,
   or <script type="application/json"> (an array of objects, or an array of arrays with the header row first);
   src="id" reads it from a <script> elsewhere on the page. Columns whose values are all numbers are right-aligned
   and sort as numbers. Headers sort on click (sort="off" disables it). More than 5 columns, or `wide`, gives the
   wide-table box: row filter, column scrolling, `freeze` pinned leading columns. Cells are text; `html` lets them
   carry markup (only for your own data). In Markdown, a ```table or ```csv fence becomes this element. */
(() => {
  const NUMBER = /^[-+]?[\d\s.,]*\d[\d\s.,]*%?$/;

  class DocTable extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      let data;
      try { data = await Docs.rows(this); } catch (e) { return Docs.fail(this, `doc-table: ${e.message}`); }
      const [head = [], ...body] = data;
      if (!head.length) return Docs.fail(this, 'doc-table: no header row');
      const filled = i => body.filter(r => String(r[i] ?? '').trim() !== '');
      const numeric = head.map((_, i) => filled(i).length > 0 && filled(i).every(r => NUMBER.test(String(r[i]).trim())));
      const cell = v => (this.hasAttribute('html') ? String(v ?? '') : Docs.esc(v ?? ''));
      const wide = this.hasAttribute('wide') || head.length > 5;
      const caption = this.getAttribute('caption');

      const box = document.createElement('div');
      box.className = wide ? 'wide' : 'tbl';
      if (wide && this.getAttribute('freeze')) box.dataset.freeze = this.getAttribute('freeze');
      box.innerHTML = `<table${this.getAttribute('sort') === 'off' ? '' : ' data-sortable'}>`
        + (caption ? `<caption>${Docs.esc(caption)}</caption>` : '')
        + `<thead><tr>${head.map((h, i) => `<th${numeric[i] ? ' class="num"' : ''}>${Docs.esc(h)}</th>`).join('')}</tr></thead>`
        + `<tbody>${body.map(r => `<tr>${head.map((_, i) => `<td${numeric[i] ? ' class="num"' : ''}>${cell(r[i])}</td>`).join('')}</tr>`).join('')}</tbody>`
        + '</table>';
      this.replaceChildren(box);
      Docs.enhance(this);
    }
  }

  customElements.define('doc-table', DocTable);
})();
