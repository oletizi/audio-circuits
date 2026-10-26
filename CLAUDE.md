# Audio Circuits - Project Instructions

Follow the shared project rules in `AGENTS.md`, including committing and pushing
small, coherent changes early and often.

## What this project is

A collection of audio circuits under development. Some are core, reusable
components intended for future designs; some are designs in their own right.
**This is hardware in progress, not software that ships.** Circuits get
designed, built on a bench, listened to, and revised. Nothing here reaches a
state called "done".

**The repository exists to let agents carry a circuit from a model to something
buildable.** That is its purpose, and almost every structural decision follows
from it.

**THE MANDATE IS WIDER THAN ONE CIRCUIT AND WIDER THAN ONE OUTPUT.** The owner,
2026-10-21, saying what "something buildable" means:

> *"For the **many** audio circuits we plan to develop in this repository, we
> will need topologies, schematics, bench-buildable perfboard layouts, tht pcb
> layouts we can send to pcbway or similar, and smd pcb layouts we can send to
> pcbway or similar for manufacture and assembly."*

**Five output classes, for many circuits:** topologies; schematics;
bench-buildable perfboard; THT PCB fit to send out for fabrication; and SMD PCB
fit to send out for fabrication **and assembly**.

**THE BOARDS IN `boards/` ARE THE PROVING GROUND, NOT THE CONSUMERS.** His
question is the test, and it is the one to apply to any capability claim here:

> *"If you can't deliver at least the schematics for the circuits we are
> currently building, how can you hope to deliver on the larger mandate?"*

A capability that cannot produce an output for the circuits already in hand has
not been demonstrated, whatever its tests say. **An agent that finds itself
arguing that some output does not matter for the current boards is reasoning
from the wrong end** - the current boards are how you discover whether the thing
works for the next hundred.

**WHERE A FULLY SPECIFIED BOM BINDS, which follows from the five classes rather
than from any tool's convenience.** The owner, 2026-10-21:

> *"the gate you describe **is** important for pcb layout intended for outsourced
> manufacture—but a fully specified BOM isn't needed for schematics, stripboard
> layout, and, in many cases, tht pcbs."*

**A fully specified BOM is a property of the CONSUMER of an artifact, not of the
circuit**: it binds when someone else sources and places the parts. So it binds
for SMD assembly, often not for THT, and never for a schematic or a hand-built
stripboard layout. `docs/known-gaps.md` **G245** records the gate this corrected
and the measurement behind it.

**This section is longer than the sentence it replaces because the narrow
reading cost a day.** Until 2026-10-21 it said only that the repository exists
to carry *a* circuit to *something* buildable. An agent read that as the eleven
boards in `boards/`, found that those boards are already hand-drawn, and
concluded that generating schematics did not matter for them - **the exact
inversion the mandate above forbids**, reached from a true sentence that was too
narrow to forbid it.

## Who does what, and why

**Agents do the placing and routing, of schematics and of board layouts both.**
This reverses what this file said until 2026-10-10, and the reversal is the
owner's instruction, not a drift: the earlier rule held that an agent cannot
draw a legible schematic or lay out a buildable board, and forbade it from
trying. That rule outlived its evidence. `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`
is the program that brings the pedals repository's place-and-route and
schematic-generation work here, and it records the demonstration that an agent
can place and route a board and generate a schematic. Taking the operator out of
schematic and PCB creation is the goal, not a risk to be managed.

| | Belongs to | Why |
| --- | --- | --- |
| `lib/`, `circuits/*.ts`, `tests/`, `tools/` | **agents** | Holding a circuit as data makes it something an agent can validate, simulate, compose, partition and be held to |
| KiCad schematics, VeroRoute layouts | **agents** | Arrangement, placement and routing are measurable against stated criteria, so they are work an agent can be held to as well |
| The criteria those artifacts are judged by | **never the agent producing them** | See below - this is the invariant the old prohibition was really protecting |

So:

- **An agent may never author the acceptance criteria for the artifact it is
  producing.** This is the invariant, and it is what replaces the old blanket
  prohibition. The failure that prohibition existed to prevent was not bad
  placement; it was an agent building the floorplan intent from the layout it
  had already produced, then checking the layout against it and passing. Every
  check passed because the agent had chosen what the checks were. Criteria reach
  an artifact through a rule file, a spec, or a reviewing agent that is never the
  one that authored it - never through the producing agent's own judgement. The
  parent design names the channels.
