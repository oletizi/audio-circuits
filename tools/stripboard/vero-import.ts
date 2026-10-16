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
 * **A `PAD` LINE IS A ONE-HOLE PLACEMENT.** VeroRoute expands an off-board
 * part's terminals into one-hole pads, and the owner settled what one is:
 * *"yeah - a single pad has no orientation. It's just a place to solder an
 * off-board wire or a test point to."* So it is imported with no footprint, an
 * arbitrary facing that `padPlacementOf` says is arbitrary, and the reference
 * pin its `FROM` field names - see that function for the two consequences that
 * follow, one of which is the only place this importer gives two placements one
 * `ref`.
 *
 * **THE THREE FILES.** This one walks the dump and builds a `Placement` per
 * `PART` line and per `PAD` line; `./vero-import-facing.ts` solves the one field
 * a dump does not reliably carry, which way round a fitted part is;
 * `./vero-import-nets.ts` holds the `WIRE` and `SOLDER` halves, whose nets have
 * to be resolved rather than read, and the refusal shape and row-to-strip
 * reading both halves need.
 */
import { parseBoardDump, type BoardDump, type Part } from "../guide/dump.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { OFF_BOARD_TERMINAL } from "../../lib/stripboard/board.ts"
import type { Candidate, PinPatterns, Placement } from "../../lib/stripboard/board.ts"
import { facingOf, type PinHole } from "./vero-import-facing.ts"
import { padLines, type PadLine } from "./pad-provenance.ts"
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
 * One `PAD` line as a one-hole `Placement`.
 *
 * **THE OWNER SETTLED WHAT A PAD IS, verbatim:** *"yeah - a single pad has no
 * orientation. It's just a place to solder an off-board wire or a test point
 * to."* So the facing this records is ARBITRARY, and `direction: "E"` below is
 * not derived from anything: a one-hole part occupies the same hole at all four
 * facings, so there is nothing to derive and nothing a wrong answer could
 * change. **`Placement.direction` cannot express "no orientation"** - it is a
 * required field of four values - and widening it is a change to
 * `lib/stripboard/board.ts`, which belongs to the plan rather than to this
 * adapter. The awkwardness is reported rather than hidden behind a derivation
 * that does not exist.
 *
 * **IT IS NAMED THE WAY THE NETLIST NAMES IT, NOT THE WAY THE BOARD DOES.**
 * VeroRoute expands a `PADS<n>` component into n one-hole pads with board names
 * of their own - `RV_LO_BOOST.1` becomes the pad `RV_LO_BOOST_1`, whose single
 * `PIN` line is `RV_LO_BOOST_1 1`. The `FROM <ref>.<pin>` field is the only
 * place the dump records which reference pin a pad is, and this uses it: the
 * placement's `ref` and pin name are the export's, so `${ref}.${pin}` resolves
 * in the reference netlist like any other pin. **The alternative - keeping the
 * board's name - would have left ten of the frozen low-boost's twenty-seven
 * pins resolving to no net, and a cut derivation would have read those holes as
 * empty**, which is the silence this project's rules exist to prevent. It is
 * also what `./pad-provenance.ts` does for `HC8`, under its own name.
 *
 * **THE CONSEQUENCE, STATED BECAUSE IT IS THE ONE PLACE THIS IMPORTER BREAKS A
 * HABIT:** an off-board part with three terminals becomes THREE placements that
 * share one `ref`. That is faithful - the fork places each pad independently and
 * a move must be able to move one without the others - but `ref` is then not
 * unique among placements, and a later task keying a map by `ref` alone would
 * collapse them. The identity of a pad placement is `ref` AND its one pin name.
 */
