The shared parts catalog: one `<id>.json` per part, reused by every board's
`bom.json`. `make bom` reads every `*.json` here and never writes this directory;
entries are added by the part-researcher agent or by hand.

Format and rules: `docs/superpowers/specs/2026-09-30-bom-design.md` ("The shared
catalog"), validated by `tools/bom/catalog.ts`.
