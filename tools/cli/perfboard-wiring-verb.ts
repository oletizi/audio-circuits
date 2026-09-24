/**
 * Dispatch for the CLI's `wiring` verb: regenerate this board's wiring guide
 * from its circuit and rewrite it only if it has drifted.
 *
 * Split out of tools/cli/perfboard.ts for the same reason
 * perfboard-netlist-verb.ts is - a coherent verb kept apart from the
 * read-only dispatch in the main file, and this repository's own file-size
 * ceiling.
 *
 * UNLIKE `netlist-sync`, this one DOES take `-C <dir>` and resolve the
 * declaration itself, because everything it needs comes from the circuit
 * module the declaration names. There is nothing for make to have resolved
 * first.
 */
import { boardHere, errorMessage, reportLines } from "./perfboard-support.ts"
import { syncWiringDoc } from "../perfboard/wiring-sync.ts"

export async function dispatchWiring(
  cwd: string,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const declaration = boardHere(cwd, "wiring", error)
  if (declaration === null) return 1
  try {
    const result = await syncWiringDoc(declaration)
    // Every status reports. "unchanged" is the answer an operator most wants on
    // a normal run, and a verb that stays silent when it succeeded is one whose
    // silence cannot be distinguished from not having run.
    log(result.message)
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.file}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}
