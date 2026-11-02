# Task 1 fix re-review — rounds 1 and 2

Scoped re-review. Reviewed the fix commits `863ef9c`, `7f3b84c`, `d0b9f5d`,
`957613a`, `66c7f31`, `15696e0` (plus the controller's own `927632a`, not the
implementer's) against the prior full review's findings. Worktree
`/Users/orion/work/audio-circuits-work/pultec-modularize`, branch
`feature/schematics-tooling`. Every claim below is marked **CONFIRMED** (driven
or read here) or **RELAYING** (the implementer's report, not re-driven).

## Verdict: ALL ADDRESSED

No Critical, no Important, no finding that changes a number. One observation
below (not a finding) about a disclosure sentence that was superseded rather
than literally preserved — judged not a defect.

---

## A. The negative control — CONFIRMED, independently, and it proves what it claims

**Re-drove the committed probe from a clean tree.** `[RAN]`
`bun run tools/schgen/label-syntax/probe.ts`. `diff` against the committed
`probe-run.log` returns **exactly one changed line** — the recorded commit SHA
(`957613a…` → `15696e0…`, the HEAD at review time). All ten sheets (four
candidates, six controls) reported `unchanged on disk`, and `git status
--porcelain` was empty both before and after.

**The six arms, re-driven, match the table exactly:**

| arm | parsed | round-trip | what happened |
| --- | --- | --- | --- |
| `ctl-double-quote` | YES | YES | escaped both sides, intact |
| `ctl-backslash` | YES | YES | escaped both sides, intact |
| `ctl-tab` | YES | YES | verbatim, tab intact |
| `ctl-newline` | NO | NO | `kicad-cli` exit 3, no netlist, no PDF |
| `ctl-carriage-return` | YES | NO | exit 0, renamed |
| `ctl-nul` | YES | NO | exit 0, renamed |

**The summary line fires correctly and for the reason it documents, not a
different one.** `[RAN]`, read from the re-run log: `control arms: 6; refused
by kicad-cli (LOUD failure): 1; parsed and silently renamed (SILENT failure):
2; fully passing: 3` followed by `NEGATIVE CONTROL ESTABLISHED: in one
committed run this probe reports a PASS, a LOUD FAILURE and a SILENT RENAME`.
The gating expression is `loud.length > 0 && silent.length > 0 &&
passing.length > 0`, computed from the same six driven verdicts the table
above shows, not from a separate restated count — so this is not
`false-greens.md` item 11 (a check firing through a different path than the
one it documents). **One run genuinely shows a pass, a loud failure and a
silent rename together — CONFIRMED by independent re-drive, not relayed.**

**Independently re-derived the CR and NUL renames by reading the exported
netlist myself**, bypassing the probe entirely:

```
kicad-cli sch export netlist --format kicadsexpr -o ... sheets/ctl-carriage-return.kicad_sch   → exit 0
kicad-cli sch export netlist --format kicadsexpr -o ... sheets/ctl-nul.kicad_sch               → exit 0
kicad-cli sch export netlist --format kicadsexpr -o ... sheets/ctl-tab.kicad_sch               → exit 0
kicad-cli sch export netlist --format kicadsexpr -o ... sheets/ctl-newline.kicad_sch           → exit 3
```

Reading the raw `(name …)` atoms out of each exported netlist by hand:

| arm | sheet carried | netlist came back with |
| --- | --- | --- |
| `ctl-carriage-return` | `RAW<CR>CR` | `"RAWCR"` — the CR byte dropped, `RAW` and `CR` concatenated |
| `ctl-nul` | `RAW<NUL>NUL` | `"RAW"` — truncated at the NUL |
| `ctl-tab` | `RAW<TAB>TAB` | `"RAW\tTAB"` — tab byte preserved, verbatim |

**Both silent renames CONFIRMED independently, not relayed.** This is the
load-bearing finding and it holds under a from-scratch drive that never calls
into `probe.ts`'s own comparison logic.

**The tab discriminator — CONFIRMED.** `[READ]`
`lib/schgen/render/sexpr-write.ts:31-34`:

```ts
export function str(text: string): SAtomNode {
  if (/[\x00-\x1f]/.test(text)) {
    throw new Error(`string ${JSON.stringify(text)} contains a control character; ...`);
  }
  ...
}
```

The guard is `[\x00-\x1f]`, the whole C0 range, which includes tab
(`	`). The independent netlist read above shows KiCad takes the tab
verbatim on both sides. So the claim holds exactly as argued: a tab is inside
the class `str()` refuses, and KiCad does not need it refused — the newline
breaks the s-expression's line structure, CR and NUL break KiCad's string
reader, and none of the three is explained by "a control character" as a
single class. `str()`'s blanket refusal is wider than KiCad requires, in the
safe direction. **CONFIRMED**, and the controller's downstream rewrite of Task
3's refusal reasoning rests on a sound discriminator.

## B. The split — CONFIRMED, line counts and seam both real

`[RAN]` `wc -l`: `probe.ts` **435**, `fixtures.ts` **238**, matching the
report exactly.

**Both manifest entries CONFIRMED present** in `tools/schgen/port-manifest.json`'s
`handWritten` array (`tools/schgen/label-syntax/fixtures.ts` and
`tools/schgen/label-syntax/probe.ts`); `probe-run.log` is correctly absent (it
is not a `.ts` path). `bun test tests/schgen/port-fidelity.test.ts` with
`SCHGEN_SOURCE` set: **12 pass / 0 fail / 117 expect()**.

**The seam is real, CONFIRMED by grep.** `fixtures.ts` mentions `kicad-cli`
only in prose (three comment occurrences, zero calls — no `runKicadCli`,
`exportPdf` or `spawnSync`). `probe.ts` contains no s-expression literal (no
`(kicad_sch`, `(global_label`, `(symbol`, `(wire`, `(pin`, `(property` —
zero hits).

**Disclosure survival, checked against round 1's pre-split `probe.ts` at
`7f3b84c` (498 lines).** Diffed the 498-line file against the current pair
sentence by sentence:

- The "why it exists" header, the "PDF and netlist, never SVG" paragraph, and
  the call-site narrowing paragraph all survive **verbatim** in the new
  `probe.ts` header.
- The "name atom's bytes are production's; the form around them is not"
  paragraph (including the `str()` control-character line reference and the
  `Intersheetrefs` omission) survives **verbatim**, moved to `fixtures.ts`'s
  `render()` doc comment — a relocation, not a loss.
- **One sentence does not survive verbatim**: round 1's *"SO 'THE WRITER
  ESCAPES NOTHING' IS A FACT ABOUT THESE FOUR NAMES, NOT ABOUT THE WRITER"*,
  which in round 1 was a prose note about perturbations that were relayed and
  not committed. **This is not a dropped disclosure — it is superseded by a
  stronger committed artifact**: round 2 turned that note into two actual
  committed control arms (`ctl-double-quote`, `ctl-backslash`) with pinned,
  driven `escaped: YES` results, which is a strictly stronger statement of the
  same fact. `CLAUDE.md`'s "supersede means delete" directly covers this. Not
  a finding.

No other paragraph of the pre-split file is missing from the pair; the
remainder reappears as either verbatim prose or as a committed `CONTROLS`
arm carrying a strictly stronger version of the same claim.

## C. The NUL byte in the register — CONFIRMED by byte count, not by reading

`[RAN]` A byte scan of `docs/known-gaps.md` for any byte `< 0x20` outside
`{0x09 (tab), 0x0a (LF), 0x0d (CR)}`: **zero** such bytes in the whole file.

`[RAN]` The same scan over `tools/schgen/label-syntax/fixtures.ts`: **zero**.
`[READ]` the file builds its NUL via `String.fromCharCode(0)` with a comment
explaining why, not via a literal escape.

`[RAN]` Per-file control-byte census of the six committed control sheets
(counting bytes, not reading):

| sheet | 0x00 (NUL) | 0x0d (CR) | notes |
| --- | --- | --- | --- |
| `ctl-nul.kicad_sch` | **1** | 0 | the deliberate NUL, present |
| `ctl-carriage-return.kicad_sch` | 0 | **1** | the deliberate lone CR, present |
| `ctl-newline.kicad_sch` | 0 | 0 | one extra `0x0a` vs the other sheets, consistent with a raw embedded newline |
| `ctl-tab`, `ctl-double-quote`, `ctl-backslash.kicad_sch` | 0 | 0 | clean |

The deliberate control bytes in the fixture sheets are confirmed present and
exactly where expected; the register and the hand-written source carry none
outside tab/CR/LF. **CONFIRMED, by counting, as instructed.**

## The remaining items

- **Narrowed call-site claim — CONFIRMED.** `[RAN]`
  `grep -rn globalLabel --include="*.ts" .` finds exactly three call sites:
  `lib/schgen/render/emit.ts:171` (under `lib/`, takes `d.labels` from a
  `SheetDrawing`), `tools/schgen/text-metrics/svg-probe.ts:123` (its own
  corpus's `row.net`), and `tests/schgen/render/emit-refusals.test.ts:91`
  (the literal `"SIG"`). Both `probe.ts`'s header and G277 clause 2 state the
  narrowed claim and list all three sites with what the other two pass.
- **Clause 1's correction — CONFIRMED.** G277 clause 7 (and `fixtures.ts`'s
  header) now state *"the writer escapes nothing"* as a fact about the four
  candidate names, not a universal about `quoteString`, and the quote/backslash
  control arms are the refutation of the universal reading, committed and
  driven.
- **Clause 7's reasoning superseded, consequence standing — CONFIRMED.** G277
  clause 9 states the sharpened reason verbatim: *"The predicate must refuse
  control characters not because KiCad rejects them — it mostly does not — but
  because KiCad silently accepts two of them and corrupts the name."* `str()`
  at `lib/schgen/render/sexpr-write.ts:31-33` is named as the clause currently
  carrying the refusal, and both G277's prose and the CRITERION for clause 7
  state it fires at **emit**, not at `validateCircuit`.
- **The absolute-path fix — CONFIRMED.** `[RAN]` `grep -n "/Users/\|/home/\|/private/"
  tools/schgen/label-syntax/probe-run.log` — no match. The one `REFUSED` line
  in the log reads `...for <repo>/tools/schgen/label-syntax/sheets/ctl-newline.kicad_sch...`.
  No absolute path from any checkout survives in the committed log.
- **Clause 8's asymmetry stated, not hidden — CONFIRMED.** G277's Verified
  paragraph: *"RELAYED, still for clause 8 ... That asymmetry is the honest
  state of this entry: the syntax half now has both controls committed and the
  census half has its strongest check living outside the repository."*

## Also verified

- **Suite — CONFIRMED.** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen
  bun test` → **3812 pass / 0 fail / 43602 expect() calls across 353 files**,
  exit 0, unchanged. `[RAN]` without `SCHGEN_SOURCE`, `port-fidelity.test.ts`
  **fails** (`4 pass / 8 fail`) rather than skipping, on `SCHGEN_SOURCE is not
  set` — deliberate, confirmed.
- **Typecheck — CONFIRMED.** `bun run typecheck` → `tsc --noEmit`, no output,
  exit 0.
- **Re-drivability — CONFIRMED.** One-line diff (the commit SHA only) between
  a fresh run and the committed log; all ten sheets `unchanged on disk`.
- **No production code changed — CONFIRMED.** `git diff --name-only
  3b8dec3..15696e0 -- lib/ circuits/ boards/ Makefile` is empty.
- **Boundary census and adjunct — CONFIRMED from the re-run log.** `BOUNDARY
  CENSUS: over 11 boards, 16 synthetic net name(s) exist in the models and 0
  of them reach a global label.` `labelled nets failing NET_NAME ... 20.`
  Four candidates: `parsed: 4; round-tripped: 4; drew an outline: 4`.
- **No AI attribution — CONFIRMED.** `[RAN]` `git log -1 --format=%B` over all
  seven commits in the range, grepped for `claude|anthropic|co-authored|
  generated with|session` — the only hits are literal `CLAUDE.md` filename
  references inside prose, never an attribution trailer.
- **Line ceilings — CONFIRMED.** `probe.ts` 435, `fixtures.ts` 238, both
  inside `CLAUDE.md`'s 300–500 band.

## Reviewer hygiene

Nothing tracked was perturbed in this review: all `kicad-cli` drives for
independent verification were run against the committed sheets with output
written to the session scratchpad only, and the probe's own re-run reported
every sheet `unchanged on disk`. `git status --porcelain` is empty. No
`git checkout HEAD --`, no commit, no fix.
