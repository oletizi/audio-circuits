---
title: How schgen produced acceptable schematics — the development history
date: 2026-10-19
status: research findings
---

# How schgen produced acceptable schematics

`tools/schgen` in `/Users/orion/work/pedals-work/digital-pedal-platform` is the
schematic generator this repository is about to port. Its finished code shows
what survived. This document is about the history: what it was arrived at
*from*, what was abandoned, who decided the drawings were good enough, and what
the clearance refusals were each reacting to.

**Every claim below is marked CONFIRMED (I read the primary source and quote or
cite it) or INFERRED. Agent narration is attributed as agent narration: an agent
claiming success in a transcript is not evidence of success.**

---

## 0. Source audit — read this before trusting anything else here

### The commit dates are real, not an import or a squash

CONFIRMED. All 105 commits touching `tools/schgen` carry author date **and**
committer date `2026-10-04`, spanning **00:53 to 21:26 PDT** — one 20.5-hour
stretch. That looked like an import, so I checked the surrounding history: the
repository has 580 commits spread over `2026-09-02` … `2026-10-07`, with per-day
counts of 1, 2, 4, 4, 27, 18, 6, 5, 28, 7, 19, 23, 22, 4, 37, 23, 40, 57,
**167**, 46, 36, 4. Dates vary normally across the repo and author/committer
dates match everywhere. **It was one very long day**, not a squash. 167 of that
day's commits are on 10-04; 105 of those touch `tools/schgen`.

This matters for the port: the whole generator was built, and the real board
drawn with it, inside a single continuous session. There was no cooling-off
period, no second opinion arriving days later. Whatever quality it has was
produced by the review structure described below, in-session.

### The transcripts do contain the schgen work

CONFIRMED, with one correction to the brief's framing. The directory
`/Users/orion/.claude/projects/-Users-orion-work-pedals-work-digital-pedal-platform/`
holds **278 `.jsonl` files / 743 MB**, but it is **one session**, not 278
sessions: a single top-level transcript
(`c21fbdd6-39c5-4ae4-8870-2c9324eefdd3.jsonl`, 30 MB) plus **277 subagent
transcripts** under `c21fbdd6…/subagents/`. The top-level file spans
`2026-10-01` … `2026-10-07` and contains **123 messages typed by the owner**.
The schgen work is in there.

### Correction: schgen did not draw a fuzz pedal

CONFIRMED, and the port should not assume otherwise. schgen's target was the
**H7 platform** — an STM32H743IIT6 digital pedal mainboard: 7 pages, 103 circuit
blocks, 176-pin MCU, SDRAM, PCM3060 codec, buck + LDO, 6 pots, USB-C. The
artifact is `h7-platform/boards/v1/h7-platform.pdf` and the only
`schgen.lock.json` in the repo is `h7-platform/boards/v1/`. "OSCAR" is not a
board schgen drew; it is a **third-party reference design**, fetched at pinned
commits, that gate 8 compares the carried-over subcircuits against. The fuzz
pedal is a separate, earlier project in the same repo (`fuzz/`) and is the source
of the *layout* tooling, not the schematic generator.

**Implication for the port:** schgen's templates were sized by a dense digital
mainboard, not by a four-stage discrete audio circuit. The template set is biased
accordingly (see §7).

---

## 1. The arc

CONFIRMED from git log, the spec's own revision history, and transcript
timestamps. (Transcript timestamps are UTC; git dates are PDT. I have converted
to PDT throughout so the two line up.)

| When (PDT) | What |
|---|---|
| 10-03 21:36 | Owner asks to adapt the fuzz board-layout tooling to the digital pedal. |
| 10-03 21:48 | Owner: *"why can't you place all the parts?"* — the originating directive (§2). |
| 10-03 22:02 | **Spec rev 1** committed (`d9f5753`). Its rendering decision is **"Labels, not wires."** |
| 10-03 22:19 | Owner pastes a **third-party review**: rev 1 is **blocked** on exactly that decision (§3). |
| 10-03 22:20 | **Spec rev 2** (`a4b0ad6`): wired blocks, normalised IR, authority hierarchy. |
| 10-03 22:45 | **Spec rev 3** (`4c48a2b`): explicit block rendering, templates never create connectivity. |
| 10-03 22:19–22:45 | Second third-party review: **remove the automatic label fallback** (§3, §8). |
| 10-03 22:49 | Owner: *"approved. proceed"*. Spec marked approved at 22:50. |
| 10-04 00:12 | Third-party review of the two **implementation plans** (A1 generator, A2 board). |
| 10-04 00:29 | Owner: *"proceed"*. |
| 10-04 00:53 | **First schgen commit.** |
| 10-04 00:53–02:47 | Core built bottom-up: IR → s-expr writer → symbol library → geometry → validator → **connectivity model** → templates → bus/labels → ref lock → sheets → emit. |
| 10-04 02:11 | **First clearance refusal** (`bodyClearance`) — reacting to a specific template defect. |
| 10-04 03:01–04:16 | **The text crisis.** Text becomes first-class geometry; 4 of 7 templates fail the new check and are temporarily exempted; all exemptions removed by 04:16 (§6). |
| 10-04 04:23–06:34 | Toolchain wrappers, pipeline, integration tests under real `kicad-cli`, then **gates 6, 3, 7, 8** and the gate runner. |
| 10-04 06:47 | Generator wired into `make check` and CI. **A1 complete: 67 commits in ~6 hours.** |
| 10-04 08:40 | **A2 begins** — the real H7 circuit scaffold lands. |
| 10-04 08:40–21:26 | **38 further `tools/schgen` commits**, almost all driven by the real board exposing generator gaps (§6). |
| 10-04 17:21 | **First PDF committed** (`507676d`) with the one-page owner summary. |
| 10-04 17:50–19:46 | Readability review passes 1 and 2, and their fixes (§5). |
| 10-04 20:17 | Owner asks whether the mute relay could be a bypass relay — a design change that invalidates page 5 **after** acceptance (§2). |
| 10-04 21:26 | Last schgen commit: a **revert** (§8). |

