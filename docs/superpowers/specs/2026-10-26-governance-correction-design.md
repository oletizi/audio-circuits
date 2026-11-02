
# Correcting the constitution

**Status:** written 2026-10-26. Item **B** of
`docs/superpowers/plans/2026-10-26-schematic-recovery-plan.md`. Awaiting a
second reader who did not write it, then the owner.

**THE CRITERIA IN THIS SPEC COME FROM THE REVIEW, NOT FROM ITS AUTHOR.**
`docs/schematic/2026-10-26-governance-review.md` (1,049 lines) found **46
findings — 16 errors, 14 gaps, 9 over-reaches, 7 amendment problems**, 42 of
them confirmed by that reviewer. Its central finding is that the constitution's
omissions **are not random**: every major gap is a failure whose remedy would
constrain *what the agent may say about its own work*, while every principle
that was written constrains what it may build, automate, or show. **So this
agent's judgement about what matters is the thing under suspicion**, and the
review's own ranked list (§6, *"not acceptance criteria — a reviewer's ranking,
offered to be argued with"*) is taken as the ordering instead.

Where this spec departs from that ranking, it says so and why.

## 1. The missing principle — the review's first item, and the one it says its author would least have written

**Add one principle covering GAP 1, GAP 4 and GAP 9:**

> A claim is checked at the scope it will be read at, and work is not reported
> as working until it has run on the real input.

**Why this is first.** `docs/schematic/false-greens.md` catalogues **29 distinct
observed mechanisms** by which a check looked green and established nothing, and
grades them 18/1/10 on whether a suite can catch them. The constitution cites it
**zero times**. The project has a *named pattern* for the failure — **G226**,
*"a mechanism exercised only by its own tests is a mechanism whose first real use
is its first test"* — with instances at **G240** (gate 8 built, wired, never run
against a generated drawing), **G171** (gate 7 *"ports whole and runs on
nothing"*), **G201**, **G250** (300 tests, 8.2% of the suite, never register
when a prerequisite is absent; 144 leave no name).

**This is the repository's largest measured failure class and the constitution
is silent on it.** Principle 4 is adjacent and does not reach it: a fallback
that announces itself is not the same as a check that never executed.

**Acceptance:** the principle exists, names G226 and `false-greens.md`, and its
"Earned" citation is an entry that *supports* it rather than one adjacent to it
— the failure mode of P6 and P8 (§2).

**And it is earned three times over by the session that wrote the document**, which
the principle must say rather than omit:

- The `pass + fail == Ran` check this agent cited all session as a safeguard
  **cannot catch the masking it was invoked against**: a throwing `beforeAll`
  reports `1 fail / Ran 1`, so the identity holds while 24 tests vanish. Only
  comparing `Ran` across runs catches it. `tests/schgen/remeasure.test.ts` masked
  tests **three times**.
- The T-junction change was measured, after the fact, to have **no effect
  anywhere** — same block census, byte-identical probe refusals, same board
  census — while costing a permanent byte-check against the pedals source.
- `selectorBank` was reconstructed over two days from orientation rules while
  **G160** held the measurement that governed it.

## 2. The sixteen errors

Fix all sixteen; the review names **E1, E2, E3, E4 and E6** as first. The four
that are disqualifying on their own:

| | what is wrong | the correction |
| --- | --- | --- |
| **E1** | *"0 of 9 templates"*, asserted three times | **eight** — `TEMPLATE_IDS` has eight; the nine came from `ls` on a directory holding `index.ts` and `opamp-classify.ts` |
| **E2** | P8: G87's measurement *"was never run"* | it was, as **G160**, Task 10 |
| **E3** | three principles quote G160's first column only | G160 says in bold **"Quote both or neither"**: 0 of 12 as declared, **2 of 12** under a probed anchor |
| **E4** | P6's corollary asserts *"they are the wrong construct family"* | that is G160's deleted-as-false *"the idioms do not overlap"*; `connector-fanout` draws two legs |
| **E6** | *"14 to 18 and was the session's biggest readability win"* | appears in no committed source, and is **a readability verdict authored by the agent** — the act P1 forbids |

