# Task 2 report: What ELK already offers for labels

**Status: DONE_WITH_CONCERNS.** Every step is done and committed. The concerns
are two, both recorded in the tree rather than only here: §2's pasted output is
**not** held to a log by any check (§1's checker is single-log by construction and
I may not edit it), and I found a **live tripwire with no wire** in
`lib/schgen/elk/read-graph.ts` that I am not allowed to fix.

**Commits** (branch `feature/schematics-tooling`, pushed):

| SHA | what |
| --- | --- |
| `04b6a1d` | the committed, input-pinned probe (`tools/schgen/elk-labels/{probe,arms,corpus}.ts`) + three `handWritten` manifest entries |
| `36e02e8` | rename the probe's first log section so it cannot collide with Task 1's |
| `cb35fe0` | §2 of the research document, the committed run log, `G266`, and the `G262` amendment |
| `338f31d` | correct one interpretation in §2.1 that stood where a measurement should |

**Full suite:** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
→ **3778 pass / 0 fail / 43457 expect() across 352 files**, which is HEAD exactly.
`bun run typecheck` clean. The sibling repository's `git status --porcelain` is
empty. No AI attribution in any commit.

## Does the graph this repository hands ELK contain labels at all?

**No - not one, and the serializer refuses one.** `[RAN]` Over all **48 ELK
blocks of all eleven boards**: **398 nodes, 620 ports, 494 edges, and 0 elements
carrying a non-empty `labels` array.** The control is that the same walk finds a
`layoutOptions` record on **398 of 398** nodes, so the zero is about labels and
not about the walker. And `lib/schgen/elk/serialize.ts`'s `refuseUndeclared`
**throws** on any element carrying a label (driven, with the unlabelled graph
serializing to 12345 bytes as its control), so no label can reach ELK by
accident.

**Consequence, stated as the brief asked:** ELK has never been told this
repository draws any text, so **every downstream text collision is between items
ELK never knew existed.** Boundary nodes - which become the global labels - are
sent as **zero size**.

Also: this repository sets **0 of the 22** label-related options ELK exposes,
controlled by three options it does set, found by the same scan.

## What the two-armed experiment showed

Nine arms over the same 48 graphs, each decorating a clone (no production module
changed), at all three of §1's line heights.

- **Arm e, the case that should succeed, succeeded.** Symbol box held fixed
  (which is not a choice - it is what a KiCad symbol is), label above the body:
  **all 398 placed, 0 body overlaps, and the graph grew in both dimensions**
  (162306 × 133354 → 195580 × 151786.9 on `pt-core`). **ELK reserved room for an
  outside label without resizing the node.** That is the strongest positive.
- **Arm f, the case constrained to `layered`'s own default, failed silently.**
  One option different - no placement hint, which is ELK's documented default
  (`NodeLabelPlacement.fixed()`, i.e. empty). **All 398 labels came back still
  carrying the impossible sentinel coordinate they were sent with.** ELK did not
  place them and said nothing.
- **Arm g is the same arm without the sentinel and is the finding.** Every label
  comes back at `(0, 0)` - the node's own corner - 254 overlapping their own
  body, **136 of 398 on a whole grid step by accident**, and **the graph still
  grew**, because ELK reserved space for a label it never placed. **Without the
  sentinel arm I would have reported `(0, 0)` as a placement.**
- The arms can answer differently by construction: if ELK placed labels
  unconditionally **f** would have come back placed; if it ignored labels,
  **e** would not have moved the layout.
- **The price of reserved space for an INSIDE label is the symbol.** Arm **b**:
  **398 of 398 nodes come back a different size**, worst **30966.9 µm (> 24 grid
  steps)**; `C1:1` goes 4064 × 7620 → 5090 × **2053.1**. Arm **c**, with the
  symbol's box pinned as `nodeSize.minimum`: still **362 of 398**, worst
  **17790.0 µm**, and the zero-size boundary nodes acquire a body.
- **Port labels and edge labels are placed at ELK's non-empty defaults**: 620 and
  494, all with coordinates. Edge labels reserve a lot of room (`pt-core` 162306
  → **445010 µm** wide) and **5 pairs of different edges' labels overlap**.
- **ELK's placed labels cross wires**: **266** label-over-wire crossings in arm
  **e**, by production's own `segmentHitsBox`. Not diagnosed.
- **Grid legality**: only **12 of 398** placed labels in arm **e** have a corner
  on a whole grid step.
- Every structural answer holds at all three line heights. **One conclusion does
  not** and is named as such: the 5 edge-label overlap pairs are **0** at the
  current model's 1270 µm line and **5** at both measured heights.

## Could ELK own any part of this problem?

**No part that would unblock a board, and the reason is the output format rather
than a missing ELK feature.**

**It could own:** reserving room for outside text while it places nodes (arm
**e**); placing pin text and net-name text (arms **h**, **i**); coarse side
selection for an edge label.

**It cannot own:**

