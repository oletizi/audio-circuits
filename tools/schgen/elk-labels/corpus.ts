/**
 * **THE GRAPHS THIS REPOSITORY ALREADY HANDS ELK, PLUS THE TEXT EACH ELEMENT WOULD CARRY.**
 *
 * Research probe for Task 2 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` or any check calls it, and it changes no production code.**
 *
 * **IT ADDS NOTHING TO THE GRAPH.** `elkInputOf` is called unchanged, and what this module builds
 * beside it is a map from an ELK element id to the string this repository would DRAW for that
 * element - a unit's Value, a boundary net's or an edge's net name, a port's pin number. The arms
 * in `arms.ts` are the only thing that attaches a label, and they attach it to a clone.
 */

import { elkInputOf } from "../../../lib/schgen/elk/graph.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { selectRenderer, subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../../lib/schgen/render/templates/index.ts"
import { textWidth } from "../../../lib/schgen/render/text-boxes.ts"
import { caseResolver } from "../authoring-census.ts"
import { declaredBoards } from "../text-metrics/corpus.ts"
import type { Um } from "../../../lib/schgen/render/geometry.ts"
import type { ElkLabel, ElkNode } from "elkjs/lib/elk-api.js"

/**
 * The three heights one line of 1.27 mm text has, by the three quantities §1 measured.
 *
 * **RELAYED from §1.4 and §1.7 of `docs/schematic/text-handling-research.md`**, which drove all
 * three independently; this probe does not re-measure them, because re-driving them needs
 * `kicad-cli`, KiCad's Python bindings and a font blob fetched from outside the repository.
 *
 * **ALL THREE ARE RUN.** §1 is forbidden from electing which quantity governs a collision - that is
 * an acceptance criterion, and `CLAUDE.md` reserves those to the owner - so a conclusion here that
 * held at one of them and not the others would be a conclusion resting on an election nobody made.
 */
export const LINE_HEIGHTS: readonly { readonly name: string; readonly um: Um }[] = [
  { name: "current model 1270.0", um: 1270 },
  { name: "rendered ink 1422.4", um: 1422.4 },
  { name: "GetTextBox 2043.1", um: 2043.1 },
]

/** The height the main table is taken at: KiCad's own box, which is what its clearance uses. */
export const LINE_HEIGHT: Um = 2043.1

/**
 * A coordinate no layout could produce, seeded into a label before the arm that sets no placement
 * option.
 *
 * **THIS IS THE DISCRIMINATOR ONE WHOLE ARM TURNS ON.** A label sent with no `x`/`y` comes back
 * carrying `0, 0`, which is a position - it reads exactly like "placed at the node's corner".
 * Seeding an impossible coordinate makes "ELK did not touch this" distinguishable from "ELK placed
 * it here", and that is the difference between a silent non-placement and a placement.
 */
export const SENTINEL = -7777777

/** What an element is labelled with, and how wide that text is by this repository's own ruler. */
export interface LabelText {
  readonly text: string
  readonly width: Um
}

export interface BlockGraph {
  readonly board: string
  readonly block: string
  readonly graph: ElkNode
  /** ELK element id -> the text this repository would draw for it. */
  readonly labels: ReadonlyMap<string, LabelText>
}

/**
 * Every ELK block of every declared board, with the text each element would carry.
 *
 * **The population is `declaredBoards`, imported from Task 1's corpus module and not re-derived**:
 * it is the same eleven boards §1 measured, so a figure here and a figure there are about one tree.
 *
 * **`validateCircuit` IS NOT APPLIED, deliberately.** Six of the eleven boards refuse there on net
 * names, and their blocks still reach the ELK pre-pass today - `tools/schgen/masked-problems.ts` is
 * what measures them. Filtering them out would be a different population wearing this one's number,
 * which is the mistake Task 1 Step 4 recorded having made once already.
 */
export function blockGraphs(repoRoot: string): readonly BlockGraph[] {
  const out: BlockGraph[] = []
  for (const { board, declaration } of declaredBoards(repoRoot)) {
    const symbols = caseResolver([declaration])
    const circuit = buildCircuit(circuitSpecFrom(declaration.network, declaration.authoring, symbols), { symbols })
    for (const block of circuit.blocks.values()) {
      if (block.rendering.kind === "bus") continue
      const g = subgraphOf(circuit, block.id, symbols)
      if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
      const input = elkInputOf(g)
      const labels = new Map<string, LabelText>()
      for (const u of g.units) {
        const text = u.part.value
        labels.set(`${u.part.label}:${u.unit}`, { text, width: textWidth(text) })
      }
      for (const net of [...g.rails, ...g.external]) labels.set(`port:${net}`, { text: net, width: textWidth(net) })
      for (const e of input.graph.edges ?? []) labels.set(e.id, { text: e.id.replace(/:\d+$/, ""), width: textWidth(e.id.replace(/:\d+$/, "")) })
      for (const node of input.graph.children ?? []) {
        for (const p of node.ports ?? []) {
          const pin = p.id.split("#")[1] ?? p.id
          labels.set(p.id, { text: pin, width: textWidth(pin) })
        }
      }
      out.push({ board, block: block.id, graph: input.graph, labels })
    }
  }
  return out
}

/** The ELK label for one element of one block, at `height`, optionally seeded with `SENTINEL`. */
export function labelFor(id: string, b: BlockGraph, height: Um, seed: boolean): ElkLabel {
  const t = b.labels.get(id)
  if (t === undefined) {
    throw new Error(
      `tools/schgen/elk-labels has no text for ELK element "${id}" of ${b.board}/${b.block}. Every ` +
        "node, port and edge of the graph is labelled from the circuit - a unit with its Value, a " +
        "boundary node and an edge with the net name, a port with its pin number. A missing entry " +
        "means blockGraphs and the arm disagree about the graph, and labelling the element with a " +
        "placeholder would measure a string this repository never draws.",
    )
  }
  const l: ElkLabel = { id: `${id}#label`, text: t.text, width: t.width, height }
  return seed ? { ...l, x: SENTINEL, y: SENTINEL } : l
}
