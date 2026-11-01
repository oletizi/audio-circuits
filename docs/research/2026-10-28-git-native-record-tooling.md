# A structured interface over a record stored in git

**Question put to this pass, 2026-10-28.** An agent drafts a schematic sheet; a
human reads the rendered page; the verdict has to be recorded. The record must
live in git as something a person can read in a diff, **not in a database** —
the owner, 2026-10-28: *"use a file in git, not postgres. postgres is opaque
20th-century nonsense"*, and then the opening this pass exists to test: *"you
can use a structured interface to manage that file, if such a thing exists and
is suitable for the task."*

So the question is not "where does the record go" — that is settled, it goes in
git. The question is **whether a real tool exists to create, query and advance
it**, so that the record is not hand-edited prose pretending to be a database.

**Every claim below is marked VERIFIED (this writer ran it, or read the source
named) or RELAYED (another agent's report or a secondary source).** Everything
in sections 2 through 7 was run on this machine against throwaway repositories;
the transcripts and the scripts are reproducible from Appendix A. Section 8 is
mostly source-reading rather than execution, and says so. Section 9 was measured
against boards in this repository.

**Sections 8 and 9 incorporate a parallel survey**, whose findings are marked
RELAYED unless this writer re-checked them — and the two that decide anything
were re-checked independently: the render-hash stability of 9.1, which
reproduced to the same normalized hash, and the absence of element ids in the
exported SVG in 9.2.

**Two claims in an earlier draft of this document were wrong and are corrected
in place rather than quietly removed**, because what produced them is worth
knowing. It recorded `KiCad-Prism` as a repository that does not exist — a
*name search* missed what a *direct lookup* finds — and it attributed
`kischvidimer` to Micron, repeating the brief rather than reading the file
header. **Both errors were negatives**, and a false negative in a survey is the
dangerous kind: it closes a line of enquiry. The first one hid the single most
pointed finding here (8.5).

## The four requirements, stated so they can fail

A candidate has to carry all four. They are numbered here and referred to by
number throughout.

| | Requirement |
| --- | --- |
| **(a)** | An approval **status from a small state set** — and the set is ours, not the tool's |
| **(b)** | The **verdict text verbatim**, including multi-line prose |
| **(c)** | An attachment to a **region of the drawing** |
| **(d)** | A binding to a **content hash of the exact artifact reviewed**, so a stale approval is impossible |

**(d) is the one that decides this.** (a) through (c) are satisfiable by almost
any structured-file tool. A record that says "approved" without saying *what*
was approved is the false green this repository already catalogues twenty-nine
of — `docs/schematic/false-greens.md`. An approval that outlives the drawing it
approved is worse than no approval, because it reads as a check that passed.

## 1. The recommendation

**Use a recfile managed by GNU recutils for the register, and bind the content
hash with a gate you write.** Do not adopt git-bug. Do not adopt git-appraise,
though read its data-format spec before designing the record. Consider a
`git notes` note keyed on the artifact **blob** for the one thing recutils
cannot do, and understand its costs before taking it.

The honest shape of the answer is: **a tool exists for three of the four
requirements, and the fourth is about twenty-five lines of our own code.** There
is no tool that does all four, and the ones that come closest to (d) do it by
accident of git's object model rather than by design.

**What recutils gives, all VERIFIED by running it (section 5):**

- (a) **an enum state set that is enforced**, ours to define, and a write
  outside it is refused with exit 1 and nothing written — though it enforces the
  *value set* and not the *transitions*, see 5.2a;
- (b) multi-line verbatim text with a continuation syntax that survives round-trip;
- (c) a `Region` field — a plain string, which is all a region on a drawing
  sheet is until we have geometry;
- (d) **partly** — the hash is a field with a 64-hex-digit regexp type, so a
  malformed hash is refused, but recutils cannot know whether the hash still
  matches the file on disk;
- a real query language, a validator with line numbers, and a line-oriented
  plain-text format whose git diff is one line per changed field.

**What we write: the staleness gate.** Re-hash the artifact, compare to the
recorded hash, refuse loudly on a mismatch. Demonstrated working in section 5.6
at twenty-five lines of shell. This is not a gap in recutils; **no tool can do
it, because only we know which file on disk a record is about.** The same gate
is where any transition rule has to live (5.2a).

**Hash the source, and record the rendered page's hash beside it** (9.1). The
rendered SVG *is* byte-stable once one timestamp line is stripped — measured, and
independently reproduced to the same hash — but only on one machine, one KiCad
version and one font configuration, and that is the least-tested assumption in
this document. Hashing the `.kicad_sch` and recording the normalized render hash
as the traceability link survives a KiCad upgrade; a render-only hash does not.

**Anchor a region to the UUIDs `lib/schgen/` already emits, never to the
picture** (9.2). The exported SVG has **zero element ids** — there is nothing in
it to point at — while `uuidV5(\`pin:${part}:${unit}:${pin}\`)` and its siblings
are deterministic, semantic and already written into every generated sheet. And
keep that anchor separate from the content hash: a redraw that nudges `C10` must
invalidate the *approval* and must not invalidate the *region reference* (9.3).

**Consider cargo-vet's `delta` idea before committing to strict hashing** (8.2).
A content-hash binding as strict as section 6.1's makes every redraw a full
re-review. For a board revised repeatedly on a bench that friction is what kills
the practice, and `cargo-vet` is the one surveyed tool that models approving a
*change* rather than re-approving the whole artifact.

**And borrow the record's shape from in-toto rather than inventing it** (8.3).
Since we are designing the fields anyway, design them as an in-toto Statement:
a `subject` identified by `digest`, a `predicateType` URI we mint, and our
status, verbatim verdict and region inside the `predicate`. The spec's central
guarantee is the one requirement (d) asks for, in its own words — *"subject
artifacts are matched purely by digest, regardless of content type"* — and it is
a maintained, independently specified format, so the record stays legible
without our tooling. This costs nothing and replaces a schema we would otherwise
have made up. **Adopt the shape, not the toolchain**: the attestation tools
target OCI registries, not a git register.

### Why not the two git-native trackers

| | git-bug | git-appraise |
| --- | --- | --- |
| (a) custom state set | **No** — status is a fixed `open`/`closed` enum compiled in | **No** — a tri-state `resolved` (`nil`/`true`/`false`) |
| (b) verbatim text | Yes | Yes |
| (c) region | Labels and free text only | **Yes** — `location.{path,range:{startLine,startColumn,endLine,endColumn}}` |
| (d) content binding | **None** | Keyed on the reviewed **commit** — see 4.4 for the false green in this |
| Readable in a diff | **Badly** — see 3.3 | Yes — append-only JSON, one record per line |
| Format specified independently of the tool | No | **Yes** — published JSON Schema |
| Licence | GPL-3.0 | Apache-2.0 |

Both are drivable headlessly, and both store plain-text JSON rather than opaque
blobs, so neither has the database's opacity problem in the crude sense. They
fail on **(a)**: their state sets are theirs. `approved_with_comment` is not
expressible as a status in either, and the repository's own practice — *refuse
rather than guess*, *an empty whitelist that refuses loudly beats a general rule
that quietly accepts a guess* — is exactly what a fixed foreign state set
prevents. Encoding our states as git-bug labels (which works; VERIFIED in 3.2)
buys the tool's storage at the cost of the tool's enforcement: **a label is a
free-form string, so `aproved` is as valid as `approved`.** That is strictly
worse than a recfile enum, which refuses the typo.

## 2. What was installed and run

VERIFIED. All into the session scratchpad; nothing into the repository.

| Tool | Version | How | Licence |
| --- | --- | --- | --- |
| `git-bug` | v0.11.0 | `go install github.com/git-bug/git-bug@latest` | GPL-3.0 |
| `git-appraise` | `v0.0.0-20230812010605-be4751005fb4` | `go install github.com/google/git-appraise/git-appraise@latest` | Apache-2.0 |
| GNU recutils | 1.9 | Homebrew bottle extracted to the scratchpad, run with `DYLD_LIBRARY_PATH` | GPL-3.0-or-later |
| `git notes` | git 2.39.5 (Apple Git-154) | already present | GPL-2.0 |
| `yq` | v4.54.1 | `go install github.com/mikefarah/yq/v4@latest` | MIT |
| `dasel` | v2.8.2 | `go install github.com/tomwright/dasel/v2/cmd/dasel@master` | MIT |
| `jq` | system | already present | MIT |

`git-bug` is a 31MB static binary; `git-appraise` is 9MB; recutils is 3.2MB over
nine binaries whose only shared-library dependencies are its own `librec` plus
`libedit`, `libcurl` and `libSystem` — all system libraries on this machine
(VERIFIED by `otool -L`).

## 3. git-bug

**What it stores, VERIFIED.** An orphan ref per entity, `refs/bugs/<64-hex-id>`,
with **one commit per operation**. Each commit's tree holds a blob named `ops`
and a set of zero-byte marker files that carry the Lamport clocks in their
*names*:

```
100644 blob e69de29…  create-clock-2
100644 blob e69de29…  edit-clock-2
100644 blob 8e8125b…  ops
100644 blob e69de29…  version-4
```

`e69de29` is the empty blob — those three files have no content; the information
is the filename. The `ops` blob is minified single-line JSON. The actual bytes
of the create operation:

```json
{"author":{"id":"e3da3c46949632aa8197076f8babcfaae113f72a8047d04d435e4702ab82e6e4"},"ops":[{"type":1,"timestamp":1793231538,"nonce":"0eSGDfKb6QBKI5qMbIomgc/KGVY=","title":"Review low-boost sheet","message":"VERDICT: the C10 label collides with R4. artifact-sha256=7b930ff6… region=B3","files":null}]}
```

### 3.1 Headless: yes, fully

VERIFIED. `git-bug user new --non-interactive`, `bug new --title --message`,
`bug comment new --message`, `bug status close`, `bug label new`, and
`bug show --format json` all ran to completion with no terminal interaction and
exit 0. There is also `termui` and `webui`; neither is needed. An agent can
drive the whole loop.

### 3.2 Custom state set: no, but labels are free-form

VERIFIED. `git-bug` accepted all three of these as labels on one entity:

```
approved-with-comment
artifact-sha256:7b930ff65bde73df1c9e8a0797b8b12acd9b1b9ac92bea91e11a9693d5067afd
region:B3
```

So (a), (c) and (d) are all *expressible* — as strings in a flat label
namespace with no validation whatsoever. The `status` field itself stayed
`open` then `closed`; that enum is compiled in.

**This is the trap.** It looks like the tool supports our schema. It does not;
it supports arbitrary strings, which is the same thing a text file supports,
minus the ability to check them.

### 3.3 Readable in a diff: no, and this is the decisive defect

VERIFIED, and it is worse than "minified JSON is hard to read".

**Each commit's `ops` blob replaces the previous one rather than extending it.**
So `git log -p` on the bug ref shows every prior operation as a *deletion*:

```diff
 diff --git a/ops b/ops
 index fb2fcc2..6d0adf6 100644
 --- a/ops
 +++ b/ops
 @@ -1 +1 @@
 -{"author":{…},"ops":[{"type":3,…,"message":"second verdict, verbatim: looks fine now","files":null}]}
 +{"author":{…},"ops":[{"type":4,…,"status":2}]}
```

Read as a diff, that says the reviewer's comment was **deleted** and replaced by
a status change. Nothing was deleted. The history is the chain of commits, not
the diff between them, so **the diff actively lies about what happened.** A
record whose git diff misrepresents the change is not a record a human can
review in a diff, which was the whole requirement.

**And the operation kind is a bare integer.** From
`entities/bug/operation.go:11-20` (VERIFIED, read in the module cache):

```go
_ dag.OperationType = iota
CreateOp        // 1
SetTitleOp      // 2
AddCommentOp    // 3
SetStatusOp     // 4
LabelChangeOp   // 5
EditCommentOp   // 6
NoOpOp          // 7
SetMetadataOp   // 8
```

`"type":4,"status":2` means "closed". **You cannot read that without the
tool's source.** The bytes are plain text, which is not the same as legible;
this is precisely the opacity objection to a database, relocated into a git
object. The register would be readable only through `git-bug`.

### 3.4 Custom entities: a Go library, not a configuration

VERIFIED. `entity/dag/` is a generic append-only-DAG framework — `entity.go`,
`operation_pack.go`, `interface.go`, `clock.go`, plus an `example_test.go` — and
`entities/bug/` is one entity built on it. So a bespoke "verdict" entity with
our own state set **is** possible, by writing Go against `entity/dag` and
linking GPL-3.0 code into a new binary. That is a project, not an adoption, and
it would produce a record with the diff defect of 3.3 by construction.

### 3.5 No content binding

VERIFIED. The artifact was edited and committed; `git-bug bug` still reported
`789e29c closed Review low-boost sheet`. Nothing about the entity is bound to
anything about the drawing. Requirement (d) is absent, and a hash in a label is
a hash nobody checks.

## 4. git-appraise

Structurally the better of the two, and worth reading even though it is not the
recommendation.

**What it stores, VERIFIED.** Git notes, keyed by the **commit** being reviewed,
in two refs: `refs/notes/devtools/reviews` for the request and
`refs/notes/devtools/discuss` for the comments. Written with
`git notes append`, so records accumulate **one JSON object per line**. The
actual bytes of the discuss note:

```json
{"timestamp":"1793231653","author":"oletizi@mac.com","location":{"commit":"1ecab51b…","path":"low-boost.svg","range":{"startLine":1}},"description":"VERDICT: C10 label collides with R4 at region B3"}
{"timestamp":"1793231653","author":"oletizi@mac.com","location":{"commit":"1ecab51b…"},"description":"approved: artifact-sha256=7b930ff6…","resolved":true}
```

**Append-only means the git diff is a pure addition** — no false deletions, none
of 3.3's defect. VERIFIED by reading `git log -p` on the notes refs.

### 4.1 The format is specified independently of the tool

VERIFIED, and this is git-appraise's best property. `schema/comment.json`,
`schema/request.json`, `schema/ci.json` and `schema/analysis.json` are published
JSON Schemas in the repository, and `README.md` lines 91-134 specify the ref
layout, the `v` format-version field, and the sort-by-timestamp rule for
superseding a request. The record is therefore readable and writable by anything
that can parse JSON; **the tool is not the only reader.** That is the property
a register needs and the property a database lacks.

The README is also honest about the cost, line 92: *"Since these notes are not
in a human-friendly form, all of the refs used to track them start with the
prefix `refs/notes/devtools`. This helps make it clear that these are meant to
be read and written by automated tools."*

### 4.2 Region attachment: the only candidate that has a real schema for it

VERIFIED, from `review/comment/comment.go`:

```go
type Range struct {
	StartLine   uint32 `json:"startLine"`
	StartColumn uint32 `json:"startColumn,omitempty"`
	EndLine     uint32 `json:"endLine,omitempty"`
	EndColumn   uint32 `json:"endColumn,omitempty"`
}
type Location struct {
	Commit string `json:"commit,omitempty"`
	Path   string `json:"path,omitempty"`
	Range  *Range `json:"range,omitempty"`
}
```

Lines and columns in a text file. For a **rendered sheet** that is the wrong
coordinate system — a region of a drawing is a sheet zone (`B3`) or a bounding
box in mm, not a line number. And `Location.Check` validates the range against
the file's line count, so pointing at a rendered page is not what it is for. The
schema is the right *shape* and the wrong *units*.

### 4.3 State set: a tri-state, and not ours

VERIFIED. `review/review.go:52` — `Resolved *bool` — a pointer, so `nil`
(pending), `true` (accepted) and `false` (rejected). The CLI verbs are
`request`, `comment`, `accept`, `reject`, `abandon`, `submit`. Three states.
`approved_with_comment` and `superseded` have nowhere to go, and adding them
means forking.

### 4.4 Content binding: commit-keyed, which is a real binding with a false green on top

VERIFIED, and this is the subtle part worth carrying forward.

Because a note is keyed by the commit, redrawing the sheet creates a new commit
that **has no note**:

```
$ git notes --ref=devtools/reviews show 14c53f36…
error: no note found for object 14c53f36….
```

Good — the approval did not silently migrate onto the new drawing. **But
`git appraise list` still prints the old review as current:**

```
Loaded 1 open reviews:
[accepted] 1ecab51b2e30
  Review the low-boost sheet
```

The accepted review is reported with no indication that the drawing has moved on
past it. The binding is sound; **the tool's own summary view hides that the
binding no longer reaches HEAD.** Anyone reading `list` as "the state of the
work" reads a stale approval as a live one. Asking the right question —
"is there an accepted review *for this commit*" — gets the right answer, so this
is usable, but only by not using the tool's headline command. Recorded because
it is the same failure the owner named on 2026-10-27 about gates: a view that
reports a state without showing what the state is about.

### 4.5 The structural objection

VERIFIED by construction, and it is why git-appraise is not the recommendation
despite being the better-built tool. **It keys the record to a commit, and our
artifact is a generated page.** A rendered sheet is derived — this repository
regenerates derived artifacts every run and compares them by content, never by
timestamp. To use git-appraise we would have to commit every rendered page so
there is a commit to attach a note to, which inverts the repository's own rule
about generated artifacts. The content hash we want to bind is the hash of the
**artifact**, not of the commit that happened to contain it.

It is also effectively unmaintained for our purposes: last commit 2023-08-12,
Travis CI badge, and it hardcodes `refs/heads/master` — `git appraise request`
failed outright on a repository with a `main` default branch (VERIFIED:
`fatal: 'refs/heads/master' - not a valid ref`, and the review was silently not
created while the command exited 0).

## 5. GNU recutils — the recommendation

A recfile is a plain-text record format: `Field: value`, blank line between
records, `%`-prefixed directives carrying a schema at the top of the file. Nine
small CLI tools read and write it. The schema is **in the file**, which means the
constraints travel with the record and are visible in the same diff.

### 5.1 The register, as authored

VERIFIED — this file validates and all the operations below ran against it:

```
%rec: Verdict
%doc: Human review verdicts on generated schematic sheets.
%key: Id
%mandatory: Id Sheet ArtifactSha256 Status Reviewer Date
%type: Status enum pending approved approved_with_comment rejected superseded
%type: ArtifactSha256 regexp /^[0-9a-f]{64}$/
%type: Date date
%type: Region line
%allowed: Id Sheet ArtifactSha256 Status Reviewer Date Region Verdict
%constraint: Status != 'approved' || ArtifactSha256 != ''
%sort: Sheet

Id: V001
Sheet: low-boost
ArtifactSha256: 7b930ff65bde73df1c9e8a0797b8b12acd9b1b9ac92bea91e11a9693d5067afd
Status: approved_with_comment
Reviewer: oletizi@mac.com
Date: 2026-10-28
Region: B3
Verdict: The C10 value label collides with R4's designator. Legible, but
+ fix it on the next pass. The topology reads correctly.
```

`%type: Status enum …` is **our** state set, declared in our file. `+ ` continues
the previous field, so (b) holds for multi-line prose and round-trips exactly
(VERIFIED via `recsel --print-sexps`, which returned the value with the embedded
newline intact).

### 5.2 The refusals have teeth, and they exit non-zero

VERIFIED, checked without a pipe so the exit status is the tool's own. This is
the test that mattered most, because a refusal that exits 0 is a false green:

| Attempted write | stderr | exit |
| --- | --- | --- |
| `Status: probably-fine` | `error: invalid enum value.` | **1** |
| `ArtifactSha256: NOT-A-HASH` | `error: value does not match the regexp.` | **1** |
| missing mandatory fields | `error: mandatory field 'ArtifactSha256' not found in record` (one line each) | **1** |
| duplicate `Id: V001` | `error: duplicated key value in field 'Id' in record` | **1** |
| a valid record | — | 0 |

**And nothing was written on any refusal** — the file still held exactly `V001`
and `V002` afterwards (VERIFIED by counting `^Id:` lines). `recins` validates
the whole file plus the candidate record before touching the file.

Note `--force` exists and skips the integrity check. That is the escape hatch to
*not* document in our wrapper.

**`%constraint` bites too**, which is what makes the cross-field rules real
rather than decorative. VERIFIED on a deliberately failing case —
`%constraint: Status != 'approved' || Reviewer != ''`, then inserting an
`approved` record with no reviewer:

```
cmdli:0: error: %constraint[0] violated in record
EXIT=1
```

The same record with a reviewer inserted cleanly, exit 0. So *"an approval must
name who gave it"* and *"an approval must carry a hash"* are enforceable in the
file, not in a convention.

### 5.2a What the enum does NOT enforce: the transition

VERIFIED, and it qualifies requirement (a) materially. recutils polices the
**value set**, not the **edges of the state machine.** A record was walked
`approved` to `rejected` and straight back to `approved` with no new evidence:

```
recset to rejected   EXIT=0   ->  rejected
recset back to approved EXIT=0 ->  approved
recfix --check        EXIT=0
```

Both moves legal, the file still valid. So *"a status that can only be advanced
by a human action"* is only half-delivered: recutils guarantees the status is
one of ours and that it satisfies the per-record invariants, and guarantees
nothing about how it got there. A `%constraint` cannot see history, because it
is an expression over a single record.

**The consequence is that the transition rule lives in the same gate as the
staleness check** (5.6), or it does not exist. This is the right place for it
anyway — the gate is the thing that knows the artifact's current hash, and
*"approved, but the hash moved since"* is exactly the illegal-transition case
that matters here. A reviewer re-approving a sheet they just rejected is a
human changing their mind, which is not a thing to refuse.

### 5.3 The hand-edit guard

VERIFIED. This is what makes the file safe to hand-edit *and* machine-managed,
which is the combination the owner asked for. A record appended by hand with a
bogus status and a bogus hash:

```
$ recfix --check verdicts.rec
corrupt.rec:34: error: invalid enum value.
corrupt.rec:37: error: value does not match the regexp.
EXIT=1
```

Line numbers into the file. `recfix --check` on the good file exits 0 and prints
nothing. **This is a `make check` gate on the register itself** — a human may
edit the file directly, and the gate catches it if they edit it wrong.

### 5.4 Query language, and headless writes

VERIFIED. All non-interactive, all exit 0.

```
recsel -t Verdict -e "Status = 'approved_with_comment'" verdicts.rec
recsel -t Verdict -e "Sheet = 'low-boost'" -P Status verdicts.rec      -> approved_with_comment
recsel -t Verdict -e "Status != 'approved'" -c verdicts.rec            -> 1
recins -t Verdict -f Id -v V002 -f Status -v approved … verdicts.rec
recset -t Verdict -e "Id = 'V001'" -f Status -s approved verdicts.rec
```

`recsel -c` returning a count is directly a gate: *refuse to ship a sheet whose
verdict count at `approved` is zero.* `recset` is the state-machine advance.
`recdel` removes. `rec2csv` and `--print-sexps` are machine-readable exports;
there is no JSON output, which is a real if minor gap.

### 5.5 The git diff — the whole point

VERIFIED. One field per line means a status advance is a one-line diff and a new
verdict is a clean block addition:

```diff
 Id: V001
 Sheet: low-boost
 ArtifactSha256: 7b930ff65bde73df1c9e8a0797b8b12acd9b1b9ac92bea91e11a9693d5067afd
-Status: approved_with_comment
+Status: approved
 Reviewer: oletizi@mac.com
 Date: 2026-10-28
 Region: B3
 Verdict: The C10 value label collides with R4's designator. Legible, but
 + fix it on the next pass. The topology reads correctly.
+
+Id: V002
+Sheet: mid-band
+ArtifactSha256: 00001111…ffff
+Status: approved
+Reviewer: oletizi@mac.com
+Date: 2026-10-28
+Region: A1
+Verdict: Reads clean. Approved.
```

Compare 3.3. There is no contest: this is a record a person reviews in a diff,
and the schema that constrains it is nine lines above it in the same file.

### 5.6 What recutils cannot do, and what it costs to add

**Requirement (d) is only half-met and the half that is missing is the
important half.** recutils enforces that `ArtifactSha256` *looks like* a hash. It
cannot know whether that hash is still the hash of the file on disk, because it
has no idea which file the record is about.

So we write the gate. VERIFIED working, twenty-five lines of shell, run after
redrawing one sheet and never drawing the other:

```
STALE V001 (low-boost): verdict is 'approved' for sha256 7b930ff6…
      but low-boost.svg now hashes to c11a01df…. The approval does not cover what is on disk.
STALE V002 (mid-band): artifact mid-band.svg is absent; the approved verdict binds nothing
GATE EXIT=1
```

Two distinct failures, both named, both exit 1. **Note the second one**: a
verdict pointing at an artifact that does not exist is as stale as one pointing
at changed bytes, and a gate that only compares hashes when the file is present
would have passed it silently. That is the shape of a false green and it was
found by writing the gate rather than by reasoning about it.

This gate is ours to own and there is no tool to delegate it to. It is also the
cheapest part of the whole arrangement.

### 5.7 Maturity, weight, and the TypeScript problem

- **Maturity.** GNU recutils 1.9, copyright 2010-2020, GPL-3.0-or-later. A stable
  GNU utility, not an active project — the format has not needed to change.
  Homebrew analytics report 127 installs in 365 days (VERIFIED via
  `brew info`), so it is obscure. Obscure and stable is a different risk from
  obscure and young: **the format is trivial enough to re-implement, which is
  the actual mitigation.**
- **Weight.** 3.2MB, nine binaries, system libraries only. Lighter than
  `kicad-cli`, which this project already treats as required.
- **The TypeScript problem, VERIFIED and worth stating plainly.** There is no
  credible recfile parser for this project's runtime. `npm search` returns
  exactly one package — `recutils-js` 0.1.0, a WASM wrapper, single maintainer,
  first published 2025-08-29. **Do not depend on it.** The two honest options
  are to shell out to `recsel` (consistent with how this project already treats
  `kicad-cli`) or to write a reader: `Field: value`, `+ ` continuation,
  blank-line separator, `%` directives. The read side is on the order of a
  hundred lines; the *write* side should stay `recins`/`recset`, so the
  enforcement stays in one place and we do not reimplement the thing we adopted
  the tool for.

## 6. git notes, used directly

Worth its own section, because it is the only mechanism found in this pass that
makes requirement (d) **structural rather than checked**.

### 6.1 A note on a blob is a content-addressed approval

VERIFIED, and it is the sharpest single finding here. A note can annotate **any**
git object, including a blob. Key a verdict on the blob hash of the artifact and
the binding is git's own:

```
$ BLOB1=$(git rev-parse HEAD:low-boost.svg)      # d01757c3…
$ git notes --ref=verdicts add -m 'approved: this exact artifact content' $BLOB1
$ git notes --ref=verdicts show $BLOB1
approved: this exact artifact content
```

Redraw the sheet, commit, and ask again:

```
$ git notes --ref=verdicts show $BLOB2           # 77da7f0b…
error: no note found for object 77da7f0b….
$ git notes --ref=verdicts show $BLOB1
approved: this exact artifact content
```

**The approval did not become stale; it became unreachable.** There is no rule to
enforce and no gate to run — a different artifact has a different hash, so the
lookup simply fails, and the old note remains correctly attached to the bytes it
was actually about. This is the only arrangement examined in which a stale
approval is not merely detectable but **impossible to express**.

The notes ref is also perfectly diffable, as a pure addition:

```diff
 diff --git a/d01757c3d4c09ac0413f7bdf4ee4e09b5602d2a9 b/d01757c3…
 new file mode 100644
 --- /dev/null
 +++ b/d01757c3d4c09ac0413f7bdf4ee4e09b5602d2a9
 @@ -0,0 +1 @@
 +approved: this exact artifact content
```

Note what the *filename* is: the object hash. The content is legible; the
navigation is not.

### 6.2 The real-world problems, all VERIFIED by hitting them

These are the reasons not to make notes the primary store.

**Notes are not cloned.** A plain `git clone` of a repository with
`refs/notes/verdicts` produced a working copy with no notes at all:

```
$ git for-each-ref --format='%(refname)'
refs/heads/main
refs/remotes/origin/HEAD
refs/remotes/origin/main
$ git notes --ref=verdicts show $C1
error: no note found for object c50fbd6c….
```

The verdict register was **silently absent**, and the error is indistinguishable
from "nobody has reviewed this". An explicit refspec recovers it —
`git fetch origin 'refs/notes/*:refs/notes/*'` — after which the note reads
correctly (VERIFIED). But the default is a register that looks empty rather than
missing, which is the one failure mode this repository's practice forbids above
all others: *a skipped check must never look like a passing one.* Every clone,
every CI job and every worktree needs the refspec configured, or the approvals
are invisible and read as absent.

**Concurrent notes do not merge by default.** Two clones each appending a note to
the same object produced a non-fast-forward push rejection:

```
error: failed to push some refs to '…/repo-notes'
hint: Updates were rejected because the remote contains work that you do
hint: not have locally.
```

`git notes merge` offers `-s manual|ours|theirs|union|cat_sort_uniq` (VERIFIED
from `git notes merge --help`), and `union` or `cat_sort_uniq` would do for
append-only verdict lines. But it is a separate merge operation on a separate
ref that nobody runs by habit, and `ours`/`theirs` silently discard a verdict.

**Discoverability.** A note on a blob is invisible to every ordinary git
command. `git log` does not show it, `git diff` does not show it, the file's
history does not mention it. You have to know the ref name and the object hash
to ask the question at all.

### 6.3 How to use it anyway

The sound combination, if (d) must be structural rather than gated:
**the recfile is the register a human reads and reviews, and a blob-keyed note is
a redundant content-addressed seal.** The recfile carries the status, the
verbatim verdict, the region and the recorded hash, in a diff anyone can read;
the note makes the binding unforgeable. But the recfile plus the staleness gate
of 5.6 already achieves the same *outcome* with none of 6.2's costs, and it is
one mechanism instead of two. **Take the notes approach only if the gate turns
out to be bypassable in practice.**

## 7. The structured-file CLIs that are not databases

VERIFIED where marked.

- **`jq`** (present on this machine). Negative control, and it ran:
  `jq '.status = "totally-made-up-state"'` succeeded with exit 0. **jq has no
  schema, no enum, no validation and no state machine** — it is a transformation
  language, so every constraint would live in our code rather than beside the
  record. It also has no in-place edit flag, so every write is a
  read-modify-truncate the caller implements, with the truncation hazard that
  implies. jq is the right tool for reading a record and the wrong tool for
  being the structured interface to one.
- **`yq` v4.54.1** (installed and run; VERIFIED). Better mechanism than jq — it
  has `-i` for in-place writes, and it **preserved the YAML block scalar** that
  held the multi-line verdict text exactly, so (b) is safe with it. But
  `yq -i '.verdicts[0].status = "totally-made-up-state"'` exited 0, and so did
  setting `artifact_sha256` to `NOT-A-HASH`. **`yq --help` has no `valid` or
  `schema` verb at all** (VERIFIED by grepping its help output: no matches). It
  is a structured editor with no opinion about what it writes.
- **`dasel` v2.8.2** (installed and run; VERIFIED). Same result —
  `dasel put … '.verdicts.[0].status'` accepted `another-made-up-state`, exit 0.
  It does have a `validate` verb, which I checked rather than assumed: **it is a
  parse check, not a schema check.** It printed `pass v.yaml` for the file
  containing both the nonsense state and the malformed hash. On genuinely broken
  YAML it printed `fail` and `Error: 1 files failed validation` — **and still
  exited 0.** A validator that reports failure and exits 0 is the false green
  this repository catalogues; noted so nobody wires it into a gate.
- **`sqlite` with a text backend.** Rejected on the question's own terms. SQLite
  has no plain-text storage backend; the file is a binary page store, and a
  committed `.db` is exactly the opacity the owner ruled out. Dumping to
  `.sql` alongside it means two artifacts that can disagree, and the diff of a
  dump is not the record.
- **`datasette` over a committed file.** A read-only query and publish layer. It
  does not write, so it cannot be the interface that creates or advances a
  verdict. Potentially useful later for *reading* a register; irrelevant to this
  question.
- **GNU recutils.** Section 5. The only one of this group that carries a schema,
  an enforced state set and a validator, and the only one whose refusals exit
  non-zero.

The distinction that organises this group: **a structured editor applies the
change you describe; a structured interface refuses the change that violates the
record's own rules.** Only recutils is the second thing.

## 8. Purpose-built review, annotation and sign-off tooling

Surveyed from primary sources — repository contents read through the GitHub API,
quoted below. **Nothing in this section was installed and run**, so the claims
are VERIFIED-by-source-reading rather than VERIFIED-by-execution, and marked
where weaker.

### 8.1 `cargo-crev` — the closest data model found, and package-shaped

**The most structurally relevant thing in this survey.** crev stores signed
review proofs as YAML in a git repository. A real proof, from its own
documentation:

```yaml
-----BEGIN CREV PACKAGE REVIEW-----
version: -1
date: "2018-12-19T22:00:24.644210896-08:00"
from:
  id-type: crev
  id: FYlr8YoYGVvDwHQxqEIs89reKKDy-oWisoO0qXXEfHE
  url: "https://github.com/dpc/crev-proofs"
package:
  source: "https://crates.io"
  name: either
  version: 1.5.0
  digest: uBbgCVotv_8z4SEOjremFmvMG4JPhUROC19OLjPPLNE
review:
  thoroughness: medium
  understanding: high
  rating: strong
comment: "Simple `Either` type."
-----BEGIN CREV PACKAGE REVIEW SIGNATURE-----
```

That is **(a), (b) and (d) in a diffable file in git, cryptographically
signed.** And its *code review* proof type goes further — from
`crev-data/src/proof/review/code.rs` (VERIFIED, read via the API):

```rust
pub struct File {
    pub path: PathBuf,
    pub digest: Vec<u8>,
    #[serde(rename = "digest-type")]
    pub digest_type: String,
}
```

**Per-file content digests** — requirement (d) at exactly our granularity.

**Why it is not the answer.** Three findings, all VERIFIED from source:

- **The rating set is fixed and is not ours.** From
  `crev-data/src/proof/review/mod.rs:15-22`, `enum Rating` is exactly
  `Negative`, `Neutral`, `Positive`, `Strong`, serialized lowercase. Same
  objection as git-bug and git-appraise.
- **The proof is anchored to a package.** `struct Code` carries
  `pub package: proof::PackageInfo` as a non-optional field, so even a
  file-level code review must name a package source, name and version. A
  schematic sheet is not a crate, and pretending otherwise puts fiction in the
  record.
- **The only CLI is `cargo-crev`.** The workspace is `crev-data`, `crev-lib`,
  `crev-wot`, `crev-common` and `cargo-crev` — library crates plus one
  cargo-shaped front end that operates on crates.io dependencies. Using crev for
  drawings means writing our own front end against `crev-lib`.

Licensed Apache-2.0 / MIT / MPL-2.0, and actively maintained. **Worth reading
before designing our record** — the `{path, digest, digest-type}` triple and the
signature envelope are both good ideas we could adopt without adopting the tool.

### 8.2 `cargo-vet` — the one tool with a genuinely custom state set

**This qualifies the claim this document leads with.** Sections 3, 4 and 8.1
reject git-bug, git-appraise and crev partly because their state sets are theirs
and not ours. `cargo-vet` does not have that defect, and it is the only surveyed
tool that does not. RELAYED from the parallel survey, which quoted the
documentation directly; I did not install it.

Criteria are declared by the user in `supply-chain/config.toml`:

```toml
[criteria.crypto-reviewed]
description = '''
The cryptographic code in this crate has been reviewed for correctness by a
member of a designated set of cryptography experts within the project.
'''
```

And they compose — `implies` makes the criteria **an implication lattice rather
than a flat enum**: *"An optional string or array of other criteria that are
subsumed by this entry. Audit entries that are certified with these criteria are
also implicitly certified with any implied criteria."* Google's published
`rust-crate-audits` uses it for a graded `ub-risk-0` … `ub-risk-4` scale.

An audit entry:

```toml
[[audits.adler]]
who = "George Burgess IV <gbiv@google.com>"
criteria = ["safe-to-run", "does-not-implement-crypto"]
version = "1.0.2"
notes = """
Fast checksum'ing algos like the one implemented by this crate don't qualify as
crypto. Hence, this crate does-not-implement-crypto.
"""
```

TOML in git, one block per verdict, diffable, with `who` auto-populated from the
git config on `cargo vet certify` — and the documentation is explicit about why:
*"It emphasizes to the author that they are signing off on having performed the
audit."*

**It has no content hash.** Binding is `(crate, version)`, delegating
immutability to the registry — grepping its config documentation for
`hash|sha256|digest` returns nothing. So it fails (d) and (c) completely, and it
is not the recommendation. **But three of its ideas are worth taking:**

- **User-defined criteria with an implication graph** — requirement (a), done
  properly, and the only instance of it found.
- **`delta = "0.19.0 -> 0.20.0"`**, which *"certifies that the delta between two
  absolute versions preserves the relevant criteria"*. **This is the idea most
  likely to matter in practice here.** A board revised repeatedly on a bench
  will not get re-approved from scratch each time; if wholesale re-approval is
  the only option, the practice dies of friction. A content-hash binding as
  strict as section 6.1's makes every redraw a full re-review, and that cost
  needs to be a deliberate choice rather than a surprise.
- **`violation` overrides `exemptions`** — *"If a `violation` entry exists for a
  given crate version, `cargo vet` will reject the dependency even if it's listed
  in the `exemptions` table"*. A negative assertion that the normal escape hatch
  cannot silence, which is this project's *"a fallback is loud or it does not
  exist"* in another vocabulary.

Apache-2.0, v0.10.3 (2026-10-22), actively maintained.

### 8.3 in-toto attestations — the right schema for (d), and no register tool

The in-toto Statement, from the v1 spec:

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "subject": [
    { "name": "<NAME>", "digest": {"<ALGORITHM>": "<HEX_VALUE>"} }
  ],
  "predicateType": "<URI>",
  "predicate": { }
}
```

The spec's own sentence is the one that matters: **"Subject artifacts are matched
purely by digest, regardless of content type"** — and the `name` field
explicitly *is not* used for matching. That is requirement (d) stated as a
standard, and it is content-type agnostic, so a rendered schematic sheet is as
valid a subject as a binary.

**And `predicateType` is a URI we mint, with an arbitrary `predicate` object
under it.** So our state set, our verbatim verdict and our region all live in
the predicate, with none of the "the tool's enum is not our enum" problem that
sank every other candidate.

**What is missing is the tool.** The spec defines a schema and says nothing about
storage (VERIFIED — the statement spec covers the schema only). The tools that
produce attestations — `cosign attest`, `witness` — target OCI registries and
transparency logs, not a git-stored register, and there is no CLI that writes
attestations into a file in git and queries them as a register. RELAYED on the
tooling landscape; I did not install either.

**This is nonetheless the most useful finding after recutils**, because it
resolves the schema question that git-appraise only half-answered: *if we are
designing the record ourselves anyway, design it as an in-toto Statement.* It is
a maintained, independently specified format whose central guarantee is the one
we need, and adopting the shape costs nothing.

### 8.4 ADR tooling — no state machine anywhere

**A clean negative, VERIFIED.** `adr-tools` (npryce) writes a markdown template
whose status is a literal placeholder:

```
## Status