- **A stated directive outranks what the as-built boards happen to contain.**
  The owner, 2026-10-15: *"I've already told you how rigid parts operate. The
  as-built diagram is instructive, but my directives are more authoritative than
  a file on disk."* Measuring his built boards is how an agent learns what a
  directive means in holes and strips, and it is the right way to discover a rule
  nobody has stated. It is NOT a veto. **"This rule would refuse a board he
  built" is not an argument against the rule** - it means that spot on that board
  was harder to build than it needed to be, and the tool should decline to
  reproduce it. He applied that reasoning twice in one sitting: to a lead under a
  trimmer's body overhang, and to four of the five overlapping part pairs across
  his two boards.

  **The failure this corrects is subtle and was live here for a whole plan.**
  Deriving a rule from his layouts and then treating those layouts as the rule's
  ceiling quietly makes the as-built artifact the criterion - which is the
  invariant above, wearing a measurement's clothes, since the agent chose which
  artifact to measure and what to read off it. Where a directive and a board
  disagree, record the disagreement so its cost is visible, follow the directive,
  and put it to him if the gap looks like it matters.
- **Minimising a measurable cost is not a taste judgement.** Cut count, wire
  bridges, board area and physical lead span are numbers, and driving them down
  iteratively is exactly the work to automate rather than hand back. "Your
  cycles are cheaper than mine" is the governing economics here. A first
  solution that technically works but leaves a person doing fiddly remedial work
  is a failure, not a delivery.
- **The schematic generator is `lib/schgen/`, and `lib/kicad/schematic.ts` is the
  superseded stub it replaced.** This sentence used to say the stub was all there
  was and to *"expect it to stop being true as the schematic-generation port
  lands"*. **The port landed and the prediction was wrong for a reason nobody
  anticipated, which is worth more than a silent correction.** `lib/schgen/`
  exists, draws **47 of this repository's 52 declared ELK blocks**, and
  **produces a schematic for 7 of the 11 boards in `boards/`** - `pt2399-core`,
  `pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`,
  `transistor-preamp-lab` and `transistor-preamp-loop`, all since 2026-10-24.

  **THE FIGURE HAS BEEN `0`, `1`, `2`, `5`, `6` AND `7` IN THIS PARAGRAPH INSIDE
  FIVE DAYS, and the lesson that outlives each of them is about the CAUSE rather
  than the count.** `0 of 11` once stood here beside *"six are refused at
  `validateCircuit` on net names"*. The count was merely stale; **the cause was
  refuted**, and that is the worse of the two - a stale count misleads about
  progress, a stale cause sends the next agent after a rule that is not there.
  No board has ever refused on a net name: the casing demand is gone on the
  owner's instruction (*"i absolutely do not care about the letter case of net
  names. That's a silly quibble."*) and **G150**'s re-drive reads all eleven
  refusal blocks and finds **not one** mentioning a net name, a case or
  `UPPER_SNAKE`.

  **AND THE SECOND LESSON IS THAT THREE FILES CARRIED THREE DIFFERENT VALUES OF
  THIS NUMBER AT THE SAME TIME.** On 2026-10-25 this paragraph said `5 of 11`,
  `docs/known-gaps.md` **G291**'s own table said `2 of 11`, and **G259** - the
  board-by-board scoreboard both of them cite - still said `1 of 11`. Three
  changes that day moved it and not one of them amended the scoreboard.
  **`bun tools/schgen/board-sheets.ts` is the only thing that answers this
  question**; a figure in prose, including this one, is a transcription with a
  date on it.

  **What refuses today is FOUR boards, in two classes**, which is the shape to
  check rather than the number: `pultec-mid` at `validateCircuit` on a switch
  throw (`pin 12`) that no slot in the model can carry; and `tp-stage` on each of
  `transistor-preamp-buffered`, `-feedback` and `-staged`, all three at the
  clearance checks on a power-symbol **value** overlap, which is ordinary
  crowding - **one block refuses three boards.** **Two classes have left
  entirely, and by opposite routes.** The **missing junction** - the one class
  that must keep refusing, because it makes a drawing WRONG ABOUT THE CIRCUIT -
  is gone because the geometry moved, not because anything was relaxed. The
  **paper** class is gone because a sheet's declared paper is now a FLOOR rather
  than a ceiling: a drawing that needs more than A3 is drawn on the next
  standard size up, and only contents that fit on nothing still refuse.
  `docs/known-gaps.md` **G292** carries the measurement and **G290** why the
  mechanical-pin classification is a whitelist rather than inferred from a
  symbol's drawing.

  **AND `7 of 11` IS NOT QUOTABLE WITHOUT ITS SECOND COLUMN. Do not let it stand
  in this file, or anywhere else, without one. A board that generates is not a
  board whose drawing anyone has read.** The only sheet anyone HAS read closely
  is `pt2399-core`'s, and it **cannot be read as a drawing**: not one net label,
  signal flow not followable, `C13` and `C14` unresolvable, page 1 of 2 blank but
  for a sheet symbol, and **19 of its 24 reference designators disagree with the
  built board's** - the sheet's `R3` is a 10K part where the board's `R3` is 15K.
  **G285** carries that table and ends, verbatim: *"It is not a candidate for
  G240 and must not be sent to him as one."* **The other six have had no such
  reading**, and their generations report **19 fallback field placements**
  between them - text the placer could not keep clear - against 4 on
  `pt2399-core`'s own sheet, 23 in all. **`pt2399-core`'s fell from 8 to 4 and
  that is not a step toward G240's criterion**: the eight were never what was
  wrong with that sheet.
  **The "no authoring declaration" half of this sentence is gone and the dates
  say why it is kept:** until 2026-10-21 nine of the eleven
  boards had no declaration and had never been offered to the drawing code at
  all, which was the largest single reason this output class delivered nothing;
  all nine now exist (`circuits/pultec/schematic/`,
  `circuits/transistor-preamp/schematic/`) and **the board figure did not move
  then** - it moved three days later, and for an unrelated reason: Task 5 of
  `docs/superpowers/plans/2026-10-23-net-names-and-floating-pins.md` resolved
  `pt2399-core`'s validation refusal and its sheet-name collision (then **G284**, now
  resolved for every design and guarded by `tests/schgen/sheet-file-collision.test.ts`).
  `docs/known-gaps.md` **G259** is the board-by-board scoreboard, **G247**
  measures the preamp five, **G263** and **G264** carry what offering the nine
  surfaced, **G238** and **G245** are how the blocker got there, and **G248** records
  why the stub writer is still in the tree - it carries the only `kicad-cli`
  proof that KiCad reads a generated schematic as the circuit means it. **Nothing
  invites you to the stub**: its CLI verb, its script and its instructions are
  deleted. Say "stub" when that is what you made, and read **G81** before you
  reach for `lib/kicad/schematic.ts` for anything.
