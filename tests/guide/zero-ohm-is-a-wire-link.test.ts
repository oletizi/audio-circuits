/**
 * A part that resolves to 0 Ω is a WIRE LINK everywhere the packet shows it -
 * in the checklist and in the layout images both.
 *
 * WHAT THIS ASSERTS AND WHY IT IS THE REAL BOARD. `docs/known-gaps.md`'s G55
 * recorded that `boards/pultec-low-boost/wiring.md` tells a builder to fit a
 * wire where the generated packet for the SAME board listed `0R` in its
 * **Resistors and trim-pots** table with mounting `STAND ON END`. The premise
 * being asserted - "exactly these three parts on this board are 0 Ω" - is a
 * fact about that board, so it is read from the real `.vrt` through the real
 * pinned veroroute binary, the same shape `tests/guide/cut-separates.test.ts`
 * and `tests/guide/junction-pad-rows.test.ts` use.
 *
 * THE COST IS CREDIBILITY, NOT A PURCHASE, and the owner's words set the bar
 * (2026-10-18): *"I'm not likely to go looking for a 0 ohm resistor. But, I am
 * likely to question the validity of a perfboard layout that specifies 0 ohm
 * resistors."* So these assertions are about the packet no longer SPECIFYING
 * one - no `0R` value, no mounting for a body that does not exist, and no
 * resistor outline drawn in those holes - rather than about explaining one more
 * carefully.
 *
 * A 0 Ω RESISTOR IS NOT BANNED FROM THE MODEL AND THIS FILE MUST NOT BE READ AS
 * BANNING IT. `lib/model/control-state.ts:293-297` emits the zero section on
 * purpose so component counts stay stable across a SPICE sweep, and the owner
 * states that such a part is legitimate on a fabricated board. Everything here
 * is about how the packet RENDERS it.
 *
 * THE SET IS DERIVED, NEVER TAKEN FROM THE LIST OF THREE NAMES. The names are
 * asserted as the premise so that a board that grew a fourth zero-ohm part, or
 * silently lost these three, fails here instead of passing the clauses below by
 * having nothing to check.
 */
import { test, expect } from "bun:test"
import path from "node:path"
import { MOUNTING_LABEL } from "../../lib/kicad/lead-span-mounting.ts"
import { isZeroOhmResistor } from "../../lib/model/zero-ohm.ts"
import { buildChecklist, type ChecklistSection } from "../../tools/guide/checklist.ts"
import { assertLayoutMatchesCircuit, componentAt, loadBoardCircuit, type BoardCircuit } from "../../tools/guide/circuit.ts"
import { holeName, type BoardDump } from "../../tools/guide/dump.ts"
import { nodeMembers } from "../../tools/guide/node-members.ts"
import { offBoardLabels, valueLabel } from "../../tools/guide/off-board.ts"
import { padLabelOf } from "../../tools/guide/pad-label.ts"
import { padTerminals } from "../../tools/guide/pads.ts"
import { buildableDump } from "../../tools/guide/preflight.ts"
import { renderLayout } from "../../tools/guide/render.ts"
import { wireLinkRefs } from "../../tools/guide/wire-links.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { runnerFor } from "../../tools/perfboard/verbs.ts"

const REPO_ROOT = moduleRepoRoot()
const DECLARATION = loadDeclaration(path.join(REPO_ROOT, "boards", "pultec-low-boost", "perfboard.json"))

/** The three stand-in sections sitting at a level pot's end stop on this board. */
const ZERO_OHM_PARTS = [
  "SI_HI_BOOST_RV_HI_BOOST.ccw-wiper",
  "SI_HI_CUT_RV_HI_CUT.ccw-wiper",
  "SI_LOW_CUT_RV_LO_CUT.ccw-wiper",
]

interface Board {
  readonly dump: BoardDump
  readonly circuit: BoardCircuit
  readonly checklist: readonly ChecklistSection[]
  readonly zeroOhm: readonly string[]
}

