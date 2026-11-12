/**
 * Loader for ST's pin data for the STM32H743IIT6 (LQFP-176).
 *
 * Source: `vendor/st-pin-data/STM32H743IITx.xml`, byte for byte from
 * STMicroelectronics/STM32_open_pin_data (see `vendor/st-pin-data/SOURCE`).
 * Only the `<Pin>` elements and their `<Signal>` children are read. The file
 * is machine-generated and regular, so a small purpose-built reader is used and
 * no XML dependency is added.
 *
 * Refusals: any pin type other than the five below, or a pin count other than
 * 176, throws. A reader that skipped a pin it did not understand would let a
 * pin-map check pass against a partial package.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

export type McuPinType = "I/O" | "Power" | "Reset" | "Boot" | "MonoIO"

export interface McuPin {
  readonly name: string
  readonly position: number
  readonly type: McuPinType
  readonly signals: readonly string[]
}

export interface McuPinData {
  readonly pins: readonly McuPin[]
}

const DATA_PATH = join(import.meta.dir, "vendor", "st-pin-data", "STM32H743IITx.xml")
const PIN_COUNT = 176

/**
 * The port name of a pin. ST decorates some names: `PA13 (JTMS/SWDIO)`,
 * `PA14 (JTCK/SWCLK)`, `PH0-OSC_IN (PH0)`, `PC14-OSC32_IN`. The port is the
 * leading `Pxn` (or `Pxn_C`) of the name; a name that does not begin with one
 * (`VDD`, `NRST`, `BOOT0`) is returned whole.
 */
export function portName(pin: McuPin): string {
  const lead = /^(P[A-Z]\d+(?:_C)?)(?=$|[\s-])/.exec(pin.name)
  return lead?.[1] ?? pin.name
}

function isPinType(v: string): v is McuPinType {
  return v === "I/O" || v === "Power" || v === "Reset" || v === "Boot" || v === "MonoIO"
}

/** Reads one attribute of an element's opening tag; refuses if it is missing. */
function attribute(tag: string, name: string, where: string): string {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag)
  if (m === null || m[1] === undefined) throw new Error(`${where}: attribute ${name} is missing from ${tag}`)
  return m[1]
}

/** Parses ST's pin-data XML text. Exported so a test can feed it a bad one. */
export function parsePinData(xml: string): McuPinData {
  const pins: McuPin[] = []
  const element = /<Pin(\s[^>]*?)(\/>|>([\s\S]*?)<\/Pin>)/g
  for (const m of xml.matchAll(element)) {
    const tag = m[1] ?? ""
    const body = m[3] ?? ""
    const name = attribute(tag, "Name", "pin data")
    const type = attribute(tag, "Type", `pin ${name}`)
    if (!isPinType(type)) {
      throw new Error(`pin data: pin ${name} has type ${JSON.stringify(type)}, not one of I/O, Power, Reset, Boot, MonoIO; extend McuPinType deliberately with a test`)
    }
    const position = Number(attribute(tag, "Position", `pin ${name}`))
    if (!Number.isInteger(position)) throw new Error(`pin data: pin ${name} has a non-integer Position`)
    const signals = [...body.matchAll(/<Signal\s[^>]*?\bName="([^"]+)"/g)].map((s) => s[1] ?? "")
    pins.push({ name, position, type, signals })
  }
  if (pins.length !== PIN_COUNT) {
    throw new Error(`pin data must have exactly ${PIN_COUNT} <Pin> elements for the LQFP-176, found ${pins.length}`)
  }
  return { pins }
}

export function loadPinData(): McuPinData {
  return parsePinData(readFileSync(DATA_PATH, "utf8"))
}
