#!/usr/bin/env python3
"""Check ~/Docs docs against the hard rules in the "RULE: Docs" section of ~/.claude/CLAUDE.md.

  verify.py [file-or-dir ...]     (default: all of ~/Docs)
  verify.py --kit                 check the shared kit itself (~/Docs/shared)

Exit code 1 if any error. Checks only what a machine reads:
  - doc sits directly in ~/Docs/<first folder below ~>/ (flat, no deeper folders)
  - doc file name is YYYYMMDD_NN_[subfolders_]slug.(html|md), all lowercase ASCII
  - html is not empty, has <title>, and every relative href/src resolves
  - every id and form-field name attribute is ASCII, and no id appears twice
--kit: the kit is English-only, so no Vietnamese letter may appear in doc.js, doc.css, components/, bin/ or
  gallery.html (symbols such as the dong sign are fine). Doc-specific wording is a review question, not a regex.
"""
import pathlib, re, sys

DOCS = pathlib.Path.home() / "Docs"
WORDS = r"[a-z0-9]+(?:-[a-z0-9]+)*"
NAME = re.compile(rf"^\d{{8}}_\d{{2}}_(?:{WORDS}_)*{WORDS}\.(html|md)$")
SKIP_DIRS = {"shared", ".git", "node_modules"}

def docs(paths):
    for p in paths:
        p = pathlib.Path(p).expanduser().resolve()
        if p.is_file():
            yield p
        else:
            for f in sorted(p.rglob("*")):
                if f.is_file() and f.suffix in {".html", ".md"} and f.name != "CLAUDE.md" \
                        and not SKIP_DIRS & set(f.relative_to(DOCS).parts):
                    yield f

def check(f):
    errs = []
    if f.is_relative_to(DOCS):
        parts = f.relative_to(DOCS).parts
        if not (len(parts) == 2 or (len(parts) == 3 and parts[1] == "archive")):
            errs.append("doc must sit in ~/Docs/<top>/ or ~/Docs/<top>/archive/ — put deeper folders into the name")
    if not NAME.match(f.name):
        errs.append("file name must be YYYYMMDD_NN_[subfolders_]slug.html|md, lowercase ASCII")
    if f.suffix != ".html":
        return errs
    s = f.read_text(encoding="utf-8")
    if not s.strip():
        return errs + ["file is empty"]
    if not re.search(r"<title>[^<]+</title>", s[:8192]):
        errs.append("missing <title> in the first 8KB")
    # script and style bodies are code, not markup: a template literal or a comment there is not a link or an id
    s = re.sub(r"(<(script|style)\b[^>]*>).*?(</\2>)", r"\1\3", s, flags=re.S | re.I)
    # <doc-json src="id"> names a <script> on the page, not a file
    for ref in re.findall(r'<(?!doc-json\b)[a-z][\w-]*\b[^>]*?\b(?:href|src)="([^"#:?]+)"', s):
        if not (f.parent / ref).exists():
            errs.append(f"broken relative link: {ref}")
    ids = re.findall(r'\sid="([^"]*)"', s)
    for dup in sorted({i for i in ids if ids.count(i) > 1}):
        errs.append(f"duplicate id: {dup!r} (a selector or anchor would hit the first one only)")
    for attr, val in re.findall(r'\s(id|name)="([^"]*)"', s):
        if not re.fullmatch(r"[A-Za-z][\w-]*", val):
            errs.append(f"{attr} must be ASCII: {val!r}")
    return errs

KIT = pathlib.Path(__file__).resolve().parent.parent   # the kit this script ships in (~/Docs/shared links here)
VI = re.compile(r"[\u00c0-\u00c3\u00c8-\u00ca\u00cc\u00cd\u00d2-\u00d5\u00d9\u00da\u00dd\u00e0-\u00e3\u00e8-\u00ea"
                r"\u00ec\u00ed\u00f2-\u00f5\u00f9\u00fa\u00fd\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169"
                r"\u01a0\u01a1\u01af\u01b0\u1ea0-\u1ef9]")

def check_kit():
    files = [KIT / "doc.js", KIT / "doc.css", KIT / "gallery.html", *sorted(p for p in (KIT / "components").iterdir() if p.is_file()),
             *sorted(p for p in (KIT / "bin").iterdir() if p.is_file())]
    bad = 0
    for f in files:
        for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if VI.search(line):
                bad += 1
                print(f"FAIL {f.relative_to(DOCS)}:{n}: Vietnamese text in the kit: {line.strip()[:100]}")
    print(f"kit: {len(files)} files, {bad} Vietnamese lines")
    sys.exit(1 if bad else 0)

def main():
    if sys.argv[1:] == ["--kit"]:
        return check_kit()
    bad = 0
    targets = list(docs(sys.argv[1:] or [DOCS]))
    for f in targets:
        errs = check(f)
        if errs:
            bad += 1
            print(f"FAIL {f}")
            for e in errs:
                print(f"     - {e}")
    print(f"{len(targets) - bad}/{len(targets)} ok")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
