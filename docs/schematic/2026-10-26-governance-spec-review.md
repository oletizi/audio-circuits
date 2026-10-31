Review of `docs/superpowers/specs/2026-10-26-governance-correction-design.md`
===========================================================================

Reviewer: a second reader who wrote neither the spec, the review, nor
`CONSTITUTION.md`. Tree: `feature/schematics-tooling`, HEAD **8e6d07b** (the
session brief said 1262aff; `git diff 1262aff HEAD` over the spec, the review
and `CONSTITUTION.md` is **empty**, so the three documents under review are
unchanged — CONFIRMED).

Every finding is marked **CONFIRMED** (I drove a check that could have failed)
or **INFERRING** (a reading).

**VERDICT: APPROVE WITH REVISIONS.** The spec carries all seven of the review's
ranked remedies, in the review's order, and its verifiable factual claims hold
up almost everywhere I could drive them. What it does, it does honestly. But the
review's central finding — *the omissions are not random; the ones omitted were
the remedies that constrain what the agent may say about its own work* —
**recurs inside the spec at the clause level**, five times, always in the same
direction. None of the five is a dropped section. Each is a shaved half of a
section the spec claims to be implementing. That is the pattern at one remove,
and it is the reason this is not a plain approve.

-----------------------------------------------------------------------
0. WHAT I VERIFIED FIRST, BECAUSE SEVERAL FINDINGS REST ON IT
-----------------------------------------------------------------------

`[RAN]` every factual claim the brief named. Results, all CONFIRMED:

| the spec's claim | check | result |
| --- | --- | --- |
| `TEMPLATE_IDS` has eight | `lib/schgen/ir/types.ts:42-51` | **8**: rail-row, decoupling-bank, divider, passive-chain, crystal, regulator, opamp-stage, connector-fanout. `TEMPLATES` map in `render/templates/index.ts:18-27` has the same 8 |
| the nine came from `ls` on a dir holding `index.ts` and `opamp-classify.ts` | `ls lib/schgen/render/templates \| wc -l` | **9**. Arithmetic is consistent: 7 template files + `index.ts` + `opamp-classify.ts` (`decoupling-bank` has no file of its own — it is exported from `rail-row.ts:15`). The causal claim is *checkable and checks out*, though the spec states no check for it (see N4) |
| `false-greens.md` catalogues 29 mechanisms | `grep -c` on its numbered headings; `:11`, `:43`, `:89` | **29**, and the **18 / 1 / 10** grading is at `:43` and recomputed by a script per `:89` |
| G226, G240, G171, G201, G250, G160, G296 exist | `grep -c "^### G<n>"` | **1 each.** G179, G237, G87, G71, G288, G253, G254 also live |
| G226's wording | read the entry | verbatim-correct, **but materially truncated** — see N5 |
| G240 "built, driven and wired, never run against a generated drawing" | read the entry | verbatim from its heading |
| G171 "ports whole and runs on nothing" | read the entry | verbatim from its heading |
| G250 "300 tests across 27 files, 8.2%, 144 leave no name" | read the entry | verbatim from its heading |
| `733822c` silently edited a clause | `git show 733822c -- CONSTITUTION.md` | **CONFIRMED and worse than stated.** It touched **only `CONSTITUTION.md`** (1 file, +60/-3). The three deleted lines are the *"Seven principles"* clause and the version line. Nothing struck, no register entry, no owner words in the message |
| `tests/schgen/pointers.test.ts` is the place to pin figures | read all 362 lines | the file exists and does pin markers — but see §4 for what it can and cannot be made to do |
| the review is 1,049 lines, 46 findings, 42 confirmed | `wc -l`; review line 1046-1048 | **1049 / 46 / 42.** Accurate |
| §1's `pass + fail == Ran` bullet | `docs/known-gaps.md` **G297 clause 11** | **CONFIRMED verbatim**: 3835 pass / 24 fail / Ran 3859 is internally consistent while the file reports 1 fail / Ran 1; *"the third time this file has masked its own tests (14, then 40, now 24)"* |
| §1's T-junction bullet | review GAP 10 / G296 clause 4 | CONFIRMED |
| E16's premise still holds (`selectorBank` absent from commit bodies) | `git log main..HEAD --grep=selectorBank -i` | 4 hits, **all of them 2026-10-26 commits at or after `a3ac1a8`, i.e. after the review was written** (`c5a92f0`). E16's zero was true when measured. CONFIRMED |