STATUS
```

And superseding is not a transition — `src/_adr_add_link` is an **awk script that
appends a line of prose** under the `## Status` heading:

```awk
/^## Status$/ { in_status_section=1 }
/^##/ {
    if (in_status_section) {
        print link_type " [" target_title "](" target ")"
```

There is no state set, no validation, and nothing that could refuse an invalid
status. The `src/` tree is eighteen shell scripts; the newest commit on the
repository is **2020-03-30** (VERIFIED via the commits API), so it is
unmaintained. ADR tooling satisfies none of (a), (c) or (d), and its status
field is prose that happens to sit under a heading. **It is the thing to avoid
becoming**, not a model to follow — and it is worth saying plainly because an
ADR-style markdown file with a `Status:` line is the obvious thing to reach for
here and it is exactly the hand-managed prose the owner's question was trying to
improve on.

### 8.5 The three schematic review tools: two store nothing, one stores it in Postgres

VERIFIED from repository metadata and README contents.

- **`kiri`** (leoheck) — MIT, actively maintained (last push 2026-06-22),
  described by its own repository as *"a visual tool designed for reviewing
  schematics and layouts of KiCad projects that are version-controlled with
  Git."* Grepping its README for comment, annotation, review-state or approval
  returned **nothing**. It renders and diffs; it stores no verdicts.
