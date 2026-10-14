/**
 * An existing `.vrt` board, as the pinned fork dumps it, read into the core
 * model's `Candidate`.
 *
 * WHY IT EXISTS. The owner's two hand-laid, hand-BUILT boards are what this
 * plan's search is graded against, and a search that cannot be handed a human
 * layout cannot start from one - his *"even a human starting point"*. This is
 * that adapter, and the benchmark needs it before anything else does.
 *
 * **IT IS IN `tools/` AND THAT IS THE BOUNDARY.** `lib/stripboard/` is the core
 * and may not import from `tools/`; an importer is the other way round, so it
 * reads `tools/guide/dump.ts` freely and the core never reaches it.
 *
 * **THE DUMP IS THE AUTHORITY FOR A BOARD THAT ALREADY EXISTS.** Every
 * placement's pin-to-hole map is its `PIN` lines, verbatim; no pin position is
 * derived from a footprint here. `CLAUDE.md` states the rule - for an existing
 * design being brought in, the drawn artefact is authoritative and the model is
 * derived from it - and the measurement behind it is that VeroRoute stretches a
 * two-terminal part to whatever span a layout wants, so a footprint's own pitch
 * is routinely not what the board does.
 *
 * **THE FOOTPRINT MAP IS AN INPUT BECAUSE THE DUMP CANNOT SUPPLY IT.** A `PART`
 * line carries a VeroRoute component TYPE (`RESISTOR`, `TRIM_FLAT`), and the
 * model is keyed by KiCad footprint. The shape is the one
 * `tests/fixtures/stripboard/*.footprints.json` already has: designator to
 * footprint. A ref with no entry **refuses by name** rather than being given a
 * plausible family.
 *
 * **A PLACEMENT IS ITS PINS** (owner, 2026-10-14: *"Don't worry about body
 * collisions on the stripboard. It's extremely flexible."*). So `holes` is the
 * set of holes the part's own leads sit in, and no body area is reconstructed.
 * That is not an inference from the pins in the sense `lib/stripboard/board.ts`
 * refuses - that refusal protects the BODY-derived occupancy `geometryOf`
 * returns, and the ruling removed its only consumer. Here the holes are the
 * leads because the owner said the leads are what matter.
 *
 * **ONE LEAD PER HOLE IS NOT ENFORCED HERE, AND IS NOT IGNORED EITHER.** The
 * owner states it as a preference with a build reason (*"I would prefer leads
 * not share holes - it makes building easier"*), and measured, no committed
 * board breaks it. An adapter that refused a board for it would be unable to
 * report WHICH board broke it, which is the one thing a reader would want; so
 * the rule is asserted per board in `tests/stripboard/vero-import.test.ts`
 * through `holesOverlap`, over the placements this module produces.
 *
 * **NO CUT IS READ AND NONE IS DERIVED.** `CUT` lines carry a node id per hole,
 * which would answer several of the questions below for free - and using them
 * would make Task 2's differential test compare its own derivation against an
 * input it had already been given. The `cuts` field of the dump is untouched
 * here on purpose.
 *
 * **WHAT THIS MODULE IS NOT INDEPENDENT OF, stated rather than implied.** A
 * wire's net comes from the node id the fork prints on the wire's ends, so it
 * comes from VeroRoute's own membership calculation - the subsystem
 * `tools/stripboard/copper.ts` deliberately never reads, to keep `HC8` an
 * independent reconstruction. `HC8` is unaffected (it reads geometry only), but
 * a cut derivation consuming these wire nets is NOT independent of the fork's
 * net identity, and a differential comparison against the fork's own cuts
 * should not be read as though it were. There is no second source: the
 * reference netlist names a wire nothing, and a wire's end holes hold no pin on
 * any committed board.
 *
 * **THE THREE FILES.** This one walks the dump and builds a `Placement` per
 * `PART` line; `./vero-import-facing.ts` solves the one field a dump does not
 * reliably carry, which way round a part is; `./vero-import-nets.ts` holds the
 * `WIRE` and `SOLDER` halves, whose nets have to be resolved rather than read,
 * and the refusal shape and row-to-strip reading both halves need.
 */
import { parseBoardDump, type BoardDump, type Part } from "../guide/dump.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { Candidate, PinPatterns, Placement } from "../../lib/stripboard/board.ts"
import { facingOf, type PinHole } from "./vero-import-facing.ts"
import {
  bridgesOf,
  holeOf,
  MAP_FIX,
  netByNode,
  refuse,
  wiresOf,
} from "./vero-import-nets.ts"

