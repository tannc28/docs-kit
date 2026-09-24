---
name: docs-kit
description: Write a documentation page, report, explainer, design note, runbook or dashboard as one HTML file with the docs-kit CDN — Markdown in; Mermaid diagrams, charts, sortable tables, maps, maths, terminal replays and API references out. Use whenever the user asks for an HTML page, doc, report or write-up to read in a browser, or for docs-kit by name.
---

# Writing pages with docs-kit

Instructions for any assistant (or person) asked to produce an HTML page, report, explainer, design note or
dashboard with docs-kit. The kit turns short Markdown or plain HTML into a finished page: layout, contents sidebar,
light/dark theme, diagrams, charts, tables, maps, code, maths, terminal sessions, API references. You write content;
the kit draws.

## 1. Start from this

Copy it exactly — the URL names a release that never changes:

```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Page title</title>
<script src="https://cdn.jsdelivr.net/npm/@tannc26/docs-kit@0.3.0/doc.js"></script>

<script type="text/markdown">
# Page title

One paragraph saying what this page is for.

## First section

…
</script>
```

That is a complete page. Write everything inside the Markdown block; headings become the sidebar. The page can also
be plain HTML after the `<script src>` line (`<h1>`, `<h2>`, `<p>`, `<table>`, `<doc-*>` tags) — no wrapper markup is
needed either way. Set `lang` to the page's language.

## 2. Pick the tool by what you need to show

Inside Markdown, most tools are a fenced block: the word after the backticks picks the tool.

| To show | In Markdown | In HTML |
|---|---|---|
| A flow, architecture, sequence, state machine, ER model, Gantt plan, mind map, timeline, quadrant, radar, treemap… | ` ```mermaid ` + Mermaid text | `<pre class="mermaid">` |
| Numbers by category or over time | ` ```chart bar ` (or `line`, `area`, `hbar`, `pie`, `donut`, `scatter`), then CSV; first column = x axis. Add `stack`, `title="…"` after the type | `<doc-chart type="bar">` + CSV `<script>` |
| Any other chart: heatmap, gauge, sankey, radar, calendar… | ` ```chart ` + an ECharts option (JSON) | `<doc-chart>` |
| A chart that aggregates, bins, filters or facets raw rows itself | ` ```vega-lite ` + a Vega-Lite spec (JSON) | `<doc-vega>` (spec, then CSV) |
| A data table, sortable; wide ones get a filter and scrolling | a normal Markdown table, or ` ```table ` + CSV | `<doc-table>` + CSV |
| Code | ` ```python ` (any language): highlighted, with a copy button | `<doc-code lang="…">` |
| A terminal session that replays | ` ```terminal ` + a transcript: lines starting with `$ ` are commands, the rest is output | `<doc-cast>` |
| A cron schedule, explained | ` ```cron ` + one expression per line | `<doc-cron>0 3 * * *</doc-cron>` |
| An HTTP API reference | ` ```openapi ` + an OpenAPI spec (YAML or JSON) | `<doc-openapi>` |
| A formula | `$inline$`, or `$$` … `$$` on their own lines, or ` ```math ` | `<doc-math>` |
| A warning, tip or key point | `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` on the first line of a quote | `<div class="callout warn">` |
| A source or side remark | a footnote: `text[^1]`, then `[^1]: the note` | — |
| Headline numbers | `<div class="kpis" data-count>` + `.kpi` tiles (`data-count` makes them count up) | same |
| Before / after | `<doc-diff>` for text, `<doc-compare>` for anything side by side or as a slider | |
| A screenshot with numbered notes | `<doc-figure src="…">` + `<doc-pin x="30%" y="40%" title="…">` | |
| Notes on any element of the page | `<doc-note for="#id" title="…">` | |
| A walk through the page, element by element | `<doc-tour>` + `<doc-stop for="#id" title="…">` | |
| A payload | ` ```json ` for code, `<doc-json>` for a collapsible tree | |
| A timeline of events | `<doc-timeline>` + `<doc-event time="…" title="…">`, or a Mermaid `timeline` | |
| Several views in one place | `<doc-tabs>` + `<section data-tab="…">` | |
| A system graph laid out automatically | `<doc-graph>` (nodes/edges JSON) | |
| A real map | `<doc-map>` (GeoJSON) | |
| A phone, tablet, laptop or browser screen | `<doc-device model="iphone-14-pro">`, `model="browser"` | |
| Icons | `<doc-icon name="database">` (any Lucide icon) | |
| A term with its definition on hover | `<doc-term def="…">term</doc-term>`, `<doc-glossary>` lists them all | |
| Hand-drawn emphasis on a phrase | `<doc-mark type="circle">…</doc-mark>` | |

HTML and `<doc-*>` tags work inside the Markdown block. The attribute reference of every component is the
"Component reference" part of `llms-full.txt` (generated from each component's source); `gallery.html` runs them all.

## 3. Rules that make pages good

- **Markdown first.** It is the least code for the most page. Use HTML only where no fence fits.
- **Never draw by hand what a tool draws.** No hand-written SVG, canvas or CSS charts: a fence or a component is
  shorter, themed, correct in dark mode, and readable by the next person who edits the page.
- **One static figure with numbered notes beats an animation.** Number the steps on the figure (`-->|"① call"|`, or
  `autonumber` in a sequence diagram) and explain each number in a list under it. Step-through players
  (`doc-steps`, `doc-flow`, `doc-scrolly`, `doc-seq`) are for the one flow too complex for a single picture.
- **Data as data.** Put numbers in CSV (` ```chart `, ` ```table `) rather than formatting them by hand, so they
  stay sortable and chartable. Say where every number comes from.
- **Nothing else to load.** No other CSS or JS frameworks: the kit covers colour, spacing, type and dark mode. Extra
  styling goes in a small `<style>` using the tokens `var(--accent)`, `var(--line)`, `var(--ink2)`…
- **Headings are the outline.** `##` sections and `###` subsections become the sidebar; keep them short.
- **Code inside tags goes in `<script type="text/plain">`** (or a Markdown fence), never a bare `<script>`: the
  browser would run it.
- **Labels.** Control labels are English. A page in another language can relabel them with
  `<script type="application/json" id="doc-labels">{"toc": "…"}</script>` (keys at the top of `doc.js`).

## 4. Classes worth knowing

- Callout: `<div class="callout why|idea|data|ok|warn|risk"><div class="ct">Label</div>…</div>`
- Badge: `<span class="badge high|med|low|info|idea">…</span>`
- Cards: `<div class="grid"><div class="card"><h4>…</h4><p>…</p></div></div>`
- Collapsible: `<details><summary>…</summary><div class="inner">…</div></details>`
- Muted and small text: `.muted`, `.small`; a page intro paragraph right after the title becomes the lede
- Questions for the reader: `.decision` blocks and `ul.checklist`; `[data-action="export"]` copies the answers

## 5. Component reference

Every `<doc-*>` element's attributes are in `reference.md` next to this file — read it when a page needs a component
beyond the fences above. After writing a page, run `docs-kit-check <page.html>` (on the PATH while this plugin is
enabled) when Chrome is available: it renders the page and lists any error the kit drew, any JavaScript error, and
a page with no headings.
