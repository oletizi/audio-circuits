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
import type { BodyMargins } from "./seed-area.ts"
import {
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
        "holeInFrame's turns agree about which axis is which.\nAll thirteen recorded footprints " +
        `classify along x, so reaching this means a new one does not.\n${WHY_NOT_GUESSED}.\n` +
        "The fix is to swap the two axes here deliberately, with a test over the new footprint, " +
        "rather than to let the two conventions disagree silently.",
    )
  }
  const pads = padHolesFor(pattern)
  const extent = occupiedAreaFor(footprint, source.patterns)
  const along = pads.map((pad: PadHole) => pad.xSteps)
  const across = pads.map((pad: PadHole) => pad.ySteps)
  return {
    beforeAlong: Math.max(0, Math.min(...along) - extent.alongX.minSteps),
    afterAlong: Math.max(0, extent.alongX.maxSteps - Math.max(...along)),
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
 * Every part of a circuit, built from its reference nets and its own
 * footprint map.
 *
 * A part with exactly two terminals becomes a `two-lead` part, whose separation
 * is the seed's to choose inside `leadSpanFor`'s band; anything else becomes a
 * `fixed-field` part whose geometry is read and never chosen. **Terminals are
 * taken in pin-name order** so that two runs over one circuit build the same
 * parts, and refs in sorted order for the same reason.
 */
export function seedPartsFrom(
  nets: ReferenceNets,
  footprints: ReadonlyMap<string, string>,
  source: GeometrySource = { patterns: PIN_PATTERNS, spans: LEAD_SPANS },
): SeedNetlist {
  const byRef = new Map<string, SeedLead[]>()
  for (const [net, pins] of nets) {
    for (const id of pins) {
      const dot = id.lastIndexOf(".")
      if (dot < 1 || dot === id.length - 1) {
        refuse(
          "parts-pin-id-malformed",
          `reference net "${net}" holds "${id}", and a pin id is "<ref>.<pin>" - the last dot ` +
            `separates the two.\n${WHY_NOT_GUESSED}.\nFix the reader that produced these nets; ` +
            "splitting on a dot that is not there would invent a ref or a pin name.",
        )
      }
      const lead: SeedLead = { pin: id.slice(dot + 1), net }
      const already = byRef.get(id.slice(0, dot))
      if (already === undefined) byRef.set(id.slice(0, dot), [lead])
      else already.push(lead)
    }
  }
  const parts: SeedPart[] = []
  for (const [ref, leads] of [...byRef.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const footprint = footprints.get(ref)
    if (footprint === undefined) {
      refuse(
        "parts-no-footprint",
        `the netlist places "${ref}" and the footprint map does not name it, so what part it ` +
          `is - and therefore how much room it takes and whether it may be routed under - is ` +
          `unknown.\n${WHY_NOT_GUESSED}.\nThe map comes from the board's own KiCad export or ` +
          "from its committed .footprints.json; a ref missing from it means the two are of " +
          "different circuits.",
      )
    }
    const body = bodyMarginsFor(footprint, source)
    // leadSpanFor refuses an unrecorded footprint by name, and the map is always
    // the caller's: there is no branch here where the module-level table is read
    // instead, which is the seam spanFor states and admitPattern lacks.
    const rigid = leadSpanFor(footprint, source.spans).geometry.kind === "rigid"
    const sorted = [...leads].sort((a, b) => a.pin.localeCompare(b.pin))
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
