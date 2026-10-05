/* doc-drawer — details for any element in a side panel, opened by clicking the element.
   <doc-drawer for="#target" title="…" [side="right|left"] [width="560px"] [id="…"]>
     Body HTML: anything — doc-flow, pre.mermaid, doc-figure, a mock, notes, a table.
   </doc-drawer>
   The target (without `for`: the previous element sibling) gets a small open button in its corner, an outline on
   hover, and opens the drawer on click; links, buttons and inputs inside the target keep working (in a sortable
   table header, where a click sorts, only the corner button opens it). The panel is a
   modal <dialog>: Esc, the close button or a click outside closes it, and focus stays inside while it is open.
   One drawer is open at a time. The content loads when the drawer first opens, so Mermaid, charts and maps inside
   draw at their real size. `#<id>` in the URL opens the drawer with that id (default: drawer-<title slug>), so a
   link can point straight at it. Narrow screens get a bottom sheet; print shows the content where the tag stands.
   Drag the panel's inner edge (or press ← → on it) to resize — the width is remembered for the page — and the
   header button or a double-click on the edge maximizes it. Headings inside a drawer stay out of the contents sidebar.
   Events on the element: doc-drawer:open, doc-drawer:close. Methods: open(), close(), maximize(on); property isOpen. */
(() => {
  let current = null, seq = 0;
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const interactive = 'a, button, input, select, textarea, summary, label, [contenteditable], [data-dd-ignore]';

  class DocDrawer extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      this.isOpen = false;
      const sel = this.getAttribute('for');
      const target = sel ? document.querySelector(sel) : this.previousElementSibling;
      if (!target) return Docs.fail(this, `doc-drawer: target not found (${sel || 'previous sibling'})`);
      const title = this.getAttribute('title') || '';
      const side = this.getAttribute('side') === 'left' ? 'left' : 'right';
      if (!this.id) this.id = `drawer-${slug(title) || ++seq}`;

      const dlg = document.createElement('dialog');
      dlg.className = `dd-panel dd-${side}`;
      dlg.setAttribute('aria-labelledby', `${this.id}-title`);
      const w = this.getAttribute('width');
      if (w) dlg.style.setProperty('--dd-w', w);
      dlg.innerHTML = `<div class="dd-head"><div class="dd-title" id="${this.id}-title" role="heading" aria-level="2">${Docs.esc(title)}</div>`
        + `<button type="button" class="btn icon dd-max-btn" aria-pressed="false" aria-label="${Docs.esc(Docs.t('maximize'))}" title="${Docs.esc(Docs.t('maximize'))}">${Docs.icon('maximize')}</button>`
        + `<button type="button" class="btn icon dd-close" aria-label="${Docs.esc(Docs.t('close'))}" title="${Docs.esc(Docs.t('close'))}">${Docs.icon('close')}</button></div>`
        + '<div class="dd-body"></div>';
      dlg.querySelector('.dd-body').append(...this.childNodes);
      this.append(dlg);
      this.dialog = dlg;
      this._resizable(dlg, side);

      const opener = document.createElement('button');
      opener.type = 'button';
      opener.className = 'dd-open';
      opener.innerHTML = Docs.icon('panel');
      opener.setAttribute('aria-label', Docs.t('openDetails', { title }));
      opener.title = Docs.t('openDetails', { title });
      if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
      target.classList.add('dd-target');
      target.append(opener);

      opener.addEventListener('click', e => { e.stopPropagation(); this.open(); });
      // A header of a sortable table sorts on click: there only the corner button opens the drawer.
      if (!target.closest('table[data-sortable] th')) target.addEventListener('click', e => {
        if (e.target.closest(interactive) || e.target.closest('.dd-target') !== target) return;
        this.open();
      });
      dlg.querySelector('.dd-close').addEventListener('click', () => this.close());
      // A click on the backdrop lands on the <dialog> itself: the panel's children cover the rest of it.
      dlg.addEventListener('click', e => { if (e.target === dlg) this.close(); });
      // Esc fires 'cancel' at once; closing through close() keeps the state in step without waiting for 'close'.
      dlg.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
      dlg.addEventListener('close', () => this._closed());

      const fromHash = () => { if (location.hash === `#${this.id}` && !this.isOpen) this.open(); };
      addEventListener('hashchange', fromHash);
      requestAnimationFrame(fromHash);
    }

    // Drag the inner edge (or ← → on it) to resize; the width is remembered for the page. Double-click or the header
    // button maximizes. Phones use a bottom sheet instead, so neither shows there.
    _resizable(dlg, side) {
      const key = `docs:drawer-w:${location.pathname}`;
      const grip = document.createElement('div');
      grip.className = 'dd-grip';
      grip.tabIndex = 0;
      grip.setAttribute('role', 'separator');
      grip.setAttribute('aria-orientation', 'vertical');
      grip.setAttribute('aria-label', Docs.t('resizePanel'));
      grip.title = Docs.t('resizePanel');
      dlg.append(grip);
      const setW = px => {
        const v = Math.round(Math.min(innerWidth * 0.98, Math.max(320, px)));
        dlg.style.setProperty('--dd-w', `${v}px`);
        return v;
      };
      const save = v => { try { localStorage.setItem(key, String(v)); } catch (e) { /* private mode: keep it for this visit */ } };
      try { const saved = parseInt(localStorage.getItem(key), 10); if (saved) setW(saved); } catch (e) { /* storage blocked */ }
      grip.addEventListener('pointerdown', e => {
        e.preventDefault();
        try { grip.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or ended pointer: moves still arrive */ }
        this.maximize(false);
        dlg.classList.add('dd-resizing');
        let v;
        const move = ev => { v = setW(side === 'right' ? innerWidth - ev.clientX : ev.clientX); };
        const up = () => {
          grip.removeEventListener('pointermove', move);
          grip.removeEventListener('pointerup', up);
          dlg.classList.remove('dd-resizing');
          if (v) save(v);
          document.dispatchEvent(new Event('docs:rendered'));
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
      });
      grip.addEventListener('keydown', e => {
        const dir = { ArrowLeft: 1, ArrowRight: -1 }[e.key];
        if (!dir) return;
        e.preventDefault();
        this.maximize(false);
        save(setW(dlg.getBoundingClientRect().width + (side === 'right' ? dir : -dir) * 40));
      });
      grip.addEventListener('dblclick', () => this.maximize(!dlg.classList.contains('dd-max')));
      dlg.querySelector('.dd-max-btn').addEventListener('click', () => this.maximize(!dlg.classList.contains('dd-max')));
    }

    maximize(on) {
      const dlg = this.dialog, btn = dlg.querySelector('.dd-max-btn');
      dlg.classList.toggle('dd-max', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.innerHTML = Docs.icon(on ? 'minimize' : 'maximize');
      const label = Docs.t(on ? 'restoreSize' : 'maximize');
      btn.setAttribute('aria-label', label);
      btn.title = label;
      document.dispatchEvent(new Event('docs:rendered'));
    }

    open() {
      if (this.isOpen) return;
      // Switching straight from another drawer: remember the hash the page had before either of them opened.
      let base = location.hash;
      if (current && current !== this) { base = current._hash; current.close(); }
      current = this;
      this._hash = /^#drawer-/.test(base) || base === `#${this.id}` ? '' : base;
      this.dialog.showModal();
      this.isOpen = true;
      document.documentElement.classList.add('dd-lock');
      if (location.hash !== `#${this.id}`) history.replaceState(null, '', `#${this.id}`);
      this.dispatchEvent(new Event('doc-drawer:open'));
      document.dispatchEvent(new Event('docs:rendered'));
    }

    // The dialog's own 'close' event (Esc) arrives a task later; closing from code updates the state at once, so a
    // drawer opened right after sees this one already closed.
    close() {
      if (!this.isOpen) return;
      this.dialog.close();
      this._closed();
    }

    _closed() {
      if (!this.isOpen) return;
      this.isOpen = false;
      if (current === this) current = null;
      document.documentElement.classList.remove('dd-lock');
      if (location.hash === `#${this.id}`) history.replaceState(null, '', this._hash || location.pathname + location.search);
      this.dispatchEvent(new Event('doc-drawer:close'));
    }
  }
  customElements.define('doc-drawer', DocDrawer);
})();
