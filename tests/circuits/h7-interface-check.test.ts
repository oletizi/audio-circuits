import { test, expect } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { loadContract, parseContract, socketPadFor } from "../../circuits/h7-platform/contract.ts"
import { checkInterface } from "../../circuits/h7-platform/interface-check.ts"
import type { BoardKind } from "../../circuits/h7-platform/interface-check.ts"
import { NC, net } from "../../lib/model/index.ts"
import type { Component, Connection, Network } from "../../lib/model/index.ts"

const SOCKETS = { J_MOD_A: "j_mod_a", J_MOD_B: "j_mod_b" }
type Overrides = Readonly<Record<number, Connection | "absent">>

/** Test fixture only: a board whose socket pads follow the contract for `board`, with per-pin overrides. */
function fixture(board: BoardKind, overrides: Overrides = {}, extra: readonly Component[] = []): Network {
  const pads: Record<"J_MOD_A" | "J_MOD_B", Record<string, Connection>> = { J_MOD_A: {}, J_MOD_B: {} }
  const breakouts: Record<string, Connection> = {}
  for (const cp of loadContract().pins) {
    const { part, pad } = socketPadFor(cp.pin)
    const override = overrides[cp.pin]
    if (override === "absent") continue
    let connection: Connection
    if (override !== undefined) connection = override
    else if (cp.signal !== null) connection = net(cp.signal)
    else if (board === "carrier") {
      connection = net(`RESERVED_${cp.pin}`)
      breakouts[`r${cp.pin}`] = connection
    } else connection = NC
    pads[part][String(pad)] = connection
  }
  const socket = (id: string, pins: Record<string, Connection>): Component =>
    ({ id, kind: "connector", parameters: {}, pins: {}, units: [{ name: "MAIN", pins }] })
  return {
    blocks: [],
    components: [
      socket(SOCKETS.J_MOD_A, pads.J_MOD_A), socket(SOCKETS.J_MOD_B, pads.J_MOD_B),
      socket("breakout", breakouts), ...extra,
    ],
    ports: {},
  }
}

test("a board whose socket nets equal the contract passes", () => {
  for (const board of ["carrier", "module", "pedal"] as const) {
    expect(checkInterface(fixture(board), board, SOCKETS).mismatches).toEqual([])
  }
})

test("a signal net misnamed on one pad is reported", () => {
  const { mismatches } = checkInterface(fixture("module", { 8: net("RELAY") }), "module", SOCKETS)
  expect(mismatches).toHaveLength(1)
  expect(mismatches[0]).toContain("pin 8")
  expect(mismatches[0]).toContain("J_MOD_A pad 8")
  expect(mismatches[0]).toContain("RELAY_EN")
  expect(mismatches[0]).toContain('"RELAY"')
})

test("contract pin 21 on J_MOD_A pad 1 is reported", () => {
  // Pin 21 (VREF_A) belongs on J_MOD_B pad 1; here it is placed on J_MOD_A pad 1 instead.
  const board = fixture("module", { 1: net("VREF_A"), 21: "absent" })
  const { mismatches } = checkInterface(board, "module", SOCKETS)
  expect(mismatches.some((m) => m.includes("pin 1 ") && m.includes("J_MOD_A pad 1"))).toBe(true)
  expect(mismatches.some((m) => m.includes("pin 21") && m.includes("J_MOD_B pad 1"))).toBe(true)
})

test("a reserved pin connected on the pedal is reported", () => {
  const { mismatches } = checkInterface(fixture("pedal", { 16: net("AUDIO_L") }), "pedal", SOCKETS)
  expect(mismatches).toHaveLength(1)
  expect(mismatches[0]).toContain("pin 16")
  expect(mismatches[0]).toContain("nc")
})

test("a reserved pad the socket does not list is a mismatch, not nc", () => {
  const { mismatches } = checkInterface(fixture("module", { 16: "absent" }), "module", SOCKETS)
  expect(mismatches).toHaveLength(1)
  expect(mismatches[0]).toContain("J_MOD_A pad 16")
  expect(mismatches[0]).toContain("missing")
})

