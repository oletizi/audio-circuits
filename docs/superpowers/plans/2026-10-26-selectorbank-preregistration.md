
# `selectorBank`: what I commit to before starting

**Item C of `2026-10-26-schematic-recovery-plan.md`.** Written BEFORE any code,
so the criteria cannot move once results arrive. The owner asked how the
constitution's discipline would actually be deployed on the next scope of work;
this is the answer in a form that can be checked against rather than asserted.

**CAVEAT STATED FIRST: `CONSTITUTION.md` is DEFECTIVE and unratified.** It is not
cited here as authority. What is used is the subset the independent review left
standing, plus the principle the review says is missing and that its author would
least have written. Where a principle was refuted, it is not used.

## What "done" is, fixed now

`selectorBank` draws the capacitor bank on **all five** Pultec section boards, in
generated sheets, and the owner has **looked** at the rendered result and
accepted it.

**Not done when:** its unit test passes. Not done when the census number moves.
Not done when I think it reads well.

## The eight commitments, each with what breaks it

**1. Read the register first, and say which entries.** Before a line of code:
`G160` (template applicability, both columns), the entry at `docs/known-gaps.md`
≈8098 that calls the four Pultec template specs *"asserted rather than earned"*,
`G87`, `G141`, `G226`. **Broken if** the first commit does not name the entries
read. This is the principle I violated most expensively — two days reconstructing
`selectorBank` while `G160` held the measurement.

**2. Draw it; do not specify it.** The first artifact is a rendered sheet, not a
document. **Broken if** a prose specification of the arrangement exists before a
drawing of it does. The four existing Pultec template specs were written the
other way round and the register records what that produced.

**3. I look before I form a view, and the sheet goes with every claim.** Every
iteration I report on is attached. **Broken if** I characterise an arrangement
from counts, or send a number where a page would settle it.

**4. No invented score.** I will measure only closed-form things: does it draw,
does the netlist round-trip, is content inside the page, is there a junction at
every branch. **Broken if** I produce any quantity purporting to rank
readability, or optimise against one. Three such proxies in two days each pointed
the opposite way to the owner's judgement.

**5. Specified against the construct, not the five instances.** The template must
state what it structurally requires — a set of two-terminal parts each joining a
common node to one throw of a selector — with **no Pultec circuit named in its
specification**. **Broken if** its text names hi-boost, hi-cut, or a count of its
own instances. I will additionally look for a non-Pultec instance to offer it,
and **record that I could not** if none exists, rather than letting its absence
pass as generality.

**6. Not reported as working until it has run on the real input.** `G226`: *"a
mechanism exercised only by its own tests is a mechanism whose first real use is
its first test."* **Broken if** I report progress on the strength of a passing
test, before a Pultec sheet has been generated through it. This is the principle
the review says is missing from the constitution, and it is the one most likely
to be skipped here.

**7. A refusal is diagnosed, not guessed.** When the template declines a block I
expect it to draw, I state what would be true if my explanation were right and
check that, before reporting a cause. **Broken if** I name a cause without the
test that would have refuted it. Three wrong causes in a row this week, each
stated as established.

**8. Mechanics that cost something today.** Commit only paths I changed, never
`git add -A` — another session's register work was swept into two of my commits.
Compare `Ran` **across runs**; `pass + fail == Ran` does not catch a throwing
`beforeAll`, which masked tests three times. Expect a measurement re-drive if
geometry moves, and say so in advance rather than discovering it.

## The one thing that would make me stop

If the first drawn arrangement needs owner correction on a point he has already
made — the bank in a column, the switch facing it, signal left to right — then
the loop is not converging and that is worth saying rather than iterating
quietly. His own test, offered earlier: **does each observation still fix boards
he was not looking at?** Three for three so far. If that stops, so does this.
