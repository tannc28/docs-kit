/* <doc-note for="#target" [title="…"] [tone="info|new|warn|bad"] [shape="ring|box|line"] [at="tr|tl|br|bl"]>
     Body HTML: mapping, code refs, why.
   </doc-note>
   An annotation on any element: a small numbered badge on the target's corner; hovering the badge or the target
   tints the target's outline and shows the body as a card (keyboard focus and tap work too; tap again or Esc closes).
   Default look is clean. `shape` opts into a hand-drawn mark (sketchy ring, box or underline) for whiteboard-style pages.
   Put the tag anywhere; it moves itself into the target.
   Without `for`, it annotates its previous element sibling. Numbers follow document order.
   The target gets position:relative when it is static. Several notes on one target stack their markers. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const TONES = ['info', 'new', 'warn', 'bad'];
  let count = 0, open = null;

  // Deterministic jitter: same drawing on every load.
  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // Paths live in a 0..100 box stretched over the target (preserveAspectRatio none, non-scaling stroke).
  // A loose superellipse: hugs a rectangle (an ellipse would miss its corners or balloon on wide targets),
  // overshoots its start like a pen stroke.
  function ring(r) {
    const pts = [], turns = 1.1, n = 30, start = r() * Math.PI * 2;
    const se = v => Math.sign(v) * Math.abs(v) ** (1 / 3);
    for (let i = 0; i <= n; i++) {
      const a = start + (i / n) * Math.PI * 2 * turns;
      const k = 1 + (r() - .5) * .03 + i / n * .03;
      pts.push([50 + se(Math.cos(a)) * 51 * k, 50 + se(Math.sin(a)) * 53 * k]);
    }
    return 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L');
  }
  function box(r) {
    const j = () => (r() - .5) * 1.6;
    const c = [[1 + j(), 1.5 + j()], [99 + j(), 1 + j()], [99 + j(), 99 + j()], [1 + j(), 99 + j()], [1.5 + j(), -.5 + j()]];
    return 'M' + c.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L');
  }
  function line(r) {
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push([i * 10 , 97 + Math.sin(i * 1.3) * 1.5 + (r() - .5) * 2]);
    return 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L');
  }
  const SHAPES = { ring, box, line };

  function closeOpen() { if (open) { open.hide(); open = null; } }
  document.addEventListener('keydown', e => e.key === 'Escape' && closeOpen());
  document.addEventListener('click', e => { if (open && !e.target.closest('.dn-marker, .dn-card')) closeOpen(); });
  addEventListener('scroll', () => open?.place(), { passive: true });
  addEventListener('resize', () => open?.place());

  class DocNote extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const sel = this.getAttribute('for');
      const target = sel ? document.querySelector(sel) : this.previousElementSibling;
      if (!target) return Docs.fail(this, `doc-note: target not found (${sel || 'previous sibling'})`);
      const num = ++count;
      const tone = TONES.includes(this.getAttribute('tone')) ? this.getAttribute('tone') : 'info';
      const shape = SHAPES[this.getAttribute('shape')];
      const at = this.getAttribute('at') || 'tr';
      const title = this.getAttribute('title') || '';
      const body = this.innerHTML;

      if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
      const stackIndex = target.querySelectorAll(':scope > doc-note').length;
      target.dataset.dnTarget = '';
      target.append(this);
      this.className = `dn dn-${tone}`;
      this.replaceChildren();

      let svg = null;
      if (shape) {
        svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        svg.classList.add('dn-shape');
        const r = rng(num * 7919 + 17);
        for (let pass = 0; pass < 2; pass++) {
          const p = document.createElementNS(NS, 'path');
          p.setAttribute('d', shape(r));
          p.setAttribute('vector-effect', 'non-scaling-stroke');
          if (pass) p.classList.add('dn-second');
          svg.append(p);
        }
      }

      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = `dn-marker dn-at-${at}`;
      marker.textContent = num;
      marker.style.setProperty('--dn-stack', stackIndex);
      marker.setAttribute('aria-label', `${Docs.t('note', { n: num })}${title ? ': ' + title : ''}`);

      const card = document.createElement('div');
      card.className = `dn-card dn-${tone}`;
      card.hidden = true;
      card.innerHTML = `<div class="dn-title"><span>${num}</span>${title}</div><div class="dn-body">${body}</div>`;
      document.body.append(card);

      if (svg) this.append(svg);
      this.append(marker);
      if (!svg) this.classList.add('dn-clean');
      this.hide = () => { card.hidden = true; this.classList.remove('dn-on'); };
      this.place = () => {
        const m = marker.getBoundingClientRect();
        card.style.left = '0px'; card.style.top = '0px';
        const w = card.offsetWidth, h = card.offsetHeight;
        let left = Math.min(Math.max(8, m.left + m.width / 2 - 24), innerWidth - w - 8);
        let top = m.bottom + 8;
        if (top + h > innerHeight - 8 && m.top - h - 8 > 8) top = m.top - h - 8;
        card.style.left = `${left}px`; card.style.top = `${top}px`;
      };
      const show = () => {
        if (open && open !== this) open.hide();
        open = this;
        card.hidden = false;
        this.classList.add('dn-on');
        this.place();
      };
      let timer;
      const enter = () => { clearTimeout(timer); show(); };
      const leave = () => { timer = setTimeout(() => { if (!this._pinned && open === this) closeOpen(); }, 180); };

      marker.addEventListener('mouseenter', enter);
      marker.addEventListener('mouseleave', leave);
      marker.addEventListener('focus', show);
      marker.addEventListener('click', e => {
        e.stopPropagation();
        this._pinned = !(this._pinned && open === this);
        this._pinned ? show() : closeOpen();
      });
      card.addEventListener('mouseenter', () => clearTimeout(timer));
      card.addEventListener('mouseleave', leave);
      // Hovering the target itself opens its innermost note only, so nested annotated parts stay usable.
      target.addEventListener('mouseover', e => {
        if (e.target.closest('[data-dn-target]') !== target || e.target.closest('.dn-card')) return;
        if (target.querySelector(':scope > doc-note') === this) enter();
      });
      target.addEventListener('mouseleave', leave);
    }
  }
  customElements.define('doc-note', DocNote);
})();
