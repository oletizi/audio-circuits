import { test, expect } from "bun:test"
import { loadPinData, parsePinData, portName } from "../../circuits/h7-platform/st-pin-data.ts"
import { MODULE_PINS } from "../../circuits/h7-platform/module-pins.ts"
import { checkPinMap, interfaceOccupancy } from "../../circuits/h7-platform/pin-map-check.ts"
import type { InterfacePin } from "../../circuits/h7-platform/pin-map-check.ts"

const data = loadPinData()

const interfacePins = interfaceOccupancy

test("the pin data has 176 pins, and PH5 at 46 lists FMC_SDNWE", () => {
  expect(data.pins).toHaveLength(176)
  const ph5 = data.pins.find((p) => p.name === "PH5")
  expect(ph5?.position).toBe(46)
  expect(ph5?.signals).toContain("FMC_SDNWE")
  expect(data.pins.filter((p) => p.type === "Power")).toHaveLength(33)
})

test("ST decorates the debug and oscillator pin names, and portName strips them", () => {
  const at = (n: number) => data.pins.filter((p) => p.position === n).map(portName)
  expect([at(124), at(137), at(29), at(30)]).toEqual([["PA13"], ["PA14"], ["PH0"], ["PH1"]])
  const ports = data.pins.filter((p) => p.type === "I/O").map(portName)
  expect(ports.filter((n) => !/^P[A-K]\d+(_C)?$/.test(n))).toEqual([])
  expect(new Set(ports).size).toBe(ports.length)
})

test("the pin data loader refuses an unknown pin type and a wrong count", () => {
  expect(() => parsePinData('<Pin Name="X" Position="1" Type="Weird"/>')).toThrow(/Weird/)
  expect(() => parsePinData('<Pin Name="X" Position="1" Type="I/O"/>')).toThrow(/176/)
})

test("every assignment names a signal ST lists on that pin", () => {
  for (const a of MODULE_PINS) {
    const pin = data.pins.find((p) => portName(p) === a.pin)
    expect(pin, `${a.net}: ${a.pin} is not a pin in ST's data`).toBeDefined()
    expect(pin?.signals, `${a.net}: ${a.signal} is not listed on ${a.pin}`).toContain(a.signal)
    expect(a.source.length).toBeGreaterThan(0)
  }
  expect(checkPinMap(MODULE_PINS, interfacePins(), data)).toEqual([])
})

test("no pin and no net is used twice across the internal map and the 31 interface pins", () => {
  const iface = interfacePins()
  expect(iface).toHaveLength(31)
  const pins = [...MODULE_PINS.map((a) => a.pin), ...iface.map((p) => p.pin)]
  const nets = [...MODULE_PINS.map((a) => a.net), ...iface.map((p) => p.net)]
  expect(new Set(pins).size).toBe(pins.length)
  expect(new Set(nets).size).toBe(nets.length)
})

test("the ID strap pin follows CR-MODULE-ID-STRAP-PIN", () => {
  const taken = new Set([
    ...MODULE_PINS.filter((a) => a.net !== "MODULE_ID_STRAP").map((a) => a.pin),
    ...interfacePins().map((p) => p.pin),
  ])
  const adc = /^ADC\d_INP\d+$/
  const candidate = [...data.pins]
    .sort((a, b) => a.position - b.position)
    .find((p) => p.type === "I/O" && !taken.has(portName(p)) && p.signals.some((s) => adc.test(s)))
  expect(candidate).toBeDefined()
  const strap = MODULE_PINS.filter((a) => a.net === "MODULE_ID_STRAP")
  expect(strap).toHaveLength(1)
  expect(candidate).toBeDefined()
  if (candidate === undefined) return
  expect(strap[0]?.pin).toBe(portName(candidate))
  expect(adc.test(strap[0]?.signal ?? "")).toBe(true)
})

test("the SDRAM control pins moved by D23 are on PH5, PH3 and PH2", () => {
  const byNet = new Map(MODULE_PINS.map((a) => [a.net, a.pin]))
  expect(byNet.get("SDRAM_NWE")).toBe("PH5")
  expect(byNet.get("SDRAM_NE")).toBe("PH3")
  expect(byNet.get("SDRAM_CKE")).toBe("PH2")
})

test("a function not on its pin is reported, naming the pin and the function", () => {
  const bad = [{ net: "SDRAM_NWE", pin: "PC1", signal: "FMC_SDNWE", source: "negative control" }]
  const problems = checkPinMap(bad, [], data)
  expect(problems.some((p) => p.includes("PC1") && p.includes("FMC_SDNWE"))).toBe(true)
})

test("an assignment on an interface pin is reported, naming both nets", () => {
  const bad = [{ net: "SDRAM_NWE", pin: "PC0", signal: "FMC_SDNWE", source: "negative control" }]
  const problems = checkPinMap(bad, [{ net: "POS1", pin: "PC0" }], data)
  expect(problems.some((p) => p.includes("SDRAM_NWE") && p.includes("POS1") && p.includes("PC0"))).toBe(true)
})

test("a net named twice and a pin used twice inside the internal map are reported", () => {
  const twice = [
    { net: "A", pin: "PH5", signal: "FMC_SDNWE", source: "negative control" },
    { net: "A", pin: "PH3", signal: "FMC_SDNE0", source: "negative control" },
    { net: "B", pin: "PH3", signal: "FMC_SDNE0", source: "negative control" },
  ]
  const problems = checkPinMap(twice, [], data).join("\n")
  expect(problems).toMatch(/net A/)
  expect(problems).toMatch(/PH3/)
})

test("the real loaded contract rejects an internal assignment to PC0", () => {
  const onPc0 = [...MODULE_PINS.filter((a) => a.net !== "SDRAM_NWE"),
    { net: "SDRAM_NWE", pin: "PC0", signal: "FMC_SDNWE", source: "negative control" }]
  const problems = checkPinMap(onPc0, interfacePins(), data)
  expect(problems.some((p) => p.includes("PC0") && p.includes("POS1"))).toBe(true)
})

test("a decorated interface pin name collides with an internal assignment", () => {
  const problems = checkPinMap(MODULE_PINS, [{ net: "X", pin: "PA13 (JTMS/SWDIO)" }], data)
  expect(problems.some((p) => p.includes("PA13") && p.includes("SWDIO") && p.includes("X"))).toBe(true)
})

test("a nonexistent interface port is reported", () => {
  const problems = checkPinMap(MODULE_PINS, [{ net: "Y", pin: "PZ99" }], data)
  expect(problems.some((p) => p.includes("PZ99") && p.includes("Y"))).toBe(true)
})

test("interfaceOccupancy skips only null moduleMcuPin", () => {
  expect(interfaceOccupancy()).toHaveLength(31)
})
