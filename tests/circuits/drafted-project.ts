/**
 * **THE GUARD BEHIND A MULTI-PAGE DRAWING (design change C3)**: a hierarchical KiCad project - a
 * root sheet and one sheet per block - committed as `<dir>/<board>.kicad_sch` plus
 * `<dir>/<block>.kicad_sch`, with one `RECORD.md` naming every sheet's sha256.
 *
 * It is `./drafted-sheet.ts`'s `registerDraftedPageTests` for a project, and differs where a
 * project differs:
 *
 * - **It exports the ROOT with `kicad-cli`, right now, and compares the WHOLE board model.** The
 *   export of the root is what says how the pages connect: a sheet pin, a hierarchical label and a
 *   root wire are only connectivity once KiCad has read them together. A page compared on its own
 *   would say nothing about the boundary.
 * - **Every model component appears exactly once across the sheets, under its designator**, read
 *   off the sheets themselves - and each block's parts are on that block's sheet, the root holding
 *   none. An export collapses a reference drawn twice into one component, so this is read from the
 *   sheet text, not the export.
 * - **Every sheet's sha256 is checked against `RECORD.md`'s table**, one row per sheet, exactly one
 *   of them the root.
 *
 * Kept out of `./drafted-sheet.ts` for that file's length; re-exported from it, so a board's own
 * test imports one module whichever kind of page it has.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { importNetlist, KICAD_CLI, type ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { parseSexpr, child } from "../../lib/kicad/sexpr.ts"
import type { Network } from "../../lib/model/types.ts"
import { defaultKicadCliExists, defaultRunExport } from "../../tools/perfboard/netlist-sync.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { assertFootprintComparisons, sha256OfFile, withOnePinMoved } from "./drafted-sheet.ts"

export interface ProjectModel {
  readonly network: Network
  readonly designators: ReadonlyMap<string, string>
  readonly pinNumbers: ReadonlyMap<string, ReadonlyMap<string, string>>
}

export interface DraftedProjectUnderTest {
  readonly board: string
  /** The circuit directory under `drafted/`; the project lives at `drafted/<circuit>/<board>/` unless `dir` says otherwise. */
  readonly circuit: string
  /** Absolute directory holding the project, for a project kept outside `drafted/` (the C3 test fixture). */
  readonly dir?: string
  /** The root's committed netlist export, repository-relative. */
  readonly netlist: string
  readonly model: () => ProjectModel
  /** `compareSheetToModel`'s `pinIdentity` list, exactly. */
  readonly pinDisagreements: readonly string[]
  /** `compareSheetToModel`'s `values` list, exactly. */
  readonly valueDisagreements: readonly string[]
  readonly footprintComparisons: "some" | "none"
  readonly footprintlessParts: readonly string[]
}

export function projectDir(project: Pick<DraftedProjectUnderTest, "board" | "circuit" | "dir">): string {
  return project.dir ?? path.join(moduleRepoRoot(), "drafted", project.circuit, project.board)
}

export interface RecordedSheet {
  readonly file: string
  readonly role: string
  readonly sha256: string
}

