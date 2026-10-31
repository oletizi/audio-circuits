/**
 * THE TWO SUBJECTS SEAM B CAN BE MEASURED ON, ASSEMBLED ONCE.
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan.
 *
 * **WHY THESE TWO AND NOT THE FOUR PARITY CIRCUITS' OWN SHEETS - IT WAS A FINDING AND IT IS NOW
 * HALF SUPERSEDED.** This header said: each of the four circuits declares exactly ONE sheet, on
 * every one of them at least one block refuses to draw (`docs/known-gaps.md` **G200**: only 5 of 12
 * blocks draw, all five `transistor-preamp` legs), `sheetContents` realises every block of a sheet,
 * so *"not one of the four circuits has a sheet that can be composed at all."*
 *
 * **BOTH FIGURES AND THE CONCLUSION HAVE MOVED** (**G291**, 2026-10-25). **Ten of the twelve
 * blocks draw**, **all seven of `transistor-preamp`'s draw**, and **its `lab` sheet lays out on its
 * declared A3** - 7 frames, 142 wires, no non-member containment, asserted in
 * `tests/schgen/remeasure.test.ts`. So one of the four circuits DOES have a sheet that composes.
 * The two subjects below are kept anyway, and for stated reasons rather than by inertia:
 *
 * - **`miniSheet`** - the ported pedals `mini` fixture, whose ten blocks are all drawn by reviewed
 *   templates across two sheets. **Its arrangement is one this repository did not choose**, which
 *   is why `docs/known-gaps.md` **G165** used it and is a property no circuit of ours can supply.
 * - **`drawnBlocks`** - the `transistor-preamp` blocks the ELK backend draws, put on one A3.
 *   **This is a probe and NOT that circuit's schematic**: the paper is this fixture's choice, not
 *   the sheet's declaration. It used to be a probe for a second reason - the circuit declared five
 *   drawing blocks beside two that refused - and that reason is gone; `refused` is empty and tests
 *   that care assert it is.
 *
 * **THE INTERFACE DECLARATIONS.** `drawnLegs` uses the circuit's own, from its authoring file
 * (`interfacesOf`). `miniSheet` has none to use - `mini` is a `DesignSpec` and carries no
 * `SchematicAuthoring` - so this fixture declares one **by calling `negotiablePort`**, which is
 * exactly what that function's own doc comment says it is for: *"a sentence the four authoring files
 * declare by CALLING it"*. It is the fixture declaring its interface, not the generator inferring
 * one, and the distinction is the whole of spec §1.9's *"never inferred from which nets happen to
 * leave"*.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { design as miniDesign } from "./designs/mini/index.ts"
import { negotiablePort, type InterfacePort } from "../../../lib/schgen/authoring.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { annotate, EMPTY_LOCK } from "../../../lib/schgen/lock/annotate.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { withReferences } from "../../../lib/schgen/render/drawn-text.ts"
import { blockContent, type FrameContent } from "../../../lib/schgen/render/frames.ts"
import { interfacesOf } from "../../../lib/schgen/render/compose.ts"
import { stockSymbolDir, type SymbolResolver } from "../../../lib/schgen/render/library.ts"
import { PAPER, sheetContents } from "../../../lib/schgen/render/sheets.ts"
import { designResolver, FLAG_LIB_ID } from "../../../tools/schgen/generate.ts"
import { elkBackendFrom, elkPrePass } from "../../../tools/schgen/elk/layout.ts"
import { PARITY_CASES, parityResolver } from "../../../tools/schgen/authoring-census.ts"
import type { Backend } from "../../../lib/schgen/render/block-types.ts"
import type { BlockId, Circuit, SheetId } from "../../../lib/schgen/ir/types.ts"
import type { Size } from "../../../lib/schgen/render/pack.ts"
import type { LoadedDesign } from "../../../lib/schgen/design.ts"

export interface ComposedSubject {
  readonly circuit: Circuit
  readonly symbols: SymbolResolver
  readonly contents: readonly FrameContent[]
  readonly paper: Size
  readonly interfaces: ReadonlyMap<BlockId, readonly InterfacePort[]>
  readonly elk: Backend
  /** The sheet these contents belong to, or null for a probe that is not a declared sheet. */
  readonly sheetId: SheetId | null
}

/** The `mini` design as a `LoadedDesign` whose `outDir` is never written to by these fixtures. */
function miniLoaded(): LoadedDesign {
  const dir = path.dirname(fileURLToPath(import.meta.resolve("./designs/mini/index.ts")))
  return { file: path.join(dir, "index.ts"), dir, spec: miniDesign, outDir: path.join(dir, "out") }
}

