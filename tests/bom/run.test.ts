import { test, expect } from "bun:test"
import { checkBoardBom, runBom, STALE_PRICE_DAYS, localDate } from "../../tools/bom/run.ts"
import { deriveNeeds } from "../../tools/bom/needs.ts"
import { boardCircuitFrom } from "../../tools/perfboard/board-circuit.ts"
import {
  bomJson, declarationIn, demoDeps, demoNetwork, fittingResistor, memoryFs,
} from "./run-fixture.ts"

const DIR = "/repo/boards/demo"
const BOM_JSON = `${DIR}/bom.json`
const BOM_MD = `${DIR}/BOM.md`

function lineKey(): string {
  const circuit = boardCircuitFrom(demoNetwork(), { bias_resistor: "R1" }, {})
  const [line] = deriveNeeds(circuit, 9, new Map([["bias_resistor", 0.001]]))
  if (line === undefined) throw new Error("fixture derived no line")
  return line.key
}

function catalogWith(checked?: string) {
  const entry = fittingResistor(checked)
  return new Map([[entry.id, entry]])
}

test("the staleness limit is 45 days", () => {
  expect(STALE_PRICE_DAYS).toBe(45)
})

test("a complete board exits 0, writes BOM.md and reads the catalog from <repo>/parts", async () => {
  const fs = memoryFs({ [BOM_JSON]: bomJson({ [lineKey()]: "resistor-100k-metal-film-0207" }) })
  const deps = demoDeps(fs, catalogWith())
  const result = await runBom(declarationIn(DIR), deps)
  expect(result.exitCode).toBe(0)
  expect(fs.writes).toEqual([BOM_MD])
  expect(fs.files.get(BOM_MD)).toContain("# demo bill of materials")
  expect(fs.files.get(BOM_MD)).toContain("Yageo MFR-25FBF52-100K")
  expect(deps.catalogDirs).toEqual(["/repo/parts"])
  expect(result.output).toContain("Supply 9 V; no controls.")
  expect(result.output).toContain("The parts list matches the circuit")
})

test("an unchosen line exits 1 and still writes BOM.md", async () => {
  const fs = memoryFs({ [BOM_JSON]: bomJson() })
  const result = await runBom(declarationIn(DIR), demoDeps(fs))
  expect(result.exitCode).toBe(1)
  expect(result.output).toContain("1 line(s) with no part chosen")
  expect(result.output).toContain(lineKey())
  expect(fs.writes).toEqual([BOM_MD])
  expect(fs.files.get(BOM_MD)).toContain("not chosen")
})

test("stale prices are listed but do not make an otherwise complete board fail", async () => {
  const fs = memoryFs({ [BOM_JSON]: bomJson({ [lineKey()]: "resistor-100k-metal-film-0207" }) })
  const result = await runBom(declarationIn(DIR), demoDeps(fs, catalogWith("2026-01-02")))
  expect(result.exitCode).toBe(0)
  expect(result.output).toContain("checked 2026-01-02")
})

test("a board with no bom.json is refused, naming the file and its minimal content", async () => {
  const fs = memoryFs({})
  const run = runBom(declarationIn(DIR), demoDeps(fs))
  await expect(run).rejects.toThrow(BOM_JSON)
  await expect(runBom(declarationIn(DIR), demoDeps(fs))).rejects.toThrow(/"purchasing"/)
  await expect(runBom(declarationIn(DIR), demoDeps(fs))).rejects.toThrow(/"lines": \{\}/)
  await expect(runBom(declarationIn(DIR), demoDeps(fs))).rejects.toThrow(/"extras": \[\]/)
  expect(fs.writes).toEqual([])
})

test("bom.json and catalog files are never written, whatever the outcome", async () => {
  const fs = memoryFs({ [BOM_JSON]: bomJson({ "a line the circuit lost": "no-such-part" }) })
  await runBom(declarationIn(DIR), demoDeps(fs))
  expect(fs.writes).toEqual([BOM_MD])
})

test("localDate formats the local calendar date as YYYY-MM-DD", () => {
  expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05")
})

test("check: a board without bom.json is untouched", async () => {
  const fs = memoryFs({})
  const result = await checkBoardBom(declarationIn(DIR), demoDeps(fs))
  expect(result.applies).toBe(false)
  expect(fs.writes).toEqual([])
})

test("check: an incomplete but current BOM.md passes and nothing is written", async () => {
  const fs = memoryFs({ [BOM_JSON]: bomJson() })
  await runBom(declarationIn(DIR), demoDeps(fs))
  const written = fs.writes.length
  const result = await checkBoardBom(declarationIn(DIR), demoDeps(fs, new Map()))
  expect(result).toEqual({ applies: true, ok: true, report: "" })
  expect(fs.writes.length).toBe(written)
})

test("check: stale prices do not fail check", async () => {
  const fs = memoryFs({ [BOM_JSON]: bomJson({ [lineKey()]: "resistor-100k-metal-film-0207" }) })
  const catalog = catalogWith("2026-01-02")
  await runBom(declarationIn(DIR), demoDeps(fs, catalog))
  const result = await checkBoardBom(declarationIn(DIR), demoDeps(fs, catalog))
  expect(result.applies && result.ok).toBe(true)
})

test("check: a BOM.md that differs from the rendering fails, naming make bom", async () => {
  const fs = memoryFs({ [BOM_JSON]: bomJson(), [BOM_MD]: "an old list\n" })
  const result = await checkBoardBom(declarationIn(DIR), demoDeps(fs))
  expect(result.applies && !result.ok).toBe(true)
  expect(result.applies ? result.report : "").toContain("make bom")
  expect(fs.files.get(BOM_MD)).toBe("an old list\n")
})

test("check: a missing BOM.md fails, naming make bom", async () => {
  const fs = memoryFs({ [BOM_JSON]: bomJson() })
  const result = await checkBoardBom(declarationIn(DIR), demoDeps(fs))
  expect(result.applies && !result.ok).toBe(true)
  expect(result.applies ? result.report : "").toContain("make bom")
  expect(fs.writes).toEqual([])
})

test("check: a chosen part that no longer meets its line fails, naming the field", async () => {
  const misfit = { ...fittingResistor(), specs: { ohms: 47_000, watts: 0.25, package: "0207", leadSpacingMm: 10.16 } }
  const catalog = new Map([[misfit.id, misfit]])
  const fs = memoryFs({ [BOM_JSON]: bomJson({ [lineKey()]: misfit.id }) })
  await runBom(declarationIn(DIR), demoDeps(fs, catalog))
  const result = await checkBoardBom(declarationIn(DIR), demoDeps(fs, catalog))
  expect(result.applies && !result.ok).toBe(true)
  expect(result.applies ? result.report : "").toContain("ohms")
})
