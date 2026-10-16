/**
 * Every refusal `candidateFromDump` has, and the two it has that no board can
 * currently reach.
 *
 * **WHY A SECOND FILE.** `./vero-import.test.ts` imports the seven committed
 * boards and exercises four of the refusals by doing so; the rest need a dump
 * built for the purpose, and one file holding both reached this repository's
 * line ceiling. The split is by what the input IS, which is the same seam
 * `./report-refusals.test.ts` and `./report.test.ts` already use.
 *
 * **EVERY ASSERTION ANCHORS ON THE FRONT OF THE MESSAGE.** These refusals carry
 * paragraphs naming the fix and why nothing is defaulted, and those paragraphs
 * mention the words a loose regex would match - so `toStartWith` on the key is
 * the only form that distinguishes one refusal from another.
 *
 * **ONE REFUSAL CANNOT FIRE TODAY, AND THAT IS ASSERTED RATHER THAN LEFT
 * SILENT.** `vero-import-copper-side` needs a footprint whose pads are chiral,
 * and all thirteen recorded footprints are mirror-symmetric as a pad set - which
 * is measured here, so the day a chiral one is recorded this file says so. One
 * other, `vero-import-wire-unreadable-node`, cannot fire through
 * `candidateFromDump` because the dump READER enforces that grammar first; both
 * halves of that are asserted below. Every other refusal is reachable and is
 * exercised here or by a committed board.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { geometryOf, OFF_BOARD_TERMINAL } from "../../lib/stripboard/board.ts"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import { candidateFromDump } from "../../tools/stripboard/vero-import.ts"
import { facingOf, FACINGS } from "../../tools/stripboard/vero-import-facing.ts"
import { wireNodes } from "../../tools/stripboard/vero-import-nets.ts"
import { refusalFrom, syntheticDump, syntheticReference } from "./vero-import-fixtures.ts"

const RESISTOR = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"
const ONE_PIN = "Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical"
const TRIMMER = "Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical"

/** The two-net reference every synthetic board below is read against. */
const REFERENCE = syntheticReference({ top: ["R1.1", "R2.1"], bottom: ["R1.2", "R2.2"] })

const FOOTPRINTS: ReadonlyMap<string, string> = new Map([
  ["R1", RESISTOR],
  ["R2", RESISTOR],
  ["J1", ONE_PIN],
])

/** One resistor standing across five strips, and the two `NODE` lines it is on. */
const ONE_RESISTOR: readonly string[] = [
  "PART R1 RESISTOR 10K AT 1,1 SPAN 1",
  "PIN R1 1 AT 1,1",
  "PIN R1 2 AT 6,1",
  "NODE 1 NAME top R1.1 R2.1",
  "NODE 2 NAME bottom R1.2 R2.2",
]

function refusal(lines: readonly string[], options: { readonly verticalStrips?: boolean } = {}): string {
  return refusalFrom(() =>
    candidateFromDump(
      syntheticDump({ lines, verticalStrips: options.verticalStrips }),
      REFERENCE,
      FOOTPRINTS,
      PIN_PATTERNS,
    ),
  )
}

test("the synthetic board every case below starts from imports, so each case changes one thing", () => {
  const candidate = candidateFromDump(
    syntheticDump({ lines: ONE_RESISTOR }),
    REFERENCE,
    FOOTPRINTS,
    PIN_PATTERNS,
  )
  expect(candidate.placements.map((placement) => placement.ref)).toEqual(["R1"])
  expect(candidate.placements[0]?.pins.get("2")).toEqual({ strip: 6, column: 1 })
})

test("a vertical-strip board refuses rather than transposing untested", () => {
  expect(refusal(ONE_RESISTOR, { verticalStrips: true })).toStartWith("vero-import-vertical-strips: ")
})

test("a FLOATING part refuses, naming it", () => {
  const message = refusal([
    "PART R1 RESISTOR 10K FLOATING SPAN 1",
    "PART R2 RESISTOR 22K AT 1,3 SPAN 1",
    "PIN R2 1 AT 1,3",
    "PIN R2 2 AT 6,3",
    ...ONE_RESISTOR.slice(3),
  ])
  expect(message).toStartWith("vero-import-unplaced-part: ")
  expect(message).toContain('"R1"')
})

