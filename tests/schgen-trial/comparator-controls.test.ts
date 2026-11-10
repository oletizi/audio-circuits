/**
 * **THE COMPARATOR IS PROVEN BEFORE IT IS TRUSTED** (spec
 * `docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md`, "Comparator proof").
 *
 * `compareAttempt` reports how an exported netlist's connectivity agrees with the board model, and
 * reports the approved page's own lists beside it as a baseline. Every case here runs on
 * `pultec-low-boost`'s fresh `kicad-cli` export: a known-equal case, then deliberately altered
 * copies, each of which must be reported. Netlist mutations edit a copy of the export in a temp
 * dir; the two power-symbol cases edit a temp COPY of the sheet and re-export it, because a power
 * symbol's library and `#PWR` designator never reach the netlist text and can only be altered
 * where they live. No committed file is modified.
 *
 * `kicad-cli` is required: `exportDraftedSheet` and `exportSheet` below throw, rather than skip,
 * when it is missing.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { importNetlist, KICAD_CLI } from "../../lib/kicad/netlist.ts"
import { compareSheetToModel, type SheetAgreement } from "../../lib/kicad/sheet-agreement.ts"
import { draftedDir, draftedSheet } from "../circuits/drafted-sheet.ts"
import { defaultKicadCliExists, defaultRunExport } from "../../tools/perfboard/netlist-sync.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { TRIAL_CIRCUIT } from "../../tools/schgen-drawing-trial/boards.ts"
import { compareAttempt, trialModel } from "../../tools/schgen-drawing-trial/compare.ts"

const BOARD = "pultec-low-boost"
const TIMEOUT_MS = 60_000

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "schgen-trial-comparator-"))
}

/** Exports `sheet` with the real `kicad-cli` into `dir`, returning the netlist path. */
function exportSheet(sheet: string, dir: string): string {
  if (!defaultKicadCliExists(KICAD_CLI)) {
    throw new Error(`kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI; this test does not skip.`)
  }
  const out = path.join(dir, `${path.basename(sheet, ".kicad_sch")}.net`)
  defaultRunExport(KICAD_CLI, sheet, out, moduleRepoRoot())
  return out
}

/** A fresh export of the approved page, in its own temp dir. */
function approvedExport(): { dir: string; net: string } {
  const dir = tempDir()
  return { dir, net: exportSheet(draftedSheet(TRIAL_CIRCUIT, BOARD), dir) }
}

// ---- netlist-text mutation helpers --------------------------------------------------------------

const NET_BLOCK = /\t\t\(net\n[\s\S]*?\n\t\t\)\n/g
const NODE_BLOCK = /\t\t\t\(node\n[\s\S]*?\n\t\t\t\)\n/g

interface NetBlock {
  name: string
  nodes: string[]
}

function nameOf(block: string): string {
  const match = /\(name "([^"]*)"\)/.exec(block)
  if (match === null || match[1] === undefined) throw new Error(`net block without a name: ${block}`)
  return match[1]
}

function refPinOf(node: string): string {
  const ref = /\(ref "([^"]*)"\)/.exec(node)
  const pin = /\(pin "([^"]*)"\)/.exec(node)
  if (ref === null || pin === null || ref[1] === undefined || pin[1] === undefined) {
    throw new Error(`node block without ref/pin: ${node}`)
  }
  return `${ref[1]}.${pin[1]}`
}

/** Splits the netlist text into its prefix, its net blocks and its suffix. */
function splitNets(text: string): { head: string; nets: NetBlock[]; tail: string } {
  const blocks = [...text.matchAll(NET_BLOCK)]
  const first = blocks[0]
  const last = blocks[blocks.length - 1]
  if (first === undefined || last === undefined || first.index === undefined || last.index === undefined) {
    throw new Error("the export has no (net) blocks in the expected layout")
  }
  return {
    head: text.slice(0, first.index),
    nets: blocks.map((b) => ({ name: nameOf(b[0]), nodes: [...b[0].matchAll(NODE_BLOCK)].map((n) => n[0]) })),
    tail: text.slice(last.index + last[0].length),
  }
}

function joinNets(head: string, nets: NetBlock[], tail: string): string {
  const body = nets
    .map((n, i) => `\t\t(net\n\t\t\t(code "${String(i + 1)}")\n\t\t\t(name "${n.name}")\n\t\t\t(class "Default")\n${n.nodes.join("")}\t\t)\n`)
    .join("")
  return `${head}${body}${tail}`
}

/** Applies `edit` to the nets of the export at `net`, writing the result beside it. */
function mutateNetlist(net: string, label: string, edit: (nets: NetBlock[]) => NetBlock[]): string {
  const { head, nets, tail } = splitNets(fs.readFileSync(net, "utf8"))
  const out = path.join(path.dirname(net), `${label}.net`)
  fs.writeFileSync(out, joinNets(head, edit(nets), tail))
  return out
}