function padPlacementOf(
  pad: PadLine,
  pins: readonly PinHole[] | undefined,
  reference: ReferenceNets,
): Placement {
  if (pad.placement === "floating") {
    refuse(
      "vero-import-pad-unplaced",
      `the dump reports the pad "${pad.ref}" as FLOATING, so it is in no hole: "${pad.line}".\n` +
        "Fix it in the layout - a breakout hole that is nowhere is a terminal the board does " +
        "not bring out.\nIt is not imported at an invented hole and it is not dropped: its " +
        "reference pin would then be on the board according to the netlist and in no hole " +
        "according to the layout, with nothing downstream able to see the disagreement.",
    )
  }
  const source = pad.source
  const dot = source === undefined ? -1 : source.lastIndexOf(".")
  const owner = source === undefined ? "" : source.slice(0, dot)
  const pin = source === undefined ? "" : source.slice(dot + 1)
  if (source === undefined || owner === "" || pin === "") {
    refuse(
      "vero-import-pad-unprovenanced",
      `the dump prints the pad "${pad.ref}" with no readable FROM <ref>.<pin> field: ` +
        `"${pad.line}".\nThat field is the only place a dump records which reference pin an ` +
        "expanded pad is, so without it the hole holds a lead of no known net. The fork prints " +
        "NOPROVENANCE when its own board carries none; fix it by re-importing the netlist into " +
        "the layout.\nThe pad's board name is not used instead: RV_LO_BOOST_1 is a name " +
        "VeroRoute invented and no netlist knows it.",
    )
  }
  const only = pins?.[0]
  if (pins === undefined || pins.length !== 1 || only === undefined) {
    refuse(
      "vero-import-pad-pin-lines",
      `the dump prints ${pins?.length ?? 0} PIN lines for the pad "${pad.ref}" and a pad is one ` +
        `hole: "${pad.line}".\nThe fork prints exactly one PIN line per placed pad; a different ` +
        "count is a grammar change rather than a board this importer should interpret.\nThe " +
        "PAD line's own AT field is not used in its place: the PIN lines are this importer's " +
        "one source for where a lead is, and a second source for one case is how two readings " +
        "drift apart.",
    )
  }
  if (only.hole.strip !== pad.placement.row || only.hole.column !== pad.placement.col) {
    refuse(
      "vero-import-pad-hole-disagrees",
      `the pad "${pad.ref}" is at ${pad.placement.row},${pad.placement.col} on its PAD line and ` +
        `at ${only.hole.strip},${only.hole.column} on its PIN line: "${pad.line}".\nThe fork ` +
        "writes both from the same board, so a disagreement is a defect in the capture rather " +
        "than a reading to normalise.\nNeither is preferred: the two printed positions exist " +
        "so that the disagreement is visible, and choosing one would hide it.",
    )
  }
  if (netOf(source, reference) === "") {
    refuse(
      "vero-import-pad-net-unknown",
      `the pad "${pad.ref}" says it is reference pin "${source}", and the netlist export handed ` +
        "to candidateFromDump has that pin in no net.\nEither the export is of a different " +
        "schematic than the layout was built from, or the pad's FROM field names a pin that no " +
        "longer exists.\nIt is not imported with no net: its hole holds a lead, and a cut " +
        "derivation reading that hole as empty would leave out the cut it needs.",
    )
  }
  return {
    ref: owner,
    footprint: OFF_BOARD_TERMINAL,
    origin: only.hole,
    // ARBITRARY, AND THE COMMENT ABOVE SAYS SO: a single pad has no orientation.
    direction: "E",
    holes: [only.hole],
    pins: new Map([[pin, only.hole]]),
  }
}

/** The reference net holding one pin id, or `""` when no net holds it. */
function netOf(pin: string, reference: ReferenceNets): string {
  for (const [net, members] of reference) if (members.includes(pin)) return net
  return ""
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
  const pads = padLines(dumpText)
  const known = new Set([...dump.parts.map((part) => part.ref), ...pads.map((pad) => pad.ref)])
  for (const ref of [...pins.keys()].sort()) {
    if (known.has(ref)) continue
    refuse(
      "vero-import-pins-without-part",
      `the dump prints PIN lines for "${ref}" and neither a PART line nor a PAD line, so there ` +
        "is nothing on the board for those holes to belong to.\nThe two line kinds that put a " +
        "lead in a hole are PART (a fitted component) and PAD (one terminal of an off-board " +
        "one); a third would be a grammar this importer has not been taught, and " +
        "tools/perfboard/acquire.ts names the rebuild if this dump is from an unpinned " +
        "fork.\nThe holes are not imported unowned: every later question about a hole - which " +
        "net it is on, whether a cut is needed beside it - is asked of the thing that owns it.",
    )
  }
  const nets = netByNode(dumpText, reference)
  const placements = [
    ...dump.parts.map((part) => placementOf(part, pins.get(part.ref), footprints, patterns)),
    // THE PADS COME AFTER THE PARTS AND IN THE DUMP'S OWN ORDER, which is a
    // declared convention rather than an accident: two runs over one dump must
    // produce the same candidate, and a reader comparing a candidate against a
    // dump should be able to walk the two in step.
    ...pads.map((pad) => padPlacementOf(pad, pins.get(pad.ref), reference)),
  ]
  const wires = wiresOf(dumpText, dump, nets)
  return {
    grid: { strips: dump.grid.rows, columns: dump.grid.cols },
    placements,
    wires,
    bridges: bridgesOf(dump, reference, placements, wires),
  }
}