/** Every ref that has `PIN` lines, mapped to them as holes. */
function pinsByRef(dump: BoardDump): ReadonlyMap<string, readonly PinHole[]> {
  const out = new Map<string, readonly PinHole[]>()
  for (const [ref, pins] of Object.entries(dump.pins)) {
    out.set(
      ref,
      pins.map((pin) => ({ pin: pin.pin, hole: holeOf(pin) })),
    )
  }
  return out
}

/**
 * The footprint a ref is fitted with, or a refusal naming the ref.
 *
 * ITS KEY READS IN THE AWKWARD ORDER ON PURPOSE, exactly as the keys in
 * `lib/stripboard/board.ts` do and for the same measured reason: a key ending in
 * the word `tests/kicad/footprint-sweep.ts` looks for, followed by a colon and a
 * quoted string, reads to that sweep as a declaration of a footprint named after
 * whatever follows. The natural spelling of this key did exactly that and
 * `tests/kicad/footprint-names.test.ts` failed by name; the word is moved to the
 * front rather than the sweep being loosened.
 */
function footprintOf(ref: string, footprints: ReadonlyMap<string, string>): string {
  const footprint = footprints.get(ref)
  if (footprint === undefined) {
    refuse(
      "vero-import-footprint-unmapped",
      `the dump places "${ref}" and the footprint map handed to candidateFromDump has no entry ` +
        `for it, so which part is fitted - and therefore its pads and its reach - is ` +
        `unknown.\n${MAP_FIX}.`,
    )
  }
  return footprint
}

/** One `PART` line as a `Placement`, or a refusal naming the part. */
function placementOf(
  part: Part,
  pins: readonly PinHole[] | undefined,
  footprints: ReadonlyMap<string, string>,
  patterns: PinPatterns,
): Placement {
  if (part.placement === "floating") {
    refuse(
      "vero-import-unplaced-part",
      `the dump reports "${part.ref}" (${part.type}) as FLOATING, so it is on no hole and the ` +
        "model has no way to say where it is: a Placement carries an origin, a direction and " +
        "the holes its pins are in, and all three are facts about a part that is on the " +
        "board.\nFix it in the layout - place the part, or take it off the board - rather than " +
        "here.\nIt is not imported at an invented origin and it is not dropped: a dropped part " +
        "is one a later score and a later buildability check would both be silent about.",
    )
  }
  const footprint = footprintOf(part.ref, footprints)
  if (pins === undefined || pins.length === 0) {
    refuse(
      "vero-import-no-pin-lines",
      `the dump places "${part.ref}" (${part.type}) at ${part.placement.row},` +
        `${part.placement.col} and prints no PIN line for it, so which holes its leads are in ` +
        "is unknown.\nThe pinned fork prints one PIN line per pin of every placed component; a " +
        "placed part with none means this dump came from an older binary, and " +
        "tools/perfboard/acquire.ts names the rebuild.\nThe holes are not derived from the " +
        "footprint instead: a layout routinely stretches a part's leads past their footprint's " +
        "pitch, so a derived position would be wrong on exactly the parts this adapter exists " +
        "to read.",
    )
  }
  let fit
  try {
    fit = facingOf(footprint, pins, patterns)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.startsWith("stripboard-geometry-")) throw error
    refuse(
      "vero-import-no-geometry",
      `"${part.ref}" (${part.type}) is fitted with "${footprint}", whose pad geometry the model ` +
        `cannot derive, so the facing its leads are at cannot be solved.\n${message}\nIt is ` +
        "not imported with a guessed facing: the facing decides which way a later move turns " +
        "the part and which way an export draws it.",
    )
  }
  if (fit.kind === "pin-names") {
    refuse(
      "vero-import-pin-names-disagree",
      `"${part.ref}" (${part.type}) is fitted with "${footprint}", whose pads are ` +
        `[${fit.pads.join(", ")}], and the dump prints PIN lines for ` +
        `[${pins.map((pin) => pin.pin).sort().join(", ")}].\nThe two name different sets of ` +
        `pins, so the footprint map is naming a different part than the board places. ` +
        `${MAP_FIX}.\nThe overlap is not imported and the rest dropped: a pin missing from a ` +
        "placement is a pin missing from every net that runs through it.",
    )
  }
  if (fit.kind === "ambiguous") {
    refuse(
      "vero-import-ambiguous-facing",
      `"${part.ref}" (${part.type}, "${footprint}") sits on holes that ${fit.directions.length} ` +
        `different facings reproduce exactly (${fit.directions.join(", ")}), so which way round ` +
        "it is cannot be read off the board.\nFix it by recording something that tells them " +
        "apart - a pad pattern that is not symmetric under that turn, or the dump's own " +
        "DIRECTION field, which four of the committed captures predate.\nOne of them is not " +
        "picked: the two describe different parts in the same holes, and an export would draw " +
        "whichever was chosen.",
    )
  }
  if (fit.kind === "copper-side") {
    refuse(
      "vero-import-copper-side",
      `"${part.ref}" (${part.type}, "${footprint}") sits on holes that no quarter turn of its ` +
        `footprint reaches - only a reflection of it does (facing ${fit.direction} ` +
        "mirrored).\nThat is a part mounted the other way up, and the owner's ruling is that " +
        'nothing is: "I don\'t want to mount parts on the copper side. It\'s harder to ' +
        'solder." Fix it in the layout, or record the footprint this part really is.\nIt is ' +
        "not imported as the unmirrored turn: the pins would then be on holes the board does " +
        "not use.",
    )
  }
  if (fit.kind === "none") {
    refuse(
      "vero-import-no-facing",
      `"${part.ref}" (${part.type}) is fitted with "${footprint}" and no transform of that ` +
        `footprint's pads lands on the holes the dump gives its pins ` +
        `[${pins.map((pin) => `${pin.pin}@${pin.hole.strip},${pin.hole.column}`).join(" ")}]. ` +
        `Tried: ${fit.tried.join(", ")}.\nEither the footprint map names a part the board does ` +
        `not place, or the leads are at a span the footprint is not recorded as able to bend ` +
        `to (lib/kicad/lead-span.ts).\n${MAP_FIX}.\nA facing is not chosen as the closest fit: ` +
        "the model's own comment is that a part's geometry is never reconstructed from " +
        "something that nearly matches.",
    )
  }
  return {
    ref: part.ref,
    footprint,
    origin: fit.facing.origin,
    direction: fit.facing.direction,
    // A PLACEMENT IS ITS PINS - see this module's comment and the owner's
    // ruling. Nothing here reads the body outline the footprint also has.
    holes: pins.map((pin) => pin.hole),
    pins: new Map(pins.map((pin) => [pin.pin, pin.hole])),
  }
}

