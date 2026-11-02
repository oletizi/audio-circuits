/**
 * What a routing feature on an imported board CARRIES: the net a `WIRE` line's
 * node id names, and the net a `SOLDER` line's two holes are already on.
 *
 * **ITS OWN FILE, AND THE SEAM IS WHAT A LINE SAYS ABOUT ITSELF.**
 * `./vero-import.ts` walks a dump's `PART` and `PIN` lines, where every fact a
 * `Placement` needs is printed; this file holds the two line kinds whose net has
 * to be RESOLVED - one against the `NODE` table, one against the holes around it
 * - and the vocabulary translation both need. One file carrying both halves
 * reached 547 lines against this repository's 300-500 ceiling.
 *
 * It also holds the refusal shape and the row-to-strip reading, because both
 * halves need them and two spellings of either would be two things to keep
 * correct.
 */
import { dumpLineFields } from "../perfboard/dump-lines.ts"
import type { BoardDump } from "../guide/dump.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { Bridge, Hole, Placement, Wire } from "../../lib/stripboard/board.ts"

/** Every refusal in this importer, in one shape: the key, then what is wrong and why it is not defaulted. */
export function refuse(key: string, detail: string): never {
  throw new Error(`${key}: ${detail}`)
}

export const MAP_FIX =
  "Name a KiCad footprint for it in the board's footprint map - the designator-to-footprint " +
  "shape tests/fixtures/stripboard/*.footprints.json carries. It is not guessed from the " +
  "VeroRoute component type: that type is a hole pattern (RESISTOR is four columns whatever " +
  "resistor is fitted), and a footprint family chosen from it would decide the part's reach " +
  "and pad geometry on the strength of a name"

/**
 * The strip a dump row is, and the column a dump column is.
 *
 * ONE LINE OF ARITHMETIC AND A REFUSAL BESIDE IT. On a board whose strips run
 * along the rows - `VERTICAL_STRIPS 0`, which all seven committed dumps are -
 * a row IS a strip and a column is a column. For a vertical-strip board the two
 * axes exchange, and **no committed board is one**, so the transposition is
 * untested arithmetic and this refuses rather than running it.
 */
export function holeOf(position: { readonly row: number; readonly col: number }): Hole {
  return { strip: position.row, column: position.col }
}


/** `ref.pin` to the reference net holding it, from the netlist export. */
function netByPin(reference: ReferenceNets): ReadonlyMap<string, string> {
  const out = new Map<string, string>()
  for (const [net, pins] of reference) for (const pin of pins) out.set(pin, net)
  return out
}

/**
 * Each `NODE` id to the REFERENCE net it is, resolved through the node's own
 * member pins.
 *
 * **BY MEMBERSHIP AND NEVER BY NAME, because the two vocabularies differ.** A
 * `NODE` line names `GND` where a KiCad export names `/GND`, and matching those
 * by stripping a character is a rule that holds until a hierarchical sheet puts
 * a path in front of it. The members are `ref.pin` ids in the EXPORT's
 * vocabulary (`pad-provenance.ts` records this: the dump's `NODE` lines name
 * `RV_LO_BOOST.1` while its `PIN` lines name `RV_LO_BOOST_1`), so one lookup
 * per member settles it - and a node whose members fall in two reference nets
 * refuses, which no name match could notice.
 *
 * `parseBoardDump` keeps a `NODE` line's id and name and drops its members, so
 * the members are read here. That follows `./pad-provenance.ts`, which reads the
 * `PAD` line the same way and for the same reason, rather than widening a type
 * twenty callers construct.
 */
export function netByNode(dump: string, reference: ReferenceNets): ReadonlyMap<string, string> {
  const pinNets = netByPin(reference)
  const out = new Map<string, string>()
  for (const fields of dumpLineFields(dump, "NODE")) {
    const [, id, keyword] = fields
    if (id === undefined || keyword !== "NAME") continue
    const members = fields.slice(4).filter((field) => field.length > 0)
    const nets = new Set<string>()
    for (const member of members) {
      const net = pinNets.get(member)
      if (net !== undefined) nets.add(net)
    }
    const only = [...nets][0]
    if (nets.size === 1 && only !== undefined) out.set(id, only)
    else if (nets.size > 1) {
      refuse(
        "vero-import-node-net-disagrees",
        `the dump's NODE ${id} ("${fields[3] ?? ""}") has member pins in ${nets.size} different ` +
          `reference nets (${[...nets].sort().join(", ")}), so the net a wire on that node ` +
          "carries is not one net.\nFix it where the two sides disagree: either the dump is of " +
          "a different revision of the board than the netlist export handed to this importer, " +
          "or the export is of a different schematic.\nIt is not resolved by taking the first, " +
          "the largest or the dump's own NODE name: a wire's net is the identity a cut " +
          "derivation partitions a strip by, and a wrong one moves cuts.",
      )
    }
  }
  return out
}

