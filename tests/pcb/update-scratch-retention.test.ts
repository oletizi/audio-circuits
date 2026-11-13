/**
 * THE SCRATCH-RETENTION CONTRACT, OVER EVERY GUARD AT ONCE.
 *
 * `tools/pcb/update-from-schematic.ts` makes a scratch directory per run and
 * keeps it after a refusal only when that refusal says it left evidence there.
 * Two halves have to hold together, and neither is worth much alone:
 *
 *  1. The directory survives EXACTLY when `UpdateRefusal.keepsEvidence` is set.
 *  2. A refusal that sets it NAMES a path inside that directory in its own
 *     message - otherwise the flag points a person at evidence they cannot find.
 *
 * WHY THIS FILE EXISTS. Retention was first decided by searching the refusal's
 * message for the scratch path. That read as "it follows from the fact", but it
 * was a string search: rewording any refusal silently changed whether its
 * evidence survived, and only one of the four scratch-keeping guards had a test,
 * so nothing went red. The flag replaced the search, and this file is what makes
 * the replacement checkable - including half 2, which is the only thing the old
 * string search did give for free.
 *
 * THE GUARDS ARE ENUMERATED FROM THE CODE, through `UPDATE_GUARDS`, and every
 * one must appear in `DRIVERS` below or this file fails. A twelfth guard added
 * later cannot quietly escape the contract by not being on a hand-written list.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch, tempScratchMatching } from "../support/temp-scratch.ts"
import { updateBoardFromSchematic, UpdateRefusal } from "../../tools/pcb/update-from-schematic.ts"
import type { PythonRunner } from "../../tools/pcb/update-from-schematic.ts"
import { UPDATE_GUARDS } from "../../tools/pcb/update-refusal.ts"
import type { UpdateGuard } from "../../tools/pcb/update-refusal.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
const CIRCUIT = path.join(REPO_ROOT, "circuits", "pt2399-core")
const FIXTURES = path.join(REPO_ROOT, "tests", "fixtures", "pcb")
const SCRATCH_PREFIX = "pcb-retention-test-"

function toolScratchDirs(): readonly string[] {
  return tempScratchMatching("pcb-update-")
}

const PRE_EXISTING_TOOL_SCRATCH = new Set(toolScratchDirs())

afterAll(() => {
  // The directories a retaining refusal left are this file's to clear up: the
  // assertions prove the behaviour, and this hook is what keeps TMPDIR as the
  // file found it. Ones that were already here are not this file's to delete.
  for (const dir of toolScratchDirs()) {
    if (!PRE_EXISTING_TOOL_SCRATCH.has(dir)) fs.rmSync(dir, { recursive: true, force: true })
  }
})
afterAll(cleanUpTempScratch)

/** The pt2399-core board, schematic and project copied to a scratch directory under one basename. */
function scratchCircuit(): { board: string; schematic: string } {
  const dir = freshTempScratch(SCRATCH_PREFIX)
  for (const extension of ["kicad_pcb", "kicad_sch", "kicad_pro"]) {
    fs.copyFileSync(path.join(CIRCUIT, `pt2399-core.${extension}`), path.join(dir, `pt2399-core.${extension}`))
  }
  return { board: path.join(dir, "pt2399-core.kicad_pcb"), schematic: path.join(dir, "pt2399-core.kicad_sch") }
}

/** A minimal `kicadsexpr` export, for the guards that are about a netlist's content. */
function netlistText(comps: readonly string[], nets: readonly string[]): string {
  return `(export\n\t(version "E")\n\t(components\n${comps.join("\n")}\n\t)\n\t(nets\n${nets.join("\n")}\n\t)\n)\n`
}

function comp(ref: string, footprint: string | null): string {
  const fp = footprint === null ? "" : `\n\t\t\t(footprint "${footprint}")`
  return (
    `\t\t(comp\n\t\t\t(ref "${ref}")\n\t\t\t(value "1n")${fp}\n` +
    `\t\t\t(sheetpath\n\t\t\t\t(names "/")\n\t\t\t\t(tstamps "/")\n\t\t\t)\n` +
    `\t\t\t(tstamps "00000000-0000-4000-8000-00000000000${ref.length}")\n\t\t)`
  )
}

function net(name: string, members: readonly { ref: string; pin: string }[]): string {
  const nodes = members
    .map((m) => `\t\t\t(node\n\t\t\t\t(ref "${m.ref}")\n\t\t\t\t(pin "${m.pin}")\n\t\t\t)`)
    .join("\n")
  return `\t\t(net\n\t\t\t(code "1")\n\t\t\t(name "${name}")\n${nodes}\n\t\t)`
}

function fakeExport(text: string): (schPath: string, outPath: string) => void {
  return (_schPath, outPath) => {
    fs.writeFileSync(outPath, text)
  }
}

const REAL_CAP = "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm"

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

/** Writes `content` where the writer was asked to put the board, and exits 0. */
function writerProducing(content: string | { copyFrom: string }): PythonRunner {
  return (_interpreter, _script, instructions) => {
    const out = boardOutOf(instructions)
    if (typeof content === "string") fs.writeFileSync(out, content)
    else fs.copyFileSync(content.copyFrom, out)
    return { status: 0, stdout: "{}", stderr: "" }
  }
}

/**
 * One driver per guard, each reaching THAT guard. The flag is not written down
 * here: what is asserted is the refusal's OWN `keepsEvidence` against what
 * actually happened on disk, so a driver cannot encode the answer it is
 * checking.
 */
