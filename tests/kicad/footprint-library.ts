/**
 * The KiCad footprint library, read off disk. `lib/kicad/pin-pattern.ts`'s pad
 * data is transcribed from these files, so one test opens them and compares; a
 * transcription checked only against itself is a transcription nobody verified.
 *
 * This helper REFUSES rather than skips when the library is not resolvable,
 * for the reason tests/circuits/kicad-round-trip.ts gives for kicad-cli: a
 * skipped check must never look like a passing one, and a green suite on a
 * machine with no KiCad would be exactly that. It is test-side only: nothing
 * in lib/ or tools/ reads a .kicad_mod at run time, which is why
 * lib/kicad/pin-pattern.ts holds the pads as committed data.
 */
import fs from "node:fs"
import path from "node:path"
import type { PadPosition } from "../../lib/kicad/pin-pattern-model.ts"

/** Overridable the way KICAD_CLI is, and defaulted to the same install root. */
export const FOOTPRINT_LIBRARY_ROOT =
  process.env["KICAD_FOOTPRINTS"] ??
  "/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints"

/** `<Library>:<Name>` as a netlist spells it, to `<root>/<Library>.pretty/<Name>.kicad_mod`. */
export function footprintFile(name: string): string {
  const parts = name.split(":")
  const library = parts[0]
  const footprint = parts[1]
  if (parts.length !== 2 || library === undefined || footprint === undefined) {
    throw new Error(
      `"${name}" is not a <Library>:<Name> footprint reference, which is the form every ` +
        "netlist in this repository uses and the only form this helper can turn into a path.",
    )
  }
  return path.join(FOOTPRINT_LIBRARY_ROOT, `${library}.pretty`, `${footprint}.kicad_mod`)
}

export interface FootprintPads {
  readonly pads: readonly PadPosition[]
  readonly version: string
  /** Every `(pad ...)` form in the file, including any this repository excludes. */
  readonly padCount: number
  readonly file: string
}

/**
 * Reads a footprint's pad centres. Throws, naming the path and the override,
 * when the file is not there - this does NOT skip.
 */
export function readFootprintPads(name: string): FootprintPads {
  const file = footprintFile(name)
  if (!fs.existsSync(file)) {
    throw new Error(
      `footprint "${name}" is not at ${file}. Install KiCad or set KICAD_FOOTPRINTS. This ` +
        "test does not skip: it is the only check that the pads in lib/kicad/pin-pattern.ts " +
        "match the files they were transcribed from, and this repository has twice shipped a " +
        "footprint that does not exist.",
    )
  }
  const lines = fs.readFileSync(file, "utf8").split("\n")
  const version = /\(version (\d+)\)/.exec(lines.join("\n"))?.[1]
  if (version === undefined) {
    throw new Error(`${file} carries no (version <n>) token, so its pads cannot be dated.`)
  }
  const pads: PadPosition[] = []
  let padCount = 0
  for (let index = 0; index < lines.length; index += 1) {
    const opener = /^\s*\(pad\s+(?:"([^"]*)"|(\S+))\s+\S+/.exec(lines[index] ?? "")
    if (opener === null) continue
    padCount += 1
    const pad = opener[1] ?? opener[2] ?? ""
    // `(at x y [rot])` is the first `at` form inside the pad; a rotation does
    // not move the centre, so the third field is read and discarded.
    let at: RegExpExecArray | null = null
    for (let look = index + 1; look < Math.min(index + 10, lines.length); look += 1) {
      at = /^\s*\(at (-?[\d.]+) (-?[\d.]+)(?: (-?[\d.]+))?\)/.exec(lines[look] ?? "")
      if (at !== null) break
    }
    if (at === null) {
      throw new Error(
        `${file}: the pad form opening at line ${index + 1} has no parseable (at x y) within ` +
          "ten lines. This is an error and not a skipped pad: a dropped pad is how a partial " +
          "transcription passes a count check.",
      )
    }
    pads.push({ pad, xMm: Number(at[1]), yMm: Number(at[2]) })
  }
  if (pads.length === 0) throw new Error(`${file} declares no pads, which cannot be right.`)
  return { pads, version, padCount, file }
}
