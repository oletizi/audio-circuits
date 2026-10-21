/**
 * **GATE 8's M1 HALF: a generated schematic's netlist against a hand-arranged one a human made and
 * trusts, compared by component value and pin-level adjacency, with an EMPTY list of permitted
 * electrical changes.**
 *
 * From `$SCHGEN_SOURCE/gates/oscar/compare.ts`, read in the `digital-pedal-platform` tree:
 *
 * > *"Gate 8: a carried-over subcircuit equals OSCAR's once the declared CORE-BRIEF deltas are
 * > applied to OSCAR's graph. **An undeclared difference fails by construction.**"*
 *
 * **YOU CANNOT ACCIDENTALLY CHANGE A CIRCUIT AND PASS, because passing requires having stated
 * beforehand what you meant to change.** It is `CLAUDE.md`'s acceptance-criteria invariant applied
 * to a netlist: the criterion is authored before the artifact, by someone describing an intended
 * transformation, and never by the thing being graded. `declared-delta.ts` is where that is
 * enforced; this module is where it is used.
 *
 * **WHAT THE ROUND TRIP CANNOT CATCH AND THIS CAN.** The round trip (`gates/round-trip.ts`) proves
 * a generated schematic matches **the netlist it was generated from** - self-consistency. **A
 * generator that mangles a circuit the same way at both ends passes a round trip happily.** This
 * proves it matches **a drawing a human made and trusts.** Different failures, and neither
 * substitutes for the other: **the round trip must never be reported as this check.**
 *
 * **M1's HALF IS THE EMPTY DELTA, AND THAT IS WHY IT IS CHECKABLE AT ALL** (spec §2, revision 4).
 * `circuits/pt2399-core/pt2399-core.kicad_sch` and
 * `circuits/transistor-preamp/lab-board.kicad_sch` are hand-arranged and known good; neither is
 * partitioned, neither carries a stand-in and neither gets a junction header, so a schematic
 * generated from the same model has nothing it is supposed to differ by and `{ kind: "empty" }` is
 * the whole delta list. No `CORE-BRIEF.md`, no enumeration, nothing written from output.
 *
 * **THE GENERATED SIDE DOES NOT EXIST YET FOR EITHER REFERENCE, AND THIS MODULE SAYS SO RATHER
 * THAN SUBSTITUTING SOMETHING THAT DOES.** `docs/known-gaps.md` **G238** measures it: `generate`
 * refuses both references at gate 1, on 115 and 101 `validateCircuit` problems, before any block
 * reaches a layout backend. So the comparison below has been exercised on **two real hand-arranged
 * drawings and on no generated one** - which controller ruling R51 governs and
 * `docs/schematic/reference-graph-checks.md` states in full. **Running it against the ported
 * `mini` fixture instead is forbidden**: `mini` has no hand-arranged schematic a human trusts, so a
 * green row would be self-consistency wearing gate 8's name.
 *
 * **WHAT MAKES THE COMPARISON INDEPENDENT OF WHAT IT IS COMPARING.** Components are keyed by
 * canonical VALUE and LIBRARY ID and the adjacency by PIN - never by designator and never by net
 * name. That is the criterion `docs/known-gaps.md` recorded for this gate before it had a task,
 * and it exists because the reference lock (Task 6) assigns designators and must not be able to
 * launder a difference through them. `graph-match.ts` holds the match and its header says what it
 * does and does not claim.
 *
 * **ONE NETLIST READER.** `graphFromNetlist` upstream is written against
 * `connectivityFromXml`/`componentsFromXml` over `fast-xml-parser`. Task 11 replaced that path
 * with `lib/kicad/netlist.ts`'s `importNetlist` for gate 3 and this does the same - one netlist
 * reader, which is Task 11's own criterion. **No `fast-xml-parser`.**
 *
 * **WHAT WAS NOT PORTED, said plainly** (`CLAUDE.md`: *"states plainly anything it did NOT carry
 * across"*). Every path in this paragraph is in the PEDALS tree, under `$SCHGEN_SOURCE`, and not
 * in this one. From `gates/oscar/`: the OSCAR acquisition (`../oscar/acquire.sh` and
 * `../oscar/acquire.test.ts`);
 * the `CORE-BRIEF.md` reader (`deltaIdsFromBrief`); `applyDeltas`/`applyDeltasTraced` and the
 * whole delta application; `boundary.ts`'s per-subcircuit map and `oscarParts`; `graph.ts`'s
 * `SideSpec`, `extractSubgraph`, `SubPart`, `Subgraph` and `graphFromCircuit`; `symbols.ts`'s
 * symmetric-symbol allow-list and its `<libpart>` polarity checks; and `canonical.ts`'s
 * `isomorphic` with its helpers. **All of it is the SUBCIRCUIT comparison with declared deltas,
 * which is M2's**, except the symmetric allow-list, whose absence makes this gate stricter and is
 * recorded in `docs/known-gaps.md`. `canonicalValue` alone is transcribed, in
 * `canonical-value.ts`.
 */
