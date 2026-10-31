# Task 2 review - the model-`NC`-to-`no_connect` measurement

**Reviewer:** task reviewer, round 1. **Tree:** worktree
`/Users/orion/work/audio-circuits-work/pultec-modularize`, branch
`feature/schematics-tooling`, HEAD `1c0ade7`, BASE `15696e0`.

**Method.** Every claim below is marked **CONFIRMED** (I re-drove it myself) or
**RELAYING** (I am passing on another agent's report). I perturbed `lib/` and
the new test file to drive outcome 1 and the four states to red, restored every
byte, and verified by SHA-256 and `git status --porcelain`.

---

## VERDICTS

| | Verdict |
| --- | --- |
| **SPEC COMPLIANCE** | **PASS.** Every step of the brief is discharged, §3b's four states are each pinned to their exact single message, the measurement's result (outcome 1) is the deliverable and is recorded durably in `G278`, and the three reservations §3b requires stay open are stated rather than relaxed. Nothing under `lib/` changed. Nothing in `circuits/` authors `NC`. |
| **TASK QUALITY** | **PASS WITH FINDINGS.** The test is a genuine end-to-end drive, not a construction of its own artifact, and it survived a five-mutation battery: every one of the four states, and the emission half, can actually fail. Two findings are Important and both sit in the **coverage** claim (C) rather than in the code: one completeness generalisation is false and is now in the approved spec, and the caveat that was supposed to protect the coverage reading does not in fact protect it. Neither changes outcome 1. |

---

## A. OUTCOME 1, ATTACKED AS THE CONVENIENT ANSWER

### A1. Does the test exercise the real path, or build what it measures?

**CONFIRMED: it exercises the real path.** `tests/schgen/ir/nc-end-to-end.test.ts`
builds a `Network` with `circuit().ic(...)` and then runs
`circuitSpecFrom` -> `buildCircuit` -> `validateCircuit` -> `layoutSheet` ->
`emitSheet` (lines 146-158). No `IrPin`, no `SheetDrawing` and no sheet text is
hand-constructed anywhere in the file. This is **not** false-greens #14 (*a
population inherited from the artifact under test*): the fixture is the input, and
every asserted value is an output of production code.

The one authored-at-the-IR-level thing in the picture is the pre-existing `mini`
fixture, and the implementer says so explicitly rather than letting it stand in
for a model `NC`.

### A2. Making the path fail - the mutation battery

I drove five mutations. **Each was restored byte-for-byte and verified by SHA-256.**

| # | Mutation | Tests killed | Verdict |
| --- | --- | --- | --- |
| M1 | `lib/schgen/render/unit-pins.ts` `noConnectEnds` filter forced to select nothing | **2** - *"is emitted as a no_connect marker"*, *"the marker sits at the pin end"* | emission half has teeth |
| M2 | `lib/schgen/ir/validate.ts` `pinsDeclared` push disabled | **1** - state 2 | **state 2 has teeth** |
| M3 | `lib/schgen/ir/validate-nets.ts` `pinSemantics` `no_connect` push disabled | **1** - state 3 | state 3 has teeth |
| M4 | `lib/schgen/ir/validate-nets.ts` `singlePinNets` push disabled | **1** - state 4 | state 4 has teeth |
| M5 | `lib/schgen/ir/types.ts` `connectedNet` returns `"IN"` instead of `null` for the `nc` case | **6** - all five state-1 tests plus state 4 | the IR-level `null` claim has teeth |

**The claim did not break.** Nothing in the file passes for a reason other than the
one it documents.

### A3. The controls the brief asked for

I appended a temporary probe block to the test file (then removed it; SHA verified).

```
PROBE on-net  (no_connect count): 0
PROBE omitted (no_connect count): 0
PROBE nc      (no_connect count): 1
```

**CONFIRMED.** Turn the fixture's `NC` into an ordinary net and the `(no_connect)`
disappears; remove the pin entirely and it also disappears **and** `pinsDeclared`
refuses (M2 proved that refusal is live). So the marker appears if and only if the
model declares `NC`, and an omitted pin is **not** silently drawn as a no-connect -
which is the accident the brief said state 2 exists to catch. This is a real
control, not false-greens #12 (*a control that returns the treatment's answer*).

**CONFIRMED structurally:** `from-network.ts:360` sets `ncUnlisted: null`, so an
omitted pin is never synthesised into `c.pins`. That is the mechanism behind the
test's structural distinguisher at lines 207-211, and it is why states 1 and 2
cannot collapse into each other.