/** The real board, through the real pinned veroroute binary and the real pipeline. */
async function lowBoost(): Promise<Board> {
  const run = runnerFor({})(["--dump-board", DECLARATION.vrtPath])
  if (run.status !== 0) {
    throw new Error(`veroroute --dump-board ${DECLARATION.vrtPath} exited ${run.status}:\n${run.output}`)
  }
  const dumpText = run.output
  const dump = buildableDump(dumpText, DECLARATION.vrtPath)
  const pads = padTerminals(dumpText)
  const circuit = await loadBoardCircuit(DECLARATION)
  assertLayoutMatchesCircuit(dump, circuit, pads)
  const padLabels = new Map(pads.map((pad) => [pad.identity, padLabelOf(componentAt(circuit, pad.ref), pad.pin)]))
  const checklist = buildChecklist(dump, circuit, offBoardLabels(circuit), pads, padLabels, nodeMembers(dumpText))
  const zeroOhm = dump.parts
    .filter((part) => isZeroOhmResistor(componentAt(circuit, part.ref)))
    .map((part) => part.ref)
    .sort()
  return { dump, circuit, checklist, zeroOhm }
}

function section(checklist: readonly ChecklistSection[], title: string): ChecklistSection {
  const found = checklist.find((candidate) => candidate.title === title)
  if (found === undefined) throw new Error(`test: buildChecklist produced no "${title}" section`)
  return found
}

test("the premise: exactly three of pultec-low-boost's parts resolve to 0 ohms", async () => {
  const { dump, circuit, zeroOhm } = await lowBoost()
  expect(dump.parts.length, "the premise: low-boost carries parts at all").toBeGreaterThan(0)
  expect(zeroOhm, "the zero-ohm set, derived from the dump and the circuit").toEqual([...ZERO_OHM_PARTS].sort())
  // The non-zero half of each pot pair, and the board's own resistor, are not
  // in that set: a predicate that answered true for every resistor would pass
  // the clauses below while breaking every other row on the sheet.
  expect(isZeroOhmResistor(componentAt(circuit, "R2")), "R2 (56K) is not a wire link").toBe(false)
  expect(
    isZeroOhmResistor(componentAt(circuit, "SI_HI_BOOST_RV_HI_BOOST.wiper-cw")),
    "the 47K half of the same pot is not a wire link",
  ).toBe(false)
})

test("no checklist row calls a zero-ohm part 0R, and none gives it a mounting", async () => {
  const { checklist, zeroOhm } = await lowBoost()
  const mountings = Object.values(MOUNTING_LABEL)
  for (const ref of zeroOhm) {
    const rows = checklist.flatMap((part) => part.rows).filter((row) => row[0] === ref)
    expect(rows.length, `${ref} appears on the checklist`).toBeGreaterThan(0)
    for (const row of rows) {
      for (const cell of row) {
        expect(cell, `${ref}: no cell may read 0R`).not.toBe("0R")
        for (const mounting of mountings) {
          expect(cell, `${ref}: no cell may carry the mounting "${mounting}"`).not.toContain(mounting)
        }
      }
    }
  }
  // AND NOWHERE ELSE ON THE SHEET: these three were the only 0 Ω parts, so any
  // surviving `0R` cell is one of them printed by a path this test did not key
  // on its ref. THE TEST IS THE WHOLE CELL, not a substring: this board also
  // carries a 430R resistor, which is a real part and must keep its value.
  const zeroCells = checklist.flatMap((part) => part.rows).flat().filter((cell) => cell === "0R")
  expect(zeroCells, "no checklist cell anywhere reads 0R").toEqual([])
})

