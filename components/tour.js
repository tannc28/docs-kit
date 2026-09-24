/* doc-tour — a guided tour: a button that walks the reader through elements of the page, spotlighting each one.
   <doc-tour [label="Take the tour"]>
     <doc-stop for="#checkout-form" title="The form">Validated on blur.</doc-stop>
     <doc-stop for=".kpis" title="Numbers">Updated every 5 minutes.</doc-stop>
   </doc-tour>
   Each <doc-stop> points at any element by CSS selector — a mock screen, a table, a diagram, a card — and its body
   (HTML) is the note shown next to it. Next/Previous/Close, keyboard arrows and Esc work. Driven by driver.js. */
(() => {
  class DocTour extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const stops = [...this.querySelectorAll(':scope > doc-stop')].map(s => ({
        sel: s.getAttribute('for'), title: s.getAttribute('title') || '', html: s.innerHTML.trim(),
      }));
      if (!stops.length) return Docs.fail(this, 'doc-tour: needs at least one <doc-stop for="…">');
      this.innerHTML = Docs.button('tour', 'play', this.getAttribute('label') || Docs.t('tour'), { cls: 'primary' });
      const btn = this.firstElementChild;
      btn.addEventListener('click', async () => {
        try { await Docs.lib('tour'); } catch (e) { return Docs.toast(`doc-tour: ${e.message}`); }
        const steps = stops.map(s => ({ element: document.querySelector(s.sel) || undefined, popover: { title: s.title, description: s.html } }));
        window.driver.js.driver({
          showProgress: true, steps, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
          nextBtnText: Docs.t('next'), prevBtnText: Docs.t('prev'), doneBtnText: Docs.t('done'), progressText: '{{current}} / {{total}}',
        }).drive();
      });
    }
  }

  customElements.define('doc-tour', DocTour);
})();
