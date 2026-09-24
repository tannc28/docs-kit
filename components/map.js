/* doc-map — a real interactive map from GeoJSON, with an optional camera tour.
   <doc-map [height="440"] [basemap="openfreemap|none"] [autoplay] [interval="4"]>
     <script type="application/json">[
       { "type": "Feature", "properties": { "id": "park", "label": "Park" }, "geometry": { "type": "Polygon", "coordinates": [[…]] } },
       { "type": "Feature", "properties": { "id": "box", "derive": "bbox", "of": "park", "style": "outline", "tone": "warn" } },
       { "type": "Feature", "properties": { "id": "gate", "label": "North gate", "marker": "pulse", "tone": "bad" }, "geometry": { "type": "Point", "coordinates": [lon, lat] } }
     ]</script>
     <doc-view title="The polygon" fit="park" [padding="60"] [offset="-80,-140"] [show="park,gate"]>What this view shows (HTML).</doc-view>
     <doc-view title="Fly in" fly="105.75,21.007,17.5[,pitch[,bearing]]">…</doc-view>
   </doc-map>
   A real interactive map (MapLibre GL) with an optional camera tour. Features are plain GeoJSON; properties:
     tone    accent | accent2 | ok | warn | bad | ink — colour from the page tokens (default accent2 for shapes, accent for points)
     marker  Point only: dot (default) | pulse (animated ring) | diamond | text (label chip, no dot)
     style   Polygon: fill (default) | outline (dashed, no fill); LineString: solid (default) | dashed
     label   text chip next to a point
     derive  bbox | centroid | bboxCenter — geometry computed with Turf from feature `of`, so the drawing matches the real math
   Each <doc-view> is one step: fit (fitBounds a feature) or fly (flyTo), optional pixel offset, `show` limits which
   feature ids are visible (default: all). Without <doc-view> the map fits every feature.
   basemap="openfreemap" (default, free vector tiles, needs network; falls back to a plain background) or "none". */
