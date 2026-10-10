/**
 * Keep the Pultec netlist export honest with the schematic it comes from.
 *
 * THE SCHEMATIC IS NOW IN THIS REPOSITORY, at
 * `circuits/pultec/`, and it is the root of the reference's
 * dependency graph:
 *
 *   pultec-three-band-eq.kicad_sch  (hand-drawn, the authority)
 *     -> three-band-eq.net.xml      (kicad-cli export)
 *     -> three-band-eq.netlist.json (to-json.py)
 *     -> THREE_BAND_REFERENCE       (from-netlist.ts, mechanical)
 *     -> five physicalized boards
 *
 * Every step below the schematic is DERIVED, so the only way any of them goes
 * wrong is by being stale. This regenerates the export on every run and
 * rewrites it only when the content differs, exactly as
 * `tools/perfboard/netlist-sync.ts` does for a board's own netlist fixture.
 *
 * WHY THIS IS NOT A PER-BOARD GUARD. `make/board.mk`'s `netlist-agrees`
 * hangs a schematic off one board's `perfboard.json`. That shape does not fit
 * here: ONE schematic feeds the reference network, which feeds all five boards
 * through partition and physicalization. The guard therefore belongs at the
 * reference, once, rather than five times over on boards whose circuits are
 * not transcriptions of it.
 *
 * ONLY TWO FIELDS ARE VOLATILE, and that was measured rather than assumed:
 * exporting the vendored schematic and diffing against the committed export
 * differs in `<source>` and `<date>` alone. The sub-sheet is referenced by a
 * relative name, so `Sheetfile` and `sheetpath` are already stable. Nothing
 * else is normalized, because every field this ignores is a field in which
 * real drift could hide.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

/** Repository-relative paths, so a clone at any path reads the same. */
export const SCHEMATIC = "circuits/pultec/pultec-three-band-eq.kicad_sch"
export const EXPORT = "circuits/pultec/generated/three-band-eq.net.xml"
export const NETLIST_JSON = "circuits/pultec/generated/three-band-eq.netlist.json"
export const TO_JSON = "tools/pultec/to-json.py"

/**
 * Blank the two fields kicad-cli stamps per run and per machine.
 *
 * `<date>` changes on every export and `<source>` carries the absolute path
 * the export was run from. Comparing with both blanked is what lets an
 * unchanged schematic leave the working tree clean.
 */
export function withoutVolatileFields(xml: string): string {
  return xml
    .replace(/<source>[\s\S]*?<\/source>/, "<source>NORMALIZED</source>")
    .replace(/<date>[\s\S]*?<\/date>/, "<date>NORMALIZED</date>")
}

export function exportsAgree(fresh: string, existing: string): boolean {
  return withoutVolatileFields(fresh) === withoutVolatileFields(existing)
}

/**
 * Rewrite `<source>` to the repository-relative schematic path.
 *
 * Without this the committed export would name whichever absolute path the
 * last person to run it happened to have, and every clone at a different path
 * would rewrite the file on its first run - reporting drift that is really
 * just a different home directory.
 */
export function withRepoRelativeSource(xml: string): string {
  return xml.replace(/<source>[\s\S]*?<\/source>/, `<source>${SCHEMATIC}</source>`)
}

export interface PultecSyncDeps {
  readonly kicadCli?: string
  readonly runExport?: (kicadCli: string, schPath: string, outPath: string) => void
  readonly runToJson?: (xmlPath: string, jsonPath: string) => void
  /**
   * The schematic to export, defaulting to the vendored one.
   *
   * Injected only so a test can exercise the missing-schematic refusal without
   * renaming a committed file out from under every test that follows it.
   */
  readonly schematic?: string
}

export interface PultecSyncResult {
  readonly changed: boolean
  /** Always set, so no caller has to invent wording for either outcome. */
  readonly message: string
}

const DEFAULT_KICAD_CLI = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"

