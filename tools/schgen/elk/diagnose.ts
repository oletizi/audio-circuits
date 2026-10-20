/**
 * A RAISE AS A DIAGNOSABLE VALUE - the exact bytes that produced it, printed alongside what the
 * backend said and the one shape `docs/known-gaps.md` **G94** measured as necessary for it.
 *
 * Hand-written for Task 14 of the M1 schematic-authoring plan, under controller ruling **R30**.
 *
 * **WHAT "DIAGNOSABLE" MEANS HERE, DECIDED, AND WHAT IT COSTS.** The brief leaves the shape open -
 * *"the serialized bytes themselves, a content hash plus a way to recover them, a written
 * artefact"* - and the decision is: **print the exact bytes verbatim, in the refusal, every
 * time.** Three reasons, and the third is the one that is not optional:
 *
 * 1. **The bytes already exist on the value, for free.** `lib/schgen/elk/graph.ts`'s `elkInputOf`
 *    computes `serialized` once; `tools/schgen/elk/layout.ts`'s `raised()` already carries it as
 *    `Mismatch.backend-raised.inputKey`. Printing it costs one more line in a message; a hash
 *    costs nothing MORE than that either, until the hash needs to be looked up against something,
 *    which is where the real cost of the alternative lives.
 * 2. **A hash needs a recovery path, and this repository has none to point it at.** "A content
 *    hash plus a way to recover them" means a second artefact - a file written to disk, keyed by
 *    the hash - that does not exist today and that this task has no reason, measured, to build:
 *    `docs/known-gaps.md` **G185**'s twenty-arm sweep found **zero raises** on every block this
 *    repository's own driver produces, so the artefact would exist to serve a case nobody has
 *    observed. Building untried machinery for an unobserved case is exactly what `CLAUDE.md`'s
 *    criterion-versus-mechanism rule warns against: a mechanism is advice from someone who has not
 *    yet tried it, and "write a side-file nobody has needed yet" is advice this entry declines to
 *    take on no evidence.
 * 3. **`docs/known-gaps.md` G95 is the reason a hash is actively the WORSE choice, not merely the
 *    costlier one.** *"the serialization is deterministic; the circuit is not"* - the bytes
 *    already ARE the manifest's key, with no collision possible between two different graphs and
 *    no instability for one fixed graph. A hash of those bytes can only ever be a second identity
 *    for the same thing, and a second identity is a second place a bug can make two different
 *    graphs agree (truncation, a weak hash, a copy-paste of the wrong line) or one graph disagree
 *    with itself across two prints. Printing the bytes themselves cannot do either: `inputKey`
 *    IS what the diagnosis is checked against, byte for byte, so this entry makes no new
 *    consistency obligation, where a hash would be a second thing to keep correct with the first.
 *
 * **THE COST, STATED RATHER THAN HIDDEN.** The rendered diagnosis is as big as the graph. On the
 * largest declared block this driver has measured (`pt2399-core/pt-core`, **G189**: 151 wires
 * after canonicalisation, 24 parts), the serialized input runs to several kilobytes, and that
 * whole string lands in a thrown `Error`'s message and in a render report's text. That is accepted
 * because a raise is, by every measurement this repository has (**G185**, this entry's own
 * record below), **not a path any real block takes today** - so the cost is paid on an exceptional
 * path, not a hot one, and a long message that lets a person reproduce the raise without re-running
 * anything is worth more than a short one that sends them back to the generator to get the bytes a
 * second time.
 *
 * **WHAT THIS MODULE DOES NOT DO.** It does not retry, it does not tune a layout option to make a
 * raise disappear, and `selfLoops`/`horizontalPassives` below decide nothing - G94's own "DECIDED"
 * section states the four reasons a retry is refused regardless of what this prints.
 */

import { libPinOf } from "../../../lib/schgen/elk/graph.ts"
import { selfLoops, type SelfLoop } from "../../../lib/schgen/elk/self-loop.ts"
import { sideOfPin, type PinSide } from "../../../lib/schgen/rules/pin-sides.ts"
import type { ElkBlockInput } from "../../../lib/schgen/elk/graph.ts"
import type { BlockSubgraph } from "../../../lib/schgen/render/block-types.ts"
import type { BlockId, PartLabel } from "../../../lib/schgen/ir/types.ts"

/**
 * The backend's name, pinned to the exact installed version - moved here from
 * `tools/schgen/elk/layout.ts` in Task 14, re-exported from there so every existing importer is
 * unaffected. **It lives here now because a `RaiseDiagnosis` needs it and nothing else in this
 * pair of modules does**: `layout.ts` only ever used it to build a `Mismatch`, which is exactly
 * what `diagnoseRaise` below does too, so the second use is a reason to move the one declaration
 * rather than a reason to duplicate the string `CLAUDE.md`'s *supersede means delete* already asks
 * not to duplicate.
 */
export const ELK_BACKEND = "elkjs@0.9.3"

/** The rejection's own sentence, whatever it was raised with. */
function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "object" && e !== null && "message" in e) {
    const m: unknown = Reflect.get(e, "message")
    if (typeof m === "string") return m
  }
  return String(e)
}

