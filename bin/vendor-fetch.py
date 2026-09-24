#!/usr/bin/env python3
"""Download the third-party files listed in ../vendor/manifest.json into vendor/<name>/<version>/<to>.

  vendor-fetch.py           download missing files, verify every file against its sha256
  vendor-fetch.py --pin     also record sha256 for entries that have none yet (first download)

A file whose hash differs from the manifest is reported and left untouched; the exit code is 1.
"""
import hashlib, json, pathlib, sys, urllib.request

VENDOR = pathlib.Path(__file__).resolve().parent.parent / "vendor"
MANIFEST = VENDOR / "manifest.json"

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    pin = "--pin" in sys.argv[1:]
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    bad = changed = 0
    for lib in data["libs"]:
        base = VENDOR / lib["name"] / lib["version"]
        for f in lib["files"]:
            dest = base / f["to"]
            if not dest.exists():
                dest.parent.mkdir(parents=True, exist_ok=True)
                tmp = dest.with_suffix(dest.suffix + ".part")
                with urllib.request.urlopen(f["url"], timeout=60) as r:
                    tmp.write_bytes(r.read())
                tmp.rename(dest)
                print(f"got  {dest.relative_to(VENDOR)} ({dest.stat().st_size} bytes)")
            digest = sha256(dest)
            if not f["sha256"]:
                if pin:
                    f["sha256"] = digest
                    changed += 1
                else:
                    print(f"NOHASH {dest.relative_to(VENDOR)} (run with --pin)")
            elif f["sha256"] != digest:
                bad += 1
                print(f"MISMATCH {dest.relative_to(VENDOR)}: manifest {f['sha256'][:12]}… file {digest[:12]}…")
    if changed:
        MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"pinned {changed} hashes")
    print("ok" if not bad else f"{bad} mismatched file(s)")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
