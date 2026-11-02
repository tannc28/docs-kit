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
      // On a narrow screen a wide drawing squeezed to the width is a thin strip with tiny labels: start zoomed in so it
      // fills the view's height, from its top left corner (drag to pan, Reset shows the whole).
      // It runs again once a diagram inside has drawn (before that the stage holds only a placeholder), and never
      // after the reader has zoomed. A timer queued now runs after the one Panzoom's constructor queues to pan to the
      // start position. Panzoom draws scale(s) translate(x, y) around the stage's centre, so the top left corner stays
      // put when x, y = half size × (1 − 1/s).
      const fillHeight = () => setTimeout(() => {
        const k = Math.min(3, (view.clientHeight - 16) / Math.max(1, stage.offsetHeight));
        if (innerWidth >= 640 || k < 1.3 || pz.getScale() !== 1) return;
        pz.pan(stage.offsetWidth / 2 * (1 - 1 / k), stage.offsetHeight / 2 * (1 - 1 / k), { animate: false, force: true });
        pz.zoom(k, { animate: false });
      });
      fillHeight();
      document.addEventListener('docs:rendered', fillHeight);
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