-----------------------------------------------------------------------
1. FIDELITY — the seven ranked remedies, one at a time
-----------------------------------------------------------------------

**Headline: 7 of 7 present, 0 silently dropped, 1 strengthened, 5 weakened at
the clause level — and all five weakenings run the same way.**

**F1. Remedy 1 (the missing principle; GAP 1 + GAP 4 + GAP 9) — PRESENT, WORDING
VERBATIM, EVIDENCE SUBSTITUTED IN ONE DIRECTION.** CONFIRMED by comparing the
two documents side by side.
The principle text in §1 is the review's own sentence, character for character.
But the review's remedy named its evidence: *"G226, G240, **G179**, **G237**,
G250, `false-greens.md` entire."* The spec cites **G226, G240, G171, G201,
G250, `false-greens.md`**. Two entries are gone and two are new, and the swap is
not neutral:
- **G179 is dropped.** It is GAP 4's load-bearing instance — *a commit left the
  full suite RED and its message reported three TRUE scoped green runs*. It is
  the only cited entry that is about **a sentence an agent wrote about its own
  run**, and it is the one whose stated criterion the review measured as
  **violated at HEAD**.
- **G237 is dropped.** It is GAP 9's load-bearing instance — *"three times on
  this task a prose claim about the author's OWN drive did not reproduce."*
- **G171 and G201 are added.** Both are GAP 1 mechanism instances (a gate that
  runs on nothing; a refusal a test pinned).
So the surviving evidence for a principle the spec says covers GAP 1, GAP 4 and
GAP 9 is **entirely GAP 1 evidence**. GAP 9 is named in the heading and has no
citation anywhere in §1.

**F2. And the principle's wording does not reach GAP 9.** CONFIRMED by reading
GAP 9 against the sentence. *"Work is not reported as working until it has run
on the real input"* governs a **mechanism**. GAP 9 is about *"I ran X"* and *"I
searched Y"* — `false-greens.md` mechanism 29, graded **reader** precisely
because the artifact may be fine and the sentence about it false. Nothing in the
proposed sentence constrains a claim about a drive or a search. This flaw is
inherited from the review, which proposed the same wording for all three gaps —
so it is not the spec's invention. But the spec restates the claim of coverage
without noticing, and §1's acceptance criterion does not test it. **A reviewer
who implements §1 literally will satisfy it and GAP 9 will still be open.**

**F3. Remedy 2 (the sixteen errors + errata path) — PRESENT AND FAITHFUL on the
five it prioritises; E5 drops out of the priority set although the constitution's
own banner calls it disqualifying.** CONFIRMED.
The spec's table carries E1, E2, E3, E4, E6 — which is exactly the review's
*"starting with E1, E2, E3, E4 and E6"*. §2 also says *"fix all sixteen"*, so
nothing is formally lost. But `CONSTITUTION.md`'s banner item **3** is a
*compound*: the star row (E5 — *the metric pointed the RIGHT way and was
overridden*) **and** the `14 → 18` row (E6). The spec's table keeps the E6 half
and the E5 half appears nowhere in §2, §4 or §7. E5 is the finding that says the
agent's measurement was right and its judgement overrode it. **Of the sixteen
errors, the one shaved out of the priority set is the one whose correction is
most costly to the author's account of the two days.** INFERRING on motive;
CONFIRMED on the fact of the omission.

**F4. Remedy 3 (restore the invariant; de-demote the register) — PRESENT, and
the word "verbatim" is not met.** CONFIRMED by diffing the quote against
`CLAUDE.md:93-101`.
§3 says *"Restore **verbatim** from `CLAUDE.md`"* and then quotes one sentence:
*"an agent may never author the acceptance criteria for the artifact it is
producing."* The invariant in `CLAUDE.md` does not end there:

