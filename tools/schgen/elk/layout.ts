/**
 * THE ASYNCHRONOUS ELK PRE-PASS, AND THE SYNCHRONOUS `Backend` THAT READS ITS RESULT.
 *
 * Hand-written for Task 12 of the M1 schematic-authoring plan.
 *
 * **WHY A PRE-PASS AND NOT A LAZY CALL** - plan decision **D2**, whose premise Task 12 Step 1
 * verified and which HOLDS: `elkjs@0.9.3` exposes `layout`, `knownLayoutAlgorithms`,
 * `knownLayoutOptions`, `knownLayoutCategories` and `terminateWorker`, and every one but the last
 * returns a `Promise`. There is **no synchronous layout entry point**, so no deviation from D2 to
 * record. `Template.realise(g): RealiseResult` is synchronous and `connector-fanout` depends on
 * that (it calls `checkLayout` inside `realise` and tries four rotations), so making `realise`
 * async would change seven templates and every caller for one backend's benefit. Instead
 * `layoutBlocks` runs once, and `elkBackendFrom` hands `realiseBlock` a synchronous `Backend` that
 * looks its block up.
 *
 * **WHY THIS LIVES IN `tools/` AND THE GRAPH LIVES IN `lib/`.** The plan's global constraints say
 * `lib/schgen/` *"spawns nothing"*. Driving `elkjs` spawns a worker (see `elkFactory` below), so
 * the driver is here and `lib/schgen/elk/` holds only the pure graph, its options and its
 * serialization - the same seam `tools/schgen/kicad-run.ts` already draws around `kicad-cli`.
 *
 * **HOW `elkjs` IS CONSTRUCTED, and it is NOT the documented node entry point.** `require("elkjs")`
 * cannot build an `ELK` under Bun: `lib/main.js` asks `lib/elk-worker.min.js` for its `FakeWorker`,
 * and that file chooses between installing itself as a web worker and exporting the class by
 * testing `typeof document === "undefined" && typeof self !== "undefined"` - **both true under
 * Bun**, which defines a global `self`. So the first branch wins, nothing is exported, and
 * `new _Worker(url)` throws `undefined is not a constructor`. The branch is byte-identical in
 * 0.9.3, 0.10.0, 0.11.0 and 0.12.0. What is used instead is `elkjs`'s own documented
 * `workerUrl` + `workerFactory` path with Bun's native `Worker`, under which the worker's `self`
 * IS a worker scope and that first branch is the correct one. `docs/known-gaps.md` **G183**.
 */

import ELK from "elkjs/lib/elk-api.js"
import { backendRaised, describeMismatch } from "../../../lib/schgen/render/block-types.ts"
import { selectRenderer, subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../../lib/schgen/render/templates/index.ts"
import { elkInputOf, type ElkBlockInput, type ElkOutcome } from "../../../lib/schgen/elk/graph.ts"
import { adaptElkLayout } from "../../../lib/schgen/elk/adapt.ts"
import { diagnoseRaise, ELK_BACKEND, renderDiagnosis } from "./diagnose.ts"
import type { ELK as ElkApi, ElkNode } from "elkjs/lib/elk-api.js"
import type { Backend, Mismatch, RealiseResult, BlockSubgraph } from "../../../lib/schgen/render/block-types.ts"
import type { BlockId, Circuit } from "../../../lib/schgen/ir/types.ts"
import type { SymbolResolver } from "../../../lib/schgen/render/library.ts"

/**
 * Re-exported, not declared: `ELK_BACKEND` moved to `tools/schgen/elk/diagnose.ts` in Task 14,
 * because a `RaiseDiagnosis` needs the same pinned backend name a `Mismatch` does and the
 * alternative was a second string to keep in step with `package.json`'s pin. Every existing
 * importer (`tests/schgen/elk/layout.elk.test.ts`, `tools/schgen/generate.ts`) names this module,
 * not `diagnose.ts`, so the re-export is what keeps them unaffected. See `diagnose.ts` for why it
 * names the version: **G94** is a defect at a pinned version and a refusal that said only "elkjs"
 * could not be compared against what that entry measured.
 */
export { ELK_BACKEND }

/**
 * Re-exported, not declared: the type moved to `lib/schgen/elk/graph.ts` beside `ElkBlockInput` in
 * Task 13, so that `lib/schgen/elk/adapt.ts` can name it without `lib` depending on `tools`. One
 * declaration, and every importer of this module is unaffected.
 */
export type { ElkOutcome } from "../../../lib/schgen/elk/graph.ts"

/** The rejection's own sentence, whatever `elkjs` rejected with. */
function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "object" && e !== null && "message" in e) {
    const m: unknown = Reflect.get(e, "message")
    if (typeof m === "string") return m
  }
  return String(e)
}

