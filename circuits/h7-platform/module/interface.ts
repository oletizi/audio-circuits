/**
 * The interface headers (H7 module plan, Task 6): J_MOD_A and J_MOD_B, Mill-Max
 * 800-10-020-10-002000, two 1 x 20 male headers (parts.md:49; ruling R-61; architecture.md:316).
 *
 * Pad n of J_MOD_A is contract pin n and pad n of J_MOD_B is contract pin n + 20 (architecture.md
 * section 4.2; `socketPadFor`). Every pad's net is the contract's signal name, read from
 * `module-interface.json` (architecture.md section 4.11 rule 7). The reserved pins 16-19 carry no
 * signal and are unconnected on the module (rule 3, RR-5); a pin the contract leaves without a
 * signal for any other reason is refused, since nothing says what it carries. The pads are built by
 * `socketPads` (`../socket-pads.ts`), which the pedal's sockets share.
 *
 * The module adds nothing between an MCU port and its pad: the protection the crossings need is on
 * the pedal (architecture.md section 4.8), and the MCU block puts each `moduleMcuPin` on the same net.
 */
import type { Network } from "../../../lib/model/index.ts"
import { MODULE_HEADER } from "../module-parts.ts"
import { socketPads } from "../socket-pads.ts"
import { block, part } from "./build.ts"

const SRC = "parts.md:49 (J_MOD_A and J_MOD_B, ruling R-61); pad nets from module-interface.json; architecture.md section 4.2, 4.11"

export function interfaceBlock(): Network {
  const pads = socketPads("module")
  return block([
    part("j_mod_a", "connector", pads.J_MOD_A, MODULE_HEADER, `${SRC}; contract pins 1-20`),
    part("j_mod_b", "connector", pads.J_MOD_B, MODULE_HEADER, `${SRC}; contract pins 21-40`),
  ], pads.nets)
}
