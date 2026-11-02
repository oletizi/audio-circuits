/**
 * THE ONE PLACE A PART'S GEOMETRY ENTERS THE SEEDER: a circuit's reference nets
 * and footprint map in, `SeedPart`s out, every number read from the footprint's
 * own `.kicad_mod`.
 *
 * **NOTHING HERE IS TRANSCRIBED.** The pin field comes from `padHolesFor`, the
 * body margins from `occupiedAreaFor`, and rigidity from `leadSpanFor`'s
 * recorded geometry. This repository has shipped three footprint names that did
 * not exist and a hand-typed step table would be that failure in a new place -
 * so every figure is derived, and a footprint whose geometry cannot be derived
 * refuses by name rather than getting a plausible box.
 *
 * **IT IS WHAT CLAIMS `lib/kicad/footprint-extent.ts` AND
 * `lib/kicad/formed-frame.ts` AGAIN.** Both were marked for deletion when the
 * owner ruled body collisions out of the model, and both are needed by the rules
 * he stated afterwards: *"Rigid parts shouldn't be routed through/under"* and
 * *"if there's room for parts to have their own space, they should be given that
 * space"*. Neither can be applied without knowing how much space a part takes,
 * and these two modules are the only things that derive it from the files
 * rather than from memory.
 *
 * **WHY THE PLACER TAKES THE RESULT AS DATA INSTEAD OF CALLING THESE ITSELF.**
 * `occupiedAreaFor` reads a file; `seedsFrom` runs once per ordering and a
 * search runs it many times. More importantly it is the same seam `spanFor` has
 * and for the same reason: a caller must be able to hand in geometry for a part
 * this repository does not record without adding one to a module-level table,
 * and a core module reaching for `PIN_PATTERNS` by default is the defect
 * `admitPattern` already records about itself. So this module is where the
 * tables are read, and `./seed-place.ts` never reads one.
 */
import { occupiedAreaFor } from "../kicad/footprint-extent.ts"
import { padHolesFor, type PadHole } from "../kicad/formed-frame.ts"
import { LEAD_SPANS, leadSpanFor } from "../kicad/lead-span.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"
import { PIN_PATTERNS } from "../kicad/pin-pattern.ts"
import type { PinPattern } from "../kicad/pin-pattern-model.ts"
import type { ReferenceNets } from "./cuts.ts"
import { pinIdParts } from "./pin-id.ts"
import type { BodyMargins } from "./seed-area.ts"
import {
  offBoardPart,
  refuse,
  type SeedFieldPin,
  type SeedLead,
  type SeedNetlist,
  type SeedPart,
} from "./seed-model.ts"

/** The three tables a part's geometry is read out of, injectable together. */
export interface GeometrySource {
  readonly patterns: ReadonlyMap<string, PinPattern>
  readonly spans: ReadonlyMap<string, LeadSpan>
}

const WHY_NOT_GUESSED =
  "Nothing is substituted: a part placed on a guessed footprint is a part given the wrong " +
  "amount of room, and the rule it is given room by - the owner's \"rigid parts shouldn't be " +
  "routed through/under\" - is a fact about the real part"

/**
 * Whether a "rows" pattern's claimed x axis was ever actually measured.
 *
 * `classifyPads` (`lib/kicad/pin-pattern-model.ts`) tries x first and accepts
 * the first axis that decomposes into rows a whole number of strip pitches
 * apart - with no requirement that any row hold more than one pad. A footprint
 * whose pads are N rows of one pad each (every pad on its own strip) passes
 * that test trivially, because there is no pair within a singleton row for an
 * along-row pitch to be measured from, and `classifyPads` returns `axis: "x"`
 * for it exactly as it would for a footprint whose rows genuinely run along x.
 * The two are not the same claim, and this reads the derived pad holes - not
 * the classification's own `axis` field - to tell them apart: a pattern whose
 * pads land at only one `xSteps` never varied along x at all, so nothing was
 * measured and the claim is unfounded.
 *
 * **WHY HERE AND NOT IN `classifyPads` ITSELF.** The wrong claim is made
 * there, and correcting it there - declining to report an axis with nothing
 * measured along it - is the more direct fix. It was not taken: `classifyPads`
 * is read by callers outside this plan's scope (`admitPattern`, `padHolesFor`,
 * every one of the thirteen recorded classifications in
 * `lib/kicad/pin-pattern.ts`, and the tests that rederive them), and a
 * footprint whose only row structure is one pad per strip - `PinHeader_1x05`
 * among them - is a shape this repository already places correctly by
 * deliberately rotating it so that degenerate axis runs ACROSS the strips
 * (`lib/stripboard/seed-field.ts`, Task 4). Changing what axis such a footprint
 * CLAIMS would ripple into that already-working, already-reviewed placement
 * logic and its tests for a correction this module does not need: reading the
 * pad holes here, instead, keeps the fix inside `lib/stripboard/seed-parts.ts`
 * and touches nothing `classifyPads` is already trusted to report.
 *
 * **THIS IS NOT, BY ITSELF, A REASON TO REFUSE A MARGIN.** `PinHeader_1x05`'s
 * margins come out `{0, 0, 0, 0}` precisely because nothing varies along the
 * unmeasured axis to compute an overhang from, and that is a fact about the
 * footprint, not a gap in the check. What this function exists to catch is a
 * footprint whose UNMEASURED axis claim is paired with a NONZERO overhang, for
 * which this module would silently read a margin from a direction nothing
 * measured.
 */
