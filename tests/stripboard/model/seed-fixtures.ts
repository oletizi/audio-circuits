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
import { LEAD_SPANS } from "../../../lib/kicad/lead-span.ts"
import type { LeadSpan } from "../../../lib/kicad/lead-span-model.ts"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import type { ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import type { BodyMargins } from "../../../lib/stripboard/seed-area.ts"
import { seedPartsFrom } from "../../../lib/stripboard/seed-parts.ts"
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

/**
 * A fixture part with NO body beyond its pads and nothing rigid about it, so a
 * test of the strip rules is not also a test of the clearance rules.
 *
 * The clearance and rigidity rules get their own fixtures, which pass a body and
 * `rigid: true` explicitly - see `bodied` and `rigidPart`.
 */
export const BARE: BodyMargins = {
  beforeAlong: 0,
  afterAlong: 0,
  beforeAcross: 0,
  afterAcross: 0,
}

export function twoLead(
  ref: string,
  footprint: string,
  a: readonly [string, string],
  b: readonly [string, string],
  shape: { readonly rigid?: boolean; readonly body?: BodyMargins } = {},
): SeedPart {
  return {
    kind: "two-lead",
    ref,
    footprint,
    rigid: shape.rigid === true,
    body: shape.body ?? BARE,
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
  shape: { readonly rigid?: boolean; readonly body?: BodyMargins } = {},
): SeedPart {
  return {
    kind: "fixed-field",
    ref,
    footprint,
    rigid: shape.rigid === true,
    body: shape.body ?? BARE,
    field,
  }
}

/** Margins that reach `holes` past the pads on every side. */
export function bodied(holes: number): BodyMargins {
  return {
    beforeAlong: holes,
    afterAlong: holes,
    beforeAcross: holes,
    afterAcross: holes,
  }
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
 * A committed board's circuit as a `SeedNetlist`, built by the core's own
 * `seedPartsFrom` from the KiCad export the layout was made against.
 *
 * **NOTHING ABOUT THE HAND LAYOUT IS READ** - not its dump, not its placements,
 * not its cuts. The board is the benchmark and its figures are fixed data
 * (`feedback`: `C = 5`, `W = 4`, `B = 3`; `buffered`: `C = 5`, `W = 4`,
 * `B = 6`, each counted from its own dump); a seed built from a layout would be
 * a seed graded against its own input.
 *
 * **THE GEOMETRY IS NOT DERIVED HERE ANY MORE.** The first version of this file
 * read `padHolesFor` itself, because the core was forbidden to. That prohibition
 * was lifted when the owner's clearance rules needed a part's real size, and
 * `lib/stripboard/seed-parts.ts` is now the one place the pin field, the body
 * margins and the rigidity are read. A second derivation here would be exactly
 * the "supersede without the delete" this repository keeps catching.
 */
export function committedNetlist(
  name: string,
): { readonly netlist: SeedNetlist; readonly nets: ReferenceNets } {
  const board = COMMITTED_BOARDS.find((entry) => entry.name === name)
  if (board === undefined) {
    throw new Error(
      `"${name}" is not in COMMITTED_BOARDS in tests/stripboard/vero-import-fixtures.ts. ` +
        "Nothing is substituted: a seed measured on a different board is a figure against a " +
        "different benchmark.",
    )
  }
  const nets = referenceOf(board)
  return {
    netlist: seedPartsFrom(nets, footprintsOf(board), {
      patterns: PIN_PATTERNS,
      spans: LEAD_SPANS,
    }),
    nets,
  }
}

/** The primary benchmark: the owner laid it out by hand, built it, and uses it. */
export function feedbackNetlist(): { readonly netlist: SeedNetlist; readonly nets: ReferenceNets } {
  return committedNetlist("transistor-preamp-feedback")
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
