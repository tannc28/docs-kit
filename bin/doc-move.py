#!/usr/bin/env python3
"""Move a doc between ~/Docs/<top>/ and ~/Docs/<top>/archive/, keeping its links to the kit working.

  doc-move.py archive <file>     <top>/X.html          -> <top>/archive/X.html
  doc-move.py restore <file>     <top>/archive/X.html  -> <top>/X.html

The kit sits one level higher from inside archive/, so for .html files every
href="../shared/…" / src="../shared/…" is rewritten to "../../shared/…" (and back on restore).
Refuses to overwrite, to leave ~/Docs, or to move anything that is not a regular .html/.md file.
"""
import pathlib, re, sys

DOCS = (pathlib.Path.home() / "Docs").resolve()

def fail(msg):
    print(f"doc-move: {msg}", file=sys.stderr)
    sys.exit(2)

def main():
    if len(sys.argv) != 3 or sys.argv[1] not in ("archive", "restore"):
        fail("usage: doc-move.py archive|restore <file>")
    action, arg = sys.argv[1], pathlib.Path(sys.argv[2]).expanduser()
    if arg.is_symlink():
        fail(f"refusing to move a symlink: {arg}")
    src = arg.resolve()
    if not src.is_file() or src.suffix not in (".html", ".md"):
        fail(f"not a .html/.md file: {arg}")
    if not src.is_relative_to(DOCS):
        fail(f"not inside {DOCS}: {src}")
    parts = src.relative_to(DOCS).parts
    if parts[0] == "shared":
        fail("the kit is not a doc")

    if action == "archive":
        if len(parts) != 2:
            fail("archive expects a doc directly in ~/Docs/<top>/")
        dst, old, new = DOCS / parts[0] / "archive" / parts[1], "../shared/", "../../shared/"
    else:
        if len(parts) != 3 or parts[1] != "archive":
            fail("restore expects a doc in ~/Docs/<top>/archive/")
        dst, old, new = DOCS / parts[0] / parts[2], "../../shared/", "../shared/"
    if dst.exists():
        fail(f"target already exists, not overwriting: {dst}")

    dst.parent.mkdir(exist_ok=True)
    if src.suffix == ".html":
        text = src.read_text(encoding="utf-8")
        text, n = re.subn(r'((?:href|src)=")' + re.escape(old), lambda m: m.group(1) + new, text)
        with open(dst, "x", encoding="utf-8") as fh:   # "x" = fail if it appeared meanwhile
            fh.write(text)
        src.unlink()
        print(f"{dst}  (rewrote {n} kit link{'s' if n != 1 else ''})")
    else:
        src.rename(dst)
        print(dst)

if __name__ == "__main__":
    main()
