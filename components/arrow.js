/* <doc-arrow from="#a" to="#b" [label="Kafka"] [tone="ok|warn|bad|info"] [dashed] [flow]></doc-arrow>
   Curved arrow between two elements anywhere on the page (cards, mock parts, table cells), drawn on one shared
   overlay. Redraws on resize, after diagrams render and after clicks (tabs, steps, the TOC move things).
   Hidden while either end is not visible. `flow` animates dashes toward the target. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const TONES = ['none', 'ok', 'warn', 'bad', 'info'];
  const arrows = new Set();
  let layer, queued = false;

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const root = document.documentElement;
      layer.setAttribute('width', root.scrollWidth);
      layer.setAttribute('height', root.scrollHeight);
      arrows.forEach(a => a.draw());
    });
  };

  function ensureLayer() {
    if (layer) return;
    layer = document.createElementNS(NS, 'svg');
    layer.setAttribute('class', 'darr-layer');
    layer.innerHTML = `<defs>${TONES.map(t => `<marker id="darr-head-${t}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="darr-head darr-tone-${t}"/></marker>`).join('')}</defs>`;
    document.body.append(layer);
    addEventListener('resize', schedule);
    document.addEventListener('docs:rendered', schedule);
    document.addEventListener('click', () => setTimeout(schedule, 60));
    new ResizeObserver(schedule).observe(document.body);
  }

  const shown = el => el && el.isConnected && !el.closest('.dt-off, [hidden], .ds-step:not(.on)') && el.getClientRects().length > 0;

  function box(el) {
    const r = el.getBoundingClientRect();
    return { l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY, b: r.bottom + scrollY, cx: r.left + scrollX + r.width / 2, cy: r.top + scrollY + r.height / 2 };
  }

  class DocArrow extends HTMLElement {
    connectedCallback() {
      ensureLayer();
      this.g ||= document.createElementNS(NS, 'g');
      layer.append(this.g);
      arrows.add(this);
      schedule();
    }

    disconnectedCallback() {
      arrows.delete(this);
      this.g?.remove();
    }

    draw() {
      let from, to;
      try {
        from = document.querySelector(this.getAttribute('from'));
        to = document.querySelector(this.getAttribute('to'));
      } catch { from = to = null; }
      if (!shown(from) || !shown(to)) { this.g.innerHTML = ''; return; }
      const a = box(from), b = box(to);
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      let p0, p3, c1, c2;
      if (Math.abs(dx) >= Math.abs(dy)) {
        const s = Math.sign(dx) || 1, k = Math.max(40, Math.abs(dx) * 0.4);
        p0 = [s > 0 ? a.r : a.l, a.cy]; p3 = [s > 0 ? b.l : b.r, b.cy];
        c1 = [p0[0] + s * k, p0[1]]; c2 = [p3[0] - s * k, p3[1]];
      } else {
        const s = Math.sign(dy) || 1, k = Math.max(40, Math.abs(dy) * 0.4);
        p0 = [a.cx, s > 0 ? a.b : a.t]; p3 = [b.cx, s > 0 ? b.t : b.b];
        c1 = [p0[0], p0[1] + s * k]; c2 = [p3[0], p3[1] - s * k];
      }
      const tone = TONES.includes(this.getAttribute('tone')) ? this.getAttribute('tone') : 'none';
      const cls = ['darr-path', `darr-tone-${tone}`, this.hasAttribute('dashed') ? 'darr-dashed' : '', this.hasAttribute('flow') ? 'darr-flow' : ''].join(' ');
      const d = `M${p0} C${c1} ${c2} ${p3}`;
      // label at the curve's midpoint (cubic Bezier at t = 0.5)
      const mid = [0, 1].map(i => 0.125 * p0[i] + 0.375 * c1[i] + 0.375 * c2[i] + 0.125 * p3[i]);
      const label = this.getAttribute('label');
      this.g.innerHTML = `<path d="${d}" class="${cls}" marker-end="url(#darr-head-${tone})"/>`
        + (label ? `<text x="${mid[0]}" y="${mid[1] - 6}" text-anchor="middle" class="darr-label">${Docs.esc(label)}</text>` : '');
    }
  }

  customElements.define('doc-arrow', DocArrow);
})();