- **`kischvidimer`** (canonical home GitLab `dnschneid/kischvidimer`, mirrored to
  GitHub) — Apache-2.0, very actively maintained (pushed 2026-10-28). Its README
  has exactly one review-related feature, and it is telling: *"**Feedback URL**
  -- provide a button to click for schematic review feedback."* **It delegates
  the verdict to an external system by design** — a primary-source confirmation
  that a very actively developed KiCad schematic viewer does not attempt to
  store review state, and expects something else to.

  **Attribution corrected:** this is **Rivos Inc., not Micron.** VERIFIED —
  `kischvidimer/diffui.py` opens
  `SPDX-FileCopyrightText: (C) 2025 Rivos Inc.` followed by
  `SPDX-FileCopyrightText: Copyright 2024 Google LLC`. The brief named Micron and
  an earlier draft of this document repeated it; the source says otherwise.

- **`KiCad-Prism` — found, and it is the most interesting negative in this
  document.** An earlier draft of this section recorded it as "no repository
  found", which was wrong: a repository-name search missed it where a direct
  lookup finds it. It is `krishna-swaroop/KiCAD-Prism`, Apache-2.0, 303 stars,
  pushed **2026-10-28** — very active. VERIFIED.

  **It has, by a distance, the richest review features of anything surveyed.**
  From its README: *"Comment on any sheet, part or area"*, and a Release Studio
  that *"records DRC/ERC evidence and designer and QA sign-off"*. That is
  requirements (a), (b) and (c) in a tool built for exactly our artifact.

  **And its own runtime table disqualifies it in one line**:

  ```
  | `postgres` | workspace, comments, catalog, jobs, audit, and session data |
  ```

  with the README adding that *"PostgreSQL and both directories are required for
  complete recovery."* **The one tool that does what we want keeps it in the one
  store the owner ruled out** — *"use a file in git, not postgres"*. Worth
  stating plainly rather than burying: this is not a case of nobody having built
  the thing. Somebody built it, and put the record in a database.