/**
 * Read one `--dump-board` capture into a `Candidate`.
 *
 * Refuses, by a key naming the fault and the part, wire or bridge it is in,
 * rather than importing part of a board: a dropped component is one every later
 * score, cut and buildability check is silently wrong about.
 */
export function candidateFromDump(
  dumpText: string,
  reference: ReferenceNets,
  footprints: ReadonlyMap<string, string>,
  patterns: PinPatterns,
): Candidate {
  const dump = parseBoardDump(dumpText)
  if (dump.verticalStrips) {
    refuse(
      "vero-import-vertical-strips",
      "the dump reports VERTICAL_STRIPS 1, so its strips run along the columns and a row is " +
        "not a strip.\nThe transposition is one line of arithmetic and no committed board " +
        "exercises it, so it refuses rather than running untested: a transposed board that " +
        "imported silently would put every cut, wire and bridge on the wrong axis.\nTo add it, " +
        "capture a vertical-strip board under tests/fixtures/stripboard/ with its provenance " +
        "and assert the exchange in tests/stripboard/vero-import.test.ts.",
    )
  }
  const pins = pinsByRef(dump)
  const placed = new Set(dump.parts.map((part) => part.ref))
  for (const ref of [...pins.keys()].sort()) {
    if (placed.has(ref)) continue
    refuse(
      "vero-import-pad-line",
      `the dump prints PIN lines for "${ref}" and no PART line, which is how it reports one ` +
        "terminal of an off-board part: VeroRoute expands a PADS<n> component into n one-hole " +
        "pads with board names of their own (see ./pad-provenance.ts).\nThe model has no " +
        "vocabulary for one: a Placement carries a footprint, an origin and a direction, and a " +
        "breakout hole has none of the three. Adding one is a change to " +
        "lib/stripboard/board.ts and belongs to the plan, not to this adapter.\nIt is not " +
        "dropped: its hole holds a lead, so a cut derivation that did not know about it would " +
        "read that hole as empty and leave out the cut it needs.",
    )
  }
  const nets = netByNode(dumpText, reference)
  const placements = dump.parts.map((part) => placementOf(part, pins.get(part.ref), footprints, patterns))
  const wires = wiresOf(dumpText, dump, nets)
  return {
    grid: { strips: dump.grid.rows, columns: dump.grid.cols },
    placements,
    wires,
    bridges: bridgesOf(dump, reference, placements, wires),
  }
}