import type { ImportedNetlist } from "../../kicad/netlist.ts"
import { canonicalValue } from "./canonical-value.ts"
import { describePermitted, type PermittedDelta } from "./declared-delta.ts"
import { matchGraphs } from "./graph-match.ts"

/** A netlist as a graph: components by value and kind, adjacency by pin, independent of references and net names. */
export interface ReferenceGraph {
  readonly nodes: readonly { readonly key: string; readonly value: string; readonly libId: string }[]
  readonly adjacency: readonly { readonly a: string; readonly b: string }[]
}

/**
 * KiCad names the single-pin net of an unconnected pin `unconnected-(...)`. Those nets carry no
 * connection, so they contribute no adjacency - the same exclusion the pedals `graphFromNetlist`
 * makes.
 */
const UNCONNECTED = "unconnected-("

/**
 * **A ONE-MEMBER NET THAT IS NOT KiCad's `unconnected-(...)` IS REFUSED, NOT DROPPED.** A named net
 * with a single pin on it is a dangling labelled wire, and it is the one thing a pin-pair adjacency
 * cannot represent: with no second member there is no pair, so the pin would silently leave the
 * graph and a difference in it could never be reported. `lib/schgen/ir/validate-nets.ts` already
 * refuses one in a model (`docs/known-gaps.md` **G159**), so a netlist holding one is worth
 * knowing about rather than smoothing over.
 */
function assertPairable(net: string, members: readonly string[], source: string): void {
  if (members.length >= 2) return
  throw new Error(
    `${source}: net "${net}" has ${members.length} member(s) (${members.join(", ") || "none"}), so it ` +
      "contributes no pin-to-pin pair and the pin on it would vanish from the reference graph. It is " +
      "REFUSED rather than dropped: a pin the graph cannot hold is a difference the gate could never " +
      "report. KiCad's own name for a genuinely unconnected pin's net begins \"unconnected-(\", and " +
      "those are excluded by name; a NAMED single-pin net is a dangling labelled wire in the drawing.",
  )
}

/**
 * The graph of one netlist.
 *
 * `source` names the netlist in a refusal - a file path, or what produced it. **`node.key` is the
 * designator and is a join key only**: it names the two ends of an adjacency pair and nothing
 * compares two of them (see `graph-match.ts`).
 */
export function graphFromNetlist(n: ImportedNetlist, source = "netlist"): ReferenceGraph {
  const nodes: { key: string; value: string; libId: string }[] = []
  const seen = new Set<string>()
  for (const c of n.components) {
    if (seen.has(c.designator)) throw new Error(`${source}: component ${c.designator} appears twice`)
    seen.add(c.designator)
    if (c.libPart === undefined || c.libPart.trim() === "") {
      throw new Error(
        `${source}: component ${c.designator} has no libsource part, so the graph has no library id to ` +
          "key it by. Gate 8 compares by value AND library id; keying it by value alone would make a " +
          "symbol swap invisible, so it is refused rather than defaulted. A kicad-cli s-expression " +
          "netlist carries (libsource (lib ...) (part ...)) for every component.",
      )
    }
    nodes.push({ key: c.designator, value: canonicalValue(c.value), libId: c.libPart })
  }
  const adjacency: { a: string; b: string }[] = []
  for (const [net, members] of Object.entries(n.nets)) {
    if (net.startsWith(UNCONNECTED)) continue
    assertPairable(net, members, source)
    for (const m of members) {
      const dot = m.lastIndexOf(".")
      const designator = dot <= 0 ? m : m.slice(0, dot)
      if (!seen.has(designator)) {
        throw new Error(`${source}: net "${net}" has a member ${m}, whose component ${designator} is not in the netlist`)
      }
    }
    const sorted = [...members].sort()
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const a = sorted[i]
        const b = sorted[j]
        if (a === undefined || b === undefined) throw new Error(`internal: net "${net}" lost a member between length and index`)
        adjacency.push({ a, b })
      }
    }
  }
  adjacency.sort((p, q) => (p.a < q.a ? -1 : p.a > q.a ? 1 : p.b < q.b ? -1 : p.b > q.b ? 1 : 0))
  nodes.sort((p, q) => (p.key < q.key ? -1 : p.key > q.key ? 1 : 0))
  return { nodes, adjacency }
}

