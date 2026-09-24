/* <doc-timeline [horizontal]>
     <doc-event time="08:24" tone="ok|warn|bad|info" title="First entry">Details, HTML allowed.</doc-event>
   </doc-timeline>
   Vertical by default; events fade in as they scroll into view. `horizontal` scrolls sideways. */
(() => {
  class DocTimeline extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const events = [...this.children].filter(c => c.tagName === 'DOC-EVENT');
      if (!events.length) return Docs.fail(this, 'doc-timeline: needs <doc-event> children');
      events.forEach(ev => {
        const body = Object.assign(document.createElement('div'), { className: 'dtl-body' });
        body.append(...ev.childNodes);
        const head = Object.assign(document.createElement('div'), { className: 'dtl-head' });
        head.innerHTML = `<span class="dtl-time">${Docs.esc(ev.getAttribute('time') || '')}</span><span class="dtl-title">${Docs.esc(ev.getAttribute('title') || '')}</span>`;
        ev.replaceChildren(head, body);
        ev.classList.add('dtl-event', `tone-${ev.getAttribute('tone') || 'none'}`);
      });
      // horizontal items off to the side never intersect the viewport, so only vertical ones animate in
      if (this.hasAttribute('horizontal') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.remove('dtl-wait');
        io.unobserve(e.target);
      }), { rootMargin: '0px 0px -6% 0px' });
      events.forEach((ev, i) => {
        ev.classList.add('dtl-wait');
        ev.style.transitionDelay = `${Math.min(i, 6) * 60}ms`;
        io.observe(ev);
      });
    }
  }

  customElements.define('doc-timeline', DocTimeline);
})();
