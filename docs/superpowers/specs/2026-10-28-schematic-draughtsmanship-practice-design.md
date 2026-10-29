A schematic draughtsmanship practice, assembled from what exists
================================================================

**Status: design, approved in conversation section by section on 2026-10-28.
Not implemented. No code follows from this document until the owner has
reviewed it as written.**

What this is
------------

A **practice** for drawing, judging and recording schematics: who drafts, what
tool they drive, what may stop a drawing reaching a reviewer, who may call it
good, and where that verdict is kept.

**It is a selection and an integration, not an architecture.** Every element
below is either a tool somebody else maintains, a check this repository already
has, or a rule the owner stated. Where something has no precedent, this document
says so rather than presenting it as a choice.

**Scope: schematics only.** The owner, 2026-10-28: *"I will believe you have the
capability to expand those effort beyond the scope of schematics draftsmanship
when and if I see real utility in what we create in that regard."* Nothing here
is designed for the other output classes, and no seam is left for them.

**The practice is the goal; the Pultec boards are the case studies.** The owner:
*"we are building a general schematic drafting practice with the pultec modular
circuits as case studies... The set of use cases will expand rapidly."* So
nothing may assume a Pultec section board. `transistor-preamp-lab` is already in
the repository and is a different shape.

**Circuit generation is out of scope.** The input is a circuit's connectivity.
Where it comes from is not this practice's business.

The evidence this rests on is mapped in
[`../../research/2026-10-28-solution-space-map.md`](../../research/2026-10-28-solution-space-map.md),
over twelve research documents and five hands-on trials, all dated 2026-10-28.

Decisions
---------

| Decision | Who | Why |
| --- | --- | --- |
| Schematics only; nothing designed for the other output classes | owner | two prior attempts at a drafting practice failed; capability has to be shown before scope is widened |
| A general practice, with the Pultec boards as cases | owner | the case set will expand rapidly; nothing may assume one board's shape |
| Reviewer is a ROLE, currently filled by the owner alone | owner | *"don't invent a perverse project-wide rule that I am the only true arbiter. For now, I am the only trusted reviewer"* |
| Derived drawings are COMMITTED, not gitignored | owner | *"git is a distributed, journaled filesystem... a disciplined set of evolving, agent-driven (and siloed) schematics is absolutely git-worthy"* |
| Generated drawings are siloed so they can never be mistaken for hand-drawn ones | owner | *"I never want my work thrown away. As such, you must make SURE I dont mistake your generated schematics for ones I can touch"* |
| Only an ELECTRICAL fault may withhold a drawing from the reviewer | owner | a legibility check is an unqualified review; it may not decide what the reviewer sees |
| Approval is never derived from a check | owner | *"you can't promote a drawing to approved without showing me"* |
| Approval status is tracked state | owner | *"you have to track the approval status"* |
| The record lives in a file in git, never a database | owner | *"postgres is opaque 20th-century nonsense"* |
| Draft with copperhead, revise with akcli-kicad | **owner, on the drawings** | shown nineteen rendered pages labelled by tool and asked which worked well enough to consider, the owner, 2026-10-28: *"copperhead is the best overall. Circuitkz is my second choice."* akcli is the only agent-driven surface with a lint loop. **Microsoft SchGen was never run and is absent from that comparison** |
| No legibility SCORE is adopted | evidence | the only published one ranks the owner's own drawing level with the known-bad board |
| No placement-intent format of our own | evidence | fourteen systems surveyed, adopt nothing; the one project that built it calls it legacy |
| No reliance on exit codes | evidence | a page missing a third of its circuit exits 0 from every tool in the chain |

1. The stack
------------

| Job | Tool | Standing |
| --- | --- | --- |
| Draft | **copperhead** (Apache-2.0) | drew `pultec-low-boost` with nothing faked, from one command; real rotary with its mechanical lug; title block with a revision. Ranked first of nineteen rendered pages by the owner, 2026-10-28 |
| Revise | **akcli-kicad** (PyPI) | the agent places every coordinate; `pins --at X Y --rotation R --json` answers where a pin lands before anything is written; `plan` dry-runs with a net diff; refuses non-axis-aligned endpoints; journal and undo |
| Render | `kicad-cli` | already a repository dependency; `make check` invokes it |
| Says the circuit | `lib/schgen/gates/connectivity.ts` | fourteen tests, predates this work, judges any sheet against the model |
| Named legibility checks, **peripheral by design** | copperhead's `out-of-frame`; `kicad-sch-lint` codes | they catch the countable minor defects, not the ones that matter - see "The lamp-post problem" |
| See what changed | two `kicad-cli sch export pdf` runs, three `magick` calls | as readable as the dedicated diff tools, with no install |