export interface ReferenceGraphResult {
  readonly reference: string
  /** §2.1: a gate reporting a pass names the manifest it ran against. */
  readonly manifest: string
  readonly permitted: PermittedDelta
  /** Every difference left after the permitted deltas are applied. Non-empty is a FAILURE. */
  readonly undeclared: readonly string[]
}

/**
 * The refusal a `declared` permitted delta earns in M1.
 *
 * **It is a PROBLEM and not a skip.** The alternative - compare the two graphs and ignore the
 * entries - would report a pass that means nothing, because every declared difference would surface
 * as an undeclared one or (worse, if the lists happened to cancel) as nothing at all. M1's half of
 * gate 8 is the empty delta and this says so where somebody can read it.
 */
export const DECLARED_DELTAS_ARE_M2 =
  "gate 8 was given a DECLARED permitted-delta list, and applying a declared delta to a reference " +
  "graph is M2's: lib/schgen/gates/declared-delta.ts parses and refuses declarations, and nothing " +
  "in this repository applies a GraphEdit (the pedals applyDeltas/applyDeltasTraced are not " +
  "ported - see lib/schgen/gates/reference-graph.ts's header). M1's half of the gate is the EMPTY " +
  "delta. It is reported as a problem rather than compared anyway: a comparison that ignored the " +
  "declared entries would be a pass that means nothing. See docs/known-gaps.md G104."

/**
 * **THE DEVIATION FROM THE BRIEF's SIGNATURE, STATED HERE BECAUSE IT IS A DEVIATION.** The brief
 * declares `checkReferenceGraph(generated, reference, permitted, manifest)` and a result carrying
 * `reference: string`. **Those two cannot both hold**: an `ImportedNetlist` has no source field, so
 * nothing in that parameter list can name the drawing. A gate that named nothing is exactly the
 * shape spec §2.1 refuses, so `referenceFile` is a fifth parameter. It and `manifest` are both
 * non-blank strings and nothing can tell a swap of the two apart, which is why each is checked for
 * blankness and the parameter is named for the file.
 *
 * `undeclared` is empty only when the two graphs match completely. Non-empty is a FAILURE and
 * every entry names what differs by value, library id and pin - never by designator.
 */
export function checkReferenceGraph(
  generated: ImportedNetlist,
  reference: ImportedNetlist,
  permitted: PermittedDelta,
  manifest: string,
  referenceFile: string,
): ReferenceGraphResult {
  if (referenceFile.trim() === "") {
    throw new Error("checkReferenceGraph needs the reference's file to name it in the result; spec 2.1 refuses a gate row that names nothing")
  }
  if (manifest.trim() === "") {
    throw new Error("checkReferenceGraph needs the manifest citation; spec 2.1's criterion is that a gate reporting a pass names the manifest it ran against")
  }
  const base = { reference: referenceFile, manifest, permitted }
  if (permitted.kind === "declared") return { ...base, undeclared: [DECLARED_DELTAS_ARE_M2] }
  const g = graphFromNetlist(generated, "the generated schematic's netlist")
  const r = graphFromNetlist(reference, referenceFile)
  const m = matchGraphs(g, r, ["the generated schematic", `the reference ${referenceFile}`])
  return { ...base, undeclared: m.problems }
}

/** One line per gate row: what ran, against which reference, under which permitted delta. */
export function describeReferenceGraphResult(r: ReferenceGraphResult): string {
  return (
    `reference ${r.reference}; permitted delta ${describePermitted(r.permitted)}; ` +
    `${r.undeclared.length === 0 ? "no undeclared difference" : `${r.undeclared.length} undeclared difference(s)`}`
  )
}
