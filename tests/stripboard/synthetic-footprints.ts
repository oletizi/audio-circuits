/**
 * The two SYNTHETIC footprints the grader's tests need, and the maps they are
 * registered in.
 *
 * WHY SYNTHETIC FOOTPRINTS EXIST AT ALL. `PIN_PATTERNS` holds the footprints
 * this repository PLACES and nothing else, and every one of them decomposes
 * into rows along one axis strictly longer than the other. So nothing recorded
 * exercises `admitPattern`'s across-strip refusal, and nothing recorded
 * exercises `hc10Rows`' tie refusal - both of `HC10`'s own refusals would be
 * untestable without a pad field that this repository would never place.
 *
 * SPLIT FROM `./grade-fixtures.ts` FOR THE LINE CEILING: that file reached 546
 * lines. It builds boards; this one declares the two pad fields no real board
 * has. Nothing moved but location.
 */
import { classifyPads, type PadPosition, type PinPattern } from "../../lib/kicad/pin-pattern-model.ts"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import { LEAD_SPANS } from "../../lib/kicad/lead-span.ts"
import type { LeadSpan } from "../../lib/kicad/lead-span-model.ts"

/**
 * The synthetic ring `HC10`'s footprint-half fixture names, registered HERE and
 * deliberately NOT in `PIN_PATTERNS`.
 *
 * `PIN_PATTERNS` holds the footprints this repository places and nothing else,
 * and every one of them classifies as `rows` - so no recorded footprint
 * exercises `admitPattern`'s across-strip refusal, and this fixture could not
 * exist without a map of its own. **The classification is DERIVED by
 * `classifyPads` from the pads, never asserted here**, so the fixture is a ring
 * because its pad geometry is a ring rather than because this file says so.
 *
 * **THE `SYNTHETIC:` LIBRARY PREFIX IS LOAD-BEARING, NOT DECORATION.**
 * `tests/kicad/footprint-names.test.ts` checks every footprint name in this
 * repository against the installed KiCad libraries and exempts exactly the names
 * carrying this prefix - and asserts that an exempt name's NAME HALF exists in no
 * installed library, so the prefix cannot be used to wave a real-but-wrong name
 * past the sweep. The library half read `Test_Synthetic:` until that check
 * landed, which was a library name nothing enforced; renaming it is what makes
 * the convention a check.
 */
const RING_FOOTPRINT = "SYNTHETIC:Ring_5Pin_D10mm"

function ringPads(): readonly PadPosition[] {
  // Five pads on a 10mm-diameter circle, which lands on no grid at all.
  return [0, 1, 2, 3, 4].map((index): PadPosition => {
    const angle = (index * 2 * Math.PI) / 5
    return {
      pad: `${index + 1}`,
      xMm: Number((5 * Math.cos(angle)).toFixed(4)),
      yMm: Number((5 * Math.sin(angle)).toFixed(4)),
    }
  })
}

export function ringPattern(): PinPattern {
  const pads = ringPads()
  return {
    footprint: RING_FOOTPRINT,
    pads,
    source: {
      file: "tests/stripboard/grade-fixtures.ts - SYNTHETIC, not a KiCad footprint",
      version: "none",
      padCount: pads.length,
      excludedPads: [],
    },
    classification: classifyPads(pads),
    accommodation: { kind: "as-moulded" },
    basis:
      "Five pads on a 10mm circle. Synthetic: it exists so HC10's footprint half has something " +
      "to refuse, because every footprint this repository actually places decomposes into rows.",
  }
}

