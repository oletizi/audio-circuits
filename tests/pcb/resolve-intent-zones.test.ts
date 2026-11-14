/**
 * THE ZONE RESOLVER, and the invariant it exists to protect.
 *
 * `circuits/pt2399-core/floorplan-intent.json` is put forward for approval
 * with NO board coordinates in it: no envelope rect, no block zone, no compass
 * edge. Its geometry is fractions of whatever outline Task 8 settles on, and
 * `tools/pcb/resolve-intent-zones.ts` turns those into the rects and the edge
 * the engine reads. Two things therefore need holding:
 *
 *  1. **The approved file still declares no coordinates.** The last test here
 *     reads the committed file and fails if a literal rect or edge appears in
 *     it. That is the whole reason the resolver exists, and it is the thing a
 *     later well-meaning edit would undo first.
 *  2. **The resolver refuses rather than guessing**, in every way it can be
 *     asked something it has no answer to: a board with no Edge.Cuts (the
 *     outline is not its decision), an already-resolved intent, a zone naming
 *     a block that does not exist, a fraction outside 0..1, an inverted
 *     rectangle, an edge rule naming a connector that is not declared.
 *
 * It does NOT test that a resolved zone can hold its members - the engine's
 * own zone gate does that, and a second implementation here would grade the
 * reimplementation rather than the board.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import {
  longEdge,
  outlineBounds,
  resolveIntentZones,
  type Bounds,
} from "../../tools/pcb/resolve-intent-zones.ts"

const INTENT = path.resolve(import.meta.dir, "../../circuits/pt2399-core/floorplan-intent.json")

/** A board file with nothing on it but an Edge.Cuts rectangle. */
function boardWithOutline(x0: number, y0: number, x1: number, y1: number): string {
  const corners: readonly (readonly [number, number])[] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ]
  const lines = corners.slice(0, 4).map((from, i) => {
    const to = corners[i + 1] as readonly [number, number]
    return (
      `\t(gr_line\n\t\t(start ${from[0]} ${from[1]})\n\t\t(end ${to[0]} ${to[1]})\n` +
      `\t\t(stroke\n\t\t\t(width 0.05)\n\t\t\t(type default)\n\t\t)\n\t\t(layer "Edge.Cuts")\n\t)\n`
    )
  })
  return `(kicad_pcb\n\t(version 20260206)\n${lines.join("")})\n`
}