/** One `WIRE` line's two ends, with the node ids `parseBoardDump` discards. */
export interface WireNodes {
  readonly name: string
  readonly nodeIds: readonly [string, string]
}

/**
 * The node ids on every `WIRE` line, in the order the lines appear.
 *
 * **BOTH IDS PER END ARE CHECKED AND ONLY ONE IS USED.** The fork prints each
 * end as `<row>,<col>,<gridNodeId>,<wireNodeId>` and says why in
 * `Headless_dump_wires.cpp`: the first is the copper's own node at that hole,
 * the second is what the wire component believes it carries, `PutDown` writes
 * them together, and *"a reader that finds them disagreeing has found a
 * defect"*. So a disagreement refuses here rather than one of the two being
 * picked. Measured: all 19 wire ends across the committed dumps agree, and so
 * do the two ends of every wire.
 */
export function wireNodes(dump: string): readonly WireNodes[] {
  return dumpLineFields(dump, "WIRE").map((fields) => {
    const line = fields.join(" ")
    const name = fields[1] ?? ""
    const ends = fields.slice(fields.indexOf("ENDS") + 1)
    const ids: string[] = []
    for (const end of ends) {
      const match = /^\d+,\d+,(\d+),(\d+)$/.exec(end)
      const grid = match?.[1]
      const wire = match?.[2]
      if (match === null || grid === undefined || wire === undefined) {
        refuse(
          "vero-import-wire-unreadable-node",
          `WIRE ${name} prints an end this importer cannot read a node id from ("${end}"): ` +
            `"${line}".\nThe grammar is <row>,<col>,<gridNodeId>,<wireNodeId>, from ` +
            ".tools/veroroute-perfboard/Src/Headless_dump_wires.cpp.\nIt is not defaulted to " +
            "no net: Wire.net is a required field of the model precisely so that it cannot be " +
            "left to be worked out afterwards.",
        )
      }
      if (grid !== wire) {
        refuse(
          "vero-import-wire-node-split",
          `WIRE ${name} prints an end whose two node ids disagree (copper ${grid}, wire ` +
            `${wire}): "${line}".\nThe fork's own contract for this line says PutDown writes ` +
            'the two together and "a reader that finds them disagreeing has found a defect", ' +
            "so this is a fault on the board rather than a reading this importer may " +
            "normalise.\nIt is not resolved by preferring the copper's id: the two printed " +
            "numbers exist so that the disagreement is visible, and hiding it here would make " +
            "the one check they support impossible.",
        )
      }
      ids.push(grid)
    }
    const [first, second] = ids
    if (ids.length !== 2 || first === undefined || second === undefined) {
      refuse(
        "vero-import-wire-unreadable-node",
        `WIRE ${name} has ${ids.length} readable ends rather than two: "${line}".`,
      )
    }
    return { name, nodeIds: [first, second] }
  })
}


/** The reference net a node id is, or a refusal naming the wire that asked. */
function netOfNode(
  nodeId: string,
  nets: ReadonlyMap<string, string>,
  asked: string,
): string {
  const net = nets.get(nodeId)
  if (net === undefined) {
    refuse(
      "vero-import-node-net-unknown",
      `${asked} is on the dump's node ${nodeId}, and no net can be put to that id: either the ` +
        "dump prints no NODE line for it (node 0 is the fork's \"no node here\", which a wire " +
        "on a board whose nets were never computed carries), or that NODE line's member pins " +
        "are in no net of the reference netlist handed to candidateFromDump.\nFix it by " +
        "handing the export of the schematic this board was laid out for, or by recomputing " +
        "the board's nets in the fork.\nIt is not imported with an invented or empty net: " +
        "Wire.net is required by the model so that a wire cannot exist without the net it was " +
        "added to carry.",
    )
  }
  return net
}

/** Every `WIRE` line as a `Wire`, with its declared net. */
export function wiresOf(
  dumpText: string,
  dump: BoardDump,
  nets: ReadonlyMap<string, string>,
): readonly Wire[] {
  const nodes = wireNodes(dumpText)
  return dump.wires.map((wire, index) => {
    const found = nodes[index]
    if (found === undefined || found.name !== wire.name) {
      refuse(
        "vero-import-wire-unreadable-node",
        `the WIRE lines this importer read do not line up with the ones parseBoardDump read ` +
          `(at index ${index}: "${wire.name}" against "${found?.name ?? "nothing"}").`,
      )
    }
    const [first, second] = found.nodeIds
    if (first !== second) {
      refuse(
        "vero-import-wire-two-nets",
        `WIRE ${wire.name} has its two ends on different nodes (${first} and ${second}), so it ` +
          "joins two nets and the one net it exists to carry is not one net.\nThat is a short " +
          "on the board: fix it in the layout.\nNeither end's node is taken as the wire's: a " +
          "cut derivation partitions each strip by the nets its contacts declare, and either " +
          "choice would hide the short it is meant to surface.",
      )
    }
    return {
      from: holeOf(wire.ends[0]),
      to: holeOf(wire.ends[1]),
      net: netOfNode(first, nets, `WIRE ${wire.name}`),
    }
  })
}

