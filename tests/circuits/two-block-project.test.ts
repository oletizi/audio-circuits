// Design change C3, Step 4: the two-block test board's assembled project, its round trip through
// kicad-cli against the whole model, and the three negative controls that prove the round trip
// can fail on each way a multi-page drawing can be wrong at its boundary. Plus the positive
// controls: the copy-and-export harness, unedited, passes; and two LOCAL labels of one text on two
// sheets stay two nets.
//
// Label text, as tools/draught/drawing-pages.ts chooses it and TOOLING.md states it: a private
// net is drawn by its UNPREFIXED model name, so the model's a_FB and b_FB are both "FB" on their
// pages. Control 3 is written against that: it gives both private nets the SAME global text, FB.
// Turning each label global with a text of its own would leave two names that never join, and
// that control would prove nothing.
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { parse, type SList } from "../../lib/kicad/sexpr.ts"
import { compareSheetToModel } from "../../lib/kicad/sheet-agreement.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { DESIGNATORS, PIN_NUMBERS, twoBlockBoard } from "../fixtures/two-block-board/two-block-board.ts"
import { exportProjectRoot, registerDraftedProjectTests, type ProjectModel } from "./drafted-project.ts"
import { pinNumbersFromTable } from "../../lib/kicad/from-network.ts"

const BOARD = "two-block-board"
const DIR = path.join(moduleRepoRoot(), "tests", "fixtures", "two-block-board", "drafted")

function model(): ProjectModel {
  const network = twoBlockBoard()
  return { network, designators: new Map(Object.entries(DESIGNATORS)), pinNumbers: pinNumbersFromTable(network, PIN_NUMBERS) }
}

registerDraftedProjectTests({
  board: BOARD,
  circuit: "two-block-board",
  dir: DIR,
  netlist: "tests/fixtures/two-block-board/two-block-board.net",
  model,
  pinDisagreements: [],
  valueDisagreements: [],
  footprintComparisons: "none",
  footprintlessParts: [...twoBlockBoard().components.map((c) => c.id)].sort(),
})

// --- editing a copy of the assembled project ---

type Edit = { readonly start: number; readonly end: number; readonly text: string }

function applyEdits(text: string, edits: readonly Edit[]): string {
  return [...edits].sort((a, b) => b.start - a.start).reduce((t, e) => t.slice(0, e.start) + e.text + t.slice(e.end), text)
}

function lists(list: SList, head: string): SList[] {
  return list.lists.filter((l) => l.head === head)
}

function atom(list: SList, index: number): string {
  const value = list.atoms[index]?.value
  if (value === undefined) throw new Error(`(${list.head ?? ""} ...) has no atom ${index}`)
  return value
}

function point(list: SList): string {
  const at = lists(list, "at")[0]
  if (at === undefined) throw new Error(`(${list.head ?? ""} ...) has no (at ...)`)
  return `${Number(atom(at, 1))},${Number(atom(at, 2))}`
}

function wirePoints(wire: SList): string[] {
  const pts = lists(wire, "pts")[0]
  if (pts === undefined) throw new Error("a wire with no (pts ...)")
  return lists(pts, "xy").map((xy) => `${Number(atom(xy, 1))},${Number(atom(xy, 2))}`)
}

/** On the root: sheet `name`'s pin `pin` -> the wire leaving it, and the label at that wire's far end. */
function boundary(root: SList, sheetName: string, pin: string): { wire: SList; label: SList } {
  const sheet = lists(root, "sheet").find((s) => lists(s, "property").some((p) => atom(p, 1) === "Sheetname" && atom(p, 2) === sheetName))
  if (sheet === undefined) throw new Error(`the root has no sheet "${sheetName}"`)
  const pinList = lists(sheet, "pin").find((p) => atom(p, 1) === pin)
  if (pinList === undefined) throw new Error(`sheet "${sheetName}" has no pin "${pin}"`)
  const at = point(pinList)
  const wires = lists(root, "wire").filter((w) => wirePoints(w).includes(at))
  const [wire] = wires
  if (wire === undefined || wires.length !== 1) throw new Error(`expected one wire at sheet "${sheetName}" pin "${pin}", found ${wires.length}`)
  const far = wirePoints(wire).find((p) => p !== at)
  const label = lists(root, "label").find((l) => point(l) === far)
  if (label === undefined) throw new Error(`no label at the far end of sheet "${sheetName}" pin "${pin}"'s wire`)
  return { wire, label }
}

/** Copy the committed project to a scratch directory, edit it, export its root, and compare with the model. */
function roundTripOfEdited(edit: (dir: string) => void): { exported: ImportedNetlist; netMembership: readonly string[] } {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "two-block-control-"))
  try {
    for (const f of [`${BOARD}.kicad_sch`, "a.kicad_sch", "b.kicad_sch"]) fs.copyFileSync(path.join(DIR, f), path.join(scratch, f))
    edit(scratch)
    const exported = exportProjectRoot(scratch, BOARD)
    const { network, designators, pinNumbers } = model()
    return { exported, netMembership: compareSheetToModel(network, designators, pinNumbers, exported).netMembership }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
}

