/**
 * **HIDING A VALUE IS DISPLAY-ONLY: THE NETLIST `kicad-cli` EXPORTS IS BYTE-IDENTICAL WITH AND
 * WITHOUT `(hide yes)`, AND MOVES WHEN THE VALUE STRING MOVES** - the proof Task 21's change rests
 * on, taken rather than assumed.
 *
 * **WHY IT HAD TO BE PROVED AND NOT REASONED.** `lib/kicad/value-notation.ts` states that an empty
 * value field *"would reconcile as a value change against every board"*, and gate 8
 * (`lib/schgen/gates/reference-graph.ts`) keys every component by canonical VALUE and library id.
 * So the change was only admissible if the string stays in the file and the hidden flag reaches
 * nothing electrical. That is a claim about what KiCad does, which only KiCad can answer.
 *
 * **TWO CONTROLS, AND EACH COULD HAVE ANSWERED DIFFERENTLY.** A comparison that reports
 * "identical" proves nothing on its own. The IDENTITY variant re-prints the sheet through the same
 * parse-and-print pipeline the two edits use and changes nothing, so a difference reported later
 * is the edit and not the pipeline; the VALUE variant changes the value string - same length, same
 * position, same everything else - and the netlist differs. Without the second, a comparison blind
 * to the whole property would read as a pass.
 *
 * **IT USES THE REAL `kicad-cli` AND FAILS RATHER THAN SKIPS WHEN IT IS MISSING**, as
 * `tests/schgen/gates/round-trip.kicad.test.ts` and `tests/circuits/kicad-round-trip.ts` do, and
 * for the reason `CLAUDE.md` gives: a skipped check must never look like a passing one.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../../support/temp-scratch.ts"
import { miniInScratch } from "../__fixtures__/designs/mini/run.ts"
import { parse } from "../../../lib/kicad/sexpr.ts"
import { importNetlist, KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import { stockSymbolDir } from "../../../lib/schgen/render/library.ts"
import { fromParsed, headOf, print, str, type SListNode, type SNode } from "../../../lib/schgen/render/sexpr-write.ts"
import { generate, writeGeneration, type GenerateEnv } from "../../../tools/schgen/generate.ts"
import { kicadVersion } from "../../../tools/schgen/kicad-run.ts"
import { exportSexprNetlist } from "../../../tools/schgen/verify.ts"

afterAll(cleanUpTempScratch)

/**
 * The mini fixture's regulator: `Regulator_Linear:AMS1117-3.3` valued `AMS1117-3.3`, which IS its
 * symbol's own part name, so Task 21 emits it hidden. Its designator is not written here - it is
 * read off the generation's own reference map.
 */
const SUBJECT = { label: "U_REG", value: "AMS1117-3.3", other: "AMS1117-5.0" } as const

const env = (): GenerateEnv => ({
  kicadVersion: kicadVersion(),
  stockDir: stockSymbolDir(),
  initLock: true,
  acceptToolchain: false,
})

/**
 * `tests/schgen/__fixtures__/require-tool.ts`'s `skipWithout` is deliberately not used: it SKIPS
 * when the tool is absent outside CI, and this check's whole content is what the tool says.
 */
function requireKicadCli(): void {
  if (fs.existsSync(KICAD_CLI)) return
  throw new Error(
    `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI (lib/kicad/install.ts ` +
      "holds the per-platform defaults). This test does NOT skip: it is the only proof that " +
      "hiding a part's Value field is display-only, which is what Task 21's field-placement " +
      "change rests on, and a skipped check that resembles a passing one is the failure this " +
      "workflow exists to prevent.",
  )
}

interface Generated {
  readonly dir: string
  readonly root: string
  readonly designator: string
  readonly netlist: string
}

let g: Generated | null = null
const generated = (): Generated => {
  if (g === null) throw new Error("the mini design was not generated")
  return g
}

beforeAll(async () => {
  requireKicadCli()
  const d = miniInScratch()
  const generation = await generate(d, env())
  writeGeneration(d, generation)
  const designator = generation.annotation.refs.get(SUBJECT.label)
  if (designator === undefined) throw new Error(`${SUBJECT.label} has no reference in the generation`)
  const root = path.join(d.outDir, `${d.spec.project}.kicad_sch`)
  g = { dir: d.outDir, root, designator, netlist: exportSexprNetlist(root).text }
}, 180_000)

/** Every generated `.kicad_sch`, by absolute path. */
const sheetFiles = (dir: string): string[] =>
  fs.readdirSync(dir).filter((f) => f.endsWith(".kicad_sch")).map((f) => path.join(dir, f))

const atomAt = (n: SNode, i: number): string | null => {
  if (n.kind !== "list") return null
  const a = n.items[i]
  return a === undefined || a.kind !== "atom" ? null : a.text
}

/** True for the `property` node named `name` - of a PLACED symbol or of a library symbol alike. */
const isProperty = (n: SNode, name: string): boolean => headOf(n) === "property" && atomAt(n, 1) === name

/**
 * The placed symbol carrying `designator`, which is what distinguishes it from the `lib_symbols`
 * definition of the SAME library symbol - that definition carries a `Value` property with the
 * identical string, and a text search would find it first.
 */
const isPlaced = (n: SNode, designator: string): boolean =>
  headOf(n) === "symbol" && n.kind === "list" && n.items.some((c) => isProperty(c, "Reference") && atomAt(c, 2) === designator)

type PropertyEdit = (valueProperty: SListNode) => SListNode

/**
 * The same node, with every `hide` child dropped - and it REFUSES when there was none, because an
 * un-hide that removed nothing would export an identical netlist and pass this test vacuously.
 */