export function unmeasuredAlongAxis(pattern: PinPattern): boolean {
  const pads = padHolesFor(pattern)
  return new Set(pads.map((pad) => pad.xSteps)).size === 1
}

/**
 * A part's body margins: how far its `F.Fab` outline reaches past its outermost
 * pads, in whole holes, on each of the four sides of its own frame.
 *
 * Both halves are read in the SAME prepared frame that `geometryOf` unions them
 * in, which is what makes the subtraction meaningful. **Each margin is clamped
 * at zero**: a body that stops short of a pad still has that pad's hole in the
 * part's area, because a lead is soldered there.
 */
export function bodyMarginsFor(footprint: string, source: GeometrySource): BodyMargins {
  const pattern = source.patterns.get(footprint)
  if (pattern === undefined) {
    refuse(
      "parts-no-pattern",
      `"${footprint}" is not in the pin-pattern map, so neither the holes its pads sit in nor ` +
        `the box its body covers can be read.\n${WHY_NOT_GUESSED}.\nRecord one in ` +
        "lib/kicad/pin-pattern.ts, which states the procedure and names every footprint that " +
        "has an entry.",
    )
  }
  if (pattern.classification.kind !== "rows") {
    refuse(
      "parts-no-rows",
      `"${footprint}" does not decompose into rows parallel to the strips, so it has no pin row ` +
        `to lay across them and no along axis for a margin to be measured on.\n` +
        `${pattern.classification.reason}\n${WHY_NOT_GUESSED}.\nHC10 refuses such a footprint ` +
        "outright (admitPattern in lib/kicad/pin-pattern-model.ts), so a box for it would be " +
        "the geometry of a part that is never mounted.",
    )
  }
  const axis = pattern.classification.axis
  if (axis !== "x") {
    refuse(
      "parts-row-axis",
      `"${footprint}" classifies with its pin rows running along ${axis}, and this module maps ` +
        "the ALONG axis onto the footprint's own x so that the margins it returns and " +
        `holeInFrame's turns agree about which axis is which.\n${WHY_NOT_GUESSED}.\nThe fix is ` +
        "to swap the two axes here deliberately, with a test over the new footprint, rather than " +
        "to let the two conventions disagree silently.",
    )
  }
  const pads = padHolesFor(pattern)
  const extent = occupiedAreaFor(footprint, source.patterns)
  const along = pads.map((pad: PadHole) => pad.xSteps)
  const across = pads.map((pad: PadHole) => pad.ySteps)
  const beforeAlong = Math.max(0, Math.min(...along) - extent.alongX.minSteps)
  const afterAlong = Math.max(0, extent.alongX.maxSteps - Math.max(...along))
  if ((beforeAlong > 0 || afterAlong > 0) && unmeasuredAlongAxis(pattern)) {
    refuse(
      "parts-row-axis",
      `"${footprint}" classifies along x, but every one of its pads lands at the same xSteps: ` +
        "classifyPads (lib/kicad/pin-pattern-model.ts) reports \"x\" because a footprint whose " +
        "pads are N rows of one pad each decomposes along x trivially - there is no pair within " +
        "any row for it to have measured a pitch from, so the claim that this module's ALONG " +
        `margins read along x is unfounded.\nAnd here it is not an idle claim: the body reaches ` +
        `${beforeAlong} hole(s) before and ${afterAlong} after the pads on the axis nothing ` +
        `measured, which is exactly the overhang this check exists to catch rather than report ` +
        `on the strength of an unmeasured claim.\n${WHY_NOT_GUESSED}.\nThe fix is to read the ` +
        "axis that was actually measured - the one with more than one distinct step - rather " +
        "than the one classifyPads happened to try first; record it here deliberately, with a " +
        "test over the new footprint.",
    )
  }
  return {
    beforeAlong,
    afterAlong,
    beforeAcross: Math.max(0, Math.min(...across) - extent.alongY.minSteps),
    afterAcross: Math.max(0, extent.alongY.maxSteps - Math.max(...across)),
  }
}

