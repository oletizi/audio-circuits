/**
 * Checks for the headless Update PCB from Schematic
 * (`tools/pcb/update-from-schematic.ts`).
 *
 * THE FIRST TEST IS THE POINT OF THE TOOL, and it runs everything for real -
 * the real `kicad-cli`, the real KiCad Python with its real `pcbnew`, the real
 * `circuits/pt2399-core/` schematic and board, and then this project's OWN
 * parity gate as the authority on the result. It asserts the COUNTS and zero
 * parity findings, never merely an exit code: a tool that exits 0 having
 * written nothing is this repository's most-repeated failure.
 *
 * Everything here works on COPIES in temp directories. The committed board is
 * never a target, and neither is `boards/pt2399-core/`, which is the owner's
 * built stripboard layout. Running the tool against the committed board is a
 * separate, deliberate act.
 *
 * Two refusals are driven with an INJECTED runner rather than the real one, and
 * both say why in place: `post-run-counts` needs a writer that exits 0 having
 * written a board that does not match, which the real writer will not do on
 * demand, and that is exactly the failure the guard exists to catch. Every
 * other refusal is driven by real inputs.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { PLACEMENT, updateBoardFromSchematic, UpdateRefusal } from "../../tools/pcb/update-from-schematic.ts"
import type { PythonRunner, UpdateGuard } from "../../tools/pcb/update-from-schematic.ts"
import { surveyBoard } from "../../tools/pcb/board-survey.ts"
import { runDrc } from "../../tools/pcb/drc.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
const CIRCUIT = path.join(REPO_ROOT, "circuits", "pt2399-core")
const FIXTURES = path.join(REPO_ROOT, "tests", "fixtures", "pcb")

/** The pt2399-core board, schematic and project copied to a scratch directory under one basename. */
function scratchCircuit(): { dir: string; board: string; schematic: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcb-update-test-"))
  for (const extension of ["kicad_pcb", "kicad_sch", "kicad_pro"]) {
    fs.copyFileSync(path.join(CIRCUIT, `pt2399-core.${extension}`), path.join(dir, `pt2399-core.${extension}`))
  }
  return {
    dir,
    board: path.join(dir, "pt2399-core.kicad_pcb"),
    schematic: path.join(dir, "pt2399-core.kicad_sch"),
  }
}

function refusalOf(body: () => unknown): UpdateRefusal {
  try {
    body()
  } catch (error) {
    if (error instanceof UpdateRefusal) return error
    throw error
  }
  throw new Error("expected an UpdateRefusal but nothing was thrown")
}

function expectGuard(body: () => unknown, guard: UpdateGuard): UpdateRefusal {
  const refusal = refusalOf(body)
  expect(refusal.guard).toBe(guard)
  return refusal
}

interface FakeComponent {
  readonly ref: string
  readonly value: string
  readonly footprint?: string
}

interface FakeNet {
  readonly name: string
  readonly nodes: readonly { readonly ref: string; readonly pin: string }[]
}

/**
 * A `kicadsexpr` netlist in the shape `kicad-cli` writes, for the refusals that
 * are about a netlist's CONTENT - a nickname that does not resolve, a footprint
 * that is not in its library, a net member whose pad does not exist. Driving
 * those from the real schematic would mean editing the real schematic to be
 * wrong, which is a worse fixture than this.
 */
function netlistText(components: readonly FakeComponent[], nets: readonly FakeNet[]): string {
  const comps = components
    .map((component, index) => {
      const footprint = component.footprint === undefined ? "" : `\n\t\t\t(footprint "${component.footprint}")`
      return (
        `\t\t(comp\n\t\t\t(ref "${component.ref}")\n\t\t\t(value "${component.value}")${footprint}\n` +
        `\t\t\t(fields\n\t\t\t\t(field\n\t\t\t\t\t(name "Description") "a fake component")\n\t\t\t)\n` +
        `\t\t\t(sheetpath\n\t\t\t\t(names "/")\n\t\t\t\t(tstamps "/")\n\t\t\t)\n` +
        `\t\t\t(tstamps "00000000-0000-4000-8000-00000000000${index}")\n\t\t)`
      )
    })
    .join("\n")
  const netForms = nets
    .map((net, index) => {
      const nodes = net.nodes
        .map((node) => `\t\t\t(node\n\t\t\t\t(ref "${node.ref}")\n\t\t\t\t(pin "${node.pin}")\n\t\t\t)`)
        .join("\n")
      return `\t\t(net\n\t\t\t(code "${index + 1}")\n\t\t\t(name "${net.name}")\n${nodes}\n\t\t)`
    })
    .join("\n")
  return `(export\n\t(version "E")\n\t(components\n${comps}\n\t)\n\t(nets\n${netForms}\n\t)\n)\n`
}

