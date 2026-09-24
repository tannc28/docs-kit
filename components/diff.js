/* doc-diff — a before/after diff of two texts, side by side or unified.
   <doc-diff file="application.yaml" [mode="line"] [context="3"]>
     <script type="text/plain" data-before>…old text…</script>
     <script type="text/plain" data-after>…new text…</script>
   </doc-diff>
   Side-by-side by default, mode="line" for a unified view. The file extension picks the highlighting language.
   Write the text flush-left inside the scripts: indentation is kept as-is (it matters for YAML). */
(() => {
  const clean = s => `${s.replace(/^\n+/, '').replace(/\s+$/, '')}\n`;

  class DocDiff extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const before = this.querySelector(':scope > script[data-before]');
      const after = this.querySelector(':scope > script[data-after]');
      if (!before || !after) return Docs.fail(this, 'doc-diff: needs <script type="text/plain" data-before> and <script type="text/plain" data-after>');
      const file = this.getAttribute('file') || 'file.txt';
      const target = Object.assign(document.createElement('div'), { className: 'ddiff-box' });
      this.replaceChildren(target);
      try {
        await Promise.all([Docs.lib('diff2html'), Docs.hljsTheme()]);
        const context = parseInt(this.getAttribute('context'), 10);
        const patch = Diff.createTwoFilesPatch(file, file, clean(before.textContent), clean(after.textContent), '', '', { context: isNaN(context) ? 3 : context });
        const ui = new Diff2HtmlUI(target, patch, {
          outputFormat: this.getAttribute('mode') === 'line' ? 'line-by-line' : 'side-by-side',
          drawFileList: false, matching: 'lines', highlight: true, fileContentToggle: false, synchronisedScroll: true,
          colorScheme: Docs.theme() === 'dark' ? 'dark' : 'light',
        }, hljs);
        ui.draw();
        ui.highlightCode();
      } catch (e) {
        Docs.fail(this, `doc-diff: ${e.message}`);
      }
    }
  }

  customElements.define('doc-diff', DocDiff);
})();
