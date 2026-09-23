/**
 * Dispatch for the CLI's `netlist-sync` verb: regenerate a board's netlist
 * export from its schematic and reconcile it with the checked-in fixture.
 *
 * Split out of tools/cli/perfboard.ts for the same reason
 * perfboard-binary-verbs.ts is: a coherent, binary-backed verb kept apart
 * from the read-only dispatch in the main file, and this repository's own
 * file-size ceiling.
 *
 * UNLIKE every other verb in this CLI, `netlist-sync` does not take `-C
 * <dir>` and resolve a PerfboardDeclaration itself. make/board.mk has
 * ALREADY resolved $(SCH) and $(NETLIST) from THIS board's own declaration
 * (through `board-info --field`, so the JSON parsing is not duplicated
 * again here) and already resolves $(KICAD_CLI) with its own default -
 * this verb just takes those three resolved paths as flags, exactly the
 * values make already computed, rather than re-deriving them from a
 * directory a second way.
 */
import { errorMessage, reportLines } from "./perfboard-support.ts"
import { syncNetlistExport, type NetlistSyncDeps } from "../perfboard/netlist-sync.ts"

function requiredFlag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  return args[index + 1]
}

export function dispatchNetlistSync(
  args: readonly string[],
  deps: NetlistSyncDeps | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): number {
  const sch = requiredFlag(args, "--sch")
  const netlist = requiredFlag(args, "--netlist")
  const kicadCli = requiredFlag(args, "--kicad-cli")

  const missing = [
    sch === undefined ? "--sch" : null,
    netlist === undefined ? "--netlist" : null,
    kicadCli === undefined ? "--kicad-cli" : null,
  ].filter((flag): flag is string => flag !== null)
  if (sch === undefined || netlist === undefined || kicadCli === undefined) {
    error(
      `netlist-sync needs ${missing.join(", ")}: the resolved schematic, netlist and kicad-cli ` +
        "paths (make/board.mk passes all three; this verb never re-derives them from a directory).",
    )
    return 1
  }

  try {
    const result = syncNetlistExport(sch, netlist, kicadCli, deps)
    if (result.changed && result.message !== undefined) log(result.message)
    return 0
  } catch (caught) {
    error(`FAIL ${netlist}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}
