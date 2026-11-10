/**
 * **THE TRIAL'S REQUEST TO SCHGEN, CHECKED AGAINST THE BOARD MODEL BY COMPARISONS THAT CAN FAIL.**
 *
 * `tools/schgen-drawing-trial/request.ts` builds, from a board's model only, the text SchGen
 * receives as the user request. These tests are the spec's "Validated before the run" list
 * (`docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md`, "The user request"):
 *
 * - the text parses back to exactly the netlist it was built from, with every model pin on
 *   exactly one net;
 * - that netlist is the model's, by the repository's own `compareSheetToModel` - the comparator
 *   the drafted pages are held to - so the generator is not checked against itself. The brief
 *   named `toImportedNetlist` for this; it cannot express these boards, because its pin numbers
 *   are keyed by KIND and `modelForSheet`'s are per component (`pultec-low-boost`'s `R2` is
 *   `a`=2/`b`=1 where every other resistor is `a`=1), and its off-board pad orders must number
 *   every pin 1..n, which `SW_MID` (common on 13, pin 12 unused) does not;
 * - a request with one pin moved fails that comparison (the control);
 * - nothing from the approved sheet's placement - a coordinate pair, a rotation or mirror token,
 *   a UUID - appears in the text. The approved sheet is read HERE, by the test, and never by the
 *   generator;
 * - the symbol list is stock `power:GND` plus each part's intended symbol, with no
 *   `copperhead_power:` entry and no `PWR_FLAG`, and every symbol and every pin the request names
 *   resolves in the installed KiCad library;
 * - the approval gate returns a digest `docs/schematic/verdicts.md` records, and refuses a copy of
 *   the sheet with one byte changed.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { modelForSheet } from "../circuits/sheet-model.ts"
import { draftedSheet, SELECTOR_PIN_DISAGREEMENT } from "../circuits/drafted-sheet.ts"
import { installedSymbolPinNumbers, symbolExistsOnDisk } from "../kicad/symbol-library-disk.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { approvedDigestOf, approvedSheetDigest, TRIAL_BOARDS } from "../../tools/schgen-drawing-trial/boards.ts"
import { buildRequest, parseRequest, requestPinNumbers, symbolToken } from "../../tools/schgen-drawing-trial/request.ts"

type Netlist = ReturnType<typeof parseRequest>

/**
 * The model's per-component pin numbers BY THE RULE (`requestPinNumbers`, i.e. `pinNumbersFor`),
 * not `modelForSheet`'s `pinNumbers`, which overlays the approved page's `DECLARED_PIN_NUMBERS`.
 * The request is built from the rule, so it is held to the rule.
 */
function rulePinNumbers(board: string): Map<string, ReadonlyMap<string, string>> {
  const model = modelForSheet(board)
  return new Map(model.network.components.map((c) => [c.id, requestPinNumbers(c)]))
}

/** Every connected model pin as `<designator>.<number>`, derived here and not by the generator. */
function modelPins(board: string): string[] {
  const model = modelForSheet(board)
  const pinNumbers = rulePinNumbers(board)
  const out: string[] = []
  for (const component of model.network.components) {
    const designator = model.designators.get(component.id)
    const numbers = pinNumbers.get(component.id)
    if (designator === undefined || numbers === undefined) {
      throw new Error(`modelForSheet("${board}") gave "${component.id}" no designator or pin map`)
    }
    for (const group of [component.pins, ...component.units.map((u) => u.pins)]) {
      for (const [pin, connection] of Object.entries(group)) {
        if (connection.kind === "nc") continue
        const number = numbers.get(pin)
        if (number === undefined) throw new Error(`"${component.id}" pin "${pin}" has no number`)
        out.push(`${designator}.${number}`)
      }
    }
  }
  return out.sort()
}

/**
 * The request's netlist as `kicad-cli` would export a sheet drawn from it - every symbol pin the
 * request puts on no net becomes its own `unconnected-(REF-PadN)` net, and each part carries its
 * symbol's entry name as `libPart` - so the repository's own comparator can be applied unchanged.
 */
