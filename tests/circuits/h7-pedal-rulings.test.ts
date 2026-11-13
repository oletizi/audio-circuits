/**
 * The pedal's open choices, ruled (h7 pedal pages plan, Task 3). Every ruled value is a constant in
 * `circuits/h7-platform/pedal-rulings.ts` (or `pedal-population.ts`) that carries its ruling id; the id
 * is a heading in `docs/h7-platform/decisions.md`, labelled a controller ruling with a cost if wrong;
 * every `file:line` it cites exists and is not blank. Values the pedal adopts from the carrier or the
 * module are compared with the carrier's model and the module's constant, so a change there shows here.
 */
import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import type { Component } from "../../lib/model/index.ts"
import { h7Carrier } from "../../circuits/h7-platform/carrier-board.ts"
import { ID_STRAP } from "../../circuits/h7-platform/module-parts.ts"
import {
  CHASSIS_BOND_PAD, CONTROL_POSITION, DC_JACK, FB_IN_POSITION, FOOTSWITCH_CONNECTION, HW_REV_STRAP,
  I2C_EXPANSION, LED_SWITCH, LOGIC_DECOUPLING, PCM3060_VALUES, PEDAL_USB_C, PEDAL_USB_SWITCH, TEST_PADS,
  VBUS_CAP_IDS, VBUS_SENSE_CAP, controlPositionNets,
} from "../../circuits/h7-platform/pedal-rulings.ts"
import {
  CODEC10_SHEET_NOTE, MIDI, NOT_FITTED_CONNECTORS, NOT_FITTED_PARTS, POPULATION,
} from "../../circuits/h7-platform/pedal-population.ts"
import { symbolExistsOnDisk } from "../kicad/symbol-library-disk.ts"

const REPO = path.join(import.meta.dir, "../..")
const DECISIONS = fs.readFileSync(path.join(REPO, "docs/h7-platform/decisions.md"), "utf8")

interface Ruled { readonly ruling: string; readonly sources: readonly string[] }

const RULED: ReadonlyArray<readonly [string, Ruled]> = [
  ["CR-PEDAL-DC-JACK", DC_JACK],
  ["CR-PEDAL-FB-IN", FB_IN_POSITION],
  ["CR-PEDAL-CHASSIS-PAD", CHASSIS_BOND_PAD],
  ["CR-PEDAL-LOGIC-DECOUPLING", LOGIC_DECOUPLING],
  ["CR-PEDAL-TEST-PADS", TEST_PADS],
  ["CR-PEDAL-HW-REV", HW_REV_STRAP],
  ["CR-PEDAL-CONTROL-NODE", CONTROL_POSITION],
  ["CR-PEDAL-FOOTSWITCH", FOOTSWITCH_CONNECTION],
  ["CR-PEDAL-LED-MOSFET", LED_SWITCH],
  ["CR-PEDAL-USB-C", PEDAL_USB_C],
  ["CR-PEDAL-USBSW", PEDAL_USB_SWITCH],
  ["CR-PEDAL-VBUS-SENSE-CAP", VBUS_SENSE_CAP],
  ["CR-PEDAL-VBUS-IDS", VBUS_CAP_IDS],
  ["CR-PEDAL-MIDI", MIDI],
  ["CR-PEDAL-I2C-EXPANSION", I2C_EXPANSION],
  ["CR-PEDAL-PCM3060-VALUES", PCM3060_VALUES],
  ["CR-PEDAL-POPULATION", POPULATION],
]

/** The body of `### <id>` in decisions.md, up to the next heading. Throws when the heading is absent or repeated. */
function entry(id: string): string {
  const lines = DECISIONS.split("\n")
  const starts = lines.flatMap((line, i) => (line === `### ${id}` ? [i] : []))
  if (starts.length !== 1) throw new Error(`decisions.md has ${starts.length} headings "### ${id}"; expected exactly one`)
  const start = starts[0] ?? 0
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => line.startsWith("#"))
  return rest.slice(0, end === -1 ? rest.length : end).join("\n")
}