/** The `boardOut` the tool asked the writer for, read back out of the instruction file. */
function boardOutOf(instructionsPath: string): string {
  const spec: unknown = JSON.parse(fs.readFileSync(instructionsPath, "utf8"))
  if (typeof spec !== "object" || spec === null || !("boardOut" in spec)) {
    throw new Error(`the instruction file at ${instructionsPath} has no boardOut`)
  }
  const out = spec.boardOut
  if (typeof out !== "string") throw new Error(`boardOut in ${instructionsPath} is not a string`)
  return out
}

/** Writes `text` as the export, in place of running kicad-cli. */
function fakeExport(text: string): (schPath: string, outPath: string) => void {
  return (_schPath, outPath) => {
    fs.writeFileSync(outPath, text)
  }
}

test("end to end: the real schematic's 24 components land on the real board, netted, and parity reports nothing", () => {
  const { board, schematic } = scratchCircuit()
  const before = surveyBoard(board)
  expect(before.footprints).toBe(0)

  const result = updateBoardFromSchematic(board, { schematicPath: schematic })

  // The counts, taken from the written file by tools/pcb/board-survey.ts - not
  // from the Python writer, and not from an exit code.
  expect(result.footprints).toBe(24)
  expect(result.nettedPads).toBe(65)
  expect(result.components).toBe(24)
  expect(result.nodes).toBe(65)
  const written = surveyBoard(board)
  expect(written.footprints).toBe(24)
  expect(written.nettedPads).toBe(65)

  // The project's OWN gate is the authority on whether the board says what the
  // schematic says. It reported 24 "Missing footprint" findings on this board
  // before this tool existed.
  const report = runDrc(board, { schematicPath: schematic })
  expect(report.schematicParity).toEqual([])
  expect(report.netlistComponents).toBe(24)

  // R8's allowed direction: KiCad writes out values it previously left
  // implicit, so the (setup) block GROWS. Nothing may disappear from it.
  for (const key of before.setupKeys) expect(written.setupKeys).toContain(key)
  expect(written.setupKeys.length).toBeGreaterThan(before.setupKeys.length)

  // The two cured defects that parity catches but no "Missing footprint" would:
  // every footprint carries its schematic link and its full Library:Name FPID.
  const text = fs.readFileSync(board, "utf8")
  expect((text.match(/\n\t\t\(path "\/[0-9a-f-]{36}"\)/g) ?? []).length).toBe(24)
  expect(text).toContain('(footprint "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm"')

  // The grid is scaffolding, but it has to actually separate the parts: no two
  // footprints share a position.
  const positions = text.match(/\n\t\t\(at [-0-9. ]+\)/g) ?? []
  expect(positions.length).toBeGreaterThanOrEqual(24)
  expect(text).toContain(`(at ${PLACEMENT.originMm} ${PLACEMENT.originMm})`)
})

test("R1 refuses a schematic that exports no components, although kicad-cli exits 0 on it", () => {
  // The real exporter against a real, valid, component-free schematic - the
  // whole point being that nothing in the process's result says anything is
  // wrong.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcb-update-test-"))
  const board = path.join(dir, "empty.kicad_pcb")
  fs.copyFileSync(path.join(CIRCUIT, "pt2399-core.kicad_pcb"), board)
  const schematic = path.join(dir, "empty.kicad_sch")
  fs.copyFileSync(path.join(FIXTURES, "empty-schematic", "empty.kicad_sch"), schematic)

  const refusal = expectGuard(() => updateBoardFromSchematic(board, { schematicPath: schematic }), "netlist-components")
  expect(refusal.message).toContain("EXITS 0")
  // The board is untouched: no footprint was added by a run that refused.
  expect(surveyBoard(board).footprints).toBe(0)
})

test("R2 refuses a board that already holds footprints, saying it must be empty and that placement regenerates", () => {
  const { schematic } = scratchCircuit()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcb-update-test-"))
  const board = path.join(dir, "pt2399-core.kicad_pcb")
  fs.copyFileSync(path.join(FIXTURES, "good", "pair.kicad_pcb"), board)
  expect(surveyBoard(board).footprints).toBe(2)

  const refusal = expectGuard(() => updateBoardFromSchematic(board, { schematicPath: schematic }), "board-not-empty")
  expect(refusal.message).toContain("2 footprint(s)")
  expect(refusal.message).toContain("must be empty of")
  expect(refusal.message).toContain("Placement is regenerated")
})

test("R3 refuses a footprint library nickname that no fp-lib-table defines, naming it and the tables searched", () => {
  const { board, schematic } = scratchCircuit()
  const netlist = netlistText(
    [{ ref: "R1", value: "10k", footprint: "NoSuchLibraryNickname:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal" }],
    [{ name: "IN", nodes: [{ ref: "R1", pin: "1" }] }],
  )
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(netlist) }),
    "library-nickname",
  )
  expect(refusal.message).toContain("NoSuchLibraryNickname")
  expect(refusal.message).toContain("fp-lib-table")
})