function rewrite(file: string, change: (text: string, tree: SList) => readonly Edit[]): void {
  const text = fs.readFileSync(file, "utf8")
  const edits = change(text, parse(text))
  expect(edits.length, `${path.basename(file)}: the control's edit found nothing to change`).toBeGreaterThan(0)
  const after = applyEdits(text, edits)
  expect(after, `${path.basename(file)}: the control's edit changed nothing`).not.toBe(text)
  fs.writeFileSync(file, after)
}

function netWith(exported: ImportedNetlist, member: string): readonly string[] {
  return Object.values(exported.nets).find((members) => members.includes(member)) ?? []
}

// --- positive controls ---

test("positive control: the copy-and-export harness, with no edit, passes the round trip", () => {
  // Without this, a control that fails could be failing because the harness does, not because of its edit.
  const { exported, netMembership } = roundTripOfEdited(() => undefined)
  expect(netMembership).toEqual([])
  expect(Object.keys(exported.nets)).toHaveLength(4)
})

test("positive control: each block sheet labels its private net with a LOCAL label of one text, FB, and the two stay two nets", () => {
  for (const block of ["a", "b"]) {
    const tree = parse(fs.readFileSync(path.join(DIR, `${block}.kicad_sch`), "utf8"))
    expect(lists(tree, "label").filter((l) => atom(l, 1) === "FB"), `block ${block}: local FB labels`).toHaveLength(1)
    expect(lists(tree, "global_label"), `block ${block}: global labels`).toHaveLength(0)
  }
  const { exported, netMembership } = roundTripOfEdited(() => undefined)
  expect(netMembership).toEqual([])
  expect([...netWith(exported, "R1.2")].sort()).toEqual(["C1.1", "R1.2", "R2.1"])
  expect([...netWith(exported, "R3.2")].sort()).toEqual(["C2.1", "R3.2", "R4.1"])
})

// --- the three negative controls (spec C3) ---

test("negative control 1, missing boundary connection: deleting the wire from sheet a's 3V3 pin fails the round trip", () => {
  const { exported, netMembership } = roundTripOfEdited((dir) =>
    rewrite(path.join(dir, `${BOARD}.kicad_sch`), (_text, root) => {
      const { wire } = boundary(root, "a", "3V3")
      return [{ start: wire.start, end: wire.end, text: "" }]
    }),
  )
  expect(netMembership).not.toEqual([])
  // block a's 3V3 pin no longer reaches block b's
  expect(netWith(exported, "R1.1")).not.toContain("R3.1")
})

test("negative control 2, wrong boundary connection: swapping sheet a's 3V3 and GND pin wires fails the round trip", () => {
  const { exported, netMembership } = roundTripOfEdited((dir) =>
    rewrite(path.join(dir, `${BOARD}.kicad_sch`), (text, root) => {
      // The two pins' wires are exchanged by exchanging what they reach: the parent-net label at
      // each wire's far end. Pin 3V3 of sheet a now lands on the root's GND net, and GND on 3V3.
      const v = boundary(root, "a", "3V3").label.atoms[1]
      const g = boundary(root, "a", "GND").label.atoms[1]
      if (v === undefined || g === undefined) throw new Error("a root label has no text")
      return [
        { start: v.start, end: v.end, text: text.slice(g.start, g.end) },
        { start: g.start, end: g.end, text: text.slice(v.start, v.end) },
      ]
    }),
  )
  expect(netMembership).not.toEqual([])
  expect(netWith(exported, "R1.1")).toContain("R4.2")
})

test("negative control 3, private nets sharing a name: FB drawn as the SAME global label on both sheets merges a_FB and b_FB, and the round trip fails", () => {
  const toGlobal = (text: string, tree: SList): Edit[] =>
    lists(tree, "label")
      .filter((l) => atom(l, 1) === "FB")
      .map((l) => {
        const at = lists(l, "at")[0]
        const uuid = lists(l, "uuid")[0]
        if (at === undefined || uuid === undefined) throw new Error("an FB label lacks (at) or (uuid)")
        const global = `(global_label "FB" (shape passive) ${text.slice(at.start, at.end)} (effects (font (size 1.27 1.27)) (justify left)) ${text.slice(uuid.start, uuid.end)})`
        return { start: l.start, end: l.end, text: global }
      })
  const { exported, netMembership } = roundTripOfEdited((dir) => {
    rewrite(path.join(dir, "a.kicad_sch"), toGlobal)
    rewrite(path.join(dir, "b.kicad_sch"), toGlobal)
  })
  expect(netMembership).not.toEqual([])
  expect([...netWith(exported, "R1.2")].sort()).toEqual(["C1.1", "C2.1", "R1.2", "R2.1", "R3.2", "R4.1"])
})
