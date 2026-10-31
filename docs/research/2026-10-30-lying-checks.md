# The checks that reported confident wrong numbers, and what they report now

2026-10-30. Six committed measurement scripts under `docs/research/2026-10-29-*/scripts/`
each produced a figure that was read, trusted and reported to the owner. Four
runs found them; no review did. This is what each one did, what it does now, the
control that proves the instrument moves, and - separately and first, because it
is the part that matters - every previously-published figure that changes.

**Nothing in `drafted/` or `circuits/` was touched, and the seven committed
sheets are byte-identical.** Their sha256s were taken before and after and
checked against all seven recorded in `docs/schematic/verdicts.md`; all seven
match. No drawing was rendered and no drawing is evaluated here.

---

## 1. EVERY PREVIOUSLY-PUBLISHED FIGURE THAT CHANGES

Read this section first. Where a figure was already flagged as wrong in the run
that published it, that is said, because a figure the owner was warned about is
a different thing from one he was not.

### 1.1 `pultec-mid`, approved — the Mid group's graphics margins were published as **exact** and three of the four are wrong

`docs/research/2026-10-29-mid-full-run.md` §9.9: *"Its graphics margins
(19.05 / 7.62 / 8.89 / 8.89) are exact."*

| | left | right | top | bottom |
| --- | --- | --- | --- | --- |
| published as exact | 19.05 | **7.62** | **8.89** | **8.89** |
| measured now | 19.05 | **6.60** | **7.62** | **7.62** |

The cause is **not** the text approximation that section was about. `boxgeom.py`
matched `(rectangle (start …) (end …))` only when written on ONE line, which is
how the sheet-level group boxes are written and **not** how a symbol's body is
written inside `lib_symbols`. It matched 6 of the 14 `(rectangle` tokens on
`pultec-hi-cut`; the 8 it dropped are every symbol body. **No symbol body had
ever entered a margin**, so every margin was reported looser than it draws
wherever a body was the extreme item.

### 1.2 `pultec-hi-cut`, approved — Lo boost's bottom margin was 0.00 mm and is 2.54 mm

`docs/research/2026-10-29-hi-cut-full-run.md` §9.7 **already flagged this one**:
*"reports a bottom margin of 0.00 mm for Lo boost where the render shows 2.5 mm
of unoccupied space."* It is now measured at **2.54 mm**, which agrees with the
2.5 mm read off the render. The same section's hand-checked Hi cut margins
(6.35 / 17.78 / 7.62 / 8.89) are **unchanged to the micrometre.**

The cause was diagnosed, not guessed: `boxgeom.py` found a `lib_symbols` entry's
end by searching for the next `^\t\t(symbol "` and, when there was none, **ran to
the end of the file.** The last entry on `hi-cut-hybrid.kicad_sch` is
`Switch:SW_Rotary_1x6_MP`, so its "library geometry" was every coordinate on the
page: **45,191 characters where the entry is 7,352**, a symbol-space reach of
**254 mm where the symbol reaches 8.89 mm**, and **26 points wrongly attributed to
SW1 inside the Lo boost rectangle alone.** That is also why it named `SW1` as the
extreme item in three rectangles SW1 is 50 mm away from.

### 1.3 Every other `boxgeom.py` margin row that moves

Nine of twelve rows on `pultec-hi-cut`, ten of twelve on `pultec-mid`, eight of
twelve on the hairpin page. Most deltas are 1.02 or 1.27 mm — a `Device:R` body
half-width (1.016 mm) or a `Conn_01x05` body half-height — in the direction that
made a page look **looser** than it draws. The full table is reproducible:

```
python3 docs/research/2026-10-29-mid-full-run/scripts/boxgeom.py <sheet> --estimate-text
```