/** The text of a `path:line` citation, relative to the repository. */
function cited(source: string): string {
  const match = /^(.+):(\d+)$/.exec(source)
  if (match === null) throw new Error(`"${source}" is not a path:line citation`)
  const [, file, line] = match
  if (file === undefined || line === undefined) throw new Error(`"${source}" did not parse`)
  const lines = fs.readFileSync(path.join(REPO, file), "utf8").split("\n")
  const text = lines[Number(line) - 1]
  if (text === undefined) throw new Error(`${source}: the file has only ${lines.length} lines`)
  return text
}

function carrierPart(id: string): Component {
  const part = h7Carrier().components.find((c) => c.id === id)
  if (part === undefined) throw new Error(`the carrier model has no "${id}"`)
  return part
}

function capacitance(c: Component): number {
  if (!("farads" in c.parameters)) throw new Error(`${c.id} is not a capacitor`)
  return c.parameters.farads
}

function resistance(c: Component): number {
  if (!("ohms" in c.parameters)) throw new Error(`${c.id} is not a resistor`)
  return c.parameters.ohms
}

describe("every ruled constant", () => {
  for (const [id, constant] of RULED) {
    test(`${id}: the constant carries it, and decisions.md has it as a controller ruling with a cost`, () => {
      expect(constant.ruling).toBe(id)
      const body = entry(id)
      expect(body).toContain("Controller ruling (the owner may override)")
      expect(body).toContain("Costs if wrong:")
      expect(constant.sources.length).toBeGreaterThan(0)
      for (const source of constant.sources) expect(cited(source).trim().length).toBeGreaterThan(0)
    })
  }
})

describe("the rulings' content", () => {
  test("the symbols the rulings name exist on disk", () => {
    for (const symbol of [DC_JACK.part.symbol, FOOTSWITCH_CONNECTION.part.symbol, TEST_PADS.part.symbol, PEDAL_USB_C.part.symbol]) {
      if (symbol === undefined) throw new Error("a ruled part has no symbol")
      expect(symbolExistsOnDisk(symbol)).toBe(true)
    }
  })

  test("the DC jack is centre negative: the centre pin is GND, the sleeve is VIN", () => {
    expect(cited("docs/h7-platform/schematic-checklist.md:117")).toContain("centre pin GND, sleeve +V")
    expect(DC_JACK.pins).toEqual({ "1": "GND", "2": "VIN" })
  })

  test("FB_IN sits on the path both branches share, as the hot-plug model places it", () => {
    expect(cited("docs/h7-platform/power.md:28")).toContain("S2 choice")
    expect(FB_IN_POSITION.ferrite).toEqual({ a: "VIN", b: "VIN_FB" })
    expect(FB_IN_POSITION.cSch).toBe("VIN")
    expect(FB_IN_POSITION.cProtHf).toBe("VIN_A")
  })

  test("the logic decoupling is the data sheets' 0.1 uF, one per supply pin", () => {
    expect(LOGIC_DECOUPLING.parts.map((p) => [p.part, p.net, p.farads])).toEqual([
      ["U_ISO_M", "3V3_D", 100e-9], ["U_ISO_C", "3V3_CODEC", 100e-9], ["U_MIDIDRV", "3V3_D", 100e-9],
    ])
  })

  test("HW_REV is the module's revision-1 divider, read from the module's constant", () => {
    expect(HW_REV_STRAP.revision).toBe(1)
    expect(HW_REV_STRAP.topOhm).toBe(ID_STRAP.topOhm)
    expect(HW_REV_STRAP.bottomOhm).toBe(ID_STRAP.bottomOhm)
    expect(HW_REV_STRAP.pinCapF).toBe(ID_STRAP.pinCapF)
  })

  test("the control-position node joins the wiper, the pull-up, the button and the series resistor", () => {
    const n = controlPositionNets(3)
    expect(n.pot).toEqual({ ccw: "GND", wiper: "POS3_NODE", cw: "VREF_A" })
    expect(n.pullUp).toEqual({ a: "3V3_D", b: "POS3_NODE" })
    expect(n.button).toEqual({ "1": "POS3_NODE", "2": "POS3_BTN" })
    expect(n.buttonResistor).toEqual({ a: "POS3_BTN", b: "GND" })
    expect(n.series).toEqual({ a: "POS3_NODE", b: "POS3" })
    expect(n.pinCap).toEqual({ a: "POS3", b: "GND" })
    expect(() => controlPositionNets(0)).toThrow(/1 to 6/)
    expect(() => controlPositionNets(7)).toThrow(/1 to 6/)
  })

  test("the pedal's USB switch, sense divider and sense capacitor are the carrier's, read from its model", () => {
    expect(PEDAL_USB_SWITCH.decouplingFarads).toBe(capacitance(carrierPart("c_usbsw")))
    expect(VBUS_SENSE_CAP.farads).toBe(capacitance(carrierPart("c_vbus_sense")))
    expect(VBUS_SENSE_CAP.dividerTopOhm).toBe(resistance(carrierPart("r_vbus_top")))
    expect(VBUS_SENSE_CAP.dividerBottomOhm).toBe(resistance(carrierPart("r_vbus_bot")))
    expect(VBUS_CAP_IDS.esdBypass).toBe("c_vbus")
    expect(VBUS_CAP_IDS.senseNode).toBe("c_vbus_sense")
    expect(carrierPart(VBUS_CAP_IDS.esdBypass).id).toBe("c_vbus")
    expect(carrierPart(VBUS_CAP_IDS.senseNode).id).toBe("c_vbus_sense")
  })

  test("the PCM3060 values are chk:88-105's", () => {
    expect(cited("docs/h7-platform/schematic-checklist.md:98")).toContain("220 kΩ ± 5 % to DGND")
    expect(PCM3060_VALUES.modeToGndOhm).toBe(220e3)
    expect(PCM3060_VALUES.fmtToVddOhm).toBe(4.7e3)
    expect(PCM3060_VALUES.dempToGndOhm).toBe(4.7e3)
    expect(PCM3060_VALUES.ifmd).toBe("3V3_CODEC")
    for (const pin of ["vcc", "vdd", "vcom"] as const) expect(PCM3060_VALUES.decoupling[pin]).toEqual([100e-9, 10e-6])
  })
})