**The two drafting tools compose** because both read and write the same
`.kicad_sch`. Measured: akcli writing one operation into this repository's own
generated sheet changed exactly six token families by +1 each, with
`global_label` 13 to 13 and all fifteen net names intact.

**Two refusals are part of the selection.** No legibility score, for the reason
in the decisions table. And no driver may test an exit code: `copperhead draft`,
`--json`, `score`, and `kicad-cli sch erc` all exit 0 on a page missing a third
of its circuit. Drivers parse JSON.

The lamp-post problem
---------------------

**This is the failure mode that produced the two previous attempts, and it will
recur unless it is named.** The owner, 2026-10-28:

> *"Label and wire collisions are not actually that big of a problem. I can still
> understand a schematic with some collisions. The biggest problem is rats nests
> with wires and part placement/orientation that don't make any sense... then,
> it's really hard to make sense of what I'm looking at.*
>
> *Previous efforts have obsessed over text collisions and utterly ignored rats
> nests, hairpins, and non-sensical orientations. I chalk that up to the lamp
> post problem: collisions are easy for an algorithm to detect; rats nests,
> hairpins and orientation goofiness is much harder to quantify so agents ignore
> them because they're hard to pay attention to."*

**Attention follows measurability, and the measurable defects are the minor
ones.** Three invented readability metrics went to text collisions because text
collisions are countable. The defects that make a drawing unreadable - a rats
nest, a part facing the wrong way, an arrangement that does not correspond to
how the circuit works - have no published check anywhere, which the solution-space
map establishes independently.

**Two consequences bind this design:**

1. **The named checks are peripheral and are labelled so.** They may be run and
   reported; they may never be the measure of a drawing, and a page with none of
   their findings is not thereby good. The ranking in the map makes this concrete:
   the only published legibility score placed a page missing a third of its
   circuit second of six.
2. **The reviewer's eye is not a stand-in for a future checker. For the defects
   that matter it is the only instrument that exists.** That is a stronger
   footing for the practice than "a human until the tooling catches up", and it
   sets a real bar for any agent that later wants the reviewer role.

**This rule was broken in producing this document.** Across six occasions on
2026-10-28 the agent sent the owner rendered pages and, on five of them, ranked
them without asking for his judgement - *"the best-drawn region either of us
produced"*, *"the best page it produced"* - and committed *"best page produced by
anything"* into the research map. The owner: *"you have confidently reported to
me that copperhead is 'better' than other tooling... How could you possibly judge
the quality of the output of the tools you've been evaluating?"* The verdicts
have been struck from both documents and the stack selection marked provisional.
**The failure is recorded rather than edited away, because a rule broken while
being written down is the best evidence it needs to exist.**

**And a rule on the producing agent, from the same correction:** the owner,
*"you are falling into the trap of presupposing what makes for a legible drawing
when, in fact, you have no eyes."* **The drafting agent reports observations and
never verdicts.** "This wire runs from here to there", "this label sits on this
wire", "there are N crossings", "this block's input is on its right" are
observations. "This reads well" and "I would build from this" are verdicts, and
they belong to the reviewer. The agent that drafted a sheet stating its own page
is good is the governing invariant failing in conversation rather than in code.

2. The loop
-----------

1. **Draft.** Copperhead produces a page from the circuit's connectivity and a
   grouping.
2. **Electrical check, and only electrical.** Connectivity against the circuit
   model, and ERC. A failure here stops the iteration, because the drawing says
   a different circuit and there is nothing to judge. **Nothing else withholds a
   drawing.**
3. **Legibility checks run, never gate, and are peripheral.** Their findings are
   attached as a pointer list. **A finding does not make a drawing bad; no
   finding does not make it good** - and none of them touches the defects that
   actually make a drawing unreadable. See "The lamp-post problem".
4. **Render, and overlay against the last approved revision.**
5. **Show the reviewer. Always.** Every revision that passes the electrical
   check is put in front of the reviewer. No agent decides the reviewer does not
   need to see something.
