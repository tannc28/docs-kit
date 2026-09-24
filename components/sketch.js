/* doc-sketch — redraws a plain SVG in a hand-drawn style.
   <doc-sketch [roughness="1.3"] [fill-style="hachure|solid|zigzag|cross-hatch|dots"]>
     <svg viewBox="0 0 400 200"> plain <rect> <line> <circle> <ellipse> <polygon> <polyline> <path> and <text> </svg>
   </doc-sketch>
   Redraws the shapes in a hand-drawn style (Rough.js) — low-fidelity mocks and whiteboard diagrams.
   Text stays as written; each shape keeps its fill and stroke; the drawing is identical on every load.
   Put data-keep on a shape (or group) to leave it untouched, e.g. a background rect. */
(() => {
  const num = (el, a) => parseFloat(el.getAttribute(a)) || 0;
  const points = el => {
    const n = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
    const out = [];
    for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
    return out;
  };

  class DocSketch extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const svg = this.querySelector('svg');
      if (!svg) return Docs.fail(this, 'doc-sketch: needs an inline <svg>');
      try { await Docs.lib('rough'); } catch (e) { return Docs.fail(this, `doc-sketch: ${e.message}`); }
      const rc = rough.svg(svg);
      const base = { roughness: parseFloat(this.getAttribute('roughness')) || 1.3, bowing: 1.2, fillStyle: this.getAttribute('fill-style') || 'hachure', hachureGap: 6 };
      const ink = getComputedStyle(this).color;
      const shapes = [...svg.querySelectorAll('rect, line, circle, ellipse, polygon, polyline, path')]
        .filter(el => !el.closest('defs, marker, clipPath, mask, [data-keep]'));
      shapes.forEach((el, i) => {
        const cs = getComputedStyle(el);
        const o = {
          ...base, seed: i + 1,
          stroke: cs.stroke && cs.stroke !== 'none' ? cs.stroke : ink,
          strokeWidth: parseFloat(cs.strokeWidth) || 1.5,
          fill: cs.fill && cs.fill !== 'none' && el.tagName !== 'line' && el.tagName !== 'polyline' ? cs.fill : undefined,
        };
        let node;
        switch (el.tagName.toLowerCase()) {
          case 'rect': node = rc.rectangle(num(el, 'x'), num(el, 'y'), num(el, 'width'), num(el, 'height'), o); break;
          case 'line': node = rc.line(num(el, 'x1'), num(el, 'y1'), num(el, 'x2'), num(el, 'y2'), o); break;
          case 'circle': node = rc.circle(num(el, 'cx'), num(el, 'cy'), num(el, 'r') * 2, o); break;
          case 'ellipse': node = rc.ellipse(num(el, 'cx'), num(el, 'cy'), num(el, 'rx') * 2, num(el, 'ry') * 2, o); break;
          case 'polygon': node = rc.polygon(points(el), o); break;
          case 'polyline': node = rc.linearPath(points(el), o); break;
          case 'path': node = rc.path(el.getAttribute('d') || '', o); break;
        }
        if (!node) return;
        if (el.getAttribute('transform')) node.setAttribute('transform', el.getAttribute('transform'));
        if (el.id) node.id = el.id;
        el.replaceWith(node);
      });
    }
  }

  customElements.define('doc-sketch', DocSketch);
})();
