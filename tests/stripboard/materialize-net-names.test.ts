/**
 * A materialised board carries the circuit's own net names.
 *
 * **THE GAP THIS CLOSES (`G14`).** `--import` wrote every `NODE` line as
 * `NAME -` and dumped `NET_NAMES 0`; a materialised board inherited both,
 * because `--materialize` paints copper with the nodeIds `--import` minted and
 * never touches names. `tools/guide/checklist.ts`'s `netName` therefore refused
 * outright - *"the cut at C5 is on node 11, which the dump stores no net name
 * for, so the checklist cannot say which nets that cut separates"* - so the
 * printed build checklist could be produced for the owner's hand-laid board
 * and for nothing this pipeline made. The fix is in the fork, at the one point
 * where a board nodeId is minted from a netlist net
 * (`Board::BuildFromParsedNetlist`), and the names are the netlist's own.
 *
 * **WHY THE NAMES BEING PRESENT IS THE WEAKER HALF OF THIS FILE.** Fourteen
 * non-dash strings would also be produced by an import that stored the right
 * names against the wrong nodes, and that failure is worse than the gap: the
 * checklist would then confidently print the wrong net beside a cut, and a
 * person would cut the wrong strip. So the strong assertion here is per node,
 * and it is a JOIN BY PIN SET - the same correspondence
 * `tools/stripboard/seed-nets.ts` computes, for the same reason it gives: a
 * net's pin set is unique by construction, because two nets with identical pin
 * sets would BE the same net. The name a node carries must be the name of the
 * reference net whose pin set that node holds. Nothing here reads a node id as
 * an index, and nothing matches by order: an id is whatever order `--import`
 * allocated in.
 *
 * **IT STILL DOES NOT MAKE THE BOARD'S NAMES AUTHORITATIVE.** `equivalence.ts`
 * and `copper.ts` never read a `NODE` name, and `seed-nets.ts` says why it does
 * not either: the point of checking a board is not to take the board's word for
 * which net is which. Nothing in this change alters that - the names are for
 * the operator's eyes, and this file is the measurement that the board's eyes
 * and the circuit agree.
 */
import { afterAll, expect, test } from "bun:test"
import { dumpLineFields } from "../../tools/perfboard/dump-lines.ts"
import { materialisedLowBoost, type MaterialisedLowBoost } from "./materialize-low-boost.ts"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"

/** How many nets low-boost's circuit exports. The committed hand layout carries `NET_NAMES 14`. */
const LOW_BOOST_NETS = 14

function materialise(): Promise<MaterialisedLowBoost> {
  return materialisedLowBoost("stripboard-materialize-net-names-")
}

/**
 * The separator for `pinSetKey`, a byte no pin name can contain.
 *
 * **IT IS BUILT IN CODE BECAUSE IT WAS A RAW NUL IN THIS FILE UNTIL 2026-10-24, AND THAT MADE THE
 * WHOLE FILE INVISIBLE TO `grep`.** `grep -c pinSetKey` over this file returned nothing and exit
 * 1, for an identifier defined **one line ABOVE the byte** - in the old file `function pinSetKey`
 * was at line 48 and the NUL at line 49, column 32, byte offset **2811** - because one NUL makes
 * `grep` treat the file as binary and suppress every match in it.
 * (*"three lines below"* and *"byte 2804"* stood here and
 * in **G289**; three lines below is the geometry of THIS repaired file - the `NUL` constant
 * immediately below, then `pinSetKey` three lines after it - and it was never the geometry of the
 * file that held the byte. **G289** carries both corrections.) `CLAUDE.md` forbids typing a
 * control-character escape into a tool parameter for exactly this reason - the escape arrives as
 * the real byte and the
 * result is invisible in a rendered diff. `docs/known-gaps.md` **G277** clause 10 is the class and
 * **G289** is this instance, the sixth.
 */
const NUL = String.fromCharCode(0)

/** One hashable key for a set of pins, order-independent - `seed-nets.ts`'s own. */
function pinSetKey(pins: readonly string[]): string {
  return [...pins].sort().join(NUL)
}

/**
 * Each `NODE` line's name and pin list, read off the dump text.
 *
 * `parseBoardDump` models the names (`dump.nodes`) and not the pin lists, and
 * the join below needs both on the same line, so the line is read here rather
 * than widening the dump model for one test.
 */
function nodeLines(text: string): ReadonlyMap<string, { name: string; pins: readonly string[] }> {
  const byNode = new Map<string, { name: string; pins: readonly string[] }>()
  for (const fields of dumpLineFields(text, "NODE")) {
    const [, id, keyword, name, ...pins] = fields
    if (id === undefined || keyword !== "NAME" || name === undefined) {
      throw new Error(`unreadable NODE line: "${fields.join(" ")}"`)
    }
    byNode.set(id, { name, pins })
  }
  return byNode
}

test("a materialised board carries the circuit's net names", async () => {
  const { text, dump } = await materialise()
  const named = new Set(Object.values(dump.nodes))
  expect(
    Object.keys(dump.nodes).length,
    "the premise: low-boost materialises onto fourteen board nodes",
  ).toBe(LOW_BOOST_NETS)
  expect(
    [...named].every((name) => name !== "-"),
    `no node is left a bare dash: ${[...named].sort().join(", ")}`,
  ).toBe(true)
  expect(named.size, "fourteen DISTINCT names, so no name is attached to two nodes").toBe(
    LOW_BOOST_NETS,
  )
  // **THE STORE'S SIZE, NOT A RESTATEMENT OF THE LINES ABOVE.** `NET_NAMES` is
  // `NetNameManager::GetSize()`, and the fork's own comment says why printing it
  // is worth a line: a name left behind for a retired nodeId is invisible on
  // every NODE line, is saved into the `.vrt`, and surfaces later on whatever
  // unrelated net next takes that number. Fourteen names and fourteen named
  // nodes agreeing is the evidence that no such orphan was written.
  expect(text, "the name store holds exactly the names the NODE lines show").toContain(
    `NET_NAMES ${LOW_BOOST_NETS}`,
  )
})

test("each node's name is the name of the net whose pins that node carries", async () => {
  const { text, reference } = await materialise()
  const netByPinSet = new Map<string, string>()
  for (const [net, pins] of reference) {
    const already = netByPinSet.get(pinSetKey(pins))
    if (already !== undefined) {
      throw new Error(
        `reference nets "${already}" and "${net}" carry the same pin set, so a board node ` +
          "matching it cannot be joined to one of them. Two nets with identical pin sets would " +
          "be one net; the join is a bijection or it is nothing.",
      )
    }
    netByPinSet.set(pinSetKey(pins), net)
  }
  expect(netByPinSet.size, "the premise: the circuit exports fourteen nets").toBe(LOW_BOOST_NETS)

  const nodes = nodeLines(text)
  expect(nodes.size, "one NODE line per net").toBe(LOW_BOOST_NETS)
  for (const [id, node] of nodes) {
    const net = netByPinSet.get(pinSetKey(node.pins))
    if (net === undefined) {
      throw new Error(
        `board node ${id} carries pins ${[...node.pins].sort().join(" ") || "(none)"}, which is ` +
          "not the pin set of any net low-boost's model exports, so the name it stores cannot " +
          "be checked against anything. The board and the model are not the same circuit.",
      )
    }
    expect(node.name, `node ${id} carries net ${net}'s pins, so it must carry its name`).toBe(net)
  }
})

afterAll(cleanUpTempScratch)