### A4. The `(at x y)` equality - is it comparing against an independent coordinate?

**No, and the report does not claim it is - but the claim is nonetheless true, and
I established that independently.**

The assertion is `expect([at[1], at[2]]).toEqual([fmtMm(point.x), fmtMm(point.y)])`,
where `at` is regexed out of the emitted sheet and `point` is
`drawing.noConnects[0]`. **Both sides descend from the same layout value through
the same `fmtMm`**, so this is *emitter fidelity to the layout*, not an independent
derivation of where pin 7 is. It is **not tautological** - M1 killed it - and the
test's own name (*"the marker sits at the pin end **the layout reports**"*) is
honest about its scope. It under-claims rather than over-claims.

**I derived the coordinate independently** from the symbol file and KiCad's
placement convention:

```
PROBE U1 instance (at x y rot): [ "38.1", "38.1", "0" ]
PROBE drawing.noConnects:       [{"x":48260,"y":35560}]
PROBE fmtMm point:              [ "48.26", "35.56" ]
PROBE derived pin7 end (x+10.16, y-2.54): [ "48.26", "35.56" ]
```

`Fix.kicad_sym` line 121 gives BIG8 pin 7 as `(pin no_connect line (at 10.16 2.54
180) ...)`; U1 is placed at `(38.1, 38.1, 0)`; sheet Y inverts; so pin 7's
connection point is `(48.26, 35.56)` - **exactly** what the marker carries.
**CONFIRMED: the marker really is at pin 7's end**, on evidence that does not pass
through `drawing.noConnects`.

### A5. The traced mechanism

**CONFIRMED** by reading each hop: `from-network.ts:222`/`:233` (`{ nc: true,
identity }` on the else branch) -> `ir/build.ts:46-47` -> `connectedNet` at
`ir/types.ts:62` (`return "net" in c ? c.net : null`) -> `pinsDeclared`
(`validate.ts:67-77`, `have` built from pin **numbers**) -> `noConnectEnds`
(`unit-pins.ts:49-53`, selects `net === null`) -> `sheets.ts:111-118` (dedupe by
`pointKey`) -> `emit.ts:169` -> `emit-items.ts:215-218` `noConnect()`.

**A. VERDICT: outcome 1 stands. I could not break it.**

---

## B. THE FOUR STATES OF §3b

| State | Rule | Exact message asserted with `toEqual` | Can it fail? |
| --- | --- | --- | --- |
| 1. deliberate `NC` accepted | all eleven | `[]` | **YES** (M5 reddened it) |
| **2. pin omitted from the model** | `pinsDeclared` | `part U1: pin 7 (NC) is neither on a net nor declared not connected` | **YES (M2)** |
| 3. library `no_connect` pin on a net | `pinSemantics` | `part U1: pin 7 is a no_connect pin but is on net IN` | **YES (M3)** |
| 4. pin alone on a one-pin net | `singlePinNets` | `net SPARE has only one pin (U1.6); connect it or declare the pin not connected` | **YES (M4)** |

**All four are `toEqual` on the exact single-element array**, not a count and not a
`toContain`. That matters here specifically: `validateCircuit` runs eleven rules, so
a count-only assertion would be false-greens #6 (*a refusal counted rather than
read*). The implementer avoided it, and the fixture is deliberately built so each
arm produces exactly one problem - pins 4 and 8 are put on declared rails so
`pinSemantics`' power-input rule cannot fire and muddy the arm. **CONFIRMED** by
reading `validate-nets.ts:44-46` and by the fact that each mutation killed exactly
the one expected test.

**State 2 has not been traded for a green.** It is pinned twice - on the message
(killed by M2) and structurally, on the pin's absence from `c.pins` versus the `NC`
pin's presence (lines 207-211). The brief's worry that the task might have relaxed
`pinsDeclared` to make state 1 pass is **unfounded**: nothing under `lib/` changed
at all, and `pinsDeclared` accepts an `NC` pin for a pre-existing reason (it tests
membership by pin **number**, and an `NC` pin *is* in `c.pins`).

**State 4 is the `pt2399-core` shape, and it is a real reproduction.** The fixture
strands pin 6 on net `SPARE` and keeps it legal at `done()` with a declared port -
so `lib/model` accepts it and the IR refuses it anyway, which is the spec's *"one
workaround, two validators, and it only ever satisfied one of them"* turned into a
test. **CONFIRMED.**