test("each zero-ohm part is listed as a wire link, in words a builder can act on", async () => {
  const { dump, checklist, zeroOhm } = await lowBoost()
  const links = section(checklist, "Wire links")
  // The W-numbered wires are untouched: this adds rows, it does not replace the
  // section's own contents.
  expect(links.rows.filter((row) => /^W\d+$/.test(row[0] ?? "")).length, "the board's own wire links").toBe(
    dump.wires.length,
  )
  for (const ref of zeroOhm) {
    const row = links.rows.find((candidate) => candidate[0] === ref)
    if (row === undefined) throw new Error(`${ref} is not listed in the Wire links section`)
    const holes = (dump.pins[ref] ?? []).map((pin) => holeName(pin.row, pin.col))
    expect(holes.length, `${ref} has two lead holes in the dump`).toBe(2)
    expect(holes, `${ref}'s From hole`).toContain(row[1] ?? "")
    expect(holes, `${ref}'s To hole`).toContain(row[2] ?? "")
    expect(row[1], `${ref}'s two holes are different`).not.toBe(row[2])
  }
  // THE WORDS, not just the placement: a row under a heading is where it is,
  // and the section has to say what to do with it.
  expect(links.note ?? "", "the Wire links section tells the builder what to fit").toContain(
    "wire or a solder bridge",
  )
})

test("neither layout image draws a body for a zero-ohm part; each is drawn as a wire", async () => {
  const { dump, circuit, zeroOhm } = await lowBoost()
  const pads = padTerminals(
    runnerFor({})(["--dump-board", DECLARATION.vrtPath]).output,
  )
  const padLabels = new Map(pads.map((pad) => [pad.identity, padLabelOf(componentAt(circuit, pad.ref), pad.pin)]))
  const wireLinks = wireLinkRefs(dump, circuit)
  expect([...wireLinks].sort(), "the renderer is handed the same three refs").toEqual([...ZERO_OHM_PARTS].sort())
  const common = {
    view: "component" as const,
    edgeLabels: offBoardLabels(circuit),
    pads,
    padLabels,
    wireLinks,
  }
  const designators = renderLayout(
    dump,
    new Map(dump.parts.map((part) => [part.ref, part.ref])),
    { ...common, title: "low-boost - designators" },
  )
  const values = renderLayout(
    dump,
    new Map(dump.parts.map((part) => [part.ref, valueLabel(dump, part, circuit, "image")])),
    { ...common, title: "low-boost - values" },
  )
  const placed = dump.parts.filter((part) => part.placement !== "floating").length
  for (const [name, svg] of [["designators", designators], ["values", values]] as const) {
    const bodies = (svg.match(/class="part-body"/g) ?? []).length
    expect(bodies, `${name}: one body per placed part except the three wire links`).toBe(placed - zeroOhm.length)
    for (const ref of zeroOhm) {
      const drawn = [...svg.matchAll(/<line\s[^>]*class="wire"[^>]*>/g)]
        .map((match) => match[0])
        .filter((element) => element.includes(`data-ref="${ref}"`))
      expect(drawn.length, `${name}: ${ref} is drawn as one wire`).toBe(1)
    }
  }
  // THE PICTURE STOPS SPECIFYING THE PART, not just the table: the values image
  // prints each part's value beside it, and `0R` there is the eyebrow the owner
  // described. Matched as a whole printed label (`>0R<`), because the board's
  // 430R resistor legitimately prints a string containing `0R`.
  expect([...values.matchAll(/>0R</g)].length, "the values image never prints 0R as a label").toBe(0)
  expect([...values.matchAll(/>430R</g)].length, "the 430R resistor still prints its value").toBe(1)
})

test("a non-zero resistor keeps its value and its mounting", async () => {
  const { dump, circuit, checklist } = await lowBoost()
  const r2 = section(checklist, "Resistors and trim-pots").rows.find((row) => row[0] === "R2")
  if (r2 === undefined) throw new Error("R2 is not in the Resistors and trim-pots section")
  expect(r2[1], "R2's value").toBe("56K")
  expect(Object.values(MOUNTING_LABEL), "R2 keeps a derived mounting").toContain(r2[3] ?? "")
  const part = dump.parts.find((candidate) => candidate.ref === "R2")
  if (part === undefined) throw new Error("R2 has no PART line")
  expect(valueLabel(dump, part, circuit, "image"), "R2's image label").toBe("56K")
})