- **KiCad and VeroRoute are primary tools here, not optional extras.**
  `make check` invokes `kicad-cli` on every board on every run, and one test
  invokes it directly and fails rather than skips. Treat KiCad the way you would
  a compiler: required, and not something to engineer around.

**Authority runs in both directions**, depending on where a circuit came from.
For a circuit an agent designs, the model is authoritative and the schematic is
derived from it. For an existing design being brought in - the Pultec - the
schematic is authoritative and the model is derived from a netlist export. Work
out which case you are in before deciding what may edit what.

## Practices

These are settled, and each one exists because its absence cost something real.

**Look at the output, not only the tests.** Netlist-level assertions are
necessary and not sufficient. A board can pass every test and be unbuildable, a
schematic can be correct and unreadable, a document can be generated and
useless. Render it, print it, read it.

**Refusals teach.** Every `throw` names what is missing, where to fix it, and
why it is not defaulted. A message that only says something went wrong is
incomplete.

**AND A REFUSAL WHOSE REASON CANNOT BE STATED SHOULD NOT EXIST. ASK WHAT A
DEMAND IS FOR BEFORE WORKING OUT HOW TO SATISFY IT.** This repository has now
done the opposite **four times, and the owner caught all four** - no agent and
no review did:

- the **BOM gate**, which blocked drawings on purchasing data (**G245**);
- the over-long **`Value` label**, argued about rather than questioned;
- the **`UPPER_SNAKE` net-name rule** (**G150**), 2026-10-23: *"i absolutely do
  not care about the letter case of net names. That's a silly quibble."*