/** The pin field of a part whose terminals are moulded where they are. */
function fieldFor(
  footprint: string,
  leads: readonly SeedLead[],
  source: GeometrySource,
): readonly SeedFieldPin[] {
  const pattern = source.patterns.get(footprint)
  if (pattern === undefined || pattern.classification.kind !== "rows") {
    // Cannot be reached through seedPartsFrom: bodyMarginsFor is called first
    // and refuses both cases by name. Stated rather than defaulted because a
    // field invented here would be a pin field nobody recorded.
    refuse(
      "parts-field-unreadable",
      `"${footprint}" has no readable pin pattern, so its moulded field cannot be derived. ` +
        "bodyMarginsFor refuses this first; reaching here means the two disagree about what is " +
        `readable, which is a defect in lib/stripboard/seed-parts.ts.\n${WHY_NOT_GUESSED}.`,
    )
  }
  const pads = padHolesFor(pattern)
  return leads.map((lead) => {
    const hole = pads.find((pad: PadHole) => pad.pad === lead.pin)
    if (hole === undefined) {
      refuse(
        "parts-pad-missing",
        `"${footprint}" has pads [${pads.map((pad: PadHole) => pad.pad).join(", ")}] and the ` +
          `netlist puts "${lead.pin}" on net "${lead.net}" - a terminal that footprint does ` +
          `not have.\n${WHY_NOT_GUESSED}.\nEither the footprint map names a different part ` +
          "than the schematic places, or the pattern's pad names are stale. The overlap is not " +
          "placed and the rest dropped: a terminal missing from a placement is a terminal " +
          "missing from every net that runs through it.",
      )
    }
    return { ...lead, alongSteps: hole.xSteps, acrossSteps: hole.ySteps }
  })
}

/**
 * Every part of a circuit, built from its reference nets, its own footprint map
 * and the refs its caller declares panel-mounted.
 *
 * A ref in `offBoard` becomes one `off-board` landing pad PER TERMINAL, with no
 * geometry read at all. Otherwise a part with exactly two terminals becomes a
 * `two-lead` part, whose separation is the seed's to choose inside
 * `leadSpanFor`'s band, and anything else becomes a `fixed-field` part whose
 * geometry is read and never chosen. **Terminals are taken in pin-name order**
 * so that two runs over one circuit build the same parts, and refs in sorted
 * order for the same reason.
 *
 * **`offBoard` IS THE RESIDENCY DECLARATION, AND IT IS A PARAMETER BECAUSE THE
 * AUTHORITY ON RESIDENCY IS BEHIND A BOUNDARY THIS MODULE MAY NOT CROSS.**
 * `onBoard` in `tools/stripboard/targets.ts` reads a component's own marker - a
 * board-resident part carries `part.footprint`, an off-board landing carries
 * only `part.symbol` - and `circuits/pultec/off-board.ts` is the Pultec's
 * declaration of the same fact as data, calling itself *"THE SINGLE DEFINITION
 * OF RESIDENCY"*. `lib/stripboard/` imports neither `tools/` nor `circuits/`,
 * so the declaration arrives here the way `rigid` and `body` arrive on a part:
 * as data, derived by whoever has the authority to derive it.
 *
 * **THE DEFAULT IS THE EMPTY SET, WHICH IS THE STRICTEST ANSWER AND NOT A
 * FALLBACK.** With it, every ref must be in the footprint map and a ref in
 * neither refuses by name - *"an empty whitelist that refuses loudly beats a
 * general rule that quietly accepts a guess"*. The predicate is never "this ref
 * has no footprint": a missing footprint means either "panel-mounted,
 * represented by landing pads" or "the physicalization data is wrong or
 * absent", and a module that read the first from the second would turn missing
 * data into apparently valid holes.
 */