**Shape of it:** the design was settled in three hours the previous evening,
under two rounds of outside review; the generic generator was built in six hours
against synthetic fixtures; then the real board spent thirteen hours finding
things the fixtures could not. **Over a third of all generator commits came
after the generator was "done" and a real circuit was pointed at it.** That ratio
is the single most useful planning number in this document.

---

## 2. The owner's own words

CONFIRMED by reading all 123 owner-typed messages in the top-level transcript.
Verbatim, with timestamps converted to PDT.

**The originating directive** (10-03 21:48), about placement generally, which
set the terms for the schematic work too:

> why can't you place all the parts? I'm not an electrical engineer. I suspect
> you will be more successful developing a way to place parts and validate the
> layout according to industry best practices than me

**On the design proposals**, each time relaying an outside review rather than
reviewing himself (10-03 22:19 and 22:44):

> Here's a third-party review. Push back where you disagree:

**His approvals, in full** (10-03 22:49, 10-04 00:29):

> approved. proceed

> proceed

**His only three check-ins during the 21-hour build** (10-03 23:00, 23:15,
10-04 15:07):

> progress?

**On CI latency** (10-04 08:15) — not about schematics, but it changed how the
work was verified from then on:

> That's unacceptable.
> If running the test suite locally is faster, prefer that. Waiting for 6+
> minutes for every commit is *insane*. It's also an unbounded wait, which will
> certainly become pathological

**On where rules are allowed to live** (10-04 08:16):

> Memories are bullshit. If guidance is not in the repo governance documents, it
> doesn't exist

**The one substantive design correction he made himself** (10-04 20:17 and
20:19), after the schematic had already been accepted:

> Do other digital pedal platforms have a mute relay?

> Can the mute relay double as a bypass relay? If so, then we can use soft
> footswitches instead of mechanical ones.

### The finding that matters most about the owner

**CONFIRMED by exhaustion of the primary source: the owner never once looked at
a generated schematic and said anything about how it was drawn.** Across 123
messages there is no reaction to the PDF's legibility — no approval of a drawing,
no rejection of one, no "that's wrong", no "I can't follow this". I searched his
messages for every form of `pdf`, `schematic`, `legib*`, `readab*`, `looks`,
`drawing`, `follow`; the only hits are his two relayed third-party reviews, two
unrelated "looks good. proceed" approvals from before the schgen work, and
datasheet attachments.