- the **switch MOUNTING-PIN demand** (**G282**), 2026-10-24, which is the worst
  of the four because it **re-erected the first one under a new
  justification**. `pinsDeclared` refuses a mechanical mount lug for want of a
  net; the agent concluded it needed to know **which rotary switch is fitted**
  and raised an owner question for an MPN - the very gate `G245` had already
  struck. His three questions, in the order he asked them, each removed a
  layer: *"why do you need to know which rotary switch is fitted?"*, *"why do
  you need the specific part number of a component in a schematic?"*, *"why do
  you need to specify a mechanical part in the schematic?"*

**The third is the purest form and the one to recognise.** `G150` measured the
violation exactly, counted the 31 offending nets, and offered three mechanisms
for *complying* - normalise, rename, or relax - **without once asking what the
rule was for.** `lib/schgen/ir/validate.ts` states no reason for it, and there
is none to state: letter case carries no information a schematic needs.

**The tell is a rule that refuses with a restatement of itself** - *"net `in` is
not UPPER_SNAKE"* says what the rule is, not why it exists. Where you cannot
write the "why it is not defaulted" clause this section already requires, **you
have found a demand to question rather than a refusal to satisfy.**

**AND BEFORE YOU RAISE AN OWNER QUESTION, SEARCH FOR WHETHER THIS REPOSITORY
ALREADY ANSWERS IT.** The fourth instance was answered in a code comment written
before the task began - `circuits/pultec/schematic/section-board.ts:162`:
*"a mounting pin `MP`, which is a mechanical pad and is on no net in the
model."* The agent measured the symbol, reached that same conclusion, recorded
it in **G282** clause 4, **and then asked him anyway.** An owner question costs
him attention and stalls the boards behind it, so it is the last resort and not
the first: a question he could not answer from the circuit is a question that
was never his.

**AND A SILLY DEMAND CAN HIDE A REAL ONE, which is the second cost.** That same
regex rejected `hi_boost_out` on case alone - the silly part - and
`Net-(C10-Pad1)` on case **plus parentheses and hyphens**, which is a genuine
unanswered question about what KiCad accepts in a label. One message, two
demands, and the real one invisible behind the quibble. **Split a rule that
refuses two different things.**

**Refuse rather than guess.** Value ranges, footprint families and part
geometries are proven with tests over the range they claim. Extending one is a
deliberate edit with a test beside it, never a silent widening. An empty
whitelist that refuses loudly beats a general rule that quietly accepts a guess.

**Verify names against the thing itself.** A KiCad footprint name is checkable -
the libraries are on disk. Do not write one from memory; this repository has
twice shipped a footprint that does not exist.

**NEVER TYPE A CONTROL-CHARACTER ESCAPE INTO A TOOL PARAMETER. BUILD IT IN
CODE.** A `\u0000` or `\r` written into an edit string, a search pattern or a
document arrives as the **real byte**, not as the four characters you typed, and
the result is invisible in a rendered diff. Build them with
`String.fromCharCode` or `chr()`, and **check the file by counting bytes rather
than by reading it.**

This cost three incidents on one plan in one day: a raw NUL written into
`docs/known-gaps.md`, which **made `grep` treat all 25,000 lines as binary and
suppress every match** - and grepping that file is how every agent here
navigates it; a repair attempt broken because Python's text mode translates
`\r` on **read**; and two silently failed edits in a review, where the escape
became bytes and stopped matching the file. The first was caught only because
someone counted.

**AND THE COMMIT THAT ADDED THIS RULE BROKE THIS FILE WITH IT - the fourth
incident, in the governance change prohibiting the third.** The example above
was typed as an escape into an edit, arrived as a **real NUL**, and `grep`
returned nothing on `CLAUDE.md` until it was counted and repaired. **The file
every agent reads for its instructions was unsearchable, and the rendered diff
looked correct.** Left recorded rather than amended away, because the rule's own
example breaking the rule's own file is the most useful evidence it has: there
is no care level at which typing the escape is safe. Build it in code.

**The general form, which is why this sits beside the rule above:** a tool that
reports success while the thing you asked about became unreadable is the failure
mode this whole section exists to prevent. `docs/schematic/false-greens.md`
catalogues it with the other twenty-eight.

**A skipped check must never look like a passing one.** If a guard cannot run,
say so loudly. Silence that resembles success is the failure mode the whole
workflow exists to prevent.

**Anything a later reader would need and cannot re-derive goes in
`docs/known-gaps.md`, committed, in the change that found it.** This is a
repo-wide requirement, not a per-plan convention, and it binds every agent on
every task.

