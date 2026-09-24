/* doc-tabs — several views in one place, one tab each.
   <doc-tabs [selected="0"]> <section data-tab="Overview">…</section> <section data-tab="SQL">…</section> </doc-tabs>
   Inactive panels are moved off-screen instead of display:none, because Mermaid and the wide table
   measure their content while drawing and would lay out wrongly inside a hidden element. */
(() => {
  let uid = 0;

  class DocTabs extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const panels = [...this.children].filter(c => c.tagName === 'SECTION');
      if (!panels.length) return Docs.fail(this, 'doc-tabs: needs <section data-tab="…"> children');
      const id = `dtab${++uid}`;
      const list = Object.assign(document.createElement('div'), { className: 'dt-list' });
      list.setAttribute('role', 'tablist');
      this.panels = panels;
      this.tabs = panels.map((p, i) => {
        p.id ||= `${id}-p${i}`;
        p.classList.add('dt-panel');
        p.setAttribute('role', 'tabpanel');
        const t = Object.assign(document.createElement('button'), { type: 'button', className: 'dt-tab', id: `${id}-t${i}`, textContent: p.dataset.tab || `Tab ${i + 1}` });
        t.setAttribute('role', 'tab');
        t.setAttribute('aria-controls', p.id);
        p.setAttribute('aria-labelledby', t.id);
        t.addEventListener('click', () => this.select(i));
        list.append(t);
        return t;
      });
      list.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        const i = (this.current + d + panels.length) % panels.length;
        this.select(i);
        this.tabs[i].focus();
        e.preventDefault();
      });
      this.prepend(list);
      this.select(Math.min(+this.getAttribute('selected') || 0, panels.length - 1));
    }

    select(i) {
      this.current = i;
      this.tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', String(k === i));
        t.tabIndex = k === i ? 0 : -1;
      });
      this.panels.forEach((p, k) => p.classList.toggle('dt-off', k !== i));
    }
  }

  customElements.define('doc-tabs', DocTabs);
})();
