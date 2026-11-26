/* doc-peek — bite-sized inline deep-dive card (a story, experiment or mechanism) opened in place without leaving the page.
   Dictionary form — define entries once in <script type="application/json" id="doc-peeks"> and reference by key:
     <doc-peek key="odysseus">Odysseus tied himself to the mast</doc-peek>
     <script type="application/json" id="doc-peeks">
       { "odysseus": { "kicker": "Classical story", "title": "Odysseus and the Sirens",
         "body": ["Paragraph one…", "Paragraph two…"], "point": "Key takeaway…", "source": "Homer, Odyssey XII" } }
     </script>
   Inline form — put details directly on the tag (body inside <template> or data-body):
     <doc-peek title="…" kicker="…" point="…" source="…">trigger<template><p>…</p></template></doc-peek> */
(() => {
  let cache = null;
  let dlg = null;

  function loadDict() {
    if (cache) return cache;
    cache = {};
    document.querySelectorAll('script[type="application/json"][id="doc-peeks"], script[type="application/json"][data-doc-peeks]').forEach(s => {
      try { Object.assign(cache, JSON.parse(s.textContent || '{}')); } catch (e) { console.error('[docs] doc-peeks JSON error:', e); }
    });
    return cache;
  }

  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'dpeek-dlg';
    dlg.innerHTML = `<div class="dpeek-head"><div><div class="dpeek-kicker"></div><h3 class="dpeek-title"></h3></div>`
      + `<button type="button" class="dpeek-x" aria-label="${Docs.esc(Docs.t('close'))}">✕</button></div>`
      + `<div class="dpeek-body"></div><div class="dpeek-point" hidden></div><div class="dpeek-src" hidden></div>`;
    dlg.querySelector('.dpeek-x').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
    return dlg;
  }

  function openPeek(entry, fallbackTitle) {
    const d = ensureDialog();
    const kickerEl = d.querySelector('.dpeek-kicker');
    const titleEl = d.querySelector('.dpeek-title');
    const bodyEl = d.querySelector('.dpeek-body');
    const pointEl = d.querySelector('.dpeek-point');
    const srcEl = d.querySelector('.dpeek-src');

    kickerEl.textContent = entry.kicker || '';
    kickerEl.hidden = !entry.kicker;
    titleEl.textContent = entry.title || fallbackTitle || '';

    if (entry.html) {
      bodyEl.innerHTML = entry.html;
    } else if (Array.isArray(entry.body)) {
      bodyEl.innerHTML = entry.body.map(p => `<p>${Docs.esc(p)}</p>`).join('');
    } else {
      bodyEl.innerHTML = entry.body ? `<p>${Docs.esc(entry.body)}</p>` : '';
    }

    pointEl.textContent = entry.point || '';
    pointEl.hidden = !entry.point;
    srcEl.textContent = entry.source || '';
    srcEl.hidden = !entry.source;

    if (!d.open) d.showModal();
  }

  class DocPeek extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const tpl = this.querySelector(':scope > template');
      const inlineHtml = tpl ? tpl.innerHTML : '';
      if (tpl) tpl.remove();

      this.setAttribute('role', 'button');
      this.tabIndex = 0;

      const trigger = () => {
        const key = this.getAttribute('key') || this.getAttribute('for');
        const fromDict = key ? loadDict()[key] : null;
        const entry = fromDict || {
          kicker: this.getAttribute('kicker') || '',
          title: this.getAttribute('title') || this.textContent.trim(),
          html: inlineHtml,
          body: this.getAttribute('body') || '',
          point: this.getAttribute('point') || '',
          source: this.getAttribute('source') || '',
        };
        openPeek(entry, this.textContent.trim());
      };

      this.addEventListener('click', trigger);
      this.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
      });
    }
  }

  customElements.define('doc-peek', DocPeek);
})();