test("a part the footprint map does not name refuses, naming it and the map", () => {
  const message = refusalFrom(() =>
    candidateFromDump(syntheticDump({ lines: ONE_RESISTOR }), REFERENCE, new Map(), PIN_PATTERNS),
  )
  expect(message).toStartWith("vero-import-footprint-unmapped: ")
  expect(message).toContain('"R1"')
  expect(message).toContain("footprints.json")
})

test("a placed part with no PIN line of its own refuses, naming it", () => {
  // The dump must carry SOME pin line, or parseBoardDump refuses first with its
  // own message about an older binary - a different fault, and not this one.
  const message = refusal([
    "PART R1 RESISTOR 10K AT 1,1 SPAN 1",
    "PART R2 RESISTOR 22K AT 1,3 SPAN 1",
    "PIN R1 1 AT 1,1",
    "PIN R1 2 AT 6,1",
    ...ONE_RESISTOR.slice(3),
  ])
  expect(message).toStartWith("vero-import-no-pin-lines: ")
  expect(message).toContain('"R2"')
})

test("a part whose PIN lines name pins its footprint has not refuses", () => {
  const message = refusal([
    "PART R1 RESISTOR 10K AT 1,1 SPAN 1",
    "PIN R1 1 AT 1,1",
    "PIN R1 2 AT 6,1",
    "PIN R1 3 AT 7,1",
    ...ONE_RESISTOR.slice(3),
  ])
  expect(message).toStartWith("vero-import-pin-names-disagree: ")
  expect(message).toContain('"R1"')
})

test("a part whose leads are on no axis of its footprint refuses, listing what was tried", () => {
  const message = refusal([
    "PART R1 RESISTOR 10K AT 1,1 SPAN 1",
    "PIN R1 1 AT 1,1",
    "PIN R1 2 AT 4,3",
    ...ONE_RESISTOR.slice(3),
  ])
  expect(message).toStartWith("vero-import-no-facing: ")
  expect(message).toContain("1@1,1")
})

test("a one-pad part refuses as ambiguous, because all four facings fit it", () => {
  // THE ONE RECORDED FOOTPRINT THAT CANNOT SAY WHICH WAY ROUND IT IS. It is
  // also why a PAD line is refused rather than imported as a one-pin placement:
  // giving a breakout hole a footprint would not give it a direction.
  const message = refusal([
    "PART J1 SIP1 Conn_01x01 AT 2,2 SPAN 1",
    "PIN J1 1 AT 2,2",
    ...ONE_RESISTOR.slice(3),
  ])
  expect(message).toStartWith("vero-import-ambiguous-facing: ")
  expect(message).toContain('"J1"')
})

test("a wire end with no node ids is refused by the dump READER, before this importer sees it", () => {
  // MEASURED, AND IT CORRECTS WHAT THIS TEST FIRST ASSERTED. The WIRE end
  // grammar is `parseBoardDump`'s to enforce and it gets there first, so
  // `vero-import-wire-unreadable-node` cannot fire through candidateFromDump at
  // all. The key is not deleted - `wireNodes` reads those two fields itself and
  // has to say something when they are not there - and the test for it goes
  // through that function instead, below. What a reader must not conclude from
  // the key's existence is that this importer is the thing checking the shape.
  const message = refusal([...ONE_RESISTOR, "WIRE W1 AT 1,2 ENDS 1,2,1 6,2,1"])
  expect(message).toStartWith("unreadable WIRE end ")
})

test("read on its own, an end with no node ids refuses by this importer's key", () => {
  const message = refusalFrom(() => wireNodes("WIRE W1 AT 1,2 ENDS 1,2,1 6,2,1"))
  expect(message).toStartWith("vero-import-wire-unreadable-node: ")
  expect(message).toContain("W1")
})

test("a wire end whose copper and wire node ids disagree refuses rather than preferring one", () => {
  const message = refusal([...ONE_RESISTOR, "WIRE W1 AT 1,2 ENDS 1,2,1,2 6,2,1,1"])
  expect(message).toStartWith("vero-import-wire-node-split: ")
  expect(message).toContain("W1")
})

