/**
 * **SPEC §3b's REQUIRED GATE, DISCHARGED ON A REAL BOARD RATHER THAN ON A FIXTURE:** `pt2399-core`
 * pin 5's `NC` status survives GENERATION and ROUND-TRIP VERIFICATION. The spec
 * (`docs/superpowers/specs/2026-10-23-net-names-and-floating-pins-design.md`, §3b) states it as
 * *"an end-to-end test proving `pt2399-core` pin 5's `NC` status survives generation and
 * round-trip verification"*, and calls it a correctness gate rather than a serialization detail.
 *
 * **WHY THIS FILE EXISTS WHEN `tests/schgen/ir/nc-end-to-end.test.ts` ALREADY DRIVES `NC` END TO
 * END.** That file is Task 2's, it drives all four states §3b requires to stay distinguishable,
 * and it recorded its own reservation plainly: its subject is **one sheet on a hand-built fixture
 * network, and it runs no `kicad-cli`.** Both halves of what it reserved are what this file
 * supplies - a whole PROJECT generated from a circuit in `circuits/`, and the real `kicad-cli`
 * reading the result back. Neither file subsumes the other: the fixture keeps the four states
 * separable on a network built for that purpose, and this one proves the path holds on the board.
 *
 * **IT USES THE REAL `kicad-cli` AND FAILS RATHER THAN SKIPS WHEN IT IS MISSING**, which is the
 * convention `tests/schgen/gates/round-trip.kicad.test.ts` and `tests/circuits/kicad-round-trip.ts`
 * set and `docs/known-gaps.md` **G169** requires. A no-connect marker KiCad never read is not
 * evidence that KiCad reads it.
 *
 * **WHAT A GREEN RESULT HERE DOES NOT SAY.** `lib/schgen/gates/round-trip.ts`'s own module comment
 * is the authority and it says it first: this is SELF-consistency - the drawing agrees with the
 * model it was drawn from. The link that checks the MODEL against the AUTHORED schematic is
 * `tests/circuits/pt2399-core.test.ts`'s committed-netlist comparison, which is where the
 * pin-specific `NC` allowance lives (**G283**). And a passing round trip says nothing about
 * whether the sheet is LEGIBLE: this generation carries eight fallback field placements, recorded
 * in **G285**, and the assertion below pins that count rather than letting it read as a clean
 * drawing.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { importNetlist, KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import { roundTrip } from "../../../lib/schgen/gates/round-trip.ts"
import { stockSymbolDir } from "../../../lib/schgen/render/library.ts"
import { moduleRepoRoot } from "../../../tools/perfboard/repo-root.ts"
import { caseResolver } from "../../../tools/schgen/authoring-census.ts"
import { ALL_DECLARED_CASES } from "../../../tools/schgen/board-declarations.ts"
import { parityDesign } from "../../../tools/schgen/gate-census.ts"
import { generate, writeGeneration, type GenerateEnv } from "../../../tools/schgen/generate.ts"
import { kicadVersion } from "../../../tools/schgen/kicad-run.ts"
import { exportSexprNetlist } from "../../../tools/schgen/verify.ts"
import { cleanUpTempScratch, freshTempScratch } from "../../support/temp-scratch.ts"
import type { ImportedNetlist } from "../../../lib/kicad/netlist.ts"
import type { Circuit, PartLabel } from "../../../lib/schgen/ir/types.ts"
import type { FieldFallback } from "../../../lib/schgen/render/field-placement.ts"

afterAll(cleanUpTempScratch)

/** The one pin this circuit declares `NC`, as the designator and number the netlist spells it. */
const NC_NODE = "U1.5"

/** KiCad's placeholder name for that pin, which the authored schematic's committed netlist also carries. */
const NC_PLACEHOLDER = "unconnected-(U1-CLK_O-Pad5)"

interface Generated {
  readonly circuit: Circuit
  readonly refs: ReadonlyMap<PartLabel, string>
  readonly sheet: string
  readonly exported: ImportedNetlist
  readonly fallbacks: readonly FieldFallback[]
}

let g: Generated | null = null

const generated = (): Generated => {
  if (g === null) throw new Error("pt2399-core was not generated")
  return g
}