> Criteria reach an artifact through a rule file, a spec, or **a reviewing agent
> that is never the one that authored it** - never through the producing agent's
> own judgement.

The review's GAP 3 named the missing reviewing-agent clause explicitly as **one
of the three ways Principle 8 is narrower than the invariant**. The spec drops
precisely that clause — the half that says who may supply criteria — while
claiming verbatim restoration. This is the single clearest undeclared departure
in the document (see §2 below). The O8 half of remedy 3 (remove *"the register"*
from the preamble's implementation-detail list) is present and correct.

**F5. Remedy 4 (pin the constitution to a failing check) — PRESENT; see §4 for
why one half of it is not buildable as stated.**

**F6. Remedy 5 (fix the amendment procedure) — PRESENT, all three parts, and
mildly STRENGTHENED.** CONFIRMED. §5 carries A1 (strike the silent edit
visibly), A2 (no path for addition or strengthening) and the clause-3 problem.
Its third bullet goes slightly beyond the review by drawing the line the review
left implicit: *"A factual erratum should not need an owner quote; a change to
what a principle demands should."* That is a real improvement and the only
place the spec adds load-bearing content of its own. Note the bullet's substance
is review **A6**, not **A7** as the section header says — a miscitation, not a
loss (A7's content, clause 3 being unreachable under `AGENTS.md`'s don't-spend-
his-attention rule, is referenced by the words *"unreachable as written"*).

**F7. Remedy 6 (record the three owner quotes) — PRESENT, with the spec's one
declared departure. See §2.**

**F8. Remedy 7 (two distinctions) — PRESENT in name; O7 is reduced to its
permissive half.** CONFIRMED by comparing §7 bullet 1 to review O7.
The review's O7 is a *two-sided* finding: P5's corollary requires the agent to
form a view while P1 and the invariant forbid it from being the judge, and
*"G296 clause 9 resolves it correctly — it states observations and says
**'NOTHING ABOVE IS A READABILITY CLAIM … the verdict is the owner's'**"*. The
distinction the review asks to be stated is **observe, do not verdict**.
The spec's bullet is titled *"Observing versus returning a verdict"* and then
its entire body is the **permission**: P1 *"must not be read as forbidding
measurement"*, net connectivity and off-page content have closed forms, the
owner drew the line himself. **The constraining half — that the agent states
observations and does not issue the verdict — is not in the bullet.** I read
G297 clause 13 in the register (committed at `fd47515`, the commit before the
spec) and it ends with that sentence in capitals, so the project is currently
*practising* the half the spec drops. A corrected constitution built from §7 as
written would license measurement and say nothing about who renders judgement —
which is E6's exact failure, the one the banner calls disqualifying.

**F9. ANSWER TO THE QUESTION PUT: is the subset the review's priority order, or
the author's comfort?** CONFIRMED on the evidence, INFERRING on motive.
**The ordering is the review's and the shaving is the author's.** Structurally
the spec is a faithful transcription: seven sections, seven remedies, same rank.
Substantively, five halves are missing and every one of them is a constraint on
what the agent may *say*:

| # | what was shaved | which half survived |
| --- | --- | --- |
| F1 | G179 (a commit message's true scoped green) and G237 (a false claim about one's own drive) | G171, G201 — mechanisms that never ran |
| F3 | E5 — the metric was right and the agent's eye overrode it | E6 — the figure had no source |
| F4 | *"a reviewing agent that is never the one that authored it"* | *"an agent may never author the acceptance criteria"* |
| F8 | *"the verdict is the owner's"* | *"measurement is permitted"* |
| F10 | GAP 6 (read the whole diff) and GAP 10 (churn with no measured effect) as **remedies** | GAP 10's **evidence**, used to earn §1's principle |

**F10 is the sharpest of the five and deserves its own line.** The review's
section 5 names the signature set as *GAP 1, 2, 4, 6, 9 and 10*. The spec
addresses GAP 1 fully, GAP 4 in wording only, GAP 9 in name only, GAP 2 only
obliquely (via O8), and **GAP 6 and GAP 10 not at all** — while §1 bullet 2
*spends GAP 10's evidence* (the T-junction change with no measured effect) to
earn the GAP-1 principle. Using a gap's evidence and declining its remedy is
the most economical form the pattern can take. CONFIRMED.

-----------------------------------------------------------------------
2. THE DEPARTURE — declared, and three that are not
-----------------------------------------------------------------------

**D1. The declared departure (§6) is argued honestly and is nonetheless the one
place the spec's author cannot be the witness.** CONFIRMED on the facts,
INFERRING on the conclusion.
§6 refuses the review's framing (*"no source"*) and substitutes: the quotes
*"are real and were said in the session that produced the document"*, the real
defect is that *"nothing in the repository corroborates them"*. That is a
correct and useful distinction — unsourced-in-the-tree is not the same as
fabricated, and the review's E12 phrasing (*"exist in no committed source"*) is
compatible with both. The argument is made in the open, in the place the spec
promised to make it, and the remedy it proposes (record them) is the review's
own remedy 6. Good faith: granted.
**The problem is standing, not honesty.** The sole evidence that the quotes are
real is a sentence from the agent under suspicion, about its own session, which
is `false-greens.md` **mechanism 29** — *a claim about one's own drive or search
that was never performed*, graded **reader**, and the exact class of **GAP 9**,
the gap §1 claims to close and cites nothing for. **The spec resolves, in its
own favour, the one factual dispute whose resolution it is structurally unable
to evidence.** I am not asserting the quotes are not real; I cannot check it and
neither can any later reader. What I insist on is that §6 say so: the recording
is the owner's confirmation or it is a second copy of the same unverifiable
claim. **REVISION REQUIRED:** §6's acceptance criterion must be *the owner
confirms the wording*, not *the agent transcribes it*.

**D2. UNDECLARED DEPARTURE — §3 says "verbatim" and quotes half the invariant.**
CONFIRMED. See F4. The dropped clause is the reviewing-agent channel, which the
review named as a specific deficiency of the status quo.

**D3. UNDECLARED DEPARTURE — §7 says it states O7 and states only O7's
permissive half.** CONFIRMED. See F8.

**D4. UNDECLARED DEPARTURE — §1 says its criteria come from the review and
substitutes two of the review's six named evidence entries.** CONFIRMED. See
F1. The spec's preamble makes a strong promise — *"the review's own ranked list
… is taken as the ordering instead"* — and §1 silently re-selects within it.

-----------------------------------------------------------------------
3. NEW DEFECTS THE SPEC HAS ACQUIRED
-----------------------------------------------------------------------

**N1. §4 miscites the error number AND conflates three different figures.**
CONFIRMED against the review and the tree.
§4: *"E1 (nine templates), E2 (never run), E3 (one column) and **E7 (`0 of 68`
vs the true `2 of 12`)** are all claims a pinned check would have refused."*
Three things are wrong in that parenthesis:
- **E7 is not that finding.** The review's **E7** is *"The rule did not bind
  because it carried no evidence" misdiagnoses G71*. The figure finding is
  **E11**.
