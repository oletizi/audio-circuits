/**
 * Whether a layout can be printed as a build packet at all.
 *
 * A packet must never show a board whose cuts are unknown, nor silently
 * leave a part off it. So the dump is refused, naming the fix, when its cut
 * state is anything but computed - with the same explanation `make cuts`
 * gives for unresolved cuts - or when any part is still floating (unplaced),
 * since a floating part has no holes to draw or list.
 */
import { cutStateOf, unresolvedCutsMessage } from "../perfboard/cut-state.ts"
import { parseBoardDump, type BoardDump } from "./dump.ts"

export function buildableDump(dumpText: string, vrtPath: string): BoardDump {
  const state = cutStateOf(dumpText, vrtPath)
  if (state === "UNRESOLVED") {
    throw new Error(unresolvedCutsMessage(vrtPath, dumpText))
  }
  if (state === "NOT_APPLICABLE") {
    throw new Error(
      `${vrtPath} is in isolated-hole mode (CUT_STATE NOT_APPLICABLE): it has no strips, and the ` +
        'build guide draws a stripboard. Run the "stripboard" verb to convert it to strip mode first.',
    )
  }
  if (state !== "COMPUTED") {
    throw new Error(
      `${vrtPath}: --dump-board reports CUT_STATE ${state}, which this tool does not understand, so ` +
        "whether the cuts are known cannot be told. Rebuild the pinned fork (`make veroroute`).",
    )
  }
  const dump = parseBoardDump(dumpText)
  const floating = dump.parts.filter((part) => part.placement === "floating").map((part) => part.ref)
  if (floating.length > 0) {
    throw new Error(
      `${vrtPath}: ${floating.join(", ")} ${floating.length === 1 ? "is" : "are"} not placed on the ` +
        "board (floating), and a build packet must never leave a part out. Place " +
        `${floating.length === 1 ? "it" : "them"} in VeroRoute (\`make edit\`), save, then run this again.`,
    )
  }
  return dump
}
