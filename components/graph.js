/* doc-graph — an architecture or dependency graph laid out automatically from nodes and edges.
   <doc-graph height="420" [direction="LR|TB"]>
     <script type="application/json">{
       "nodes": [{ "id": "api", "label": "API gateway", "group": "service", "note": "A note, HTML allowed" }],
       "edges": [{ "from": "api", "to": "queue", "label": "order.created", "dashed": true }]
     }</script>
   </doc-graph>
   Auto-laid-out architecture / dependency graph (Cytoscape.js + dagre). Groups: service, db, queue, device,
   external, user, other — each gets its own shape and colour, listed in the legend. Click a node to read its note.
   Page scroll is never captured; zoom with the buttons. */
(() => {
  const SHAPES = { service: 'round-rectangle', db: 'barrel', queue: 'cut-rectangle', device: 'rectangle', external: 'hexagon', user: 'ellipse', other: 'round-rectangle' };
  const TONES = { service: '--accent2', db: '--ok', queue: '--warn', device: '--ink2', external: '--idea', user: '--accent', other: '--ink3' };
  let registered = false;

  class DocGraph extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const holder = this.querySelector(':scope > script');
      let data;
      try { data = JSON.parse(holder ? holder.textContent : this.textContent); } catch (e) { return Docs.fail(this, `doc-graph: invalid JSON — ${e.message}`); }
      const nodes = data.nodes || [], edges = data.edges || [];
      const ids = new Set(nodes.map(n => n.id));
      const unknown = [...new Set(edges.flatMap(e => [e.from, e.to]).filter(id => !ids.has(id)))];
      if (unknown.length) return Docs.fail(this, `doc-graph: edges point to unknown node ids: ${unknown.join(', ')}`);

      this.innerHTML = '<div class="dgraph-bar">' + Docs.button('fit', 'fit', Docs.t('fit'))
        + Docs.button('in', 'plus', Docs.t('zoomIn'), { iconOnly: true }) + Docs.button('out', 'minus', Docs.t('zoomOut'), { iconOnly: true })
        + '<span class="sp"></span><span class="dgraph-legend"></span></div><div class="dgraph-box"></div>'
        + `<div class="dgraph-note muted">${Docs.esc(Docs.t('graphHint'))}</div>`;
      const box = this.querySelector('.dgraph-box');
      box.style.height = `${parseInt(this.getAttribute('height'), 10) || 420}px`;
      try { await Docs.lib('cytoscape'); } catch (e) { return Docs.fail(this, `doc-graph: ${e.message}`); }
      if (!registered && window.cytoscapeDagre) {
        try { cytoscape.use(window.cytoscapeDagre); } catch { /* the UMD build may have registered itself */ }
        registered = true;
      }

      const css = getComputedStyle(document.documentElement);
      const v = name => css.getPropertyValue(name).trim();
      const groups = [...new Set(nodes.map(n => n.group || 'other'))];
      this.querySelector('.dgraph-legend').innerHTML = groups
        .map(g => `<span><i style="border-color:${v(TONES[g] || TONES.other)}"></i>${Docs.esc(g)}</span>`).join('');
      const labelWidth = n => Math.max(90, Math.min(200, (n.data('label') || '').length * 7.4 + 28));
      const cy = cytoscape({
        container: box,
        elements: [
          ...nodes.map(n => ({ data: { id: n.id, label: n.label || n.id, note: n.note || '', shape: SHAPES[n.group] || SHAPES.other, color: v(TONES[n.group] || TONES.other) } })),
          ...edges.map((e, i) => ({ data: { id: `e${i}`, source: e.from, target: e.to, label: e.label || '', dashed: !!e.dashed } })),
        ],
        style: [
          { selector: 'node', style: { label: 'data(label)', shape: 'data(shape)', 'background-color': v('--panel'), 'border-width': 2, 'border-color': 'data(color)', color: v('--ink'), 'font-size': 12, 'font-family': v('--sans'), 'text-valign': 'center', 'text-halign': 'center', 'text-wrap': 'wrap', 'text-max-width': 180, width: labelWidth, height: 40 } },
          { selector: 'edge', style: { width: 1.6, 'line-color': v('--ink3'), 'target-arrow-color': v('--ink3'), 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', label: 'data(label)', 'font-size': 10.5, 'font-family': v('--sans'), color: v('--ink2'), 'text-background-color': v('--bg'), 'text-background-opacity': 1, 'text-background-padding': 2 } },
          { selector: 'edge[?dashed]', style: { 'line-style': 'dashed' } },
          { selector: ':selected', style: { 'border-width': 4, 'border-color': v('--accent'), 'line-color': v('--accent'), 'target-arrow-color': v('--accent') } },
        ],
        layout: { name: registered ? 'dagre' : 'breadthfirst', rankDir: this.getAttribute('direction') || 'LR', nodeSep: 40, rankSep: 90, edgeSep: 16, padding: 24, directed: true },
        userZoomingEnabled: false,
        boxSelectionEnabled: false,
      });
      const note = this.querySelector('.dgraph-note');
      cy.on('tap', 'node', e => {
        const d = e.target.data();
        note.classList.remove('muted');
        note.innerHTML = `<b>${Docs.esc(d.label)}</b>${d.note ? ` — ${d.note}` : ''}`;
      });
      const center = () => ({ x: box.clientWidth / 2, y: box.clientHeight / 2 });
      this.querySelector('.dgraph-bar').addEventListener('click', e => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a === 'fit') cy.fit(undefined, 24);
        if (a === 'in') cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: center() });
        if (a === 'out') cy.zoom({ level: cy.zoom() / 1.25, renderedPosition: center() });
      });
      new ResizeObserver(() => { cy.resize(); cy.fit(undefined, 24); }).observe(box);
      this.cy = cy;
    }
  }

  customElements.define('doc-graph', DocGraph);
})();
