/* <doc-compare labels="Before|After" [mode="slider"] [start="50"]> <div>…A…</div> <div>…B…</div> </doc-compare>
   side (default): two labelled columns, stacked on narrow screens — code, config, text, tables.
   slider: B lies over A; drag the handle (or ← → when focused) to reveal — two same-size screens or images. */
(() => {
  const make = (tag, className, html = '') => Object.assign(document.createElement(tag), { className, innerHTML: html });

  class DocCompare extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const kids = [...this.children];
      if (kids.length !== 2) return Docs.fail(this, `doc-compare: needs exactly two children, got ${kids.length}`);
      const [a, b] = kids;
      const [la = Docs.t('before'), lb = Docs.t('after')] = (this.getAttribute('labels') || '').split('|').filter(Boolean);
      this.getAttribute('mode') === 'slider' ? this.slider(a, b, la, lb) : this.side(a, b, la, lb);
    }

    side(a, b, la, lb) {
      const col = (el, label, cls) => {
        const c = make('div', `dc-col ${cls}`, `<div class="dc-label">${Docs.esc(label)}</div>`);
        c.append(el);
        return c;
      };
      const grid = make('div', 'dc-side');
      grid.append(col(a, la, 'dc-a'), col(b, lb, 'dc-b'));
      this.replaceChildren(grid);
    }

    slider(a, b, la, lb) {
      const wrap = make('div', 'dc-slider');
      const base = make('div', 'dc-base');
      base.append(a);
      const top = make('div', 'dc-top');
      top.append(b);
      const range = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 100, value: this.getAttribute('start') || 50, className: 'dc-range' });
      range.setAttribute('aria-label', `${la} ↔ ${lb}`);
      const set = () => wrap.style.setProperty('--pos', `${range.value}%`);
      range.addEventListener('input', set);
      set();
      wrap.append(base, top, make('div', 'dc-handle'), range, make('div', 'dc-tags', `<span>${Docs.esc(la)}</span><span>${Docs.esc(lb)}</span>`));
      this.replaceChildren(wrap);
    }
  }

  customElements.define('doc-compare', DocCompare);
})();