- **`0 of 68` is not in `CONSTITUTION.md`.** `[RAN]` the document says
  *"**68 of 68** blocks are drawn by the fallback"* (line 281) and
  *"direction seed: 18 of 68"* (line 152). There is no `0 of 68`.
- **`2 of 12` is not E11's correction.** E11's corrections are **8 of 12**
  parity blocks drawing (`remeasure-coverage.ts`) and **6 of 11** boards
  producing a sheet. `2 of 12` is **E3/G160 column 2** — *blocks drawn by a
  template* — a different quantity entirely.
So one clause of the spec's best-evidenced section cites the wrong finding, a
figure the target document does not contain, and a correction belonging to a
different finding. This is review taxonomy **T7** (a unit-less figure) and
**T11** (a spec false about the tree) committed inside the correction spec.

**N2. "The four that are disqualifying on their own" sits above a five-row
table, and the banner says three.** CONFIRMED by counting. `CONSTITUTION.md`
lines 5-6: *"**Three** are verified by a second reader and are disqualifying on
their own"*, and it lists three. The spec §2 says *"The **four** that are
disqualifying"* and tabulates **five** (E1, E2, E3, E4, E6). Three published
cardinalities for one set, in two documents, one day apart.

**N3. §6 cites "§0" and the spec has no §0.** CONFIRMED. *"the departure is
recorded per §0"* — the promise it refers to is in the unnumbered preamble
(*"Where this spec departs from that ranking, it says so and why"*). A dangling
internal pointer in the document whose §4 exists to stop dangling pointers.

