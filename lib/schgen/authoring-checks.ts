/**
 * DOES THE AUTHORING DECLARATION AGREE WITH THE CIRCUIT? - the three mechanical checks Task 9 of
 * the M1 schematic-authoring plan adds, each of which can fail.
 *
 * Hand-written. Split out of `./authoring.ts` only for size (`CLAUDE.md`'s 300-500 line rule);
 * the types and the declaration's own well-formedness live there, and these three read a
 * `Network` beside a declaration.
 *
 * 1. `blockPrefixDisagreements` - decision **D1**: the declared blocks agree with the `include()`
 *    prefixes wherever a prefix exists;
 * 2. `unblockedComponents` - every component is in exactly one block. `buildCircuit` already
 *    refuses a unit in two blocks and a unit in none, but it refuses one at a time and only once
 *    a `CircuitSpec` exists; this reports all of them against the `Network`;
 * 3. `interfaceDisagreements` - spec §1.9, **in both directions**. This is the half that stops a
 *    block's interface being read off a drawing later.
 */

import { netMembers } from "./authoring.ts"
import type { SchematicAuthoring } from "./authoring.ts"
import type { NetName } from "./ir/types.ts"
import type { Network } from "../model/types.ts"

/**
 * Decision **D1**, as a check: every member of a block whose declaration names an `include()`
 * prefix carries that prefix, and every component carrying it is a member.
 *
 * Both directions matter and they fail differently. A member without the prefix means the block
 * is holding something the composition did not put there; a component with the prefix outside the
 * block means the composition's unit was cut, which is the thing D1 exists to prevent. A block
 * declaring NO prefix is checked too: none of its members may carry a prefix another block
 * declares, so a composed component cannot be parked in the leftovers.
 */
export function blockPrefixDisagreements(network: Network, authoring: SchematicAuthoring): string[] {
  const out: string[] = []
  const ids = network.components.map((c) => c.id)
  const blockOfPrefix = new Map<string, string>()
  for (const block of authoring.blocks) {
    for (const prefix of block.prefixes.prefixes) {
      const prior = blockOfPrefix.get(prefix)
      if (prior !== undefined) {
        out.push(`include() prefix "${prefix}" is declared by blocks ${prior} and ${block.id}`)
        continue
      }
      blockOfPrefix.set(prefix, block.id)
    }
  }
  for (const block of authoring.blocks) {
    const members = new Set(block.members)
    const declared = block.prefixes.prefixes
    for (const prefix of declared) {
      const carried = ids.filter((id) => id.startsWith(`${prefix}_`))
      if (carried.length === 0) {
        out.push(
          `block ${block.id} declares include() prefix "${prefix}" and no component id starts ` +
            `with "${prefix}_"`,
        )
      }
      for (const id of carried) {
        if (!members.has(id)) {
          out.push(
            `block ${block.id} declares include() prefix "${prefix}" but ${id} carries it and is ` +
              "not a member; decision D1 forbids cutting an include() unit across blocks",
          )
        }
      }
    }
    if (declared.length > 0) {
      for (const id of block.members) {
        if (!declared.some((p) => id.startsWith(`${p}_`))) {
          out.push(
            `block ${block.id} declares include() prefix(es) ${declared.join(", ")} and member ` +
              `${id} carries none of them`,
          )
        }
      }
      continue
    }
    for (const id of block.members) {
      for (const [prefix, owner] of blockOfPrefix) {
        if (id.startsWith(`${prefix}_`)) {
          out.push(
            `block ${block.id} declares no include() prefix and member ${id} carries "${prefix}", ` +
              `which block ${owner} declares`,
          )
        }
      }
    }
  }
  return out
}

/** Every component in exactly one block, and every member a component. */
export function unblockedComponents(network: Network, authoring: SchematicAuthoring): string[] {
  const out: string[] = []
  const ids = new Set(network.components.map((c) => c.id))
  const blocksOf = new Map<string, string[]>()
  for (const block of authoring.blocks) {
    for (const id of block.members) {
      if (!ids.has(id)) {
        out.push(`block ${block.id} names member ${id}, which this network does not have`)
        continue
      }
      blocksOf.set(id, [...(blocksOf.get(id) ?? []), block.id])
    }
  }
  for (const component of network.components) {
    const blocks = blocksOf.get(component.id) ?? []
    if (blocks.length === 0) out.push(`${component.id} is in no block`)
    if (blocks.length > 1) out.push(`${component.id} is in blocks ${blocks.join(", ")}`)
  }
  return out
}