**So none of the three can be backed by a git-stored verdict file** — two store
no verdict at all, and the third stores it in Postgres. The register is ours to
build regardless of which viewer renders the page, which is a liberating finding
rather than a disappointing one: **the choice of viewer does not constrain the
choice of record.**

### 8.6 The snapshot-approval pattern — the right idea, wrong artifact

RELAYED; not installed or run. `ApprovalTests` (the `.approved.txt` /
`.received.txt` pair) and Rust's `insta` (`.snap` files) implement precisely the
mechanic requirement (d) asks for: a human approves a captured artifact by
promoting the received file to the approved file, and **any subsequent content
change makes the two differ, which fails the check.** Approval is invalidated by
content change, structurally, with no hash field to maintain.

Two reasons it is a pattern to borrow rather than a tool to adopt: the approved
artifact *is* the record, so there is nowhere to put a status from a state set, a
reviewer identity, a region or verbatim verdict prose; and the mechanism is
bound to a test runner's lifecycle rather than to a review.

**But the comparison is worth making explicit, because it validates section
6.1.** A blob-keyed git note is the snapshot-approval pattern expressed in git's
object model — the approval is reachable only from the exact bytes it approved,
so staleness is unrepresentable rather than detected. That two unrelated
traditions arrive at the same mechanic is the strongest evidence this pass found
that content-addressed approval is the correct shape.

