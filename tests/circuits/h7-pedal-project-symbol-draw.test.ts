/**
 * Spec C4's precondition for the pedal's project symbols (h7 pedal pages plan, Task 2): "Add a
 * project symbol only where neither exists, and only if the builder first shows copperhead can draw
 * one." For each, the REAL copperhead drafts an intent with every pin on its own net to a resistor,
 * through the repository's draft path, and the REAL kicad-cli exports the page: each pin must come
 * back on its own net with the data sheet's name and electrical type. A pin typed `no_connect` is
 * flagged no-connect and must come back on no other part's net. Pins the symbol stacks at one point
 * (the TPS7A49's exposed pad under GND) share one net, since the drawing cannot part them. Multi-unit
 * symbols are drawn the same way: the intent names pins by number, and copperhead places the units.
 *
 * MEASURED: kicad-cli's netlist writes a space in a pin name as "_" in `pinfunction` (OPA1688's
 * "OUT A" comes back "OUT_A"), so the export is compared with spaces so written, and the drafted
 * page itself is checked to carry the name with its space.
 *
 * Neither test skips: with no copperhead or kicad-cli installed they fail.
 */
import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { KICAD_CLI } from "../../lib/kicad/netlist.ts"
import { attr, child, children, parseSexpr } from "../../lib/kicad/sexpr.ts"
import { PROJECT_SYMBOL_LIBRARY } from "../../circuits/h7-platform/parts.ts"
import { PEDAL_PIN_TABLES } from "../../circuits/h7-platform/pedal-pin-tables.ts"
import { draftWithCopperhead } from "../../tools/draught/draw-draft.ts"
import { PEDAL_PROJECT_SYMBOLS } from "./h7-pedal-project-symbols.ts"
import { renderedName, unitPinsOf } from "./h7-pedal-symbols.ts"

interface ExportedPin { readonly net: string; readonly fn: string; readonly type: string }

/** The symbol's pins grouped by where they are drawn: pins stacked at one point form one group. */
function pinGroups(libId: string, numbers: readonly string[]): string[][] {
  const at = new Map<string, string[]>()
  for (const unit of unitPinsOf(libId)) {
    for (const pin of unit.pins) {
      if (!numbers.includes(pin.number)) continue
      const key = `${unit.unit}@${pin.x},${pin.y}`
      at.set(key, [...(at.get(key) ?? []), pin.number])
    }
  }
  return [...at.values()]
}

function draftAndExport(libId: string, value: string, groups: readonly (readonly string[])[], noConnect: readonly string[]): {
  readonly u1: Readonly<Record<string, ExportedPin>>
  readonly members: Readonly<Record<string, readonly string[]>>
  readonly sheet: string
} {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "h7-pedal-symbol-"))
  try {
    const parts = [{ ref: "U1", libId, value, group: "spike" }]
    const nets: { name: string; pins: string[] }[] = []
    const wired = groups.filter((g) => !g.some((n) => noConnect.includes(n)))
    wired.forEach((g, i) => {
      parts.push({ ref: `R${i + 1}`, libId: "Device:R", value: "10k", group: "spike" })
      nets.push({ name: `N${g.join("_")}`, pins: [...g.map((n) => `U1.${n}`), `R${i + 1}.1`] })
    })
    nets.push({ name: "COM", pins: wired.map((_, i) => `R${i + 1}.2`) })
    const intentPath = path.join(work, "intent.json")
    fs.writeFileSync(intentPath, JSON.stringify({
      version: 1, parts, nets, noConnect: noConnect.map((n) => `U1.${n}`), hints: { groupOrder: ["spike"] },
    }))
    const draft = draftWithCopperhead({ outDir: path.join(work, "draft"), board: "spike", intentPath, projectSymbolLibraries: [PROJECT_SYMBOL_LIBRARY] })
    if (!draft.ok) throw new Error(`copperhead did not draft ${libId}: ${draft.stderr}\n${draft.stdout}`)
    const netPath = path.join(work, "spike.net")
    const exported = spawnSync(KICAD_CLI, ["sch", "export", "netlist", "--output", netPath, draft.schematicPath], { encoding: "utf8" })
    if (exported.status !== 0) throw new Error(`kicad-cli export failed for ${libId}: ${exported.stderr}`)
    const netsNode = child(parseSexpr(fs.readFileSync(netPath, "utf8")), "nets")
    if (netsNode === undefined) throw new Error(`the export of ${libId} has no (nets)`)
    const u1: Record<string, ExportedPin> = {}
    const members: Record<string, string[]> = {}
    for (const netNode of children(netsNode, "net")) {
      const name = attr(netNode, "name") ?? ""
      for (const node of children(netNode, "node")) {
        const ref = attr(node, "ref") ?? ""
        const pin = attr(node, "pin") ?? ""
        if (!ref.startsWith("#")) (members[name] ??= []).push(`${ref}.${pin}`)
        if (ref !== "U1") continue
        const raw = attr(node, "pinfunction") ?? ""
        u1[pin] = { net: name, fn: raw.endsWith(`_${pin}`) ? raw.slice(0, -`_${pin}`.length) : raw, type: attr(node, "pintype") ?? "" }
      }
    }
    return { u1, members, sheet: fs.readFileSync(draft.schematicPath, "utf8") }
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
}

describe("pedal project symbols draw", () => {
  for (const spec of PEDAL_PROJECT_SYMBOLS) {
    test(`copperhead drafts h7-platform:${spec.name} and kicad-cli exports each pin with its data sheet name and type`, () => {
      const table = PEDAL_PIN_TABLES[spec.table]
      if (table === undefined) throw new Error(`PEDAL_PIN_TABLES has no "${spec.table}"`)
      const numbers = Object.keys(table.pins)
      const noConnect = numbers.filter((n) => table.pins[n]?.type === "no_connect")
      const groups = pinGroups(`h7-platform:${spec.name}`, numbers)
      const wired = groups.filter((g) => !g.some((n) => noConnect.includes(n)))
      const { u1, members, sheet } = draftAndExport(`h7-platform:${spec.name}`, spec.value, groups, noConnect)
      for (const n of numbers) {
        const found = u1[n]
        const want = table.pins[n]
        if (found === undefined || want === undefined) throw new Error(`U1 pin ${n} of ${spec.name} is not in the export`)
        const exportedName = renderedName(want.name).replace(/ /g, "_")
        expect({ pin: n, fn: renderedName(found.fn), type: found.type }).toEqual({ pin: n, fn: exportedName, type: want.type })
        if (want.name.includes(" ")) expect(sheet).toContain(`(name "${want.name}"`)
        const group = groups.find((g) => g.includes(n)) ?? [n]
        const resistor = wired.indexOf(group)
        const expectedMembers = resistor < 0 ? group.map((m) => `U1.${m}`) : [...group.map((m) => `U1.${m}`), `R${resistor + 1}.1`]
        expect([...(members[found.net] ?? [])].sort()).toEqual(expectedMembers.sort())
      }
      expect(Object.keys(u1).sort()).toEqual([...numbers].sort())
    }, 180_000)
  }
})
