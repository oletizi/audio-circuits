/**
 * **WHAT THE LABEL-SYNTAX PROBE MEASURES, AND THE SHEET IT PUTS IT ON.**
 *
 * The arms and the sheet construction for `./probe.ts`, which holds the `kicad-cli` drives and all
 * the reporting. **Nothing in `lib/` reads this and no gate calls it.**
 *
 * **WHY THE FILE IS SPLIT HERE RATHER THAN SOMEWHERE ELSE.** Round 2 of the review required the
 * split and named the seam: *"the candidate definitions and the sheet construction are one
 * responsibility, the `kicad-cli` drives and the reporting another."* The test of the seam is that
 * this file can be read to answer **"what is being measured and what does it look like on a
 * sheet"** without reading a single `kicad-cli` call, and `probe.ts` can be read to answer **"how
 * is it driven and what is reported"** without reading an s-expression. It is not a line-count
 * split: `docs/known-gaps.md` **G255** is this branch's record of what compressing prose to dodge a
 * ceiling costs, and the review was explicit that the disclosures are the most valuable thing in
 * the file and may not be cut to make a number.
 *
 * **TWO ARRAYS, AND THE DISTINCTION IS THE WHOLE POINT OF ROUND 2.** `CANDIDATES` are the four real
 * net names the task is about, and they are PREDICTED. `CONTROLS` are six constructed names whose
 * outcomes are PINNED from a scratch drive, and three of them are expected to FAIL. **A measurement
 * with a positive control and no negative control is an incomplete instrument**: `SIGNAL` proves
 * the probe can report a pass, and until round 2 nothing in the committed tree proved it could
 * report a failure. The failing arms are in `CONTROLS` rather than `CANDIDATES` so that an expected
 * failure in the committed log is never read as a regression.
 */

import crypto from "node:crypto"
import { quoteString } from "../../../lib/kicad/sexpr.ts"

/** A4 landscape, which `render` writes as the sheet's paper. The PDF's y is measured against it. */
export const PAPER_HEIGHT_MM = 210

/**
 * A NUL, built from its codepoint **so that this source file contains no raw control byte.**
 *
 * The `ctl-nul` arm needs a real NUL in its net name, and writing one as a literal escape landed a
 * RAW NUL BYTE in this file - which makes `grep` treat the whole source as binary and suppress
 * every match in it. `docs/known-gaps.md` **G277** clause 10 records the same accident doing worse
 * damage to the register itself. The tab, CR and newline arms need no such trick, because `\t`,
 * `\r` and `\n` survive as two-character escapes.
 */
const NUL = String.fromCharCode(0)

export interface Arm {
  /** A filesystem-safe id. A net NAME may hold parentheses or a control character; a file name may not. */
  readonly slug: string
  readonly net: string
  /** For a candidate, where this exact string occurs in the tree. For a control, what it exercises. */
  readonly why: string
  /** A candidate's PREDICTION or a control's pinned EXPECTATION. `probe.ts`'s log says which it is. */
  readonly expect: string
}

/**
 * The four candidates, each transcribed from a file in this repository.
 *
 * **`SIGNAL` IS THE POSITIVE CONTROL AND ITS JOB IS TO BE ABLE TO FAIL**: had it not parsed,
 * round-tripped and rendered, nothing measured here would be about the punctuation. The other three
 * are the two classes `lib/schgen/ir/validate.ts`'s `netNames` refuses with one message - case
 * alone, and case plus punctuation - the second represented by both shapes `pt2399-core` holds.
 */
export const CANDIDATES: readonly Arm[] = [
  {
    slug: "control-upper-snake",
    net: "SIGNAL",
    why: "tools/schgen/label-freedom/fixtures.ts fixtureA's own net; the one name here that the casing rule Task 3 deleted already accepted",
    expect: "parses, round-trips byte-identical, renders",
  },
  {
    slug: "lowercase-authored",
    net: "hi_boost_out",
    why: "circuits/pultec/electrical/mid.ts:28, MID_TAP_POINT - and a LABELLED net on all five Pultec boards, per the census",
    expect: "parses, round-trips byte-identical, renders",
  },
  {
    slug: "synthetic-net-paren",
    net: "Net-(C10-Pad1)",
    why: "circuits/pt2399-core/pt2399-core.ts:128, output_mix_resistor's a pin",
    expect: "UNKNOWN - this is the measurement",
  },
  {
    slug: "synthetic-unconnected",
    net: "unconnected-(U1-CLK_O-Pad5)",
    why: "circuits/pt2399-core/pt2399-core.ts:147, U1 pin 5's net, and :190's clk_o_unused port",
    expect: "UNKNOWN - this is the measurement",
  },
]

