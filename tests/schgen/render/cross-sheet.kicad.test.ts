/**
 * SPEC §1.6's CROSS-SHEET TEST, WHICH IS THE REVIEWER's AND IS ADOPTED AS WRITTEN: *"generate the
 * same network as one sheet and as multiple sheets, export both through `kicad-cli`, and verify
 * identical net membership."*
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan. Its three cases are the spec's
 * three, each with the spec's own reason, and they are declared in
 * `../__fixtures__/designs/crosssheet.ts`.
 *
 * **IT USES THE REAL `kicad-cli` AND FAILS RATHER THAN SKIPS WHEN IT IS MISSING** - owner ruling
 * **G169** and the convention `gates/round-trip.kicad.test.ts` already sets. KiCad is a dependency
 * here, and a check that skips when its tool is absent cannot be told apart from one that passed.
 *
 * **THE PARTITION, NOT THE NET NAMES, IS WHAT IS COMPARED.** KiCad names an unlabelled net after a
 * pad it touches (`Net-(R1-Pad1)`), so a name is a fact about designators and about which pin the
 * exporter reached first. The partition - the set of member sets - is the claim spec §1.6 makes,
 * and `partitionOf` below is that set. The named map is printed beside it when a case fails, so a
 * disagreement is diagnosable rather than merely red.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../../support/temp-scratch.ts"
import { CROSS_SHEET_DIR, CROSS_SHEET_FILE, crossSheetFixtures } from "../__fixtures__/designs/crosssheet.ts"
import { KICAD_CLI, importNetlist, type ImportedNetlist } from "../../../lib/kicad/netlist.ts"
import type { DesignSpec, LoadedDesign } from "../../../lib/schgen/design.ts"
import type { SheetDrawing } from "../../../lib/schgen/render/sheet-types.ts"
import type { Circuit } from "../../../lib/schgen/ir/types.ts"
import {
  CROSS_SHEET_MECHANISMS, MECHANISM_OF_CLASS, classOf, crossSheetProblems, mechanismFor,
  unemittableMechanisms, unmappedClasses, type ConnectionClass, type CrossSheetMechanism,
} from "../../../lib/schgen/render/cross-sheet.ts"
import { stockSymbolDir } from "../../../lib/schgen/render/library.ts"
import { generate, writeGeneration, type GenerateEnv } from "../../../tools/schgen/generate.ts"
import { kicadVersion } from "../../../tools/schgen/kicad-run.ts"
import { exportSexprNetlist } from "../../../tools/schgen/verify.ts"

afterAll(cleanUpTempScratch)

const env = (): GenerateEnv => ({
  kicadVersion: kicadVersion(),
  stockDir: stockSymbolDir(),
  initLock: true,
  acceptToolchain: false,
})

function requireKicadCli(): void {
  if (fs.existsSync(KICAD_CLI)) return
  throw new Error(
    `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI (lib/kicad/install.ts ` +
      "holds the per-platform defaults). This test does NOT skip: spec §1.6 makes this comparison " +
      "the only thing that establishes the cross-sheet mechanism behaves, and a skipped check that " +
      "resembles a passing one is the failure this workflow exists to prevent.",
  )
}

const loaded = (spec: DesignSpec): LoadedDesign => ({
  file: CROSS_SHEET_FILE,
  dir: CROSS_SHEET_DIR,
  spec,
  outDir: freshTempScratch("schgen-crosssheet-"),
})

interface Emitted {
  readonly circuit: Circuit
  readonly drawings: readonly SheetDrawing[]
  readonly exported: ImportedNetlist
}

async function emit(spec: DesignSpec): Promise<Emitted> {
  const d = loaded(spec)
  const generation = await generate(d, env())
  writeGeneration(d, generation)
  const net = exportSexprNetlist(path.join(d.outDir, `${d.spec.project}.kicad_sch`))
  return { circuit: generation.circuit, drawings: generation.drawings, exported: importNetlist(net.text) }
}

/**
 * The net partition as a comparable value: each net's members sorted, the nets sorted by their
 * member list, and the net NAMES discarded.
 *
 * Discarding the names is deliberate and is not a weakening: the claim under test is that the two
 * drawings join the same pins, and KiCad's name for an unlabelled net is a fact about which pad the
 * exporter reached first. A labelled net keeps its declared name on both sides, so a name
 * difference between the two sides could only ever be in the unlabelled ones - and those are
 * exactly the ones a partition comparison sees anyway, through their membership.
 */
