/**
 * The 40 interface pads as the module and the pedal both connect them: J_MOD_A pad n is contract pin
 * n and J_MOD_B pad n is contract pin n + 20 (architecture.md section 4.2; `socketPadFor`).
 *
 * The rule is the same on both boards (architecture.md section 4.11): every pad's net is the
 * contract's signal name, read from `module-interface.json` (rule 7), and the reserved pins 16-19
 * carry no signal and are unconnected "on every audio board and on our module" (rule 3, RR-5). A pin
 * the contract leaves without a signal for any other reason is refused, since nothing says what it
 * carries. The carrier's rule differs (its reserved pins are broken out), so it is not built here.
 *
 * Shared by `module/interface.ts` and `pedal/interface.ts` (h7 pedal pages plan, Task 5), so the
 * two boards' pads cannot drift apart.
 */
import { NC } from "../../lib/model/index.ts"
import type { Connection } from "../../lib/model/index.ts"
import { loadContract, socketPadFor } from "./contract.ts"

export interface SocketPads {
  /** Pad number (as a string) -> connection, per socket. */
  readonly J_MOD_A: Readonly<Record<string, Connection>>
  readonly J_MOD_B: Readonly<Record<string, Connection>>
  /** Every contract net the pads carry, sorted: the interface block's ports. */
  readonly nets: readonly string[]
}

export function socketPads(board: "module" | "pedal"): SocketPads {
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
      throw new Error(
        `contract pin ${cp.pin} (category "${cp.category}") has no signal and is not reserved; the ${board} ` +
          "cannot say what its pad carries. Give the pin a signal in module-interface.json, or make it reservedCompatibility.",
      )
    }
  }
  return { J_MOD_A: pads.J_MOD_A, J_MOD_B: pads.J_MOD_B, nets: [...nets].sort() }
}
