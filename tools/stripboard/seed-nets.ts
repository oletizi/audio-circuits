/**
 * Which net each of a board's leads is on, recovered from the board's `NODE` pin
 * lists by joining them to the model's nets BY PIN SET.
 *
 * **WHY A JOIN AND NOT A READ.** `--import` writes every `NODE` line as
 * `NODE <id> NAME - <pins>`: the board carries net TOPOLOGY and no net NAMES.
 * Measured on an `--import --strips horizontal` low-boost board - fourteen NODE
 * lines, fourteen bare dashes, fourteen complete pin lists. Nothing is actually
 * lost, because a net's pin set is unique by construction: two nets with
 * identical pin sets would BE the same net. So the correspondence from board
 * node to model net is a bijection over pin sets, and that is what this module
 * computes.
 *
 * **IT IS ALSO THE RIGHT THING EVEN WHEN THE NAMES ARE THERE**, which is the
 * older and better reason: `tools/stripboard/equivalence.ts` and
 * `tools/stripboard/copper.ts` both state outright that they never read a `NODE`
 * name or a node id, because the point of checking a board is not to take the
 * board's word for which net is which. `HC8` has worked this way since Task 12.
 * The constructed arm was the one component that depended on those names, and it
 * is not any more.
 *
 * The split from `./seed-arms.ts` is at that seam: this file answers *which net
 * is this lead on*, and that file decides *where to put the part*. One file
 * carrying both was 537 lines, past this repository's 300-500 ceiling.
 */
import { dumpLineFields } from "../perfboard/dump-lines.ts"
import type { ReferenceNets } from "./equivalence.ts"

/** One hashable key for a set of pins, order-independent. */
function pinSetKey(pins: readonly string[]): string {
  return [...pins].sort().join("\u0000")
}

/**
 * Each board `NODE`'s pin list, by node id - the whole of what a board carries
 * about its nets, and enough.
 *
 * **IT DOES NOT READ `NAME`, DELIBERATELY.** `--import` writes `NAME -` on every
 * line, so on an imported board the field says nothing; but the reason this
 * function ignores it even when it is set is `HC8`'s reason, which is older and
 * better: `tools/stripboard/equivalence.ts` and `tools/stripboard/copper.ts`
 * both state that they never read a `NODE` name or a node id, because the whole
 * point of checking a board is not to take the board's word for which net is
 * which. The constructed arm must not be the one component that depends on
 * those names.
 */
function nodePinsOf(text: string): ReadonlyMap<string, readonly string[]> {
  const byNode = new Map<string, readonly string[]>()
  for (const fields of dumpLineFields(text, "NODE")) {
    const [, id, keyword, , ...pins] = fields
    if (id === undefined || keyword !== "NAME") {
      throw new Error(`seedCandidate: unreadable NODE line: "${fields.join(" ")}"`)
    }
    byNode.set(id, pins)
  }
  return byNode
}

/**
 * Board node id to MODEL net name, joined by pin set.
 *
 * **THE JOIN IS A BIJECTION BY CONSTRUCTION**, which is what makes it safe to do
 * at all: a net's pin set is unique, because two nets with identical pin sets
 * would BE the same net. So each board node matches exactly one reference net
 * and the correspondence is unambiguous - nothing is guessed from an ordering or
 * from a node id, which is whatever order `--import` happened to allocate in.
 *
 * **REFUSES WHEN THE SETS CANNOT BE JOINED, AND ONLY THEN.** A board node whose
 * pin set matches no reference net, or a reference net with no matching node, is
 * a genuine disagreement about which board is being graded - the board and the
 * model are not the same circuit - and that is worth stopping for. A bare `NAME
 * -` is NOT such a condition: it is expected and routine on every imported
 * board, and refusing on it was this arm's own defect.
 */
function nodeNetNames(
  text: string,
  reference: ReferenceNets,
  board: string,
): ReadonlyMap<string, string> {
  const netByPinSet = new Map<string, string>()
  for (const [net, pins] of reference) {
    const key = pinSetKey(pins)
    const already = netByPinSet.get(key)
    if (already !== undefined) {
      throw new Error(
        `seedCandidate: reference nets "${already}" and "${net}" of ${board} carry the same pin ` +
          `set (${[...pins].sort().join(" ")}), so a board node matching it cannot be joined to ` +
          "one of them. Two nets with identical pin sets would be one net; this export says " +
          "otherwise, and the join is a bijection or it is nothing.",
      )
    }
    netByPinSet.set(key, net)
  }

  const names = new Map<string, string>()
  const matched = new Set<string>()
  for (const [id, pins] of nodePinsOf(text)) {
    const net = netByPinSet.get(pinSetKey(pins))
    if (net === undefined) {
      throw new Error(
        `seedCandidate: board node ${id} carries pins ${[...pins].sort().join(" ") || "(none)"}, ` +
          `which is not the pin set of any net ${board}'s model exports. The board's own NODE ` +
          "names are not used - --import writes every one of them as a bare dash, and HC8's own " +
          "modules never trust them either - so a node is identified by its pin set, and a pin " +
          "set that matches nothing means the board and the model are not the same circuit. It " +
          "is not matched by node id or by node order: an id is whatever order --import " +
          "allocated in, and a wrong correspondence would place every part on a plausible strip " +
          "that is the wrong one, which scores like a layout and is not one.",
      )
    }
    names.set(id, net)
    matched.add(net)
  }
  const unmatched = [...reference.keys()].filter((net) => !matched.has(net)).sort()
  if (unmatched.length > 0) {
    throw new Error(
      `seedCandidate: ${board}'s model exports net(s) ${unmatched.join(", ")} that no NODE on ` +
        "this board carries the pin set of, so part of the circuit is not on the board at all. " +
        "The join is refused rather than completed over the nets that did match: a construction " +
        "that silently arranged a subset would make the one-net-per-strip claim false about the " +
        "board it produced.",
    )
  }
  return names
}

/**
 * Every net each part's pins name, from the dump's `NODE` pin lists joined to
 * the model's nets by pin set.
 *
 * The pin list is the board's; the NAME is the model's. That split is the whole
 * fix: an `--import`-placed board has the first and not the second, and the
 * first is enough.
 */
export function netsByPart(
  text: string,
  reference: ReferenceNets,
  board: string,
): ReadonlyMap<string, readonly string[]> {
  const names = nodeNetNames(text, reference, board)
  const byPart = new Map<string, string[]>()
  for (const [id, pins] of nodePinsOf(text)) {
    const net = names.get(id)
    if (net === undefined) {
      throw new Error(`seedCandidate: node ${id} of ${board} was not joined to a net.`)
    }
    for (const pin of pins) {
      const dot = pin.lastIndexOf(".")
      if (dot <= 0) {
        throw new Error(
          `seedCandidate: NODE ${id} (${net}) names "${pin}", which is not <ref>.<pin>.`,
        )
      }
      const ref = pin.slice(0, dot)
      const nets = byPart.get(ref) ?? []
      if (!nets.includes(net)) nets.push(net)
      byPart.set(ref, nets)
    }
  }
  return byPart
}