/**
 * THE ONE PORT THIS FIXTURE DECLARES BY HAND, AND WHY THE TEMPLATE WINS.
 *
 * `negotiablePort`'s rule puts a supply rail at the top of a block, citing `RailSpec`'s own doc
 * comment. `mini`'s `FLASH` block is drawn by the **bus renderer**, which fans the flash's pins out
 * to the LEFT - including both `3V3` straps on `~{WP}` and `~{HOLD}` - and brings the `VCC` pin's
 * `3V3` out at the top. So two of its three `3V3` anchors are on the left edge and the helper's
 * rule refuses them.
 *
 * **The reviewed arrangement wins, and that is the spec's own order rather than a preference.**
 * Spec §3.1 makes the reviewed human arrangement the thing a backend is measured against, §1.5
 * step 1 is *"an explicit orientation in a reviewed template wins"*, and **`negotiablePort`'s own
 * `why` scopes its rule to a block *"that declares no template"*** - which this block is not. So
 * the declaration names the sides the symbol's own pin geometry puts the net on. **No template is
 * edited, no pinned geometry test moves, and no spec amendment is needed.**
 *
 * It is a LITERAL and not a second rule: `negotiablePort`'s doc comment says *"any file is free to
 * write an `InterfacePort` literally instead, and a port with something particular to say should"*.
 */
const FLASH_3V3: InterfacePort = {
  net: "3V3",
  sides: ["left", "top"],
  position: "negotiable",
  why:
    "FLASH is drawn by the bus renderer, which fans Memory_Flash:W25X40CLSS's pins out on the " +
    "side the symbol's own (at x y angle) puts them: ~{WP} (pin 3) and ~{HOLD} (pin 7) are " +
    "left-hand pins and VCC (pin 8) is a top pin, so this rail reaches the block's boundary on " +
    "both edges. RailSpec's \"supplies at the top\" is negotiablePort's rule for a block that " +
    "declares no template, and this block's arrangement is a reviewed one (spec §3.1, §1.5 step 1).",
}

/** Every block's interface, declared by calling `negotiablePort` - see this module's header. */
function declaredByHelper(circuit: Circuit, symbols: SymbolResolver): ReadonlyMap<BlockId, readonly InterfacePort[]> {
  const out = new Map<BlockId, readonly InterfacePort[]>()
  for (const block of circuit.blocks.values()) {
    const g = subgraphOf(circuit, block.id, symbols)
    const context = { portDirections: circuit.portDirections, rails: [...g.railSpecs.values()] }
    out.set(block.id, [...g.rails, ...g.external].map((net) =>
      block.id === "FLASH" && net === "3V3" ? FLASH_3V3 : negotiablePort(net, context)))
  }
  return out
}

export async function miniSheet(sheetId: SheetId): Promise<ComposedSubject> {
  const loaded = miniLoaded()
  const symbols = designResolver(loaded, stockSymbolDir())
  const built = buildCircuit(miniDesign.circuit, { symbols })
  const circuit = withReferences(built, annotate(built, EMPTY_LOCK, new Map()).refs)
  const elk = elkBackendFrom(await elkPrePass(circuit, symbols))
  const sheet = circuit.sheets.find((s) => s.id === sheetId)
  if (sheet === undefined) throw new Error(`the mini design has no sheet ${sheetId}`)
  return {
    circuit, symbols, elk, sheetId,
    contents: sheetContents(circuit, sheetId, symbols, FLAG_LIB_ID, elk),
    paper: PAPER[sheet.paper],
    interfaces: declaredByHelper(circuit, symbols),
  }
}

/** The blocks of a parity circuit that draw, and the ones that refuse, with their reasons. */
export interface DrawnBlocks extends ComposedSubject {
  readonly drew: readonly BlockId[]
  readonly refused: readonly { readonly id: BlockId; readonly reason: string }[]
}

/**
 * One parity circuit's drawing blocks on one A3, as a probe.
 *
 * **NOT THAT CIRCUIT'S SCHEMATIC** - see this module's header. A3 because it is the larger of the
 * two papers `mini` declares and the probe needs the frames to fit; the paper is an input to the
 * packing comparison, not a result of it.
 */
export async function drawnBlocks(name: string): Promise<DrawnBlocks> {
  const found = PARITY_CASES.find((c) => c.name === name)
  if (found === undefined) {
    throw new Error(`no parity circuit is called ${name} (they are ${PARITY_CASES.map((c) => c.name).join(", ")})`)
  }
  const symbols = parityResolver()
  const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
  const elk = elkBackendFrom(await elkPrePass(circuit, symbols))
  const contents: FrameContent[] = []
  const drew: BlockId[] = []
  const refused: { id: BlockId; reason: string }[] = []
  for (const block of circuit.blocks.values()) {
    try {
      contents.push(blockContent(circuit, block.id, symbols, elk))
      drew.push(block.id)
    } catch (e) {
      // A BLOCK THAT DOES NOT DRAW IS RECORDED, NEVER DROPPED SILENTLY: docs/known-gaps.md G200
      // and G291 count them, and a probe that quietly shrank would make that count unverifiable
      // here. It matters MORE now that `refused` can be empty: an empty list has to mean "nothing
      // refused" and never "nothing was looked at".
      refused.push({ id: block.id, reason: e instanceof Error ? e.message : String(e) })
    }
  }
  return {
    circuit, symbols, elk, contents, drew, refused,
    paper: PAPER["A3"],
    interfaces: interfacesOf(found.authoring),
    sheetId: null,
  }
}