6. **The reviewer judges the page, readability first** - whether it is a rats
   nest, whether the parts face sensible directions, whether the arrangement
   corresponds to how the circuit works. Before any detailed check. The source for this is also the reason it matters: that judgement is
   perishable, and the detailed passes spend it. Nothing that drafted the sheet
   or read the netlist can make this call.
7. **The verdict is recorded** against that revision, attached to the region it
   is about.
8. **The agent revises with akcli**, driving the lint count down. Measured on
   this circuit: 22 findings to 13 to 1, with the lint naming every collision a
   reader found by eye plus five it had missed.
9. **The back-check.** The reviewer says *what is wrong*, not *what to do about
   it*. The agent derives the fix. Because an agent applies a correction
   perfectly and without resistance, the region it just changed is the part of
   the drawing only one party has considered, so **it is flagged for the
   reviewer first on the next round.**

**Step 9 is the only step with no tooling behind it.** Everything else is a
command that was run on 2026-10-28.

2a. The hand-placement pass
---------------------------

**Kept in the toolkit on the owner's instruction, 2026-10-29**, after it
produced a page he accepted: *"the work you just did with akcli-kicad is
promising… this process is worth keeping in the toolkit."*

It is the pass for drawing to a **layout reference** - an arrangement someone
has already accepted - which copperhead cannot do, because it computes every
coordinate and exposes no way to say where the spine runs or what hangs off it.
The worked example is
`docs/research/2026-10-29-low-boost-in-thompson-bell-idiom.md`, drawing
`pultec-low-boost` against Ian Thompson-Bell's 2012 drawing.

**The procedure.**

1. **Look at the reference first**, before placing anything.
2. **Choose every position by judgement and write it as a literal.** Arithmetic
   done while thinking is fine; a loop that computes placement is the forbidden
   thing, and it is how the previous attempt went wrong.
3. **Ask the tool where a pin will land before placing** -
   `akcli pins <lib_id> --at X Y --rotation R --json` is a pure geometry query
   against the symbol library that touches no file. Never compute pin positions.
4. **Dry-run.** `akcli plan` prints a net diff before anything is written.
5. **Wire.** `connect_and_label` refuses non-axis-aligned endpoints rather than
   drawing a diagonal.
6. **Lint, and do not trust it** - see below.
7. **Render and LOOK at the page.**
8. **Verify, re-measuring rather than assuming:** netlist pin-set comparison
   against the circuit model, ERC, and a crossing count.

**Two tool facts that cost a revision each, recorded so they cost nobody else
one.** `akcli` has **no operation for a symbol field's position** - the library
default puts Reference and Value hard against the symbol, which drew six
capacitor values across their own plates. And **a field's stored text angle is
RELATIVE to its symbol's rotation, not absolute**: angle `0` on a symbol rotated
`90` renders **vertical**, and `270` renders horizontal.

**The finding that matters most, because it is this document's own lamp-post
problem happening inside our own process.** On the first attempt
`akcli check --layout` reported **zero layout findings** on a page that drew all
six capacitor values across their plates, put the pot's reference and value
inside its body, and ran the 0V rail through the title block. All three were
found **by looking at the rendered page**. The lint is worth running and is not
worth believing.

3. The record
-------------

**Committed, in `drafted/<circuit>/<board>/`** - a top-level directory, never
under `circuits/`, with a README at its root saying these are agent-drafted and
never hand-edited, and "generated - do not edit" in every title block:

- the `.kicad_sch`
- the rendered page **as SVG**, so git can diff what changed rather than only
  that something did
- a record file carrying:
  - the content hash of the **sheet**, which is the binding; plus the digest of
    the rendered page, which is **evidence and not a binding** - see below
  - the status. **The four states named in this document are a placeholder, not
    a proposal** - an agent may not author the vocabulary its own output is
    judged in. `cargo-vet` is the one surveyed tool with a properly user-defined
    state set, carrying an *implies* lattice rather than a flat list, and is
    worth reading before the owner fixes ours.
  - the reviewer's verdict, **verbatim**, attached to the region it is about
  - the legibility findings as they stood, marked as a pointer list

**It is a text file that diffs**, so a verdict is reviewable in a diff rather
than by querying something. What is settled here is the SUBSTRATE: a file, in
git, next to the drawing, readable by a person without a tool.

