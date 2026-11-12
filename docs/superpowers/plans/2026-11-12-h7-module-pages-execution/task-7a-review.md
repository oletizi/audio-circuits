Task 7a review: all twelve drafts recorded, power page repaired (range b9b0c9c..2d05096)

Reviewed in passes over the review package. The .kicad_sch and .svg hunks were skimmed; the op-list generators, tools, RECORD.md, REPLAY.md, replay.sh and the decisions/verdicts hunks were read in full. No tracked file was changed. Scratch work went under the session scratchpad.

## Spec Compliance

- ✅ Spec compliant for the 7a scope, with one record defect (I1 below).
  - Step 1 (toolchain): RECORD.md:302 and REPLAY.md:14043. Not re-run.
  - Step 2 (draft every page): twelve intents are committed under repair/<block>/intent.json, and twelve draft sha256 values are in RECORD.md:307-320 and replay.sh:17877-17892 (diff lines). The advisory, the NO INDEPENDENT NETLIST notice and the paper overshoot are recorded at RECORD.md:322-337. The notice is printed once per board rather than "per page" as the brief says. tools/draught/draw-pages.ts:8 prints it once by design, so this is brief wording, not a miss.
  - Step 3 (power page):
    - The akcli op-lists are committed under repair/power/ (01 to 04 as JSON plus their generators; 05 is the text-edit script, as TOOLING step 5.5 allows for what akcli has no op for).
    - 0 disagreements against the block model.
    - 0 ERC errors on /power/ under the one-block root.
    - Rendered, sent with a question, and the verdict recorded (verdicts.md, 2d05096).
- ⚠️ Cannot verify from the diff: that the render was sent "with a question and nothing else". verdicts.md records the question verbatim. The message itself is not in the repository.

Checks I ran (from the repository root, at 2d05096):
- `sh .../repair/tools/verify.sh power .../power.kicad_sch` ran every step and printed "verify.sh: every step ran".
  - Comparison: componentIdentity, netMembership, pinIdentity and values all 0. The export has 19 components, 12 nets and 44 members.
  - Sheet alone: 3 pin_not_connected errors, as expected for a sheet with no parent.
  - Under the one-block root: /power/ has 0 errors and 0 warnings; / has 3 label_dangling errors.
  - 1 true crossing, 0 orphan junctions, and it fits US Letter.
- `sh .../repair/tools/erc-control.sh`: every control came out as stated, including the PWR_FLAG-stripped negative.
- `bash .../repair/replay.sh <new scratch dir>`:
  - every intent matched its committed copy, and every draft reached its sha256;
  - every generated op-list was byte-identical to the committed one, and each akcli draw reported APPLIED;
  - the hierarchical-label post-condition passed;
  - the page reached 906f4549...875f and is byte-identical to the committed sheet;
  - the sym-lib-table matched.
- render.sh on the committed sheet: the SVG differs from the committed power.svg only in the `<title>` timestamp line (a 4-line diff).
- `bun run typecheck`: clean.
- `bun test tests/circuits/h7-module.test.ts tests/circuits/drafted-kicad-round-trip.test.ts`: 36 pass, 0 fail.
- The carrier page sha256 is still c9355a88...d8f8, and the carrier's erc-control.sh passes (controller commit f3bb79b).

## Strengths

- The replay is real. It regenerates every op-list and compares it byte for byte (replay.sh `same`), and it requires APPLIED rather than trusting akcli's exit 0 on a dry run (replay.sh:17926). It refuses a non-empty work directory, and it pins both the draft and the end sha256.
- The checks can fail, and the controls prove it:
  - block-netcompare.ts exits 1 on any of the four connectivity lists (diff 18378-18379). The negative controls (R5 "4.7K", the deleted R8 stub) are recorded at RECORD.md:445-447.
  - erc_sheets.py (f3bb79b) scopes its one allowance to label_dangling on `/` only. It fails on an absent target sheet and on an extra sheet. erc-control.sh exercises each rule, including the end-to-end PWR_FLAG removal.
- The generators refuse rather than guess:
  - 01-place.py refuses a draft carrying power symbols, or parts that are not layout.py's.
  - 02-wire.py refuses non-axis-aligned or zero-length segments, ends inside segments, pins on wire interiors, and labels not on exactly one wire end.
  - 05-text-edits.py refuses an unknown wire, a part that is not where layout.py puts it, and an unexpected count of fields, flags or rectangles.
- The TypeScript has no `any`, no `as` casts and no @ts-ignore. It refuses with the list of valid blocks (block-netcompare.ts, one-block-root.ts). Every new file is under 200 lines.
- The PWR_FLAG concern was raised openly with a measurement, not buried. Without the flags the page fails ERC, and that is reproduced as a control.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

**I1. The record still says the PWR_FLAGs are "Not ruled" after the controller admitted them, and decisions.md does not carry the admission.**
- Where:
  - drafted/h7-platform/h7-module/RECORD.md:104-110 ("**Not ruled: the two PWR_FLAGs** ... Whether CR-MODULE-PAGE-RAILS admits them is the controller's question").
  - docs/h7-platform/decisions.md:1566 ("Open with it: ... whether this ruling admits them is put to the controller").
  - docs/schematic/verdicts.md (2d05096) already names "the PWR_FLAG admission" as one of the controller rulings the page rests on.
