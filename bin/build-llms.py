#!/usr/bin/env python3
"""Build llms.txt and llms-full.txt (https://llmstxt.org) from AGENTS.md and the header comment of every component,
so the reference an assistant reads can never drift from the code. Also writes the release in VERSION into every
kit URL in AGENTS.md and README.md, so a page copied from them loads exactly that release, and generates the
Claude Code skill in plugin/skills/docs-kit/ (SKILL.md from AGENTS.md, reference.md from the component headers).

  build-llms.py           write the files
  build-llms.py --check   exit 1 if any of them is out of date (run by CI)
"""
import json, pathlib, re, sys

KIT = pathlib.Path(__file__).resolve().parent.parent
VERSION = (KIT / "VERSION").read_text(encoding="utf-8").strip()
# the npm path: jsDelivr serves it like the GitHub one, and it is the form sandboxes such as claude.ai allow for scripts
CDN = f"https://cdn.jsdelivr.net/npm/@tannc26/docs-kit@{VERSION}"
# any kit URL, whatever version, branch or path (npm or gh) it names
KIT_URL = re.compile(r"https://cdn\.jsdelivr\.net/(?:gh/tannc28/docs-kit|npm/(?:@tannc26/)?docs-kit)@[^/\s\"'`)]+")

def pinned(text):
    return KIT_URL.sub(CDN, text)

def header(path):
    """The leading /* … */ comment of a JS file, without the comment markers."""
    m = re.match(r"\s*/\*(.*?)\*/", path.read_text(encoding="utf-8"), re.S)
    return re.sub(r"^ {0,3}", "", m.group(1).strip("\n"), flags=re.M).rstrip() if m else ""

def summary(path, text):
    """Line 1 of a component header: "doc-x — one sentence." Every component must have one."""
    first = text.splitlines()[0] if text else ""
    if " — " not in first:
        sys.exit(f"{path.name}: the header must start with a summary line, 'doc-x — one sentence.'")
    return first.split(" — ", 1)[1].rstrip(".")

def plugin_manifest():
    """plugin.json with `version` = VERSION: installed copies update exactly when a release is cut."""
    path = KIT / "plugin/.claude-plugin/plugin.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data = {"name": data["name"], "version": VERSION, **{k: v for k, v in data.items() if k not in ("name", "version")}}
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"

def package_manifest():
    """package.json with `version` = VERSION: npm, jsDelivr's /npm/ path and the git tag name the same release."""
    path = KIT / "package.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data["version"] = VERSION
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"

def build():
    comps = sorted((KIT / "components").glob("*.js"))
    tags = {p: sorted(set(re.findall(r"customElements\.define\('([a-z-]+)'", p.read_text(encoding="utf-8")))) for p in comps}
    lines = [
        "# docs-kit",
        "",
        "> One script tag turns short Markdown or plain HTML into a finished, self-contained page: layout, contents sidebar,",
        "> light/dark theme, Mermaid diagrams, charts, sortable tables, maps, code, maths and more. No build step, no hand-drawn SVG.",
        "",
        f'Load it with `<script src="{CDN}/doc.js"></script>` — release {VERSION}; a released URL never changes.',
        "",
        "## Docs",
        "",
        f"- [Full reference]({CDN}/llms-full.txt): the guide plus every component's attribute reference, in one file",
        f"- [Guide]({CDN}/AGENTS.md): page templates, which tool to use for what, rules for good pages",
        f"- [Gallery]({CDN}/gallery.html): every component running",
        f"- [Markdown example]({CDN}/examples/markdown.html): a whole page written as one Markdown block",
        "",
        "## Components",
        "",
    ]
    for p in comps:
        for tag in tags[p][:1]:
            lines.append(f"- [{tag}]({CDN}/components/{p.name}): {summary(p, header(p))}")
    short = "\n".join(lines) + "\n"

    full = [pinned((KIT / "AGENTS.md").read_text(encoding="utf-8")).rstrip(), "", "## 5. Runtime (doc.js)", "", "```text",
            header(KIT / "doc.js"), "```", "", "## 6. Component reference", ""]
    for p in comps:
        full += [f"### {', '.join(tags[p])}", "", "```text", header(p), "```", ""]
    guide = pinned((KIT / "AGENTS.md").read_text(encoding="utf-8")).rstrip()
    skill = "\n".join([
        "---",
        "name: docs-kit",
        "description: Write a documentation page, report, explainer, design note, runbook or dashboard as one HTML file with the"
        " docs-kit CDN — Markdown in; Mermaid diagrams, charts, sortable tables, maps, maths, terminal replays and API references"
        " out. Use whenever the user asks for an HTML page, doc, report or write-up to read in a browser, or for docs-kit by name.",
        "---",
        "",
        guide,
        "",
        "## 5. Component reference",
        "",
        "Every `<doc-*>` element's attributes are in `reference.md` next to this file — read it when a page needs a component",
        "beyond the fences above. After writing a page, run `docs-kit-check <page.html>` (on the PATH while this plugin is",
        "enabled) when Chrome is available: it renders the page and lists any error the kit drew, any JavaScript error, and",
        "a page with no headings.",
        "",
    ])
    reference = "\n".join(["# docs-kit component reference", "", f"Release v{VERSION}. Generated from the component sources.", ""]
                          + full[full.index("## 6. Component reference") + 2:]).rstrip() + "\n"
    return {"llms.txt": short, "llms-full.txt": "\n".join(full).rstrip() + "\n",
            "plugin/skills/docs-kit/SKILL.md": skill, "plugin/skills/docs-kit/reference.md": reference,
            "plugin/.claude-plugin/plugin.json": plugin_manifest(),
            "package.json": package_manifest(),
            "AGENTS.md": pinned((KIT / "AGENTS.md").read_text(encoding="utf-8")),
            "README.md": pinned((KIT / "README.md").read_text(encoding="utf-8"))}

def main():
    files = build()
    if sys.argv[1:] == ["--check"]:
        stale = [n for n, text in files.items() if not (KIT / n).exists() or (KIT / n).read_text(encoding="utf-8") != text]
        if stale:
            print("out of date, run bin/build-llms.py:", ", ".join(stale))
            sys.exit(1)
        print("llms files up to date")
        return
    for name, text in files.items():
        (KIT / name).write_text(text, encoding="utf-8")
        print(f"wrote {name} ({len(text)} bytes)")

if __name__ == "__main__":
    main()