test("a wire with its two ends on different nodes refuses as two nets", () => {
  const message = refusal([...ONE_RESISTOR, "WIRE W1 AT 1,2 ENDS 1,2,1,1 6,2,2,2"])
  expect(message).toStartWith("vero-import-wire-two-nets: ")
  expect(message).toContain("W1")
})

test("a wire on node 0 refuses, because no net can be put to it", () => {
  const message = refusal([...ONE_RESISTOR, "WIRE W1 AT 1,2 ENDS 1,2,0,0 6,2,0,0"])
  expect(message).toStartWith("vero-import-node-net-unknown: ")
  expect(message).toContain("W1")
})

test("a NODE whose members are in two reference nets refuses, naming both", () => {
  const message = refusal([
    "PART R1 RESISTOR 10K AT 1,1 SPAN 1",
    "PIN R1 1 AT 1,1",
    "PIN R1 2 AT 6,1",
    "NODE 1 NAME mixed R1.1 R1.2",
    "NODE 2 NAME bottom R2.2",
  ])
  expect(message).toStartWith("vero-import-node-net-disagrees: ")
  expect(message).toContain("bottom")
  expect(message).toContain("top")
})

test("a solder bridge that is not two adjacent strips at one column refuses", () => {
  const message = refusal([...ONE_RESISTOR, "SOLDER 1,1 1,3"])
  expect(message).toStartWith("vero-import-bridge-shape: ")
  expect(message).toContain("SOLDER 1,1 1,3")
})

test("a solder bridge joining two nets refuses as a short, naming both nets", () => {
  const message = refusal([
    "PART R1 RESISTOR 10K AT 1,1 SPAN 1",
    "PIN R1 1 AT 1,1",
    "PIN R1 2 AT 2,1",
    ...ONE_RESISTOR.slice(3),
    "SOLDER 1,1 2,1",
  ])
  expect(message).toStartWith("vero-import-bridge-nets-disagree: ")
  expect(message).toContain("top")
  expect(message).toContain("bottom")
})

test("a solder bridge in two empty holes refuses, naming the grammar gap", () => {
  const message = refusal([...ONE_RESISTOR, "SOLDER 3,8 4,8"])
  expect(message).toStartWith("vero-import-bridge-net-unknown: ")
  expect(message).toContain("SOLDER 3,8 4,8")
})

/**
 * THE `PAD` LINE'S FIVE REFUSALS, and the one that used to stand in their place.
 *
 * `vero-import-pad-line` refused every board carrying a `PAD` line, on the
 * grounds that the model had no vocabulary for a one-hole terminal. **The owner
 * settled that:** *"yeah - a single pad has no orientation. It's just a place to
 * solder an off-board wire or a test point to."* A pad is now imported as a
 * one-hole placement, that key is gone, and what it was guarding is covered by
 * the five below plus `vero-import-pins-without-part` - which is the narrowed
 * survivor, for a ref with `PIN` lines and neither a `PART` nor a `PAD` line.
 */
const ONE_PAD = "PAD RV1_1 10K AT 3,3 FROM RV1.1"

/** The synthetic board's reference, widened by the pin a pad can be. */
const PAD_REFERENCE = syntheticReference({
  top: ["R1.1", "R2.1", "RV1.1"],
  bottom: ["R1.2", "R2.2"],
})

function padRefusal(lines: readonly string[]): string {
  return refusalFrom(() =>
    candidateFromDump(syntheticDump({ lines }), PAD_REFERENCE, FOOTPRINTS, PIN_PATTERNS),
  )
}

test("a PAD line imports as a one-hole placement named the way the netlist names it", () => {
  const candidate = candidateFromDump(
    syntheticDump({ lines: [...ONE_RESISTOR, ONE_PAD, "PIN RV1_1 1 AT 3,3"] }),
    PAD_REFERENCE,
    FOOTPRINTS,
    PIN_PATTERNS,
  )
  const pad = candidate.placements.find((placement) => placement.footprint === OFF_BOARD_TERMINAL)
  expect(pad?.ref, "the netlist's name for the part, not the board's").toBe("RV1")
  expect([...(pad?.pins ?? [])], "its one reference pin, in its one hole").toEqual([
    ["1", { strip: 3, column: 3 }],
  ])
  expect(pad?.holes, "a placement is its pins").toEqual([{ strip: 3, column: 3 }])
  // THE FACING IS ARBITRARY AND THE TEST SAYS SO RATHER THAN BLESSING IT. A
  // one-hole part occupies the same hole at all four facings, so this asserts
  // only that the field is filled - not that "E" was derived from anything.
  expect(pad?.direction, "an arbitrary facing, because a single pad has none").toBe("E")
})

