/**
 * What `./seed.test.ts` builds seeds from: synthetic parts small enough that one
 * question is answerable, and the owner's own `transistor-preamp-feedback`
 * circuit turned into a `SeedNetlist`.
 *
 * **IT IS NOT A `.test.ts` FILE**, following `./cuts-fixtures.ts` and
 * `../vero-import-fixtures.ts`: the builders are read by more than the
 * assertions that happen to be beside them today, and a circuit respelled per
 * test file is a second thing to keep in step.
 *
 * **THE TEST SIDE DERIVES A MOULDED PIN FIELD WITH `padHolesFor`, AND THE CORE
 * DELIBERATELY DOES NOT.** `lib/stripboard/seed.ts` takes a part's field as
 * data, because `lib/kicad/formed-frame.ts` and `lib/kicad/footprint-extent.ts`
 * lost their only consumer when the owner ruled body collisions out of the model
 * and are slated for deletion - a core dependency on either would re-open a
 * closed question. A TEST may import anything, and what it must not do is
 * TRANSCRIBE: this repository has shipped three footprint names that did not
 * exist, and a hand-typed step table would be that failure in a new place. So
 * the field comes from the recorded `PinPattern` through the existing
 * derivation, and if that module is deleted this file is what breaks - visibly,
 * in one place, rather than a board quietly built on remembered geometry.
 *
 * **EVERY SYNTHETIC FOOTPRINT CARRIES THE `SYNTHETIC:` LIBRARY PREFIX**, which
 * `tests/kicad/footprint-sweep.ts` exempts from the installed-library check and
 * `tests/kicad/footprint-names.test.ts` asserts exists in no installed library.
 * A plain placeholder name would be held to a real library it is not.
 */
