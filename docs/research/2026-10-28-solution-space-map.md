The schematic draughtsmanship solution space: what exists, what was measured
============================================================================

**Read this one first.** Twelve research documents landed on 2026-10-28, each
written to survive an adversarial reader. This is the map over them, written to
be read by a person in one sitting. Where this file states a figure, the
document named beside it holds the evidence and the caveats.

**The question it answers**, from the owner: *"before we commit to any tooling, I
want us to be SURE we understand what's currently available"* — for **schematic
draughtsmanship**, meaning how a schematic is drawn, judged and reviewed. Circuit
generation is out of scope. The goal is a **practice** built by **reusing** what
exists, not by authoring layout algorithms.

---

The short answer
----------------

**For drawing: several tools drew the circuit, and the owner has ranked their
pages.** Shown nineteen rendered pages labelled by tool and asked which worked
well enough to consider, he answered, 2026-10-28: *"copperhead is the best
overall. Circuitkz is my second choice."* **Microsoft SchGen was never run and
was absent from that comparison** - a hole he identified, not this document. What is
established here is which tools faked parts, which reported success while
emitting something wrong, and which round-trip to a netlist that matches.

**For judging: nothing exists.** No maintained, standalone schematic-legibility
checker is published anywhere. That negative was reached three independent ways
and is the most consequential finding here.

**For reviewing: five tools exist, four show you a difference, and exactly one
stores a verdict.** Most of the visual value is reproducible in four commands.

---

1. What exists, sorted by what it does
--------------------------------------

### 1.1 Tools that DRAW a schematic

| Tool | Drew our circuit? | Who decides placement |
| --- | --- | --- |
| **copperhead** | yes, first try, nothing faked | the engine, entirely |
| **akcli-kicad** | **yes** | **the agent, every coordinate** |
| `@schemd/core` | yes | the agent states positions, tool routes |
| `@wire-lang/core` | yes, one 5:1 row | the engine; grouping unimplemented |
| Lcapy | with three fakes | the author states every direction |
| circuit_macros / circuitikz / SchemDraw | yes | the author, every coordinate |
| `@tscircuit/*` | partly - see 3.2 | the engine |
| netlistsvg / ELK | scrambled the bank | the engine |
| Penrose | drew an infeasible circuit at exit 0, omitting a wire | a constraint solver |
| circuitsmith | **refused at the first resistor** | a closed rule set |
| mege-circuits | two parts at one coordinate; rotary impossible | nothing - no overlap detection |
| `@veriflow/schematic-core` | 19 identical rectangles | the engine |

### 1.2 Tools that REVIEW a schematic - show a difference, hold a verdict

All five were installed and run against two versions of our own low-boost sheet
whose netlists are identical and whose every part moved - the hardest case for a
diff, and the one a drafting review actually produces. The `git diff` baseline is
2,354 insertions and 2,995 deletions, which is the bar to beat.

| Tool | Ran | Shows a difference | Stores a verdict |
| --- | --- | --- | --- |
| **KiCAD-Prism** | yes, 5 containers, 4.39 GB | **true side-by-side** | **yes - REST, Postgres, exportable** |
| KiDiff | yes, headless | red/green overlay PDF | no |
| kiri | yes, needs 5 GNU tools | cyan/red overlay web UI | no - `grep -ci comment` is 0 |
| kischvidimer | yes, cleanest install | degenerates: 379 coordinates | no - its "Feedback URL" opens a link |
| plotkicadsch | **cannot read KiCad 10** | 0-byte SVG | - |

**Prism's most useful output is a number nothing else produces:** schematic
103 added / 148 removed / 77 changed, **BOM 0 / 0 / 0**. A machine-readable
statement that *the circuit did not change and the drawing did* - which is
exactly the distinction this practice turns on. Its stored verdict anchors to
`baseCommit`, `compareCommit`, `selectedSide` and a `designKey` content hash,
and exports as a commit-pinned `discussion.md`.

**And most of the visual value costs nothing:** two `kicad-cli sch export pdf`
runs plus three `magick` calls produce a red/blue superimposed page about as
readable as kiri's or KiDiff's, with no install. What the tools add beyond that
is semantic grouping, navigation, and - in exactly one case - somewhere to put
the verdict.

**Trap worth knowing:** same-second commits break date-ordered tools. kiri
labelled the *parent* revision "Newest". An agent that redraws and recommits
quickly hits this routinely; order by parentage, not by timestamp.

### 1.3 Tools that CHECK a schematic

