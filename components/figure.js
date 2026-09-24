/* <doc-figure src="screen.png" caption="Checkout screen" [alt="…"]>
     <doc-pin x="32%" y="40%" title="Pay button">A note, HTML allowed.</doc-pin>
   </doc-figure>
   Instead of src, the first non-pin child (<img>, <svg>, any element) is the media.
   Pins sit at % of the media box, are numbered, show their note on hover/focus, and are listed under the figure.
   Click the media → fullscreen view. Alt+click the media → copies `x="…%" y="…%"` for placing a new pin. */
(() => {
  const make = (tag, className, html = '') => Object.assign(document.createElement(tag), { className, innerHTML: html });

  class DocFigure extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const pins = [...this.children].filter(c => c.tagName === 'DOC-PIN');
      let media = [...this.children].find(c => c.tagName !== 'DOC-PIN');
      const src = this.getAttribute('src');
      if (!media && src) media = Object.assign(document.createElement('img'), { src, alt: this.getAttribute('alt') || this.getAttribute('caption') || '' });
      if (!media) return Docs.fail(this, 'doc-figure: needs src="…" or a media child (<img>, <svg>…)');

      this.notes = pins.map((p, i) => ({
        n: i + 1, x: p.getAttribute('x') || '50%', y: p.getAttribute('y') || '50%',
        title: p.getAttribute('title') || '', html: p.innerHTML.trim(),
      }));
      const parts = [this.buildBox(media)];
      if (this.notes.length) {
        parts.push(make('ol', 'df-legend', this.notes.map(t => `<li>${t.title ? `<b>${Docs.esc(t.title)}</b> ` : ''}${t.html}</li>`).join('')));
      }
      const cap = this.getAttribute('caption');
      if (cap) parts.push(make('figcaption', 'df-caption', Docs.esc(cap)));
      this.replaceChildren(...parts);
    }

    buildBox(media) {
      const box = make('div', 'df-box');
      box.append(media);
      this.notes.forEach(t => {
        const b = make('button', 'df-pin', String(t.n));
        b.type = 'button';
        b.style.left = t.x;
        b.style.top = t.y;
        b.dataset.n = t.n;
        b.setAttribute('aria-label', t.title || Docs.t('note', { n: t.n }));
        box.append(b);
      });
      const bubble = make('div', 'df-bubble');
      bubble.hidden = true;
      box.append(bubble);

      const show = n => {
        const t = this.notes[n - 1];
        if (!t) return;
        bubble.innerHTML = `${t.title ? `<b>${Docs.esc(t.title)}</b>` : ''}${t.html ? `<div>${t.html}</div>` : ''}`;
        const right = parseFloat(t.x) > 60, below = parseFloat(t.y) < 30;
        Object.assign(bubble.style, {
          left: right ? '' : `calc(${t.x} + 18px)`, right: right ? `calc(100% - ${t.x} + 18px)` : '',
          top: below ? `calc(${t.y} + 18px)` : '', bottom: below ? '' : `calc(100% - ${t.y} + 18px)`,
        });
        bubble.hidden = false;
      };
      const pinOf = e => e.target.closest('.df-pin');
      box.addEventListener('mouseover', e => { const p = pinOf(e); if (p) show(+p.dataset.n); });
      box.addEventListener('mouseout', e => { if (pinOf(e)) bubble.hidden = true; });
      box.addEventListener('focusin', e => { const p = pinOf(e); if (p) show(+p.dataset.n); });
      box.addEventListener('focusout', () => { bubble.hidden = true; });
      box.addEventListener('click', e => {
        if (e.target.closest('.df-pin, .df-bubble')) return;
        if (e.altKey) {
          const r = box.getBoundingClientRect();
          const s = `x="${((e.clientX - r.left) / r.width * 100).toFixed(1)}%" y="${((e.clientY - r.top) / r.height * 100).toFixed(1)}%"`;
          navigator.clipboard?.writeText(s).catch(() => {});
          Docs.toast(Docs.t('copied', { what: s }));
          return;
        }
        const dlg = box.closest('dialog');
        dlg ? dlg.close() : this.zoom();
      });
      return box;
    }

    zoom() {
      const dlg = make('dialog', 'df-dialog');
      const media = this.querySelector(':scope > .df-box').firstElementChild.cloneNode(true);
      dlg.append(this.buildBox(media));
      dlg.addEventListener('close', () => dlg.remove());
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
      document.body.append(dlg);
      dlg.showModal();
    }
  }

  customElements.define('doc-figure', DocFigure);
})();