/** The sheet table in `<dir>/RECORD.md`: one row per sheet, exactly one of them the root. Throws naming the file otherwise. */
export function recordedSheets(dir: string): RecordedSheet[] {
  const file = path.join(dir, "RECORD.md")
  const text = fs.readFileSync(file, "utf8")
  const rows = [...text.matchAll(/^\| `([^`]+\.kicad_sch)` \| (root|block [A-Za-z0-9_]+) \| `([0-9a-f]{64})` \|$/gm)].map(
    (m): RecordedSheet => ({ file: m[1] ?? "", role: m[2] ?? "", sha256: m[3] ?? "" }),
  )
  const roots = rows.filter((r) => r.role === "root")
  if (rows.length === 0 || roots.length !== 1) {
    throw new Error(
      `${file}: expected a sheet table with exactly one root row, found ${rows.length} rows and ${roots.length} root ` +
        "rows. The table is what binds each committed sheet's bytes; without it nothing here knows which bytes were drawn.",
    )
  }
  return rows
}

/** Export `<dir>/<board>.kicad_sch` - the root, and through it every sheet - with the real kicad-cli, now. */
export function exportProjectRoot(dir: string, board: string): ImportedNetlist {
  if (!defaultKicadCliExists(KICAD_CLI)) {
    throw new Error(
      `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI. This does not skip: the export of the ` +
        "root is the only evidence of how the pages connect.",
    )
  }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), `${board}-project-export-`))
  try {
    const net = path.join(out, `${board}.net`)
    defaultRunExport(KICAD_CLI, path.join(dir, `${board}.kicad_sch`), net, moduleRepoRoot())
    return importNetlist(fs.readFileSync(net, "utf8"))
  } finally {
    fs.rmSync(out, { recursive: true, force: true })
  }
}

/** The Reference of every placed, non-power symbol on one sheet, in file order. */
export function placedReferences(sheetFile: string): string[] {
  const root = parseSexpr(fs.readFileSync(sheetFile, "utf8"))
  const refs: string[] = []
  for (const node of root.nodes) {
    if (node.name !== "symbol" || child(node, "lib_id") === undefined) continue
    const reference = node.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")?.atoms[1]
    if (reference === undefined) throw new Error(`${sheetFile}: a placed symbol has no Reference property.`)
    if (!reference.startsWith("#")) refs.push(reference)
  }
  return refs
}

export function registerDraftedProjectTests(project: DraftedProjectUnderTest): void {
  const { board, netlist } = project
  const dir = projectDir(project)

  test(`${board}: every committed sheet hashes to the digest its RECORD.md row binds it to`, () => {
    const rows = recordedSheets(dir)
    const blocks = project.model().network.blocks.map((b) => b.prefix)
    expect(rows.map((r) => r.file).sort()).toEqual([`${board}.kicad_sch`, ...blocks.map((b) => `${b}.kicad_sch`)].sort())
    for (const row of rows) expect(sha256OfFile(path.join(dir, row.file)), row.file).toBe(row.sha256)
  })

  test(`${board}: a record with no root row refuses rather than answering - the control for the parse`, () => {
    const stand = fs.mkdtempSync(path.join(os.tmpdir(), `${board}-record-rootless-`))
    try {
      const text = fs.readFileSync(path.join(dir, "RECORD.md"), "utf8")
      const rootless = text.split("\n").filter((line) => !line.includes("| root |")).join("\n")
      expect(rootless, "the record has no root row to remove").not.toBe(text)
      fs.writeFileSync(path.join(stand, "RECORD.md"), rootless)
      expect(() => recordedSheets(stand)).toThrow(/root/)
    } finally {
      fs.rmSync(stand, { recursive: true, force: true })
    }
  })

  test(`${board}: every model component is drawn exactly once across the sheets, under its designator, on its block's sheet`, () => {
    const { network, designators } = project.model()
    expect(placedReferences(path.join(dir, `${board}.kicad_sch`))).toEqual([])
    const drawn: string[] = []
    for (const block of network.blocks) {
      const onSheet = placedReferences(path.join(dir, `${block.prefix}.kicad_sch`))
      const expected = block.componentIds.map((id) => designators.get(id) ?? `<no designator for ${id}>`)
      expect([...onSheet].sort(), `block ${block.prefix}'s sheet`).toEqual([...expected].sort())
      drawn.push(...onSheet)
    }
    const all = network.components.map((c) => designators.get(c.id) ?? `<no designator for ${c.id}>`)
    expect([...drawn].sort()).toEqual([...all].sort())
    expect(new Set(drawn).size).toBe(drawn.length)
  })

  test(`${board}: the committed netlist was exported from the project's root and no other file`, () => {
    const text = fs.readFileSync(path.join(moduleRepoRoot(), netlist), "utf8")
    expect(text).toContain(`(source "${path.relative(moduleRepoRoot(), path.join(dir, `${board}.kicad_sch`))}")`)
  })

  test(`${board}: kicad-cli's export of the root, right now, agrees with the whole board model`, () => {
    const { network, designators, pinNumbers } = project.model()
    const fresh = compareSheetToModel(network, designators, pinNumbers, exportProjectRoot(dir, board))
    expect(fresh.componentIdentity).toEqual([])
    expect(fresh.netMembership).toEqual([])
    expect([...fresh.pinIdentity].sort()).toEqual([...project.pinDisagreements].sort())
    expect([...fresh.values].sort()).toEqual([...project.valueDisagreements].sort())
    assertFootprintComparisons(project.footprintComparisons, fresh, project.footprintlessParts, network.components.map((c) => c.id))
    // That the committed fixture says the same as this fresh export is
    // tests/circuits/drafted-kicad-round-trip.test.ts's claim, for projects as for pages.
  })

  test(`${board}: moving one pin in the fresh export is reported - the control for the zero above`, () => {
    const { network, designators, pinNumbers } = project.model()
    const moved = withOnePinMoved(exportProjectRoot(dir, board))
    expect(compareSheetToModel(network, designators, pinNumbers, moved).netMembership).not.toEqual([])
  })
}
