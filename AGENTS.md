# Writing pages with docs-kit

Instructions for any assistant (or person) asked to produce an HTML page, report, explainer, design note or
dashboard with docs-kit. The kit turns short Markdown or plain HTML into a finished page: layout, contents sidebar,
light/dark theme, diagrams, charts, tables, maps, code, maths. You write content; the kit draws.

## 1. Start from one of these

Pin a release tag (`@v0.1.N`, listed at https://github.com/tannc28/docs-kit/releases). If you do not know the latest
tag, use `@main`: it follows the newest commit (cached up to 12 hours) and may change.

**Markdown page — the shortest way, and the one to prefer:**

```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Page title</title>
<script src="https://cdn.jsdelivr.net/gh/tannc28/docs-kit@main/doc.js"></script>

<script type="text/markdown">
# Page title

One paragraph saying what this page is for.

## First section
…
</script>
```

**Plain HTML page:** the same first five lines, then ordinary HTML (`<h1>`, `<h2>`, `<p>`, `<table>`, `<doc-*>` tags).
No wrapper markup is needed: the kit builds the frame, the sidebar and the heading anchors.

## 2. Pick the tool by what you need to show

| To show | Write (Markdown fence, or HTML) |
|---|---|
| A flow, architecture, sequence, state machine, ER model, Gantt plan, mind map | ` ```mermaid ` — any Mermaid diagram |
| Numbers over time or categories | ` ```chart bar ` / `line` / `area` / `hbar` / `pie` / `donut` / `scatter`, then CSV (first column = x) |
| Any other chart (heatmap, gauge, sankey, radar…) | ` ```chart ` with an ECharts option as JSON |
| A data table (sortable; wide ones get filter + scrolling) | ` ```table ` or ` ```csv ` then CSV, or a normal Markdown table |
| Code | ` ```java ` (any language) — highlighted, with a copy button |
| A formula | ` ```math ` (LaTeX), inline `<doc-math>…</doc-math>` |
| A warning, tip or key point | `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` |
| Headline numbers | `<div class="kpis"><div class="kpi"><div class="v">99.2%</div><div class="l">label</div></div></div>` |
| Before / after | `<doc-diff>` (text), `<doc-compare>` (anything side by side, or a slider) |
| An image or screenshot with numbered notes | `<doc-figure src="…">` + `<doc-pin x="30%" y="40%" title="…">` |
| Notes on any element of the page | `<doc-note for="#id" title="…">` |
| A payload | `<doc-json>` |
| A timeline of events | `<doc-timeline>` + `<doc-event time="…" title="…">` |
| Several views in one place | `<doc-tabs>` + `<section data-tab="…">` |
| A system as a graph laid out automatically | `<doc-graph>` (nodes/edges JSON) |
| A real map | `<doc-map>` (GeoJSON) |
| A phone, tablet, laptop or browser screen | `<doc-device model="iphone-14-pro">` / `model="browser"` |
| Icons | `<doc-icon name="database">` (any Lucide icon) |
| A term with a definition on hover | `<doc-term def="…">term</doc-term>` + `<doc-glossary>` |
| A hand-drawn emphasis on a phrase | `<doc-mark type="circle">…</doc-mark>` |

The full attribute reference of every component is in the "Component reference" part of `llms-full.txt`
(generated from each component's source) and runs live in `gallery.html`.

## 3. Rules that make pages good

- **Content first, Markdown first.** Markdown with fences is the least code for the most page. Raw HTML and `<doc-*>`
  tags work inside Markdown when a fence does not fit.
- **Never draw by hand what a tool draws.** No hand-written SVG, canvas or CSS charts: a Mermaid fence, a chart
  fence or a component is shorter, themed, and correct in dark mode.
- **One static figure with numbered notes beats an animation.** Number the edges (`-->|"① call"|`) or use
  `autonumber`, then explain each number in a list under the figure. Step-through players (`doc-steps`,
  `doc-flow`, `doc-scrolly`, `doc-seq`) are for the one flow too complex to read in a single picture.
- **Data as data.** Put numbers in CSV (` ```chart `, ` ```table `) instead of formatting them by hand, so they stay
  sortable, chartable and checkable. Say where each number comes from.
- **No other CSS or JS frameworks.** The kit's tokens already cover colour, spacing, type and dark mode; extra
  styling goes in a small `<style>` using `var(--accent)`, `var(--line)` and the other tokens.
- **Headings are the outline.** `##` sections and `###` subsections become the sidebar; keep them short.
- **Labels.** Control labels are English; a page in another language can relabel them with
  `<script type="application/json" id="doc-labels">{"toc": "…"}</script>` (keys at the top of `doc.js`).

## 4. Classes worth knowing

- Callout: `<div class="callout why|idea|data|ok|warn|risk"><div class="ct">Label</div>…</div>`
- Badge: `<span class="badge high|med|low|info|idea">…</span>`
- Cards: `<div class="grid"><div class="card"><h4>…</h4><p>…</p></div></div>`
- Collapsible: `<details><summary>…</summary><div class="inner">…</div></details>`
- Muted and small text: `.muted`, `.small`; a page intro paragraph: `.lede`
- Choices a reader should answer: `.decision` blocks and `ul.checklist`; `[data-action="export"]` copies the answers
