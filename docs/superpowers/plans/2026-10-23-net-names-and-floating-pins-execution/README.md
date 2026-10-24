# Execution record — the 2026-10-23 net-names-and-floating-pins plan

**This is not findings. Do not cite it as evidence.** The findings are in
`docs/known-gaps.md` (**G277**, **G280**–**G289**; **G159** and **G279** deleted
as resolved) and in the code the plan changed. What is here is **how those
findings were arrived at and what it took to trust them** — judgement and audit
trail.

The same reasoning as
[`../2026-10-22-text-handling-research-execution/`](../2026-10-22-text-handling-research-execution/)
applies and `CLAUDE.md` states it: a plan produces a **decision record** and an
**audit trail**, and the register has no place for either, because neither is a
finding.

## What the plan did, in one table

| | before | after |
| --- | --- | --- |
| boards producing a schematic | **0 of 11** | **1 of 11** (`pt2399-core`) |
| boards refused at `validateCircuit` | **6**, with 14–28 problems each | **5**, with **one** problem each |
| total gate-1 problems | **108** | **5** |
| boards refused at ELK layout | 5 | 5, **unchanged at the coordinate** |

**`1 of 11` is not quotable without its second column**, and `CLAUDE.md` now says
so in those words. The one sheet that generates **cannot be read as a drawing**:
not one net label, signal flow not followable, two capacitors unresolvable, page
1 of 2 blank but for a sheet symbol, and **19 of its 24 reference designators
disagree with the built board's**. **G285** ends: *"It is not a candidate for
G240 and must not be sent to him as one."*

## What is here

| path | what it is | lines |
| --- | --- | --- |
| `rulings.md` | the controller's ledger — ~31 rulings in execution order, with what each would cost if wrong | 671 |
| `reviews/` | 6 documents: a full review per task, the scoped re-reviews, the whole-plan review | 2,378 |
| `reports/` | 7 documents: what each task claims it did, which is what the reviews checked | 2,377 |

**Reports and reviews are an adversarial pair and one without the other is half
the record.** The plan's most useful results live in the gap between them.

**Not here:** the review-package diffs (884 KB), regenerable exactly by
`git diff <base>..<head>` for the ranges `rulings.md` names.

## Two things this record is unusually good for

**Ten of the controller's own claims were refuted by the agents it dispatched**,
each corrected in place with the original left standing. Among them: two cited
paths that do not exist; a citation that was *locally true and structurally
irrelevant* (offered as the IR's pin assembly when it was an orientation map); a
defect invented in a document that was correct; a prescribed predicate that would
have **admitted the very input the task existed to refuse** and taken two files
off a byte-check; an adversarial test that proved nothing while looking like
proof; and a relayed figure wrong in both its count and its cause. **Every one
was caught because each dispatch said: do not trust my line numbers, re-read.**
That instruction is the single most load-bearing sentence in the briefs.

**Seven control-byte incidents in two days**, and the arc is the lesson. An
escape typed into a tool parameter arrives as the **real byte**, invisible in a
rendered diff:

1. A NUL in `docs/known-gaps.md` — **`grep` treated all 25,000 lines as binary
   and suppressed every match**, which is how every agent here navigates it.
2. A repair broken because Python's text mode translates CR on **read**.
3. Two silently failed `Edit` calls in a review.
4. **A NUL in `CLAUDE.md`, committed inside the commit that added the rule
   against it.**
5. Raw bytes in the plan's own file, unmatched by plain `grep` across 463 lines.
6. **A NUL that predated the plan by seven days** — in a test file, inside a
   `.join()` separator, where `grep` could not find an identifier defined one
   line above it. Found by sizing the guard, not by the guard.
7. **Ten bytes in three of these review documents**, every one where a reviewer
   wrote the regex `[\x00-\x1f]` in prose *about that regex* and got bytes.
   Repaired in code when this record was committed.

`tests/document-control-bytes.test.ts` is the guard that now catches 1–5 and 7.
It cannot prevent them, and `CLAUDE.md` forbids a git hook.

## A caution

Everything in `reviews/` and `reports/` is **model output**, written under
instruction. It was useful because it was adversarial and because figures were
re-driven rather than relayed — but it is not a primary source, and later
documents here correct earlier ones. **Where a report and a review disagree, the
review drove it; where a review and `rulings.md` disagree, the ledger adjudicated
it; where any of them and `docs/known-gaps.md` disagree, the register binds.**

## What was left open on purpose

- **Four Pultec switch mounting pins: an owner question, not work.** No MPN is
  recorded anywhere, and `NC` would be a **false** declaration if the lug is
  bonded to chassis. **G282**. Nobody asks him again unprompted.
- **`SW_MID`'s pin 12 is the unwired twelfth throw, and no model slot can carry
  it** — as a unit pin it breaks the board check, as a package pin the model's
  whitelist refuses it. One field serves both the schematic's terminal set and
  the board's pad landings. Mechanism recorded **untried**.
- **The five preamp boards' ELK refusals**, which are the text-placement class
  the owner's **G260**/**G265** decisions govern and this plan excluded.
- **The zero net labels are diagnosable**: labels are emitted only for a rail, a
  multi-block net or a bus-block net, and `pt2399-core` declares exactly **one**
  block — so no interior net can be labelled **by construction**. The
  declaration, not the placer, is where to look. Choosing between a multi-block
  declaration and changing that rule is an acceptance decision no agent made.