function asExport(netlist: Netlist): ImportedNetlist {
  const onNet = new Set(Object.values(netlist.nets).flat())
  const nets: Record<string, string[]> = { ...netlist.nets }
  for (const c of netlist.components) {
    for (const number of installedSymbolPinNumbers(c.symbol)) {
      if (!onNet.has(`${c.designator}.${number}`)) nets[`unconnected-(${c.designator}-Pad${number})`] = [`${c.designator}.${number}`]
    }
  }
  const components = netlist.components.map((c) => ({ designator: c.designator, value: c.value, libPart: c.symbol.slice(c.symbol.indexOf(":") + 1) }))
  return { components, nets }
}

/**
 * `compareSheetToModel` over the request, less `footprints`/`footprintsUndeclared`: a request
 * carries no footprint by design, so those two lists say nothing about it. The comparator compares
 * which pins share a net, never net names, so the model's `0` against the request's `GND` is not a
 * difference - which is the spec's requirement for the ground rename.
 */
function disagreements(board: string, netlist: Netlist): string[] {
  const model = modelForSheet(board)
  const found = compareSheetToModel(model.network, model.designators, rulePinNumbers(board), asExport(netlist))
  return [...found.componentIdentity, ...found.netMembership, ...found.pinIdentity, ...found.values]
}

/**
 * The one disagreement a sheet drawn exactly as requested still has, and the approved pages have
 * too: `Switch:SW_Rotary_1x6_MP`'s mechanical mount lug `MP`, which the model does not carry
 * (`SELECTOR_PIN_DISAGREEMENT`'s comment in `../circuits/drafted-sheet.ts`). Exactly that line for
 * a board whose `SW1` is that symbol, and nothing for `pultec-mid`, whose selector has no lug.
 */
function knownDisagreements(netlist: Netlist): string[] {
  const sw1 = netlist.components.find((c) => c.designator === "SW1")
  return sw1?.symbol === "Switch:SW_Rotary_1x6_MP" ? [SELECTOR_PIN_DISAGREEMENT] : []
}

/** The approved sheet's placement tokens: coordinate pairs from `(at x y` and every UUID. */
function placementTokens(board: string): { pairs: string[]; uuids: string[] } {
  const sheet = fs.readFileSync(draftedSheet("pultec", board), "utf8")
  const pairs = new Set<string>()
  for (const m of sheet.matchAll(/\((?:at|xy|start|end|center|mid) (-?[0-9.]+) (-?[0-9.]+)/g)) {
    pairs.add(`${m[1]} ${m[2]}`)
    pairs.add(`${m[1]},${m[2]}`)
    pairs.add(`${m[1]}, ${m[2]}`)
  }
  const uuids = new Set<string>()
  for (const m of sheet.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g)) uuids.add(m[0])
  return { pairs: [...pairs], uuids: [...uuids] }
}

test("the trial boards are the five approved Pultec boards and nothing else", () => {
  expect([...TRIAL_BOARDS]).toEqual(["pultec-hi-boost", "pultec-hi-cut", "pultec-low-boost", "pultec-low-cut", "pultec-mid"])
})

