/**
 * Dispatch for the CLI's `scaffold-membership` verb: this board's scaffold doc
 * against the parts its committed layout actually holds.
 *
 * Split out of `tools/cli/perfboard.ts` for the reason
 * `./perfboard-wiring-verb.ts` and `./perfboard-netlist-verb.ts` are - that file
 * is at this repository's own size ceiling, and a coherent verb belongs beside
 * itself.
 *
 * **IT PRINTS ON EVERY OUTCOME, INCLUDING THE ONE WHERE THERE WAS NOTHING TO
 * CHECK.** `make check` prints `ok <path>` for a passing board and nothing else,
 * so a guard whose only output is a non-zero exit is a guard whose having run is
 * invisible. Both statuses log: the pass line carries its counts, and a board
 * with no `SCAFFOLD` prints the `NOTICE:` block
 * (`tools/perfboard/scaffold-membership.ts`), because a skipped check must never
 * look like a passing one.
 */
import { boardHere, errorMessage, reportLines } from "./perfboard-support.ts"
import { checkScaffoldMembership } from "../perfboard/scaffold-membership.ts"

export async function dispatchScaffoldMembership(
  cwd: string,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const declaration = boardHere(cwd, "scaffold-membership", error)
  if (declaration === null) return 1
  try {
    const result = await checkScaffoldMembership(
      declaration,
      repoRoot === undefined ? {} : { repoRoot },
    )
    for (const line of result.message.split("\n")) log(line)
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.file}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}