test("R4 refuses a footprint that is not in its resolved library directory, naming both", () => {
  const { board, schematic } = scratchCircuit()
  const netlist = netlistText(
    [{ ref: "C1", value: "100nF", footprint: "Capacitor_THT:NoSuchFootprintName" }],
    [{ name: "IN", nodes: [{ ref: "C1", pin: "1" }] }],
  )
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(netlist) }),
    "footprint-not-in-library",
  )
  expect(refusal.message).toContain("NoSuchFootprintName")
  expect(refusal.message).toContain("Capacitor_THT")
})

test("R5 refuses a net member naming a pad the loaded footprint does not have, naming net, designator and pad", () => {
  const { board, schematic } = scratchCircuit()
  // A real two-pad footprint, asked for a third pad.
  const netlist = netlistText(
    [{ ref: "C1", value: "100nF", footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" }],
    [{ name: "VCC", nodes: [{ ref: "C1", pin: "3" }] }],
  )
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(netlist) }),
    "net-member",
  )
  expect(refusal.message).toContain('net "VCC"')
  expect(refusal.message).toContain("C1")
  expect(refusal.message).toContain('pad "3"')
  expect(refusal.message).toContain("1, 2")
})

test("R5 refuses a net member naming a designator no component declares, under the same guard", () => {
  const { board, schematic } = scratchCircuit()
  const netlist = netlistText(
    [{ ref: "C1", value: "100nF", footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" }],
    [{ name: "VCC", nodes: [{ ref: "R9", pin: "1" }] }],
  )
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(netlist) }),
    "net-member",
  )
  expect(refusal.message).toContain('net "VCC"')
  expect(refusal.message).toContain("R9")
})

test("R6 refuses a missing or non-executable KiCad Python, naming the path and KICAD_PYTHON", () => {
  const { board, schematic } = scratchCircuit()
  const absent = path.join(board, "..", "no-such-python3")
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, kicadPython: absent }),
    "python-interpreter",
  )
  expect(refusal.message).toContain("no-such-python3")
  expect(refusal.message).toContain("KICAD_PYTHON")
})

test("R7 refuses a writer that exits 0 having written a board that does not match the netlist", () => {
  const { board, schematic } = scratchCircuit()
  // The injected writer stands in for the failure the guard exists for: it
  // exits 0, prints a healthy-looking summary, and writes a board with nothing
  // on it. The real writer cannot be asked to do that, and a check that trusted
  // the summary would pass here.
  const liar: PythonRunner = (_interpreter, _script, instructions) => {
    fs.copyFileSync(path.join(CIRCUIT, "pt2399-core.kicad_pcb"), boardOutOf(instructions))
    return { status: 0, stdout: JSON.stringify({ footprints: 24, nettedPads: 65 }), stderr: "" }
  }
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, runPython: liar }),
    "post-run-counts",
  )
  expect(refusal.message).toContain("0 footprint(s)")
  expect(refusal.message).toContain("24 component(s)")
  expect(refusal.message).toContain("0 netted pad(s)")
  expect(refusal.message).toContain("65 node(s)")
  // The destination is untouched by a refused run.
  expect(surveyBoard(board).footprints).toBe(0)
})

test("R8 fires on a real load-and-save that drops a (setup) key, naming the key", () => {
  // zone_45_only is a legacy KiCad setup key, and the real pcbnew DISCARDS it on
  // load-and-save - silently, with a parity check that still passes. That is the
  // whole class of loss R8 exists for, and this drives the guard with it rather
  // than with a board that merely passes.
  const { board, schematic } = scratchCircuit()
  const original = fs.readFileSync(board, "utf8")
  fs.writeFileSync(
    board,
    original.replace("\t\t(pad_to_mask_clearance 0)\n", "\t\t(pad_to_mask_clearance 0)\n\t\t(zone_45_only no)\n"),
  )
  expect(surveyBoard(board).setupKeys).toContain("zone_45_only")

  const refusal = expectGuard(() => updateBoardFromSchematic(board, { schematicPath: schematic }), "setup-block")
  expect(refusal.message).toContain("zone_45_only")
  expect(refusal.message).toContain("by key and not by size")
  // Nothing was written to the destination, so the key is still there to fix.
  expect(surveyBoard(board).setupKeys).toContain("zone_45_only")
  expect(surveyBoard(board).footprints).toBe(0)
})

test("a component with no (footprint) is refused, not placed on a guess", () => {
  const { board, schematic } = scratchCircuit()
  const netlist = netlistText([{ ref: "R1", value: "10k" }], [{ name: "IN", nodes: [{ ref: "R1", pin: "1" }] }])
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(netlist) }),
    "component-footprint",
  )
  expect(refusal.message).toContain("R1")
  expect(refusal.message).toContain("nothing may be guessed")
})

test("a missing board and a missing schematic are refusals, not crashes", () => {
  const { board, schematic } = scratchCircuit()
  expectGuard(() => updateBoardFromSchematic(path.join(board, "..", "absent.kicad_pcb"), { schematicPath: schematic }), "invocation")
  expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: path.join(schematic, "..", "absent.kicad_sch") }),
    "invocation",
  )
})