describe("CR-PEDAL-POPULATION", () => {
  test("CODEC-10's sheet note is quoted verbatim", () => {
    expect(cited("docs/h7-platform/schematic-checklist.md:105")).toContain(`"${CODEC10_SHEET_NOTE}"`)
  })

  test("every not-fitted position cites a line that says it is not fitted", () => {
    expect(NOT_FITTED_PARTS.map((p) => p.id)).toEqual([
      "codec_mode_link", "codec_demp_pullup", "codec_scl_link", "codec_sda_link", "codec_rst_pulldown",
    ])
    for (const position of [...NOT_FITTED_PARTS, ...NOT_FITTED_CONNECTORS]) {
      expect(cited(position.source)).toMatch(/not[- ]fitted|unpopulated/i)
      expect(position.ifFitted.length).toBeGreaterThan(0)
    }
  })

  test("the not-fitted MIDI header is modelled, and states why fitting it joins no on-board nets", () => {
    expect(NOT_FITTED_CONNECTORS.map((c) => c.id)).toEqual(["j_midi"])
    const header = NOT_FITTED_CONNECTORS[0]
    if (header === undefined) throw new Error("no connector")
    expect(header.pins).toEqual({ "1": "3V3_D", "2": "MIDI_UART_TX", "3": "MIDI_UART_RX", "4": "GND" })
    expect(header.part.electricallyInert).toBe(true)
  })

  test("the MIDI OUT loop is drawn up to the nets R-26 names; its connector and the MIDI IN receiver are not", () => {
    expect(MIDI.loopNets).toEqual({ pin4: "MIDI_PIN4", pin5: "MIDI_PIN5" })
    expect(MIDI.loopConnector).toBe("not drawn")
    expect(MIDI.receiver).toBe("not drawn")
    expect(I2C_EXPANSION.connector).toBe("not drawn")
  })
})