**B. VERDICT: all four states are distinguishable and all four can actually fail.**

---

## C. THE COVERAGE CLAIM - TWO IMPORTANT FINDINGS

I re-ran the full suite under lcov myself and got the reported figures exactly.

| Claim | Verdict |
| --- | --- |
| `lib/schgen/render/emit-items.ts` LF=137, LH=137, no uncovered lines | **CONFIRMED** (also FNF=26 FNH=26; zero `DA:*,0` records) |
| `gates/pin-table.ts` LF=78 LH=78, `render/emit.ts` LF=149 LH=149 | **CONFIRMED** |
| `noConnect()` was already exercised **before** this task | **CONFIRMED** - `round-trip.kicad.test.ts` **alone** hits `DA:215,19`. My own full run includes the new test, so I re-derived this from a run that cannot contain it, which is the false-greens #23 trap (*a figure published about the artifact the change is still editing*) the implementer had also guarded against by running at a clean tree |
| the 6-of-17 split | **CONFIRMED on 5 spot-checks**: `round-trip.kicad` and `emit-byte-stable` cover (`DA:215,19`); `emit.test`, `emit-refusals`, `emit-power-refs` and `pin-marks` do not (`DA:215,0`) |
| the `mini` fixture writes **3** `(no_connect ...)` on `signal.kicad_sch`, 0 on the other two | **CONFIRMED in the bytes.** I generated the design myself: `mini.kicad_sch: 0`, `power.kicad_sch: 0`, `signal.kicad_sch: 3`, total 3. Its source is `designs/mini/index.ts:86` - three null-net pins on an unused op-amp B unit, authored at the **IR** level |
| `round-trip.kicad.test.ts` exports with real `kicad-cli` and fails rather than skips | **CONFIRMED** (`requireKicadCli()` at :46-49, `KICAD_CLI` from `lib/kicad/netlist.ts`) - so **KiCad has already read a generator-emitted `(no_connect)`**, from an IR-level `{ nc: true }` |

### FINDING C1 (**Important**) - "no module under `lib/schgen/` has zero line coverage" is false, and it is now in the approved spec

**CONFIRMED.** bun's lcov **omits a module that was never loaded** rather than
listing it at `LH:0`. The tree holds **105** `.ts` files under `lib/schgen/`; the
full-suite lcov carries **102** `SF:` records. The three absent ones are:

- `lib/schgen/ir/validate-rule.ts` - 0 runtime exports (type-only), benign;
- `lib/schgen/render/sheet-types.ts` - 0 runtime exports (type-only), benign;
- **`lib/schgen/gates/oscar/boundary.ts` - exports a runtime function `oscarParts()` at line 112 and is never loaded by any test.**

So a module with genuinely zero coverage exists, and the method used cannot see it:
scanning `LH:` over the records lcov happens to contain is false-greens **#26** (*a
completeness claim computed over a subset of what it licenses*).

**What makes this more than pedantry: the entry cites the document that says so.**
`G278` clause 6 quotes `lib/schgen/README.md:409` - *"the five modules nothing ran
... are now two"* - and that paragraph **names the two**: `gates/pin-table.ts`
**and `gates/oscar/boundary.ts`**. Clause 6 then reports that `pin-table.ts` is now
covered and draws the conclusion that **no** module has zero coverage, silently
dropping the other of the two. The supportable conclusion was *"the two are now
one"*.

The same sentence was carried into the **approved spec** by commit `1c0ade7`:
*"**no module under `lib/schgen/` has zero coverage.**"* That is the half that
matters, because a spec correction outlives a report.

*Failure scenario:* a successor reads the spec or `G278` clause 4, concludes nothing
under `lib/schgen/` is unexercised, and skips writing the first test that would ever
load `gates/oscar/boundary.ts` - whose only runtime export currently throws.

*Mitigating:* `boundary.ts` is a deliberate forward-declaration stub whose
`oscarParts` throws by design, recorded in `G242` item three and in
`port-fidelity.test.ts:269-272`, and `design.ts` imports only its *type*. So the
practical exposure is nil; the defect is in the **claim**, not the code. **Nothing
about `emit-items.ts` - which is what the spec sentence was actually about - is
affected: that overturning is solid.**