### 8.7 W3C Web Annotation — solves (c) properly, contributes nothing to (d)

RELAYED from the parallel survey, which read the specification itself.

**The region model is genuinely right for a drawing**, and better than
git-appraise's lines and columns:

- **`SvgSelector`** — *"defines an area through the use of the Scalable Vector
  Graphics [SVG11] standard. This allows the user to select a non-rectangular
  area of the content, such as a circle or polygon."* An arbitrary polygon over a
  schematic page is exactly requirement (c).
- **`FragmentSelector`** for a simple box (`#xywh=…`), and **`refinedBy`** to
  compose selectors.
- An **`assessing`** motivation already exists, defined as *"when the user
  intends to assess the target resource in some way, rather than simply make a
  comment about it … or provide an assessment of a student's work."*

**And the decisive negative, which is a measurement rather than an impression:
the specification contains zero occurrences of `checksum`, `digest` or `hash`.**
Its `state` mechanism is not a content binding — `TimeState` carries a
`sourceDate` and `HttpRequestState` carries request headers, so both describe
*how and when to retrieve* the target, not what its bytes were. **The W3C model
gives (b) and (c) for free and nothing at all for (d).**

`Annotorious` (BSD-3-Clause, active) is the matching browser library and loads
plain JSON from a file (`anno.loadAnnotations('./annotations.json')`), which
makes it a plausible "human draws a region" front end. It is a library, not a
CLI: no query verb, no state machine, no persistence.