/** Why a net leaves a block. Both reasons are the model's; neither is read off a drawing. */
export interface Crossing {
  readonly net: NetName
  /** Members of this block with a pin on the net. */
  readonly inside: readonly string[]
  /** Components outside this block with a pin on the net. */
  readonly outside: readonly string[]
  /** The `Network.ports` name binding this net, when one does; a net leaving the whole circuit. */
  readonly port: string | null
}

/**
 * The nets that leave `block`, keyed by net.
 *
 * **A NET LEAVES FOR ONE OF EXACTLY TWO REASONS, and both are declared in the model.** Either a
 * component outside the block has a pin on it, or `Network.ports` binds it - in which case it
 * leaves the whole circuit and a reader of the sheet has to be able to see where it goes. The
 * second reason is why a one-block circuit still has an interface: `circuits/opamp-buffer.ts`
 * declares five ports, and without that arm its single block's interface would be empty and the
 * check over it would be a check that cannot fail.
 */
export function crossingNets(
  network: Network,
  authoring: SchematicAuthoring,
  blockId: string,
): ReadonlyMap<NetName, Crossing> {
  const block = authoring.blocks.find((b) => b.id === blockId)
  if (block === undefined) {
    throw new Error(
      `no block "${blockId}" is declared by "${authoring.project}". Declared: ` +
        `${authoring.blocks.map((b) => b.id).join(", ") || "(none)"}.`,
    )
  }
  const members = new Set(block.members)
  const portOfNet = new Map<NetName, string>()
  for (const [port, net] of Object.entries(network.ports)) portOfNet.set(net, port)
  const out = new Map<NetName, Crossing>()
  for (const [net, ids] of netMembers(network)) {
    const inside = ids.filter((id) => members.has(id))
    if (inside.length === 0) continue
    const outside = ids.filter((id) => !members.has(id))
    const port = portOfNet.get(net) ?? null
    if (outside.length === 0 && port === null) continue
    out.set(net, { net, inside, outside, port })
  }
  return out
}

/**
 * Spec §1.9's contract as a check that fails in **both** directions, which is the point: §1.9
 * says an interface port is *"never inferred from which nets happen to leave"*, and an inference
 * run the other way - reading the interface off which nets left - is the same mistake with the
 * arrow reversed.
 */
export function interfaceDisagreements(network: Network, authoring: SchematicAuthoring): string[] {
  const out: string[] = []
  const members = netMembers(network)
  for (const block of authoring.blocks) {
    const crossing = crossingNets(network, authoring, block.id)
    const declared = new Set(block.interface.map((p) => p.net))
    for (const port of block.interface) {
      if (crossing.has(port.net)) continue
      const touching = (members.get(port.net) ?? []).filter((id) => block.members.includes(id))
      if (touching.length === 0) {
        out.push(
          `block ${block.id}: declared interface port ${port.net} - no member of the block has a ` +
            `pin on it (members: ${block.members.join(", ")})`,
        )
        continue
      }
      out.push(
        `block ${block.id}: declared interface port ${port.net} does not leave the block - ` +
          `every pin on it is a member (${touching.join(", ")}) and the network declares no port ` +
          "for it, so there is nothing for seam B to attach",
      )
    }
    for (const [net, cross] of crossing) {
      if (declared.has(net)) continue
      const why =
        cross.outside.length > 0
          ? `it reaches ${cross.outside.join(", ")} outside the block`
          : `the network declares it as port "${cross.port ?? ""}", so it leaves the circuit`
      out.push(
        `block ${block.id}: net ${net} leaves the block and is not a declared interface port - ` +
          `${why}; inside: ${cross.inside.join(", ")}. Spec 1.9 makes the interface a ` +
          "declaration, so an undeclared crossing net refuses rather than being inferred here",
      )
    }
  }
  return out
}
