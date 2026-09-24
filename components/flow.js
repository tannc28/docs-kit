/* doc-flow — a system map where a packet travels hop by hop, one step at a time.
   <doc-flow [cols="4"] [autoplay] [interval="3.2"] [caption="…"]>
     <doc-node key="web" title="Web app" [kind="user|service|db|queue|device|external"] [at="1,2"]>Short description, HTML allowed</doc-node>
     <doc-hop from="web" to="api" label="GET /orders">What happens at this hop (HTML).</doc-hop>
   </doc-flow>
   A system map with a packet that travels hop by hop. Nodes sit on a grid (`cols`, default up to 4, or
   `at="row,col"` per node). Each <doc-hop> is one step: the packet flies from → to along a curved edge,
   both nodes light up, nodes already visited stay lit, the step's text shows below the map.
   from == to means work done inside one node (the node pulses). Stepper + player (◀ ▶/❚❚ ▶, progress,
   "All steps" = every hop as a list), keyboard ← → when focused. Narrow screens stack the nodes in one column.
   Honours prefers-reduced-motion (jumps instead of flying). Print lists every step. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const KINDS = ['user', 'service', 'db', 'queue', 'device', 'external'];
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Point on rect `r`'s border along the line from its centre toward (tx, ty).
  function border(r, tx, ty) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const s = Math.min(dx ? (r.w / 2) / Math.abs(dx) : Infinity, dy ? (r.h / 2) / Math.abs(dy) : Infinity);
    return { x: cx + dx * s, y: cy + dy * s };
  }

  class DocFlow extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const nodes = [...this.children].filter(c => c.tagName === 'DOC-NODE');
      const hops = [...this.children].filter(c => c.tagName === 'DOC-HOP');
      if (!nodes.length || !hops.length) return Docs.fail(this, 'doc-flow: needs <doc-node> and <doc-hop> children');
      const keys = new Set();
      for (const n of nodes) {
        const k = n.getAttribute('key');
        if (!k) return Docs.fail(this, 'doc-flow: every <doc-node> needs key="…"');
        keys.add(k);
      }
      for (const h of hops) for (const a of ['from', 'to']) {
        if (!keys.has(h.getAttribute(a))) return Docs.fail(this, `doc-flow: <doc-hop ${a}="${h.getAttribute(a)}"> matches no <doc-node key>`);
      }

      const cols = parseInt(this.getAttribute('cols'), 10) || Math.min(nodes.length, 4);
      const stage = document.createElement('div');
      stage.className = 'df-stage';
      stage.style.setProperty('--df-cols', cols);
      this.nodeEls = new Map();
      nodes.forEach(n => {
        const el = document.createElement('div');
        el.className = 'df-node';
        const kind = n.getAttribute('kind');
        el.dataset.kind = KINDS.includes(kind) ? kind : 'service';
        el.innerHTML = `<b>${Docs.esc(n.getAttribute('title') || n.getAttribute('key'))}</b>`
          + (n.innerHTML.trim() ? `<span>${n.innerHTML}</span>` : '');
        const at = (n.getAttribute('at') || '').split(',').map(v => parseInt(v, 10));
        if (at.length === 2 && at.every(Number.isFinite)) {
          el.classList.add('placed');
          el.style.setProperty('--r', at[0]);
          el.style.setProperty('--c', at[1]);
        }
        stage.append(el);
        this.nodeEls.set(n.getAttribute('key'), el);
      });

      this.svg = document.createElementNS(NS, 'svg');
      this.svg.setAttribute('class', 'df-svg');
      this.svg.setAttribute('aria-hidden', 'true');
      this.edgeG = document.createElementNS(NS, 'g');
      this.active = document.createElementNS(NS, 'path');
      this.active.setAttribute('class', 'df-active');
      this.dot = document.createElementNS(NS, 'circle');
      this.dot.setAttribute('class', 'df-dot');
      this.dot.setAttribute('r', '7');
      this.svg.append(this.edgeG, this.active, this.dot);
      this.chip = document.createElement('div');
      this.chip.className = 'df-chip';
      stage.append(this.svg, this.chip);

      this.hops = hops.map(h => ({
        from: h.getAttribute('from'), to: h.getAttribute('to'),
        label: h.getAttribute('label') || '', html: h.innerHTML,
      }));

      this.nav = Docs.stepper(this.hops.map(h => h.label || `${h.from} → ${h.to}`));
      const nav = this.nav.el;
      const panel = document.createElement('div');
      panel.className = 'df-panel';
      this.player = Docs.player({ all: true });
      const bar = this.player.el;
      const parts = [nav, stage, panel, bar];
      const cap = this.getAttribute('caption');
      if (cap) {
        const c = document.createElement('div');
        c.className = 'df-caption';
        c.textContent = cap;
        parts.splice(2, 0, c);
      }
      this.replaceChildren(...parts);

      this.stage = stage;
      this.panel = panel;
      this.tabIndex = 0;

      nav.addEventListener('click', e => {
        const p = e.target.closest('.dk-step');
        if (p) { this.stop(); this.go(+p.dataset.i); }
      });
      bar.addEventListener('click', e => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'prev') { this.stop(); this.go(this.i - 1); }
        if (a === 'next') { this.stop(); this.go(this.i + 1); }
        if (a === 'play') this.timer ? this.stop() : this.play();
        if (a === 'all') { this.stop(); this.showAll(); }
      });
      this.addEventListener('keydown', e => {
        if (e.target !== this) return;
        if (e.key === 'ArrowRight') { this.stop(); this.go(this.i + 1); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { this.stop(); this.go(this.i - 1); e.preventDefault(); }
      });

      this.ro = new ResizeObserver(() => { this.layout(); this.place(this.i, true); });
      this.ro.observe(stage);
      this.i = 0;
      this.layout();
      this.go(0, true);
      this.stop();
      if (this.hasAttribute('autoplay')) this.play();
    }

    disconnectedCallback() {
      clearInterval(this.timer);
      cancelAnimationFrame(this.raf);
      this.ro?.disconnect();
    }

    rect(key) {
      const s = this.stage.getBoundingClientRect(), r = this.nodeEls.get(key).getBoundingClientRect();
      return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
    }

    path(from, to) {
      const a = this.rect(from), b = this.rect(to);
      const p0 = border(a, b.x + b.w / 2, b.y + b.h / 2), p1 = border(b, a.x + a.w / 2, a.y + a.h / 2);
      const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, dx = p1.x - p0.x, dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy) || 1, bend = Math.min(60, len * 0.18);
      const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
      return `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }

    // Faint edges for every distinct pair, redrawn whenever the grid reflows.
    layout() {
      const seen = new Set();
      this.edgeG.replaceChildren(...this.hops.filter(h => {
        const k = `${h.from}>${h.to}`;
        if (h.from === h.to || seen.has(k)) return false;
        seen.add(k);
        return true;
      }).map(h => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('class', 'df-edge');
        p.setAttribute('d', this.path(h.from, h.to));
        return p;
      }));
    }

    go(i, instant = false) {
      const n = this.hops.length;
      this.i = ((i % n) + n) % n;
      this.classList.remove('all');
      const h = this.hops[this.i];
      const visited = new Set(this.hops.slice(0, this.i + 1).flatMap(x => [x.from, x.to]));
      this.nodeEls.forEach((el, k) => {
        el.classList.toggle('from', k === h.from && h.from !== h.to);
        el.classList.toggle('to', k === h.to);
        el.classList.toggle('dim', !visited.has(k));
        el.toggleAttribute('data-current', k === h.to);  // kit convention: the element a container should keep in view
      });
      this.nav.at(this.i);
      this.player.at(this.i, n);
      const title = this.nodeEls.get(h.from).querySelector('b').textContent;
      const dest = this.nodeEls.get(h.to).querySelector('b').textContent;
      this.panel.innerHTML = `<div class="df-route">${Docs.esc(h.from === h.to ? dest : `${title} → ${dest}`)}</div>`
        + (h.label ? `<h4>${Docs.esc(h.label)}</h4>` : '') + `<div class="df-body">${h.html}</div>`;
      this.place(this.i, instant || reduced());
    }

    // Draw the active edge and move the packet; `instant` parks it at the destination.
    place(i, instant) {
      cancelAnimationFrame(this.raf);
      const h = this.hops[i];
      if (!h || this.classList.contains('all')) return;
      this.chip.textContent = h.label;
      this.chip.hidden = !h.label;
      const target = this.nodeEls.get(h.to);
      if (h.from === h.to) {
        const r = this.rect(h.to);
        this.active.setAttribute('d', '');
        this.moveTo(r.x + r.w / 2, r.y + r.h / 2);
        if (!instant) this.pulse(target);
        return;
      }
      this.active.setAttribute('d', this.path(h.from, h.to));
      const total = this.active.getTotalLength();
      if (instant || !total) {
        const p = this.active.getPointAtLength(total);
        this.moveTo(p.x, p.y);
        return;
      }
      const dur = Math.min(1300, 450 + total * 1.4), t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const p = this.active.getPointAtLength(total * e);
        this.moveTo(p.x, p.y);
        if (t < 1) this.raf = requestAnimationFrame(step);
        else this.pulse(target);
      };
      this.raf = requestAnimationFrame(step);
    }

    moveTo(x, y) {
      this.dot.setAttribute('cx', x.toFixed(1));
      this.dot.setAttribute('cy', y.toFixed(1));
      this.chip.style.left = `${x}px`;
      this.chip.style.top = `${y}px`;
    }

    pulse(el) {
      el.classList.remove('hit');
      void el.offsetWidth;
      el.classList.add('hit');
    }

    showAll() {
      cancelAnimationFrame(this.raf);
      this.classList.add('all');
      this.active.setAttribute('d', '');
      this.chip.hidden = true;
      this.nodeEls.forEach(el => el.classList.remove('from', 'to', 'dim'));
      this.nav.at(-1);
      this.player.whole(this.hops.length);
      const name = k => Docs.esc(this.nodeEls.get(k).querySelector('b').textContent);
      this.panel.innerHTML = '<ol class="df-all">' + this.hops.map(h =>
        `<li><div class="df-route">${h.from === h.to ? name(h.to) : `${name(h.from)} → ${name(h.to)}`}</div>`
        + (h.label ? `<b>${Docs.esc(h.label)}</b>` : '') + `<div class="df-body">${h.html}</div></li>`).join('') + '</ol>';
    }

    play() {
      clearInterval(this.timer);
      const ms = (parseFloat(this.getAttribute('interval')) || 3.2) * 1000;
      if (this.classList.contains('all')) this.go(0);
      this.timer = setInterval(() => this.go(this.i + 1), ms);
      this.player.playing(true);
    }

    stop() {
      clearInterval(this.timer);
      this.timer = null;
      this.player.playing(false);
    }
  }

  customElements.define('doc-flow', DocFlow);
})();
