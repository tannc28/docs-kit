/* doc-zoom — pan and zoom around a large diagram or image.
   <doc-zoom [height="480"]> …large content: pre.mermaid, <svg>, <img>, a wide mock… </doc-zoom>
   Drag to pan, Ctrl + wheel or the buttons to zoom, "Reset" to reset. Plain wheel still scrolls the page. */
(() => {
  class DocZoom extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const stage = Object.assign(document.createElement('div'), { className: 'dz-stage' });
      stage.append(...this.childNodes);
      const view = Object.assign(document.createElement('div'), { className: 'dz-view' });
      view.style.height = `${parseInt(this.getAttribute('height'), 10) || 480}px`;
      view.append(stage);
      const bar = Object.assign(document.createElement('div'), { className: 'dz-bar' });
      bar.innerHTML = Docs.button('in', 'plus', Docs.t('zoomIn'), { iconOnly: true }) + Docs.button('out', 'minus', Docs.t('zoomOut'), { iconOnly: true })
        + Docs.button('reset', 'reset', Docs.t('reset')) + `<span class="dz-hint">${Docs.esc(Docs.t('zoomHint'))}</span>`;
      this.replaceChildren(bar, view);
      try { await Docs.lib('panzoom'); } catch (e) { return Docs.fail(this, `doc-zoom: ${e.message}`); }
      const pz = Panzoom(stage, { maxScale: 8, minScale: 0.3, step: 0.3, canvas: true });
      view.addEventListener('wheel', e => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        pz.zoomWithWheel(e);
      }, { passive: false });
      bar.addEventListener('click', e => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'in') pz.zoomIn();
        if (a === 'out') pz.zoomOut();
        if (a === 'reset') pz.reset();
      });
    }
  }

  customElements.define('doc-zoom', DocZoom);
})();