`kicad-sch-lint` (19 convention-free codes, built for KiCad 10) and copperhead's
`legibility.ts` (13 families, deterministic, read-only) are the only two that
run standalone against an arbitrary `.kicad_sch`. They **agreed exactly** on one
of our boards and overlapped fully on the other. Neither is maintained as a
product: one has zero users, the other is a component inside an AI PCB tool.

### 1.4 Tools that REPRESENT placement intent

Fourteen systems surveyed. **Not one has all four of** a placement statement, a
grouping construct, a reason attached to a decision, and a machine-readable
round trip. The project that built the closest thing - `diodeinc/pcb`'s
`# pcb:sch <id> x= y= rot=` block - **now calls it legacy in its own docs**.

---

2. What was measured, on our own circuit
----------------------------------------

Every page below draws `pultec-low-boost`, the board the owner is building next.

| Page | Netlist | ERC | What is on the page |
| --- | --- | --- | --- |
| schgen generated | matches | 2 known | **5 of 6 capacitor values struck through by a wire** |
| agent hand-laid | matches | same 2 | values clear; cost 15 iterations and an algorithm |
| copperhead | matches | 0 | grouped; title block with revision; real rotary with its lug |
| copperhead on A5 | **matches exactly** | **0 violations** | **a third of the circuit is off the paper** |
| akcli-kicad | matches | 1 correct | all six values struck through; RV1 unreadable |
| `@schemd/core` | 13 of 14 | n/a | everything wired; no title block, no frame |

---

3. The three results that should govern the design
--------------------------------------------------

### 3.1 A netlist check cannot judge a drawing. This was proved, not argued.

Copperhead forced onto A5 put nine of twenty-nine symbols **below the bottom
edge** of the page - SW1 at y=168.91 on a 148 mm sheet, all six capacitors at
181.61 - and thirty-five of seventy-seven wire start points off-sheet. The parts
are **present in the file**; the plotter clips them.

So the exported netlist **matches the circuit model exactly**: 19 of 19
components, all 14 nets, `lo_boost_in` carrying all seven pins. ERC reports
`Found 0 violations`.

**`tools/draught/gate.ts` would pass that page.** Not because it is too weak -
because connectivity is not what is broken.

Worse, every exit code is zero: `draft` exits 0 with empty stderr, `--json`
exits 0 with `"ok": true` *and* `sheetFit.compaction: "overflow"`, `score` exits
0 while scoring 40, `kicad-cli sch erc` exits 0. So
`copperhead draft && kicad-cli sch erc && echo ok` **prints `ok`**.

> Not a check that failed to run, but four checks that ran, answered correctly,
> and were all asking the wrong question.

### 3.2 Silent degradation is the norm, not an outlier

- **`@tscircuit/*`**: 13 of 14 nets passed as `directConnections` - documented as
  *"guaranteed to be a routed trace"*. Measured from the solver's own output:
  **5 of 14 actually wired**, 9 held together by label text, 21 labels on nets
  asked to be routed - while reporting `solved=true`, `failedConnectionPairs: 0`
  and all 25 sub-solvers successful. The label placer counts a label as a
  *success*, so there is no flag to assert against.
- **`kicad-sch-api`**: printed `Successfully parsed schematic with 22 components`,
  then dropped **every `global_label`** on save. `hi_boost_out`, `in`,
  `lo_boost_in`, `out` became `Net-(R1-Pad1)` with eleven pins newly unconnected.
- **`kiutils`**: dropped all 192 `hide` flags at `kicad-cli` exit 0 - 154 to 643
  text elements, 322 KB to 4.85 MB.
- **Penrose**: on an infeasible circuit, exits 0, prints *"The diagram has been
  saved"*, overlaps two gates despite an explicit non-overlap constraint, and
  silently omits a wire.
- **Lcapy**: produced a page where nothing errored, the netlist stayed correct,
  and two stubs landed on one line so **the page states `lo_boost_in` is
  grounded**.

**Every tool in the non-EDA survey rendered an illegible or electrically wrong
page and reported success.**

### 3.3 An externally-authored legibility score was found, calibrated, and failed

Copperhead publishes a composite score with a stated known-good floor of 85.
Scored against drawings whose quality is already known:

```
89.60  copperhead, good page          composite 83.5
89.57  copperhead, A5 OVERFLOW        composite 40.0
88.51  agent hand-laid                composite 40.0
88.23  owner's mid-band               composite 40.0
87.57  owner's three-band-eq          composite 40.0
84.12  the known-bad generated sheet  composite 40.0
      (left column: the uncapped "style" sub-score)
```

