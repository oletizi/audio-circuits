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

**For drawing: several tools work, one drew our circuit well from a single
command, and a second gives an agent the best hands found anywhere.**

**For judging: nothing exists.** No maintained, standalone schematic-legibility
checker is published anywhere. That negative was reached three independent ways
and is the most consequential finding here.

**For reviewing: a small cluster of real tooling exists** and had never been run
in this project. [PENDING - the trial is in flight.]

---

1. What exists, sorted by what it does
--------------------------------------

### 1.1 Tools that DRAW a schematic

| Tool | Drew our circuit? | Who decides placement |
| --- | --- | --- |
| **copperhead** | **yes, first try, best page** | the engine, entirely |
| **akcli-kicad** | **yes** | **the agent, every coordinate** |
| `@schemd/core` | yes | the agent states positions, tool routes |
| `@wire-lang/core` | yes, one 5:1 row | the engine; grouping unimplemented |
| Lcapy | with three fakes | the author states every direction |
| circuit_macros / circuitikz / SchemDraw | yes | the author, every coordinate |
| `@tscircuit/*` | partly - see 3.2 | the engine |
| netlistsvg / ELK | scrambled the bank | the engine |
| Penrose | garbage, silently | a constraint solver |
| circuitsmith | **refused at the first resistor** | a closed rule set |
| mege-circuits | overprinted parts | nothing - no overlap detection |
| `@veriflow/schematic-core` | 19 identical rectangles | the engine |

### 1.2 Tools that CHECK a schematic

`kicad-sch-lint` (19 convention-free codes, built for KiCad 10) and copperhead's
`legibility.ts` (13 families, deterministic, read-only) are the only two that
run standalone against an arbitrary `.kicad_sch`. They **agreed exactly** on one
of our boards and overlapped fully on the other. Neither is maintained as a
product: one has zero users, the other is a component inside an AI PCB tool.

### 1.3 Tools that REPRESENT placement intent

Fourteen systems surveyed. **Not one has all four of** a placement statement, a
grouping construct, a reason attached to a decision, and a machine-readable
round trip. The project that built the closest thing - `diodeinc/pcb`'s
`# pcb:sch <id> x= y= rot=` block - **now calls it legacy in its own docs**.

---

2. What was measured, on our own circuit
----------------------------------------

Every page below draws `pultec-low-boost`, the board the owner is building next.

| Page | Netlist | ERC | Verdict by eye |
| --- | --- | --- | --- |
| schgen generated | matches | 2 known | **5 of 6 capacitor values struck through by a wire** |
| agent hand-laid | matches | same 2 | values clear; cost 15 iterations and an algorithm |
| copperhead | matches | 0 | best page produced by anything; grouped, titled |
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

---

6. Open
-------

- **Review tooling** - `kiri`, `plotkicadsch`, `KiDiff`, `KiCad-Prism`,
  `kischvidimer` are being run against two versions of the same sheet. [PENDING]
- **Drafting-office checking practice** - the checker as a role, the coloured
  check print, and what happened to the markup. [PENDING]
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
