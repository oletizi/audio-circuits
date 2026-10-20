/**
 * THE SHEET-PACKING PRE-PASS: `elkjs` DRIVEN OVER ONE SHEET's FRAMES, AND THE ONE PLACE THE
 * SELECTION RULE IS STATED.
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan.
 *
 * **WHY A PRE-PASS, AND WHY IT IS THE SAME SHAPE AS THE BLOCK ONE** - plan decision **D2**, whose
 * premise `layout.ts` verified and which holds: `elkjs` has **no synchronous layout entry point**,
 * and `layoutSheet` is synchronous. So the packing runs once, here, before `layoutSheet` is called,
 * and `layoutSheet` is handed the `SheetPacking` it produced. The alternative - making `layoutSheet`
 * asynchronous - would change every ported caller of it for one packer's benefit, which is exactly
 * the trade `tools/schgen/elk/layout.ts` already refused for `Template.realise`.
 *
 * **THE SELECTION RULE, STATED ONCE** (Task 15 brief): **ELK packs when every frame's size is known
 * and the sheet graph has at least one inter-frame edge; the shelf packer is used otherwise.** It
 * is not a fallback and the distinction matters - a sheet with no inter-frame edges has no graph
 * for a layered algorithm to lay out, which is a property of the input and not a failure of the
 * engine. Both packers return the same `SheetPacking`, so a refusal reads the same either way.
 *
 * **"EVERY FRAME's SIZE IS KNOWN" IS NOT A CONDITION THAT CAN FAIL HERE, AND SAYING SO IS BETTER
 * THAN PRETENDING IT GUARDS SOMETHING.** `frameSize` is a total function of a `FrameContent`
 * (`lib/schgen/render/frames.ts`) and throws rather than returning a hole, so by the time a content
 * list exists every size is known. The condition is in the brief because at sheet scale a frame
 * whose content had not been realised would have no size; in this generator `blockContent` has
 * already realised every block before a `FrameContent` exists. The edge count is therefore the only
 * live half of the rule, and `sheetPackerFor` reports which half decided.
 *
 * **IT LIVES IN `tools/` BECAUSE IT SPAWNS A WORKER**, and the pure graph lives in
 * `lib/schgen/elk/sheet-graph.ts`: the plan's global constraints say `lib/schgen/` *"spawns
 * nothing"*, the same seam `graph.ts` and `layout.ts` already draw.
 */

import ELK from "elkjs/lib/elk-api.js"
import {
  interFrameEdgeCount, readSheetPacking, sheetGraphOf, shelfPacking, type SheetPacking,
} from "../../../lib/schgen/elk/sheet-graph.ts"
import { PAPER, sheetContents } from "../../../lib/schgen/render/sheets.ts"
import type { FrameContent } from "../../../lib/schgen/render/frames.ts"
import type { Size } from "../../../lib/schgen/render/pack.ts"
import type { Backend } from "../../../lib/schgen/render/block-types.ts"
import type { Circuit, SheetId } from "../../../lib/schgen/ir/types.ts"
import type { SymbolResolver } from "../../../lib/schgen/render/library.ts"
import type { ELK as ElkApi } from "elkjs/lib/elk-api.js"

/**
 * One `ELK`, built through the `workerUrl` + `workerFactory` path.
 *
 * **IT IS A SECOND COPY OF `layout.ts`'s `elkFactory` AND THAT IS DELIBERATE, WITH A COST.** The
 * reason the documented node entry point cannot be used under Bun is `docs/known-gaps.md` **G183**
 * and it is stated in full in `layout.ts`'s module comment. Importing that module's private factory
 * would mean exporting it, and the two drivers have different lifetimes - the block pre-pass builds
 * one worker for every block of a circuit, this one builds one for every sheet - so a shared
 * instance would have to be passed through both call paths. **What the duplication costs is a
 * second place to change if the construction path ever does**, and it is recorded in
 * `docs/known-gaps.md` rather than left for a reader to notice.
 */
function elkFactory(): ElkApi {
  const workerUrl = import.meta.resolve("elkjs/lib/elk-worker.min.js")
  return new ELK({ workerUrl, workerFactory: (url?: string) => new Worker(url ?? workerUrl) })
}

/** Which packer the rule above selects for one sheet, and which clause decided it. */
export interface SheetPackerChoice {
  readonly by: "shelf" | "elk"
  readonly why: string
  readonly interFrameEdges: number
}

export function sheetPackerFor(contents: readonly FrameContent[], paper: Size): SheetPackerChoice {
  const edges = interFrameEdgeCount(sheetGraphOf(contents, paper))
  if (edges === 0) {
    return {
      by: "shelf",
      why: "the sheet graph has no inter-frame edge, so a layered algorithm has nothing to lay out",
      interFrameEdges: 0,
    }
  }
  return { by: "elk", why: `the sheet graph has ${edges} inter-frame edge(s)`, interFrameEdges: edges }
}

/**
 * One sheet's frames packed by `elkjs`, as a `SheetPacking`.
 *
 * It builds and terminates its own worker. A raise is NOT turned into a shelf packing: that would
 * be the fallback spec §1.3 and `docs/known-gaps.md` **G84** forbid - *"the sheet comes out looking
 * fine, the gate passes, and the thing that could not be composed is never reported"* - so the
 * rejection propagates with the sheet graph's own bytes named.
 */
export async function packFramesWithElk(contents: readonly FrameContent[], paper: Size): Promise<SheetPacking> {
  const graph = sheetGraphOf(contents, paper)
  const elk = elkFactory()
  try {
    return readSheetPacking(await elk.layout(graph), contents, paper)
  } finally {
    elk.terminateWorker()
  }
}

/**
 * The selection rule applied: the ELK packing when the rule selects it, the shelf packing
 * otherwise. **This is the only function a caller should need.**
 */
export async function packSheet(contents: readonly FrameContent[], paper: Size): Promise<SheetPacking> {
  const choice = sheetPackerFor(contents, paper)
  return choice.by === "elk" ? packFramesWithElk(contents, paper) : shelfPacking(contents, paper)
}

/**
 * THE PRE-PASS OVER A WHOLE CIRCUIT: every sheet's frames packed once, before `layoutSheet` runs.
 *
 * It builds each sheet's `FrameContent[]` the same way `layoutSheet` does and by the same call -
 * `sheetContents` in `lib/schgen/render/sheets.ts` - so the contents this packs are the contents
 * that get placed. **That identity is asserted rather than assumed**: `layoutSheet` refuses when the
 * packing it is handed has a different number of positions than it has frames (`arrange`'s *"packer
 * placed n of m frames"*), which is the same shape of guard `elkBackendFrom` puts on the block
 * pre-pass.
 *
 * **A SHEET WHOSE PACKING REFUSES IS STILL RETURNED, with its refusal.** `layoutSheet` is what
 * turns a refusal into the message naming the paper to enlarge, and it must keep doing so: dropping
 * the entry here would make the sheet silently fall back to the shelf packer, which is the
 * substitution spec §1.3 forbids.
 */
export async function sheetPackPrePass(
  c: Circuit,
  symbols: SymbolResolver,
  flagLibId: string,
  elk: Backend | null,
): Promise<ReadonlyMap<SheetId, SheetPacking>> {
  const out = new Map<SheetId, SheetPacking>()
  for (const sheet of c.sheets) {
    const contents = sheetContents(c, sheet.id, symbols, flagLibId, elk)
    out.set(sheet.id, await packSheet(contents, PAPER[sheet.paper]))
  }
  return out
}