**Caution on adopting the selector vocabulary wholesale**: an `SvgSelector`
polygon is pixel geometry over a rendered page, which 9.2 and 9.3 argue against
for precisely the reason that it invalidates on re-layout. The `assessing`
motivation and the `refinedBy` composition idea travel better than the geometry
does.

### 8.8 Hash-bound invalidation in the wild — one real instance, and instructive failures

RELAYED from the parallel survey. This is the direct answer to *"this pattern
must exist somewhere"*: **it does, once, and most of the things that look like it
are not it.**

**`detect-secrets` (Yelp) genuinely binds a human verdict to a hash.** Its
committed `.secrets.baseline` carries per-finding records with
`"hashed_secret": "daefe0b4…"`, and the identity rule is the load-bearing part —
`fields_to_compare = ['filename', 'secret_hash', 'type']`, with the source's own
comment: *"Note that line numbers aren't included in this, because line numbers
are subject to change."* The human verdict is tri-state (absent / `false` /
`true`) from an audit step asking *"Should this string be committed to the
repository?"*, and carry-forward across runs is hash-keyed, so **a finding whose
hash no longer matches is simply not found and its verdict is dropped** — the
same structural invalidation as crev and as section 6.1. Three faults worth
avoiding: a `generated_at` wall-clock rewritten on every save (a one-line diff
when nothing changed), a churning `line_number`, and **no headless verb to set a
verdict** — the audit step is an interactive TUI only.

