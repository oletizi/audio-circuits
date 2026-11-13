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
 *
 * THE SCRATCH-RETENTION CONTRACT IS NOT HERE. It is in
 * `./update-scratch-retention.test.ts`, which iterates every guard in
 * `UPDATE_GUARDS` rather than sampling two of them; the two worked cases that
 * used to sit in this file are deleted rather than left beside it, because a
 * second partial copy of a contract is the thing that goes stale. What stays
 * here is the success side: a run that succeeds leaves no scratch directory.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch, tempScratchMatching } from "../support/temp-scratch.ts"
import {
  lostSetupKeys,
  PLACEMENT,
  updateBoardFromSchematic,
  UpdateRefusal,
} from "../../tools/pcb/update-from-schematic.ts"
import type { PythonRunner, UpdateGuard } from "../../tools/pcb/update-from-schematic.ts"
import { planNets } from "../../tools/pcb/update-instructions.ts"
import { defaultRunPython } from "../../tools/pcb/update-io.ts"
import { surveyBoard } from "../../tools/pcb/board-survey.ts"
import { runDrc } from "../../tools/pcb/drc.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
const CIRCUIT = path.join(REPO_ROOT, "circuits", "pt2399-core")
const FIXTURES = path.join(REPO_ROOT, "tests", "fixtures", "pcb")

/**
 * The tool's OWN scratch directories under TMPDIR, which
 * `tests/stripboard/temp-scratch.test.ts` cannot see: that audit scans `tests/`,
 * and these are made in `tools/`. They leaked on every refusal once, so the
 * count is asserted here rather than left to a guard that is blind to it - and
 * `./update-scratch-retention.test.ts` holds the contract over every guard.
 */
function toolScratchDirs(): readonly string[] {
  return tempScratchMatching("pcb-update-")
}

const PRE_EXISTING_TOOL_SCRATCH = new Set(toolScratchDirs())

/**
 * Remove the tool's own scratch directories THIS FILE caused, and only those.
 *
 * The tool keeps its scratch for a refusal whose message names a path inside it
 * - that is the retention rule, and two tests below drive such a refusal
 * deliberately. Those directories are this file's to clear up: the per-test
 * assertions prove the behaviour, and this hook is what keeps TMPDIR as the file
 * found it. Directories that were already there when this file loaded are left
 * alone; they are not this file's to delete.
 */
afterAll(() => {
  for (const dir of toolScratchDirs()) {
    if (!PRE_EXISTING_TOOL_SCRATCH.has(dir)) fs.rmSync(dir, { recursive: true, force: true })
  }
})

/** Every scratch directory below goes through the one registry; see tests/support/temp-scratch.ts. */
const SCRATCH_PREFIX = "pcb-update-test-"
afterAll(cleanUpTempScratch)

/** The pt2399-core board, schematic and project copied to a scratch directory under one basename. */
function scratchCircuit(): { dir: string; board: string; schematic: string } {
  const dir = freshTempScratch(SCRATCH_PREFIX)
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
  const scratchBefore = toolScratchDirs().length

  const result = updateBoardFromSchematic(board, { schematicPath: schematic })

  // The resolver found libraries. A NUMBER is deliberately not asserted: how
  // many a machine resolves is a property of that machine, and this is the part
  // that must not silently become zero.
  expect(result.librariesResolved).toBeGreaterThan(0)
  // A successful run leaves no scratch directory behind.
  expect(toolScratchDirs().length).toBe(scratchBefore)

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
  const dir = freshTempScratch(SCRATCH_PREFIX)
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
  const dir = freshTempScratch(SCRATCH_PREFIX)
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
  // THE NICKNAME IS `SYNTHETIC`, this repository's own marker for a footprint
  // name that is deliberately fictional (tests/kicad/footprint-sweep.ts). The
  // refusal needs a nickname NO fp-lib-table defines, and that sweep asserts
  // KiCad ships no library by this name and that the name half is installed
  // nowhere - so the one thing this test needs is the one thing that list
  // guarantees, and an invented nickname of my own would have been a new
  // fictional footprint name for the sweep to find.
  const netlist = netlistText(
    [{ ref: "R1", value: "10k", footprint: "SYNTHETIC:NoFootprintOfThisName" }],
    [{ name: "IN", nodes: [{ ref: "R1", pin: "1" }] }],
  )
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(netlist) }),
    "library-nickname",
  )
  expect(refusal.message).toContain("SYNTHETIC")
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
  // exits 0, prints a healthy-looking summary, and writes a board that does not
  // match. The real writer cannot be asked to do that, and a check that trusted
  // the summary would pass here.
  //
  // IT WRITES A TWO-FOOTPRINT BOARD, not the empty one, so the destination
  // assertion below can fail. With an empty board on both sides, "the
  // destination is untouched" held whether or not the copy had happened - a
  // vacuous assertion that read as coverage, and it let the mutation that moves
  // copyFileSync ahead of R7 and R8 leave this test green.
  const liar: PythonRunner = (_interpreter, _script, instructions) => {
    fs.copyFileSync(path.join(FIXTURES, "good", "pair.kicad_pcb"), boardOutOf(instructions))
    return { status: 0, stdout: JSON.stringify({ footprints: 24, nettedPads: 65 }), stderr: "" }
  }
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, runPython: liar }),
    "post-run-counts",
  )
  expect(refusal.message).toContain("2 footprint(s)")
  expect(refusal.message).toContain("24 component(s)")
  expect(refusal.message).toContain("65 node(s)")
  // The destination is untouched by a refused run - and the two cases are now
  // distinguishable, because the board the writer produced has 2 footprints.
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