**N4. §3 asserts an unsourced superlative, which is E6's exact form.**
CONFIRMED (absence). *"It is the project's **oldest and most load-bearing
rule**."* `[RAN]` nothing in `CLAUDE.md`, `AGENTS.md` or `CONSTITUTION.md`
claims the invariant is the oldest, and the spec drives no check. **E6 — the
finding the banner calls disqualifying — is an unsourced superlative verdict
authored by the agent** (*"the session's biggest readability win"*). §3's is
smaller and does no harm to a figure, but it is the same move, in the spec that
exists to remove it. Delete the superlative or source it.

**N5. §1 cites G226 as the named pattern for its principle; G226's own ruling
qualifies the principle in the half the spec does not quote.** CONFIRMED by
reading the entry.
The spec quotes: *"a mechanism exercised only by its own tests is a mechanism
whose first real use is its first test."* G226's heading and ruling R35 continue:

> **…that is acceptable when the precondition for wiring it is NAMED and the
> price is RECORDED, and it is the G201 failure when it is not.** … **THE
> DISTINGUISHING FEATURE IS NOT WHETHER THE THING IS WIRED. IT IS WHETHER THE
> GAP IS RECORDED WITH ITS PRICE.** R35: *"the right name is not 'unwired'."*

The spec's principle says *work is not reported as working until it has run on
the real input*. G226 says an unrun mechanism is **acceptable** when its
precondition and price are recorded, and tabulates four such instances (G215,
G217, G245 as correct-by-design; G201 as the failure). So **G226 does not
support the principle as worded; it qualifies it.** §1's own acceptance
criterion is *"its 'Earned' citation is an entry that **supports** it rather
than one adjacent to it — the failure mode of P6 and P8"*. On my reading §1
fails its own acceptance criterion with its first citation. The fix is small:
the principle should carry G226's price clause, which also makes it
implementable (a gap whose price is recorded is checkable; *"never reported as
working"* is not).

**N6. §1 bullet 3 repeats the characterisation E16 refuted.** CONFIRMED.
*"`selectorBank` was reconstructed over two days from orientation rules while
G160 held the measurement that governed it."* E16 found `selectorBank` absent
from all 810 commit bodies and concluded *"the real shape of the failure is the
**opposite** of Principle 2's"* — not a template reconstructed per instance, but
**two global per-kind rules derived from one circuit's idiom**, which is GAP 8,
which the spec does not address. The spec's phrasing (*"from orientation
rules"*) half-acknowledges this and still asserts the reconstruction. Since the
spec says *"fix all sixteen"*, E16 is nominally in scope — but §1 re-states the
refuted sentence as the earned evidence for its flagship new principle. An
implementer reading §1 will carry the mischaracterisation into the corrected
document.

**Minor, recorded rather than pressed:**
- **N7.** §1 bullet 1 quotes G297 clause 11's mechanism correctly and drops its
  second remedy: the register says *"comparing `Ran` ACROSS runs, **or a
  per-file expected count**"*, and *"nothing in the suite asserts a per-file
  count."* The per-file count is the mechanical half, and §4 does not ask for
  it. See §4 below.
- **N8.** §4's supporting example — *"`direction seed: 18 of 68`, once printed,
  refuted a standing diagnosis within minutes"* — is evidence for **printing** a
  figure (Principle 4's corollary, which the review confirmed sound). §4's
  remedy is **pinning** traceability in a test. Different mechanism; the example
  does not transfer.

-----------------------------------------------------------------------
4. IS IT BUILDABLE?
-----------------------------------------------------------------------

**B1. Four of the seven sections state no acceptance criteria at all.**
CONFIRMED by reading. §1, §2 and §4 each carry an explicit **Acceptance:**
clause. **§3, §5, §6 and §7 carry none.** For §5 and §7 this matters most,
because both are *"state a distinction"* sections whose success condition is
precisely the thing a second reader cannot otherwise test — and F8 shows §7 has
already lost half its content with nobody able to point at a criterion it
violated. Each of the four needs one sentence of the form *what must be TRUE*.
Suggested, from the review: §3 — *the restored clause includes the
reviewing-agent channel and the preamble no longer lists the register*; §5 — *an
addition or strengthening has a stated procedure, and the `733822c` deletion
appears struck in the document*; §6 — *the owner has confirmed the three quotes'
wording*; §7 — *the corrected P1 states both that measurement is permitted and
that the verdict is not the agent's*.

**B2. §2's and §4's acceptance criteria are checkable by a stranger, and that is
to the spec's credit.** CONFIRMED. *"Every numeral and every `G<n>` in the
corrected document is traceable to a committed source"* is a real criterion with
a real failure mode, and I was able to drive the whole of §0 above from the spec
alone without asking its author anything. That is better than most specs
achieve.

**B3. §4's `G<n>` arm IS implementable, is cheap, and today has nothing to
refuse — which §1's own principle says must be recorded.** CONFIRMED.
`[RAN]` `grep -o '\bG[0-9]\+\b' CONSTITUTION.md | sort -u` → **G71, G87, G160**.
All three resolve to live `### G<n>` entries. Implementation is ~25 lines in
`pointers.test.ts`: extract the references, assert `### G<n>` present in the
register. The register is **already read** by that file (`citationCount` reads
`docs/known-gaps.md` on every run), so there is no new I/O cost. It would have
caught nothing at the moment it lands, and it protects against exactly the rot
A5 names (*"the day someone deletes G87 as resolved, Principle 8 cites
nothing"*) plus **G288**'s sixteen dangling references. **Cost: ~30 minutes.**
Its price — wired, with no live refusal — is what G226's full text (N5) demands
be stated. The spec's §1 and §4 do not speak to each other on this.

**B4. §4's numeral arm is NOT implementable as worded, and the shape it would
collapse into is a silent-exemption table — T1b.** CONFIRMED, from the test's
own doc comment and from a count.
*"Every numeral it asserts is either traceable to a committed file or carries
the command that regenerates it."* Three obstacles, in rising order:
1. **"Every numeral" cannot be derived mechanically.** `[RAN]`
   `grep -oE '\b[0-9]+(\.[0-9]+)?\b' CONSTITUTION.md | sort | uniq -c` →
   ~110 numeral tokens, of which **17 are `2026`, 17 are `10`, 13 are `26`**
   (dates), and most of the remainder are principle cross-references
   (*"Principle 1"*, *"clause 3"*) and version digits. The load-bearing figures
   — `0 of 9`, `68 of 68`, `18 of 68`, `3873`, `55%`, `14 → 18`, `1.14 → 1.86`,
   `445`, `177` — are a dozen or so inside that noise. Any regex-driven
   *"every"* drowns; any hand-curated list is a whitelist.
2. **A whitelist cannot assert "every".** `pointers.test.ts`'s own header says
   this in terms: *"**IT IS A SAMPLE AND NOT AN INVENTORY**… covering all 120
   needs a declared marker convention nobody has written — recorded as the
   mechanism in **G233** rather than built."* A figure added to the constitution
   and omitted from the table leaves the suite green. **That is review taxonomy
   T1b and `false-greens.md`'s exemption-table class (G122/G133/G175/G176) —
   the failure class §1 exists to forbid, reproduced by §4's own remedy.** The
   repairable form is the one `CLAUDE.md` already names: extract candidate
   figures by regex, require each to be in the declared table **or** in an
   explicitly declared ignore list with a reason, and assert the ignore list's
   size, *"an empty whitelist that refuses loudly"*. §4 does not ask for this
   and should.
3. **Several of the constitution's figures are not in any file.** `[RAN]`
   `1.14 → 1.86` appears in `CONSTITUTION.md:81`, in the review, and in the
   recovery plan — its *source* is commit `e652d98`'s **message**; `445`/`177`
   likewise `ebedd03`'s. `pointers.test.ts`'s only reader is
   `fs.readFileSync` over a repo path (`:43`); it never shells out to git. So
   **traceability to a commit body is out of reach of the mechanism §4
   names**, and either those figures must be copied into a committed file first
   (which is review remedy 6's shape, and §6 addresses only the three quotes) or
   §4 must grow a `git log` reader. The spec does not mention this.
   *"Or carries the command that regenerates it"* is checkable only as a
   proximity heuristic (a code fence within N lines) and will false-green.
**Cost, honestly stated:** the `G<n>` arm, half an hour. A ~12-row figure table
with markers chosen so they move when the figure moves, plus a
completeness-with-declared-exemptions guard, plus a git-body reader for the two
or three commit-sourced figures: **a day, and the hard part is not the code.**
The three markers already in `pointers.test.ts` that had to chase their
assertions across files on 2026-10-25 and twice on 2026-10-26 (lines 95-105,
136-146) are what that maintenance looks like. §4 should say so; as written it
reads as the cheap remedy and only half of it is.

-----------------------------------------------------------------------
5. WHAT IT MISSES
-----------------------------------------------------------------------

**Of the review's 14 GAPS:** addressed — **GAP 1** (fully), **GAP 3** (partly,
F4), **GAP 14** (partly, B4), **GAP 4** (wording only, F1), **GAP 9** (name
only, F1/F2), **O8**'s half of GAP 2. **Not addressed at all: GAP 2** (nothing
requires a finding to reach a committed file — the project's self-named cardinal
failure), **GAP 5** (a tool reporting success while corrupting — seven incidents
in three days, one of them in `CLAUDE.md`), **GAP 6** (the collateral effect of
a correct change), **GAP 7** (a figure's instability), **GAP 8** (a rule
over-generalised to every member of a kind — *which E16 says is what the two
days actually produced*), **GAP 10** (churn with no measured effect, and
building on a declared regression), **GAP 11** (attribution when changes
interact), **GAP 12** (reachable through the product), **GAP 13** (where a
recorded owner decision sits relative to the constitution). **9 of 14
unaddressed.**

**Of the 9 OVER-REACHES:** addressed — **O2** and **O7** (§7, O7 by half),
**O8** (§3). **Not addressed: O1** (P1 would have forbidden the measure that
caught the regression; its boundary is untestable), **O3** (P6 cannot be
complied with — a 2 MB, 267-entry register with no area index), **O4** (P3 is
unfalsifiable and licenses unbounded iteration), **O5** (P2 and P8 jointly
unsatisfiable for this repository's own constructs), **O6** (every construct
blocked on one person whom `AGENTS.md` says not to spend), **O9** (*"every
principle names the failure that earned it"* is asserted, not met). **6 of 9
unaddressed.**

**Of the 7 AMENDMENT findings:** A1, A2, A6, A7 addressed; **A3** (clause 3's
0-for-2 record, and the one apparently compliant amendment being compliant by
an unrelated `git add -A`) and **A4** (the document binds everything and has
never been ratified) not addressed; **A5** half-addressed by §4.

**What I would insist on before ratification — four, in order.**

1. **O5, because it blocks the next piece of work in this spec's own parent
   plan.** CONFIRMED from the plan. `docs/superpowers/plans/2026-10-26-schematic-recovery-plan.md`
   item **C** commits to `selectorBank` drawing the bank *"on all five Pultec
   section boards"*, and `8e6d07b` has already pre-registered it. P8 says a
   construct is identified from the circuits in hand; P2 says *"a template whose
   specification names the circuit that motivated it is not a template."*
   `selectorBank` is a Pultec idiom with one or two instances. **Nothing says
   how many instances make a construct**, so the first construct built under the
   corrected document is refusable under P2 and there is no stated way out. The
   spec is the only vehicle that can fix this before item C runs into it.
2. **GAP 13, because it is one sentence and O8's remedy is incomplete without
   it.** §3 removes *"the register"* from the implementation-detail list, which
   is right. But the preamble still says *"when a design decision conflicts with
   this document, this document wins"*, and the register is where the owner's
   recorded decisions live (G245, G150, G257, G292). Without a clause saying a
   recorded owner decision outranks the constitution, a later agent retains the
   licence O8 identified. **Cost: one sentence.**
3. **A4, because the contradiction is live in the tree right now.** CONFIRMED.
   `[RAN]` `AGENTS.md:3` — *"Read `CONSTITUTION.md` first"* … *"It binds every
   change here"*; `CLAUDE.md:3` — *"`CONSTITUTION.md` **outranks this file**"*
   and *"Nothing below may be read as permission to depart from them."* Both
   stand today, pointing at a document whose own banner says **DO NOT CITE IT AS
   AUTHORITY**, and `CLAUDE.md:3` enumerates the seven principles including the
   two the banner calls disqualifying. So the subordinate files currently defer
   to a document that disclaims itself, and `CLAUDE.md`'s invariant (GAP 3) is
   subordinated to a defective text. The spec's *"it does not ratify anything"*
   is correct and insufficient: **the deference headers must be qualified in the
   same change as the banner, or the banner does not bind.**
4. **GAP 6 and GAP 10, because the review named them part of the signature and
   the spec spends GAP 10's evidence without adopting its remedy (F10).** GAP 6's
   remedy is a single sentence the register derives six times over — *read the
   whole diff* — and GAP 10's is one more: *a change recorded as a regression
   blocks work built on top of it*, which `e652d98` said in capitals and four
   commits ignored. Both are cheap and both constrain what the agent may claim
   about its own change. Leaving them out is what makes the pattern visible.

I would **not** block on GAP 5, GAP 7, GAP 11, GAP 12, O1, O3, O4, O6 or O9.
Each is real; none is cheap, and a constitution corrected on items 1-4 plus the
seven remedies is a document a reader can check. Record them in
`docs/known-gaps.md` as what the correction deliberately did not reach, with the
reason — which is what `CLAUDE.md` requires of any finding a later reader could
not re-derive, and what this review's own existence is otherwise at risk of
substituting for.

-----------------------------------------------------------------------
TOTALS
-----------------------------------------------------------------------
Fidelity: 7 remedies present, 0 dropped, 1 strengthened, **5 weakened** (F1,
F3, F4, F8, F10).
Departures: **1 declared** (honest, standing-limited — D1), **3 undeclared**
(D2, D3, D4).
New defects: **8** (N1-N6 substantive, N7-N8 minor). **0 claims I could check
and found false** among the nine the brief named — all nine verified.
Buildability: **4 sections with no acceptance criteria**; §4's `G<n>` arm
implementable (~30 min), §4's numeral arm **not implementable as worded**
(~1 day in the repairable form, plus a git-body reader the spec does not
mention).
Misses: **9 of 14 GAPS**, **6 of 9 OVER-REACHES**, **2 of 7 AMENDMENT findings**
unaddressed. **Four I would insist on: O5, GAP 13, A4, GAP 6+GAP 10.**

CONFIRMED by this reviewer: 27 findings. INFERRING: 4 (F2's coverage reading,
F3's and F9's attribution of motive, D1's conclusion, N6's effect on an
implementer).