This is not an oversight. It is what the spec committed to, in its own words
(CONFIRMED, `docs/superpowers/specs/2026-10-03-h7-schematic-generator-design.md`
line 27): **"Agents draw the schematic. The owner reviews the outcome, not the
wiring."** What he got instead of the drawing is
`h7-platform/boards/v1/SUMMARY.md` — a generated one-page plain-language sheet
listing pages, rails, open owner decisions, ERC exclusions and deltas. I read
it: it describes the circuit in product terms ("survives 18 V and reverse
polarity", "two bypass relays that wire each input jack straight to its output
jack whenever the effect is off or unpowered") and contains no geometry at all.

His one design correction came through that channel exactly as designed: he read
the summary, asked about the mute relay, and the board changed. **The drawing was
never his review surface. The circuit was.**

**For the port, the consequence is uncomfortable and should be stated plainly:
if you are hoping to find the human eye that signed off on these drawings, there
isn't one. The eye was an agent's. See §5.**

---

## 3. Where the readability criteria actually came from

This is the highest-value finding in the whole investigation, and it is the one
thing the finished code cannot tell you.

**CONFIRMED.** The generator's rendering architecture — the thing that makes its
output legible — was not designed by the agent building it, and was not derived
from looking at its output. It was **imposed from outside, before any code
existed**, by a third-party review that the owner pasted into the session at
10-03 22:19 PDT with the words *"Here's a third-party review. Push back where you
disagree."*

Spec rev 1 (CONFIRMED, `git show d9f5753`, line 23) had decided:

> **Labels, not wires.** Every pin connects through a net label placed exactly on
> its pin end. This is a standard KiCad style, ERC-valid, and diff-friendly.

The review's blocking objection, verbatim from the transcript:

> **1. Blocking: don't adopt "labels, not wires" as the schematic representation**
>
> This optimizes for the generator rather than for the artifact the generator is
> supposed to produce.
>
> You already discovered essentially this pathology in the audio-circuits
> schematic-generation work: when almost every connection becomes a label, the
> schematic stops communicating circuit topology.

and, on why it mattered more than usual here:

> The premise says: *The owner reviews a PDF, not the wiring.* The PDF **is**
> wiring in its human-readable representation. If the owner can't visually follow
> a signal path, power network, oscillator, reset circuit, codec filter, etc.,
> then an important independent verification channel has disappeared.

The rule it demanded, which the reviewer insisted be a requirement and not an
enhancement:

> Generated schematics SHALL show local circuit topology using wires. Net labels
> SHALL primarily identify rails, interfaces, and connections crossing
> functional-block or sheet boundaries.

Spec rev 2 was committed **one minute later**, and carries that sentence almost
unchanged. Rev 3 followed 25 minutes after that. The owner then wrote *"approved.
proceed"*.

### Three things the port should take from this

1. **The criterion came from a channel the producing agent did not control.**
   This is the same invariant this repository's `CLAUDE.md` states — *"An agent
   may never author the acceptance criteria for the artifact it is producing"* —
   and the pedals project satisfied it by routing design review through an
   outside reviewer whose text the owner relayed. It is worth noticing that the
   agent building schgen had, left to itself, chosen the labels-everywhere
   design and justified it on generator-friendly grounds ("ERC-valid,
   diff-friendly"). The producing agent's own judgement went the wrong way, and
   outside review is what turned it around.

2. **The reviewer's cited precedent is THIS repository.** CONFIRMED against the
   target: `/Users/orion/work/audio-circuits-work/pultec-modularize/lib/kicad/schematic.ts`
   opens with "A KiCad schematic STUB … every pin is carried by a short wire to a
   net label, so **connectivity is carried entirely by labels**. That is a
   starting point, not a drawing". The pathology the pedals project was warned
   off is the current state of the code this port is meant to replace. **The port
   is not importing a solution to a new problem; it is importing the fix to a
   failure already sitting in this repo.** The honest framing of the port is
   therefore: *stop emitting the labels stub, adopt wires-inside-blocks.*

3. **The provenance of the reviewer is unestablished, and I am flagging it
   rather than guessing.** INFERRED, weakly: the pasted text carries artefacts
   characteristic of a chat-LLM transcript (`⸻` separators, `⁠￼` link glyphs,
   `?utm_source=chatgpt.com` on citations elsewhere in the same owner's pastes).
   It may well have been another model rather than a paid human reviewer. **This
   does not weaken the finding**, and the port should not read it as weakening
   it: what did the work was that the critique came from outside the producing
   agent and the owner treated it as binding. The channel is the mechanism, not
   the reviewer's species.

---

## 4. There was never a readability score. That is a deliberate absence.

CONFIRMED, by three checks that could each have failed:

- I scanned all 278 transcripts (743 MB, streamed line by line) for
  `readability score`, `legibility score`, `aesthetic score`, `crossing count`,
  `count crossings`, `wire crossings`, `minimise/minimize crossings`,
  `readability metric`, `score the layout`, `grade the readability`. **Two
  substantive hits, neither a scoring attempt**: one is `kicad-cli --draw-hop-over`
  in a help dump, the other is a reviewer noting an agent had made *"a slightly
  overstated refusal claim for wire crossings"* — i.e. an agent overclaimed what
  the checks did and an independent reviewer caught it.
- `grep -i crossing tools/schgen --include='*.ts'` (non-test) returns only
  `wireSafety.ts` and `connectivity.ts`, where "crossing" is strictly about
  **electrical correctness** — a label sitting at the crossing of two wire
  interiors joins both nets, so it is refused. Never about counting or
  minimising crossings for looks.
- Neither spec rev 1, 2 nor 3 proposes a metric, and neither third-party review
  asks for one.

**No one tried to score readability and failed. It was never attempted.** The
reviewer who blocked the labels design proposed templates plus a no-fallback rule
plus an independent reading gate *instead* of a metric, and that is what was
built.

INFERRED, and I think it is the right reading: readability in schgen is handled
as a **criterion/mechanism split**, which is exactly the distinction this
repository's `CLAUDE.md` insists on. The **criterion** is "an independent reader
can follow this block from the drawing alone" — a judgement, never a number. The
**mechanisms** are templates (produce an idiom in a known-good arrangement) and
clearance refusals (make specific misreadings impossible). The mechanisms are
machine-checkable precisely because they are not the criterion. **A port that
tries to collapse these — to find the number that means "legible" — is rebuilding
something this project deliberately did not build.**

---

## 5. How "acceptable" was actually decided

CONFIRMED in detail, because the whole proceeding is committed:
`h7-platform/boards/v1/VERIFICATION.md` (1295 lines; the readability review runs
from line 945). The procedure was specified in advance as **Task 22** of the A2
plan, and marked `[AGENT REVIEW]`.

### The gate

CONFIRMED, from the reviewer's dispatch prompt (recovered from
`subagents/agent-a5ece5e34462a1b75.jsonl` line 1 — at 32 MB the largest
transcript in the session):

> You are the independent readability reviewer for an electronic schematic. You
> may use ONLY two inputs: the PDF … and the "Label-rendered blocks" section of
> RENDER-REPORT.md
>
> Do not read the circuit description, the code, the IR or the design notes. You
> are checking whether the drawing alone can be followed. … Convert every PDF
> page to high-resolution PNG … Then crop regions so you can read them closely.
> Look at every page.
>
> A block that cannot be followed is a defect even if every machine check passes.

So: **a subagent, rendering the PDF to PNG at 300 dpi (900 dpi for spot checks),
cropping region by region, forbidden from reading the source.** Not a person.
Its findings were then written verbatim into a committed file, which is why they
survive.

### What it produced, pass 1

CONFIRMED from `VERIFICATION.md`:

- **103 circuit blocks checked. 101 followable, 2 not.**
- Five requested end-to-end traces (signal paths, power network from DC jack to
  every rail, HSE oscillator, reset/boot, codec analog in and out) — all
  followable, with the route it read off the drawing written out so the claim
  could be checked.
- Six `rendering: "labels"` blocks challenged on their stated reasons: five
  accepted, **one challenged** (`U_POGO` — the stated reason said "the label
  names the probed net"; the reviewer found this true of only 4 of 9 pads, the
  rest being named by power symbols, and demanded the reason be reworded).
- **20 numbered defects, each graded blocking or cosmetic, each with page and
  zone. Exactly 1 blocking.**

The blocking defect is worth quoting because it is so specific: KiCad's
do-not-populate cross on `D4`/`D7` ran along the Zener triangle's sloping sides
and through its cathode bar, so *"even at 900 dpi the zener's orientation
(anode/cathode) cannot be read"* — and the page's own note told the builder to
fit those parts. A correct netlist, a passing ERC and eight green gates, and the
drawing still could not be built from.

### The loop, and how many iterations

CONFIRMED. **Two passes, three fix rounds, by the same reviewer**, with the
second pass dispatched (transcript, controller message) as:

> Please do the second pass of your readability review. Use the same rules as
> before: only the PDF, plus the "Label-rendered blocks" section of
> RENDER-REPORT.md. … Render the changed pages fresh at high resolution.

Pass 2 outcome, verbatim from `VERIFICATION.md`:

> **Result: 4 of 5 claimed fixes are confirmed in full. The lighter-crosses fix
> is partial: it fixes defects 7 and 14 but not blocking defect 1.**

and it introduced four new cosmetic defects of its own (N1–N4), one of which —
*"the page references '[2,7]' for SWCLK and SWDIO sit side by side above two
adjacent labels and touch"* — was fixed in `render/fanoutRows.ts`. The blocking
defect took a third attempt (§8).

### The three things a port should copy from this gate

1. **The reviewer is denied the source.** That is what makes it a reading test
   rather than a consistency check.
2. **Every defect is fixed at its source with a failing fixture test first** —
   plan text: *"a template change with a failing fixture test first … a symbol
   arrangement; a block split; or replacing a challenged `labels` block with a
   wired template"*. Never by hand-editing the drawing.
3. **The verdict is committed verbatim, including what was left unfixed.** 16 of
   the 20 first-pass cosmetic defects were **deliberately not fixed**, each
   listed under "Known cosmetic items, left as they are by the controller's
   ruling" with the cost stated (*"cost if wrong: larger paper sizes remain"*).
   Half-empty A2 sheets, two different VSSA glyphs on one page, abutting power
   symbols, a tiny USB ESD symbol, sideways supply arrows — all knowingly
   shipped. **"Acceptable" meant "one blocking defect fixed and nineteen cosmetic
   ones adjudicated", not "clean".**

### One honest weakness in the gate

CONFIRMED and worth flagging: the dispatch prompt **pre-named the defect
categories** the reviewer should look for — *"text overlapping or too close;
labels or notes naming parts by ids that are not on the drawing; … wasted space
that forces a large paper size; a 'do not populate' cross that hides pin
numbers; unclear supply arrows; wide bus legends."* Compare that list with the
20 defects actually reported: it anticipates defects 5, 6, 7, 11 and 8 almost
one-to-one.

So the reviewer was independent of the *source* but not of the controller's
*expectations*, and the controller was the agent that had just built the thing.
This is a softer version of the failure this repository's `CLAUDE.md` describes —
the producing side choosing what the checks are. INFERRED: the reviewer did find
things outside the hint list (the blocking Zener case, the U_POGO challenge, the
VSSA double-glyph), so the hints did not fully determine the outcome. But a port
that wants a genuinely independent reading gate should **give the reviewer the
criterion ("can you follow it?") and not a list of what to find.**

---

## 6. Where the ~160 clearance refusals came from

CONFIRMED, and the answer is unambiguous: **they accreted, one at a time, each
one reacting to a specific drawing that had already come out wrong.** The spec
anticipated exactly one class of them (wire safety); everything else was
discovered. Current counts: **170 `throw new` in `render/`, 56 in `gates/`, 45 in
`h7/`, 0 in `model/`.**

The author's commit messages name the offending drawing almost every time. Full
chain, in order:

| Time | Module | The drawing that caused it |
|---|---|---|
| 02:11 | `bodyClearance` | *"KiCad would not join these, but a reader would."* Triggered by the regulator template: a labelled `EN` stub ended **on** the first input capacitor's pin. Refuses a wire end or anchor on a pin line, an anchor inside a body box, and a wire crossing the body of a unit it does not attach to. |
| 03:01 | `textBoxes` / `textScene` | Text promoted to **first-class geometry**: per-unit body boxes, fields placed by KiCad's own autoplace convention, text sized at one grid step per character. Nothing had modelled text before this. |
| 03:15 | block-level text clearance | Turning the check on **broke most of the template set**: a `TEXT_CHECK_PENDING` set *"exempts exactly opamp-stage, regulator, crystal and connector-fanout"* — 4 of 7 templates. |
| 03:35 | `fieldPlacement` | Reference/Value placed by deterministic obstacle-aware candidate search: outside slots on pin-free sides, then inside the body, then beside outermost pins. *"No clear slot refuses the block."* |
| 03:47–04:16 | the exempted templates | Each made text-aware in turn; `253664a` **"no template exempt from the text check"** removes the allow-list. CONFIRMED gone: `grep TEXT_CHECK_PENDING tools/schgen` is empty. |
| 12:20 | symbol self-check | A custom symbol's own pin text overlapped itself (`TPS7A4901` NR/SS-DNC). Nothing checked a symbol against itself. |
| 12:51 | `glyphClearance` | *"On the H7 power sheet C_NR's body was drawn over the GND symbol of the regulator's neighbouring pin. checkLayout and assertSheetSafe **both passed it**: body clearance saw only the anchor point, and the text check saw glyphs only as obstacles for text, never against bodies."* |
| 13:11 | `glyphGlyphClearance` | *"Nothing checked two power glyphs against each other, so the GND and VSSA symbols on U_MCU's neighbouring VSS (14) and VSSA (37) pins met corner to corner."* Fixed by growing a power stub a grid step at a time until clear, throwing past eight steps. |
| 13:37 | `symbolSelfText` | The **stock** `W25Q128JVS` draws GND 0.13 mm under HOLD/RESET/IO3 — *"which the old strict-overlap test missed."* The rule became a **0.254 mm (10 mil) minimum gap**, not strict overlap, and the symbol was replaced with a corrected local copy. |
| 14:57 | NC markers as obstacles | *"On the USB sheet J_SWD's reference landed on the X of the stock symbol's **hidden** KEY pin (pin 7)."* `unitText` now adds a box at every NC pin end, hidden or visible. |
| 19:38 | rotated-unit glyph test | Coverage gap: glyph clearance had never been tested with rotated units. |

### The pattern, which is the thing to carry across

**Every new check discovered that the previous checks had a blind spot, and the
blind spot was always the same shape: category A had been modelled as an obstacle
for category B but not for category C.** Body-vs-anchor but not body-vs-glyph.
Glyph-vs-text but not glyph-vs-body. Glyph-vs-body but not glyph-vs-glyph.
Text-vs-everything but not text-vs-no-connect-marker. A symbol against its
neighbours but not against itself.

INFERRED, and I would bet on it: a port will walk this same ladder, because the
ladder is a property of how clearance checking is built up (pairwise, as pairs
are noticed) rather than of this particular board. **The port can short-circuit
it** by enumerating the obstacle categories once — bodies, pin lines, pin
numbers, pin names, interior graphics, wires, junctions, power/PWR_FLAG glyphs,
label outlines, field text, frame borders, no-connect markers (including at
hidden pins), and KiCad's DNP cross — and checking the full matrix of pairs
rather than adding a pair each time a drawing comes out wrong.

### The evidence standard these refusals were held to

Worth copying. CONFIRMED from `ffc4cd5`:

> `glyphClearance.test.ts` reproduces the shape with Fix:R and Fix:C: a block,
> and a two-block sheet, that **every earlier check accepts**. Applied to
> `f568455` (before the TPS7A4901 body was widened) it refuses P_LDO with
> "body of C_NR#1 overlaps the glyph of power symbol GND 2 at (0, 15.24)".

The new check was run against the historical commit that contained the real
defect, and the exact refusal message recorded. **That is a check that could have
failed.** Also note the last line of that message: *"No template geometry
changed."* The refusal was added without moving anything, proving it was a
detector and not a cover for a layout change.

---

## 7. What else a porting agent needs to know that is not in the code

CONFIRMED unless marked.

**Ordering constraints during the build.**

- **The template set must cover every block on the board before the schematic can
  exist at all.** With no implicit fallback, an unrealisable wired block *fails
  generation*. The spec lists this as its first risk and the mitigation is blunt:
  *"the plan builds templates against the actual block list."* **A port cannot
  build the generator and then point it at a circuit; it must enumerate the
  circuit's blocks first and build to that list.**
- **The connectivity model comes before any template.** `cac63f4`→`c43fea9`
  (01:10–01:24) built and tested the KiCad 10 connection model before the first
  template at 01:36. Its rules were **verified by experiment**, not read from
  docs: pin ends and wire ends connect only at an identical point; a mid-wire
  connection needs a junction; **a label connects anywhere along a wire**.
  Consequence baked through every template: *wires are split at every tap, and
  junctions are cosmetic.*
- **Text must be first-class geometry before templates are finalised, not after.**
  It was retrofitted at 03:01 and immediately invalidated 4 of 7 templates, which
  cost three extra review cycles (an explicit A1 ruling splits Task 17 into 17b,
  17c, 17d for this reason). **This is the clearest avoidable cost in the whole
  history.** Design template geometry around text extents from the first
  template.

**Things that look wrong but are deliberate.**

- **`gates/` contains no readability check, and that is correct.** The four gates
  are correctness only. Readability lives in `render/`'s refusals (prevention)
  and in the agent reading gate (detection). Do not "fix" this by adding an
  aesthetic gate — see §4.
- **Reference designators come from a committed append-only `refs.lock.json`.**
  Retired numbers are never reused. The drawing prints designators, not design
  ids — a readability defect (first-pass defect 5) drove that, and generation now
  *refuses* a word shaped like a design label that names no part and no net.
- **`#PWR`/`#FLG` references are numbered per sheet** (sheet ordinal × 1000 + n)
  so regeneration churn stays on the edited sheet. A ruling records the cost:
  *"cost if wrong: unusual reference numbers."*
- **The generated netlist and PDF are committed**, with a `PDF-SOURCE.sha256`.
  `check` regenerates in memory and fails on any difference. UUIDs are UUID v5
  from stable keys so output is byte-stable.
- **`check` never writes the version lock; only `--accept-toolchain` rewrites
  it.** This exists because a third-party reviewer pointed out that otherwise
  *"an agent encountering library drift could reflexively run generate, thereby
  blessing the drift it was supposed to investigate."*
- **The partial-design escape hatch is in the harness, not the validator.** The
  A1 plan had proposed `validateCircuitWith(c, symbols, pending)` so sheets could
  be built one at a time; the plan reviewer refused it — *"pending is not a
  property of a valid circuit. It's a property of the A2 development harness"*.
  CONFIRMED taken: `validateCircuitWith` does not exist in the shipped code, and
  `pending` appears only in `tools/schgen/h7/sheetHarness.ts`. **Production
  validation has no escape hatch.** A port that wants incremental development
  should put the tolerance in its harness from the start.

**Gotchas that cost real time here.**

- **KiCad rotates symbol fields with the symbol and flips their justification.**
  Mapped by experiment; the emitter must write field angle and justify explicitly
  *"so KiCad, which turns fields with their symbol, draws them as checked."*
  Place-then-emit without this and the drawing you checked is not the drawing
  KiCad draws.
- **Hidden and stacked pins are a recurring source of confusing output.** Hidden
  stacked pins produce *"lone junction dots … with no visible branch"* (a review
  agent's words), symbols hide stacked power pins so block titles cite pin
  numbers that appear nowhere on the drawing (cosmetic defect 9, shipped
  unfixed), and a hidden KEY pin's no-connect X collided with a reference. **Load
  hidden pins, model them, and expect them to look wrong.**
- **`library.ts` must flatten `extends`** — *"an unflattened copy silently drops
  every pin."*
- **KiCad's DNP cross cannot be suppressed.** `SCH_SYMBOL::PlotDNP` draws it over
  body and pins unconditionally; **only its colour is configurable**, through the
  theme's `dnp_marker`. schgen ships a hermetic `schgen` colour theme that
  changes nothing else and exports with `--theme schgen`. The text checker then
  had to **model the cross geometry itself** (`dnpCross`) and refuse any mark
  placed under one.
- **`kicad-cli` must run hermetically.** `KICAD_CONFIG_HOME` points at a
  schgen-managed directory seeded from the install's template library tables,
  *"gate results must not depend on personal KiCad config."*
- **Stock KiCad symbols are not trustworthy and are not exempt.** The stock
  `W25Q128JVS` fails the 10 mil pin-text gap; the stock `STM32H743IITx` types both
  VCAP pins `power_out`, which forces a recorded ERC exclusion. Rulings made
  corrected local copies, each with a datasheet pin table, each independently
  reviewed. The same ruling applies to footprints: *"stock KiCad footprints are
  not exempt from the manufacturer-pattern rule."*
- **Templates are biased toward a digital mainboard.** The seven shipped
  templates are `passiveChain`, `opampStage`, `divider`, `railRow`, `crystal`,
  `regulator`, `connectorFanout` (plus an `opampClassify` helper). Note that the
  spec's "decoupling bank beside an IC's supply pins" and "2-terminal parts on a
  rail" became **one** template, `railRow` — the spec's template list is not 1:1
  with the shipped files.
- **One of the seven templates did not fit the real part it was written for.**
  See §8.

**Process facts that are load-bearing, not incidental.**

- **Every controller decision was written to a committed rulings file**, in the
  format *decision — why — cost if wrong*
  (`docs/superpowers/plans/2026-10-03-h7-schgen-a1-rulings.md`, 23 rulings;
  `…-a2-rulings.md`, 24). This is how the A2 board's discoveries got back into
  the A1 generator as deliberate, attributable changes. The owner's *"Memories
  are bullshit. If guidance is not in the repo governance documents, it doesn't
  exist"* is the stated reason the file exists at all.
- **CI was abandoned as the inner loop** after the owner's 6-minute complaint;
  `make -C h7-platform check` runs locally in about 7 seconds (controller's
  measurement, relayed). The gates were designed to be fast enough to run per
  commit.
- **KiCad-dependent tests fail rather than skip**, by ruling: *"board-checks.yml
  forbids skip-as-pass."* This matches this repository's own standard.

---

## 8. Dead ends

The most valuable section for the port, since these cost the pedals project real
time and will otherwise be rediscovered.

**1. "Labels, not wires" — killed at design review, before any code.** CONFIRMED
(§3). Spec rev 1's central rendering decision, justified as *"a standard KiCad
style, ERC-valid, and diff-friendly"*, reversed within an hour by outside review
citing this very repository's prior experience. **Cost: one hour, because it was
caught in a spec rather than in a drawing.** This is the cheapest dead end in the
history and the only one caught before implementation. The lesson is about when
review happened, not what it found.

**2. Automatic label fallback for unrealisable blocks — killed at the second
design review.** CONFIRMED. Rev 2 had: *"A block whose topology fits no template
falls back to labels inside that block only, and is listed in the render report
so a template can be added."* The reviewer's objection, verbatim:

> Why generate a knowingly inferior schematic and rely on an agent later noticing
> it? … You already know the desired invariant. Make the tooling enforce it. …
> That's much safer than silently degrading.
>
> This also makes the readability gate a genuine independent check rather than
> part of the normal rendering workflow.

Rev 3 replaced it with hard failure. That last sentence is the deep point: **a
fallback does not merely degrade the output, it degrades the gate**, because the
independent reviewer ends up auditing damage the pipeline chose to do rather than
reading a drawing the pipeline stands behind. A port tempted to add "just emit
labels if no template fits" is giving up the reading gate as well as the drawing.

**3. The `TEXT_CHECK_PENDING` allow-list — a deliberate temporary scaffold, fully
removed in 61 minutes.** CONFIRMED (§6). When text clearance was switched on,
4 of 7 templates failed; rather than weaken the check, the commit exempted those
four **by name** and the exemptions were retired one by one, with
`253664a`'s subject line stating the end state: *"no template exempt from the
text check."* An independent reviewer then verified the removal and said so:
*"The allow-list is gone with no substitute. The text check is strictly stronger
and, as my probe shows, now catches overlaps the old model missed"* (review-agent
narration, so treat the "strictly stronger" as a claim — but the absence of
`TEXT_CHECK_PENDING` from the tree is confirmed by grep). **The pattern to copy:
if a new refusal breaks existing output, exempt the specific known cases by name
with a visible marker, never widen the rule.** This repository's `CLAUDE.md` says
the same thing: *"An empty whitelist that refuses loudly beats a general rule
that quietly accepts a guess."*

**4. The `regulator` template did not fit the real buck converter.** CONFIRMED,
A1 ruling: the TPS62933F *"does not fit the regulator template; it is composed
from existing templates in separate blocks (input-cap rail-row, FB divider,
SW–L–VOUT chain, IC fan-out), and a dedicated template is added only if a block
still cannot be realised; there is no labels fallback — the regulator template's
straight in→out bus shape does not match a switcher's SW node and bootstrap."*
INFERRED but strongly supported: **the resolution of "no template fits" was
usually to decompose the block across several existing templates, not to write a
new template.** A1 shipped seven templates and the whole 103-block H7 board was
drawn with them. A port should budget for block decomposition as the primary
tool and new templates as the exception. The cost was recorded honestly: the buck
crosses `BUCK_SW`/`BUCK_BST` between two blocks via labels, and the plan hands
the question to the readability review — *"the readability review (Task 22)
judges whether that reads clearly or needs a dedicated buck template."* It
passed.

**5. Fixing a blocking legibility defect by recolouring — insufficient, and the
reviewer caught the overclaim.** CONFIRMED (§5). The lighter `dnp_marker` theme
fixed defects 7 and 14 but not blocking defect 1; pass 2's verdict was *"Still
not fixed"*, and the real fix was a new mechanism — `render/pinMarks.ts` prints
each pin's **identity** ("A"/"K", taken from the circuit description's pin
identities) two grid steps off the pin tip, outside every cross, for a DNP
two-pin part whose symbol shows neither pin numbers nor names. Two things to
carry: the commit that recorded the second pass also had to walk back the first
fix's claim — *"The first-pass DNP fix entry no longer claims the Zener reads
through the lighter cross"* — and the new marks were themselves made subject to
the text check, which had to learn the cross's geometry to do it. **When a
renderer cannot suppress a marking the host tool draws, the fix is to add
information elsewhere, and the new information must enter the clearance system
too.**

**6. `schgen generate --accept-library-set` — added and reverted inside 17
minutes.** CONFIRMED, `8432c87` (21:09) → `9a0ef74` (21:26), the last schgen
commit of the day. A design change swapped one stock library for another, and an
agent added a new CLI flag to accept the resulting lock change. The revert's
message: *"the spec allows one way to rewrite `schgen.lock.json`,
`--accept-toolchain`. This reverts the flag, its code and its tests."* The
existing flag did the job and kept the lock byte for byte. **A spec-level "there
is exactly one way to do this" held against a plausible local convenience.**

**7. Not a dead end, but an invalidation worth planning for.** The owner's
bypass-relay question at 20:17 PDT — *after* both readability passes and the
final fixes — removed the solid-state mute, stopped an in-flight agent
("Mute-fit agent stopped", per the A2 ruling), rewrote page 5, and required a
further independent re-verification pass (*"Page 5 readability … **pass**, per
'Re-verification after the bypass relay (2026-10-04, independent agent)'"*). Note
also that the superseded material was **marked superseded in place rather than
deleted** from `VERIFICATION.md`, so the blocking Zener defect's whole history
survives on a circuit that no longer exists. **Acceptance of a drawing is not
acceptance of a circuit, and the owner's review channel is the circuit.** Budget
for a re-review triggered by a product decision arriving after sign-off.

---

## 9. What I could not establish

Stated plainly rather than filled in.

- **Whether the third-party reviewer was a human or a model.** §3 explains why I
  think the mechanism matters more, but the fact is unestablished. Only the owner
  can settle it, and it would be worth asking before the port decides how to
  reproduce that channel.
- **Whether any human eye ever read these drawings.** CONFIRMED absent from the
  owner's 123 messages; the spec recommends *"a paid human review … before first
  fab"* but I found no evidence one happened inside the window I examined
  (through 2026-10-07). An outside review may exist outside this repository and
  this transcript.
- **Whether the clearance refusals are now complete.** The last one (19:38) was a
  test-coverage gap rather than a new defect class, which is weak evidence of
  saturation. The board stopped changing before the refusals stopped being needed
  — the *h7-split* work on 10-05/10-06 may well have added more, and I did not
  trace it.
- **Pass-rate of the templates on a discrete audio circuit.** Everything here is
  evidence about a digital mainboard. `opampStage`, `passiveChain` and `divider`
  are the three that a Pultec-style circuit would lean on hardest, and I have no
  evidence about how they behave on a board that is mostly those.

---

## 10. Candidate `docs/known-gaps.md` entries

This investigation was scoped to produce one document and change nothing else, so
I have not written these into `docs/known-gaps.md`. They are the findings a later
reader would need and could not re-derive, phrased for that file. **Registering
them is an outstanding action.**

1. **The labels-everywhere emitter in `lib/kicad/schematic.ts` is a known
   failure mode, named as such by the pedals project's design reviewer.**
   Measurement: the reviewer's blocking objection to pedals spec rev 1 cites
   *"the audio-circuits schematic-generation work"* by name; confirmed against
   this repo's own doc comment, *"connectivity is carried entirely by labels"*.
   What would settle it: the schgen port landing wires-inside-blocks and the stub
   being deleted (supersede means delete).
2. **No readability metric exists in schgen and none was attempted.** Evidence: a
   keyword scan of 278 transcripts / 743 MB plus a non-test grep of the generator
   found no scoring attempt; both design reviews proposed templates + no-fallback
   + an independent reading gate instead. What would settle it: nothing — this is
   a measurement that found nothing wrong, recorded so the port does not go
   looking for the number.
3. **The pedals readability gate's dispatch prompt pre-named the defect
   categories**, making the reviewer independent of the source but not of the
   producing controller's expectations. Evidence: the dispatch prompt in
   `subagents/agent-a5ece5e34462a1b75.jsonl` line 1 versus the 20 defects
   reported in `VERIFICATION.md`. Relayed from my own reading, confirmed. What
   would settle it: this repo's own reading gate giving the reviewer the
   criterion and not the list.
4. **Clearance refusals accrete pairwise, and each new one exposes the previous
   ones' blind spot.** Evidence: the eleven-step chain in §6, each step named in
   a commit message with the specific drawing that caused it. What would settle
   it: an up-front obstacle-category matrix (the criterion), rather than the
   ladder (which is what the pedals project did, and is the mechanism I am
   guessing at).
5. **An owner product decision invalidated an accepted drawing after sign-off**,
   costing a re-verification pass. Evidence: owner message 10-04 20:17 PDT;
   `VERIFICATION.md`'s "Re-verification after the bypass relay". What would
   settle it: nothing; it is a cost to budget for.

---

## Primary sources

In the pedals repository, `/Users/orion/work/pedals-work/digital-pedal-platform`:

- `docs/superpowers/specs/2026-10-03-h7-schematic-generator-design.md` — and its
  revision history, `git log -- <that path>`; `git show d9f5753:<that path>` is
  rev 1, with the abandoned "Labels, not wires" decision at line 23.
- `docs/superpowers/plans/2026-10-03-h7-schgen-a1-rulings.md` (23 rulings),
  `…-a2-rulings.md` (24 rulings, including the owner decisions).
- `docs/superpowers/plans/2026-10-03-h7-schgen-a2-h7-schematic.md` — Task 22 is
  the readability gate's specification.
- `h7-platform/boards/v1/VERIFICATION.md` — the readability review itself
  (line 945 onward), both passes, all 20 defects, all fixes, everything
  knowingly left unfixed.
- `h7-platform/boards/v1/SUMMARY.md` — what the owner actually reviewed.
- `git log --reverse --format='%ad %h %s' --date=format:'%m-%d %H:%M' -- tools/schgen`
  — the 105-commit arc. The clearance commits with the drawings that caused them:
  `8217d4f`, `dfa1b6a`, `60cf1ed`, `986a518`, `253664a`, `54d7d3f`, `ffc4cd5`,
  `c2aba75`, `77b6cf7`, `e501b84`, `997078a`, `9c5fb36`. The revert: `8432c87`
  → `9a0ef74`.

Transcripts, under
`/Users/orion/.claude/projects/-Users-orion-work-pedals-work-digital-pedal-platform/`:

- `c21fbdd6-39c5-4ae4-8870-2c9324eefdd3.jsonl` — the one session. The owner's
  123 messages, and both third-party reviews pasted in full.
- `c21fbdd6…/subagents/agent-a5ece5e34462a1b75.jsonl` line 1 — the readability
  reviewer's dispatch prompt.
- `c21fbdd6…/subagents/agent-a59a99a63030805f6.jsonl` line 1 — the final
  whole-branch reviewer's dispatch prompt, for comparison.

These are 743 MB in total and must be streamed line by line, not read whole.