test("a FLOATING pad refuses, naming it", () => {
  const message = padRefusal([...ONE_RESISTOR, "PAD RV1_1 10K FLOATING FROM RV1.1"])
  expect(message).toStartWith("vero-import-pad-unplaced: ")
  expect(message).toContain("RV1_1")
})

test("a pad with no FROM field refuses, because nothing else says which pin it is", () => {
  const message = padRefusal([...ONE_RESISTOR, "PAD RV1_1 10K AT 3,3 NOPROVENANCE", "PIN RV1_1 1 AT 3,3"])
  expect(message).toStartWith("vero-import-pad-unprovenanced: ")
  expect(message).toContain("RV1_1")
})

test("a pad with more than one PIN line refuses, because a pad is one hole", () => {
  const message = padRefusal([
    ...ONE_RESISTOR,
    ONE_PAD,
    "PIN RV1_1 1 AT 3,3",
    "PIN RV1_1 2 AT 3,4",
  ])
  expect(message).toStartWith("vero-import-pad-pin-lines: ")
  expect(message).toContain("RV1_1")
})

test("a pad whose PAD and PIN lines disagree about its hole refuses, preferring neither", () => {
  const message = padRefusal([...ONE_RESISTOR, ONE_PAD, "PIN RV1_1 1 AT 4,4"])
  expect(message).toStartWith("vero-import-pad-hole-disagrees: ")
  expect(message).toContain("3,3")
  expect(message).toContain("4,4")
})

test("a pad whose reference pin is in no net refuses, naming the pin", () => {
  const message = padRefusal([
    ...ONE_RESISTOR,
    "PAD RV9_1 10K AT 3,3 FROM RV9.1",
    "PIN RV9_1 1 AT 3,3",
  ])
  expect(message).toStartWith("vero-import-pad-net-unknown: ")
  expect(message).toContain("RV9.1")
})

test("a ref with PIN lines and neither a PART nor a PAD line refuses, naming it", () => {
  const message = padRefusal([...ONE_RESISTOR, "PIN GHOST 1 AT 3,3"])
  expect(message).toStartWith("vero-import-pins-without-part: ")
  expect(message).toContain('"GHOST"')
})

/**
 * THE MIRRORED LABELLING, WHICH IS THE ONE FINDING THIS TASK DID NOT EXPECT.
 *
 * The fork's `TRIM_FLAT` cell map and the RM-065's `.kicad_mod` disagree about
 * which of the two END terminals is pin 1, so no plain quarter turn of the
 * footprint puts pin 1 where a dump puts it. The pads are mirror-symmetric as a
 * POSITION set, so the holes are reachable by a plain turn and nothing is
 * mounted on the copper side; the trimmer is admitted and the disagreement is
 * recorded here. The pins in this test are `RV1`'s on
 * `transistor-preamp-feedback`, a board the owner built.
 */
test("the RM-065 trimmer fits only with its end terminals exchanged", () => {
  const pins = [
    { pin: "1", hole: { strip: 3, column: 5 } },
    { pin: "2", hole: { strip: 4, column: 7 } },
    { pin: "3", hole: { strip: 5, column: 5 } },
  ]
  const fit = facingOf(TRIMMER, pins, PIN_PATTERNS)
  expect(fit.kind).toBe("fitted")
  if (fit.kind !== "fitted") return
  expect(fit.facing.mirroredLabels, "the labels are exchanged").toBe(true)
  expect(fit.facing.stretched, "a trimmer's pins are at its own pitch").toBe(false)
  // AND THE EXCHANGE IS NOT A FLIP: the same three holes are reachable by a
  // plain quarter turn - facing N, with the footprint's origin on the hole the
  // dump calls pin 3 - which is what admits it under the owner's ruling that
  // nothing is mounted on the copper side. So the board's holes are a turn of
  // this footprint and only the two end labels differ.
  const plain = geometryOf(TRIMMER, { strip: 5, column: 5 }, "N", PIN_PATTERNS).pins
  expect(
    [...plain.values()].map((hole) => `${hole.strip},${hole.column}`).sort().join(" "),
    "the same three holes, unreflected",
  ).toBe("3,5 4,7 5,5")
  expect(plain.get("1"), "and it is pin 1 and pin 3 that are exchanged").toEqual({
    strip: 5,
    column: 5,
  })
})