### FINDING C2 (**Important**) - the stated caveat does not do the work it is credited with

The implementer recorded, correctly, that bun 1.3.8's `DA:` counts are not
execution counts, and said *"only the zero / non-zero distinction was relied on."*

**I CONFIRMED the caveat, and then CONFIRMED that the rescue it proposes does not
hold.**

- The counts are **identical** in a one-file and a 354-file run - `DA:215,19`
  `DA:216,43` `DA:217,60` both times, and the same three numbers again from
  `emit-byte-stable.test.ts`. So they are static, exactly as reported.
- **But `DA:217` reports `1` in every run where `noConnect()` was never called**
  (`emit.test.ts`, `emit-refusals.test.ts`, `emit-power-refs.test.ts`,
  `pin-marks.test.ts` all give `DA:215,0 DA:216,0 DA:217,1`). Line 217 is
  `noConnect()`'s only working line - `return { key, node: list("no_connect",
  at2(p), uuid(key)) };`.

So under the implementer's own stated rule, line 217 reads as **covered in a run
where the function did not execute**. `LH=137` therefore cannot be read as *"every
line of `emit-items.ts` executed"*; it is inflated by at least this mechanism. This
is false-greens **#11** (*a check that fires through a different path than the one
it documents*) and **#27** (*a guard credited with reach it does not have*).

*Failure scenario:* a successor accepts `LH == LF` as proof that a module is fully
exercised, deletes a test that was the sole caller of some function, and the figure
does not move.

*Two things keep this from being Critical, and both are the implementer's own
doing.* First, their per-file classification evidently read the declaration line
(`DA:215`), which **does** go to 0 correctly - which is why all five of my
spot-checks agreed with their 6-of-17 split. Second, `G278`'s **CRITERION for
clause 4** already names the right settlement: *"the marker count is the
settlement, because it does not depend on bun's instrumentation."* That is exactly
right, and I confirmed the marker count in the bytes. **The entry's criterion is
sound even though one supporting sentence overstates its evidence.**

### FINDING C3 (**Minor**) - the coverage figure is not gated, and that is correctly left open

`G278` records the gating question as **MECHANISM, UNTRIED**, with the reasoning
that whether coverage should gate is an acceptance criterion and `CLAUDE.md`
reserves those away from the producing agent. **CONFIRMED present and correctly
framed.** Given C2, any such gate should be written against the marker count, not
against `LH`.

**C. VERDICT: the measurement's load-bearing leg (the byte-level marker count) is
CONFIRMED and genuinely overturns the spec's `emit-items.ts` sentence. Two
generalisations built on the instrumentation overreach, one of them now in the
spec.**

---

## D. THE `Fix:BIG8` EXEMPTION

### The four teeth

**CONFIRMED they apply to it.** `tests/kicad/symbol-names.test.ts:290-319` loops
over every `NOT_A_KICAD_SYMBOL` entry and asserts four times per entry:
`resolutionOnDisk(libId) === failure`; `reason.length > 60`; `sites.length > 0`;
and every site under `EXEMPT_SITE_PREFIX` (`"tests/schgen/"`, line 264). Plus a
bidirectional parity check outside the loop that the sweep still finds every
exemption.

**CONFIRMED by perturbation, not by reading alone.** I renamed the key to
`Fix:BIG8_REVIEW_PROBE_DISABLED` and the file went **2 fail**: the sweep reported
`Fix:BIG8` as a symbol in no installed library, and the parity check reported the
renamed key as *"an exemption the sweep no longer finds is stale"*. The entry is
load-bearing in both directions.

**CONFIRMED on disk:** `Fix.kicad_sym:121` is
`(pin no_connect line (at 10.16 2.54 180) ... (name "NC") ... (number "7"))`.
Pre-existing - the diff does not touch the fixture library. `resolutionOnDisk`
returns `"no-such-library"` because no `KICAD_SYMBOLS` root holds `Fix.kicad_sym`,
exactly as recorded.

**Arithmetic CONFIRMED:** the teeth test alone reports **34** `expect()` calls, and
`2 + 4 x 8 entries = 34`. So one added entry contributes **exactly +4**.

### FINDING D1 (**Important**) - the recorded *reason* for the exemption rests on a search that was never run

The entry's reason says:

> *"no symbol in any installed KiCad library **was verified** to have one, and
> CLAUDE.md forbids writing a symbol name from memory to find out."*

**CONFIRMED false in substance.** I grepped the installed root
(`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`, 223 libraries):
**4513 `(pin no_connect` declarations**, in `Audio.kicad_sym` (122),
`Amplifier_Operational.kicad_sym` (118), `Amplifier_Audio.kicad_sym` (90) and 100+
others. A concrete instance is **`Amplifier_Operational:AD8015`**.

This is false-greens **#22** (*a negative produced by a capped, narrowed or
mis-counted search*) and **#29** (*a claim about one's own drive or search that was
never performed*). The clause is carefully worded enough to be literally true - it
says *"was verified"* - but it reads as *"none is known to exist"*, and the
`CLAUDE.md` citation inverts the rule it invokes: that rule is **"Verify names
against the thing itself - the libraries are on disk"**, i.e. a mandate to run the
check, not a licence to skip it. The check is one command, and this very test file
already resolves `SYMBOL_LIBRARY_ROOT`.

*Failure scenario:* a successor needing a `no_connect`-typed library pin reads this
reason, believes the stock set has none, and adds a second fixture exemption instead
of using a real symbol.

**The decision itself is defensible and I am not asking for it to change.** The
test resolves symbols through `fixtureResolver()` (`fixture-lib.ts:16-23`), which is
bound to the two hand-written fixture libraries; using a stock name would mean
pointing a resolver at the installed root and making a hermetic unit test depend on
an env-overridable KiCad install. **That is the real reason, and it is a good one -
it is just not the reason recorded.** The fix is a sentence, not a refactor.

### FINDING D2 (**Minor**) - "the only verified one in the tree" is off by one

`Fix.kicad_sym` holds **two** `no_connect` pins: `BIG8` pin 7 **and `BIG8C` pin 7**
(line 135). In-tree it is otherwise accurate - of the three committed `.kicad_sym`
files, only `Fix.kicad_sym` has any (`Pwr.kicad_sym` 0, `power.kicad_sym` 0).
Immaterial to the test; `G278` clause 8 and the report both say "the only".

**D. VERDICT: the exemption is correct, minimal, and genuinely held to the four
teeth - which I drove to red. Its recorded justification is wrong and should be
reworded.**

---

## THE THREE CONTROLLER CORRECTIONS - confirmed, not re-litigated

Two documents now rest on these, so I checked each is right.

1. **`from-network.ts:468` is `orientationsOfParts`' orientation map.** **CONFIRMED.**
   Lines 462-472 build `pinNets` and pass it to `preferredOrientation`; nothing
   there touches `IrPin`. The IR's `null` comes from `connectedNet` at
   `ir/types.ts:62` (**CONFIRMED verbatim**: `return "net" in c ? c.net : null;`),
   reached from `ir/build.ts:46-47` (line 46 is the loop head; the
   `connectedNet(conn)` call is on 47 - a one-line-off citation, no consequence).
   M5 proves the real path empirically. The correction is right.
2. **Five test files import `NC`.** **CONFIRMED at HEAD**: `tests/kicad/schematic.test.ts`,
   `tests/model/builder.test.ts`, `tests/model/include.test.ts`,
   `tests/model/validate.test.ts`, `tests/schgen/ir/nc-end-to-end.test.ts`. The
   report's and `G278`'s "four" is the pre-task count and was right then; the
   spec's "five" is right now. And "no *circuit* imports it" **CONFIRMED** - the
   only hit under `circuits/` is `opamp-buffer.ts:64`, a comment stating the
   absence. **Sub-finding (Minor):** `G278` clause 3's CRITERION says the grep
   *"names the four importers"*; it now names five, because of the file `G278`
   itself documents. Mild false-greens #23. One word.
3. **`README.md:303`'s camelCase names are upstream filenames.** **CONFIRMED.** The
   paragraph is about *"Task 7 ported ... four of the waiting tests"*, and all four
   exist upstream in camelCase - I listed
   `/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen/render/`
   (read-only) and found `bodyClearance.test.ts`, `textClearance.test.ts`,
   `unitText.test.ts`, `noConnectEnds.test.ts`. The earlier "stale and a separate
   small defect" claim was indeed itself wrong, and retracting it was right.

---

## ALSO VERIFIED

| Item | Verdict |
| --- | --- |
| **Suite** | **CONFIRMED.** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test` -> **3822 pass / 0 fail / 43622 `expect()` across 354 files**, 148.45 s. Every term matches the report exactly |
| **`expect()` accounting, term by term** | **CONFIRMED.** New file alone: **10 pass / 16 `expect()` / 1 file** (I ran it). Teeth test alone: **34 `expect()`** = `2 + 4 x 8`, so the one new entry is **+4**. `16 + 4 = 20 = 43622 - 43602`; `3812 + 10 = 3822`; `353 + 1 = 354`. The baseline `3812/0/43602/353` is **RELAYING** - independently confirmed by the Task 1 review at `15696e0`, not re-run here |
| **Nothing under `lib/` changed** | **CONFIRMED** from the diff: the four files are `docs/known-gaps.md`, `tests/kicad/symbol-names.test.ts`, `tests/schgen/ir/nc-end-to-end.test.ts`, `tools/schgen/port-manifest.json` (plus the controller's two documents in `1c0ade7`) |
| **`NC` not authored in any circuit** | **CONFIRMED** - Tasks 4/5 scope untouched |
| **`bun run typecheck`** | **CONFIRMED clean**, `tsc --noEmit`, no output, exit 0 |
| **`make check`** | **Not run.** Pre-existing RED on four boards (`G251`), not this task's. The report's reasoning - `make check` is `typecheck` plus three board-agreement targets, none of which this change touches - is sound |
| **Port manifest** | **CONFIRMED.** One line, `handWritten`, alphabetically placed. `port-fidelity.test.ts`'s completeness check passes in the full run |
| **No AI attribution** | **CONFIRMED.** `git log 15696e0..1c0ade7` contains no `Co-Authored-By`, no `Claude-Session`, no generated-with footer, no session link |
| **No stray control byte** | **CONFIRMED by counting bytes, not by reading.** `tr -d` of all printable + `\t\n\r` over `docs/known-gaps.md`, the spec, the plan, the task-2 report, the new test file, `symbol-names.test.ts` and `port-manifest.json`: **0 in every one**. `file` reports `docs/known-gaps.md` as UTF-8 text (1,800,813 bytes), and **`grep` finds `G278` as text**. Task 1's NUL has not recurred |
| **`docs/known-gaps.md` size** | 1.8 MB, as the report's concern 3 says. Flagged there, unmanaged - correctly out of this task's scope |

### `G278`'s nine clauses

**CONFIRMED present and well-formed.** Nine numbered clauses, a `WHAT THIS DOES NOT
ESTABLISH` section, and per-clause `CRITERION` lines with the one `MECHANISM`
explicitly marked `UNTRIED`. The header states *"Everything below was **confirmed by
the writer** by running it, not relayed"*, satisfying the confirmed/relaying
requirement. `[RAN]` and `[READ]` tags distinguish the evidence kinds.

**Clause 7's three fixture-construction refusals are real** - I checked each against
code that could have contradicted it:

1. `authoring.ts:333` - `portDirections names net "${net}", which no pin of this network is on`. **CONFIRMED.**
2. `bus.ts:148` - `bus block ${id} must hold exactly one unit (holds ${g.units.length})`. **CONFIRMED.** *(Minor: `G278` quotes it as `"bus block B must ..."` while the report quotes `"bus block PROBE must ..."`; the fixture's block is `PROBE`, so `G278`'s verbatim quote has a substituted block id. `CLAUDE.md`'s "transcription is evidence, not memory" bites here, weakly.)*
3. `fmtMm` writes `48.26`, not `48.260`. **CONFIRMED** - my own probe printed `"48.26"`.

### The three reservations - all intact, none quietly relaxed

**CONFIRMED all three.**

1. **§3b's required gate is not discharged.** `G278`'s `WHAT THIS DOES NOT
   ESTABLISH` says so plainly - no `kicad-cli` ran on a sheet whose `no_connect`
   came from a **model** `NC`; the existing proof is the `mini` design's IR-level
   `{ nc: true }`. I independently confirmed that the `mini` `nc` pins are authored
   at the IR level (`designs/mini/index.ts:32,86`), so the distinction is real and
   the gate genuinely remains Task 5's. The `CRITERION` for that section names the
   gate correctly.
2. **A green path is not permission to batch the five Pultec pins.** Stated verbatim
   in `G278` and in report concern 2, with the `MP`-versus-`12` tell preserved.
3. **Coverage gating is an untried mechanism.** `G278` marks it `MECHANISM, UNTRIED`
   with the `CLAUDE.md` reasoning. See C3.

---

## FINDINGS, GRADED

### Critical

**None.**

### Important

| # | Finding | One-line failure scenario |
| --- | --- | --- |
| **C1** | *"No module under `lib/schgen/` has zero line coverage"* is false and is now in the approved spec: bun's lcov **omits** unloaded modules (102 records for 105 files), and `lib/schgen/gates/oscar/boundary.ts` has a runtime export and is never loaded - the very module `README.md:409`, quoted by the same entry, names as one of the two that nothing runs | A successor trusts the spec, concludes nothing under `lib/schgen/` is unexercised, and never writes the first test that loads `boundary.ts` - whose only runtime export throws |
| **C2** | The caveat *"only the zero / non-zero distinction was relied on"* does not protect the reading: `DA:217` - `noConnect()`'s only working line - reports `1` in four separate runs where the function was never called, so `LH=137` cannot mean "every line executed" | A successor treats `LH == LF` as proof of full exercise, deletes the sole caller of some function, and the figure does not move |
| **D1** | The `Fix:BIG8` exemption's recorded reason - *"no symbol in any installed KiCad library was verified to have one, and CLAUDE.md forbids writing a symbol name from memory to find out"* - rests on a search never run: **4513** `(pin no_connect` declarations exist across 223 installed libraries (e.g. `Amplifier_Operational:AD8015`), and `CLAUDE.md`'s rule mandates the disk check rather than excusing it | A successor needing a `no_connect`-typed library pin believes the stock set has none and adds a second fixture exemption instead of using a real symbol |

**All three are documentation defects. None affects outcome 1, the four states, or
any code.** C1's wording is the one to fix first, because it sits in the spec.

### Minor

| # | Finding | One-line failure scenario |
| --- | --- | --- |
| M1 | `G278` clause 3's CRITERION says the grep *"names the four importers"*; at HEAD it names five, the fifth being the file `G278` documents | A successor runs the criterion, counts five, and suspects the entry has drifted |
| M2 | `G278` clause 7 quotes the bus refusal as `"bus block B must ..."` where the fixture's block is `PROBE` | A successor greps the verbatim string and finds nothing |
| M3 | "`Fix:BIG8` is the only verified one in the tree" - `Fix.kicad_sym` also types `BIG8C` pin 7 `no_connect` | None; cosmetic |
| M4 | The `(at x y)` assertion formats both sides from the same layout value, so it tests emitter fidelity rather than pin position. The test name is honest, and I confirmed the position independently - but a successor could read more into it | A successor assumes the pin-end position is pinned by a test when only emitter fidelity is |

### Recommendations (non-blocking)

1. Replace the spec's and `G278` clause 4's *"no module under `lib/schgen/` has
   zero coverage"* with what the evidence supports: *"`emit-items.ts` is fully
   covered; of the two modules `README.md:409` names as unrun, `gates/pin-table.ts`
   now runs and `gates/oscar/boundary.ts` still does not - and bun's lcov cannot
   express this, because it omits a module nothing loads."*
2. Add to the `DA:` caveat that **non-zero is also unreliable** (`DA:217` is the
   instance), so the marker count is not merely the better settlement but the only
   one. `G278`'s CRITERION already says this; the supporting prose should not
   contradict it.
3. Reword the `Fix:BIG8` reason to the true one: `fixtureResolver()` is bound to
   the fixture libraries, and a hermetic test should not depend on an
   env-overridable KiCad install. Drop the "none was verified to exist" clause.
4. If coverage is ever gated, gate the `mini` marker count, not `LH`.

---

## REVIEWER HYGIENE

- **Perturbed and restored:** `lib/schgen/render/unit-pins.ts`,
  `lib/schgen/ir/validate.ts`, `lib/schgen/ir/validate-nets.ts` (twice),
  `lib/schgen/ir/types.ts`, `tests/schgen/ir/nc-end-to-end.test.ts`,
  `tests/kicad/symbol-names.test.ts`. All via the Edit tool; no `sed -i`, no sed
  `w`/`e`.
- **Restoration verified:** `shasum -a 256 -c` **OK** on all four baselined files;
  `git diff --stat HEAD -- lib/` empty; **`git status --porcelain` empty**; HEAD
  still `1c0ade7`.
- **Nothing committed, nothing fixed, no subagents dispatched.** The sibling repo
  was read only (one `ls`). All scratch work in the session scratchpad.