/**
 * The `Mismatch` for a backend that raised, through the one constructor that makes one.
 *
 * `backendRaised` returns a `RealiseResult` and this layer needs the `Mismatch` inside it. The
 * alternative was to build the object here, which would be a second copy of a classification
 * `docs/known-gaps.md` **G84** is specifically about getting right - *"a throw is NEVER
 * not-applicable"* - and `CLAUDE.md`'s *supersede means delete* applies to a pattern as much as to
 * a stub. So the constructor is called and its arm is unwrapped.
 */
function raised(inputKey: string, reason: string): Mismatch {
  const r = backendRaised(ELK_BACKEND, inputKey, reason)
  if (r.ok) {
    throw new Error(
      "backendRaised returned ok: true. Its only arm is ok: false (see " +
        "lib/schgen/render/block-types.ts), so this is a defect in that constructor rather than " +
        "something tools/schgen/elk/layout.ts can recover from.",
    )
  }
  return r.mismatch
}

/**
 * One `ELK`, built through the `workerUrl` + `workerFactory` path for the reason in the module
 * comment. The URL is RESOLVED and never a literal: owner ruling **G169** says no path may be
 * unique to one machine.
 */
function elkFactory(): ElkApi {
  const workerUrl = import.meta.resolve("elkjs/lib/elk-worker.min.js")
  return new ELK({ workerUrl, workerFactory: (url?: string) => new Worker(url ?? workerUrl) })
}

/**
 * Every input laid out, and a raise turned into a VALUE.
 *
 * **This task's whole obligation on the raise is that it is a value and not an escaped
 * exception**; what the caller does with it is Task 14's, which adds the diagnosis **G94** says a
 * refusal must carry. A throw becomes `backend-raised` and **never `not-applicable`** - G84's
 * rule, and the reason `selectRenderer` can never route a crash to ELK a second time.
 *
 * An empty input list constructs no `ELK` and spawns no worker: there is nothing to lay out, and
 * every design ported from `digital-pedal-platform` reaches here with nothing, because its blocks
 * are `wired` or `bus`.
 */
export async function layoutBlocks(inputs: readonly ElkBlockInput[]): Promise<ReadonlyMap<BlockId, ElkOutcome>> {
  const out = new Map<BlockId, ElkOutcome>()
  if (inputs.length === 0) return out
  const elk = elkFactory()
  try {
    for (const input of inputs) {
      if (out.has(input.blockId)) {
        throw new Error(
          `layoutBlocks was handed two inputs for block ${input.blockId}. One block has one layout ` +
            "input, because the generation manifest keys a drawing by the block's serialized " +
            "input; it refuses rather than keeping the last, which would silently pick one of two " +
            "drawings.",
        )
      }
      try {
        const graph = await elk.layout(input.graph)
        out.set(input.blockId, { ok: true, blockId: input.blockId, serialized: input.serialized, graph })
      } catch (e) {
        out.set(input.blockId, {
          ok: false,
          blockId: input.blockId,
          serialized: input.serialized,
          mismatch: raised(input.serialized, `${ELK_BACKEND} raised laying out block ${input.blockId}: ${messageOf(e)}`),
        })
      }
    }
  } finally {
    elk.terminateWorker()
  }
  return out
}

