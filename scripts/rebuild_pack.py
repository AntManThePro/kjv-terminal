#!/usr/bin/env python3
from __future__ import annotations
import json, re, hashlib, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json"
OUT = ROOT / "data" / "kjv.min.json"
META = ROOT / "data" / "source.meta.json"

def clean(s: str) -> str:
    s = re.sub(r"\{[^}]*\}", "", s)
    return re.sub(r"\s+", " ", s).strip()

def main() -> None:
    print("fetch", SRC)
    req = urllib.request.Request(SRC, headers={"User-Agent": "kjv-terminal/1"})
    raw = urllib.request.urlopen(req, timeout=120).read()
    digest = hashlib.sha256(raw).hexdigest()
    books_in = json.loads(raw.decode("utf-8-sig"))
    books, verses = [], 0
    for b in books_in:
        chs = [[clean(v) for v in ch] for ch in b["chapters"]]
        verses += sum(len(c) for c in chs)
        books.append({"n": b["name"], "a": b["abbrev"], "c": chs})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"translation": "KJV", "note": "Public Domain King James Version", "books": books}, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    META.write_text(json.dumps({"upstream": SRC, "sha256": digest, "books": len(books), "verses": verses, "bytes": OUT.stat().st_size}, indent=2), encoding="utf-8")
    print("wrote", OUT, "verses", verses, "sha256", digest[:16])

if __name__ == "__main__":
    main()