import { padHolesFor } from "../../../lib/kicad/formed-frame.ts"
import { LEAD_SPANS } from "../../../lib/kicad/lead-span.ts"
import type { LeadSpan } from "../../../lib/kicad/lead-span-model.ts"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import type { ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import type {
  Ordering,
  SeedFieldPin,
  SeedLead,
  SeedNetlist,
  SeedPart,
} from "../../../lib/stripboard/seed-model.ts"
import { COMMITTED_BOARDS, footprintsOf, referenceOf } from "../vero-import-fixtures.ts"

/** The owner's stock, as `stripboard/rules.json` declares it (HC6). */
export const STOCK = { strips: 34, columns: 27 } as const

/** The owner's weights, as `stripboard/rules.json` declares them (PAR1). */
export const WEIGHTS = { rhoWire: 0.25, rhoSolder: 0.25 } as const

/**
 * A synthetic span band, for the fixtures that need a reach no real part has.
 *
 * The geometry is `rigid` with `fixedSpanHoles` set to the floor, which is **not
 * what `deriveSpanHoles` would return for a band wider than one hole** - the
 * same deviation `tests/stripboard/synthetic-footprints.ts` records for its ring,
 * and for the same reason: the band is the whole point of the fixture and
 * narrowing it to what the arithmetic reproduces would defeat it.
 */
export function syntheticSpan(name: string, min: number, max: number): LeadSpan {
  return {
    footprint: name,
    minSpanHoles: min,
    maxSpanHoles: max,
    formable: min !== max,
    geometry: {
      kind: "rigid",
      part: `SYNTHETIC - a fixture part that reaches ${min} to ${max} holes and nothing else`,
      terminalPitchMm: 2.54 * (min - 1),
      fixedSpanHoles: min,
      nonStretchable:
        "It is not a real part and must never be placed. The band exists so that a seed's reach " +
        "check has something to refuse or admit that no recorded footprint happens to provide.",
      source: {
        manufacturer: "none - synthetic",
        document: "tests/stripboard/model/seed-fixtures.ts",
        documentId: "SYNTHETIC",
        revision: "none",
        location: "syntheticSpan()",
        url: "none - no document was read, because there is no part",
      },
    },
    minBasis: "SYNTHETIC: the fixture's own floor, not a mounting of any part.",
    maxBasis: "SYNTHETIC: the fixture's own ceiling, not a mounting of any part.",
  }
}

/** `{ nets, parts }` from an object literal, so a fixture reads as a circuit. */
export function netlistOf(parts: readonly SeedPart[]): SeedNetlist {
  const nets = new Map<string, string[]>()
  for (const part of parts) {
    const leads: readonly SeedLead[] = part.kind === "two-lead" ? part.leads : part.field
    for (const lead of leads) {
      const id = `${part.ref}.${lead.pin}`
      const already = nets.get(lead.net)
      if (already === undefined) nets.set(lead.net, [id])
      else already.push(id)
    }
  }
  return { nets, parts }
}

export function twoLead(
  ref: string,
  footprint: string,
  a: readonly [string, string],
  b: readonly [string, string],
): SeedPart {
  return {
    kind: "two-lead",
    ref,
    footprint,
    leads: [
      { pin: a[0], net: a[1] },
      { pin: b[0], net: b[1] },
    ],
  }
}

export function fixedField(
  ref: string,
  footprint: string,
  field: readonly SeedFieldPin[],
): SeedPart {
  return { kind: "fixed-field", ref, footprint, field }
}

export function ordering(name: string, nets: readonly string[], stride: number): Ordering {
  return { name, nets, stride }
}

/** The message a call refused with, or `""` when it did not refuse. */
export function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

/**
 * `transistor-preamp-feedback` as a `SeedNetlist`: the owner's hand-built board's
 * own circuit, read from the committed KiCad export it was laid out against.
 *
 * **NOTHING ABOUT THE HAND LAYOUT IS READ** - not its dump, not its placements,
 * not its cuts. The board is the benchmark and its figures are fixed data
 * (`C = 5`, `W = 4`, `B = 3`, counted from `transistor-preamp-feedback.dump`);
 * a seed built from its layout would be a seed graded against its own input.
 *
 * A part with exactly two terminals becomes a `two-lead` part, and the span lever
 * is the seed's; anything else becomes a `fixed-field` part whose geometry comes
 * from its recorded `PinPattern` (see the module comment).
 */
export function feedbackNetlist(): { readonly netlist: SeedNetlist; readonly nets: ReferenceNets } {
  const board = COMMITTED_BOARDS.find((entry) => entry.name === "transistor-preamp-feedback")
  if (board === undefined) {
    throw new Error(
      "transistor-preamp-feedback is not in COMMITTED_BOARDS in " +
        "tests/stripboard/vero-import-fixtures.ts, and it is the primary benchmark this plan " +
        "measures against. Nothing is substituted: a seed measured on a different board is a " +
        "figure against a different benchmark.",
    )
  }
  const nets = referenceOf(board)
  const footprints = footprintsOf(board)
  const byRef = new Map<string, SeedLead[]>()
  for (const [net, pins] of nets) {
    for (const id of pins) {
      const dot = id.lastIndexOf(".")
      const ref = id.slice(0, dot)
      const lead: SeedLead = { pin: id.slice(dot + 1), net }
      const already = byRef.get(ref)
      if (already === undefined) byRef.set(ref, [lead])
      else already.push(lead)
    }
  }
  const parts: SeedPart[] = []
  for (const [ref, leads] of [...byRef.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const footprint = footprints.get(ref)
    if (footprint === undefined) {
      throw new Error(`the board's footprint map does not name "${ref}", so it cannot be placed.`)
    }
    const sorted = [...leads].sort((a, b) => a.pin.localeCompare(b.pin))
    const [first, second] = sorted
    if (sorted.length === 2 && first !== undefined && second !== undefined) {
      parts.push({ kind: "two-lead", ref, footprint, leads: [first, second] })
      continue
    }
    parts.push({ kind: "fixed-field", ref, footprint, field: fieldFor(footprint, sorted) })
  }
  return { netlist: { nets, parts }, nets }
}

function fieldFor(footprint: string, leads: readonly SeedLead[]): readonly SeedFieldPin[] {
  const pattern = PIN_PATTERNS.get(footprint)
  if (pattern === undefined) {
    throw new Error(
      `"${footprint}" has no recorded pin pattern, so the moulded field of a part fitted with ` +
        "it cannot be derived. Record one in lib/kicad/pin-pattern.ts; nothing is guessed.",
    )
  }
  if (pattern.classification.kind !== "rows") {
    throw new Error(
      `"${footprint}" does not decompose into rows (${pattern.classification.reason}), so there ` +
        "is no along-row axis to lay across the strips.",
    )
  }
  const axis = pattern.classification.axis
  const holes = padHolesFor(pattern)
  return leads.map((lead) => {
    const hole = holes.find((candidate) => candidate.pad === lead.pin)
    if (hole === undefined) {
      throw new Error(
        `"${footprint}" has no pad named "${lead.pin}", which the netlist puts on net ` +
          `"${lead.net}". The pattern and the export disagree about this part's pin names.`,
      )
    }
    return {
      ...lead,
      alongSteps: axis === "x" ? hole.xSteps : hole.ySteps,
      acrossSteps: axis === "x" ? hole.ySteps : hole.xSteps,
    }
  })
}

/** Every recorded span, which is what a real board's parts are looked up in. */
export const RECORDED_SPANS: ReadonlyMap<string, LeadSpan> = LEAD_SPANS

/**
 * Five orderings of a circuit's nets, each a one-line rule over the netlist and
 * none of them tuned.
 *
 * **THEY ARE THE CALLER'S AND NOT THE SEED MODULE'S**, which is the whole point
 * of `seedsFrom`'s `orderings` parameter. Each rule says what it is: the
 * reference's own order, the two degree orders, a walk of the parts emitting
 * each one's nets in pin order, and alphabetical as a stable arbitrary control.
 * **No rule here was changed after seeing a score** - what the figures came out
 * as is reported in this task's report, including the orderings that refuse.
 */
export function derivedOrderings(netlist: SeedNetlist, stride: number): readonly Ordering[] {
  const names = [...netlist.nets.keys()]
  const degree = (net: string): number => (netlist.nets.get(net) ?? []).length
  const walk: string[] = []
  for (const part of netlist.parts) {
    const leads: readonly SeedLead[] = part.kind === "two-lead" ? part.leads : part.field
    for (const lead of leads) if (!walk.includes(lead.net)) walk.push(lead.net)
  }
  return [
    ordering(`reference-order s${stride}`, names, stride),
    ordering(
      `degree-descending s${stride}`,
      [...names].sort((a, b) => degree(b) - degree(a) || a.localeCompare(b)),
      stride,
    ),
    ordering(
      `degree-ascending s${stride}`,
      [...names].sort((a, b) => degree(a) - degree(b) || a.localeCompare(b)),
      stride,
    ),
    ordering(`part-walk s${stride}`, walk, stride),
    ordering(`alphabetical s${stride}`, [...names].sort(), stride),
  ]
}