**Five of six composites are exactly 40.0** - any sheet with one error finding is
floored, so `score >= 85` is `zero error findings` wearing a number. The owner's
own schematic **ties with the known-bad board**, and underneath the cap carries
**20 error findings against its 7**; half of those are `ungrouped-symbol`, a
penalty for not drawing copperhead's group rectangles.

On the uncapped sub-score, the page missing a third of its circuit **ranks second
of six, above the owner's own drawing**.

**Someone else having authored a legibility metric does not make it valid.** Use
its families as named checks; do not adopt its number.

---

4. What does NOT exist, with the search that would have found it
----------------------------------------------------------------

**No maintained standalone schematic-legibility checker.** Reached three ways:
a hands-on bake-off; a complete enumeration of the PyPI name index (925,633
packages) where npm `keywords:schematic-capture` and `circuit-diagram` both
return **0**; and the registry sweep, where GitHub `kicad schematic autoplace`
returns **0 repositories**.

**No schematic auto-layout in KiCad, and its absence proves nothing.** An
in-application schematic plugin was structurally impossible: the entire
action-plugin host is compiled into `_pcbnew.kiface` and absent from
`_eeschema.kiface`; KiCad 10's `schematic_commands.proto` contains **zero
messages**. The maintainer, closing a nine-year-old issue: *"due to historical
reasons / technical debt, it is not currently feasible to provide an API that
allows you to work with schematic symbols."* And **nobody has ever asked** for
schematic symbol auto-placement - every phrasing returns zero issues.

**Of 136 published KiCad addons, 9 touch a schematic and 2 touch the schematic
editor.**

**Symbol placement essentially never shipped anywhere.** Schematic *wire routing*
did - OrCAD Capture since 2010, Altium, Proteus - and is used daily. Of three
claimed symbol-placement products, one copies coordinates from the physical
layout, one is an API its own vendor says not to use in production, and the one
that genuinely did it, Viewlogic's ViewGen, died in 2002 with no successor.

**Nothing retains review verdicts as a corpus, induces a rule from them, or
distinguishes "this instance is an exception" from "the rule is wrong."**

**KiCad supplies no presentational criteria at all** - no geometric DRC, no
legibility check; the string `design rule` does not appear in the eeschema
binary. There is no upstream rule file to defer to.

---

5. What the evidence says about the practice
---------------------------------------------

### 5.1 From the trials

1. **The reviewer must look at the rendered page.** Three defects found in these
   trials - struck-through capacitor values, a falsely-grounded net, and a third
   of a circuit off the paper - were invisible to every check passing at the time.
2. **A connectivity gate is necessary and is not a draughtsmanship gate.** Keep
   it for what it does; never cite it as evidence a sheet is drawable.
3. **Exit codes are not a signal.** Anything driving these tools parses JSON.
4. **A tool with no overlap lint cannot be iterated against.** The one good
   agent-driven result rests on a finding count driven 22 to 13 to 1, where the
   lint caught every collision found by eye *plus five that were missed*.
5. **`out-of-frame` is worth having as a named check** - the only family that
   fired on the overflow page, and the only class of defect no netlist or ERC
   check can see.

### 5.2 From the drafting office, which had solved most of this by 1920

The modern survey found no precedent for retaining a reviewer's verdict, and
concluded the mechanism would have to be invented. It would not. Every item
below is quoted from a primary source read end to end; see
`2026-10-28-drafting-office-checking-practice.md`.

6. **The readability judgement is perishable, and that is why the producer
   cannot make it.** French, 1911 and 1918, quoting Follows' dictionary - so not
   authored by the checker - puts it at position **1** of the checker's list:
   *"Put yourself in the position of those who are to read the drawing and find
   out if it is easy to read and tells a straight story. Always do this before
   checking any individual features; in other words, before you have had time to
   become accustomed to the contents."* **The instrument is naivety and the
   detail passes spend it.** An agent that drafted the sheet cannot make this
   call, and neither can one that has read the netlist.
7. **Drawing quality was a separate signature from design correctness.**
   MIL-STD-100F §40.3.1 carries **DRAWING APPROVAL** - *"drawing format and
   completeness"* - distinct from DESIGN APPROVAL, *"design technical adequacy"*.
   Two signatures, two questions.
