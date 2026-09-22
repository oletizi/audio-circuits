import type { ResolvedComponent, ResolvedNetwork } from "../model/control-state.ts"
import { twoPinElements, type ResolvedTwoPinElement } from "../model/resolved-two-pin.ts"

export interface PrunedBranches {
  readonly network: ResolvedNetwork
  /** Component ids removed, in the order they were found. */
  readonly removed: readonly string[]
}

/** Removes dead-end branches, so every remaining node has a path for current.
 *
 * A rotary selector connects its common to one throw; every other throw's
 * capacitors hang off a node that leads nowhere else. SPICE cannot solve such a
 * node and reports a singular matrix.
 *
 * The criterion is that a net is a dead end when every element on it leads back
 * to the SAME single other net — including the degenerate case of a net with one
 * terminal. No current can flow through such a branch, because there is no
 * return path, so removing it changes neither the DC solution nor the AC
 * response. That makes this exact rather than an approximation, which matters:
 * the usual SPICE remedy of tacking a large resistor to ground would be a
 * fallback, and a branch that genuinely carried current would be silenced by it.
 *
 * Note that counting terminals is not enough. Two capacitors paralleled onto one
 * unselected selector position give that node two terminals while still leading
 * nowhere, which is exactly the case in this project's hi cut bank.
 *
 * Port nets are preserved: an input or output legitimately touches one terminal.
 * Removal repeats to a fixed point, since dropping one branch can strand the
 * next.
 *
 * Only reasons about two-terminal passives (`twoPinElements`) - the same scope
 * this module has always had. Active-device pruning is not attempted here.
 *
 * THAT SCOPE IS A REFUSAL, NOT A PASS-THROUGH, and it is worth knowing which
 * networks it excludes. `twoPinElements` THROWS on any component with package
 * pins, more than one unit, or pins not keyed `a`/`b`. Measured: this function
 * runs on the Pultec reference (76 elements) and throws on both circuits
 * carrying an active device - `circuits/opamp-buffer.ts` at `buffer_amp`
 * (package pins v+, v-) and `circuits/optical-compressor/` at
 * `power_power_terminal` (pins not keyed a/b). Its one caller in the tree is
 * `tests/reference/ac.test.ts`, so neither ported circuit is pruned, and a
 * dead-end branch in one would reach ngspice as a singular matrix rather than
 * being removed here. See `lib/model/resolved-two-pin.ts` for the same note from
 * the other side.
 */
export function pruneFloatingBranches(network: ResolvedNetwork): PrunedBranches {
  const ports = new Set(Object.values(network.ports))
  let elements: readonly ResolvedTwoPinElement[] = twoPinElements(network)
  const removed: string[] = []

  for (;;) {
    const neighbours = new Map<string, Set<string>>()
    const touch = (net: string, other: string) => {
      const seen = neighbours.get(net) ?? new Set<string>()
      if (other !== net) seen.add(other)
      neighbours.set(net, seen)
    }
    for (const element of elements) {
      touch(element.pins.a, element.pins.b)
      touch(element.pins.b, element.pins.a)
    }

    const deadEnds = new Set<string>()
    for (const [net, others] of neighbours) {
      if (others.size <= 1 && !ports.has(net)) deadEnds.add(net)
    }
    if (deadEnds.size === 0) break

    const keep: ResolvedTwoPinElement[] = []
    for (const element of elements) {
      if (deadEnds.has(element.pins.a) || deadEnds.has(element.pins.b)) {
        removed.push(element.component.id)
        continue
      }
      keep.push(element)
    }
    if (keep.length === elements.length) break
    elements = keep
  }

  const components: readonly ResolvedComponent[] = elements.map(element => element.component)
  return { network: { ports: network.ports, components }, removed: removed.slice() }
}
