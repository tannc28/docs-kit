/* <doc-mark [type="highlight|underline|circle|box|bracket|strike-through|crossed-off"] [tone="mark|accent|accent2|ok|warn|bad"]>
     the words to annotate
   </doc-mark>
   A hand-drawn annotation over inline text (Rough Notation, MIT), drawn when it scrolls into view — the way a
   reviewer circles the one number that matters. Default: type="highlight" with the marker colour (tone="mark"),
   every other type defaults to tone="accent". Marks that enter the view together draw one after another. */
(() => {
  const TYPES = ['highlight', 'underline', 'circle', 'box', 'bracket', 'strike-through', 'crossed-off'];
  let queue = Promise.resolve();

  class DocMark extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const type = this.getAttribute('type') || 'highlight';
      if (!TYPES.includes(type)) return console.warn('[docs] doc-mark: unknown type', type);
      try { await Docs.lib('notation'); } catch (e) { return console.error('[docs] doc-mark:', e.message); }
      const tone = this.getAttribute('tone') || (type === 'highlight' ? 'mark' : 'accent');
      const color = getComputedStyle(document.documentElement).getPropertyValue(`--${tone}`).trim() || 'currentColor';
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this.note = RoughNotation.annotate(this, {
        type, color, animate: !reduce, animationDuration: 700, multiline: true, iterations: type === 'highlight' ? 1 : 2,
        padding: type === 'circle' ? 6 : type === 'box' ? 3 : 2, brackets: ['left', 'right'],
      });
      const io = new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        io.disconnect();
        // chain the draws so a paragraph with several marks reads left to right
        queue = queue.then(() => { this.note.show(); return new Promise(r => setTimeout(r, reduce ? 0 : 450)); });
      }, { rootMargin: '0px 0px -15% 0px' });
      io.observe(this);
    }

    disconnectedCallback() { this.note?.remove(); }
  }

  customElements.define('doc-mark', DocMark);
})();
