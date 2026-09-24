/* doc-cron — a cron expression followed by what it means in plain English.
   <doc-cron>30 9 * * 1-5</doc-cron>        → 30 9 * * 1-5  "At 09:30, Monday through Friday"
   <doc-cron tz="UTC">50 * * * *</doc-cron>  → adds the time zone after the sentence
   Five, six (with seconds) or seven fields, ranges, lists and step values; 24-hour clock. Translated by cronstrue.
   In Markdown: a ```cron fence with one expression per line. A malformed expression shows its error in place. */
(() => {
  class DocCron extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const expr = this.textContent.trim();
      const tz = this.getAttribute('tz');
      let text;
      try {
        await Docs.lib('cron');
        text = cronstrue.toString(expr, { use24HourTimeFormat: true, verbose: false });
      } catch (e) {
        return Docs.fail(this, `doc-cron: ${String(e.message || e)}`);
      }
      this.innerHTML = `<code class="dcron-expr">${Docs.esc(expr)}</code><span class="dcron-say">${Docs.esc(text)}${tz ? ` (${Docs.esc(tz)})` : ''}</span>`;
    }
  }

  customElements.define('doc-cron', DocCron);
})();