8. **The markup was retained by name, in a deletion rule.** Collins, 1918:
   *"After corrections have been made, the check prints are to be delivered to
   the file clerk for filing with the record prints"*, and *"Old prints of
   revised drawings (except record and check prints) shall be destroyed."* The
   office purged superseded prints and **exempted the checker's marked-up sheet**
   - a stronger retention guarantee than the drawing copies had.
9. **The markup was a COVERAGE record, not a defect list.** Correct matter was
   ticked too, so an *unmarked* feature meant *not reached*. Tick position
   encoded provenance; a pencilled ring meant *doubtful*, under a quarantine
   rule that nothing inside it could be used unverified. This answers "what did
   the reviewer actually look at", which no comment list can.
10. **The back-check: the correction is the least-checked part of a checked
    drawing.** Bishop, 1920: *"Unless he 'back-checks' or verifies each
    correction before making it, certain parts of the drawing are left
    unchecked, the value being the checker's instead of the detailer's."* **This
    hole is wider in an agent loop than it ever was on paper, because an agent
    applies a reviewer's fix perfectly and without resistance - the compliance is
    what makes it unchecked.** Bishop's enforcement is to withhold the fix and
    cite *"not the correct values, but the reference numbers to paragraphs which
    will suggest the nature of the mistakes"* - the rule violated, not the edit
    to make. That is already the shape `CLAUDE.md` demands of a refusal.
11. **"Legible enough" was defined by a downstream reproduction.** MIL-D-5480F
    requires a **fourth-generation** copy to remain legible; NPS-10 judges every
    original against a half-size print, because *"the contractor may never see
    the original drawing."* An author-independent, testable criterion.
12. **Effort was allocated by where an error would ESCAPE.** Do not check what a
    downstream process catches anyway. `validateCircuit` and `kicad-cli` are the
    shop; what escapes every tool here is arrangement, crowding, and whether the
    sheet reads.

**One thing not to inherit: the colour code.** It varied in kind and in
direction between sources, and Bishop forbids the red Collins mandates, on
erasability and because red on blueprints *"cause[s] unnecessary eye strain on
account of an optical illusion."* The colours were chosen by the physics of the
medium, not by meaning. Carrying a palette into a digital practice is cargo cult.

---

6. Open
-------

- **Not obtained:** ASME Y14.2 / Y14.35 / Y14.100 clause text, which is
  paywalled - so whether Y14.35 mentions check prints is unknown. Its free DoD
  predecessor does not; MIL-STD-100F has no check-print clause, no colour code
  and no markup-retention clause, because the check print was drafting-room
  *procedure* rather than a standardised deliverable. That is most of why a
  standards-aimed search found nothing.
- **Coverage holes.** GitHub search truncates at 1,000 per query against
  `topic:eda`'s 15,776 and `topic:kicad`'s 5,168; GitHub *code* search was never
  run; CTAN was never swept. None is fixable by more queries of the same kind.

---

The evidence
------------

| Document | Holds |
| --- | --- |
| `2026-10-28-trial-lcapy-copperhead.md` | the copperhead and Lcapy pages, the A5 forensics, the score calibration |
| `2026-10-28-trial-kicad-emitting-tools.md` | akcli, circuitsmith, mege |
| `2026-10-28-trial-typescript-schematic-layout.md` | wire-lang, tscircuit, schemd, veriflow |
| `2026-10-28-draughtsmanship-tool-bakeoff.md` | the checkers, run against our boards |
| `2026-10-28-kicad-native-schematic-layout.md` | KiCad's capability and plugin architecture |
| `2026-10-28-placement-intent-representations.md` | fourteen systems, adopt nothing |
| `2026-10-28-drafting-practice-survey.md` | how review is practised; KLC's waiver mechanism |
| `2026-10-28-non-eda-drawing-ecosystems.md` | Penrose, circuit_macros, Typst, the general engines |
| `2026-10-28-registry-enumeration-packages.md` | the PyPI/npm/crates sweep |
| `2026-10-28-registry-enumeration-kicad-github.md` | the PCM registry and GitHub topics |
| `2026-10-28-academic-schematic-generation-check.md` | EEschematic, SchGen, CircuitLM, SINA |
| `2026-10-28-ai-native-eda-platforms.md` | Flux, atopile, JITX, Quilter, diode |
| `2026-10-28-drafting-office-checking-practice.md` | the checker, the check print, the back-check |
| `2026-10-28-trial-schematic-review-tools.md` | kiri, KiDiff, Prism, kischvidimer, plotkicadsch |