function defaultRunExport(kicadCli: string, schPath: string, outPath: string): void {
  const result = spawnSync(
    kicadCli,
    ["sch", "export", "netlist", "--format", "kicadxml", "-o", outPath, schPath],
    { encoding: "utf8" },
  )
  if (result.error) {
    throw new Error(
      `could not run kicad-cli at ${kicadCli}: ${result.error.message}. Install KiCad, or set ` +
        "KICAD_CLI to point at your own.",
    )
  }
  if (result.status !== 0) {
    throw new Error(
      `kicad-cli exited ${result.status} exporting ${schPath}.\n${result.stderr ?? ""}`,
    )
  }
}

function defaultRunToJson(xmlPath: string, jsonPath: string): void {
  const result = spawnSync("python3", [TO_JSON, xmlPath, jsonPath], { encoding: "utf8" })
  if (result.error) {
    throw new Error(`could not run python3 for ${TO_JSON}: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(`${TO_JSON} exited ${result.status}.\n${result.stderr ?? ""}`)
  }
}

/**
 * Regenerate the export, and rewrite it and the JSON only if it has changed.
 *
 * The JSON is regenerated whenever the XML is, because it is derived from it -
 * leaving them out of step would put a reference network in the repository
 * that no schematic produces.
 */
export function syncPultecSchematic(deps: PultecSyncDeps = {}): PultecSyncResult {
  const schematic = deps.schematic ?? SCHEMATIC
  if (!fs.existsSync(schematic)) {
    throw new Error(
      `${schematic} does not exist. The Pultec schematic is vendored in THIS repository - a ` +
        "missing file here means it was not committed, or the path is wrong. No other " +
        "repository is involved.",
    )
  }

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "pultec-schematic-"))
  try {
    const produced = path.join(scratch, "three-band-eq.net.xml")
    const runExport = deps.runExport ?? defaultRunExport
    runExport(deps.kicadCli ?? DEFAULT_KICAD_CLI, schematic, produced)

    const fresh = withRepoRelativeSource(fs.readFileSync(produced, "utf8"))
    const existing = fs.existsSync(EXPORT) ? fs.readFileSync(EXPORT, "utf8") : undefined

    // THE SOURCE LINE IS AN INVARIANT, not just a courtesy on write. An export
    // produced by a bare `kicad-cli` run - or inherited from the repository the
    // schematic used to live in - names an absolute path on somebody's machine.
    // `exportsAgree` blanks `<source>` so that difference does not read as
    // drift, which is right for drift; it also means such a path would survive
    // here forever unnoticed. Checking it separately is what actually keeps the
    // committed export free of a reference to anywhere outside this repository.
    const sourceIsCanonical = existing !== undefined
      && existing.includes(`<source>${SCHEMATIC}</source>`)

    if (existing !== undefined && sourceIsCanonical && exportsAgree(fresh, existing)) {
      return { changed: false, message: `${EXPORT} is current.` }
    }

    if (existing !== undefined && exportsAgree(fresh, existing)) {
      fs.writeFileSync(EXPORT, fresh)
      const runToJsonOnly = deps.runToJson ?? defaultRunToJson
      runToJsonOnly(EXPORT, NETLIST_JSON)
      return {
        changed: true,
        message:
          `${EXPORT} described the same circuit but named a source outside this repository; ` +
          `its <source> is now ${SCHEMATIC}. No component or connection changed.`,
      }
    }

    fs.writeFileSync(EXPORT, fresh)
    const runToJson = deps.runToJson ?? defaultRunToJson
    runToJson(EXPORT, NETLIST_JSON)

    return {
      changed: true,
      message:
        `${EXPORT} DID NOT MATCH ${SCHEMATIC} and has been rewritten, along with ` +
        `${NETLIST_JSON}.\n` +
        "  The reference network is built from those, and all five Pultec boards are built " +
        "from it, so their layouts may no longer realize the circuit. Read the diff, then " +
        "re-check every board.",
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
}