test("a two-lead part at its footprint's own pitch needs no mirror and no stretch", () => {
  const fit = facingOf(
    RESISTOR,
    [
      { pin: "1", hole: { strip: 1, column: 1 } },
      { pin: "2", hole: { strip: 1, column: 5 } },
    ],
    PIN_PATTERNS,
  )
  expect(fit.kind).toBe("fitted")
  if (fit.kind !== "fitted") return
  expect([fit.facing.direction, fit.facing.stretched, fit.facing.mirroredLabels]).toEqual([
    "E",
    false,
    false,
  ])
})

test("the fork's own TRIM_FLAT cell map is recorded, and it is the mirrored one", () => {
  // Transcribed from .tools/veroroute-perfboard/Src/CompTypes.h into a
  // committed file, so this test does not need the fork checked out: the fork
  // is gitignored and a test that read it would fail on a fresh clone for a
  // reason that has nothing to do with this importer.
  const recorded = fs.readFileSync(
    path.join(import.meta.dir, "..", "..", "lib", "kicad", "import-string.ts"),
    "utf8",
  )
  expect(recorded, "the cell map string is recorded").toContain('"+2++++1+3"')
  // Read as a 3 x 3 grid, that string puts pin 2 on row 0 and pins 1 and 3 on
  // row 2; the .kicad_mod puts pads 1 and 3 at y 0 and pad 2 at y 5. Pin 1 is
  // at the left end in both, so the two disagree by a reflection in y - which
  // is exactly the transform the test above measures.
  const pads = geometryOf(TRIMMER, { strip: 0, column: 0 }, "E", PIN_PATTERNS).pins
  expect(pads.get("1"), "pad 1 at the footprint origin").toEqual({ strip: 0, column: 0 })
  expect(pads.get("2"), "the wiper two strips away").toEqual({ strip: 2, column: 1 })
  expect(pads.get("3"), "the far end on pad 1's strip").toEqual({ strip: 0, column: 2 })
})

test("no recorded footprint is chiral, which is why the copper-side refusal cannot fire yet", () => {
  // A SKIPPED CHECK MUST NEVER LOOK LIKE A PASSING ONE. `vero-import-copper-side`
  // fires for a placement whose holes only a REFLECTION of the footprint
  // reaches - a part turned over. No board can produce one today, because every
  // recorded footprint's pad set maps onto itself under reflection, and this
  // asserts that reason rather than leaving the refusal untested and unexplained.
  const chiral: string[] = []
  const normalise = (holes: readonly { readonly strip: number; readonly column: number }[]): string => {
    const strip = Math.min(...holes.map((hole) => hole.strip))
    const column = Math.min(...holes.map((hole) => hole.column))
    return holes
      .map((hole) => `${hole.strip - strip},${hole.column - column}`)
      .sort()
      .join(" ")
  }
  for (const footprint of PIN_PATTERNS.keys()) {
    let plain: readonly string[]
    try {
      plain = FACINGS.map((direction) =>
        normalise([...geometryOf(footprint, { strip: 0, column: 0 }, direction, PIN_PATTERNS).pins.values()]),
      )
    } catch {
      // A footprint geometryOf refuses has no pad set to reflect; the refusals
      // for those are asserted in tests/stripboard/model/board.test.ts.
      continue
    }
    const mirrored = FACINGS.map((direction) =>
      normalise(
        [...geometryOf(footprint, { strip: 0, column: 0 }, direction, PIN_PATTERNS).pins.values()].map(
          (hole) => ({ strip: -hole.strip, column: hole.column }),
        ),
      ),
    )
    if (mirrored.some((shape) => !plain.includes(shape))) chiral.push(footprint)
  }
  expect(chiral, "every recorded footprint's pad set is mirror-symmetric").toEqual([])
})