function partitionOf(n: ImportedNetlist): readonly string[] {
  return Object.values(n.nets)
    .map((members) => [...members].sort().join(" "))
    .sort()
}

/** The named map, printed when a partition comparison fails so the difference is readable. */
function namedNets(n: ImportedNetlist): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(Object.entries(n.nets).map(([net, members]) => [net, [...members].sort()]))
}

const PAIRS = crossSheetFixtures()

/** The one generation per side, shared by every case below. */
const emitted = new Map<string, { readonly one: Emitted; readonly many: Emitted }>()

beforeAll(async () => {
  requireKicadCli()
  for (const f of PAIRS) {
    emitted.set(f.name, { one: await emit(f.asOneSheet), many: await emit(f.asManySheets) })
  }
}, 600_000)

function sides(name: string): { readonly one: Emitted; readonly many: Emitted } {
  const hit = emitted.get(name)
  if (hit === undefined) throw new Error(`fixture ${name} was not generated`)
  return hit
}

describe("one sheet against many, through kicad-cli", () => {
  for (const f of PAIRS) {
    test(`${f.name}: one sheet and ${f.sheets} sheets export identical net membership`, () => {
      const { one, many } = sides(f.name)
      expect(
        partitionOf(many.exported),
        `${f.name}: one sheet gave ${JSON.stringify(namedNets(one.exported))} and ${f.sheets} ` +
          `sheets gave ${JSON.stringify(namedNets(many.exported))}`,
      ).toEqual(partitionOf(one.exported))
      // NOT A PASS BY EMPTINESS: an export with no nets would make the comparison trivially
      // equal, and these fixtures all have several.
      expect(partitionOf(one.exported).length).toBeGreaterThan(1)
    })

    test(`${f.name}: both sides are clean under crossSheetProblems`, () => {
      const { one, many } = sides(f.name)
      expect(crossSheetProblems(one.circuit, one.drawings)).toEqual([])
      expect(crossSheetProblems(many.circuit, many.drawings)).toEqual([])
    })
  }

  test("the repeated block's two instances stay two nets, on both sides", () => {
    const { one, many } = sides("repeat")
    for (const side of [one, many]) {
      const taps = Object.entries(side.exported.nets).filter(([net]) => net === "A_TAP" || net === "B_TAP")
      expect(taps.map(([net]) => net).sort()).toEqual(["A_TAP", "B_TAP"])
      for (const [net, members] of taps) expect(members.length, `${net} has ${members.length} members`).toBe(2)
    }
  })
})

