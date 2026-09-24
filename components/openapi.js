/* doc-openapi — a full API reference (endpoints, parameters, schemas, examples) from an OpenAPI spec written inline.
   <doc-openapi [height="720"]>
     <script type="text/plain">
       openapi: 3.0.3
       info: { title: Orders API, version: "1.0" }
       paths:
         /orders:
           post:
             summary: Place an order
             responses: { "201": { description: Created } }
     </script>
   </doc-openapi>
   The spec is YAML or JSON (OpenAPI 2 or 3), inline — nothing is fetched, so it works from file://. Rendered by
   Redoc inside a scrolling box of `height` pixels. In Markdown: ```openapi. */
(() => {
  class DocOpenapi extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const holder = this.querySelector(':scope > script');
      const text = (holder ? holder.textContent : this.textContent).replace(/^\s*\n/, '');
      const pad = Math.min(...text.split('\n').filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
      const source = text.split('\n').map(l => l.slice(pad)).join('\n');
      let spec;
      try {
        spec = /^\s*[{[]/.test(source) ? JSON.parse(source) : (await Docs.lib('yaml'), jsyaml.load(source));
      } catch (e) { return Docs.fail(this, `doc-openapi: cannot read the spec — ${e.message}`); }
      const box = document.createElement('div');
      box.className = 'dapi-box';
      box.style.height = `${parseInt(this.getAttribute('height'), 10) || 720}px`;
      this.replaceChildren(box);
      try {
        await Docs.lib('redoc');
        const token = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
        Redoc.init(spec, {
          scrollYOffset: 0, hideDownloadButton: true, expandResponses: '200,201', nativeScrollbars: true,
          theme: { colors: { primary: { main: token('--accent') || '#4f46e5' } },
            typography: { fontFamily: token('--sans') || 'sans-serif', headings: { fontFamily: token('--sans') || 'sans-serif' },
              code: { fontFamily: token('--mono') || 'monospace' } } },
        }, box);
      } catch (e) {
        Docs.fail(this, `doc-openapi: ${e.message}`);
      }
    }
  }

  customElements.define('doc-openapi', DocOpenapi);
})();
