Task 1 report: composition record on Network

Status: DONE. Commit 740a679, pushed.

Changes
- lib/model/types.ts: required `Network.blocks: readonly BlockRecord[]`, new `BlockRecord` (prefix, componentIds, ports).
- lib/model/include.ts: `blockOf(network, id)`; `includeNetwork` refuses a network with blocks (message: names the nested-composition limit, "C3 draws one level", the inner prefixes, why flattening is refused, and what to do instead).
- lib/model/builder.ts: Builder keeps `blocks`, `include()` appends the record, `done()` returns it.
- Network literals fixed (blocks: []): circuits/pultec/electrical/three-band.ts, circuits/pultec/physical/board.ts, lib/board/scaffold/flat.ts, and about 80 test sites (applied by a script, then typecheck-verified). lib/board/physicalize.ts keeps the input's blocks and drops ids of removed physical-only components from each record.
- tests/model/include-blocks.test.ts: the four brief tests. Watched them fail first (blockOf missing export).

Tests
- bun test tests/model/include-blocks.test.ts: 4 pass.
- bun test (whole): 2926 pass, 1 fail, 279 files. The one failure is the pre-existing tests/stripboard/temp-scratch.test.ts flagging tests/schgen-trial/comparator-controls.test.ts.
- bun run typecheck: clean.
- Not run: make check at boards/pt2399-core, verify.sh, carrier sha check (no drawing artifacts touched).

Self-review / concerns
- The "no include" test needed ports declared on the single resistor, since validateNetwork refuses single-pin undeclared nets.
- Test imports use relative .ts paths, matching the repo's existing convention (CLAUDE.md in the repo says explicit relative with extension).
- The new test file's include-refusal test builds a parent with ports so the inner network is a valid includable network.
