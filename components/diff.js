/* doc-diff — a before/after diff of two texts, side by side or unified.
   <doc-diff file="application.yaml" [mode="line"] [context="3"] [start="120"]>
     <script type="text/plain" data-before>…old text…</script>
     <script type="text/plain" data-after>…new text…</script>
   </doc-diff>
   Side-by-side by default; below about 640px of width it switches itself to the unified view, where two columns would
   not fit, and back when there is room again. mode="line" asks for the unified view always.
   start = the line number of the excerpt's first line in the real file, so the numbers match the file (default 1).
   Long lines wrap instead of being cut. The file extension picks the highlighting language.
   Write the text flush-left inside the scripts: indentation is kept as-is (it matters for YAML). */
(() => {
  const NARROW = 640;   // px: below this, two code columns are too narrow to read
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
        const shift = Math.max(0, (parseInt(this.getAttribute('start'), 10) || 1) - 1);
        // jsdiff numbers from 1; moving every hunk header by start - 1 makes diff2html print the file's own numbers.
        const patch = Diff.createTwoFilesPatch(file, file, clean(before.textContent), clean(after.textContent), '', '', { context: isNaN(context) ? 3 : context })
          .replace(/^@@ -(\d+)(,\d+)? \+(\d+)(,\d+)? @@/gm, (m, a, b = '', c, d = '') => `@@ -${+a + shift}${b} +${+c + shift}${d} @@`);
        const forced = this.getAttribute('mode') === 'line';
        let drawn = null;
        const draw = () => {
          const unified = forced || this.clientWidth < NARROW;
          if (drawn === unified) return;
          drawn = unified;
          const ui = new Diff2HtmlUI(target, patch, {
            outputFormat: unified ? 'line-by-line' : 'side-by-side',
            drawFileList: false, matching: 'lines', highlight: true, fileContentToggle: false, synchronisedScroll: true,
            colorScheme: Docs.theme() === 'dark' ? 'dark' : 'light',
          }, hljs);
          ui.draw();
          ui.highlightCode();
        };
        draw();
        if (!forced) new ResizeObserver(draw).observe(this);
      } catch (e) {
        Docs.fail(this, `doc-diff: ${e.message}`);
      }
    }
  }

  customElements.define('doc-diff', DocDiff);
})();
