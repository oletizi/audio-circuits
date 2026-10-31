/**
 * **THE SAME `kicad-cli` ROUND-TRIP PROOF `./kicad-round-trip.ts`'s `kicadRoundTrip` GAVE THE
 * STUB WRITER, FOR A BOARD THAT ALREADY HAS A COMMITTED SCHEMATIC AND NEEDS NO STUB.**
 *
 * The five `transistor-preamp` boards each carry a committed, real `.kicad_sch` under
 * `circuits/transistor-preamp/` - not a `drafted/` approved page, but not a throwaway either: it is
 * the file their own `perfboard.json` declares as `"sch"`, and `make/board.mk`'s `netlist-agrees`
 * re-exports and reconciles it on every `make check` run, the same mechanism the five Pultec pages
 * use. **Nothing about that file or that mechanism depends on `lib/kicad/schematic.ts`'s stub
 * writer** - it reads whatever bytes are already committed. What DOES depend on the stub writer,
 * today, is only the one `bun test`-time check that regenerates a FRESH stub from the live model
 * via `writeSchematicStub` and exports THAT instead of the committed file - `kicadRoundTrip` in
 * `./kicad-round-trip.ts`, which dies with the writer.
 *
 * **THIS MODULE IS THE REPLACEMENT FOR THAT ONE CHECK, POINTED AT THE SHEET THESE BOARDS ALREADY
 * HAVE** rather than at a freshly-written throwaway: export the committed `.kicad_sch` with the
 * real `kicad-cli`, right now, inside `bun test`, and compare the result against the model.
 *
 * **WHY THE COMPARISON IS `expectSameCircuit` AND NOT `compareSheetToModel`.**
 * `./drafted-sheet.ts`'s header explains why `compareSheetToModel` exists at all: a Pultec section
 * board's off-board parts (inductor taps, panel pots, selectors) have no VeroRoute footprint or pin
 * numbering, so lowering through `toImportedNetlist` would report every one of them as a
 * disagreement about a vocabulary neither side is wrong in. **None of that applies here.** Every
 * `transistor-preamp` board is a VeroRoute-routed perfboard with a `DESIGNATORS` map and a
 * `PIN_NUMBERS` map built for exactly `toImportedNetlist`'s vocabulary - the same vocabulary
 * `expectSameCircuit` already compares through for the schematic-stub proof these boards carry
 * today. Forcing them through `compareSheetToModel` would be the wrong tool for a board that was
 * never off-board in the first place; using `expectSameCircuit`'s own comparison, pointed at a live
 * export instead of a stub's, is the one that is honest about what these boards are.
 *
 * **NOTHING HERE IS IMPORTED FROM `./kicad-round-trip.ts`.** That file's `expectSameCircuit` is
 * reproduced below rather than reused, because `./kicad-round-trip.ts` is deleted along with the
 * stub writer it exists to round-trip, and this module's whole point is to survive that deletion -
 * the same reason `lib/kicad/sheet-agreement.ts` imports nothing from `lib/schgen/`. `partition`,
 * `valuesOf` and `expectSameCircuit` below are byte-for-byte the same logic as `./kicad-round-trip.ts`'s,
 * because the comparison itself was never the thing depending on the stub writer - only the one
 * caller that handed it freshly-stubbed output was.
 */
import { expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import { importNetlist, KICAD_CLI } from "../../lib/kicad/netlist.ts"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import type { Network } from "../../lib/model/types.ts"
import { defaultKicadCliExists, defaultRunExport } from "../../tools/perfboard/netlist-sync.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

export interface BoardUnderTest {
  readonly network: Network
  readonly designators: Readonly<Record<string, string>>
  readonly pinNumbers: PinNumbers
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

/**
 * Exports the committed schematic at `repoRelativeSchPath` with the real `kicad-cli`, right now,
 * and imports the result.
 *
 * **FAILS RATHER THAN SKIPS WHEN `kicad-cli` IS ABSENT**, in `kicadRoundTrip`'s own wording: a
 * missing binary here would make this the only one of this repository's `kicad-cli` proofs that
 * silently passed without ever running it.
 */
export function exportCommittedSheet(repoRelativeSchPath: string, stem: string): ImportedNetlist {
  if (!defaultKicadCliExists(KICAD_CLI)) {
    throw new Error(
      `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI. This test ` +
        "does not skip: it is the only proof KiCad reads the committed schematic the way the circuit means it.",
    )
  }
  const repoRoot = moduleRepoRoot()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${stem}-committed-export-`))
  try {
    const net = path.join(dir, `${stem}.net`)
    defaultRunExport(KICAD_CLI, path.join(repoRoot, repoRelativeSchPath), net, repoRoot)
    return importNetlist(fs.readFileSync(net, "utf8"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