test("R8 compares (setup) keys with multiplicity: a key written twice and saved once has lost one", () => {
  // The real pcbnew collapses the repeat on load-and-save, so this is a real
  // loss and not a contrived one. A deduplicated key SET would read it as no
  // loss at all, which is not what "any key present before is absent after"
  // says.
  const { board, schematic } = scratchCircuit()
  const original = fs.readFileSync(board, "utf8")
  fs.writeFileSync(
    board,
    original.replace(
      "\t\t(pad_to_mask_clearance 0)\n",
      "\t\t(pad_to_mask_clearance 0)\n\t\t(pad_to_mask_clearance 0)\n",
    ),
  )
  expect(surveyBoard(board).setupKeys.filter((key) => key === "pad_to_mask_clearance").length).toBe(2)

  const refusal = expectGuard(() => updateBoardFromSchematic(board, { schematicPath: schematic }), "setup-block")
  expect(refusal.message).toContain("1 key(s)")
  expect(refusal.message).toContain("pad_to_mask_clearance")
})

test("lostSetupKeys is a multiset comparison, and additions are not losses", () => {
  expect(lostSetupKeys(["a", "a", "b"], ["a", "b"])).toEqual(["a"])
  expect(lostSetupKeys(["a", "b"], ["a", "b", "c", "c"])).toEqual([])
  expect(lostSetupKeys(["a", "b"], ["b"])).toEqual(["a"])
  expect(lostSetupKeys([], ["a"])).toEqual([])
})

test("a repeated net name in the export is refused, because the parse would silently discard one", () => {
  // THE FALSE GREEN THIS CLOSES. importNetlist keys nets by name in a Record, so
  // a second net of the same name LAST-WINS and the first one's nodes vanish.
  // R7's right-hand side is counted from the export TEXT rather than from that
  // collapsed map, which is the only reason the loss is visible at all - summed
  // from the map, a board missing half a net would match its own netlist.
  const { board, schematic } = scratchCircuit()
  const netlist = netlistText(
    [
      { ref: "C1", value: "100nF", footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" },
      { ref: "C2", value: "100nF", footprint: "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm" },
    ],
    [
      { name: "VCC", nodes: [{ ref: "C1", pin: "1" }] },
      { name: "VCC", nodes: [{ ref: "C2", pin: "1" }, { ref: "C2", pin: "2" }] },
    ],
  )
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(netlist) }),
    "netlist-nodes",
  )
  expect(refusal.message).toContain("3 (node) form(s)")
  expect(refusal.message).toContain("parses to 2")
  expect(refusal.message).toContain("REPEATED (net (name ...))")
})

test("planNets refuses a net member whose designator has no loaded footprint", () => {
  // REACHED DIRECTLY, because the orchestrator cannot reach it: importNetlist
  // refuses an undeclared designator first. planNets is exported and a later
  // caller - the placer - may hand it a pad map built some other way, so the
  // branch is kept and driven here rather than left as unreachable code.
  const refusal = refusalOf(() => planNets({ VCC: ["R9.1"] }, new Map()))
  expect(refusal.guard).toBe("net-member")
  expect(refusal.message).toContain('net "VCC"')
  expect(refusal.message).toContain("R9")
  expect(refusal.message).toContain("no component declares")
})

test("a board this tool cannot parse is a refusal, not a raw reader error", () => {
  const { board, schematic } = scratchCircuit()
  fs.writeFileSync(board, "(kicad_pcb\n\t(version 20260206)\n")
  const refusal = expectGuard(() => updateBoardFromSchematic(board, { schematicPath: schematic }), "board-unreadable")
  expect(refusal.message).toContain(board)
  expect(refusal.message).toContain("unbalanced")
})

test("an output directory that does not exist is refused before any work, not as an ENOENT after it", () => {
  const { board, schematic } = scratchCircuit()
  const absent = path.join(board, "..", "no-such-directory", "pt2399-core.kicad_pcb")
  const scratchBefore = toolScratchDirs().length
  const refusal = expectGuard(
    () => updateBoardFromSchematic(board, { schematicPath: schematic, outputPath: absent }),
    "invocation",
  )
  expect(refusal.message).toContain("no-such-directory")
  // Refused BEFORE the work: nothing ran, so there is no scratch directory and
  // no board was left written in one.
  expect(toolScratchDirs().length).toBe(scratchBefore)
  expect(surveyBoard(board).footprints).toBe(0)
})

test("an interpreter that will not spawn is a refusal from the runner itself, not a raw spawn error", () => {
  // DRIVEN DIRECTLY, because the orchestrator cannot reach it: R6 refuses a
  // non-executable interpreter before any spawn is attempted. The branch is
  // still live - an interpreter that passes the executable check and then fails
  // to spawn (a bad interpreter line, a broken binary) lands here - and it had
  // no test before.
  const refusal = refusalOf(() => defaultRunPython(path.join(CIRCUIT, "no-such-python3"), "x.py", "y.json"))
  expect(refusal.guard).toBe("invocation")
  expect(refusal.message).toContain("no-such-python3")
  expect(refusal.message).toContain("could not run")
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
