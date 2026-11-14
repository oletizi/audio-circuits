/**
 * `draughting/pages/kicad-pro.ts` keys the pedal root's two ERC exclusions from the assembled root
 * (h7 pedal pages plan, Task 11b), where until then it refused the PWR_FLAG partner by name:
 *
 * - CR-PEDAL-LM66100-ST-ERC: U12 pin 5 (main item, on /expr_ref/) and GND's PWR_FLAG on the ROOT (aux
 *   item): the flag's pin 1 uuid read from the root at the point root-flags.ts puts GND's flag, and
 *   the root's own sheet path for the aux item. kicad-cli names that flag `#FLG03` in the violation.
 * - CR-PEDAL-ROOT-MIDI-PIN4-ERC: the one item, the root stub label MIDI_PIN4, its uuid and point.
 *
 * Whether kicad-cli HONOURS each key is measured on the committed project by `verify-root.sh`
 * (root_erc.py) and its negative controls in the pedal's `repair/tools/root-control.sh`; this file
 * holds the key's parts to the committed sheets, and the refusals.
 *
 * Controls: a scratch root with GND's flag moved off its point refuses, naming the point; one with the
 * MIDI_PIN4 stub label renamed refuses, naming the label; a flag partner named first, and one on a net flagged
 * on a block page, refuse.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { child, children, parseSexpr } from "../../lib/kicad/sexpr.ts"
import { REPO_ROOT, loadBoard } from "../../draughting/pages/board.ts"
import { committedErcAllowances, isRootLabelAllowance, type ErcAllowance, type PinAllowance } from "../../draughting/pages/erc-allowances.ts"
import { flagHomes } from "../../draughting/pages/flag-homes.ts"
import { exclusionKey, kicadProject } from "../../draughting/pages/kicad-pro.ts"

const PEDAL = path.join(REPO_ROOT, "drafted", "h7-platform", "h7-pedal")
const board = await loadBoard(PEDAL)
const homes = await flagHomes(board)
const table = await committedErcAllowances(board)
const rootText = fs.readFileSync(path.join(PEDAL, "h7-pedal.kicad_sch"), "utf8")
const root = parseSexpr(rootText)
const rootUuid = child(root, "uuid")?.atoms[0] ?? "<none>"

function entry(ruling: string): ErcAllowance {
  const found = table.find((e) => e.ruling === ruling)
  if (found === undefined) throw new Error(`the pedal's erc-allowances.ts has no ${ruling} entry`)
  return found
}
function pinEntry(ruling: string): PinAllowance {
  const found = entry(ruling)
  if (isRootLabelAllowance(found)) throw new Error(`${ruling} is a root label allowance, not a pin allowance`)
  return found
}

/** The pin 1 uuid of the root symbol whose Reference is `ref`. */
function rootSymbolPin1(ref: string): string {
  const s = children(root, "symbol").find((n) => children(n, "property").some((p) => p.atoms[0] === "Reference" && p.atoms[1] === ref))
  const uuid = s === undefined ? undefined : children(s, "pin").find((p) => p.atoms[0] === "1")
  return (uuid === undefined ? undefined : child(uuid, "uuid")?.atoms[0]) ?? `<no ${ref} pin 1 on the root>`
}

/** A scratch project: every committed sheet, the root with its one occurrence of `from` replaced by `to`. */
function withRootEdited(from: string, to: string, run: (dir: string) => void): void {
  expect(rootText.split(from).length).toBe(2)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kicad-pro-root-keys-"))
  try {
    for (const f of fs.readdirSync(PEDAL).filter((n) => n.endsWith(".kicad_sch"))) fs.copyFileSync(path.join(PEDAL, f), path.join(dir, f))
    fs.writeFileSync(path.join(dir, "h7-pedal.kicad_sch"), rootText.replace(from, to))
    run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test("the committed .kicad_pro is what kicad-pro.ts writes from the committed project", async () => {
  expect(await kicadProject(board, PEDAL)).toBe(fs.readFileSync(path.join(PEDAL, "h7-pedal.kicad_pro"), "utf8"))
})

test("the ST allowance's aux item is GND's root flag, #FLG03, on the root's own sheet path", () => {
  const parts = exclusionKey(entry("CR-PEDAL-LM66100-ST-ERC"), PEDAL, board, homes).split("|")
  expect(parts[0]).toBe("pin_to_pin")
  expect(parts[4]).toBe(rootSymbolPin1("#FLG03"))
  expect(parts[7]).toBe(`/${rootUuid}`)
  expect(parts[5]).toBe(parts[6])
  expect(parts[5]?.startsWith(`/${rootUuid}/`)).toBe(true)
})

test("the MIDI_PIN4 allowance keys the root stub label: its uuid, a nil aux, the root's path only", () => {
  const label = children(root, "label").filter((l) => l.atoms[0] === "MIDI_PIN4")
  expect(label.length).toBe(1)
  const uuid = label[0] === undefined ? "<none>" : child(label[0], "uuid")?.atoms[0]
  const key = exclusionKey(entry("CR-PEDAL-ROOT-MIDI-PIN4-ERC"), PEDAL, board, homes)
  expect(key).toBe(`label_dangling|2032000|685800|${uuid}|00000000-0000-0000-0000-000000000000|/${rootUuid}||`)
})

test("control: a root with GND's flag moved one pitch off its point refuses the ST key, naming the point", () => {
  withRootEdited('(lib_id "power:PWR_FLAG") (at 88.9 68.58 0)', '(lib_id "power:PWR_FLAG") (at 88.9 71.12 0)', (dir) => {
    expect(() => exclusionKey(entry("CR-PEDAL-LM66100-ST-ERC"), dir, board, homes)).toThrow("holds 0 PWR_FLAG(s) at")
  })
})

test("control: a root whose MIDI_PIN4 stub label is renamed refuses its key, naming the label", () => {
  withRootEdited('(label "MIDI_PIN4"', '(label "MIDI_PIN4_CUT"', (dir) => {
    expect(() => exclusionKey(entry("CR-PEDAL-ROOT-MIDI-PIN4-ERC"), dir, board, homes)).toThrow('holds 0 label(s) "MIDI_PIN4"')
  })
})

test("a PWR_FLAG partner named first, or flagged on a block page, is refused by name", () => {
  const st = pinEntry("CR-PEDAL-LM66100-ST-ERC")
  const swapped: PinAllowance = { ...st, pins: [st.pins[1], st.pins[0]] }
  expect(() => exclusionKey(swapped, PEDAL, board, homes)).toThrow("names its PWR_FLAG partner first")
  const onPage = { ...homes, shared: { ...homes.shared, GND: "expr_ref" } }
  expect(() => exclusionKey(st, PEDAL, board, onPage)).toThrow("a flag on a block page is not implemented here")
})