**Two rows do NOT move, and that is the evidence the repair is a repair:** the
hi-cut run's hand-verified Hi cut margins, and the hairpin-fix run's
load-bearing **5.08 mm** and **3.43 mm** for the Mid group, which is the
measurement that justified not moving the Lo boost group rectangle
(`2026-10-29-hi-boost-hairpin-fix.md`, *"Why the group rectangle did not have to
change"*). That argument still stands on the same two numbers.

### 1.4 `pultec-mid`, approved — the 1.90 mm and 0.64 mm keep their values and lose their status

`docs/research/2026-10-29-mid-full-run.md` §9.9 called these *"the tightest on the
page"*. Their **values do not change**. What changes is that they are no longer
printed as measurements: the text columns are now opt in behind
`--estimate-text` and every number in them carries a leading `~`.

`0.75 * size * len(text)` gives 5.715 mm for six characters at size 1.27 where
`textwidth.py` **measured** 6.223 to 6.858 mm of ink — `2200pF` draws 6.858 mm and
`.047uF` 6.223 mm at the same six characters, because the leading `.` is a narrow
glyph. So a text margin from the estimator reads up to **0.57 mm looser** than it
draws. To measure one, render and use `textwidth.py`.

### 1.5 `pultec-low-boost`, approved — 24 symbols and 56 pin instances, where the page has 25 and 57

**This is the one nobody had found, and it is on an approved page.** `#PWR010`, a
`copperhead_power:GND`, is written **on one line** on `hybrid-pass-1.kicad_sch` —
akcli wrote it. Every symbol-instance pattern in the research scripts required a
newline and two tabs between an instance's `(lib_id …)` and its `(at …)`, so
every one of them missed it.

| figure | published / as measured by the committed script | now |
| --- | --- | --- |
| symbols placed | 24 | **25** |
| symbol pin instances | 56 | **57** |
| lib-resolved pin points | 51 | **57** |

The consequence is worse than the count: **a ground pin was absent from the pin
set the orphan-junction test uses.** It did not change the orphan verdict on that
page (still 0), but the check was running without one of the page's grounds.

### 1.6 `verify.py`'s lib-resolved pin points on every page

The newline-only library-pin pattern, fixed by the mid run in its own copy only:

| sheet | published | now |
| --- | --- | --- |
| `hybrid-pass-1` (low-boost) | 51 | 57 |
| `low-cut-hybrid` | 53 | 58 |
| `low-cut-collapsed` | 53 | 58 |
| `hi-boost-hybrid` | 68 | 73 |
| `hi-boost-hairpin-fixed` | 68 | 73 |
| `hi-cut-hybrid` | 55 | 60 |
| `mid-hybrid` | 97 | 102 |

The hairpin-fix run **recorded this gap and declined to fix it**: *"resolves 68 of
the sheet's 73 pin instances; the five it misses are the hidden single-line pins
of the four `GND` symbols and the `PWR_FLAG` … Not fixed, because it is the
committed instrument the last run's numbers were taken with."* It is 73 of 73 now.

### 1.7 `pultec-mid` — one false orphan junction and one missed pin-on-a-wire-interior

With the two copies of `junction_audit.py` that still had the newline-only pin
pattern (hi-cut's and hi-boost's — the ones `TOOLING.md` pointed at):

| figure | broken copy | repaired |
| --- | --- | --- |
| orphan junctions | **1**, at (384.81, 130.81) | **0** |
| pins on a wire interior | 6 | **7** |

Both are the same `#PWR07` ground pin. The mid run caught this in its own copy
and published the corrected 0; the figure above is what the copies the next run
would have inherited reported.

### 1.8 `pwr_survey.py` on `pultec-mid` — *"NO WIRE touches this anchor"* for a connected pin

`docs/research/2026-10-29-mid-full-run.md` §9.8 **already flagged this one.**
`#PWR07`'s pin at (384.81, 130.81) sits in the middle of the 15.24 mm link it
terminates. The repaired script reports:

```
pin (384.81, 130.81) power_in: 1 wire(s) touch it - 0 end here, 1 pass through (with a dot)
    (377.19, 130.81) -> (392.43, 130.81)  len   15.24  PASSES THROUGH the pin
```

### 1.9 What does NOT change, checked rather than assumed

- **Orphan junctions on all seven committed sheets: 0, by the repaired check.**
  0 is what was published. **No approved page's orphan count was wrong.**
- **Wire-to-wire tees without a dot: 0 on all seven.** Pins on a wire interior
  without a dot: 0 on all seven.
- **True crossings and T-meetings: identical on all seven**, before and after.
- Wire counts, total and longest wire length, net sets, ERC counts, band
  occupancy, duplicate-label counts, group-rectangle counts, sha256: identical.
- The low-boost run's own three sheets: `crossings.py` and `measure.py` produce
  **numerically identical** output.

---

## 2. THE SIX, ONE BY ONE

### 2.1 The two-pin-form blind spot — fixed, and the fix now actually propagates

**What it did.** A sheet holds library pins in two textual forms: KiCad writes a
standard-library pin over two lines; copperhead writes its own two embedded power
symbols on ONE — `(pin power_in line (at 0 0 270) (length 0) hide`. Both
`junction_audit.py` and `verify.py` matched a pattern requiring the newline, so
they resolved **0 of `pultec-mid`'s 5 power pins** and reported a **false orphan
junction** at the shared ground symbol.

**What was actually on disk.** The mid run fixed it in **its own two copies** and
left **two of the three copies of `junction_audit.py`** broken — and `TOOLING.md`
trap 6 then named one of the two broken copies as *"the script to trust"*. The
superseded `orphan_junctions.py` was still beside them.

**What it does now.** All three copies of `junction_audit.py`, all three of
`verify.py`, and all three of `boxgeom.py` (which had the same pattern) read
through `docs/research/lib/kicad_sheet.py`.

**The control.** `D1 two pin forms`: the superseded pattern resolves **0**
copperhead power pins on `pultec-mid`, the reader **2** library entries covering
all 5 placed pins — the number moves. Then the converse half: every pin in the
file is rewritten into the OTHER textual form and the reader reports the **same
32** library pins, so it is form-independent rather than merely fixed for one
form. `D1 pin guard fires`: a `(pin` token the tree cannot account for makes the
reader **refuse**, not return a short list.

### 2.2 `orphan_junctions.py` — DELETED

**What it did.** Counted wire endpoints only, so a rail passing through a symbol
pin looked like an orphan: **6 orphans on a page with none.** Re-measured today
it claims 6 on `hi-boost-hybrid`, 6 on `hi-boost-hairpin-fixed`, 4 on
`hi-cut-hybrid` and 7 on `mid-hybrid` — **23 false orphans across four approved
pages.**

**What it does now.** Nothing. Both copies are deleted. *Supersede means delete.*
`TOOLING.md`'s measurement table, which still named it as the tool for orphan
counts, now names `junction_audit.py`; its trap 6 says the script is deleted
rather than merely wrong.

**The control.** `D2 orphan-junction count moves`: one junction dot added at
(10, 10), a point verified to be on no wire and at no pin, takes the count from
**0 to 1**. The perturbation is the same kind of object the check counts.

### 2.3 The wire regex that reads past the stroke — found in three more places, all fixed

**What it did.** A pattern of the shape `\(wire … \(stroke \(width W\)…\)` matched
only the wires with no `(color …)` member: **54 of 77 on `pultec-hi-cut`**, and the
23 it dropped were every grey ground wire, **including all six of J2's ground
stubs**. It printed 54 and said nothing.

**What was still on disk today.** The original was fixed, but three parsers of the
same class survived:

- **`crossings.py` and `measure.py` in the low-boost run** used a pattern with a
  LITERAL SPACE after `(wire`, matching only the one-line form. Measured on the
  committed sheets it finds **7 of 78** wires on the approved low-boost page,
  **25 of 46** on `pultec-hi-cut` and **64 of 82** on `pultec-mid`, and reports the
  short number as the answer. It was complete on that run's own three sheets,
  which are one-line throughout — **luck, not a property of the check**, and the
  reason nothing caught it while the file was copied forward. `measure.py`'s
  symbol pattern made the opposite assumption, requiring
  `(symbol (lib_id …)` on one line, so on a block-form sheet it would find **no
  symbols at all** and compute its proximity median over an empty list.
- **`colour_check.py`** ran from the `(pts` INTO the stroke, requiring
  `(stroke (width W) (type default)` with those members in that order. It then
  printed `wires parsed: N (file has M)` and **carried on clustering the N**.
  **Two numbers side by side is not a refusal.**
- **`wire_uuid.py`** ran past the stroke to the `(uuid` — and its whole job is to
  hand uuids to a repair pass, so a missing line is a wire the repair cannot
  reach.

**What they do now.** All read through the shared reader, which refuses when its
parse does not account for every `(wire` token. `wire_uuid.py` additionally
refuses on a wire with no uuid rather than printing a blank.

**The control.** `D3 every wire is parsed in both textual forms`: on `pultec-mid`
the superseded literal-space pattern reports **64 of 82**, and **82 of 82** once
the form is flattened — the old instrument moves with the form. The reader
reports 82 either way **and returns the identical wire set**. `D3 wire guard
fires`: a `(wire` token the tree cannot account for makes it refuse.

### 2.4 `boxgeom.py` — two bugs, one of them never found

Covered by §1.1 to §1.4. The second bug — the one-line-only rectangle pattern
that removed every symbol body from every margin — had not been diagnosed by any
run.

**The controls.** `D4 the last lib_symbols entry does not absorb the sheet`:
reproducing the superseded span attributes **26** points to SW1 inside the Lo
boost rectangle against **0** by the parse. `D4 every named extreme item is inside
the rectangle it is named for`: **2,362** attributed points across seven sheets,
**0** stray; reproducing the superseded span moves the rotary switch's reach from
**8.89 mm to 254 mm**. `D4 a group margin responds`: moving SW1 5.00 mm north
moves the Hi cut bottom margin by 1.27 mm, and the control checks SW1's own `(at`
is within 400 characters of its own `(lib_id` **before** editing it, so it cannot
perturb something else and report success.

### 2.5 `pwr_survey.py` — the endpoint-only blind spot again

**What it did.** Tested wire endpoints only and said *"NO WIRE touches this
anchor"* for a pin on a wire's interior (§1.8). It also tested the symbol's
**anchor** rather than its **pin**; for copperhead's power symbols those coincide,
because the pin is at `(at 0 0 …)` with `(length 0)`, so the two bugs were
indistinguishable on the only symbols it looks at.

**What it does now.** Resolves the pin through the library, marks it when it is
offset from the anchor, and reports per pin how many wires **end** there and how
many **pass through**, with whether the point carries a dot. It says nothing
touches a pin only when the point is on no wire at all. It refuses rather than
reporting an empty survey when a power symbol has no library pin.

**The control.** `D2/D5 a pin on a wire INTERIOR is seen`: a pin with
`through=1, endpoints=0` is found and the wire **it sits on** is shortened so the
pin leaves it — the count moves **1 to 0**. The superseded endpoint-only test
reports 0 both ways, which is why it could not fail.

### 2.6 `dump_sheet.py` — it now reads both forms rather than being documented as half a tool

**What it did.** Parsed wires by copperhead's block form only. On the finished mid
page — **18 block-form against 64 one-line** — it exited with *"parsed 18 wire
blocks but the file holds 82 '(wire' tokens"*. **That refusal was correct** and is
why nothing downstream believed 18.

**Why documenting it was not enough.** Nothing said it was a before-side-only
tool, and its job is to hand uuids to a repair pass **that runs on the after
side**. A tool that refuses on exactly the input it exists to handle is not
scope-limited; it is broken with good manners.

**What it does now.** Reads both forms, and keeps the token-count refusal, now on
junctions, labels and no-connects as well as wires. 82 wires where it used to
refuse, and it prints the 64/18 split so the two forms are visible.

**The control.** The same `D3` pair as §2.3, plus the smoke run: it is executed on
all ten committed sheets in both forms with no refusal.

### 2.7 Two more found by sweeping for the pattern rather than for the symptom — `pingeom.py` and `label_survey.py`

After the six were fixed, every `.py` under `docs/research/` was swept for a
regex that pins a KiCad element to a textual layout. That found two more
measurers, neither of them suspected by any run.

**`pingeom.py` had all three causes at once, and it is the script `TOOLING.md`
points at as the AUTHORITY on pin positions** — its own docstring says *"`akcli
pins` MIXES UNITS … The sheet's own `lib_symbols` block is the authority, and
this script reads it."* It carried the newline-only pin pattern, the
entry-span search that runs to the end of the file, and the block-form-only
symbol-instance pattern. Pin positions it printed:

| sheet | printed | actual |
| --- | --- | --- |
| `hybrid-pass-1` (low-boost, approved) | 51 | **57** |
| `hi-cut-hybrid` (approved) | 55 | **60** |
| `mid-hybrid` (approved) | 97 | **102** |

It printed a short survey that looked complete, with no row for `#PWR010` at all.

**`label_survey.py` feeds the duplicate-label count that must read zero**, and
both its patterns were layout-pinned: the local-label one required a newline and
a tab before `(label`, and the global-label one required a `(shape …)` member —
in a check whose neighbouring finding (hi-cut §9.2) is *about* akcli writing
global labels differently from copperhead and omitting members copperhead
includes. **Measured on all seven committed sheets both patterns are complete**,
so no duplicate-label figure changes. It was converted anyway: it was one omitted
member away from under-counting the thing it exists to count.

**Both now read through the shared reader.** The sweep that found them is
reproducible as a grep for a literal newline or tab inside a pattern that names a
KiCad element; what it leaves are the output templates in `restyle*.py`,
`collapse_pass.py` and `make_repairs.py`, which legitimately emit text, and the
dead `2026-10-29-trial-microsoft-schgen/` directory.

---

## 3. THE DECISION: ONE SHARED READER, AND THE MEASUREMENT THAT SETTLED IT

The task asked whether the right fix was one shared, tested reader or six
patched scripts, and said to measure rather than assert. **The measurement was
already on disk.**

> The mid run fixed the two-textual-forms bug in its OWN copies of
> `junction_audit.py` and `verify.py` on 2026-10-29, and left **two of the three
> copies of `junction_audit.py` broken**. `TOOLING.md` then named one of the two
> broken copies as the script to trust.

**A patch that did not propagate inside the session that wrote it will not
propagate across sessions.** That is the whole argument, and it is a count rather
than a preference. The script copies on disk were: `pwr_survey.py` ×5,
`dump_region.py` ×5, `colour_check.py` ×5, `crossings.py` ×6, `wires.py` ×4,
`wire_uuid.py` ×3, `metrics.py` ×3, `boxgeom.py` ×3, `junction_audit.py` ×3,
`verify.py` ×3, `dump_sheet.py` ×2.

**`lib/kicad/sexpr.ts` had already written down the principle, and predicted
exactly these four failures:**

> *Structure is determined by balanced parentheses with string awareness, never
> by indentation: KiCad reformats files freely and has changed its serialization
> between releases, so anything pattern-matching text layout eventually becomes
> silently wrong.*

Every one of the four is that sentence coming true.

**Why not use that TypeScript reader directly.** The research scripts are Python,
run by hand from a `run.sh`, and reach for `numpy`, `pillow` and `kicad-cli`
alongside the parse. Rewriting them in TypeScript is a larger change than the
defect warrants and would make the run records harder to re-run. So
`docs/research/lib/kicad_sheet.py` is the Python side of the **principle** — a
separate implementation of the same rule, stated as such in its docstring so the
two cannot be mistaken for one. `lib/kicad/sexpr.ts` remains the reader the
generator uses.

**What the shared reader guarantees.** Every accessor counts the `(<head>` tokens
in the source span it reads and **refuses** when the parse does not account for
all of them. The refusal direction is deliberately the safe one: a sheet holding
the literal text `(wire` inside a quoted string would raise rather than
under-report. No sheet here does, and a loud false refusal is what the module is
for. Spans come from the parse, which is what makes the absorption bug of §1.2
impossible rather than merely fixed.

```
python3 docs/research/lib/selftest.py      10 controls, every one moved or fired
```

---

## 4. WHAT WAS NOT DONE

- **No drawing was rendered and none is evaluated.** `EVALUATING-DRAWINGS.md`
  binds; the margins above are geometry read out of a sheet file, not a judgement
  about a page.
- **The text-margin estimator was not replaced by a measurement.** It is now opt
  in, marked `~`, and carries its measured error. A real text margin needs
  `textwidth.py`, which renders at 600 dpi and measures ink, one field at a time
  with a stated crop box. Making `boxgeom.py` do that for every field on every
  page was not attempted.
- **The run reports' §9 prose was not rewritten.** `docs/research/2026-10-29-*.md`
  are the records of what those runs did and measured; editing their numbers
  would destroy the record. The corrections live here and in `TOOLING.md`, which
  is the live instruction. Where a run already flagged a figure as wrong, §1 says
  so.
- **`docs/schematic/verdicts.md` was not touched.** No verdict, sha256 or entry
  was added or altered.
- **The `restyle*.py`, `collapse_pass.py`, `capfields.py`, `make_repairs.py`,
  `netsets.py`, `netcmp.py`, `integrity.py`, `symbols.py`, `project_flags.py`,
  `pixeldiff.py`, `pixelbands.py`, `textwidth.py`, `intent_vs_model.py`,
  `restyle_fields.py`, `move_labels.py`, `pdfcmp.py`, `crop.py`, `draft.py` and
  `groups.py` scripts were not converted.** The layout-pinned-pattern sweep (§2.7)
  clears the ones that parse: what it flags in them are **output templates** —
  f-strings that emit a `(wire` or a `(property` in block form, which is what a
  writer is for — plus `make_repairs.py`, which already carries the block-form
  token-count refusal. **They have not been audited for anything else**, and
  given that four of the six were one bug and FIVE further instances turned up in
  scripts nobody had suspected, **the prior should be that some of these have a
  defect of a different kind.** `netsets.py` and `integrity.py` are the ones to
  look at first: both feed published counts and neither was examined here beyond
  the sweep.
- **The sweep looked for ONE pattern.** It finds a parser pinned to a textual
  layout. It would not find an off-by-one, a wrong tolerance, a wrong rotation
  mapping, or a check whose predicate is vacuous. Three of the six were found by
  a human reading output against a render, and that is still the instrument of
  record.
- **The TypeScript suite and `make check` were not isolated against this work by
  a before/after run, because on this branch they cannot be.** What was
  established instead, as a check that could have failed:
  `grep -rn "docs/research" Makefile package.json tests/ tools/ lib/` returns
  **nothing**, and every file changed here is a `.py` under `docs/research/`,
  `TOOLING.md`, `.gitignore` or this document. No TypeScript, no test, no
  circuit, no board, no sheet. `bun run typecheck` is clean.

  `bun test`: **8 failures, all in `tests/schgen/port-fidelity.test.ts`, all
  `SCHGEN_SOURCE is not set`** — an environment prerequisite that refuses rather
  than skipping, which is what this repository asks for. The suite is not stable
  between runs on this machine: an earlier run in the same session reported 12
  failures including `tests/stripboard/model/` cases that passed on the next run.

  `make check`: **4 boards FAIL — `pt2399-core`, `transistor-preamp-lab`,
  `transistor-preamp-loop`, `transistor-preamp-staged`.** `pt2399-core` fails on
  *"this board's bomConditions CANNOT be declared truthfully, and this refusal is
  deliberate"*, which is commit `5ee62f2`, landed on this branch by a concurrent
  agent while this work was in progress and described by its own message as a
  refusal. The three transistor-preamp boards fail on HC10 reporting NO VERDICT
  with `CUT_STATE UNRESOLVED`. **A baseline run at `7e69627` was attempted in a
  detached worktree and is not comparable**: `make check` needs the VeroRoute
  fork under `.tools/`, which is gitignored and absent from a fresh worktree, so
  that run reported 87 test failures for want of the binary. Re-running the
  baseline properly needs a checkout of the shared tree, which would disturb the
  concurrent agent, so it was not done.