/**
 * The synchronous `Backend` `realiseBlock` takes, reading the pre-pass by block id.
 *
 * **Three outcomes, and two of them are refusals with nothing defaulted** (`docs/known-gaps.md`
 * **G84**, **G146**):
 *
 * - **absent** - the pre-pass never ran for this block. That is a wiring defect in the caller, so
 *   it throws naming the block and the pre-pass rather than laying it out lazily, which would make
 *   `realise` asynchronous and defeat **D2**;
 * - **raised** - returned as the `backend-raised` mismatch it is, for `realiseBlock` to refuse on -
 *   **and ENRICHED first, since Task 14, with the diagnosis `tools/schgen/elk/diagnose.ts` builds
 *   from `g`.** The pre-pass's own stored outcome keeps its short `reason` untouched (so
 *   `tests/schgen/elk/layout.elk.test.ts`'s pinned assertions over `layoutBlocks`'s raw output stay
 *   exactly as they were); it is only the `Mismatch` this backend hands to `realiseBlock` - the one
 *   a generation run actually throws - that carries the full `renderDiagnosis` text, because this
 *   is the one place that holds both the raise AND the `BlockSubgraph` `diagnoseRaise` needs for
 *   its self-loop reading;
 * - **laid out** - handed to `adaptElkLayout` (`lib/schgen/elk/adapt.ts`), which is spec §1.4's
 *   realization contract: the canonical topology, the grid snapping, the junction comparison and
 *   the clearance check, in that order, with a classified `Mismatch` for each way it refuses.
 *
 * **THIS ARM THREW UNTIL TASK 13 ROUND 6, AND THE REFUSAL IT THREW WAS FALSE.** It said
 * `adaptElkLayout` *"does not exist yet"* - and it had existed, exported, with exactly
 * `Backend.realise`'s signature, since round 1. The consequence was not cosmetic: `generate` takes
 * this backend, so **no ELK block could be emitted by the real pipeline at all**, and
 * `tests/schgen/elk/layout.elk.test.ts` asserted the throw, so the suite held the false statement
 * in place. That is `CLAUDE.md`'s *supersede means delete* and *refusals teach* both inverted - a
 * refusal that names a missing module which is not missing teaches a reader something untrue.
 */
export function elkBackendFrom(outcomes: ReadonlyMap<BlockId, ElkOutcome>): Backend {
  return {
    realise(g: BlockSubgraph): RealiseResult {
      const outcome = outcomes.get(g.block.id)
      if (outcome === undefined) {
        throw new Error(
          `block ${g.block.id} reached the ELK backend and the pre-pass holds no outcome for it ` +
            `(it holds ${outcomes.size === 0 ? "none" : [...outcomes.keys()].join(", ")}). ` +
            "layoutBlocks must be given an elkInputOf(...) for every block selectRenderer sends to " +
            "ELK, before layoutSheet runs - see elkPrePass in tools/schgen/elk/layout.ts. It is " +
            "not laid out here, because elkjs has no synchronous entry point (decision D2) and a " +
            "Backend.realise that returned a promise would change every template.",
        )
      }
      if (!outcome.ok) return { ok: false, mismatch: enrichedRaise(g, outcome.mismatch) }
      return adaptElkLayout(g, outcome)
    },
  }
}

/**
 * The pre-pass's stored `backend-raised` mismatch, with its `reason` replaced by the full
 * diagnosis: the same backend and bytes it already carried, plus the self-loop reading
 * `diagnoseRaise` computes from `g` - which the pre-pass, holding only the serialized bytes and no
 * `BlockSubgraph`, could never have attached itself (Task 14, ruling R30).
 *
 * **WHY A FRESH `elkInputOf(g)` AND NOT THE PRE-PASS'S OWN INPUT.** The pre-pass discards the
 * `ElkBlockInput` it built once `layoutBlocks` has run - only `ElkOutcome` survives, and its false
 * arm carries `serialized` but no `graph`. Recomputing is not a guess: `elkInputOf` is a pure
 * function of `g` alone (**G95**: *"determinism for a FIXED input holds"*), and `realiseBlock`
 * calls this backend with the identical `g` `elkPrePass` built the stored outcome from - the same
 * `Circuit` and `SymbolResolver`, by construction of `tools/schgen/generate.ts`'s one call to each.
 * The guard below is what makes that an asserted invariant rather than an assumption: a caller that
 * ever handed this backend a DIFFERENT block's subgraph than the one that raised would get a
 * diagnosis whose self-loops belong to one block and whose bytes belong to another - precisely what
 * `docs/known-gaps.md` **G95** says a serialized key must never let happen - so it refuses instead.
 *
 * **ONLY `backend-raised` IS ENRICHED, AND THE CHECK IS A REAL GUARD, NOT A FORMALITY.** `layoutBlocks`'s
 * one producer of a false `ElkOutcome` is `raised()`, which always constructs `backend-raised` -
 * but `Mismatch` is a four-variant union at the type level, so nothing STATICALLY rules out a
 * future second producer returning a different kind. If one ever does, this throws rather than
 * silently re-labelling a different kind of refusal as a raise.
 */