/** The first net with at least `size` members, by name order. */
function netWith(nets: NetBlock[], size: number, except: string[] = []): NetBlock {
  const found = nets.find((n) => n.nodes.length >= size && !except.includes(n.name))
  if (found === undefined) throw new Error(`no net with ${String(size)} members to mutate`)
  return found
}

function movePin(nets: NetBlock[]): NetBlock[] {
  const from = netWith(nets, 3)
  const to = netWith(nets, 2, [from.name])
  const node = from.nodes.pop()
  if (node === undefined) throw new Error("unreachable: netWith gave a net with no nodes")
  to.nodes.push(node)
  return nets
}

function mergeNets(nets: NetBlock[]): NetBlock[] {
  const a = netWith(nets, 2)
  const b = netWith(nets, 2, [a.name])
  a.nodes.push(...b.nodes)
  return nets.filter((n) => n !== b)
}

function renameNet(nets: NetBlock[]): NetBlock[] {
  const target = netWith(nets, 2)
  target.name = "0"
  return nets
}

/** Swaps the pin numbers of two pins of one two-pin part that sit on different nets. */
function swapPinNumbers(nets: NetBlock[]): NetBlock[] {
  const where = new Map<string, NetBlock>()
  for (const n of nets) for (const node of n.nodes) where.set(refPinOf(node), n)
  for (const [member, net] of where) {
    const [ref, pin] = member.split(".")
    // R2 is skipped: the approved page already carries R2's pins swapped against rule numbering,
    // so swapping them here would remove a baseline disagreement rather than add one.
    if (ref === undefined || pin !== "1" || ref === "R2") continue
    const other = where.get(`${ref}.2`)
    if (other === undefined || other === net) continue
    const i = net.nodes.findIndex((x) => refPinOf(x) === member)
    const j = other.nodes.findIndex((x) => refPinOf(x) === `${ref}.2`)
    const a = net.nodes[i]
    const b = other.nodes[j]
    if (a === undefined || b === undefined) throw new Error("unreachable: node index lost")
    net.nodes[i] = a.replace('(pin "1")', '(pin "2")')
    other.nodes[j] = b.replace('(pin "2")', '(pin "1")')
    return nets
  }
  throw new Error("no two-pin part with pins 1 and 2 on different nets to swap")
}

/** Takes one pin off a shared net and gives it its own net, the way kicad-cli carries an unconnected pin. */
function disconnectPin(nets: NetBlock[]): NetBlock[] {
  const from = netWith(nets, 3)
  const node = from.nodes.pop()
  if (node === undefined) throw new Error("unreachable: netWith gave a net with no nodes")
  const [ref, pin] = refPinOf(node).split(".")
  return [...nets, { name: `unconnected-(${String(ref)}-Pad${String(pin)})`, nodes: [node] }]
}

// ---- sheet-copy mutation helpers (power symbols) ------------------------------------------------

/** Copies the approved page and its project files into a temp dir, edits the sheet, re-exports. */
function exportEditedSheet(edit: (text: string) => string): string {
  const dir = tempDir()
  const src = draftedDir(TRIAL_CIRCUIT, BOARD)
  for (const file of fs.readdirSync(src)) {
    if (/\.(kicad_sch|kicad_pro)$/.test(file) || file === "sym-lib-table") {
      fs.copyFileSync(path.join(src, file), path.join(dir, file))
    }
  }
  const sheet = path.join(dir, path.basename(draftedSheet(TRIAL_CIRCUIT, BOARD)))
  const before = fs.readFileSync(sheet, "utf8")
  const after = edit(before)
  if (after === before) throw new Error("the sheet edit changed nothing, so this case would test nothing")
  fs.writeFileSync(sheet, after)
  return exportSheet(sheet, dir)
}

/** Every ground symbol drawn from stock `power:GND`, with every `#PWR` designator renumbered. */
function restyleGround(text: string): string {
  const renumbered = new Map<string, string>()
  return text
    .replaceAll("copperhead_power:GND", "power:GND")
    .replace(/#PWR0\d+/g, (ref) => {
      const seen = renumbered.get(ref)
      if (seen !== undefined) return seen
      const next = `#PWR${String(500 + renumbered.size)}`
      renumbered.set(ref, next)
      return next
    })
}

/** One ground symbol's `Value` changed to `AGND`, splitting the ground net. */
function renameOneGround(text: string): string {
  const at = text.indexOf('(lib_id "copperhead_power:GND")')
  if (at < 0) throw new Error("the sheet places no copperhead_power:GND symbol")
  const value = '(property "Value" "GND"'
  const v = text.indexOf(value, at)
  if (v < 0) throw new Error("the first placed ground symbol has no Value property")
  return `${text.slice(0, v)}(property "Value" "AGND"${text.slice(v + value.length)}`
}