(() => {
  const OFM = 'https://tiles.openfreemap.org/styles/liberty';
  const TONES = ['accent', 'accent2', 'ok', 'warn', 'bad', 'ink'];
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const num = s => (s || '').split(',').map(v => parseFloat(v)).filter(Number.isFinite);

  class DocMap extends HTMLElement {
    async connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const holder = this.querySelector(':scope > script');
      let feats;
      try { feats = JSON.parse(holder ? holder.textContent : '[]'); } catch (e) { return Docs.fail(this, `doc-map: invalid JSON — ${e.message}`); }
      if (!Array.isArray(feats)) feats = feats.features || [];
      const views = [...this.children].filter(c => c.tagName === 'DOC-VIEW').map(v => ({
        title: v.getAttribute('title') || '', html: v.innerHTML, fit: v.getAttribute('fit'), fly: num(v.getAttribute('fly')),
        padding: parseInt(v.getAttribute('padding'), 10) || 60, offset: num(v.getAttribute('offset')),
        show: v.hasAttribute('show') ? new Set(v.getAttribute('show').split(',').map(s => s.trim()).filter(Boolean)) : null,
      }));

      const box = document.createElement('div');
      box.className = 'dmap-box';
      box.style.height = `${parseInt(this.getAttribute('height'), 10) || 440}px`;
      this.replaceChildren(box);
      try { await Promise.all([Docs.lib('maplibre'), Docs.lib('turf')]); } catch (e) { return Docs.fail(this, `doc-map: ${e.message}`); }

      // derived features (bbox / centroid / bboxCenter) are computed with Turf from the feature they point at
      const byId = new Map(feats.map(f => [f.properties?.id, f]));
      for (const f of feats) {
        const p = f.properties || {};
        if (!p.derive) continue;
        const src = byId.get(p.of);
        if (!src?.geometry) return Docs.fail(this, `doc-map: "${p.id}" derives from "${p.of}", which has no geometry`);
        if (p.derive === 'bbox') f.geometry = turf.bboxPolygon(turf.bbox(src)).geometry;
        else if (p.derive === 'centroid') f.geometry = turf.centroid(src).geometry;
        else if (p.derive === 'bboxCenter') { const [a, b, c, d] = turf.bbox(src); f.geometry = turf.point([(a + c) / 2, (b + d) / 2]).geometry; }
        else return Docs.fail(this, `doc-map: unknown derive "${p.derive}"`);
      }
      if (!feats.every(f => f.geometry)) return Docs.fail(this, 'doc-map: every feature needs a geometry (or a derive)');
      for (const f of feats) {
        const p = f.properties ||= {};
        const tone = p.tone || (f.geometry.type === 'Point' ? 'accent' : 'accent2');
        if (!TONES.includes(tone)) return Docs.fail(this, `doc-map: unknown tone "${tone}" on "${p.id}"`);
        p._color = cssVar(`--${tone}`);
      }
      this.feats = feats;
      this.byId = byId;

      const blank = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': cssVar('--code') || '#f5f3ee' } }] };
      const style = this.getAttribute('basemap') === 'none' ? blank : OFM;
      const all = turf.bbox({ type: 'FeatureCollection', features: feats });
      const map = this.map = new maplibregl.Map({ container: box, style, bounds: all, fitBoundsOptions: { padding: 50 }, attributionControl: { compact: true }, cooperativeGestures: true });
      map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      let fellBack = false;
      map.on('error', e => {
        if (fellBack || style === blank || map.isStyleLoaded()) return;
        fellBack = true;
        console.warn('[docs] doc-map: basemap unavailable, using a plain background —', e.error?.message || e);
        map.setStyle(blank);
      });
      map.on('style.load', () => this.addLayers());

      this.markers = feats.filter(f => f.geometry.type === 'Point').map(f => {
        const p = f.properties;
        const el = document.createElement('div');
        el.className = `dmap-pt dmap-${p.marker || 'dot'}`;
        el.style.setProperty('--dmap-c', p._color);
        el.innerHTML = `<i></i>${p.label ? `<span>${Docs.esc(p.label)}</span>` : ''}`;
        return { id: p.id, m: new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(f.geometry.coordinates).addTo(map), el };
      });

      if (views.length) {
        this.views = views;
        this.nav = Docs.stepper(views.map(v => v.title));
        this.panel = document.createElement('div');
        this.panel.className = 'dmap-panel';
        this.player = Docs.player();
        this.prepend(this.nav.el);
        this.append(this.panel, this.player.el);
        this.nav.el.addEventListener('click', e => { const s = e.target.closest('.dk-step'); if (s) { this.stop(); this.go(+s.dataset.i); } });
        this.player.el.addEventListener('click', e => {
          const a = e.target.closest('[data-a]')?.dataset.a;
          if (a === 'prev') { this.stop(); this.go(this.i - 1); }
          if (a === 'next') { this.stop(); this.go(this.i + 1); }
          if (a === 'play') this.timer ? this.stop() : this.play();
        });
        this.tabIndex = 0;
        this.addEventListener('keydown', e => {
          if (e.target !== this) return;
          if (e.key === 'ArrowRight') { this.stop(); this.go(this.i + 1); e.preventDefault(); }
          if (e.key === 'ArrowLeft') { this.stop(); this.go(this.i - 1); e.preventDefault(); }
        });
        // the camera and marker filter work before the style loads; waiting for 'load' would also wait for every basemap tile
        this.player.playing(false);
        this.go(0, true);
        if (this.hasAttribute('autoplay')) this.play();
      }
    }

    disconnectedCallback() { clearInterval(this.timer); this.map?.remove(); }

    addLayers() {
      const map = this.map;
      const lines = this.feats.filter(f => f.geometry.type !== 'Point');
      if (map.getSource('dmap')) return;
      map.addSource('dmap', { type: 'geojson', data: { type: 'FeatureCollection', features: lines } });
      const c = ['get', '_color'], is = (type, st) => ['all', ['in', ['geometry-type'], ['literal', [type, `Multi${type}`]]], st];
      const outline = ['==', ['get', 'style'], 'outline'], dashed = ['==', ['get', 'style'], 'dashed'];
      map.addLayer({ id: 'dmap-fill', type: 'fill', source: 'dmap', filter: is('Polygon', ['!', outline]), paint: { 'fill-color': c, 'fill-opacity': 0.16 } });
      map.addLayer({ id: 'dmap-edge', type: 'line', source: 'dmap', filter: is('Polygon', ['!', outline]), paint: { 'line-color': c, 'line-width': 2.5 } });
      map.addLayer({ id: 'dmap-outline', type: 'line', source: 'dmap', filter: is('Polygon', outline), paint: { 'line-color': c, 'line-width': 2, 'line-dasharray': [2, 1.5] } });
      map.addLayer({ id: 'dmap-line', type: 'line', source: 'dmap', filter: is('LineString', ['!', dashed]), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c, 'line-width': 3.5 } });
      map.addLayer({ id: 'dmap-dash', type: 'line', source: 'dmap', filter: is('LineString', dashed), paint: { 'line-color': c, 'line-width': 3, 'line-dasharray': [2, 1.5] } });
      if (this.shown) this.visible(this.shown);
    }

    visible(show) {
      this.shown = show;
      const ok = f => !show || show.has(f.properties?.id);
      const src = this.map.getSource('dmap');
      if (src) src.setData({ type: 'FeatureCollection', features: this.feats.filter(f => f.geometry.type !== 'Point' && ok(f)) });
      this.markers.forEach(k => { k.el.style.display = !show || show.has(k.id) ? '' : 'none'; });
    }

    go(i, instant = false) {
      const n = this.views.length;
      this.i = ((i % n) + n) % n;
      const v = this.views[this.i];
      this.nav.at(this.i);
      this.player.at(this.i, n);
      this.panel.innerHTML = (v.title ? `<h4>${Docs.esc(v.title)}</h4>` : '') + `<div class="dmap-body">${v.html}</div>`;
      this.visible(v.show);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const duration = instant || reduce ? 0 : 1600;
      const offset = v.offset.length === 2 ? v.offset : [0, 0];
      if (v.fit && this.byId.get(v.fit)) {
        this.map.fitBounds(turf.bbox(this.byId.get(v.fit)), { padding: v.padding, offset, duration, maxZoom: 20 });
      } else if (v.fly.length >= 3) {
        const [lng, lat, zoom, pitch = 0, bearing = 0] = v.fly;
        this.map.flyTo({ center: [lng, lat], zoom, pitch, bearing, offset, duration, essential: true });
      }
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
      this.player?.playing(false);
    }
  }

  customElements.define('doc-map', DocMap);
})();