for (const board of TRIAL_BOARDS) {
  test(`${board}: round trip - the text parses back to the netlist, every model pin on exactly one net`, () => {
    const request = buildRequest(board)
    expect(parseRequest(request.text)).toEqual(request.netlist)
    const seen = new Map<string, number>()
    for (const pins of Object.values(request.netlist.nets)) for (const pin of pins) seen.set(pin, (seen.get(pin) ?? 0) + 1)
    expect([...seen.values()].filter((n) => n !== 1)).toEqual([])
    expect([...seen.keys()].sort()).toEqual(modelPins(board))
  })

  test(`${board}: matches the model - compareSheetToModel finds no disagreement, with 0 renamed to GND`, () => {
    const request = buildRequest(board)
    const fromText = parseRequest(request.text)
    expect(disagreements(board, fromText)).toEqual(knownDisagreements(fromText))
    expect(Object.keys(fromText.nets)).toContain("GND")
    expect(Object.keys(fromText.nets)).not.toContain("0")
  })

  test(`${board}: control - one pin moved to another net is reported as a difference`, () => {
    const request = buildRequest(board)
    const lines = request.text.split("\n")
    const netLines = lines.map((line, i) => ({ line, i })).filter(({ line }) => /^[^ ]+: /.test(line))
    const from = netLines.find(({ line }) => line.split(" ").length > 2)
    const to = netLines.find(({ i }) => from !== undefined && i !== from.i)
    if (from === undefined || to === undefined) throw new Error(`${board}: no two nets to move a pin between`)
    const fromWords = from.line.split(" ")
    const moved = fromWords.pop()
    lines[from.i] = fromWords.join(" ")
    lines[to.i] = `${to.line} ${moved}`
    const altered = parseRequest(lines.join("\n"))
    const known = knownDisagreements(altered)
    expect(disagreements(board, parseRequest(request.text))).toEqual(known)
    const extra = disagreements(board, altered).filter((d) => !known.includes(d))
    expect(extra.some((d) => d.startsWith("the model connects ["))).toBe(true)
  })

  test(`${board}: no placement leak - no coordinate pair, rotation, mirror or UUID from the approved sheet`, () => {
    const { text } = buildRequest(board)
    const { pairs, uuids } = placementTokens(board)
    expect(pairs.length, "a sheet with no coordinates would make this vacuous").toBeGreaterThan(0)
    expect(uuids.length, "a sheet with no UUIDs would make this vacuous").toBeGreaterThan(0)
    expect(pairs.filter((p) => text.includes(p))).toEqual([])
    expect(uuids.filter((u) => text.includes(u))).toEqual([])
    expect(text).not.toMatch(/rotation|mirror|\(at /i)
  })

  test(`${board}: symbols - stock power:GND, no copperhead_power, no PWR_FLAG, all resolvable on disk`, () => {
    const request = buildRequest(board)
    expect(request.symbols).toContain("power:GND")
    expect(request.symbols.filter((s) => s.startsWith("copperhead_power:") || s.includes("PWR_FLAG"))).toEqual([])
    expect(request.symbols.filter((s) => !symbolExistsOnDisk(s))).toEqual([])
    expect(request.symbols).toEqual([...new Set(request.netlist.components.map((c) => c.symbol)), "power:GND"].sort())
    const badPins: string[] = []
    const symbolOf = new Map(request.netlist.components.map((c) => [c.designator, c.symbol]))
    for (const pins of Object.values(request.netlist.nets)) {
      for (const ref of pins) {
        const [designator, pin] = ref.split(".")
        const symbol = designator === undefined ? undefined : symbolOf.get(designator)
        if (symbol === undefined || pin === undefined || !installedSymbolPinNumbers(symbol).includes(pin)) badPins.push(ref)
      }
    }
    expect(badPins).toEqual([])
  })

  test(`${board}: approval check - the digest is in verdicts.md, and a one-byte change is refused`, () => {
    const digest = approvedSheetDigest(board)
    const verdicts = fs.readFileSync(path.join(moduleRepoRoot(), "docs", "schematic", "verdicts.md"), "utf8")
    expect(verdicts).toContain(`\`${digest}\``)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${board}-approval-`))
    try {
      const copy = path.join(dir, "sheet.kicad_sch")
      const bytes = fs.readFileSync(draftedSheet("pultec", board))
      bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 1
      fs.writeFileSync(copy, bytes)
      expect(() => approvedDigestOf(copy)).toThrow(/verdicts\.md/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
}

test("buildRequest refuses a board outside the trial", () => {
  expect(() => buildRequest("transistor-preamp-staged")).toThrow(/TRIAL_BOARDS/)
})

test("parseRequest refuses text outside the fixed format", () => {
  expect(() => parseRequest("PARTS:\nR1 10k Device:R\nNETS:\nLABELS:\nhello")).toThrow()
  expect(() => parseRequest("NETS:\nPARTS:\nLABELS:")).toThrow()
})

test("pultec-low-boost: R1.1 is on out - the page-declared R2 a/b swap does not reach the request", () => {
  expect(buildRequest("pultec-low-boost").netlist.nets["out"]).toContain("R1.1")
})

test("symbolToken refuses a symbol with no library prefix where it is created", () => {
  expect(() => symbolToken("R")).toThrow(/library:symbol/)
  expect(() => symbolToken("Device:R:x")).toThrow(/library:symbol/)
  expect(symbolToken("Device:R")).toBe("Device:R")
})