**Two precedents worth citing if this approach is ever questioned:**

- **GitHub chose content-sensitive dismissal deliberately**, and documents it:
  *"GitHub records the state of the diff at the point when a pull request is
  approved. This state represents the set of changes that the reviewer approved.
  If the diff changes from this state … the approving review is dismissed as
  stale."* A platform with every commercial incentive to keep approvals sticky
  made invalidation the safe default.
- **Gerrit is the best prior art for a custom verdict vocabulary with rules about
  when a verdict survives a revision.** Labels are entirely user-defined in
  `project.config`, and `copyCondition` is a queryable expression —
  `copyCondition = is:MIN OR -change-kind:REWORK`. Note it deliberately
  *ignores* the hash: `changekind:NO_CHANGE` matches when *"only the patch set
  SHA-1 is different"*, used to make approvals sticky. The opposite choice from
  ours, made knowingly.

**The baseline-file family mostly does not do this, despite appearances.**
`checkov`'s baseline keys on `(resource, check_id)` and ignores the file path
entirely; `KICS`'s `similarity_id` hashes a *location*, deliberately insensitive
to the rest of the file; `trivy` keys on CVE id; `semgrep`'s real `code_hash`
exists but the triage verdict lives in their SaaS, not on disk; `gitleaks` uses
`commit:path:ruleID:line`. **ESLint 9's suppressions file is the sharpest
contrast — it stores counts, not hashes**:
`{ "src/index.js": { "no-console": { "count": 2 } } }`, chosen so that
refactoring would *not* invalidate suppressions. That is the opposite trade-off
from the one recommended here, and it is worth saying out loud that we are
choosing the strict side deliberately rather than by default.

Two ideas to borrow anyway: `trivy`'s `expired_at` (a time-bounded suppression)
and its `statement` field (*"The reason for ignoring the finding"*).

## 9. Which bytes to hash, and what a region can anchor to

Two questions the earlier sections left open, both measured on this machine
against boards in this repository. **These matter more than the choice of tool**,
because requirement (d) is meaningless until "the exact artifact reviewed" names
a specific byte string, and requirement (c) is meaningless until a region has
something stable to point at.

### 9.1 The rendered page is not byte-stable, and one line is why

VERIFIED by this writer, KiCad **10.0.5**, `circuits/pultec/pultec-mid-band.kicad_sch`
exported to SVG twice a second apart:

```
raw a  ccb635d9e72e993b
raw b  24f0a070c1ae69aa        <- different
```

`diff` reports **exactly two differing lines**, which is one line changed, and it
is line 11:

```
11c11
< <title>SVG Image created as pultec-mid-band.svg date 2026-10-28T17:17:20 </title>
---
> <title>SVG Image created as pultec-mid-band.svg date 2026-10-28T17:17:21 </title>
```

Drop that one line and the render is byte-identical:

```
STABLE   pultec-mid-band.svg  b077167eec816af0
```

**So `sha256(svg with the generation-title line removed)` is a usable content
hash for "the page the human read."** A parallel investigation reached the same
normalized hash `b077167eec816af0` for this board independently, which is as
good a reproduction as this pass has.

PDF is **not** usable the same way: it embeds `/CreationDate (D:2026:10:28:…)`
and two exports differ. RELAYED — my own PDF check mis-specified the output path
and did not run, so take the SVG result as measured and the PDF result as
reported.

**The honest caveat, and it is the live risk in the whole recommendation.** This
is one machine, one KiCad version, one font configuration, back to back.
**Cross-machine and cross-version stability is untested.** A font substitution
would change the path data and therefore the hash, and `fontconfig` emitted a
warning on every run here. Before any gate depends on a render hash, it has to
be tested on a second machine and across a KiCad upgrade.

**The safer structure, RELAYED but well reasoned.** A regulated docs-as-code
project (`itercharles/MedHarness`, 3 stars, status *Proposed* — read for the
design, not as a dependency) states the problem and resolves it the other way
round: *"A document's `hash` is computed over the items it contains, not over the
rendered file, because rendering is not byte-stable (fonts, timestamps). … The
rendered file's hash is recorded alongside, so the PDF or HTML an auditor reads
traces to the signed entry."* **Hash the source, record the render's hash
beside it.** That survives a KiCad upgrade; a render-only hash does not. Given
the untested cross-version risk above, this is the structure to prefer.

**And whichever is chosen, write down what the hash covers and test it.**
`cargo-crev` needed an explicit `cargo_min_ignore_list()` /
`cargo_full_ignore_list()` for exactly this question and still warns when the two
disagree (RELAYED). Our version of that list has to name the SVG `<title>` line,
`.kicad_prl`, and whatever is regenerated. **Explicit, per this repository's own
rule that an empty whitelist refusing loudly beats a general rule that quietly
accepts a guess.**

### 9.2 A region cannot anchor to the render, and the right anchor already exists

**The render has nothing to point at.** VERIFIED by this writer on the same
exported SVG:

