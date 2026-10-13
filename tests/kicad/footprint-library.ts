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

/**
 * Every `<Library>.pretty` installed under `FOOTPRINT_LIBRARY_ROOT`.
 *
 * **IT REFUSES AND DOES NOT SKIP** when the root is not there or holds no
 * libraries, which is the whole point: `tests/kicad/footprint-names.test.ts`
 * checks every footprint name this repository writes down against these files,
 * and on a machine with no KiCad an empty set would make every one of those
 * names pass for the wrong reason.
 */
/**
 * Reading 155 directory entries per name checked is wasteful, so each root's
 * library set is listed once per process. Keyed by root, because `root` is a
 * parameter: a cache keyed by nothing would hand one root's answer to another.
 */
const LIBRARIES = new Map<string, ReadonlySet<string>>()

export function installedFootprintLibraries(
  root: string = FOOTPRINT_LIBRARY_ROOT,
): ReadonlySet<string> {
  const cached = LIBRARIES.get(root)
  if (cached !== undefined) return cached
  if (!fs.existsSync(root)) {
    throw new Error(
      `the KiCad footprint libraries are not at ${root}. Install KiCad or set ` +
        "KICAD_FOOTPRINTS. This check does not skip: it is the only thing standing between a " +
        "footprint name nobody can look up and a committed netlist, and this repository has " +
        "twice shipped a footprint that does not exist.",
    )
  }
  const libraries = new Set(
    fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.endsWith(".pretty"))
      .map((entry) => entry.name.slice(0, -".pretty".length)),
  )
  if (libraries.size === 0) {
    throw new Error(
      `${root} holds no .pretty footprint libraries, which cannot be right - an empty install ` +
        "would make every name checked against it pass for the wrong reason, which is the " +
        "skipped-check-that-looks-like-a-pass this helper exists to refuse. This does not skip.",
    )
  }
  LIBRARIES.set(root, libraries)
  return libraries
}

/** Why a footprint name did not resolve, so the two causes can be reported apart. */
export type FootprintResolution = "resolved" | "no-such-library" | "no-such-footprint"

/**
 * Whether `name` resolves in the installed libraries, and if not, which half of
 * it is missing.
 *
 * The two causes are reported SEPARATELY rather than collapsed into a boolean,
 * because they have different remedies: a missing library is usually a wholly
 * invented `<Library>` half, and a missing footprint within a real library is a
 * misspelling or a name from a different KiCad version. A refusal that says
 * which one saves the reader the lookup.
 */
export function resolveFootprintOnDisk(name: string): FootprintResolution {
  const file = footprintFile(name)
  const library = name.split(":")[0] ?? ""
  if (!installedFootprintLibraries().has(library)) return "no-such-library"
  return fs.existsSync(file) ? "resolved" : "no-such-footprint"
}

/** Whether `name` resolves in the installed libraries. Refuses an absent install. */
export function footprintExistsOnDisk(name: string): boolean {
  return resolveFootprintOnDisk(name) === "resolved"
}

/** Listed once per root: 155 directories is not a per-name cost worth paying. */
const ALL_NAMES = new Map<string, ReadonlySet<string>>()

/**
 * Every footprint name any installed library holds, WITHOUT its library prefix.
 *
 * This is what gives the `SYNTHETIC:` exemption teeth. The prefix replaces the
 * library half, so `resolveFootprintOnDisk` on an exempt name can only ever
 * answer `no-such-library` - a tautology, and no check at all. Asking instead
 * whether the NAME half exists in ANY library catches the thing the exemption
 * could otherwise hide: a real footprint relabelled synthetic to get past the
 * disk check.
 */
export function allInstalledFootprintNames(
  root: string = FOOTPRINT_LIBRARY_ROOT,
): ReadonlySet<string> {
  const cached = ALL_NAMES.get(root)
  if (cached !== undefined) return cached
  const names = new Set<string>()
  for (const library of installedFootprintLibraries(root)) {
    for (const entry of fs.readdirSync(path.join(root, `${library}.pretty`))) {
      if (entry.endsWith(".kicad_mod")) names.add(entry.slice(0, -".kicad_mod".length))
    }
  }
  if (names.size === 0) {
    throw new Error(
      `${root} holds libraries but no .kicad_mod files at all, which cannot be right. This ` +
        "does not skip: an empty name set would make every synthetic label pass unexamined.",
    )
  }
  ALL_NAMES.set(root, names)
  return names
}
