# Replaying the two-block test board's project

**What this is.** The record of how the three sheets in `..` were made from a fresh `make draw`
(`TOOLING.md` step 5.5, and design change C3 for what a multi-page board adds). Test data: the
pages are never sent for review.

| | sha256 |
| --- | --- |
| start: block a's draft, `build/draw/two-block-board/a/a.kicad_sch` as `make draw` writes it (re-papered to US Letter) | `3faf354d31ae7c4d005dcd4ffd51a9e585c578c85cd67215c3151c5c99dfae2b` |
| start: block b's draft, `build/draw/two-block-board/b/b.kicad_sch` | `d6806d007e635118ae5778fa498cb3a98c6789dd2b38ef9ef516f3b3a40135f0` |
| start: the root's text from `assemble-root.ts blank two-block-board` | `38f21c9df048d071a57a016bbaa41c839cddfbe9e46b380c40412356180f13f8` |
| end: `a.kicad_sch` | `230f0598397656930d09f5e8563fdb60f1fe84476a03edcb5df1d081c6a8a235` |
| end: `b.kicad_sch` | `c410234cbe1bf13a22025105caafac1304b2c82d4b2df8aa3b7d14431b24f966` |
| end: `two-block-board.kicad_sch`, the root | `7fb295e5b088b19991728fba4ae06934ef0856cabfc38faab0a788fa0ba49389` |

## Replay

From the repository root, into a new or empty directory outside the repository:

```
bash tests/fixtures/two-block-board/drafted/repair/replay.sh <work-dir>
```

`replay.sh` does, in order:

1. Writes a `perfboard.json` for the board into `<work-dir>/two-block-board/` (kind `pcb`, no
   `sch`/`netlist`) and runs `tools/cli/draw.ts` - the program `make draw` runs - from there.
   No declaration is committed beside the fixture: the repository-wide declaration walk would
   find it and check it as a board. Checks the run printed `NO INDEPENDENT NETLIST:`, each
   block's generated intent is byte-identical to `a/intent.json` and `b/intent.json`, and each
   draft's sha256 is the start value above.
2. For each block, `bun tools/draught/hierarchical-labels.ts ops <module> <block> <sheet>`,
   checked against the committed `<block>/01-hierarchical-labels.json`; `akcli plan`, then
   `akcli draw --apply`, which must report `APPLIED`; then `hierarchical-labels.ts check`, the
   post-condition (one hierarchical label per port, no global label).
3. `bun tools/draught/assemble-root.ts blank two-block-board` for the root's starting text, then
   `assemble-root.ts ops <module> twoBlockBoard two-block-board`, checked against
   `root/01-assemble.json`; `akcli plan`, `akcli draw --apply`. Checks the block sheets did not
   change.
4. Checks every replayed sheet is byte-identical to the committed one.

Toolchain: copperhead 0.12.0 and akcli 0.22.0 under `draughting/` (`make draught-doctor` matched
every pinned tool), kicad-cli 10.0.5, bun. Replayed into a new directory and reached every end
sha256.

## The files

| file | what it is |
| --- | --- |
| `a/intent.json`, `b/intent.json` | the copperhead intent `drawingPages()` generated for each block at draft time |
| `a/01-hierarchical-labels.json`, `b/01-hierarchical-labels.json` | akcli op-lists from `tools/draught/hierarchical-labels.ts`: `3V3` (a one-pin port net, absent from the intent) gets a hierarchical label on its pin; copperhead's local `GND` label is deleted by uuid and a hierarchical `GND` added in its place. There is no global label on either draft, so there is no private-net op |
| `root/01-assemble.json` | akcli op-list from `tools/draught/assemble-root.ts`: one `add_sheet` per block with sheet pins `3V3` and `GND`, each pin wired to a local label naming its parent net |
| `replay.sh` | the replay above |
