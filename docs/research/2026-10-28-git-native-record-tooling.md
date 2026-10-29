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
in sections 2 through 6 was run on this machine against throwaway repositories;
the transcripts and the scripts are reproducible from Appendix A.

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
  outside it is refused with exit 1 and nothing written;
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
it, because only we know which file on disk a record is about.**

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
- **`yq` / `dasel`** (not installed; assessed by design). Same shape as jq: path
  query and mutate over YAML/JSON/TOML, no schema enforcement, no state set, no
  validator. `dasel` adds multi-format and in-place writes, which makes it a
  better *mechanism* than jq and leaves the enforcement question exactly where
  it was. Neither is a structured interface in the sense asked for; they are
  structured *editors*. RELAYED for the feature lists, VERIFIED for the absence
  of a schema facility only insofar as neither project claims one.
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

## 8. What this pass did not settle

- **The region coordinate system is still open, and no tool answers it.**
  git-appraise has the only real region schema found (4.2) and its units are
  lines and columns in a text file. A region of a rendered sheet is a zone
  (`B3`) or a bounding box in sheet millimetres. The recfile `Region` field is a
  string, which defers the question rather than answering it — honest, but it
  means a region is not machine-checkable against the drawing. **Whether a
  verdict's region should be checkable at all is a question for whoever authors
  the acceptance criteria, which is not the agent producing the drawings.**
- **Who writes the record.** The arrangement above assumes the human's verdict
  reaches `recins` somehow — typed by them, or typed by an agent from their
  words. If an agent transcribes, the verbatim requirement (b) becomes a
  transcription-fidelity problem, which this repository already has a practice
  for and which no tool in this survey addresses.
- **Signing.** git-appraise has `review/gpg/signable.go` and can sign a review
  (noted, not exercised). A recfile record is unsigned. If the question "did the
  owner really approve this" ever needs a cryptographic answer rather than a
  git-history answer, nothing recommended here provides it.

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
