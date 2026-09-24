/* <doc-seq [autoplay] [interval="2.5"] [caption="…"]>
     participant API as order-service
     Web->>API: POST /orders
     API->>DB: INSERT order
   </doc-seq>
   Body = Mermaid sequenceDiagram syntax (the "sequenceDiagram" line is optional; write &lt; for "<").
   Draws with the vendored Mermaid, then plays messages one by one: past messages stay, the current one
   is highlighted, later ones are faded. Player: ◀ ▶/❚❚ ▶ + progress + "All steps"; keyboard ← → when focused. */
(() => {
  let uid = 0;

  class DocSeq extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const body = this.textContent.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
      const code = /^sequenceDiagram\b/.test(body) ? body : `sequenceDiagram\n${body}`;
      const caption = this.getAttribute('caption');
      this.innerHTML = `<div class="dseq-stage"><span class="muted small">${Docs.esc(Docs.t('drawing'))}</span></div>`;
      const id = `dseq${++uid}`;
      let svg;
      try {
        const mermaid = await Docs.mermaid();
        ({ svg } = await mermaid.render(id, code));
      } catch (e) {
        document.getElementById('d' + id)?.remove();   // mermaid leaves its scratch element behind on errors
        return Docs.fail(this, `doc-seq: ${e.message || e}`);
      }
      const stage = this.querySelector('.dseq-stage');
      stage.innerHTML = svg;
      const texts = [...stage.querySelectorAll('text.messageText')];
      const lines = [...stage.querySelectorAll('.messageLine0, .messageLine1')];
      this.msgs = texts.map((t, i) => ({ els: [t, lines[i]].filter(Boolean), label: t.textContent.trim() }));
      if (caption) this.append(Object.assign(document.createElement('div'), { className: 'dseq-caption', textContent: caption }));
      if (!this.msgs.length) return;

      this.player = Docs.player({ all: true });
      const bar = this.player.el;
      (this.querySelector('.dseq-caption') || stage).after(bar);
      this.tabIndex = 0;
      bar.addEventListener('click', e => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'prev') { this.stop(); this.show(Math.max(0, this.cur() - 1)); }
        if (a === 'next') { this.stop(); this.show(Math.min(this.msgs.length - 1, this.cur() + 1)); }
        if (a === 'all') { this.stop(); this.show(this.msgs.length); }
        if (a === 'play') this.timer ? this.stop() : this.play();
      });
      this.addEventListener('keydown', e => {
        if (e.target !== this) return;
        if (e.key === 'ArrowRight') { this.stop(); this.show(Math.min(this.msgs.length - 1, this.cur() + 1)); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { this.stop(); this.show(Math.max(0, this.cur() - 1)); e.preventDefault(); }
      });
      this.show(this.msgs.length);
      this.stop();
      if (this.hasAttribute('autoplay')) this.play();
    }

    disconnectedCallback() { clearInterval(this.timer); }

    // k = index of the current message; k === msgs.length means "everything, nothing highlighted"
    cur() { return this.k >= this.msgs.length ? -1 : this.k; }

    show(k) {
      const n = this.msgs.length;
      this.k = k;
      this.msgs.forEach((m, j) => m.els.forEach(el => {
        el.classList.toggle('dseq-future', k < n && j > k);
        el.classList.toggle('dseq-now', j === k);
      }));
      if (k >= 0 && k < n) { this.player.at(k, n); this.player.text(this.msgs[k].label); }
      else { this.player.whole(n); this.player.text(Docs.t('seqIdle', { n })); }
    }

    play() {
      if (this.k >= this.msgs.length - 1) this.show(-1);
      const ms = (parseFloat(this.getAttribute('interval')) || 2.5) * 1000;
      const tick = () => {
        if (this.k >= this.msgs.length - 1) { this.stop(); this.show(this.msgs.length); return; }
        this.show(this.k + 1);
      };
      tick();
      this.timer = setInterval(tick, ms);
      this.player.playing(true);
    }

    stop() {
      clearInterval(this.timer);
      this.timer = null;
      this.player.playing(false);
    }
  }

  customElements.define('doc-seq', DocSeq);
})();