describe("the cross-sheet mechanism refuses in both directions", () => {
  test("a net drawn with both a power symbol and a global label REFUSES", () => {
    const { many } = sides("rail")
    const rail = [...many.circuit.rails.keys()].sort()[0]
    if (rail === undefined) throw new Error("the rail fixture declares no rail")
    const first = many.drawings[0]
    if (first === undefined) throw new Error("the rail fixture drew no sheet")
    // The rail is already drawn as a power symbol on this sheet; adding a global label for it is
    // the second claim about one connection that spec §1.6 refuses.
    const alsoLabelled: SheetDrawing = {
      ...first,
      labels: [...first.labels, { net: rail, at: { x: 0, y: 0 }, side: "left", refs: "" }],
    }
    const problems = crossSheetProblems(many.circuit, [alsoLabelled, ...many.drawings.slice(1)])
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.join(" ")).toContain(`net ${rail} is drawn with global-label and power-symbol`)
  })

  test("a net left unrepresented on ONE of its three sheets REFUSES, naming that sheet", () => {
    const { many } = sides("three")
    // ROUND 2's CORRECTION. The clause used to union every drawing's representation of a net and
    // ask whether it was drawn ANYWHERE, so the likely instance - one sheet's piece orphaned while
    // the other two carry the net - reported nothing. Driven here one sheet at a time.
    const stripOn = (ids: readonly string[]): readonly SheetDrawing[] =>
      many.drawings.map((d) => (ids.includes(d.sheet.id)
        ? { ...d, labels: d.labels.filter((l) => l.net !== "SIG"), powers: d.powers.filter((p) => p.net !== "SIG") }
        : d))
    const one = crossSheetProblems(many.circuit, stripOn(["s3"]))
    expect(one.length).toBe(1)
    expect(one[0]).toContain("net SIG has pins on sheets s1, s2, s3 and sheet s3 draws it with neither")
    const two = crossSheetProblems(many.circuit, stripOn(["s2", "s3"]))
    expect(two.length).toBe(2)
    expect(two.join(" ")).toContain("sheet s2 draws it with neither")
    expect(two.join(" ")).toContain("sheet s3 draws it with neither")
    const all = crossSheetProblems(many.circuit, stripOn(["s1", "s2", "s3"]))
    expect(all.length).toBe(3)
    // And the unstripped drawings report nothing, so the clause is not firing on everything.
    expect(crossSheetProblems(many.circuit, many.drawings).join(" ")).not.toContain("draws it with neither")
  })

  test("a rail drawn as an ordinary net REFUSES: the mechanism must be its class's", () => {
    const { many } = sides("rail")
    const rail = [...many.circuit.rails.keys()].sort()[0]
    if (rail === undefined) throw new Error("the rail fixture declares no rail")
    // Spec §3.4's third objective criterion, made a check: the rail's power symbols are replaced
    // by global labels, so it is represented by exactly one mechanism - the wrong one.
    const asLabels = many.drawings.map((d): SheetDrawing => ({
      ...d,
      powers: d.powers.filter((p) => p.flag || p.net !== rail),
      labels: [...d.labels, ...d.powers.filter((p) => !p.flag && p.net === rail).map((p) => ({ net: p.net, at: p.at, side: "left" as const, refs: "" }))],
    }))
    const problems = crossSheetProblems(many.circuit, asLabels)
    expect(problems.join(" ")).toContain(`net ${rail} is a "declared-rail" connection`)
    expect(problems.join(" ")).toContain('is drawn with "global-label"')
  })

  test("a class of connection with no stated mechanism REFUSES", () => {
    // DRIVEN THROUGH `unmappedClasses` RATHER THAN THROUGH A CIRCUIT, and the reason is recorded
    // in docs/known-gaps.md: `ConnectionClass` is a two-value union and `MECHANISM_OF_CLASS`
    // covers both, so NO circuit can produce a crossing net whose class is unmapped. A test that
    // built one would be asserting something unreachable - which is the shape Task 13 spent three
    // attempts on. This drives the clause with a table that is missing an entry, using only real
    // `ConnectionClass` values and no cast.
    const incomplete = new Map<ConnectionClass, CrossSheetMechanism>([["declared-rail", "power-symbol"]])
    expect(unmappedClasses(["declared-rail", "inter-block-signal"], incomplete)).toEqual([
      'connection class "inter-block-signal" has no stated cross-sheet mechanism (lib/schgen/render/cross-sheet.ts)',
    ])
    // The shipped table is complete, so the clause finds nothing in a real run - stated here so
    // the empty result above is read as coverage rather than as the clause being inert.
    expect(unmappedClasses(["declared-rail", "inter-block-signal"], MECHANISM_OF_CLASS)).toEqual([])
  })

  test("a class stated to use a mechanism the emitter cannot draw REFUSES", () => {
    const third = new Map<ConnectionClass, string>([
      ...MECHANISM_OF_CLASS,
      ["inter-block-signal", "hierarchical-port"],
    ])
    const problems = unemittableMechanisms(third, CROSS_SHEET_MECHANISMS)
    expect(problems.length).toBe(1)
    expect(problems.join(" ")).toContain('"inter-block-signal" is stated to use "hierarchical-port"')
    expect(unemittableMechanisms(MECHANISM_OF_CLASS, CROSS_SHEET_MECHANISMS)).toEqual([])
  })

  test("classOf reads the model and mechanismFor maps the class, one each", () => {
    const { many } = sides("three")
    expect(classOf("GND", many.circuit)).toBe("declared-rail")
    expect(classOf("SIG", many.circuit)).toBe("inter-block-signal")
    expect(mechanismFor("GND", many.circuit)).toBe("power-symbol")
    expect(mechanismFor("SIG", many.circuit)).toBe("global-label")
  })
})
