/**
 * THE EXACT BYTES THAT IDENTIFY AN ELK LAYOUT INPUT - and they are a CONTRACT, not a convenience.
 *
 * Hand-written for Task 12 of the M1 schematic-authoring plan.
 *
 * **WHY THIS MODULE EXISTS AT ALL, measured.** `docs/known-gaps.md` **G95**: three random shuffles
 * of one netlist - *"same components, same nets, same partition"* - produce **three distinct
 * drawings out of three on 4 of 4 circuits**, moving inter-net crossings by up to 2.1x at block
 * scale and 3x flat. *"Reordering the `.capacitor(...)` calls in a circuit file would change every
 * generated schematic."* So **the generation manifest (spec §2.1) and the readability baseline
 * (spec §3.3) hash THESE BYTES and never the section `Network`'s content**: G95's own criterion
 * says a content hash *"would certify two different drawings under one input hash, which is
 * exactly the failure the manifest exists to prevent."*
 *
 * **AND THE OTHER HALF OF G95 IS WHY THESE BYTES ARE USABLE AS A KEY.** Determinism for a FIXED
 * input holds - *"14 of 14 inputs gave one distinct output over three runs"* - so the pair
 * (these bytes, this `elkjs`) identifies one drawing. The two facts are compatible and must not
 * be confused: **the serialization is deterministic; the circuit is not.**
 *
 * **HOW IT IS DONE: a declared key order, and nothing else.** `JSON.stringify` preserves the
 * insertion order of string keys, so this module builds each value key by key from a declared
 * list and lets `JSON.stringify` write it. The lists are the contract: reordering one changes
 * every byte, which is why `tests/schgen/elk/serialize.test.ts` pins one small graph's
 * serialization exactly rather than only pinning that two runs agree.
 *
 * **IT ALSO SERIALIZES AN OUTPUT GRAPH, deliberately.** `elkjs` decorates the graph it returns
 * with a GWT-internal identity hash code (`$H`) that counts up as its worker hashes objects, so
 * `JSON.stringify` of a returned `ElkNode` is a function of everything laid out before it on that
 * worker rather than of its own input: **two blocks with the same graph in one `layoutBlocks` call
 * come back raw-unequal** (277/282/286/288/13 against 371/375/379/381/369, measured). This writer
 * emits only declared keys, so it is the comparison every determinism check uses.
 * `docs/known-gaps.md` **G181** records the measurement.
 */

import type { ElkEdgeSection, ElkExtendedEdge, ElkNode, ElkPoint, ElkPort, LayoutOptions } from "elkjs/lib/elk-api.js"

type NodeKey = "id" | "x" | "y" | "width" | "height" | "layoutOptions" | "ports" | "children" | "edges"
type PortKey = "id" | "x" | "y" | "width" | "height" | "layoutOptions"
type EdgeKey = "id" | "sources" | "targets" | "layoutOptions" | "sections" | "junctionPoints"
type SectionKey =
  | "id" | "startPoint" | "endPoint" | "bendPoints"
  | "incomingShape" | "outgoingShape" | "incomingSections" | "outgoingSections"

/**
 * THE DECLARED ORDERS. **Reordering any of these four lists changes the bytes of every
 * serialization**, which is what makes them the contract rather than an implementation detail -
 * and what makes `serialize.test.ts`'s pinned string a check that can fail.
 */
const NODE_KEYS: readonly NodeKey[] = ["id", "x", "y", "width", "height", "layoutOptions", "ports", "children", "edges"]
const PORT_KEYS: readonly PortKey[] = ["id", "x", "y", "width", "height", "layoutOptions"]
const EDGE_KEYS: readonly EdgeKey[] = ["id", "sources", "targets", "layoutOptions", "sections", "junctionPoints"]
const SECTION_KEYS: readonly SectionKey[] = [
  "id", "startPoint", "endPoint", "bendPoints",
  "incomingShape", "outgoingShape", "incomingSections", "outgoingSections",
]

/**
 * `layoutOptions` keys are emitted SORTED rather than in insertion order.
 *
 * The declared orders above are a property of this module; a `layoutOptions` record's insertion
 * order is a property of whatever built it, and two records with the same entries built by
 * different code paths would otherwise serialize differently. Sorting removes that as a source of
 * difference without hiding a real one: a changed option still changes the bytes.
 */
function options(o: LayoutOptions): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of Object.keys(o).sort()) {
    const value = o[key]
    if (value !== undefined) out[key] = value
  }
  return out
}

function point(p: ElkPoint): Record<string, number> {
  return { x: p.x, y: p.y }
}

