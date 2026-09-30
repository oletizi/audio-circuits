The shared parts catalog: one `<id>.json` per part, reused by every board's
`bom.json`. `make bom` reads every `*.json` here and never writes this directory.
Entries are added by the part-researcher agent or by hand; `bun run parts refresh
[<id>...]` rewrites the Mouser (and, once built, Digi-Key) sources of existing
entries in place - their price breaks and `checked` date only, never which part
was chosen - in the same 2-space JSON format these files are kept in.

Format and rules: `docs/superpowers/specs/2026-09-30-bom-design.md` ("The shared
catalog"), validated by `tools/bom/catalog.ts`.
