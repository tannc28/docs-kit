# docs-kit component reference

Release v0.3.1. Generated from the component sources.

### doc-arrow

```text
doc-arrow — a curved arrow between any two elements on the page, optionally animated.
<doc-arrow from="#a" to="#b" [label="Kafka"] [tone="ok|warn|bad|info"] [dashed] [flow]></doc-arrow>
Curved arrow between two elements anywhere on the page (cards, mock parts, table cells), drawn on one shared
overlay. Redraws on resize, after diagrams render and after clicks (tabs, steps, the TOC move things).
Hidden while either end is not visible. `flow` animates dashes toward the target.
```

### doc-cast

```text
doc-cast — a terminal session that replays: commands type themselves, output appears, the text stays copyable.
<doc-cast [cols="80"] [rows="12"] [speed="1"] [autoplay] [loop] [title="…"]>
  <script type="text/plain">
    $ kubectl get pods
    NAME                     READY   STATUS
    api-7d9f8b6c5d-x2k4p     1/1     Running
    $ kubectl logs api-7d9f8b6c5d-x2k4p | tail -1
    Started in 2.1 s
  </script>
</doc-cast>
Write a plain transcript: a line starting with "$ " is a command (typed out), every other line is its output.
A real asciinema recording (asciicast v2: a JSON header line, then [time, "o", "text"] lines) plays as recorded.
Played by asciinema-player; the recording is inline, so it works from file://. In Markdown: ```terminal or ```cast.
```

### doc-chart

```text
doc-chart — a chart from CSV and a type (bar, line, area, pie…) or from any ECharts option.
Short form — a chart type plus CSV (first column = x axis or labels, one series per other column):
<doc-chart type="bar|hbar|line|area|scatter|pie|donut" [stack] [title="…"] [height="320"]>
  <script type="text/csv">
    Hour,Orders,Failed
    08,40,1
    09,96,2
  </script>
</doc-chart>
Also TSV or JSON rows (see doc-table), or src="id". In Markdown: ```chart bar  (then the CSV).