**A structured interface over that file is permitted and preferred if one
exists.** The owner, 2026-10-28: *"you *can* use a structured interface to manage
that file, if such a thing exists and is suitable for the task."* The objection
is to opacity, not to tooling - so a CLI or library that creates, queries and
advances these records is reuse, provided the stored form stays human-readable
in a diff. **A tool whose stored form can only be read back through the tool
fails the same test a database fails.**

**One exists: GNU recutils**, and the record is shaped as an in-toto Statement.
Measured (`2026-10-28-git-native-record-tooling.md`):

- The state set is **ours and enforced**:
  `%type: Status enum pending approved approved_with_comment rejected superseded`,
  and `%type: ArtifactSha256 regexp /^[0-9a-f]{64}$/`. Five refusal cases each
  exit 1 **with nothing written**.
- `recfix --check` catches a bad hand-edit with line numbers, so the register
  itself is gateable in `make check`.
- A diff is one line per changed field. Multi-line verbatim text round-trips, so
  the reviewer's words survive unaltered.
- 3.2 MB, system libraries only.

**The sheet binds. The normalised render is a second binding with one untested
assumption.** Measured on this machine: two SVG exports of the same sheet a
second apart differ on **exactly one line** - line 11, the title carrying a
generation timestamp. Strip that line and the render is **byte-identical**, at
the same digest reached independently by two investigations. So
`sha256(svg minus the generation-title line)` is a real binding for "the page the
reviewer read". PDF is not: it embeds `/CreationDate`.

**The untested part is the risk, and it is recorded as a risk rather than
resolved:** stability is measured on one machine, one KiCad version, one font
set. A font substitution would change the path data. Cross-machine and
cross-version stability is **unmeasured**, and measuring it is the first thing
the implementation plan should do - because if it fails, an approval would
evaporate on another machine and read as a withdrawn signature.

**It does not do everything, and the gap is ours to close in glue.** recutils
polices values but not transitions - `approved` to `rejected` to `approved` is
valid - and it cannot know whether a recorded hash still matches the file on
disk. Both belong in one staleness check that compares recorded to computed
digests. **A verdict pointing at an artifact that no longer exists is as stale
as one pointing at changed bytes**, and that case was found by writing the check
rather than by reasoning about it.

**Rejected, with the reason recorded because the test did real work:**

- **`git-bug`** - each commit's operations blob *replaces* the previous one, so
  `git log -p` renders prior operations as deletions when nothing was deleted.
  **The diff actively lies.** Status is a bare integer legible only against the
  tool's Go source. A database's opacity relocated into a git object.
- **`git-appraise`** - better built, with published JSON Schemas worth imitating
  and the only real region schema found, but its region units are lines and
  columns in a text file, it keys records to a commit, it reported a stale
  accepted review as current, and it hardcodes `refs/heads/master`.
- **`jq` / `yq` / `dasel`** - structured editors with no schema; all accepted a
  nonsense status at exit 0, and `dasel validate` printed `fail` while **still
  exiting 0**.
- **Doorstop** (LGPL, 690 stars, active) - the best-fitting *shape* surveyed:
  one YAML record per item, multi-line block scalars, the best diffability found,
  and a real `references[].sha` convention for binding an external artifact.
  **Rejected on a flaw verified in its source:** `stamp()` re-reads the stored
  sha out of the YAML and compares it to itself, and `_hash_reference` is called
  from exactly one place - the act of approving. Edit the drawing, leave the YAML
  alone, and `reviewed` still returns True; validation only checks the referenced
  file exists. **It meets the criterion and does not implement the mechanism** -
  the trap this repository already has written down. Its record shape is worth
  imitating; its guarantee is not.
- **StrictDoc** (Apache-2.0) - the only tool found with an **enforced** custom
  status enum, declared in the document's own grammar as
  `TYPE: SingleChoice(...)` and checked at parse time. **No content hash at
  all.** The two leaders fail on opposite sides.
- **`git notes` keyed on the artifact blob** - the sharpest mechanism found, and
  declined. Redraw the sheet and the lookup simply fails while the old note stays
  attached to the bytes it was about, so **a stale approval becomes impossible to
  express rather than merely detectable**. But a plain clone fetches no notes,
  and that absence reads identically to "nobody reviewed this". A silent absence
  that looks like a clean slate is the failure mode `docs/schematic/false-greens.md`
  exists to catalogue.

