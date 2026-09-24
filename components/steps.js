/* doc-steps — a step-by-step explanation with a stepper, player and highlights.
   <doc-steps [autoplay] [interval="4"] [for="#diagram"]>
     <section data-title="Submit the form" data-highlight="#form, .submit">…</section>
     <section data-title="Save the order">…</section>
   </doc-steps>
   One section at a time: a stepper (numbered steps joined by a progress line), a player (◀ ▶/❚❚ ▶ + progress),
   keyboard ← → when focused. data-highlight = CSS selector; the matching elements inside `for` (default: the
   whole page) get .doc-hl while the step is active — walk through a diagram, mock or table. Print shows every step. */
(() => {
  class DocSteps extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const steps = [...this.children].filter(c => c.tagName === 'SECTION');
      if (!steps.length) return Docs.fail(this, 'doc-steps: needs at least one <section>');
      this.steps = steps;
      this.lit = [];

      this.nav = Docs.stepper(steps.map(s => s.dataset.title));
      const stage = document.createElement('div');
      stage.className = 'ds-stage';
      steps.forEach(s => { s.classList.add('ds-step'); stage.append(s); });
      this.player = Docs.player();
      this.replaceChildren(this.nav.el, stage, this.player.el);
      this.tabIndex = 0;

      this.nav.el.addEventListener('click', e => {
        const s = e.target.closest('.dk-step');
        if (s) { this.stop(); this.go(+s.dataset.i); }
      });
      this.player.el.addEventListener('click', e => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'prev') { this.stop(); this.go(this.i - 1); }
        if (a === 'next') { this.stop(); this.go(this.i + 1); }
        if (a === 'play') this.timer ? this.stop() : this.play();
      });
      this.addEventListener('keydown', e => {
        if (e.target !== this) return;
        if (e.key === 'ArrowRight') { this.stop(); this.go(this.i + 1); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { this.stop(); this.go(this.i - 1); e.preventDefault(); }
      });
      // diagrams render asynchronously: re-apply the highlight once they exist
      this.onRendered = () => this.go(this.i);
      document.addEventListener('docs:rendered', this.onRendered);

      this.go(0);
      this.stop();
      if (this.hasAttribute('autoplay')) this.play();
    }

    disconnectedCallback() {
      clearInterval(this.timer);
      document.removeEventListener('docs:rendered', this.onRendered);
    }

    go(i) {
      const n = this.steps.length;
      this.i = ((i % n) + n) % n;
      this.steps.forEach((s, k) => s.classList.toggle('on', k === this.i));
      this.nav.at(this.i);
      this.player.at(this.i, n);

      this.lit.forEach(el => el.classList.remove('doc-hl'));
      this.lit = [];
      const sel = this.steps[this.i].dataset.highlight;
      const forSel = this.getAttribute('for');
      const scope = forSel ? document.querySelector(forSel) : document;
      if (sel && scope) {
        try { this.lit = [...scope.querySelectorAll(sel)]; } catch { console.warn('[docs] doc-steps: bad data-highlight selector', sel); }
      }
      this.lit.forEach(el => el.classList.add('doc-hl'));
    }

    play() {
      clearInterval(this.timer);
      const ms = (parseFloat(this.getAttribute('interval')) || 4) * 1000;
      this.timer = setInterval(() => this.go(this.i + 1), ms);
      this.player.playing(true);
    }

    stop() {
      clearInterval(this.timer);
      this.timer = null;
      this.player.playing(false);
    }
  }

  customElements.define('doc-steps', DocSteps);
})();