test("a pad 21 on J_MOD_A is reported", () => {
  const board = fixture("module")
  const withStray: Network = {
    ...board,
    components: board.components.map((c) => c.id === SOCKETS.J_MOD_A
      ? { ...c, units: [{ name: "MAIN", pins: { ...c.units[0]?.pins, "21": net("VREF_A") } }] } : c),
  }
  const { mismatches } = checkInterface(withStray, "module", SOCKETS)
  expect(mismatches).toHaveLength(1)
  expect(mismatches[0]).toContain('J_MOD_A pad "21"')
})

test("a carrier reserved pin with one breakout terminal passes", () => {
  expect(checkInterface(fixture("carrier"), "carrier", SOCKETS).mismatches).toEqual([])
})

test("a carrier reserved pin reaching a second part is reported", () => {
  const second: Component = {
    id: "intruder", kind: "connector", parameters: {}, pins: {},
    units: [{ name: "MAIN", pins: { "1": net("RESERVED_16") } }],
  }
  const { mismatches } = checkInterface(fixture("carrier", {}, [second]), "carrier", SOCKETS)
  expect(mismatches).toHaveLength(1)
  expect(mismatches[0]).toContain("pin 16")
  expect(mismatches[0]).toContain("exactly 2 members")
})

test("a carrier reserved pin left nc is reported", () => {
  const { mismatches } = checkInterface(fixture("carrier", { 16: NC }), "carrier", SOCKETS)
  expect(mismatches).toHaveLength(1)
  expect(mismatches[0]).toContain("RESERVED_16")
})

test("protectionUnchecked lists exactly the contract's failsafe pins", () => {
  const raw: unknown = JSON.parse(readFileSync(join(import.meta.dir, "../../circuits/h7-platform/module-interface.json"), "utf8"))
  const expected: number[] = []
  if (typeof raw === "object" && raw !== null && "pins" in raw && Array.isArray(raw.pins)) {
    for (const p of raw.pins) {
      if (typeof p === "object" && p !== null && "pin" in p && "failsafeRequired" in p &&
        typeof p.pin === "number" && p.failsafeRequired === true) expected.push(p.pin)
    }
  }
  expect(expected.length).toBeGreaterThan(0)
  expect(checkInterface(fixture("module"), "module", SOCKETS).protectionUnchecked).toEqual(expected)
})

test("the loader refuses a 39-pin contract", () => {
  const full = loadContract()
  expect(full.pins).toHaveLength(40)
  expect(() => parseContract({ status: "draft", pins: full.pins.slice(1) })).toThrow(/exactly 40 pins/)
})

test("the loader refuses a repeated pin number", () => {
  const pins = loadContract().pins.map((p) => (p.pin === 40 ? { ...p, pin: 39 } : p))
  expect(() => parseContract({ status: "draft", pins })).toThrow(/repeated/)
})

test("moduleMcuPin is kept, a string or null", () => {
  const pins = loadContract().pins
  expect(pins.find((p) => p.pin === 1)?.moduleMcuPin).toBe("PB12")
  expect(pins.find((p) => p.pin === 22)?.moduleMcuPin).toBe("PC0")
  expect(pins.filter((p) => p.moduleMcuPin === null)).toHaveLength(9)
})

test("a pin without moduleMcuPin refuses", () => {
  const raw = JSON.parse(readFileSync(join(import.meta.dir, "../../circuits/h7-platform/module-interface.json"), "utf8"))
  const missing = { ...raw, pins: raw.pins.map((p: Record<string, unknown>) => {
    if (p.pin !== 3) return p
    const { moduleMcuPin: _dropped, ...rest } = p
    return rest
  }) }
  expect(() => parseContract(missing)).toThrow(/pin 3.*moduleMcuPin/)
  const wrongType = { ...raw, pins: raw.pins.map((p: Record<string, unknown>) => (p.pin === 3 ? { ...p, moduleMcuPin: 7 } : p)) }
  expect(() => parseContract(wrongType)).toThrow(/pin 3.*moduleMcuPin/)
})
