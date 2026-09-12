# KJV Terminal

Public-domain **King James Version** — 66 books, terminal + reader.

Not a personal brand page. The repo is the text and the tool that reads it.

## What is in here
- Full KJV pack rebuilt from [thiagobodruk/bible](https://github.com/thiagobodruk/bible) `en_kjv.json`
- Chapter reader, command surface, search, lexicon, cross-refs, reading plans
- Notes / highlights live in your browser (IndexedDB)

## Run local
```bash
python3 -m http.server 8765
```
Full pack (optional): `python scripts/rebuild_pack.py`

## Source bump
When upstream `en_kjv.json` changes, CI regenerates `data/kjv.min.json` and republishes.

GitHub Pages: enable **Settings → Pages → Source = GitHub Actions**, then run the `pages` workflow.