function approvedIntent(): Record<string, unknown> {
  const parsed: unknown = JSON.parse(fs.readFileSync(INTENT, "utf8"))
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${INTENT} is not a JSON object`)
  }
  return parsed as Record<string, unknown>
}

const B65: Bounds = { x0: 10, y0: 10, x1: 75, y1: 60 }

test("outlineBounds reads the Edge.Cuts bounding box", () => {
  expect(outlineBounds(boardWithOutline(10, 10, 75, 60), "fixture")).toEqual(B65)
})

test("outlineBounds refuses a board with no Edge.Cuts, and says whose decision that is", () => {
  expect(() => outlineBounds("(kicad_pcb\n\t(version 20260206)\n)\n", "fixture.kicad_pcb")).toThrow(
    /fixture\.kicad_pcb has no Edge\.Cuts geometry[\s\S]*Task 8/,
  )
})

test("longEdge is south when the outline is wider, east when taller, south on a square", () => {
  expect(longEdge({ x0: 0, y0: 0, x1: 65, y1: 50 })).toBe("south")
  expect(longEdge({ x0: 0, y0: 0, x1: 50, y1: 80 })).toBe("east")
  expect(longEdge({ x0: 0, y0: 0, x1: 40, y1: 40 })).toBe("south")
})

test("the committed intent resolves to the central half for delay_ic and a long edge for J1", () => {
  const resolved = resolveIntentZones(approvedIntent(), B65, INTENT)
  const blocks = resolved["blocks"] as readonly Record<string, unknown>[]
  const zoned = blocks.filter((b) => b["zone"] !== undefined)

  // Exactly one zone, and it is the IC's. More would be a floorplan drawn
  // before the outline; none would leave the seeder's decap stage dead.
  expect(zoned.map((b) => b["name"])).toEqual(["delay_ic"])
  expect(zoned[0]?.["zone"]).toEqual([26.25, 22.5, 58.75, 47.5])

  const connectors = resolved["edge_connectors"] as readonly Record<string, unknown>[]
  expect(connectors.map((c) => [c["ref"], c["edge"]])).toEqual([["J1", "south"]])
})

test("the resolver refuses an intent that already carries a rect", () => {
  const intent = approvedIntent()
  const blocks = (intent["blocks"] as readonly Record<string, unknown>[]).map((b) =>
    b["name"] === "delay_ic" ? { ...b, zone: [0, 0, 10, 10] } : b,
  )
  expect(() => resolveIntentZones({ ...intent, blocks }, B65, "x")).toThrow(
    /block "delay_ic" already carries a zone rect/,
  )
})

test("the resolver refuses an intent whose connector already carries an edge", () => {
  const intent = approvedIntent()
  const connectors = (intent["edge_connectors"] as readonly Record<string, unknown>[]).map((c) => ({
    ...c,
    edge: "north",
  }))
  expect(() => resolveIntentZones({ ...intent, edge_connectors: connectors }, B65, "x")).toThrow(
    /edge connector J1 already carries an edge/,
  )
})

/** Replace one key inside context.outline_derivation, leaving the rest alone. */
function withDerivation(patch: Record<string, unknown>): Record<string, unknown> {
  const intent = approvedIntent()
  const context = intent["context"] as Record<string, unknown>
  const derivation = context["outline_derivation"] as Record<string, unknown>
  return {
    ...intent,
    context: { ...context, outline_derivation: { ...derivation, ...patch } },
  }
}

test("the resolver refuses a zone for a block that does not exist", () => {
  expect(() =>
    resolveIntentZones(withDerivation({ zones: { no_such_block: [0, 0, 1, 1] } }), B65, "x"),
  ).toThrow(/names "no_such_block", which is not a declared block/)
})

test("the resolver refuses a millimetre figure where a fraction belongs", () => {
  expect(() => resolveIntentZones(withDerivation({ zones: { delay_ic: [0, 0, 26.25, 1] } }), B65, "x")).toThrow(
    /expected a fraction of the outline between 0 and 1, got 26\.25/,
  )
})

test("the resolver refuses an inverted or empty zone", () => {
  expect(() => resolveIntentZones(withDerivation({ zones: { delay_ic: [0.75, 0.25, 0.25, 0.75] } }), B65, "x")).toThrow(
    /is empty or inverted/,
  )
  expect(() => resolveIntentZones(withDerivation({ zones: { delay_ic: [0.5, 0.5, 0.5, 0.75] } }), B65, "x")).toThrow(
    /is empty or inverted/,
  )
})

test("the resolver refuses an edge rule naming a connector the intent does not declare", () => {
  expect(() =>
    resolveIntentZones(
      withDerivation({ header_edge: { ref: "J9", rule: "the long edge" } }),
      B65,
      "x",
    ),
  ).toThrow(/names "J9", which is not in edge_connectors/)
})

test("the resolver refuses an intent with no outline_derivation at all", () => {
  const intent = approvedIntent()
  const context = { ...(intent["context"] as Record<string, unknown>) }
  delete context["outline_derivation"]
  expect(() => resolveIntentZones({ ...intent, context }, B65, "x")).toThrow(
    /no context\.outline_derivation/,
  )
})

test("THE APPROVED INTENT STILL DECLARES NO BOARD COORDINATES", () => {
  const intent = approvedIntent()
  expect(intent["envelope"]).toBeUndefined()
  for (const block of intent["blocks"] as readonly Record<string, unknown>[]) {
    expect(block["zone"]).toBeUndefined()
  }
  for (const connector of intent["edge_connectors"] as readonly Record<string, unknown>[]) {
    expect(connector["edge"]).toBeUndefined()
  }
  // Keepouts are the mounting holes, which Task 8 derives from its own rule;
  // the approved file carries none for the same reason the zones are fractions.
  expect(intent["keepouts"]).toEqual([])
})
