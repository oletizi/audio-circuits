/**
 * A stand-in for an absent Pultec section: the section, at flat, with everything that
 * conducts nowhere removed.
 *
 * DERIVED, NEVER TRANSCRIBED. A hand-written table of stand-in values would be a
 * parallel copy of facts the model already states, and it would drift the first time a
 * capacitor value changed - and that drift would look like a measurement rather than a
 * bug. The repository's rule applies directly: transcription is evidence, not memory.
 *
 * The derivation also finds the EXACT flat-state network without anybody having to work
 * it out, and it is the exactness rather than any single surprise that earns it. Two
 * examples of what it settles, both from the code's own output rather than from a
 * recollection of what these sections usually look like:
 *
 * - mid's stand-in is not a resistor. It carries `C_MID_1kHz_A` and `C_MID_1kHz_B` in
 *   parallel, the `L_MID_1H` tap and `R_MID_BOOST` as a live reactive branch between
 *   `hi_boost_out` and `in`, alongside the 100k shunt to ground. That 1 H part has no
 *   catalogue number (see "Limits, measured" in the design doc), so whether it is
 *   really needed is a sourcing question, not a cosmetic one - and the derivation, not
 *   a judgement call, is what answers it.
 * - hi-boost's stand-in is NOT the bare 47k a summary would write down either: it is
 *   two components, `RV_HI_BOOST`'s 0R arm from `in` in series with its full 47k to
 *   `hi_boost_out`, because "ideal shorts are components, never node merges". It
 *   presents 47k and needs no inductor - the 0.3 H tap, `R3` and the Q arm form a loop
 *   from `in` back to `in` across that 0R arm and carry nothing.
 *
 * The 8.23 dB residue the design doc records against the resistor-only approach is NOT
 * attributable to either: the doc attributes it to hi-cut's pot arm and mid's flat path.
 */
import { discoverBoundary } from "./boundary.ts"
import { GROUND_NET, resolveSectionFlat } from "./flat.ts"
import { reduceToBoundary } from "./reduce.ts"
import type { Component } from "../../model/types.ts"
import type { ResolvedComponent } from "../../model/control-state.ts"
import type { FlatState } from "./flat.ts"

export interface StandIn {
  readonly section: string
  /** The setting this stand-in emulates. Up to 3.71 dB rides on it, so it travels with
   * the stand-in rather than being implicit. */
  readonly flat: FlatState
  readonly boundary: readonly string[]
  readonly components: readonly ResolvedComponent[]
}

export function standIn(
  sectionName: string,
  modules: Record<string, readonly Component[]>,
  flat: FlatState,
): StandIn {
  const boundary = discoverBoundary(sectionName, modules, GROUND_NET)
  if (boundary.size < 2) {
    throw new Error(
      `Section ${sectionName} has ${boundary.size} boundary net(s): ` +
        `${[...boundary].join(", ") || "none"}. A section sharing fewer than two nets ` +
        `with the rest of the circuit cannot be stood in for, because nothing passes ` +
        `through it.`,
    )
  }
  const resolved = resolveSectionFlat(sectionName, modules, flat)
  const components = reduceToBoundary(resolved, boundary)
  if (components.length === 0) {
    throw new Error(
      `Stand-in for ${sectionName} reduced to nothing from ` +
        `${resolved.components.length} resolved components. Either the boundary was ` +
        `discovered wrongly or this flat state disconnects the section entirely; ` +
        `check lib/board/scaffold/reduce.ts against the section's topology.`,
    )
  }
  // No isolation points are derived here any more: a build-time choice of which
  // parts to populate replaced the removable links that once needed them, so a group
  // that is not fitted needs no leg broken - its parts are simply absent from the
  // board.
  return {
    section: sectionName,
    flat,
    boundary: [...boundary].sort(),
    components,
  }
}

/** Every section's stand-in, keyed by section. The derived artifact's content. */
export function allStandIns(
  modules: Record<string, readonly Component[]>,
  flat: FlatState,
): Record<string, StandIn> {
  const standIns: Record<string, StandIn> = {}
  for (const sectionName of Object.keys(modules).sort()) {
    standIns[sectionName] = standIn(sectionName, modules, flat)
  }
  return standIns
}

export { GROUND_NET, REFERENCE_FLAT } from "./flat.ts"
export type { FlatState } from "./flat.ts"