const unhide: PropertyEdit = (p) => {
  const items = p.items.filter((c) => headOf(c) !== "hide")
  if (items.length === p.items.length) {
    throw new Error(
      `the Value property of ${SUBJECT.label} carries no "hide" child, so un-hiding it removes ` +
        "nothing and the netlist comparison below would be comparing a file with itself.",
    )
  }
  return { kind: "list", items }
}

/** The same node, with its value string replaced. */
const revalue: PropertyEdit = (p) => ({ kind: "list", items: p.items.map((c, i) => (i === 2 ? str(SUBJECT.other) : c)) })

/** `text` re-printed, with `edit` applied to the placed symbol's `Value` property (null: unchanged). */
function rewriteSheet(text: string, designator: string, edit: PropertyEdit | null): { text: string; hits: number } {
  const root = fromParsed(parse(text))
  let hits = 0
  const items = root.items.map((item) => {
    if (!isPlaced(item, designator) || item.kind !== "list") return item
    hits += 1
    if (edit === null) return item
    return {
      kind: "list" as const,
      items: item.items.map((c) => (isProperty(c, "Value") && c.kind === "list" ? edit(c) : c)),
    }
  })
  return { text: print({ kind: "list", items }), hits }
}

/**
 * The netlist `kicad-cli` exports from a copy of the generated project in which the subject's
 * `Value` property has been edited.
 *
 * **Exactly one sheet must hold the subject, and that is asserted rather than hoped**: an edit
 * that matched nothing would export an unchanged netlist and read as this test passing.
 */
function netlistOfVariant(what: string, edit: PropertyEdit | null): string {
  const src = generated()
  const copy = freshTempScratch("schgen-hidden-value-")
  fs.cpSync(src.dir, copy, { recursive: true })
  let found = 0
  for (const file of sheetFiles(copy)) {
    const r = rewriteSheet(fs.readFileSync(file, "utf8"), src.designator, edit)
    found += r.hits
    if (r.hits > 0) fs.writeFileSync(file, r.text)
  }
  if (found !== 1) {
    throw new Error(
      `the "${what}" variant found ${found} placed symbols for ${src.designator} across the ` +
        "generated sheets and must find exactly one. Zero means the edit went nowhere and the " +
        "export below would be unchanged for the wrong reason; two means it is measuring two " +
        "edits at once.",
    )
  }
  return exportSexprNetlist(path.join(copy, path.basename(src.root))).text
}

/**
 * The exported netlist WITHOUT its `design` header, which is the only part of it that cannot be
 * compared across two exports: it records the source file's absolute path and the export's
 * timestamp, and each variant below is exported from its own temp copy a second later. Everything
 * the comparison is about - every component, every net, every pin - is outside it.
 *
 * **The removal is asserted to have happened** rather than attempted: a stripper that matched
 * nothing would leave the two texts differing for the reason it exists to remove, and the test
 * would fail for the wrong cause (or, worse, a future header rename would make it compare nothing).
 */
function withoutDesignHeader(netlist: string): string {
  const root = fromParsed(parse(netlist))
  const kept = root.items.filter((n) => headOf(n) !== "design")
  if (kept.length !== root.items.length - 1) {
    throw new Error(
      `the exported netlist has ${root.items.length - kept.length} top-level "design" sections and ` +
        "must have exactly one: it carries the source path and the export timestamp, which differ " +
        "between two exports by construction, so a comparison that did not remove it would be " +
        "measuring the clock.",
    )
  }
  return print({ kind: "list", items: kept })
}

describe("a hidden Value in the netlist kicad-cli exports", () => {
  it("is emitted hidden, with its string unchanged, on the part whose value is its symbol's part name", () => {
    const placed = sheetFiles(generated().dir)
      .map((f) => fromParsed(parse(fs.readFileSync(f, "utf8"))))
      .flatMap((root) => root.items.filter((n) => isPlaced(n, generated().designator)))
    expect(placed).toHaveLength(1)
    const value = placed[0]?.kind === "list" ? placed[0].items.find((c) => isProperty(c, "Value")) : undefined
    if (value === undefined || value.kind !== "list") throw new Error("the placed symbol has no Value property")
    expect(atomAt(value, 2)).toBe(SUBJECT.value)
    expect(value.items.some((c) => headOf(c) === "hide" && atomAt(c, 1) === "yes")).toBe(true)
  })

  it("still carries the value into the netlist, which is what gate 8 compares by", () => {
    const component = importNetlist(generated().netlist).components.find((c) => c.designator === generated().designator)
    expect(component?.value).toBe(SUBJECT.value)
  })

  it("CONTROL: re-printing the sheet unchanged exports the same netlist, so the pipeline is not what moves it", () => {
    expect(withoutDesignHeader(netlistOfVariant("identity", null))).toBe(withoutDesignHeader(generated().netlist))
  })

  it("exports the same netlist, byte for byte, as the same drawing with the value NOT hidden", () => {
    expect(withoutDesignHeader(netlistOfVariant("un-hide", unhide))).toBe(withoutDesignHeader(generated().netlist))
  })

  it("CONTROL: changing the value STRING does move the netlist, so the comparison above has teeth", () => {
    const moved = netlistOfVariant("change-the-value", revalue)
    expect(withoutDesignHeader(moved)).not.toBe(withoutDesignHeader(generated().netlist))
    const component = importNetlist(moved).components.find((c) => c.designator === generated().designator)
    expect(component?.value).toBe(SUBJECT.other)
  })
})