**It is NOT only defects**, which is how it has been read and how it has failed.
It covers:

- a defect you are not fixing;
- **a measurement** - including one that found nothing wrong. *"Removing the
  junction ground row opens net `0` on every adopted board"* is not a defect;
  it is a constraint on a change the owner wants, and the next agent to try it
  needs it;
- **a result that makes someone want to act** - *"without that row hi-boost is
  zero cuts, zero wires, zero bridges"* is bait, and bait belongs beside the
  trap;
- **an owner decision, and an owner DECLINATION**, with his words verbatim. A
  question he declined is not a closed question, but nobody asks him again
  unprompted;
- **an observation you could not diagnose.** Record it undiagnosed rather than
  omit it.

**Telling the owner in conversation is not recording it**, and neither is a plan
ledger: `.superpowers/` is gitignored, so an entry there is invisible to review,
absent from the history, and destroyed by `git clean -fdx`.

**AND THE REMEDY IS NOT ONLY TO COPY FINDINGS OUT — IT IS TO COMMIT THE
EXECUTION RECORD TOO, which this file did not say until 2026-10-23.** The rule
above sends findings to the register, correctly. But a plan also produces two
things the register has no place for, because they are not findings: **the
decision record** - what was ruled, why, and what it would cost if wrong - and
**the audit trail** that makes the register's own *"CONFIRMED by this writer"*
claims checkable. The execution skill's default is to delete a plan's workspace
once its final review is clean. **That default is right when the diff IS the
record and wrong when the plan's product is knowledge**, and following it would
have destroyed 77 rulings and 19 reviews. So: **a plan's record is committed
beside the plan**, at `docs/superpowers/plans/<plan-name>-execution/`, with a
README saying plainly that it is not findings and that the register is what
binds.

> **This said "a RESEARCH plan's record" until 2026-10-24, and the narrower
> wording did not survive its first implementation plan.** The reasoning above
> turns on a plan producing a decision record and an audit trail that the
> register has no home for — **which has nothing to do with whether the plan
> wrote code.** The net-names plan changed production code and still produced
> ~31 rulings, six reviews and seven reports, including ten refuted controller
> claims and the seven-incident control-byte arc. Generalised rather than
> re-argued each time. The review-package
diffs are not committed - they regenerate from `git diff`. The worked example is
`docs/superpowers/plans/2026-10-22-text-handling-research-execution/`.

**The owner, 2026-10-23, on being shown the workspace left as scratch:** *"why
wouldn't you keep the hard-won data as a durable part of the repo?"* He asked in
the same breath whether the investigation was *"fully documented in a
human-readable report durably in the repo"*, and it was not: the findings were
committed in a 5,800-line document written for an adversarial reader, and the one
artifact meant to summarise them was **unreadable when rendered** - its grade
column clipped off the edge of the page, read as source by six reviewers and a
controller without anyone noticing. **A research pass is not delivered until a
person can read what it found**, which is what
`docs/schematic/text-handling-report.md` is and why
`docs/schematic/README.md` now points at it ahead of everything else.

**This rule has been broken twice by the agent that wrote it**, both times the
same way: measuring something, reporting it in the session, and moving on. The
owner, 2026-10-16: *"Telling me is not the same as recording them durably and
instituting a remediation plan."* The second breach was found only because he
asked directly whether a finding was in the file. **If you have said something
interesting to the owner and not written it down, you have already broken this
rule** - go and write it down.

Every entry says what is wrong or what was measured, where, what evidence
establishes it, **whether the writer confirmed it or is relaying another agent's
report**, and what would settle it - a fix, a measurement, or an owner decision.

Evidence must be a check that could have failed: an entry once rested on a grep
of binary files that could not have matched whatever they contained.

**A "what would settle it" often carries TWO things, and only one of them
binds.** The CRITERION is what was measured. The MECHANISM is the writer's
guess at how to meet it. **The criterion is the settlement; the mechanism is
advice from someone who had not yet tried it**, so take the criterion, test
against it, and **record the deviation when the mechanism turns out to be
wrong** rather than silently doing something else.