**Nothing in that file is derived.** The status is only ever what the reviewer
put there, and it returns to `drafted` the moment either hash changes - so a
stale approval is unrepresentable rather than merely detectable. The reviewer
can never be shown a page carrying their signature that is not the page they
signed.

**A commit is a page that was looked at.** The agent iterates freely in scratch;
what enters history is a revision that was rendered and shown. Pages nobody
judged are noise, not history.

What this does not build
------------------------

- **No legibility metric, score or threshold.** Named checks only.
- **No placement-intent format.** Whatever the selected tool accepts is what is
  authored; the repository invents no representation and writes no loader.
- **No layout algorithm.** The owner, 2026-10-28: *"i want to reuse and glue
  together agent-driven tooling. i do not want to write software algorithms."*
  The testable line: code that loops over components doing arithmetic on
  coordinates is an algorithm and is forbidden; code that invokes a tool, passes
  a file and records what came back is glue.
- **No agent reviewer.** The reviewer role is filled by the owner. An agent
  enters it by demonstrated agreement with the recorded verdicts, not by
  decision. Published evidence on an adjacent structurally-precise domain reports
  *"near-zero agreement with human raters"* for model-as-judge, so the naive
  version is known not to work.
- **No database.** See the decisions table.
- **No coverage ledger.** The 1918 check print recorded what the checker
  *reached*, not only what they objected to, which is better than a comment list.
  At two boards it is ceremony that would cost the reviewer more attention than
  it saves. Left out deliberately, and recorded here rather than silently
  omitted.

What it leaves open
-------------------

- **Re-review friction, which is the thing most likely to kill the practice.**
  Strict content hashing makes every redraw a full re-review. For a board revised
  repeatedly at a bench that cost falls entirely on the one scarce resource, the
  reviewer's attention. `cargo-vet`'s `delta = "A -> B"` is the existing answer -
  certify the *change* between two revisions rather than re-certifying the whole
  artifact - and it is not yet designed in here.
- **Whether copperhead's coarse controls are enough.** Its only real levers are a
  group per part and the group order. Reordering groups took the test sheet from
  21% ink to 51% with crossings still at zero, so the lever is real - but symbol
  orientation is outside the author's reach entirely, and one ordering made a
  functional block read right to left.
- **How a region is named**, so a verdict can attach to one. KiCad 10 supports
  `(group "name" (uuid ...) (members ...))` with member ids sorted for diff
  stability, and this repository currently emits none.
- **How a region is named so a verdict can attach to it, and in what units.**
  No surveyed tool solves it, but three existing answers were found and none
  needs inventing:
  - **A PDF fragment**, already standardised - the W3C `FragmentSelector`
    `conformsTo` table cites RFC 3778 with the form
    `page=10&viewrect=50,50,640,480`. Page plus rectangle in one string.
  - **KiCad's own groups** - `(group "name" (uuid ...) (members "uuid" ...))`,
    member ids sorted for diff stability, available in version 10 and emitted by
    nothing here today.
  - **The symbol uuids themselves**, which this repository's generator already
    emits deterministically - a region as a set of part identities rather than a
    geometry, which survives re-rendering entirely.

  **A region cannot anchor to the picture.** Measured: the exported SVG carries
  **zero `id=` attributes** and no UUIDs - 180 elements share
  `class="stroked-text"`. The anchor is the deterministic RFC 4122 v5 UUIDs that
  `lib/schgen/render/uuid.ts` already emits from semantic names and writes into
  every generated sheet.

  **And the region reference must stay SEPARATE from the content hash.** A
  redraw that nudges C10 **must** invalidate the approval and **must not**
  invalidate the region reference. Collapsing them loses the ability to say "the
  thing I objected to is still the thing I objected to."

  **Whether a region must be machine-checkable at all is a question for whoever
  authors the acceptance criteria, which is never the agent producing the
  drawings** - so it is the owner's to settle, not this document's.
- **Whether the practice holds on a circuit of a different shape.** Everything
  measured here is one board. `transistor-preamp-lab` is the first real test.
- **Three coverage holes in the research**, stated in the map: GitHub search
  truncates at 1,000 per query against topics holding ~19,000 repositories,
  GitHub code search was never run, and CTAN was never swept.