```
id= occurrences:    0
class= occurrences: 180
distinct classes:   class="stroked-text"
uuid occurrences:   0
```

**Zero element ids, one class, no UUIDs.** So the coordinate-system question
section 8.3 left open cannot be answered inside the SVG at all. A region
expressed as pixel coordinates over that page would be invalidated by any
re-layout, which is the wrong invalidation behaviour for a *region* — a region
should survive a redraw that moves the part, because it is pointing at the part,
not at a spot on the paper.

**The anchor already exists in `lib/schgen/`.** VERIFIED by this writer,
`lib/schgen/render/uuid.ts`:

```ts
/** Fixed namespace for every schgen UUID. Changing it changes every generated file. */
export const SCHGEN_NAMESPACE = "3f8b8a2e-6c55-4f0e-9d7a-2b9c4e1d7a60";
/** RFC 4122 version-5 UUID: SHA-1 of namespace bytes + UTF-8 name. */
export function uuidV5(name: string, namespace: string = SCHGEN_NAMESPACE): string {
```

and the call sites key it on **semantic names**, not positions:

```
emit.ts:118          uuidV5(`sheet:${project}:${s.id}`)
emit.ts:120          uuidV5(`root:${project}`)
emit.ts:237          uuidV5(`sheetfile:${ctx.project}:${id}`)
erc-exclusions.ts:83 uuidV5(`pin:${p.part}:${unit}:${p.pin}`)
emit-items.ts:107    uuid(s.pinKey(p.number))
```

These are deterministic, content-independent and already written into every
generated sheet. **A verdict's region should be one of these keys** — or a
geometric box the generator itself computed — and not anything read off the
picture.

**The independent corroboration is worth having**, RELAYED: `kischvidimer`
implements deep links to components, nets and pages keyed by **UUID path**
(`database.js`: `export const KEY_PATH = "\x01"; // component path (uuid)`),
and it built that scheme precisely because KiCad's SVG has no ids. Two
independent routes to the same conclusion.

### 9.3 The two bindings do two different jobs — keep them separate

This is the design consequence of 9.1 and 9.2 together, and it is easy to get
wrong by collapsing them.

| | Binds to | Should be invalidated by |
| --- | --- | --- |
| **The verdict's content hash** (d) | the artifact's bytes | **any** change to the drawing |
| **The region anchor** (c) | a semantic UUID / generator-computed geometry | a change to *what the thing is*, not to where it sits |

A redraw that moves `C10` three millimetres must invalidate the **approval** and
must not invalidate the **region reference**. Keying the region off the artifact
hash, or off pixel coordinates in the render, breaks that distinction in opposite
directions.

## 10. What this pass did not settle

- **Cross-machine and cross-version render stability — the live risk, and the
  one thing to measure next.** 9.1 establishes that a normalized SVG is
  byte-stable back to back on one machine with one KiCad and one font set.
  **Nothing here tests a second machine or a KiCad upgrade**, and a font
  substitution would change the path data and the hash. Until that is measured,
  prefer hashing the `.kicad_sch` source and recording the render hash alongside
  (9.1), which is the structure that survives being wrong about this.
- **No tool was found that satisfies all four requirements, and that is the
  finding rather than a gap in the search.** The closest on data model is
  `cargo-crev` (8.1), the only one with a custom state set is `cargo-vet` (8.2),
  the only right schema for the hash binding is in-toto (8.3), the only real
  region vocabulary is W3C Web Annotation (8.7), and the only tool built for our
  actual artifact keeps the record in Postgres (8.5). **The pieces exist and no
  one has assembled them.**
- **Who writes the record.** The arrangement above assumes the human's verdict
  reaches `recins` somehow — typed by them, or typed by an agent from their
  words. If an agent transcribes, the verbatim requirement (b) becomes a
  transcription-fidelity problem, which this repository already has a practice
  for and which no tool in this survey addresses. **Upstream has already had to
  model this**: `crev`'s data model now carries
  `LlmAgentInfo { model, model_version, human_guided }`, serialized as
  `llm-agent`, to record that *"the review was conducted by (or with assistance
  of) an LLM agent"* (RELAYED). If an agent ever touches a verdict here, the
  record should say so in a field, not in a convention.
- **Signing is available and cheap, if it is ever wanted.** git-appraise has
  `review/gpg/signable.go`; crev signs every proof with Ed25519. A recfile record
  is unsigned. RELAYED but checked on this machine by the parallel survey:
  `ssh-keygen -Y sign` / `-Y verify` are present in stock macOS OpenSSH, and git
  already supports `gpg.format = ssh` — so a detached `.sig` beside a readable
  record is a zero-install option, and it keeps the record itself legible, which
  DSSE and sigstore bundles do not (8.3). **Not recommended yet**: nothing has
  established that "did the owner really approve this" needs a cryptographic
  answer rather than a git-history one.
- **The verdict vocabulary deserves more thought than this pass gave it.**
  Section 5.1's five-state enum was authored to demonstrate that recutils
  enforces *a* state set, not to propose the right one. Two surveyed designs are
  better reasoned: crev's three orthogonal axes, where `thoroughness: medium` is
  pinned to a documented effort (*"a standard, focused code review of a decent
  depth; '~15 minutes per file'"*) rather than to a sentiment; and cargo-vet's
  user-defined criteria with an `implies` lattice. **Per this repository's own
  invariant, the agent producing the drawings may not author the criteria those
  drawings are judged by** — so the state set is explicitly not settled here,
  and these are inputs for whoever does settle it.

## Appendix A. Reproduction

Scripts, written to the session scratchpad at
`…/scratchpad/gitrec/`, each runnable standalone:

| Script | What it establishes |
| --- | --- |
| `install.sh` | builds `git-bug` and `git-appraise` into `bin/` |
| `t-gitbug.sh`, `t-gitbug2.sh` | git-bug storage layout, the `ops` blob bytes, labels, the misleading diff |
| `t-appraise.sh` | the `refs/heads/master` hardcoding failure |
| `t-appraise2.sh` | git-appraise notes bytes, region schema, `show --json` |
| `t-appraise3.sh` | the stale-approval false green in `git appraise list` |
| `t-notes.sh` | blob-keyed notes, auto-invalidation, the clone and merge problems |
| `t-rec-setup.sh` | recutils extracted from a bottle and running from the scratchpad |
| `t-rec.sh` | the register, the query language, the diff |
| `t-rec-exit.sh` | the exit codes on every refusal, and `recfix --check` |
| `t-constraint.sh` | `%constraint` enforcement, and that transitions are not policed |
| `t-yqdasel.sh` | yq and dasel accept any value; `dasel validate` is a parse check that exits 0 on failure |
| `t-renderhash.sh` | the SVG timestamp line, the normalized hash, and the absence of element ids (section 9) |
| `t-final.sh` | `%auto` behaviour, the staleness gate, the jq negative control |

The scratchpad is session-scoped and will not survive. The scripts are short and
the transcripts are quoted in full above where a claim rests on them; **nothing
in this document depends on the scratchpad still existing.**

**One incidental finding, VERIFIED.** `%auto` generates field values for `int`,
`range` and `date` types only. `%type: Id uuid` was refused —
`error: the referred type uuid does not exist` — so recutils 1.9 has no UUID
type, and `%auto: Id` additionally refused with *"auto-incremented field Id
should be of type int, range or date"*. An auto-incrementing integer id works
(`Id: 0`, `Id: 1`); a generated UUID does not. Record ids are ours to assign.