Full form — any Apache ECharts option as JSON (https://echarts.apache.org/en/option.html): heatmap, gauge,
sankey, radar, time axes, dataZoom…
<doc-chart height="320">
  <script type="application/json">{ "xAxis": { "type": "category", "data": ["08","09"] }, "yAxis": {}, "series": [{ "type": "line", "data": [38, 341] }] }</script>
</doc-chart>
Use <script type="text/x-echarts"> for a JS object literal when formatter functions are needed (evaluated as
code — only for your own docs). Follows the page theme; resizes with the page.
```

### doc-code

```text
doc-code — highlighted code with file name, line numbers, marked lines and a copy button.
<doc-code lang="java" file="order-service/…/OrderService.java" start="80" mark="84,86-87">
  <script type="text/plain">
  long total = subtotal - discount;
  </script>
</doc-code>
Code inside <script type="text/plain"> needs no escaping of "<" or "&" (plain text content works too).
Header: file:start, language, Copy. Line numbers begin at `start`; `mark` lists source line numbers to highlight.
Highlighting: highlight.js common bundle (java, sql, yaml, json, bash, typescript, xml, …); any other language loads
from vendor/highlightjs/<v>/languages/<lang>.min.js if it is vendored (add it with bin/vendor-fetch.py). lang="text" skips it.
```

### doc-compare

```text
doc-compare — two things side by side, or one over the other with a drag slider.
<doc-compare labels="Before|After" [mode="slider"] [start="50"]> <div>…A…</div> <div>…B…</div> </doc-compare>
side (default): two labelled columns, stacked on narrow screens — code, config, text, tables.
slider: B lies over A; drag the handle (or ← → when focused) to reveal — two same-size screens or images.
```

### doc-cron

```text
doc-cron — a cron expression followed by what it means in plain English.
<doc-cron>30 9 * * 1-5</doc-cron>        → 30 9 * * 1-5  "At 09:30, Monday through Friday"
<doc-cron tz="UTC">50 * * * *</doc-cron>  → adds the time zone after the sentence
Five, six (with seconds) or seven fields, ranges, lists and step values; 24-hour clock. Translated by cronstrue.
In Markdown: a ```cron fence with one expression per line. A malformed expression shows its error in place.
```

### doc-device

```text
doc-device — a phone, tablet, laptop or browser frame around any screen content.
<doc-device model="iphone-14-pro" [color="black|silver|gold|…"] [width="300"] [caption="…"]>
  …screen content: any HTML, laid out at the device's real CSS width…
</doc-device>
<doc-device model="browser" [url="app.example.com"] [caption="…"]>…page content…</doc-device>
A device frame around a screen. Phone, tablet and laptop frames come from devices.css (MIT, vendor/devices.css):
  iphone-14-pro, iphone-14, iphone-x, google-pixel-6-pro, galaxy-s8, ipad-pro, macbook-pro, surface-pro-2017, …
(any .device-<model> class the library ships; colours are its .device-<color> classes).
The content keeps the device's real width (e.g. 390 px for an iPhone 14 Pro) and the whole frame is scaled down
to `width` or to the column, so a mock looks the same on every screen. model="browser" is a fluid window with
a URL bar instead. Put several in a <div class="device-row"> to show them side by side.
```

### doc-diff

```text
doc-diff — a before/after diff of two texts, side by side or unified.
<doc-diff file="application.yaml" [mode="line"] [context="3"]>
  <script type="text/plain" data-before>…old text…</script>
  <script type="text/plain" data-after>…new text…</script>
</doc-diff>
Side-by-side by default, mode="line" for a unified view. The file extension picks the highlighting language.
Write the text flush-left inside the scripts: indentation is kept as-is (it matters for YAML).
```

### doc-figure

```text
doc-figure — an image or SVG with numbered pins and notes, click to zoom.
<doc-figure src="screen.png" caption="Checkout screen" [alt="…"]>
  <doc-pin x="32%" y="40%" title="Pay button">A note, HTML allowed.</doc-pin>
</doc-figure>
Instead of src, the first non-pin child (<img>, <svg>, any element) is the media.
Pins sit at % of the media box, are numbered, show their note on hover/focus, and are listed under the figure.
Click the media → fullscreen view. Alt+click the media → copies `x="…%" y="…%"` for placing a new pin.
```

### doc-flow

```text
doc-flow — a system map where a packet travels hop by hop, one step at a time.
<doc-flow [cols="4"] [autoplay] [interval="3.2"] [caption="…"]>
  <doc-node key="web" title="Web app" [kind="user|service|db|queue|device|external"] [at="1,2"]>Short description, HTML allowed</doc-node>
  <doc-hop from="web" to="api" label="GET /orders">What happens at this hop (HTML).</doc-hop>
</doc-flow>
A system map with a packet that travels hop by hop. Nodes sit on a grid (`cols`, default up to 4, or
`at="row,col"` per node). Each <doc-hop> is one step: the packet flies from → to along a curved edge,
both nodes light up, nodes already visited stay lit, the step's text shows below the map.
from == to means work done inside one node (the node pulses). Stepper + player (◀ ▶/❚❚ ▶, progress,
"All steps" = every hop as a list), keyboard ← → when focused. Narrow screens stack the nodes in one column.
Honours prefers-reduced-motion (jumps instead of flying). Print lists every step.
```

### doc-graph

```text
doc-graph — an architecture or dependency graph laid out automatically from nodes and edges.
<doc-graph height="420" [direction="LR|TB"]>
  <script type="application/json">{
    "nodes": [{ "id": "api", "label": "API gateway", "group": "service", "note": "A note, HTML allowed" }],
    "edges": [{ "from": "api", "to": "queue", "label": "order.created", "dashed": true }]
  }</script>
</doc-graph>
Auto-laid-out architecture / dependency graph (Cytoscape.js + dagre). Groups: service, db, queue, device,
external, user, other — each gets its own shape and colour, listed in the legend. Click a node to read its note.
Page scroll is never captured; zoom with the buttons.
```

### doc-icon

```text
doc-icon — any Lucide icon by name, sized to the text.
<doc-icon name="database"></doc-icon> — any Lucide icon name (https://lucide.dev/icons), sized to the surrounding text.
```

### doc-json

```text
doc-json — a collapsible JSON tree with expand, collapse and copy.
<doc-json [open="1"]>{ "orderId": "A-1024", "items": 2 }</doc-json>
<doc-json src="payload" open="2"></doc-json> + <script type="application/json" id="payload">…</script>
Collapsible tree; `open` = how many levels start expanded (default 1). Use src for large payloads
or anything containing "<". Toolbar: expand all, collapse all, copy.
```

### doc-map

```text
doc-map — a real interactive map from GeoJSON, with an optional camera tour.
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
basemap="openfreemap" (default, free vector tiles, needs network; falls back to a plain background) or "none".
```

### doc-mark

```text
doc-mark — a hand-drawn highlight, underline, circle or box on a phrase.
<doc-mark [type="highlight|underline|circle|box|bracket|strike-through|crossed-off"] [tone="mark|accent|accent2|ok|warn|bad"]>
  the words to annotate
</doc-mark>
A hand-drawn annotation over inline text (Rough Notation, MIT), drawn when it scrolls into view — the way a
reviewer circles the one number that matters. Default: type="highlight" with the marker colour (tone="mark"),
every other type defaults to tone="accent". Marks that enter the view together draw one after another.
```

### doc-math

```text
doc-math — a LaTeX formula, inline or as a block.
<doc-math>\frac{a}{b}</doc-math> inline, or <doc-math display>…</doc-math> as a centred block. KaTeX syntax.
The page must start with <!doctype html> (KaTeX refuses quirks mode).
```

### doc-note

```text
doc-note — a numbered annotation badge on any element, with its note on hover or tap.
<doc-note for="#target" [title="…"] [tone="info|new|warn|bad"] [shape="ring|box|line"] [at="tr|tl|br|bl"]>
  Body HTML: mapping, code refs, why.
</doc-note>
An annotation on any element: a small numbered badge on the target's corner; hovering the badge or the target
tints the target's outline and shows the body as a card (keyboard focus and tap work too; tap again or Esc closes).
Default look is clean. `shape` opts into a hand-drawn mark (sketchy ring, box or underline) for whiteboard-style pages.
Put the tag anywhere; it moves itself into the target.
Without `for`, it annotates its previous element sibling. Numbers follow document order.
The target gets position:relative when it is static. Several notes on one target stack their markers.
```

### doc-openapi

```text
doc-openapi — a full API reference (endpoints, parameters, schemas, examples) from an OpenAPI spec written inline.
<doc-openapi [height="720"]>
  <script type="text/plain">
    openapi: 3.0.3
    info: { title: Orders API, version: "1.0" }
    paths:
      /orders:
        post:
          summary: Place an order
          responses: { "201": { description: Created } }
  </script>
</doc-openapi>
The spec is YAML or JSON (OpenAPI 2 or 3), inline — nothing is fetched, so it works from file://. Rendered by
Redoc inside a scrolling box of `height` pixels. In Markdown: ```openapi.
```

### doc-scrolly

```text
doc-scrolly — scrollytelling: a pinned visual that follows the text as it scrolls.
<doc-scrolly [side="right|left"] [offset="0.55"]>
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
active node) or to the first .doc-hl, so the part being discussed stays on screen.
```

### doc-seq

```text
doc-seq — a Mermaid sequence diagram that plays message by message.
<doc-seq [autoplay] [interval="2.5"] [caption="…"]>
  participant API as order-service
  Web->>API: POST /orders
  API->>DB: INSERT order