const DRIVERS: Readonly<Record<UpdateGuard, () => void>> = {
  // A python half that exits non-zero: the instruction file is the evidence.
  invocation: () => {
    const { board, schematic } = scratchCircuit()
    const failing: PythonRunner = () => ({ status: 3, stdout: "", stderr: "boom" })
    updateBoardFromSchematic(board, { schematicPath: schematic, runPython: failing })
  },
  // An export with a (components) section and nothing in it, which is what
  // kicad-cli writes - exiting 0 - for a schematic with no symbols.
  "netlist-components": () => {
    const { board, schematic } = scratchCircuit()
    updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(netlistText([], [])) })
  },
  "netlist-nodes": () => {
    const { board, schematic } = scratchCircuit()
    const text = netlistText(
      [comp("C1", REAL_CAP), comp("C22", REAL_CAP)],
      [net("VCC", [{ ref: "C1", pin: "1" }]), net("VCC", [{ ref: "C22", pin: "1" }])],
    )
    updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(text) })
  },
  // The WRITTEN board is unparseable - the input-board case is in
  // ./update-from-schematic.test.ts, and the two differ exactly in whether the
  // unreadable file is inside the scratch directory.
  "board-unreadable": () => {
    const { board, schematic } = scratchCircuit()
    updateBoardFromSchematic(board, {
      schematicPath: schematic,
      runPython: writerProducing("(kicad_pcb\n\t(version 20260206)\n"),
    })
  },
  "board-not-empty": () => {
    const { board, schematic } = scratchCircuit()
    fs.copyFileSync(path.join(FIXTURES, "good", "pair.kicad_pcb"), board)
    updateBoardFromSchematic(board, { schematicPath: schematic })
  },
  "library-nickname": () => {
    const { board, schematic } = scratchCircuit()
    const text = netlistText(
      [comp("C1", "SYNTHETIC:NoFootprintOfThisName")],
      [net("VCC", [{ ref: "C1", pin: "1" }])],
    )
    updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(text) })
  },
  "footprint-not-in-library": () => {
    const { board, schematic } = scratchCircuit()
    const text = netlistText(
      [comp("C1", "Capacitor_THT:NoSuchFootprintName")],
      [net("VCC", [{ ref: "C1", pin: "1" }])],
    )
    updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(text) })
  },
  "net-member": () => {
    const { board, schematic } = scratchCircuit()
    const text = netlistText([comp("C1", REAL_CAP)], [net("VCC", [{ ref: "C1", pin: "3" }])])
    updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(text) })
  },
  "python-interpreter": () => {
    const { board, schematic } = scratchCircuit()
    updateBoardFromSchematic(board, {
      schematicPath: schematic,
      kicadPython: path.join(board, "..", "no-such-python3"),
    })
  },
  "post-run-counts": () => {
    const { board, schematic } = scratchCircuit()
    updateBoardFromSchematic(board, {
      schematicPath: schematic,
      runPython: writerProducing({ copyFrom: path.join(FIXTURES, "good", "pair.kicad_pcb") }),
    })
  },
  // The real pcbnew discards this legacy key on load-and-save.
  "setup-block": () => {
    const { board, schematic } = scratchCircuit()
    const original = fs.readFileSync(board, "utf8")
    fs.writeFileSync(
      board,
      original.replace("\t\t(pad_to_mask_clearance 0)\n", "\t\t(pad_to_mask_clearance 0)\n\t\t(zone_45_only no)\n"),
    )
    updateBoardFromSchematic(board, { schematicPath: schematic })
  },
  "component-footprint": () => {
    const { board, schematic } = scratchCircuit()
    const text = netlistText([comp("C1", null)], [net("VCC", [{ ref: "C1", pin: "1" }])])
    updateBoardFromSchematic(board, { schematicPath: schematic, exportNetlist: fakeExport(text) })
  },
}

test("every guard in UPDATE_GUARDS has a driver here, so a new one cannot escape the contract", () => {
  expect(Object.keys(DRIVERS).sort()).toEqual([...UPDATE_GUARDS].sort())
  expect(UPDATE_GUARDS.length).toBeGreaterThan(0)
})

for (const guard of UPDATE_GUARDS) {
  test(`${guard}: the scratch directory survives exactly when the refusal says it is evidence`, () => {
    const drive = DRIVERS[guard]
    const before = new Set(toolScratchDirs())
    let refusal: UpdateRefusal | undefined
    try {
      drive()
    } catch (error) {
      if (!(error instanceof UpdateRefusal)) throw error
      refusal = error
    }
    if (refusal === undefined) throw new Error(`the ${guard} driver did not refuse`)
    expect(refusal.guard).toBe(guard)

    const kept = toolScratchDirs().filter((dir) => !before.has(dir))
    if (refusal.keepsEvidence) {
      // Half 1: it survived. Half 2: the message says where it is, so the flag
      // points at something a person can open.
      expect(kept.length).toBe(1)
      const keptDir = kept[0] ?? ""
      expect(refusal.message).toContain(keptDir)
      expect(fs.readdirSync(keptDir).length).toBeGreaterThan(0)
      fs.rmSync(keptDir, { recursive: true, force: true })
      return
    }
    expect(kept).toEqual([])
  })
}

test("at least one guard keeps evidence and at least one does not, so neither arm is vacuous", () => {
  // Without this, a mutation that made keepsEvidence always false would leave
  // every case above passing through its else branch.
  const flags = UPDATE_GUARDS.map((guard) => {
    try {
      DRIVERS[guard]()
    } catch (error) {
      if (error instanceof UpdateRefusal) return error.keepsEvidence
      throw error
    }
    throw new Error(`the ${guard} driver did not refuse`)
  })
  expect(flags.filter((kept) => kept).length).toBeGreaterThan(0)
  expect(flags.filter((kept) => !kept).length).toBeGreaterThan(0)
})
