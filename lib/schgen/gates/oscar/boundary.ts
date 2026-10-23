/**
 * **A HAND-WRITTEN FORWARD DECLARATION, NOT A PORT - AND TASK 18 DID NOT REPLACE IT.** This header
 * said Task 18 *"replaces this file WHOLESALE"* with `digital-pedal-platform`'s
 * `tools/schgen/gates/oscar/boundary.ts`, removing its `handWritten` entry in favour of a `files[]`
 * one. **That did not happen and the prediction is left visible rather than quietly corrected.**
 * Task 18 ported gate 8's M1 half - the WHOLE-circuit comparison under an empty permitted delta -
 * and the real `boundary.ts` is the SUBCIRCUIT boundary: `applyDeltas`, `oscarParts`, the
 * per-subcircuit map and the `CORE-BRIEF.md` delta ids, every one of which belongs to M2. So this
 * file is still a forward declaration, `OscarConfig.subcircuits` still needs its `Subcircuit`
 * type, and `oscarParts` below still throws. `docs/known-gaps.md` **G242** item three records the
 * one live consequence: `DeltaEdit` here and `GraphEdit` in
 * `lib/schgen/gates/declared-delta.ts` are one shape declared twice, on purpose, and nothing
 * checks that they agree.
 *
 * **Why it exists.** `lib/schgen/design.ts` is a port, and it imports `Subcircuit` as a type from
 * `@/schgen/gates/oscar/boundary` for `OscarConfig.subcircuits`. The real module needs
 * `gates/oscar/canonical.ts` and `gates/oscar/graph.ts`, and `graph.ts` needs
 * `@/kicad/components`, which this repository does not have - so the SUBCIRCUIT half of the oscar
 * group is still unported, and it is M2's. Controller
 * ruling R26, Task 6b: a `cuts` entry that deleted `OscarConfig.subcircuits` would port
 * `design.ts` by deleting what gate 8 needs, and the plan declares no such cut, so the forward
 * declaration is the mechanism instead.
 *
 * **WHAT IT CARRIES, and it is a transcription of the real shapes rather than a guess.** Read
 * from `$SCHGEN_SOURCE/gates/oscar/boundary.ts` (lines 13-48) and
 * `$SCHGEN_SOURCE/gates/oscar/graph.ts` (lines 97-110): `NetRef`, `DeltaEdit` with all five of
 * its kinds and their shared `delta`/`why` base, `SideSpec`, and `Subcircuit`'s five fields.
 *
 * **WHAT IT DOES NOT CARRY, said plainly** (`CLAUDE.md`: *"states plainly anything it did NOT
 * carry across"*): `deltaIdsFromBrief`, `deltaTarget`, `applyDeltas`, `applyDeltasTraced`,
 * `AppliedDeltas` and every private helper of the real module - nothing in this repository calls
 * them yet. The one function declared here, `oscarParts`, **throws, naming the milestone that
 * would implement it**, because
 * `CLAUDE.md`'s rule for functionality that does not exist is a named throw and never a fallback
 * or a stub answer.
 *
 * **A DEVIATION WORTH SEEING: `SideSpec` IS DECLARED HERE AND DOES NOT BELONG HERE.** Upstream it
 * lives in `gates/oscar/graph.ts` and `boundary.ts` imports it. It is transcribed into this file
 * because `graph.ts` is unportable today (`@/kicad/components`), and because a second hand-written
 * forward declaration for one interface would be a second file to remember to delete. **Task 18
 * did not port `graph.ts` either** - its `extractSubgraph`, `SubPart` and `Subgraph` are the
 * subcircuit boundary, which is M2's - so `SideSpec` stays here, and whichever task does port
 * `graph.ts` takes it back and deletes this copy with it.
 */

/**
 * "PART.PIN": the net that pin is on (when the delta applies). "new:<NAME>": a net that is not in
 * OSCAR's graph; every reference to the same new:<NAME> in one delta list is the same net.
 */
export type NetRef = string

interface DeltaBase {
  /** A CORE-BRIEF.md delta id, e.g. "D7". */
  readonly delta: string
  /** Why the edit follows from that delta (source, section); never blank. */
  readonly why: string
}

export type DeltaEdit =
  | (DeltaBase & { readonly kind: "setValue"; readonly part: string; readonly value: string })
  | (DeltaBase & { readonly kind: "removePart"; readonly part: string })
  | (DeltaBase & {
      readonly kind: "addPart"
      readonly part: string
      readonly value: string
      /** A human declaration that the part's two pins are interchangeable; taken as written. */
      readonly symmetric: boolean
      readonly pins: Readonly<Record<string, NetRef>>
      /** false: the part sits outside the compared subcircuit and only marks the nets it touches ext. */
      readonly inSubgraph: boolean
    })
  | (DeltaBase & { readonly kind: "mergeNets"; readonly keep: NetRef; readonly drop: NetRef })
  | (DeltaBase & { readonly kind: "movePin"; readonly part: string; readonly pin: string; readonly to: NetRef })

/** One side of a compared subcircuit. Upstream this is `gates/oscar/graph.ts`'s - see the file comment. */
export interface SideSpec {
  readonly parts: readonly string[]
  /**
   * "PART.PIN" -> anchor name: a pin outside the subcircuit that both sides agree on. The pin
   * must exist in this netlist and sit on a net a listed part touches. Names may not contain + or |.
   */
  readonly anchors: Readonly<Record<string, string>>
  /**
   * Net name -> canonical rail name. Validated per netlist: every net named here must exist in
   * this netlist, so a rails map cannot be shared between netlists with different rail nets
   * (e.g. OSCAR_PROC_01 and OSCAR_AUDIO_01). Canonical names may not contain + or |.
   */
  readonly rails: Readonly<Record<string, string>>
}

export interface Subcircuit {
  /** e.g. "VCAP". */
  readonly id: string
  /** Key into OscarConfig.netlists. */
  readonly board: string
  readonly oscar: SideSpec
  readonly ours: SideSpec
  /** Applied to OSCAR's graph, in order. */
  readonly deltas: readonly DeltaEdit[]
}

/**
 * Every OSCAR part a SUBCIRCUIT covers, which is what gate 8's M2 half would compare its two sides
 * over.
 *
 * **It throws, and that is the whole content of this file's behaviour.** The real implementation
 * walks `sc.deltas` and `sc.oscar.parts` and needs `canonicalValue` and `extractSubgraph`. Task 18
 * transcribed `canonicalValue` into `lib/schgen/gates/canonical-value.ts`, so that half is here
 * now; `extractSubgraph` and the rest of `gates/oscar/graph.ts` are not, and neither is
 * `applyDeltas`. So there is still nothing here to compute from, and nothing is guessed.
 */
export function oscarParts(sc: Subcircuit): string[] {
  throw new Error(
    `gates/oscar/boundary is a forward declaration: oscarParts(${sc.id}) is not implemented here. ` +
      "Computing an OSCAR boundary needs digital-pedal-platform's gates/oscar/graph.ts " +
      "(extractSubgraph, which needs @/kicad/components) and its applyDeltas, neither of which is " +
      "ported: Task 18 landed gate 8's M1 half, which compares WHOLE circuits under an empty " +
      "permitted delta and needs no boundary, and the SUBCIRCUIT comparison is M2's. Until then " +
      "nothing in this repository may compute an OSCAR boundary, and this refuses rather than " +
      "returning an answer no code here can derive. See this file's comment, " +
      "lib/schgen/gates/reference-graph.ts's, and docs/known-gaps.md G104 and G242.",
  )
}
