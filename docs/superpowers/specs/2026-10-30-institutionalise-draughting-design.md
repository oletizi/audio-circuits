Institutionalising the copperhead + akcli practice
==================================================

**Status: design, approved in conversation 2026-10-30. Not yet planned, not yet
implemented.**

---

## Why

The owner, 2026-10-30:

> *"how have we institutionalized the new hybrid copperhead + agent-driven
> refinements process and tooling? Should we create a skill for it?"*

**The honest answer was: it is documented, not institutionalised, and the
difference is that nothing invokes it.** `TOOLING.md` holds the procedure,
`EVALUATING-DRAWINGS.md` the criteria, `docs/schematic/verdicts.md` the record,
and the README points at all three - but an agent follows them only if it
chooses to read them. **The honey pot is the proof that does not hold:**
`CLAUDE.md` has been telling agents that `lib/schgen/` is the schematic
generator for the whole period in which five pages were drawn by something else.

Five approved Pultec pages came out of this loop. It works. Nothing makes it
happen again.

## The three gaps, in dependency order

**1. Neither tool is pinned, and this one could end the practice.** copperhead
0.12.0 at commit `476cc159…` and akcli-kicad 0.22.0 live in an agent session's
scratchpad. `TOOLING.md` records the versions and says plainly that no committed
file installs them and a `git clean -fdx` destroys them. **Five approved pages
depend on tools nothing in this repository can reproduce.** The other two gaps
institutionalise a process whose tools can vanish, so this is first.

**2. The mechanics are rebuilt every run.** Each of the five boards produced its
own `draft.py`, `crop.py`, `run.sh` and verification scripts, copied forward from
the previous run and mutated. **That is how four of them came to be silently
wrong** - a parser handling one of the two textual forms a KiCad sheet uses, a
grey threshold that cannot see an orange group box, a superseded script still
being copied into each new directory for someone to find and trust. Only
`docs/research/lib/kicad_sheet.py` is shared, and it exists because that failure
was finally diagnosed.

**3. Nothing invokes the judgement half.** The loop's steps, the nine repair
classes, the false greens and the ordering rule live in a document an agent must
remember to open.

---

## 1. Pinning: an install script and a lockfile

**Chosen by the owner over vendoring the source and over git submodules.**

A committed script installs copperhead at its pinned commit and akcli at its
pinned version, into a known location; a lockfile records what is pinned; a
verb checks what is installed against the lockfile and **refuses by name** when
they disagree or when a tool is missing. `akcli doctor` already reports on
python, kicad-cli, ngspice, symbols and config, and is the first thing run.

**The refusal is the point.** A procedure that names versions it does not
enforce is a transcription with a date on it - `TOOLING.md` says so about its own
table. The check must be able to fail, and the plan carries a control that makes
it fail.

**Stated risk, not solved:** an install script depends on upstream staying
available. That is the trade accepted in choosing it over vendoring, and it is
recorded rather than discovered later.

## 2. `make draw BOARD=<board>`: the mechanical half

One verb that does what five run directories each re-implemented: resolve the
tools, build or take the intent, verify the intent against the model, draft,
render, run the measurement suite, write the crops.

**What it is NOT:** it does not decide an arrangement, it does not judge a page,
and **it does not withhold one.** `EVALUATING-DRAWINGS.md` §3 permits exactly one
ground for withholding a drawing - an electrical fault - and the layout gate
removed on 2026-10-30 is why that sentence needs repeating here.

**The measurement suite is promoted, not copied.** The scripts that survived
scrutiny - `kicad_sheet.py` and its `selftest.py`, `junction_audit.py`,
`netcmp`, the crossing and label surveys, `framegeom.py`, the centring script -
move to one committed home with their controls, and the per-run directories stop
carrying mutating copies. **`orphan_junctions.py` is already deleted and does not
return.**

**Every check keeps a positive control, and the suite's own selftest runs
first.** The shared reader's does today: ten controls, every one moved or fired.

## 3. The skill: the judgement half

A skill in the repository, invoked when the task is drawing or revising a
schematic. It carries:

- the loop's steps, and that a repair of an existing page **skips the draft step**
- the trap index: `--apply` is not optional and its absence is silent; `akcli
  pins` mixes units; a field renders horizontally when `(rotation + angle) mod
  180 == 0`; a global label's tag is a shape KiCad draws the wire through; a
  sheet holds wires, symbols and pins in **two textual forms**
- the false greens: `kicad-cli sch export netlist` exits 0 on a paren-broken
  sheet; Chrome exits 0 when it prints nothing; `qpdf` exits 3 on success with
  warnings; `akcli check --layout` has been wrong in **both** directions
- the verification table
- **the ordering rule: renders go out to the reviewer before any summary**, and
  an agent that cannot send files lists its render paths at the top of its
  hand-back
- **a pointer to `EVALUATING-DRAWINGS.md` for the criteria, which the skill must
  not restate and must never author**

**The skill is instructions, not criteria.** `CLAUDE.md`: an agent may never
author the acceptance criteria for the artifact it is producing. The skill says
how to draw and what to watch for; what makes a drawing acceptable stays where
the owner put it.

**Kept thin deliberately.** A heavier mechanism for a related problem - a ledger,
a per-run exemption manifest, a refusing verb, a `make check` arm - was designed
on 2026-10-30 and he struck it: *"this is too heavyweight."* `TOOLING.md` remains
the reference; the skill is the invocation.

---

## Decisions

| Decision | Who | Why |
| --- | --- | --- |
| Institutionalise as a skill plus a make target plus pinned tooling | owner | *"Should we create a skill for it?"*, then *"a skill, make target, etc."* |
| Pin with an install script and lockfile, not vendoring or submodules | owner | answered *"install script"* |
| Pinning goes first | this writer, approved | the other two build on tools that can vanish |
| The make target does the mechanics; the skill carries the judgement | this writer, approved | the mechanics are what got silently wrong five times; the judgement is what gets forgotten |
| The skill points at `EVALUATING-DRAWINGS.md` and never restates the criteria | `CLAUDE.md` | an agent may not author the bar its own artifact is measured against |
| Keep it thin | owner | *"this is too heavyweight"*, on the ledger-and-gate design |

## What this leaves open

- **Whether `make draw` builds the intent or takes one.** No committed tool
  derives a copperhead intent from a `Network`; every board's intent has been
  hand-built and then verified against the model. Automating that derivation is
  glue rather than an algorithm - it computes no coordinate - but it is a
  separate piece of work and is **not** in this design.
- **Arrangement choice has no stated method.** Which parts share a group, in what
  order, and which of several drafts to take, decided the width of every page
  drawn so far. The skill records that the choice exists and must be written
  down; it does not supply a rule, because nobody has one.
- **The upstream-availability risk** of an install script, accepted above.
- **This design does not touch `drafted/`, any approved sheet, or
  `docs/schematic/verdicts.md`.**