/**
 * **Cells whose own net reaches two of their own pins: the condition G94 found NECESSARY.**
 * **A written diagnosis of a raise, naming the backend, the exact bytes it was given, and
 * whether the one shape G94 measured as necessary for its crash is present in THIS graph.**
 */
export interface RaiseDiagnosis {
  readonly blockId: BlockId
  readonly backend: string
  readonly message: string
  readonly selfLoops: readonly SelfLoop[]
  readonly horizontalPassives: readonly PartLabel[]
  /** The serialized input, so the raise is reproducible from the report alone. */
  readonly inputKey: string
}

const HORIZONTAL_SIDES: ReadonlySet<PinSide> = new Set(["left", "right"])

/**
 * The parts, in `g.units` order and deduplicated, that are TWO-TERMINAL on this unit and sit on a
 * self-loop net with both of their own connected pins leaving the symbol horizontally.
 *
 * **"PASSIVE" IS STRUCTURAL HERE, NOT A KIND LOOKUP** - the same reason `selfLoops` is structural
 * (`docs/known-gaps.md` **G182**: `IrPart` carries no `ComponentKind`). A unit with exactly two
 * connected pins is what a two-terminal passive looks like from the IR alone, whatever it is
 * actually called; nothing here asserts it IS a resistor or a capacitor, only that it has the
 * shape G94's "lateral" does. "Horizontally" means both of its own pins leave the symbol on the
 * left or right side at the unit's OWN drawn rotation (`u.rot`) - the same `sideOfPin(rot, pin)`
 * `lib/schgen/elk/graph.ts` places every port at, so this reads the identical geometry the graph
 * builder used rather than a second opinion about it.
 */
function horizontalPassivesOn(g: BlockSubgraph, loops: readonly SelfLoop[]): readonly PartLabel[] {
  const loopNets = new Set(loops.map((l) => l.net))
  const out: PartLabel[] = []
  const seen = new Set<PartLabel>()
  for (const u of g.units) {
    const connected = u.pins.filter((p) => p.net !== null)
    if (connected.length !== 2) continue
    const onLoopNet = connected.some((p) => p.net !== null && loopNets.has(p.net))
    if (!onLoopNet) continue
    const sides = connected.map((p) => sideOfPin(u.rot, libPinOf(u, p.pin)))
    if (!sides.every((s) => HORIZONTAL_SIDES.has(s))) continue
    if (seen.has(u.part.label)) continue
    seen.add(u.part.label)
    out.push(u.part.label)
  }
  return out
}

/**
 * The diagnosis for one raise: the exact bytes that produced it, the backend's own sentence, and
 * whether G94's necessary shape is present in the graph that raised.
 *
 * **`g` AND `input` MUST BE THE SAME BLOCK'S OWN SUBGRAPH AND THE INPUT BUILT FROM IT** - the
 * refusal below is a construction error rather than a defect report, because a diagnosis keyed to
 * one block's bytes but printing another block's self-loops would be exactly the failure
 * `docs/known-gaps.md` **G95** states the serialization exists to prevent: two different things
 * sharing one printed identity.
 */
export function diagnoseRaise(g: BlockSubgraph, input: ElkBlockInput, error: unknown): RaiseDiagnosis {
  if (input.blockId !== g.block.id) {
    throw new Error(
      `diagnoseRaise: the subgraph is block ${g.block.id} and the input is block ${input.blockId}. ` +
        "A diagnosis is keyed to one block's own bytes (docs/known-gaps.md G95); pass the subgraph " +
        "and the ElkBlockInput built from it with elkInputOf(g), not two different blocks' - " +
        "otherwise the self-loops printed would belong to a graph other than the one the inputKey " +
        "names.",
    )
  }
  const loops = selfLoops(g)
  return {
    blockId: g.block.id,
    backend: ELK_BACKEND,
    message: messageOf(error),
    selfLoops: loops,
    horizontalPassives: horizontalPassivesOn(g, loops),
    inputKey: input.serialized,
  }
}

/** One self-loop, as `<part>:<unit>` on `<net>` - the same `<part>:<unit>` node id form the graph uses. */
function loopText(s: SelfLoop): string {
  return `${s.part}:${s.unit} on ${s.net}`
}

/**
 * The diagnosis as text for a person: what raised, whether G94's necessary shape is present, and
 * the exact bytes - printed verbatim, per the decision above, so the raise is reproducible from
 * this string alone, without re-running the generator or guessing at the input.
 */
export function renderDiagnosis(d: RaiseDiagnosis): string {
  const loops = d.selfLoops.length === 0 ? "none" : d.selfLoops.map(loopText).join(", ")
  const laterals = d.horizontalPassives.length === 0 ? "none" : d.horizontalPassives.join(", ")
  return [
    `block ${d.blockId}: ${d.backend} raised: ${d.message}`,
    `  self-loop cells (docs/known-gaps.md G94's necessary condition; diagnostic only, never a rule): ${loops}`,
    `  horizontal passives on a self-loop net (G94's "lateral"; diagnostic only): ${laterals}`,
    `  input (reproduce by handing these exact bytes' graph to elk.layout() at ${ELK_BACKEND}): ${d.inputKey}`,
  ].join("\n")
}