</doc-seq>
Body = Mermaid sequenceDiagram syntax (the "sequenceDiagram" line is optional; write &lt; for "<").
Draws with the vendored Mermaid, then plays messages one by one: past messages stay, the current one
is highlighted, later ones are faded. Player: ◀ ▶/❚❚ ▶ + progress + "All steps"; keyboard ← → when focused.
```

### doc-sketch

```text
doc-sketch — redraws a plain SVG in a hand-drawn style.
<doc-sketch [roughness="1.3"] [fill-style="hachure|solid|zigzag|cross-hatch|dots"]>
  <svg viewBox="0 0 400 200"> plain <rect> <line> <circle> <ellipse> <polygon> <polyline> <path> and <text> </svg>
</doc-sketch>
Redraws the shapes in a hand-drawn style (Rough.js) — low-fidelity mocks and whiteboard diagrams.
Text stays as written; each shape keeps its fill and stroke; the drawing is identical on every load.
Put data-keep on a shape (or group) to leave it untouched, e.g. a background rect.
```

### doc-steps

```text
doc-steps — a step-by-step explanation with a stepper, player and highlights.
<doc-steps [autoplay] [interval="4"] [for="#diagram"]>
  <section data-title="Submit the form" data-highlight="#form, .submit">…</section>
  <section data-title="Save the order">…</section>