/**
 * **THE CONTROLS: three that must pass through the escaping path, and three that must FAIL - two of
 * them SILENTLY, which is the finding.**
 *
 * **THESE ARE NOT PREDICTIONS AND THE LOG SAYS SO.** Every expectation below was established by a
 * scratch drive while writing round 2 and is PINNED here, so the committed run CHECKS it rather
 * than foreseeing it. Dressing a pinned result up as a prediction would be the thing
 * `docs/known-gaps.md` **G271** exists to prevent, one layer further in. The four `CANDIDATES`
 * above were genuine predictions; these are regression expectations.
 *
 * **WHY `RAW<TAB>TAB` IS HERE AND IS THE MOST INFORMATIVE ARM.** Without it, "a control character
 * breaks a net name" would be the obvious reading of the newline, CR and NUL arms - and it is
 * FALSE. A tab is codepoint 9, squarely in the class `lib/schgen/render/sexpr-write.ts`'s `str()`
 * refuses, and KiCad takes it verbatim and writes it back verbatim. So the three failures are about
 * what each character does to the s-expression or to KiCad's string reader, not about a character
 * class, and this arm is what makes that attributable. It is the same move as
 * `tools/schgen/label-freedom/fixtures.ts`'s `a6-off-wire`.
 *
 * **AND THE TWO SILENT ARMS ARE WHY THIS SET EARNS ITS PLACE.** A newline fails LOUDLY -
 * `kicad-cli` exits 3 and nothing is produced. CR and NUL both exit **0** and hand back a
 * DIFFERENT NET NAME than the sheet carried. `CLAUDE.md` names silence that resembles success as
 * the failure mode the whole workflow exists to prevent, and these two are that, in the one place
 * a net name becomes a label.
 */
export const CONTROLS: readonly Arm[] = [
  {
    slug: "ctl-double-quote",
    net: 'BAD"QUOTE',
    why: "the escaping path: a double quote is one of exactly two characters lib/kicad/sexpr.ts quoteString escapes",
    expect: "PINNED: escaped YES, parses, round-trips - the name survives as the escaped form on both sides",
  },
  {
    slug: "ctl-backslash",
    net: "BACK\\SLASH",
    why: "the escaping path: a backslash is the other character quoteString escapes",
    expect: "PINNED: escaped YES, parses, round-trips",
  },
  {
    slug: "ctl-tab",
    net: "RAW\tTAB",
    why: "THE DISCRIMINATOR: a control character (\\u0009) that str() refuses and KiCad accepts verbatim, so the three failures below cannot be read as 'a control character'",
    expect: "PINNED: escaped NO, parses, round-trips with the tab intact",
  },
  {
    slug: "ctl-newline",
    net: "RAW\nNEWLINE",
    why: "THE LOUD NEGATIVE CONTROL: a raw newline (\\u000a) breaks the s-expression's line structure",
    expect: "PINNED FAILURE: kicad-cli exits 3 on 'Failed to load schematic'; parsed NO, round-trip NO, PDF NO",
  },
  {
    slug: "ctl-carriage-return",
    net: "RAW\rCR",
    why: "THE FIRST SILENT NEGATIVE CONTROL: a carriage return (\\u000d) KiCad parses and then DROPS from the name",
    expect: "PINNED FAILURE, SILENT: parses at exit 0, renders - and round-trip NO, because the name comes back as RAWCR",
  },
  {
    slug: "ctl-nul",
    net: `RAW${NUL}NUL`,
    why: "THE SECOND SILENT NEGATIVE CONTROL: a NUL (\\u0000) KiCad parses and then TRUNCATES the name at",
    expect: "PINNED FAILURE, SILENT: parses at exit 0, renders - and round-trip NO, because the name comes back as RAW",
  },
]

const sha256 = (text: string): string => crypto.createHash("sha256").update(text).digest("hex")

/**
 * UUIDs derived from the sheet and item name, never generated: a random one would make every
 * written sheet differ from the committed one on every run, so the derived-artifact comparison
 * could only ever be by timestamp - which `CLAUDE.md` forbids.
 */