// ---- the cases --------------------------------------------------------------------------------

function nonEmpty(a: SheetAgreement): string[] {
  return [...a.componentIdentity, ...a.pinIdentity, ...a.netMembership]
}

test("known equal: the approved export agrees with itself as baseline", () => {
  const { net } = approvedExport()
  const { attempt, approvedBaseline } = compareAttempt(BOARD, net)
  expect(attempt).toEqual(approvedBaseline)
}, TIMEOUT_MS)

test("pin moved to another net: netMembership reports it", () => {
  const { net } = approvedExport()
  const { attempt, approvedBaseline } = compareAttempt(BOARD, mutateNetlist(net, "moved", movePin))
  expect(attempt.netMembership.length).toBeGreaterThan(approvedBaseline.netMembership.length)
}, TIMEOUT_MS)

test("two nets merged: netMembership reports it", () => {
  const { net } = approvedExport()
  const { attempt, approvedBaseline } = compareAttempt(BOARD, mutateNetlist(net, "merged", mergeNets))
  expect(attempt.netMembership.length).toBeGreaterThan(approvedBaseline.netMembership.length)
}, TIMEOUT_MS)

test("net renamed: equal to the baseline, because names do not count", () => {
  const { net } = approvedExport()
  const { attempt, approvedBaseline } = compareAttempt(BOARD, mutateNetlist(net, "renamed", renameNet))
  expect(attempt.netMembership).toEqual(approvedBaseline.netMembership)
  expect(attempt).toEqual(approvedBaseline)
}, TIMEOUT_MS)

test("pin numbers swapped between two pins of one part: reported", () => {
  const { net } = approvedExport()
  const { attempt, approvedBaseline } = compareAttempt(BOARD, mutateNetlist(net, "swapped", swapPinNumbers))
  expect(nonEmpty(attempt).length).toBeGreaterThan(nonEmpty(approvedBaseline).length)
}, TIMEOUT_MS)

test("pin left unconnected: reported", () => {
  const { net } = approvedExport()
  const { attempt, approvedBaseline } = compareAttempt(BOARD, mutateNetlist(net, "unconnected", disconnectPin))
  expect(attempt.netMembership.length).toBeGreaterThan(approvedBaseline.netMembership.length)
}, TIMEOUT_MS)

test("power symbol restyled (stock power:GND, renumbered #PWR, value still GND): equal to baseline", () => {
  const { attempt, approvedBaseline } = compareAttempt(BOARD, exportEditedSheet(restyleGround))
  expect(attempt).toEqual(approvedBaseline)
}, TIMEOUT_MS)

test("power symbol renamed on one pin (GND to AGND): netMembership reports the split", () => {
  const { attempt, approvedBaseline } = compareAttempt(BOARD, exportEditedSheet(renameOneGround))
  expect(attempt.netMembership.length).toBeGreaterThan(approvedBaseline.netMembership.length)
}, TIMEOUT_MS)

test("nothing adjusted: attempt equals a direct compareSheetToModel on the same export and model", () => {
  const { net } = approvedExport()
  const moved = mutateNetlist(net, "moved-direct", movePin)
  const model = trialModel(BOARD)
  const direct = compareSheetToModel(
    model.network,
    model.designators,
    model.pinNumbers,
    importNetlist(fs.readFileSync(moved, "utf8")),
  )
  const { attempt, approvedBaseline } = compareAttempt(BOARD, moved)
  expect(attempt).toEqual(direct)
  // The baseline is reported beside the attempt and never subtracted from it.
  expect(attempt).not.toEqual(approvedBaseline)
}, TIMEOUT_MS)

/**
 * `DECLARED_PIN_NUMBERS` keys the swap by component id `R2`, whose sheet designator is whatever
 * the model assigns - read from the model, not written here. The swap keeps R2's pin-number SET
 * at {1, 2}, so `pinIdentity` cannot see it; it moves which pin is on which net, so
 * `netMembership` does.
 */
test("pultec-low-boost's baseline carries the approved page's declared R2 pin swap, in netMembership", () => {
  const ref = trialModel(BOARD).designators.get("R2")
  if (ref === undefined) throw new Error(`${BOARD}'s model has no component "R2"`)
  const { approvedBaseline } = compareAttempt(BOARD, approvedExport().net)
  const mentions = (e: string): boolean => e.includes(`${ref}.1`) || e.includes(`${ref}.2`) || e.startsWith(`${ref} `)
  expect(approvedBaseline.netMembership.filter(mentions).length).toBeGreaterThan(0)
  expect(approvedBaseline.pinIdentity.filter(mentions)).toEqual([])
}, TIMEOUT_MS)