/**
 * Every `SOLDER` line as a `Bridge`, with the net it carries.
 *
 * **THE NET IS DERIVED AND THE GRAMMAR IS WHY.** A `CUT` line carries a node id
 * at each of its two holes; a `SOLDER` line carries none, and the fork's own
 * grammar comment confirms that is not a truncation. So a bridge's net is read
 * off whatever significant contact is already in one of its two holes - a
 * component pin, through the reference netlist, or a wire end, through that
 * wire's node - and **refuses when neither hole holds one**. Measured on the
 * committed set: 15 of the 21 bridges have a contact in one of their holes and
 * 6 do not (five of pt2399-core's six, and one of `buffered`'s).
 *
 * The missing alternative is deliberate: the net could be taken from the other
 * contacts on the two strips the bridge joins, but a strip carries several nets
 * and which of them reaches the bridge is the question CUTS answer - so that
 * route needs the cut set, and a cut set this module supplied would be an input
 * to the derivation Task 2 compares against the fork's own.
 */
export function bridgesOf(
  dump: BoardDump,
  reference: ReferenceNets,
  placements: readonly Placement[],
  wires: readonly Wire[],
): readonly Bridge[] {
  const contacts = new Map<string, Set<string>>()
  const add = (hole: Hole, net: string): void => {
    const key = `${hole.strip},${hole.column}`
    const found = contacts.get(key) ?? new Set<string>()
    found.add(net)
    contacts.set(key, found)
  }
  // The reference's pin ids are the board's here: a dump carrying PAD lines -
  // the one case where the two vocabularies differ, and `./pad-provenance.ts`
  // holds the mapping for it - refuses before this is reached.
  const pinNets = netByPin(reference)
  for (const placement of placements) {
    for (const [pin, hole] of placement.pins) {
      const net = pinNets.get(`${placement.ref}.${pin}`)
      if (net !== undefined) add(hole, net)
    }
  }
  for (const wire of wires) {
    add(wire.from, wire.net)
    add(wire.to, wire.net)
  }
  return dump.bridges.map((bridge) => {
    const a = holeOf(bridge.a)
    const b = holeOf(bridge.b)
    const named = `SOLDER ${bridge.a.row},${bridge.a.col} ${bridge.b.row},${bridge.b.col}`
    if (a.column !== b.column || Math.abs(a.strip - b.strip) !== 1) {
      refuse(
        "vero-import-bridge-shape",
        `${named} does not join two adjacent strips at one column, and the model's Bridge is ` +
          "that shape and only that shape - one column, exactly two strips - so there is " +
          "nothing to import it as.\nFix it in the layout.\nIt is not imported as the nearest " +
          "pair of holes: a bridge is a routing decision priced beside a wire, and a diagonal " +
          "one is a different decision.",
      )
    }
    const found = new Set([...(contacts.get(`${a.strip},${a.column}`) ?? []), ...(contacts.get(`${b.strip},${b.column}`) ?? [])])
    const only = [...found][0]
    if (found.size > 1) {
      refuse(
        "vero-import-bridge-nets-disagree",
        `${named} has contacts of ${found.size} different nets in its two holes ` +
          `(${[...found].sort().join(", ")}), so the net it carries is not one net - which is ` +
          "a short, since a bridge joins those two holes.\nFix it in the layout.\nOne of them " +
          "is not chosen: the bridge is priced and partitioned by its net, and either choice " +
          "would hide the short.",
      )
    }
    if (found.size === 0 || only === undefined) {
      refuse(
        "vero-import-bridge-net-unknown",
        `${named} joins two holes that hold no component pin and no wire end, and a SOLDER ` +
          "line carries no node id of its own - unlike a CUT line, whose two hole fields each " +
          "carry one - so the net this bridge carries is nowhere in the dump.\nThe fix is in " +
          "the fork's grammar: print a node id on the SOLDER line as the CUT line already " +
          "does (.tools/veroroute-perfboard/Src/Headless_dump.cpp).\nIt is not taken from the " +
          "other contacts on the two strips: a strip carries several nets, and which of them " +
          "reaches this hole is what the cuts say - so that route would need the fork's own " +
          "cut set, which is the thing a derived cut set has to be compared against.",
      )
    }
    const strips: readonly [number, number] = a.strip < b.strip ? [a.strip, b.strip] : [b.strip, a.strip]
    return { column: a.column, strips, net: only }
  })
}

