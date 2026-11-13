/**
 * The pedal's module sockets (h7 pedal pages plan, Task 5): J_MOD_A and J_MOD_B, Mill-Max
 * 801-43-020-10-012000, two 1 x 20 female sockets on the pedal's underside (parts.md:158, controller
 * ruling R-61; R-5 puts the female part on the pedal).
 *
 * Built as `module/interface.ts` builds the module's headers, through the same `socketPads`: pad n of
 * J_MOD_A is contract pin n and pad n of J_MOD_B is contract pin n + 20 (architecture.md:127); every
 * pad's net is the contract's signal (architecture.md:292, rule 7); pins 16-19 are NC, "unconnected
 * on every audio board" (architecture.md:288, rule 3, RR-5); pads 20 and 40 are both GND, the pedal's
 * one ground (architecture.md:294, rule 9). The block's ports are every contract net, named by the net.
 *
 * NOT HERE: the pedal's test pads (CR-PEDAL-TEST-PADS). The inventory listed them under this block
 * as unruled; CR-PEDAL-BLOCKS leaves which block draws each pad to the task that builds its net.
 */
import type { Network } from "../../../lib/model/index.ts"
import { MODULE_SOCKET } from "../parts.ts"
import { socketPads } from "../socket-pads.ts"
import { block, part } from "./build.ts"

const SRC =
  "docs/h7-platform/parts.md:158 (J_MOD_A and J_MOD_B, ruling R-61); pads per docs/h7-platform/architecture.md:127; " +
  "pad nets from circuits/h7-platform/module-interface.json (docs/h7-platform/architecture.md:292); " +
  "pins 16-19 NC (docs/h7-platform/architecture.md:288, RR-5)"

export function interfaceBlock(): Network {
  const pads = socketPads("pedal")
  return block([
    part("j_mod_a", "connector", pads.J_MOD_A, MODULE_SOCKET, `${SRC}; contract pins 1-20`),
    part("j_mod_b", "connector", pads.J_MOD_B, MODULE_SOCKET, `${SRC}; contract pins 21-40`),
  ], pads.nets)
}