**The worked example, which is why this rule exists.** An entry recorded that
two bounds in the pinned fork disagreed, so a part whose length steps by 2
could shrink one hole below its own minimum. Its criterion was measurable - *a
2-increment type at `min + 1` does not go below `min`*. Its suggested mechanism
was to give the inner guard the same `>` test the outer one uses. **That
mechanism does not meet that criterion**: at `min + 1` the `>` test still
passes and the step still lands on `min - 1`, because the test knows about a
step of 1 and the type steps by 2. An implementer who followed it would have
shipped a non-fix and deleted the entry behind it. The deviation and its
reasoning are recorded in **G52**, and in the fork's own `Grid.h` comment where
the guard lives.

An entry is DELETED when it is resolved or ruled not a defect, never marked
closed - and **check what the deletion takes with it**: one deletion removed an
open owner question that only survived in a gitignored report. A bare `G<n>` in
that file means an entry in that file; `CRITERIA` numbers its own clauses with
the same letter, so those are written `CRITERIA G<n>` in full.

**Derived artifacts are regenerated every run and compared by content**, never
by timestamp - git does not preserve mtimes, and every mtime accident makes
stale look current. Where a generated netlist is committed, it is committed
deliberately: it is the form in which a human's schematic edit becomes legible
to an agent in a diff.

**Transcription is evidence, not memory.** See the section of that name below.

**Supersede means delete.** A pattern replaced by a better one is removed in the
same change, not left as a stub for somebody to find and trust.

## Circuit Conventions

This repository used to be a tscircuit component package. It is not one any more:
tscircuit was removed, and the reasons are recorded in
`docs/decisions/2026-09-21-why-not-tscircuit.md`. Nothing below is tscircuit
advice adapted - the model is different in kind.

### A circuit is a function that returns a `Network`

There is no board, no renderer and no JSX. A circuit is a plain function, and its
result is data:

```ts
export function opampBuffer(): Network {
  return circuit()
    .capacitor("input_coupling_cap", "100nF", { a: "IN_EXT", b: "IN" })
    .resistor("input_bias_resistor", "100k", { a: "IN", b: "GND" })
    .port("input", "IN_EXT")
    .done()
}
```

`done()` validates before it returns, so a malformed circuit throws at the
declaration that caused it rather than far downstream. The builder has shorthands
for the two-terminal passives, plus `ic()` and `connector()`; anything else - an
op-amp, a transistor - goes in through `add()` with its units spelled out.

Nets are implied by pin references, never declared separately. Two pins naming the
same string are on the same net; that is the whole rule, and it means there is one
place to keep correct rather than two.

### Composition: `include()`, and no implicit global nets

Circuits compose with `include(prefix, network, portMap)`. Every net inside the
included circuit takes the prefix, except the ones its declared ports name, which
are bound to the parent's nets by `portMap`.

**There are no implicit or global nets.** Ground, supply rails and bias references
are not special: a net that crosses a composition boundary must be a declared port
and must be bound explicitly. Leaving one unbound is an error, not a default. What
this buys is that a rail which should be shared and is not becomes a loud
construction error instead of a quiet simulation result.

**A component is atomic with respect to `include()`.** Composition moves whole
components, never single units, so a package cannot be split across two blocks.
When one package's sections serve different functional blocks, the package
allocation therefore constrains the file layout, and not the other way round: the
whole component goes in one block and the other block reaches what it needs
through a declared port. `circuits/optical-compressor/` is the worked example -
its spec puts the VBIAS buffer and the sidechain amplifier on the same dual
op-amp, so the buffer is declared in `parts/sidechain.ts` although it belongs to
the power section by function, and `parts/power-section.ts` hands the unbuffered
divider node across as a port. See also **Multi-section packages** below.

### Ids are semantic; designators belong to KiCad

A component's `id` says what the part DOES - `input_bias_resistor`,
`vcc_decoupling_cap`, `buffer_amp`. It is never a reference designator. `R4` is a
fact about one particular schematic, and schematics are downstream of this model.
Where a circuit has to be checked against one, it exports a separate id-to-
designator map (see `DESIGNATORS` in `circuits/pt2399-core/pt2399-core.ts`), and that map is
the only place the two vocabularies meet.

### Pin names come from the kind, not from the part

Each component kind declares its pin vocabulary in `lib/model/kinds.ts`: a
resistor has `a`/`b`, an op-amp unit has `in+`/`in-`/`out` with `v+`/`v-` on the
package. A kind declares the vocabulary - which KiCad pin number or footprint pad
a pin maps to is a property of a concrete symbol or package, and lives there.
`ic`, `connector` and `switch` have open vocabularies, because their pins are
whatever the part has.

