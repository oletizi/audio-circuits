/**
 * The h7 project symbol library, and the proof that copperhead draws from it (spec C4).
 *
 * C4: "Add a project symbol only where neither exists, and only if the builder first shows
 * copperhead can draw one." The TS3USB221 has no stock symbol and no stock symbol matches its
 * RSE pinout (task 5 report, section 1), so `circuits/h7-platform/h7-platform.kicad_sym` holds
 * one. This file is the showing:
 *
 * 1. The symbol's pins are TI SCDS220M p. 3 Table 4-1, pin for pin, number and name. The table
 *    below is transcribed from the datasheet independently of the symbol file.
 * 2. The REAL copperhead drafts an intent naming that symbol through the repository's own draft
 *    path (`draftWithCopperhead` with `projectSymbolLibraries`), and the REAL `kicad-cli`
 *    exports the page. Each U1 pin n is on net Nn with Rn pin 1, and the export's pin function
 *    for U1 pin n is the datasheet name. Renumbering any pin in the library fails both tests.
 *
 * Neither test skips: with no copperhead or kicad-cli installed they fail, because a skipped
 * check here would look like the showing C4 asks for.
 */
import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { KICAD_CLI } from "../../lib/kicad/netlist.ts"
import { attr, child, children, parseSexpr } from "../../lib/kicad/sexpr.ts"
import { librarySymbols, symbolPins } from "../../lib/kicad/symbol-library.ts"
import { draftWithCopperhead } from "../../tools/draught/draw-draft.ts"

const LIBRARY = path.join(import.meta.dir, "../../circuits/h7-platform/h7-platform.kicad_sym")

/** TI SCDS220M (rev. November 2024) p. 3, Table 4-1 Pin Functions, RSE package. OE is active low. */
const SCDS220M_RSE: Readonly<Record<string, string>> = {
  "1": "1D+", "2": "1D-", "3": "2D+", "4": "2D-", "5": "GND",
  "6": "~{OE}", "7": "D-", "8": "D+", "9": "S", "10": "VCC",
}

function projectPins(): Record<string, string> {
  const block = librarySymbols(fs.readFileSync(LIBRARY, "utf8")).get("TS3USB221RSER")
  if (block === undefined) throw new Error(`${LIBRARY} defines no symbol "TS3USB221RSER"`)
  return Object.fromEntries(symbolPins(block).map((p) => [p.number, p.name]))
}

describe("h7 project symbol TS3USB221RSER", () => {
  test("its pins are SCDS220M Table 4-1, pin for pin", () => {
    expect(projectPins()).toEqual({ ...SCDS220M_RSE })
  })

  test("copperhead drafts it and kicad-cli exports each net on the datasheet's pin", () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "h7-project-symbol-"))
    try {
      const outDir = path.join(work, "draft")
      const parts = [{ ref: "U1", libId: "h7-platform:TS3USB221RSER", value: "TS3USB221RSER", group: "spike" }]
      const nets: { name: string; pins: string[] }[] = []
      for (let n = 1; n <= 10; n++) {
        parts.push({ ref: `R${n}`, libId: "Device:R", value: "10k", group: "spike" })
        nets.push({ name: `N${n}`, pins: [`U1.${n}`, `R${n}.1`] })
      }
      nets.push({ name: "COM", pins: Array.from({ length: 10 }, (_, i) => `R${i + 1}.2`) })
      const intentPath = path.join(work, "intent.json")
      fs.writeFileSync(intentPath, JSON.stringify({ version: 1, parts, nets, noConnect: [], hints: { groupOrder: ["spike"] } }))

      const draft = draftWithCopperhead({ outDir, board: "spike", intentPath, projectSymbolLibraries: [LIBRARY] })
      if (!draft.ok) throw new Error(`copperhead did not draft: ${draft.stderr}\n${draft.stdout}`)
      const netPath = path.join(work, "spike.net")
      const exported = spawnSync(KICAD_CLI, ["sch", "export", "netlist", "--output", netPath, draft.schematicPath], { encoding: "utf8" })
      if (exported.status !== 0) throw new Error(`kicad-cli export failed: ${exported.stderr}`)

      const root = parseSexpr(fs.readFileSync(netPath, "utf8"))
      const netsNode = child(root, "nets")
      if (netsNode === undefined) throw new Error("the export has no (nets)")
      const u1: Record<string, { net: string; fn: string }> = {}
      const members: Record<string, string[]> = {}
      for (const netNode of children(netsNode, "net")) {
        const name = attr(netNode, "name") ?? ""
        for (const node of children(netNode, "node")) {
          const ref = attr(node, "ref") ?? ""
          const pin = attr(node, "pin") ?? ""
          if (!ref.startsWith("#")) (members[name] ??= []).push(`${ref}.${pin}`)
          if (ref !== "U1") continue
          // kicad-cli writes the pin function as "<name>_<number>" for these pins.
          const raw = attr(node, "pinfunction") ?? ""
          u1[pin] = { net: name, fn: raw.endsWith(`_${pin}`) ? raw.slice(0, -`_${pin}`.length) : raw }
        }
      }
      for (let n = 1; n <= 10; n++) {
        const found = u1[String(n)]
        if (found === undefined) throw new Error(`U1 pin ${n} is on no net in the export`)
        expect(found.fn).toBe(SCDS220M_RSE[String(n)] ?? "")
        expect([...(members[found.net] ?? [])].sort()).toEqual([`R${n}.1`, `U1.${n}`].sort())
      }
      // Positive control: the export really did carry ten U1 pins.
      expect(Object.keys(u1)).toHaveLength(10)
    } finally {
      fs.rmSync(work, { recursive: true, force: true })
    }
  }, 180_000)
})