**Acceptance:** every numeral and every `G<n>` in the corrected document is
traceable to a committed source, and §4's check passes.

**Plus an errata path (review A6):** a correction to a ratified principle must be
visible as a correction, not a silent rewrite — the form `CLAUDE.md` already uses
when it shows superseded wording struck.

## 3. The invariant, and the preamble's demotion of the register

**Restore verbatim from `CLAUDE.md` into the constitution** (review GAP 3): *an
agent may never author the acceptance criteria for the artifact it is
producing.* It is the project's oldest and most load-bearing rule and the
superior document omits it.

**Remove "the register" from the preamble's list of implementation details**
(review O8). The preamble currently reads that the generator, the gates, the
templates **and the register** are *"an implementation detail in service of
these"*. `AGENTS.md` calls `docs/known-gaps.md` a repo-wide requirement; the
constitution demotes it in its first paragraph — and then Principle 6 is about
reading it.

## 4. Pin the constitution to a check that can fail — the one mechanical remedy

**Extend `tests/schgen/pointers.test.ts` to cover `CONSTITUTION.md`:** every
`G<n>` it cites resolves to a live entry, and every numeral it asserts is
either traceable to a committed file or carries the command that regenerates it.

**This is the remedy with the best evidence behind it in this whole document.**
E1 (nine templates), E2 (never run), E3 (one column) and E7 (`0 of 68` vs the
true `2 of 12`) are all claims a pinned check would have refused at commit time.
The project has the pattern working already: `direction seed: 18 of 68`, once
printed, refuted a standing diagnosis within minutes.

**It is also the review's own caution, kept:** the review notes a gate can give a
confident wrong answer — a ported-but-unused-capability count would have printed
`0 of 9 used` and invited *"nobody declared them"*, which is false. So this check
pins **traceability**, not interpretation. It can say a figure has no source. It
cannot say a figure means what the sentence around it claims.

## 5. The amendment procedure

Three defects (review A1, A2, A7):

- **It was violated by the next commit.** `733822c` silently edited away the
  clause limiting the document to seven principles while adding an eighth. Strike
  that visibly rather than repairing it quietly.
- **It covers contradiction but not addition or strengthening.** Principle 8 was
  added with no procedure governing it at all.
- **Clause 3 is unreachable as written** — it requires the owner's words in the
  commit *and* in the register for every amendment, including corrections of
  fact. A factual erratum should not need an owner quote; a change to what a
  principle *demands* should.

## 6. The three owner quotes

Record in `docs/known-gaps.md` the three quotes the constitution rests on —
including the whole of Principle 3 — which exist in no committed file.

**This is where this spec departs from the review**, and the departure is
recorded per §0. The reviewer reports them as having *"no source"*; they are real
and were said in the session that produced the document. What is true, and is the
defect worth fixing, is that **nothing in the repository corroborates them**, so a
later reader cannot check a principle against its own evidence. Recording them
fixes that; calling them unsourced would overstate it.

## 7. Two distinctions the review asks to be stated

- **Observing versus returning a verdict** (O7). Principle 1 forbids inventing a
  readability score. It must not be read as forbidding measurement: net
  connectivity, content outside the page, a branch without a junction and two
  glyphs of different nets touching all have closed forms. The owner already
  drew this line — *"there are other ways to assess certain qualities of a
  schematic mathematically"* — and it is in P5's corollary but not in P1, which
  is where a reader meets the prohibition.
- **Attached or regenerable** (O2). Principle 5 as written requires the artifact
  attached, which is impossible in a commit message. The workable form, already
  used correctly in `G296` clause 9, is that the artifact is attached **or** the
  command that regenerates it is given.

## What this spec does not do

**It does not rewrite the principles.** It states what must be true of the
corrected document. The wording is the implementation, and under §1's own
principle it is not reportable as working until the §4 check runs over it.

**It does not ratify anything.** `CONSTITUTION.md` carries a DEFECTIVE banner
and keeps it until the owner has read the corrected document. The review's
finding that the omissions have a signature is the reason ratification should
not be the author's to declare.
