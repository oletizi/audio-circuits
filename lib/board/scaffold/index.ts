/**
 * A stand-in for an absent Pultec section: the section, at flat, with everything that
 * conducts nowhere removed.
 *
 * DERIVED, NEVER TRANSCRIBED. A hand-written table of stand-in values would be a
 * parallel copy of facts the model already states, and it would drift the first time a
 * capacitor value changed - and that drift would look like a measurement rather than a
 * bug. The repository's rule applies directly: transcription is evidence, not memory.
 *
 * The derivation is also more accurate than a hand-written summary. hi-boost's stand-in
 * is not the bare 47k ladder arm a human would write down: it carries a reactive bridge
 * from `in` through the selected capacitor, the 0.3 H tap, R3 and the Q arm. That branch
 * is exactly what the resistor-only approach omitted, and nobody had to notice it.
 */
import { discoverBoundary } from "./boundary.ts"
import { GROUND_NET, resolveSectionFlat } from "./flat.ts"
import { isolationPoints } from "./isolate.ts"
import { reduceToBoundary } from "./reduce.ts"
import type { Component } from "../../model/types.ts"
import type { ResolvedComponent } from "../../model/control-state.ts"
import type { FlatState } from "./flat.ts"
import type { IsolationPoint } from "./isolate.ts"

export interface StandIn {
  readonly section: string
  /** The setting this stand-in emulates. Up to 3.71 dB rides on it, so it travels with
   * the stand-in rather than being implicit. */
  readonly flat: FlatState
  readonly boundary: readonly string[]
  readonly components: readonly ResolvedComponent[]
  readonly isolation: readonly IsolationPoint[]
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
  return {
    section: sectionName,
    flat,
    boundary: [...boundary].sort(),
    components,
    isolation: isolationPoints(components, boundary, GROUND_NET),
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
export type { IsolationPoint } from "./isolate.ts"