export function seedPartsFrom(
  nets: ReferenceNets,
  footprints: ReadonlyMap<string, string>,
  source: GeometrySource = { patterns: PIN_PATTERNS, spans: LEAD_SPANS },
  offBoard: ReadonlySet<string> = new Set(),
): SeedNetlist {
  const byRef = new Map<string, SeedLead[]>()
  for (const [net, pins] of nets) {
    for (const id of pins) {
      // SPLIT THROUGH `pinIdParts`, which is the same function the importer and
      // the exporter use: a pad constructed here and a pad imported from a
      // layout are then the same pair rather than two derivations of it. The
      // refusal stays here because what a malformed id means depends on where it
      // came from, and here it means this reference netlist.
      const pinParts = pinIdParts(id)
      if (pinParts === undefined) {
        refuse(
          "parts-pin-id-malformed",
          `reference net "${net}" holds "${id}", and a pin id is "<ref>.<pin>" - the last dot ` +
            `separates the two.\n${WHY_NOT_GUESSED}.\nFix the reader that produced these nets; ` +
            "splitting on a dot that is not there would invent a ref or a pin name.",
        )
      }
      const lead: SeedLead = { pin: pinParts.pin, net }
      const already = byRef.get(pinParts.ref)
      if (already === undefined) byRef.set(pinParts.ref, [lead])
      else already.push(lead)
    }
  }
  const parts: SeedPart[] = []
  for (const [ref, leads] of [...byRef.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const footprint = footprints.get(ref)
    const sorted = [...leads].sort((a, b) => a.pin.localeCompare(b.pin))
    if (offBoard.has(ref)) {
      if (footprint !== undefined) {
        refuse(
          "parts-residency-disagrees",
          `"${ref}" is declared off-board and the footprint map fits it with "${footprint}", ` +
            `which are two contradictory claims about where one component sits.\n` +
            `${WHY_NOT_GUESSED}.\nNeither claim is preferred: a part that is panel-mounted has ` +
            "no footprint to be fitted with, and a part with a footprint is laid out rather " +
            "than landed on pads, so whichever of the two is stale has to be corrected at " +
            "source. The residency declaration comes from onBoard in " +
            "tools/stripboard/targets.ts, or from a circuit's own OFF_BOARD set; the footprint " +
            "map comes from the board's KiCad export or its committed .footprints.json.",
        )
      }
      // ONE PAD PER TERMINAL, and the shape of each is offBoardPart's - see
      // lib/stripboard/seed-model.ts, which is the one place a pad's footprint
      // sentinel, its absent body and its formability are stated. No geometry
      // is read for a pad: there is no footprint to read it from, which is what
      // being off the board MEANS, and that is also why neither bodyMarginsFor
      // nor leadSpanFor is reached below for one.
      for (const lead of sorted) parts.push(offBoardPart(ref, lead))
      continue
    }
    if (footprint === undefined) {
      refuse(
        "parts-no-footprint",
        `the netlist places "${ref}" and the footprint map does not name it, so what part it ` +
          `is - and therefore how much room it takes and whether it may be routed under - is ` +
          `unknown.\n${WHY_NOT_GUESSED}.\nThe map comes from the board's own KiCad export or ` +
          "from its committed .footprints.json; a ref missing from it means the two are of " +
          "different circuits.\nIT IS NOT READ AS A PANEL-MOUNTED PART EITHER, and that is the " +
          "point of this refusal: a ref reaches the board as off-board landing pads only when " +
          "the caller DECLARES it off-board (seedPartsFrom's fourth argument, from onBoard in " +
          "tools/stripboard/targets.ts or a circuit's own OFF_BOARD set), and this ref is in " +
          `neither the footprint map nor that declaration. Inferring landing pads from a ` +
          "missing footprint would turn absent physicalization data into holes somebody would " +
          "solder a wire into.",
      )
    }
    const body = bodyMarginsFor(footprint, source)
    // leadSpanFor refuses an unrecorded footprint by name, and the map is
    // whatever `source` resolved to - the caller's when it passed one, and
    // LEAD_SPANS when it did not, because that is this function's declared
    // default at its signature. What this line claims is narrower and is the
    // part that matters: the module-level table is reached for in ONE place,
    // that default, and never again inside the body, so a caller that hands in
    // geometry for a part this repository does not record is never
    // second-guessed by a fallback. That is the seam spanFor states and
    // admitPattern lacks; the module comment above states it for the file.
    const rigid = leadSpanFor(footprint, source.spans).geometry.kind === "rigid"
    const [first, second] = sorted
    if (sorted.length === 2 && first !== undefined && second !== undefined) {
      parts.push({ kind: "two-lead", ref, footprint, rigid, body, leads: [first, second] })
      continue
    }
    parts.push({
      kind: "fixed-field",
      ref,
      footprint,
      rigid,
      body,
      field: fieldFor(footprint, sorted, source),
    })
  }
  return { nets, parts }
}