beforeAll(async () => {
  if (!fs.existsSync(KICAD_CLI)) {
    throw new Error(
      `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI (lib/kicad/install.ts ` +
        "holds the per-platform defaults). This test does NOT skip: it is the only proof KiCad " +
        "reads a generated no-connect the way the model means it, and a skipped check that " +
        "resembles a passing one is the failure this workflow exists to prevent.",
    )
  }
  const repoRoot = moduleRepoRoot()
  const declared = ALL_DECLARED_CASES.find((c) => c.name === "pt2399-core")
  if (declared === undefined) {
    throw new Error("no declared case is named pt2399-core; tools/schgen/board-declarations.ts is the register")
  }
  const outDir = freshTempScratch("pt2399-nc-round-trip-")
  const design = parityDesign(declared, caseResolver([declared]), repoRoot, outDir)
  const env: GenerateEnv = {
    kicadVersion: kicadVersion(),
    stockDir: stockSymbolDir(),
    initLock: true,
    // The board census does the same: this test is about the no-connect surviving, and a
    // toolchain difference is a separate finding that would mask it.
    acceptToolchain: true,
  }
  const generation = await generate(design, env)
  writeGeneration(design, generation)
  // The SHEET file, which is where the marker is drawn. It is named after the sheet id and not
  // after the project, because generated-files.ts writes `<project>.kicad_sch` as the hierarchical
  // root and refuses two files with one name - see the declaration's own comment and G284.
  // Read off the DRAWING, which is the same `drawing.sheet.file` generated-files.ts writes it
  // under, so this cannot name a file the generator did not produce.
  const sheetFile = generation.drawings[0]?.sheet.file
  if (sheetFile === undefined) throw new Error("the generation produced no sheet drawing")
  expect(generation.drawings).toHaveLength(1)
  const exported = exportSexprNetlist(path.join(outDir, `${design.spec.project}.kicad_sch`))
  g = {
    circuit: generation.circuit,
    refs: generation.annotation.refs,
    sheet: fs.readFileSync(path.join(outDir, sheetFile), "utf8"),
    exported: importNetlist(exported.text),
    fallbacks: generation.drawings.flatMap((d) => d.fieldFallbacks),
  }
}, 300_000)

describe("pt2399-core's declared NC pin, through generation and back from kicad-cli", () => {
  it("is drawn as exactly one no_connect marker, because the circuit declares exactly one NC pin", () => {
    const { circuit, sheet } = generated()
    // The count is derived from the model rather than written as 1, so a second NC pin declared
    // later moves both sides of this assertion together.
    const declaredNc = circuit.pins.filter((p) => p.net === null)
    expect(declaredNc.map((p) => `${p.part}.${p.pin}`)).toEqual(["U1.5"])
    expect(sheet.match(/\(no_connect/g) ?? []).toHaveLength(declaredNc.length)
  })

  it("comes back from kicad-cli on a net of its own, with that pin as the only member", () => {
    const { exported } = generated()
    // NOT asserted as "some net matching unconnected-*": the subject is the pin, and the net name
    // is KiCad's to choose. The name is asserted too, because the authored schematic's committed
    // netlist carries this exact string and a change in it is worth knowing about.
    const holding = Object.entries(exported.nets).filter(([, members]) => members.includes(NC_NODE))
    expect(holding).toEqual([[NC_PLACEHOLDER, [NC_NODE]]])
  })

  it("agrees on all five round-trip comparisons, so the no-connect is not a stray net", () => {
    const { circuit, refs, exported } = generated()
    const p = roundTrip(circuit, refs, exported)
    // `netMembership` is the one that would report the NC pin as a stray net if the model side
    // dropped it; `pinIdentity` is the one that would report U1 as having 15 pins instead of 16.
    expect(p.netMembership).toEqual([])
    expect(p.pinIdentity).toEqual([])
    expect(p.componentIdentity).toEqual([])
    expect(p.values).toEqual([])
    expect(p.footprints).toEqual([])
    // Not a pass by omission: every component of this circuit declares a footprint, transcribed
    // from tests/fixtures/pt2399-core.net, so the uncompared list is empty BECAUSE there is
    // nothing uncompared.
    expect(p.footprintsUndeclared).toEqual([])
  })

  it("produces a sheet whose text the placer could NOT keep clear, and the count is pinned", () => {
    // **A GREEN ROUND TRIP IS NOT A LEGIBLE DRAWING, and this repository has been caught reading
    // one as the other.** Eight of this sheet's field placements are fallbacks - the placer put a
    // Reference or Value at the least-covered candidate slot because no slot was clear. The count
    // is asserted so that it cannot drift silently in either direction: fewer is a result worth
    // noticing and more is a regression. G285 carries the eight, block by block.
    expect(generated().fallbacks).toHaveLength(8)
  })
})