1. **The global-label class.** `[READ]` `lib/schgen/render/emit-items.ts:227-241`
   - a `global_label` is `(global_label <net> (shape …) (at l.at angle) …)`.
   **Its text has no coordinate of its own.** ELK's answer for a boundary node's
   label is an offset from the anchor (`(-1905, -2048.1)` for `+5V`), and there
   is nowhere in the file to put it; honouring it moves the wire end. This
   *sharpens* **G262**: not merely that moving a label changes the circuit, but
   that the format gives no way to move the text without moving the anchor.
2. **Label-label separation across elements.** The only label-to-label spacing is
   `spacing.labelLabel`, whose own description scopes it to *"two labels of the
   same graph element"*; the edge-label arm produced 5 overlapping pairs.
3. **Keeping text off wires** - 266 crossings in the arm that otherwise
   succeeded.
4. **Reserving room for a label inside the body** - that requires growing the
   node, which is not available here.
5. **Anything, by default.**

**The one route not closed** is modelling a net name as an ELK **edge** label
(`layered` declares `EDGE_LABELS` as a supported feature and placed all 494),
with the measured obstacle that `edgesForNet` makes a net of degree n into n-1
edges, so an edge label is **per segment, not per net** - 494 edges for 48
blocks. I did not build it (the plan forbids emitter changes) and I did **not**
establish that KiCad connects a global label placed part-way along a wire, which
is the question that route turns on.

**One narrower claim does survive for Task 7**: this repository places all of its
text *after* a layout computed as if no text existed, and ELK demonstrably can be
told about text before it places nodes.

## Two ways this probe lied before it was pinned (both now in G266)

1. **A scratch copy of the probe measured a different ELK.** `import.meta.resolve`
   is relative to the calling file, so a script **outside** the repository does
   not resolve `elkjs` through `package.json`. Bun auto-installed **0.12.0** and
   served it: **235** option ids, **11** algorithms, **153** `layered` options,
   where the pinned 0.9.3 reports **224**, **12**, **140**. **I had written a
   paragraph claiming `tests/schgen/elk/options.elk.test.ts`'s 224 was stale by
   eleven.** It is correct; my probe was wrong. Caught by ruling R4 (commit the
   probe, pin the input by hash) on its first use. The committed probe now prints
   the install it resolved and refuses an unpinned bundle.
2. **I hand-typed two figures into the first draft of §2 and both were wrong**
   (`197950` for `177950`, an on-grid count of 24 for 12). The document is now
   assembled by splicing exact line ranges out of the committed log, and I
   verified programmatically that **all eight blocks are exact contiguous slices**
   covering **12396 of the log's 12412 bytes** - the whole run, so there is no
   excerpt to hide anything in.

## The attack surface my own work opened (ruling R13) - predicted, then fired

§2's blocks are necessarily **not** §1's probe output, and `verify-pastes.ts`
fails the document when a non-`run` block shares **any** line with §1's log. My
probe's first section was called `== WHAT THIS RUN MEASURED` - **also §1's log's
first header, and the one line the checker uses to count runs in a log.** One
shared line, one failure, naming §2's block at §1's rule.

**Fixed at the probe (renamed), not at the paste** - trimming the line out would
have been exactly the tidy that checker exists to catch. The two logs now share
no line, driven. `tools/schgen/elk-labels/probe.ts` carries the reason at the
renamed line, and §2.10 plus **G266**(4) carry it for the next section.

## Concerns for review

1. **§2's eight blocks are NOT checked.** They are listed by name as NOT CHECKED
   on every `bun test`. The checker cannot be pointed at §2's log either (§1's
   fourteen `run` blocks would fail), because it is **single-log by construction**
   under ruling R15. Fixing that means teaching the fence to name a log as well
   as a section - machinery this task may not build. **G266**(5) holds the
   criterion.
2. **A live tripwire with no wire, which I may not fix.** `read-graph.ts` and
   `adapt.ts` contain the word "width" **0 times** and "height" **0 times**
   (driven; `graph.ts` uses each 3 times). **Nothing compares the node size ELK
   returns to the size it was sent.** Harmless today; the day anyone sets a
   node-size constraint to make room for a label, every grown node places its
   symbol at the grown box's corner while its pins were computed from the ungrown
   one. **G266**(2) records it with a criterion and an explicitly untried
   mechanism.
3. **Three files outside `lib/` changed, all declarations.** Committing the probe
   under `tools/schgen/` turns `tests/schgen/port-fidelity.test.ts` red unless
   declared, so three `handWritten` entries were added to
   `tools/schgen/port-manifest.json` - provenance, not behaviour, the same
   disclosure Task 1 made in **G265**(5). No `lib/`, no `circuits/`, no check.
4. **One figure in §2 is RELAYED, not re-driven**: §1.4's 2043.1 µm line height.
   §2 states it and re-runs the whole experiment at all three of §1's heights so
   that nothing rests on it.