function derivedUuid(sheet: string, id: string): string {
  const h = sha256(`label-syntax/${sheet}/${id}`)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const E = "(effects (font (size 1.27 1.27)))"

/**
 * The probe's own two-pin symbol, embedded so no library is resolved and no stock symbol path is
 * assumed. Transcribed from `tools/schgen/label-freedom/fixtures.ts`'s `Fixture:R2`, which took its
 * geometry from the `Device:R` entry embedded in `circuits/transistor-preamp/loop-board.kicad_sch`:
 * a 2.54 mm body box with passive pins at +/-3.81 mm. Nothing else was carried across.
 */
const PROBE_SYMBOL = `\t\t(symbol "LabelSyntax:R2"
\t\t\t(pin_numbers (hide yes))
\t\t\t(pin_names (offset 0))
\t\t\t(exclude_from_sim no)
\t\t\t(in_bom yes)
\t\t\t(on_board yes)
\t\t\t(property "Reference" "R" (at 2.032 0 90) ${E})
\t\t\t(property "Value" "R2" (at 0 0 90) ${E})
\t\t\t(property "Footprint" "" (at 0 0 0) (hide yes) ${E})
\t\t\t(property "Datasheet" "" (at 0 0 0) (hide yes) ${E})
\t\t\t(symbol "R2_0_1"
\t\t\t\t(rectangle (start -1.016 -2.54) (end 1.016 2.54) (stroke (width 0.254) (type default)) (fill (type none)))
\t\t\t)
\t\t\t(symbol "R2_1_1"
\t\t\t\t(pin passive line (at 0 3.81 270) (length 1.27) (name "" ${E}) (number "1" ${E}))
\t\t\t\t(pin passive line (at 0 -3.81 90) (length 1.27) (name "" ${E}) (number "2" ${E}))
\t\t\t)
\t\t)`

/** Where the arm's label sits, in mm. Its outline grows leftwards from here. */
export const ARM_ANCHOR = { x: 38.1, y: 38.1 } as const
/** Where the control net's label sits. Far enough in y that one outline is never taken for the other. */
export const RETURN_ANCHOR = { x: 50.8, y: 63.5 } as const

/**
 * One sheet: one resistor, two wires per terminal, and two global labels - the arm's net on pin 1's
 * net and `RETURN` on pin 2's. **THE ARM'S NAME IS THE ONLY THING THAT VARIES BETWEEN SHEETS**,
 * which is what makes a difference in the result attributable to the name, and `RETURN` is on every
 * sheet as a second known-good label to read each export against.
 *
 * **THE NAME ATOM'S BYTES ARE PRODUCTION'S; THE FORM AROUND THEM IS NOT.** The net goes in through
 * `lib/kicad/sexpr.ts`'s `quoteString`, which is what `lib/schgen/render/sexpr-write.ts`'s `str()`
 * calls and therefore what `lib/schgen/render/emit-items.ts`'s `globalLabel` would emit for a net
 * name - so the bytes `probe.ts` reports are the emitter's own answer. **The surrounding
 * `(global_label …)` form is hand-written here**: it does not pass through `str()`, so `str()`'s
 * control-character refusal at `sexpr-write.ts:32-33` is not in this path - **which is exactly what
 * lets the three failing controls exist at all** - and it omits the
 * `(property "Intersheetrefs" …)` node production always emits. Neither affects what KiCad does
 * with the NAME, which is all that is measured; but these sheets are not emitter output.
 */
export function render(a: Arm): string {
  const u = (id: string): string => derivedUuid(a.slug, id)
  return `(kicad_sch
\t(version 20260306)
\t(generator "label-syntax-probe")
\t(generator_version "10.0")
\t(uuid "${u("sheet")}")
\t(paper "A4")
\t(lib_symbols
${PROBE_SYMBOL}
\t)
\t(symbol (lib_id "LabelSyntax:R2") (at 50.8 50.8 0) (unit 1) (exclude_from_sim no) (in_bom yes) (on_board yes) (dnp no) (uuid "${u("sym-R1")}")
\t\t(property "Reference" "R1" (at 55.88 49.53 0) ${E})
\t\t(property "Value" "1k" (at 55.88 52.07 0) ${E})
\t\t(pin "1" (uuid "${u("sym-R1:pin1")}"))
\t\t(pin "2" (uuid "${u("sym-R1:pin2")}"))
\t\t(instances (project "${a.slug}" (path "/${u("sheet")}" (reference "R1") (unit 1))))
\t)
\t(wire (pts (xy 50.8 46.99) (xy 50.8 38.1)) (stroke (width 0) (type default)) (uuid "${u("arm-stub")}"))
\t(wire (pts (xy 38.1 38.1) (xy 50.8 38.1)) (stroke (width 0) (type default)) (uuid "${u("arm-tail")}"))
\t(global_label ${quoteString(a.net)} (shape bidirectional) (at ${ARM_ANCHOR.x} ${ARM_ANCHOR.y} 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "${u("arm-label")}"))
\t(wire (pts (xy 50.8 54.61) (xy 50.8 63.5)) (stroke (width 0) (type default)) (uuid "${u("ret-stub")}"))
\t(global_label "RETURN" (shape bidirectional) (at ${RETURN_ANCHOR.x} ${RETURN_ANCHOR.y} 270) (effects (font (size 1.27 1.27)) (justify right)) (uuid "${u("ret-label")}"))
\t(sheet_instances (path "/" (page "1")))
\t(embedded_fonts no)
)
`
}
