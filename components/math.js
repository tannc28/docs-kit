/* doc-math — a LaTeX formula, inline or as a block.
   <doc-math>\frac{a}{b}</doc-math> inline, or <doc-math display>…</doc-math> as a centred block. KaTeX syntax.
   The page must start with <!doctype html> (KaTeX refuses quirks mode). */
(() => {
  class DocMath extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const tex = this.textContent.trim();
      try { await Docs.lib('katex'); } catch (e) { return Docs.fail(this, `doc-math: ${e.message}`); }
      // throwOnError:false renders the faulty part in red inside the formula instead of throwing
      katex.render(tex, this, { displayMode: this.hasAttribute('display'), throwOnError: false });
    }
  }

  customElements.define('doc-math', DocMath);
})();