function enrichedRaise(g: BlockSubgraph, mismatch: Mismatch): Mismatch {
  if (mismatch.kind !== "backend-raised") {
    throw new Error(
      `elkBackendFrom: block ${g.block.id}'s pre-pass outcome is a false ElkOutcome carrying a ` +
        `"${mismatch.kind}" mismatch, not "backend-raised". layoutBlocks's only producer of a ` +
        "false ElkOutcome (raised(), in this file) always returns backend-raised; a different " +
        "kind here means something else is now constructing ElkOutcome and this diagnosis wiring " +
        "was not updated for it.",
    )
  }
  const input = elkInputOf(g)
  if (input.serialized !== mismatch.inputKey) {
    throw new Error(
      `elkBackendFrom: block ${g.block.id} raised on bytes different from the ones elkInputOf(g) ` +
        "produces for the SAME g right now. The pre-pass and this backend must be given the " +
        "identical BlockSubgraph for the identical block (tools/schgen/generate.ts's one Circuit " +
        "and one SymbolResolver, shared between elkPrePass and layoutSheet) - a mismatch here means " +
        "that invariant broke, and attaching a self-loop reading to the wrong graph's bytes is " +
        "exactly the failure docs/known-gaps.md G95 exists to prevent, so this refuses rather than " +
        "diagnosing the wrong graph.",
    )
  }
  const diagnosis = diagnoseRaise(g, input, new Error(mismatch.reason))
  return { ...mismatch, reason: renderDiagnosis(diagnosis) }
}

/**
 * The pre-pass over a whole circuit: lay out every block `selectRenderer` sends to ELK.
 *
 * **`bus` blocks are skipped before `selectRenderer` sees them**, because `candidatesFor` throws
 * on one by design (`lib/schgen/render/blocks.ts`): a bus block's connectivity is drawn by the bus
 * renderer, and offering it to the template set would send it to ELK as *"a wrong drawing, chosen
 * by accident"*.
 *
 * **IT NO LONGER TAKES A `SchematicAuthoring`, AND THAT CLOSES `docs/known-gaps.md` G186** -
 * ruling **R29**. Round 1 of this comment said `elkInputOf` needs *"one thing, not two"* from the
 * declaration: `negotiablePort` reads `portDirections` **and** `rails`, and the rails half was
 * already in the IR as `BlockSubgraph.railSpecs`. R29 put the other half in the IR as well -
 * `CircuitSpec.portDirections`, carried onto `Circuit` and then onto `BlockSubgraph` - so
 * `elkInputOf(g)` is served entirely by its declared input and **nothing beside a design has to be
 * handed to `generate` for a block to reach ELK**, which is G186's criterion verbatim.
 *
 * **WHAT WENT WITH IT: the `authoring === null` refusal, which is now unreachable rather than
 * weakened.** It fired when a block selected ELK and no declaration had been passed. There is no
 * such state any more: `CircuitSpec.portDirections` is a required field, so a `Circuit` always
 * carries one. A net that crosses a BLOCK boundary without being a declared port of the network
 * still has no entry, and `negotiablePort` states that case in its own `why` - **G99**'s measured
 * residue, open before this change and open after it, and not something this refusal was ever
 * guarding.
 */
export async function elkPrePass(c: Circuit, symbols: SymbolResolver): Promise<ReadonlyMap<BlockId, ElkOutcome>> {
  const inputs: ElkBlockInput[] = []
  for (const block of c.blocks.values()) {
    if (block.rendering.kind === "bus") continue
    const g = subgraphOf(c, block.id, symbols)
    if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
    inputs.push(elkInputOf(g))
  }
  return layoutBlocks(inputs)
}

/** One line per block the pre-pass refused, for a report that says what ELK could not draw. */
export function raiseLines(outcomes: ReadonlyMap<BlockId, ElkOutcome>): readonly string[] {
  return [...outcomes.values()].flatMap((o) => (o.ok ? [] : [`${o.blockId}: ${describeMismatch(o.mismatch)}`]))
}
