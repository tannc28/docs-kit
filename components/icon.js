/* <doc-icon name="database"></doc-icon> — any Lucide icon name (https://lucide.dev/icons), sized to the surrounding text. */
(() => {
  let queued = false;
  const flush = () => {
    queued = false;
    lucide.createIcons({ icons: lucide.icons, nameAttr: 'data-lucide' });
  };

  class DocIcon extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const name = this.getAttribute('name');
      if (!name) return console.warn('[docs] doc-icon without name');
      this.setAttribute('aria-hidden', 'true');
      this.innerHTML = `<i data-lucide="${Docs.esc(name)}"></i>`;
      try { await Docs.lib('lucide'); } catch (e) { return console.error('[docs] doc-icon', e.message); }
      // one createIcons pass for every icon on the page
      if (!queued) { queued = true; queueMicrotask(flush); }
    }
  }

  customElements.define('doc-icon', DocIcon);
})();