/**
 * A span for the ring, so `PAR2`'s unconditional lookup is satisfied for it.
 *
 * WHY IT IS NEEDED AT ALL, which is the opposite of weakening `PAR2`. `measure`
 * calls the span lookup for EVERY placed part, measurable span or not, and
 * `HC4` runs before `HC10` - so a ring absent from the span map would refuse at
 * `HC4` by name and `HC10`'s footprint half, the thing this fixture exists to
 * exercise, would never be reached. Registering a span here keeps `HC10` the
 * constraint that refuses the ring. **It is SYNTHETIC and says so in every
 * field**, so nothing can mistake it for a sourced figure.
 *
 * **IT IS THE ONE `LeadSpan` IN THIS REPOSITORY ITS OWN DERIVATION DOES NOT
 * REPRODUCE, and that deviation is stated here rather than left for a reader to
 * infer from a real entry.** It is `kind: "rigid"` with `fixedSpanHoles: 4`, and
 * `deriveSpanHoles` on that geometry returns `[4, 4]` - not the `[2, 16]`
 * recorded above. `tests/kicad/lead-span.test.ts`'s "every recorded integer is
 * reproduced by the arithmetic" is the property this breaks, and it escapes that
 * test only because the test iterates `LEAD_SPANS` and this entry is injected.
 *
 * THE WIDE BAND IS THE WHOLE POINT and narrowing it to `[4, 4]` would defeat the
 * fixture: `HC4`, `HC5` and `HC9` would refuse the ring on its span before
 * `HC10`'s footprint half could refuse it on its pattern, which is the one thing
 * this footprint exists to exercise. So it stays, labelled - a reader comparing
 * it with a real entry must NOT read `[2, 16]` beside `fixedSpanHoles: 4` as a
 * shape a rigid entry may take. Recorded in
 * `docs/stripboard/pipeline-verification.md` §9.5.
 */
export function ringSpan(): LeadSpan {
  return {
    footprint: RING_FOOTPRINT,
    minSpanHoles: 2,
    maxSpanHoles: 16,
    formable: false,
    geometry: {
      kind: "rigid",
      part: "SYNTHETIC - a five-pin ring that exists only to be refused by HC10",
      terminalPitchMm: 5.8779,
      fixedSpanHoles: 4,
      nonStretchable:
        "It is not a real part and must never be placed. The span exists only so that HC4, " +
        "HC5 and HC9's unconditional lookup is satisfied and HC10's footprint half is the " +
        "constraint that refuses this fixture - which is what the fixture is for.",
      source: {
        manufacturer: "none - synthetic",
        document: "tests/stripboard/grade-fixtures.ts",
        documentId: "SYNTHETIC",
        revision: "none",
        location: "ringPads(), five pads on a 10mm circle",
        url: "https://example.invalid/synthetic",
      },
    },
    minBasis: "SYNTHETIC - not a sourced figure and not to be copied",
    maxBasis: "SYNTHETIC - not a sourced figure and not to be copied",
  }
}

/**
 * The real maps PLUS the ring, not the ring alone.
 *
 * `pinPatternFor` and `leadSpanFor` take a map and consult ONLY it, so an
 * injection holding just the synthetic entry would hide every real footprint
 * and make `PAR2`'s refusal fire on the DIP-16 and the resistors too - a
 * fixture suite grading itself against nothing. Spreading the real map in keeps
 * every recorded entry exactly as recorded and ADDS one entry that is marked
 * synthetic in every field.
 *
 * **THESE INJECTIONS EXTEND THE REAL TABLES RATHER THAN REPLACING THEM, AND
 * THAT IS LOAD-BEARING** - it is what keeps a grade from consulting two
 * different span tables. The hazard itself is documented where a future author
 * would meet it, on `CheckInput.spans` in
 * `tools/stripboard/constraints-model.ts`; read that before changing either map
 * here.
 */
export const INJECTED_PATTERNS: ReadonlyMap<string, PinPattern> = new Map([
  ...PIN_PATTERNS,
  [RING_FOOTPRINT, ringPattern()],
])

export const INJECTED_SPANS: ReadonlyMap<string, LeadSpan> = new Map([
  ...LEAD_SPANS,
  [RING_FOOTPRINT, ringSpan()],
])