/**
 * A field this module does not serialize must not be silently dropped.
 *
 * `ElkGraphElement` carries `labels`, and nothing in this backend creates one. If one ever
 * appears - from a later task or from `elkjs` itself - it would vanish from the hashed bytes and
 * two different inputs would share one key. That is the failure the manifest exists to prevent,
 * so it refuses instead, naming where to add the key.
 */
function refuseUndeclared(what: string, labels: unknown): void {
  if (labels === undefined) return
  if (Array.isArray(labels) && labels.length === 0) return
  throw new Error(
    `${what} carries ELK labels, and lib/schgen/elk/serialize.ts declares no key order for them. ` +
      "Add `labels` to the relevant key list with a writer, or stop setting it. It is not skipped " +
      "because a field left out of the serialization is a field the generation manifest and the " +
      "readability baseline cannot see, and two different inputs would then hash the same " +
      "(docs/known-gaps.md G95).",
  )
}

function sectionValue(s: ElkEdgeSection): Record<string, unknown> {
  refuseUndeclared(`edge section ${s.id}`, s.labels)
  const out: Record<string, unknown> = {}
  for (const key of SECTION_KEYS) {
    switch (key) {
      case "id": out["id"] = s.id; break
      case "startPoint": out["startPoint"] = point(s.startPoint); break
      case "endPoint": out["endPoint"] = point(s.endPoint); break
      case "bendPoints": if (s.bendPoints !== undefined) out["bendPoints"] = s.bendPoints.map(point); break
      case "incomingShape": if (s.incomingShape !== undefined) out["incomingShape"] = s.incomingShape; break
      case "outgoingShape": if (s.outgoingShape !== undefined) out["outgoingShape"] = s.outgoingShape; break
      case "incomingSections": if (s.incomingSections !== undefined) out["incomingSections"] = [...s.incomingSections]; break
      case "outgoingSections": if (s.outgoingSections !== undefined) out["outgoingSections"] = [...s.outgoingSections]; break
    }
  }
  return out
}

function edgeValue(e: ElkExtendedEdge): Record<string, unknown> {
  refuseUndeclared(`edge ${e.id}`, e.labels)
  const out: Record<string, unknown> = {}
  for (const key of EDGE_KEYS) {
    switch (key) {
      case "id": out["id"] = e.id; break
      case "sources": out["sources"] = [...e.sources]; break
      case "targets": out["targets"] = [...e.targets]; break
      case "layoutOptions": if (e.layoutOptions !== undefined) out["layoutOptions"] = options(e.layoutOptions); break
      case "sections": if (e.sections !== undefined) out["sections"] = e.sections.map(sectionValue); break
      case "junctionPoints": if (e.junctionPoints !== undefined) out["junctionPoints"] = e.junctionPoints.map(point); break
    }
  }
  return out
}

function portValue(p: ElkPort): Record<string, unknown> {
  refuseUndeclared(`port ${p.id}`, p.labels)
  const out: Record<string, unknown> = {}
  for (const key of PORT_KEYS) {
    switch (key) {
      case "id": out["id"] = p.id; break
      case "x": if (p.x !== undefined) out["x"] = p.x; break
      case "y": if (p.y !== undefined) out["y"] = p.y; break
      case "width": if (p.width !== undefined) out["width"] = p.width; break
      case "height": if (p.height !== undefined) out["height"] = p.height; break
      case "layoutOptions": if (p.layoutOptions !== undefined) out["layoutOptions"] = options(p.layoutOptions); break
    }
  }
  return out
}

function nodeValue(n: ElkNode): Record<string, unknown> {
  refuseUndeclared(`node ${n.id}`, n.labels)
  const out: Record<string, unknown> = {}
  for (const key of NODE_KEYS) {
    switch (key) {
      case "id": out["id"] = n.id; break
      case "x": if (n.x !== undefined) out["x"] = n.x; break
      case "y": if (n.y !== undefined) out["y"] = n.y; break
      case "width": if (n.width !== undefined) out["width"] = n.width; break
      case "height": if (n.height !== undefined) out["height"] = n.height; break
      case "layoutOptions": if (n.layoutOptions !== undefined) out["layoutOptions"] = options(n.layoutOptions); break
      case "ports": if (n.ports !== undefined) out["ports"] = n.ports.map(portValue); break
      case "children": if (n.children !== undefined) out["children"] = n.children.map(nodeValue); break
      case "edges": if (n.edges !== undefined) out["edges"] = n.edges.map(edgeValue); break
    }
  }
  return out
}

/**
 * The graph as the exact bytes the manifest and the baseline hash.
 *
 * Compact - no indentation - because this is a key and not a document; `tools/schgen/elk/` prints
 * it verbatim in a raise diagnosis (Task 14) so the raise is reproducible from the report alone.
 */
export function serializeElkInput(graph: ElkNode): string {
  return JSON.stringify(nodeValue(graph))
}