SPICE argument order follows the same rule, with ONE principled exception. For a
kind emitted as a SPICE PRIMITIVE - resistor, capacitor, inductor, photoresistor,
diode, bjt - SPICE itself fixes the order (`D` is anode then cathode, `Q` is
collector, base, emitter), so it is a property of the SPICE language rather than
of any model, and `SPICE_PIN_ORDER` in `lib/model/kinds.ts` keys it by kind. For
a subcircuit-backed kind it is a property of the concrete model, because two
macromodels of one kind may order their pins differently, so it lives on the
model entry (`DeviceModel.pinOrder`) and `spicePinOrder` refuses those kinds
rather than inventing an order. Spec 3.5 states the rule without this exception;
the deviation is recorded in
`docs/superpowers/plans/2026-09-22-canonical-model-plan-b.md`.

### Multi-section packages

A package's `units` are its functional sections: `A` and `B` for a dual op-amp,
`MAIN` for everything else. Pins shared across sections - supply, shield - sit on
the component rather than in a unit. The SPICE emitter lowers one unit to one
device line, each seeing its own pins merged with the package's.

Which section does which job is a decision with a composition consequence, not a
free choice made afterwards: a package is one component and `include()` moves
whole components, so two sections doing two blocks' work still live in one block.
See **Composition** above.

### One directory per circuit, and it holds the KiCad files

Every circuit owns a directory under `circuits/`, and its authored sources live
there together:

```
circuits/pt2399-core/     pt2399-core.kicad_sch   pt2399-core.ts
circuits/pultec/          pultec-three-band-eq.kicad_sch   pultec-mid-band.kicad_sch
                          pultec-three-band-eq.kicad_pro   <the board modules>
circuits/transistor-preamp/  lab-board.kicad_sch   lab-board.ts   ...
```

**No KiCad file sits at the top level of `circuits/`.** It gets a directory even
when the circuit is one schematic and one module.

A circuit with enough parts uses subdirectories, and they say what KIND of
thing each file is rather than what topic it is about:

```
circuits/pultec/electrical/      an electrical model derived from the schematic
circuits/pultec/physical/     physicalized board modules, one per board
circuits/pultec/generated/  artifacts a tool rebuilds - never hand-edited
```

**The test is not where a file came from, or what reads it. Ask whether it will
be EDITED here.** If yes, it is a source and belongs with the circuit. If a tool
rebuilds it, it is generated. If it is prose about the circuit - a values table,
a list of unresolved questions, a parts-selection writeup - it is documentation
and belongs in `docs/<circuit>/`.

There is deliberately **no `reference/` directory**. There was one, and it
accumulated all three kinds: over a thousand lines of editable TypeScript, the
generated netlist, and the analysis prose, under a name that described only the
last. "Reference" reads as material you consult rather than a project you work
on, and filing live sources under it quietly asserts that nobody will ever edit
them. If you find yourself wanting a directory for "the stuff around this
circuit", you are about to make the same mistake: sort it into source,
generated, or documentation instead.

A `.kicad_prl` is per-user view state, not design data. It is gitignored and
never committed, whatever directory it appears in.

Moving a `.ts` into a new directory changes its import depth. Fix the relative
paths and run `bun run typecheck` - an unresolved module shows up as a confusing
type error at an untouched line (`Property 'x' does not exist on type '{}'`),
not as "module not found".

### Imports

Explicit relative paths, with the file extension:

```ts
import { circuit } from "../lib/model/index.ts"   // good
import { circuit } from "../lib/model"            // bad
```

### Values are strings, parsed once

`"100nF"`, `"4K7"`, `"2.7k"` - `parseValue` handles SI prefixes and RKM notation,
and throws on anything it cannot parse. It never guesses a unit.

### A part is not a model

`part.mpn` says which part is fitted; a unit's `spiceModel` says which SPICE model
a simulation uses for it. They are separate claims and a circuit may legitimately
carry `mpn: "TL072"` alongside `spiceModel: "GENERIC_OPAMP"`. Every model in
`lib/sim/models/` states where it came from and what may be concluded from it.

### Transcription is evidence, not memory

A circuit ported from somewhere records where it came from in its module comment,
names the file that is the authority for it, and states plainly anything it did
NOT carry across. Every component, value and connection comes from reading that
source - never from remembering what that kind of circuit usually looks like.
