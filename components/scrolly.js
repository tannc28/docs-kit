/* <doc-scrolly [side="right|left"] [offset="0.55"]>
     <div>…the visual: doc-map, doc-flow, doc-steps, doc-seq, an image, any element…</div>
     <section data-go="#tour:2" [data-highlight="#part"]>Text for this step (HTML).</section>
     <section>…</section>
   </doc-scrolly>
   Scrollytelling (Scrollama, MIT): the visual stays pinned while the text steps scroll past it. The first child
   that is not a <section> is the visual. When a step reaches `offset` (0 = top of the viewport, 1 = bottom):
     data-go="selector:index"  drives a component on the page — calls its go(index) (doc-map, doc-flow, doc-steps)
                               or show(index) (doc-seq), so the reader scrolls instead of pressing play
     data-highlight="selector" adds .doc-hl to matching elements inside the visual while the step is active
   and the element fires `scrolly:step` with detail {index, step} for a doc's own script.
   Narrow screens pin the visual over the top half and scroll the step cards up underneath it; when the visual
   is taller than that, the pinned area scrolls to the element marked [data-current] (doc-flow sets it on the
   active node) or to the first .doc-hl, so the part being discussed stays on screen. */
(() => {
  class DocScrolly extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const steps = [...this.children].filter(c => c.tagName === 'SECTION');
      const visual = [...this.children].find(c => c.tagName !== 'SECTION');
      if (!visual || !steps.length) return Docs.fail(this, 'doc-scrolly: needs one visual element and at least one <section>');
      const stage = document.createElement('div');
      stage.className = 'dsc-stage';
      stage.append(visual);
      const text = document.createElement('div');
      text.className = 'dsc-steps';
      steps.forEach(s => { s.classList.add('dsc-step'); text.append(s); });
      this.append(stage, text);
      this.classList.toggle('dsc-left', this.getAttribute('side') === 'left');
      this.steps = steps;
      this.visual = visual;
      this.enter(0);
      try { await Docs.lib('scrollama'); } catch (e) { return Docs.fail(this, `doc-scrolly: ${e.message}`); }
      this.scroller = scrollama();
      // narrow screens pin the visual over the top half, so a step triggers in the lower half
      const narrow = window.matchMedia('(max-width: 860px)').matches;
      this.scroller.setup({ step: steps, offset: narrow ? 0.75 : parseFloat(this.getAttribute('offset')) || 0.55 })
        .onStepEnter(({ index }) => this.enter(index));
      this.onResize = () => this.scroller.resize();
      window.addEventListener('resize', this.onResize);
    }

    disconnectedCallback() {
      this.scroller?.destroy();
      window.removeEventListener('resize', this.onResize);
    }

    enter(i) {
      this.steps.forEach((s, k) => s.classList.toggle('on', k === i));
      const step = this.steps[i];
      this.visual.querySelectorAll('.doc-hl').forEach(e => e.classList.remove('doc-hl'));
      const hl = step.dataset.highlight;
      if (hl) this.visual.querySelectorAll(hl).forEach(e => e.classList.add('doc-hl'));
      const go = step.dataset.go;
      if (go) {
        const at = go.lastIndexOf(':');
        drive(go.slice(0, at), parseInt(go.slice(at + 1), 10) || 0, () => this.focusStage());
      }
      this.focusStage();
      this.dispatchEvent(new CustomEvent('scrolly:step', { detail: { index: i, step }, bubbles: true }));
    }

    // keep the focused part of a tall pinned visual inside the pinned area
    focusStage() {
      const stage = this.visual.parentElement;
      if (stage.scrollHeight <= stage.clientHeight + 1) return;
      const t = stage.querySelector('[data-current]') || stage.querySelector('.doc-hl');
      if (!t) return;
      const top = t.getBoundingClientRect().top - stage.getBoundingClientRect().top + stage.scrollTop;
      stage.scrollTo({ top: Math.max(0, top - 12), behavior: 'smooth' });
    }
  }

  // components build themselves asynchronously (libraries load on demand), so retry briefly until the target is ready
  function drive(selector, index, done, tries = 20) {
    const el = document.querySelector(selector);
    try {
      el.stop?.();
      if (typeof el.go === 'function') el.go(index);
      else if (typeof el.show === 'function') el.show(index);
      else throw new Error('not ready');
      done?.();
    } catch (e) {
      if (tries) setTimeout(() => drive(selector, index, done, tries - 1), 250);
      else console.warn('[docs] doc-scrolly: cannot drive', selector, e.message);
    }
  }

  customElements.define('doc-scrolly', DocScrolly);
})();
