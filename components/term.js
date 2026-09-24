/* <doc-term def="Sending the same request twice has the same effect as sending it once">idempotent</doc-term>
     → dotted term; the definition appears on hover or keyboard focus.
   <doc-glossary></doc-glossary>
     → lists every doc-term on the page, first definition wins, sorted with the page language's collation (<html lang>). */
(() => {
  let tip;
  const hide = () => { if (tip) tip.hidden = true; };

  function show(term) {
    const def = term.getAttribute('def');
    if (!def) return;
    tip ||= Object.assign(document.createElement('div'), { className: 'dterm-tip', role: 'tooltip' });
    if (!tip.isConnected) document.body.append(tip);
    tip.textContent = def;
    tip.hidden = false;
    const r = term.getBoundingClientRect(), t = tip.getBoundingClientRect();
    const above = r.top > t.height + 14;
    tip.style.top = `${above ? r.top - t.height - 8 : r.bottom + 8}px`;
    tip.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - t.width / 2, innerWidth - t.width - 8))}px`;
  }

  class DocTerm extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      if (!this.getAttribute('def')) console.warn('[docs] doc-term without def:', this.textContent.trim());
      this.tabIndex = 0;
      this.addEventListener('mouseenter', () => show(this));
      this.addEventListener('focus', () => show(this));
      this.addEventListener('mouseleave', hide);
      this.addEventListener('blur', hide);
    }
  }

  class DocGlossary extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const seen = new Map();
      document.querySelectorAll('doc-term').forEach(t => {
        const word = t.textContent.trim();
        const key = word.toLowerCase();
        if (word && !seen.has(key)) seen.set(key, [word, t.getAttribute('def') || '']);
      });
      const rows = [...seen.values()].sort((a, b) => a[0].localeCompare(b[0], document.documentElement.lang || undefined));
      this.innerHTML = rows.length
        ? `<dl class="gloss">${rows.map(([w, d]) => `<dt>${Docs.esc(w)}</dt><dd>${Docs.esc(d)}</dd>`).join('')}</dl>`
        : `<p class="muted">${Docs.esc(Docs.t('noTerms'))}</p>`;
    }
  }

  addEventListener('scroll', hide, { passive: true, capture: true });
  customElements.define('doc-term', DocTerm);
  customElements.define('doc-glossary', DocGlossary);
})();