</doc-steps>
One section at a time: a stepper (numbered steps joined by a progress line), a player (◀ ▶/❚❚ ▶ + progress),
keyboard ← → when focused. data-highlight = CSS selector; the matching elements inside `for` (default: the
whole page) get .doc-hl while the step is active — walk through a diagram, mock or table. Print shows every step.
```

### doc-table

```text
doc-table — a sortable table from CSV, TSV or JSON, wide ones with filter and pinned columns.
<doc-table [wide] [freeze="1"] [sort="off"] [html] [caption="…"]>
  <script type="text/csv">
    Order,Status,Total
    A-1024,PAID,480000
    A-1023,PENDING,150000
  </script>
</doc-table>
A table from data instead of <tr>/<td> markup. The data is CSV (default), <script type="text/tab-separated-values">,
or <script type="application/json"> (an array of objects, or an array of arrays with the header row first);
src="id" reads it from a <script> elsewhere on the page. Columns whose values are all numbers are right-aligned
and sort as numbers. Headers sort on click (sort="off" disables it). More than 5 columns, or `wide`, gives the
wide-table box: row filter, column scrolling, `freeze` pinned leading columns. Cells are text; `html` lets them
carry markup (only for your own data). In Markdown, a ```table or ```csv fence becomes this element.
```

### doc-tabs

```text
doc-tabs — several views in one place, one tab each.
<doc-tabs [selected="0"]> <section data-tab="Overview">…</section> <section data-tab="SQL">…</section> </doc-tabs>
Inactive panels are moved off-screen instead of display:none, because Mermaid and the wide table
measure their content while drawing and would lay out wrongly inside a hidden element.
```

### doc-glossary, doc-term

```text
doc-term, doc-glossary — terms with a definition on hover, and a glossary of every term on the page.
<doc-term def="Sending the same request twice has the same effect as sending it once">idempotent</doc-term>
  → dotted term; the definition appears on hover or keyboard focus.
<doc-glossary></doc-glossary>
  → lists every doc-term on the page, first definition wins, sorted with the page language's collation (<html lang>).
```

### doc-timeline

```text
doc-timeline — a vertical or horizontal timeline of events.
<doc-timeline [horizontal]>
  <doc-event time="08:24" tone="ok|warn|bad|info" title="First entry">Details, HTML allowed.</doc-event>
</doc-timeline>
Vertical by default; events fade in as they scroll into view. `horizontal` scrolls sideways.
```

### doc-tour

```text
doc-tour — a guided tour: a button that walks the reader through elements of the page, spotlighting each one.
<doc-tour [label="Take the tour"]>
  <doc-stop for="#checkout-form" title="The form">Validated on blur.</doc-stop>
  <doc-stop for=".kpis" title="Numbers">Updated every 5 minutes.</doc-stop>
</doc-tour>
Each <doc-stop> points at any element by CSS selector — a mock screen, a table, a diagram, a card — and its body
(HTML) is the note shown next to it. Next/Previous/Close, keyboard arrows and Esc work. Driven by driver.js.
```

### doc-vega

```text
doc-vega — a Vega-Lite chart: raw rows plus a short spec that declares aggregate, bin, filter or facet itself.
<doc-vega [height="320"]>
  <script type="application/json">{
    "mark": "bar",
    "encoding": { "x": { "field": "service" }, "y": { "aggregate": "mean", "field": "ms" } }
  }</script>
  <script type="text/csv">service,ms
    api,120
    api,140
    worker,60</script>
</doc-vega>
The first <script> is the Vega-Lite spec (https://vega.github.io/vega-lite/docs/). When the spec has no `data`,
the rows come from a second <script type="text/csv|text/tab-separated-values|application/json"> or from src="id".
Colours and fonts follow the kit tokens and the page theme; the chart fills the width. In Markdown: ```vega-lite.
```

### doc-zoom

```text
doc-zoom — pan and zoom around a large diagram or image.
<doc-zoom [height="480"]> …large content: pre.mermaid, <svg>, <img>, a wide mock… </doc-zoom>
Drag to pan, Ctrl + wheel or the buttons to zoom, "Reset" to reset. Plain wheel still scrolls the page.
```
