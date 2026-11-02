/* doc-timeline — a timeline of events, compact by default.
   <doc-timeline [expanded] [horizontal]>
     <doc-event time="08:24" tone="ok|warn|bad|info" title="First entry" [open]>Details, HTML allowed.</doc-event>
   </doc-timeline>
   Compact (default): one line per event — dot, time, title — so the whole sequence reads at a glance; an event with
   details gets a chevron and opens them in place on click (Enter/Space). `open` starts one event opened.
   `expanded` shows every event's details at once, fading in as they scroll into view. `horizontal` lays the events
   out sideways as cards (details always shown) and scrolls. */
(() => {
  let seq = 0;
  class DocTimeline extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const events = [...this.children].filter(c => c.tagName === 'DOC-EVENT');
      if (!events.length) return Docs.fail(this, 'doc-timeline: needs <doc-event> children');
      const horizontal = this.hasAttribute('horizontal');
      const compact = !horizontal && !this.hasAttribute('expanded');
      this.classList.toggle('dtl-compact', compact);
      const id = ++seq;
      events.forEach((ev, i) => {
        const hasBody = [...ev.childNodes].some(n => n.nodeType === 1 || n.textContent.trim());
        const body = Object.assign(document.createElement('div'), { className: 'dtl-body', id: `dtl-${id}-${i}` });
        body.append(...ev.childNodes);
        const toggles = compact && hasBody;
        const head = document.createElement(toggles ? 'button' : 'div');
        head.className = 'dtl-head';
        head.innerHTML = `<span class="dtl-time">${Docs.esc(ev.getAttribute('time') || '')}</span><span class="dtl-title">${Docs.esc(ev.getAttribute('title') || '')}</span>`;
        if (toggles) {
          const open = ev.hasAttribute('open');
          Object.assign(head, { type: 'button' });
          head.setAttribute('aria-controls', body.id);
          head.setAttribute('aria-expanded', String(open));
          body.hidden = !open;
          head.addEventListener('click', () => {
            const on = head.getAttribute('aria-expanded') !== 'true';
            head.setAttribute('aria-expanded', String(on));
            body.hidden = !on;
            ev.classList.toggle('dtl-open', on);
          });
          ev.classList.toggle('dtl-open', open);
        }
        ev.replaceChildren(head, ...(hasBody ? [body] : []));
        ev.classList.add('dtl-event', `tone-${ev.getAttribute('tone') || 'none'}`);
      });
      // Only the expanded vertical timeline animates in: compact rows are short, and horizontal items off to the
      // side never intersect the viewport.
      if (compact || horizontal || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
