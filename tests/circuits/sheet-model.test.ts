import { expect, test } from "bun:test"
import { DESIGNATORS, PIN_NUMBERS } from "../../circuits/h7-platform/carrier-board.ts"
import { everyPin, pinNumberFor } from "../../lib/kicad/from-network.ts"
import { modelForSheet } from "./sheet-model.ts"

test("the carrier's sheet model uses the carrier's own designators", () => {
  const model = modelForSheet("h7-carrier")
  expect(Object.fromEntries(model.designators)).toEqual({ ...DESIGNATORS })
})

test("the carrier's sheet model uses the carrier's own pin numbers", () => {
  const model = modelForSheet("h7-carrier")
  expect(model.network.components.length).toBeGreaterThan(0)
  for (const component of model.network.components) {
    const expected = new Map(everyPin(component).map((pin) => [pin, pinNumberFor(component, pin, PIN_NUMBERS)]))
    expect(model.pinNumbers.get(component.id)).toEqual(expected)
  }
  // Literals read off the symbols, not off PIN_NUMBERS: h7-platform:TS3USB221RSER numbers D- as 7
  // (circuits/h7-platform/h7-platform.kicad_sym), and Connector:USB_C_Receptacle_USB2.0_16P numbers
  // its SHIELD pin "SH" (KiCad's Connector.kicad_sym).
  expect(model.pinNumbers.get("u_usbsw")?.get("7")).toBe("7")
  expect(model.pinNumbers.get("j_usb")?.get("SH")).toBe("SH")
})

test("an undeclared board still refuses", () => {
  expect(() => modelForSheet("no-such-board")).toThrow(/no drafted-page model is declared/)
})
