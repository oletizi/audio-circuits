Removing the schematic-generator honey pots
===========================================

**Status: design, approved in conversation 2026-10-30. Not yet planned, not yet
implemented.**

The decision is `docs/known-gaps.md` **G306**. This document is how, not whether.

---

## Why

> *"I feel like we should throw away schgen - it has never worked well. Our new
> process works MUCH better"*
>
> *"refactor whatever is used elsewhere to a more suitable library location. I
> don't want it acting as a honey pot for agents to start thinking it's how this
> project generates schematics."* - the owner, 2026-10-30

**The second sentence is the purpose and it is about what a file TEACHES, not
whether its code runs.** A large, plausible, well-documented generator in `lib/`
is read by the next agent as the way this project draws schematics. `CLAUDE.md`
has been saying exactly that in as many words, which is the proof the honey pot
is real rather than hypothetical.

**What draws now:** copperhead drafts, akcli-kicad repairs - the loop in
`TOOLING.md`. Five approved Pultec pages came out of it; `drafted/pultec/` holds
them and the build guides print them.

**The verdict behind it**, the same day, on the eleven generated pages shown
beside the five guides: *"the drawings in the build guides are MUCH better than
the lib/schgen pages you just showed me."*

## What this is not

**Not dead-code removal.** The code runs, and `make check` executes it five times
every run. An earlier claim in this writer's own hand that it did not was
produced by grepping a log for a string - a check that could not have failed, and
`G306` records the correction. **Anything here that reads as "this is unused"
should be distrusted and re-measured.**

---

## 1. The three things that are knowledge, and where they go

Everything in `circuits/*/schematic/` exists to feed schgen. Three parts of it
are facts about circuits and parts that outlive the generator; the rest is layout
intent for a tool that is leaving.

| What | From | To | Why there |
| --- | --- | --- | --- |
| `POLE_PIN`, `THROW_PINS` | `circuits/pultec/schematic/section-board.ts` | `circuits/pultec/physical/parts.ts` | Switch pin geometry **read off the installed KiCad library and verified against it by a test**. It is a fact about a physical part, and that file already holds `ROTARY_SYMBOLS_BY_POSITIONS`, `rotarySymbolFor` and `rotaryPadOrder`. |
| `pultecDesignator()`, `JUNCTION_DESIGNATORS` | same | beside the circuit | `CLAUDE.md`: a circuit *"exports a separate id-to-designator map ... and that map is the only place the two vocabularies meet."* It is the circuit's, not the generator's. |
| the `ncPins` declaration for `SW_MID` pin 12 | same | `circuits/pultec/physical/parts.ts` | The unused twelfth detent of a 1x12 whose stop is set to eleven - the owner's recorded part choice (*"Assume a 1x12"*). Parts knowledge. |

**Everything else goes**: `SchematicAuthoring`, `BlockDeclaration`, `RailSpec`,
`SheetSpec`, anchors, port directions, component overrides other than `ncPins`,
across all ten files under `circuits/*/schematic/`.

**The moved code keeps its tests and its provenance comments, and loses any name
or comment implying it draws schematics.** `tests/schgen/nc-pins.test.ts`'s arms
that assert pin identity against the installed library move with the data; the
arms about `pinsDeclared` go with the gate.

## 2. The four guards, rebuilt before anything is deleted

`make/board.mk`'s `netlist-agrees` runs `tests/circuits/<board>.test.ts` for every
board declaring an `"sch"`. All five Pultec boards do, and all five delegate to
`tests/circuits/drafted-sheet.ts`, which imports four `lib/schgen/` modules and
four `tools/schgen/` ones. **Four guards on the five approved pages ride on it:**

1. the page's bytes against the digest its `RECORD.md` binds it to
2. that its netlist was exported from that sheet and no other file
3. that every component and net agrees with the circuit model
4. that the known disagreements are exactly the expected ones

**Guards 1, 2 and 4 need nothing from schgen** - a hash, a provenance check, and
a data list.

**Guard 3 is the only real work.** It compares an exported netlist against the
model. `lib/kicad/netlist.ts` already imports the KiCad side; what schgen
supplies is the model side, flattened to comparable form. That flattening is
reimplemented standalone, without the IR, the layout backend or the gates.

**THE ORDERING IS THE POINT: built and proven equivalent against all five
approved pages FIRST, with the old and new guards agreeing on every board,
before one line of schgen is deleted.** The guards never lapse. A deletion that
drops them for even one commit would leave the approved pages unbound, and the
binding is the only thing that makes an approval mean a specific artifact.

**Each replacement guard carries a positive control** - a perturbation that makes
it fail - because a guard that cannot fail is the failure mode this repository
exists to prevent, and two of today's controls were found inert on exactly the
things they protected.

## 3. `lib/kicad/schematic.ts`, the second honey pot

It is the superseded stub writer. It survives only because
`tests/circuits/kicad-round-trip.ts` and the five
`tests/circuits/transistor-preamp-*.test.ts` use `writeSchematicStub` as this
repository's **only** proof that `kicad-cli` reads a generated schematic the way
the circuit means it. Its own comment records (**G81**) that what it emits is a
known failure mode.

