/**
 * The interface headers (H7 module plan, Task 6): J_MOD_A and J_MOD_B, Mill-Max
 * 800-10-020-10-002000, two 1 x 20 male headers (parts.md:49; ruling R-61; architecture.md:316).
 *
 * Pad n of J_MOD_A is contract pin n and pad n of J_MOD_B is contract pin n + 20 (architecture.md
 * section 4.2; `socketPadFor`). Every pad's net is the contract's signal name, read from
 * `module-interface.json` (architecture.md section 4.11 rule 7). The reserved pins 16-19 carry no
 * signal and are unconnected on the module (rule 3, RR-5); a pin the contract leaves without a
 * signal for any other reason is refused, since nothing says what it carries.
 *
 * The module adds nothing between an MCU port and its pad: the protection the crossings need is on
 * the pedal (architecture.md section 4.8), and the MCU block puts each `moduleMcuPin` on the same net.
 */
import { NC } from "../../../lib/model/index.ts"
import type { Connection, Network } from "../../../lib/model/index.ts"
import { loadContract, socketPadFor } from "../contract.ts"
import { MODULE_HEADER } from "../module-parts.ts"
import { block, part } from "./build.ts"

const SRC = "parts.md:49 (J_MOD_A and J_MOD_B, ruling R-61); pad nets from module-interface.json; architecture.md section 4.2, 4.11"

export function interfaceBlock(): Network {
  const pads: Record<"J_MOD_A" | "J_MOD_B", Record<string, Connection>> = { J_MOD_A: {}, J_MOD_B: {} }
  const nets = new Set<string>()
  for (const cp of loadContract().pins) {
    const { part: header, pad } = socketPadFor(cp.pin)
    if (cp.signal !== null) {
      pads[header][String(pad)] = { kind: "net", net: cp.signal }
      nets.add(cp.signal)
    } else if (cp.category === "reservedCompatibility") {
      pads[header][String(pad)] = NC
    } else {
      throw new Error(`contract pin ${cp.pin} (category "${cp.category}") has no signal and is not reserved; the module cannot say what its pad carries`)
    }
  }
  return block([
    part("j_mod_a", "connector", pads.J_MOD_A, MODULE_HEADER, `${SRC}; contract pins 1-20`),
    part("j_mod_b", "connector", pads.J_MOD_B, MODULE_HEADER, `${SRC}; contract pins 21-40`),
  ], [...nets].sort())
}
