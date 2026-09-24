/**
 * The KiCad round trip, shared by every board whose schematic stub is
 * generated from its circuit: write the stub, export its netlist with the real
 * kicad-cli, and compare that export with the circuit by net membership (a
 * partition, ignoring net names), values and footprints.
 *
 * These are the repository's deliberate kicad-cli tests (spec
 * docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md, section 5
 * item 6): they are the only proof KiCad reads a stub the way the circuit
 * means it, so a missing kicad-cli FAILS them rather than skipping.
 */
import { expect } from "bun:test"
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { writeSchematicStub } from "../../lib/kicad/schematic.ts"
import type { Network } from "../../lib/model/types.ts"
import { defaultKicadCliExists, defaultRunExport } from "../../tools/perfboard/netlist-sync.ts"

/**
 * Duplicates the default `KICAD_CLI ?= ...` line in make/board.mk (the value
 * that recipe's `netlist-agrees` target falls back to) because a shared
 * constant across make and TypeScript is not possible; keep the two in sync
 * by hand if either changes. The `KICAD_CLI` env var overrides both.
 */
const KICAD_CLI = process.env["KICAD_CLI"] ?? "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"

export interface BoardUnderTest {
  readonly network: Network
  readonly designators: Readonly<Record<string, string>>
  readonly pinNumbers: PinNumbers
  readonly notes: readonly string[]
}

/** Nets as a partition of "designator.pin" members, ignoring net names. */
function partition(netlist: Pick<ImportedNetlist, "nets">): string[] {
  return Object.values(netlist.nets).map((members) => [...members].sort().join(" ")).sort()
}

function valuesOf(netlist: Pick<ImportedNetlist, "components">): Record<string, string> {
  return Object.fromEntries(netlist.components.map((c) => [c.designator, c.value]))
}

/** Asserts a KiCad netlist export describes exactly `board`'s circuit. */
export function expectSameCircuit(exported: ImportedNetlist, board: BoardUnderTest): void {
  const ours = toImportedNetlist(board.network, board.designators, board.pinNumbers)
  expect(partition(exported)).toEqual(partition(ours))
  expect(valuesOf(exported)).toEqual(valuesOf(ours))
  const footprints = new Map(exported.components.map((c) => [c.designator, c.footprint]))
  for (const component of board.network.components) {
    expect(footprints.get(board.designators[component.id] ?? "")).toBe(component.part?.footprint)
  }
}

/** Writes `board`'s stub to a temp directory, exports its netlist with kicad-cli,
 * and returns the imported export. Throws if kicad-cli is not installed. */
export function kicadRoundTrip(board: BoardUnderTest, stem: string): ImportedNetlist {
  if (!defaultKicadCliExists(KICAD_CLI)) {
    throw new Error(
      `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI. This test ` +
        "does not skip: it is the only proof KiCad reads the stub the way the circuit means it.",
    )
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${stem}-stub-`))
  try {
    const sch = path.join(dir, `${stem}.kicad_sch`)
    fs.writeFileSync(sch, writeSchematicStub({
      network: board.network, designators: board.designators, pinNumbers: board.pinNumbers,
      notes: board.notes, projectName: stem, newUuid: randomUUID,
    }))
    const net = path.join(dir, `${stem}.net`)
    defaultRunExport(KICAD_CLI, sch, net, dir)
    return importNetlist(fs.readFileSync(net, "utf8"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