**With schgen gone it becomes the only model-to-schematic writer in the
repository - a sharper honey pot than the one being removed.** The owner's
instruction was plural; it goes.

**The proof moves to a different subject.** The five approved sheets in
`drafted/pultec/` are real KiCad files, already exported by `kicad-cli` on every
`make check`. Proving round-trip fidelity on pages this project actually ships is
a **wider** claim than proving it on stub output nothing consumes - wider because
the subject is shipped rather than synthetic, which is a property of the subject
and not a judgement of either drawing. The five
`transistor-preamp` boards have no drafted page, so **what they lose and what
replaces it is stated plainly in the plan rather than assumed** - this is the one
place where the change can quietly reduce coverage.

## 4. What is deleted

`lib/schgen/` (110 files, 22,365 lines), `tools/schgen/` (81, 17,674),
`tests/schgen/` (152, 26,141), `tools/cli/schgen*.ts`, `tools/draught/gate.ts`
(no consumer anywhere; already recorded as structurally inadequate), and the
layout-intent half of the ten `circuits/*/schematic/` files.

**Also deleted: the guide's generate-a-missing-page path.** `resolveSchematic`
exists to draw a page for a board declaring no `"sch"`. All eleven boards declare
one. With schgen gone, such a board gets the existing "no schematic" notice,
which `tools/guide/schematic-notice.ts` already prints and `tests/guide/` already
covers. **A board that declares an `"sch"` must keep printing it exactly as now.**

`tools/guide/packet.ts` imports `boardRefs`/`boardSheets` directly as `deps`
defaults, not only through `schematic-source.ts` - a real import the first sweep
missed, and a reminder that the sweep is re-run rather than trusted.

## 5. Relocations other than the three

| What | Used by | Where it goes |
| --- | --- | --- |
| `occupancy.ts` (`createOccupancy`, `leastCovered`, `MARK_WEIGHT`) | `tools/guide/placement.ts` | beside its consumer |
| `readability/baseline.ts` | **nothing imports it** - but it is the only loader for `schematic/readability-baselines.json`, a committed owner-judgement registry | with that registry, or the registry goes too **if the owner rules it dead** - not an agent's call |

## 6. The prose, which is most of the honey pot

**These TELL AN AGENT WHAT TO DO and are therefore the honey pot itself:**
`CLAUDE.md:136` (*"The schematic generator is `lib/schgen/`"*), `:144-145` (two
`tools/schgen/` commands it instructs agents to run), `:227`, `:324`;
`README.md:29-38`, `:190-203`, `:245-259` (*"`bun run schgen` is its front
door"*), `:337-341`; `TOOLING.md:38-40`, `:54`, `:68`;
`docs/schematic/README.md:159`; `.gitignore:8-25`.

**These are the historical record and are NOT rewritten**, because `CLAUDE.md`
already rules that a dangling reference is inert while a stale claim is not:
`DEVELOPMENT-LOG.md`, `docs/known-gaps.md`, `docs/research/*`,
`docs/superpowers/{specs,plans}/*`, `docs/schematic/schgen-development-history.md`,
the five `RECORD.md`.

**The test for which list a document is on: would a reader follow it as a current
instruction?**

---

## Decisions

| Decision | Who | Why |
| --- | --- | --- |
| Delete `lib/schgen/` and `tools/schgen/` | owner | *"it has never worked well. Our new process works MUCH better"* |
| The reason is the honey pot, not the code quality | owner | *"I don't want it acting as a honey pot for agents to start thinking it's how this project generates schematics"* |
| Move the data we need somewhere not tied to the old tooling | owner | answering whether the `circuits/*/schematic/` declarations go with it |
| Remove `lib/kicad/schematic.ts` too | owner | answered *"remove it"* when asked whether it is the second honey pot |
| Rebuild the four guards standalone **before** deleting | this writer, approved | the approved pages' binding must never lapse |
| Move the `kicad-cli` round-trip proof onto the five approved sheets | this writer, approved | a real page this project ships beats stub output nobody uses |
| Do not rewrite the historical record | `CLAUDE.md` | a dangling reference is inert; a stale claim is not |

## What this leaves open

- **`schematic/readability-baselines.json`** is a committed owner-judgement
  registry whose only loader is going. Whether it is still wanted is **his
  question**, raised in the plan, not answered here.
- **The five `transistor-preamp` boards have no drafted page**, so the
  round-trip proof cannot cover them the way it covers the Pultec five. What
  coverage they end with is measured and reported rather than assumed.
- **`make check` must fail on exactly the four boards it fails on today** -
  `pt2399-core`, `transistor-preamp-lab`, `-loop`, `-staged`. Five more would
  mean the guards lapsed.
- **`bun test` should reach zero failures**: the current eight are
  `tests/schgen/port-fidelity.test.ts` on an unset `SCHGEN_SOURCE`, and they go
  with the code that needed them. If any remain, the plan says which.
- **Not one byte of any sheet under `drafted/` may change.** Four of the five
  digests are bound in `RECORD.md`, not in `verdicts.md` - a sweep that checks
  only `verdicts.md` checks one page in five.