- What is wrong: three files now disagree about whether a ruling exists, and the one the brief makes canonical for rulings (decisions.md, brief Step 5) says it does not. 2d05096 edited RECORD.md and left this line.
- Failure scenario: the next agent repairing a block (the MCU page will need flags on 3V3_D, VREF_A and likely GND, per report concern 1) reads RECORD.md and decisions.md. It finds no ruling, re-raises the question or omits the flags, and the page fails ERC. Or it re-asks a settled question, which CLAUDE.md names as the cost of an unrecorded ruling.
- Fix: record the admission in decisions.md as a controller ruling (the owner may override), carrying its scope and its cost if wrong. Then change RECORD.md:104 to link to it.

**I2. The measurement the PWR_FLAG admission rests on does not cover a shared net, and on a shared net two PWR_FLAGs are an ERC error. The per-block ERC discipline will put more than one on GND.**
- Where:
  - repair/power/03-pwr-flags.py:9-14 (the docstring) and RECORD.md:105-109. Both justify the flags by a fixture probe that put one flag on block a's private FB and one on block b's: two different nets.
  - repair/tools/verify.sh with erc_sheets.py, which require 0 errors on every block's sheet under a root holding only that block.
- What I measured: on a scratch copy of power.kicad_sch I added one more PWR_FLAG on the GND row at (9500, 4800) mils with akcli place_pwr_flag. `kicad-cli sch erc --severity-all` then reported a new `pin_to_pin` error, 4 errors in all against 3 before. Script: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/flagprobe.sh.
- Not measured: the same pair across two sheets. It is inferred, because KiCad resolves pin conflicts per net after hierarchy, and /GND is one net at the root.
- Failure scenario:
  - Each block with a power_in pin on GND (U2 here; the MCU's VSS and the SDRAM's VSS are likely) can only reach 0 errors under its own one-block root by carrying its own GND PWR_FLAG.
  - At the assembled root (Task 7b), those flags meet on /GND and ERC reports pin_to_pin. The root then cannot pass ERC without removing flags that the per-block verifier requires.
  - The two gates contradict each other. The claim "a PWR_FLAG joins nothing across pages" is true about net names but not about ERC.
- This is not a defect in the 7a page, which passes both checks today. It is a defect in the evidence recorded for the admission, and a forward trap for the root.
- Fix: before the next block that needs a GND flag, decide where GND's single PWR_FLAG lives. Options are the root, or the interface page where GND enters. The one-block-root check could then supply a flag on the stub side, so that a block page carries none on shared nets. Whatever the choice, extend the recorded measurement to the shared-net case.

### Minor (Nice to Have)

- **M1.** repair/power/02-wire.py, docstring lines 4-6 and 9-10 (diff 16797, 16802): the numbering is stale. It says "04-text-edits.py reads" the sidecar (now 05) and "Op-list 03 (`tools/draught/hierarchical-labels.ts`)" (now 04; 03 is the PWR_FLAGs). Failure scenario: a reader following the op-list order from this file looks for the wrong step.
- **M2.** repair/replay.sh:17923-17924 (`apply`): akcli's stderr is sent to /dev/null for both plan and draw. On failure the replay names the op-list but discards akcli's reason. Keep stderr, or write it to a file in $work and name that file.
- **M3.** repair/replay.sh:17891: `draft_sha`'s `*) fail ...` runs inside `$(...)`, so it exits only the subshell. An unrecorded block still fails, but at `check`, with "expected ''" rather than the intended message.
- **M4.** repair/tools/counts.py:18403-18404 (diff): flags are classified by reference prefix. akcli names PWR_FLAGs `#PWR0n`, so the count prints "2 power, 0 flags" for two PWR_FLAGs. RECORD.md:168 explains this, but the tool's own output is misleading. Classify by lib_id (`power:PWR_FLAG`) instead.
- **M5.** repair/tools/block-netcompare.ts:18341 (diff) imports `pinNumbersFromTable` from `tests/circuits/own-mapping-board.ts`. A repair tool now depends on a test helper, so a test refactor can break the verifier.
- **M6.** repair/tools/render.sh:18834-18836 (diff): kicad-cli's stderr is not filtered, so the Fontconfig warning reaches the output on every render (seen in my run). Only magick's stderr is filtered. Copied from the carrier.
- **M7.** repair/tools/erc_counts.py (module copy): it is now out of step with the carrier's version, which fails on errors after f3bb79b. Here that is intentional, because the sheet-alone run is report-only. But the module copy's docstring does not say it never fails, and REPLAY.md:14067 still calls it "copied unchanged". State the difference in the docstring.

## Assessment

**Spec compliance:** ✅ for the 7a scope, with I1 a record defect against brief Step 5.

**Task quality:** Needs fixes.

**Reasoning:** The page agrees with the model and passes ERC under its root, the replay reaches every sha256 from a fresh directory, and the verifier's checks are shown to fail. The PWR_FLAG ruling, however, is unrecorded where rulings live (I1). The evidence behind it misses the shared-net case, which my measurement shows is an ERC error and which the per-block discipline will produce at the root (I2).
