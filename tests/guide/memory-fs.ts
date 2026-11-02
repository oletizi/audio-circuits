/**
 * The in-memory `GuideFs` the packet tests write through: file path ->
 * contents, with the staging/rename dance `tools/guide/packet.ts` performs
 * modelled rather than stubbed out.
 *
 * **SHARED, BECAUSE TWO FILES DRIVE `writeGuidePacket` AND ONE OF THEM DRIVES
 * IT AGAINST A REAL COMMITTED BOARD.** `tests/guide/packet.test.ts` runs it on
 * a hand-written fixture; `tests/guide/clusters-packet.test.ts` runs it on
 * `boards/pultec-low-boost`, whose `guide/` directory must not be touched by a
 * test. A second copy of this would let the two model the swap differently and
 * then disagree about which files a packet holds - which is what the file-set
 * assertions in both are for.
 */
import type { GuideFs } from "../../tools/guide/packet.ts"

/** An in-memory filesystem: file path -> contents. */
export function memoryFs(initial: Record<string, string> = {}): {
  fs: GuideFs
  files: Map<string, string>
} {
  const files = new Map(Object.entries(initial))
  const under = (dir: string): string[] => [...files.keys()].filter((file) => file.startsWith(`${dir}/`))
  return {
    files,
    fs: {
      makeDir: () => {},
      removeDir: (dir) => {
        for (const file of under(dir)) files.delete(file)
      },
      // ONE FILE, which is what the two staging intermediates need: the
      // printed-but-unmerged guide and the exported schematic page are written
      // inside the staging directory and must not reach the published packet,
      // and `removeDir` on that directory would take the packet with them.
      removeFile: (file) => {
        files.delete(file)
      },
      writeText: (file, text) => {
        files.set(file, text)
      },
      rename: (from, to) => {
        for (const file of under(from)) {
          files.set(`${to}${file.slice(from.length)}`, files.get(file) ?? "")
          files.delete(file)
        }
      },
    },
  }
}
