/**
 * How each pedal project symbol in `circuits/h7-platform/h7-platform.kicad_sym` is made (h7 pedal
 * pages plan, Task 2; rulings CR-PEDAL-SYMBOL-<part> in docs/h7-platform/decisions.md).
 *
 * Each one is an installed stock symbol - the part's own where KiCad has one, else one of the same
 * package and pin positions - flattened, renamed, with every pin's name and electrical type set from
 * the part's data sheet table (`PEDAL_PIN_TABLES`), its Value, Datasheet and Description set to the
 * part, and its Footprint emptied (no document names a footprint, a schematic needs none, and the
 * stock one may be another package's). Geometry - body, pin positions, lengths, units - is the
 * stock symbol's, with ONE exception: a pin the stock symbol hides because it marks it not connected
 * (TPS7A41's NC pins 3, 6 and 7, the TPS7A24's and LM66100's pin 4) is a real pin of the fitted part
 * that a page may have to wire (NR/SS takes a capacitor; the LM66100's N/C goes to GND, analog.md:314),
 * so it is unhidden and moved to an empty slot on the body edge (`moves`). A stock pin stacked hidden
 * on another (the TPS7A41's exposed pad 9 on GND pin 4) is kept as it is: the pedal ties the PowerPAD
 * to GND (schematic-checklist.md:129), which is what the stacking draws.
 *
 * A pin keeps the stock symbol's spelling of its name where that spelling renders to the data sheet
 * name (KiCad's `V_{DD}` is the data sheet's subscripted VDD); otherwise it takes the data sheet's.
 *
 * TEST-SIDE, because it reads the installed KiCad libraries. `h7-pedal-parts.test.ts` regenerates
 * every symbol and compares it with the committed library by content; the writer that put them there
 * is `docs/superpowers/plans/2026-11-12-h7-pedal-pages-execution/task-2/write-project-symbols.ts`.
 */
import { librarySymbols, splitLibId } from "../../lib/kicad/symbol-library.ts"
import { PEDAL_PIN_TABLES } from "../../circuits/h7-platform/pedal-pin-tables.ts"
import { installedFlattenedSymbol } from "../kicad/symbol-library-disk.ts"
import { renderedName } from "./h7-pedal-symbols.ts"

/** One project symbol: its name, the stock symbol it is made from, and what it says about the part. */
export interface ProjectSymbolSpec {
  /** Key into `PEDAL_PIN_TABLES`. */
  readonly table: string
  readonly name: string
  readonly base: string
  readonly value: string
  readonly datasheet: string
  readonly description: string
  /** Hidden stock pins to show, pin number -> [x, y, angle] on the body edge, in the library frame. */
  readonly moves?: Readonly<Record<string, readonly [number, number, number]>>
}

export const PEDAL_PROJECT_SYMBOLS: readonly ProjectSymbolSpec[] = [
  {
    table: "PCM3060", name: "PCM3060PW", base: "Audio:PCM3060", value: "PCM3060PWR",
    datasheet: "https://www.ti.com/lit/ds/symlink/pcm3060.pdf",
    description: "PCM3060 stereo audio codec, TSSOP-28 (TI SLAS533B p. 7 and p. 8 Table 1; pin 27 MS/ADR/IFMD, pin 21 VCOM passive)",
  },
  {
    table: "OPA1688", name: "OPA1688xD", base: "Amplifier_Operational:OPA1692xD", value: "OPA1688IDR",
    datasheet: "https://www.ti.com/lit/ds/symlink/opa1688.pdf",
    description: "OPA1688 dual audio op-amp, SOIC-8, units A, B and supply (TI SBOS724A p. 3 Table 6-1)",
  },
  {
    table: "SN74LVC3G34", name: "SN74LVC3G34DCT", base: "74xGxx:74LVC3G34", value: "SN74LVC3G34DCTR",
    datasheet: "https://www.ti.com/lit/ds/symlink/sn74lvc3g34.pdf",
    description: "SN74LVC3G34 triple buffer, DCT (SM8), one unit per gate and one for supply (TI SCES366L p. 3)",
  },
  {
    table: "SN74LVC1G34", name: "SN74LVC1G34DBV", base: "74xGxx:74LVC1G34", value: "SN74LVC1G34DBVR",
    datasheet: "https://www.ti.com/lit/ds/symlink/sn74lvc1g34.pdf",
    description: "SN74LVC1G34 single buffer, SOT-23-5 DBV (TI SCES519O p. 3 Table 4-1)",
  },
  {
    table: "SN74LVC1G07", name: "SN74LVC1G07DBV", base: "74xGxx:74LVC1G07", value: "SN74LVC1G07DBVR",
    datasheet: "https://www.ti.com/lit/ds/symlink/sn74lvc1g07.pdf",
    description: "SN74LVC1G07 single buffer, open-drain output, SOT-23-5 DBV (TI SCES296AG p. 3)",
  },
  {
    table: "TPS3808G01", name: "TPS3808G01DBV", base: "Power_Supervisor:TPS3808DBV", value: "TPS3808G01DBVR",
    datasheet: "https://www.ti.com/lit/ds/symlink/tps3808.pdf",
    description: "TPS3808 supervisor, open-drain RESET, SOT-23-6 DBV (TI SBVS050N p. 4 Table 5-1)",
  },
  {
    table: "TPS7A4901", name: "TPS7A4901DGN", base: "Regulator_Linear:TPS7A4101DGN", value: "TPS7A4901DGNR",
    datasheet: "https://www.ti.com/lit/ds/symlink/tps7a49.pdf",
    description: "TPS7A49 adjustable LDO, HVSSOP-8 PowerPAD DGN (TI SBVS121E p. 4; pin 6 NR/SS, pin 7 DNC, pin 9 PowerPAD)",
    moves: { "3": [-7.62, 0, 0], "6": [7.62, 0, 180], "7": [0, 7.62, 270] },
  },
  {
    table: "TPS7A2433", name: "TPS7A2433DBV", base: "Regulator_Linear:TLV70033_SOT23-5", value: "TPS7A2433DBVR",
    datasheet: "https://www.ti.com/lit/ds/symlink/tps7a24.pdf",
    description: "TPS7A24 3.3 V fixed LDO, SOT-23-5 DBV (TI SBVS386E p. 3 Table 5-1, Fixed column)",
    moves: { "4": [7.62, -2.54, 180] },
  },
  {
    table: "LM66100", name: "LM66100DCK", base: "Power_Management:LM66100DCK", value: "LM66100DCKR",
    datasheet: "https://www.ti.com/lit/ds/symlink/lm66100.pdf",
    description: "LM66100 ideal diode, SC-70-6 DCK (TI SLVSEZ8A p. 3; pin 4 N/C not internally connected)",
    moves: { "4": [7.62, 0, 180] },
  },
  {
    table: "MCP6001", name: "MCP6001T-OT", base: "Amplifier_Operational:MCP6001-OT", value: "MCP6001T-I/OT",
    datasheet: "https://ww1.microchip.com/downloads/aemDocuments/documents/MSLD/ProductDocuments/DataSheets/MCP6001-1R-1U-2-4-1-MHz-Low-Power-Op-Amp-DS20001733L.pdf",
    description: "MCP6001 op-amp, SOT-23-5 (Microchip DS20001733L p. 11 Table 3-1)",
  },
  {
    table: "PESD12VL1BA", name: "PESD12VL1BA", base: "Device:D_TVS", value: "PESD12VL1BA,115",
    datasheet: "https://www.nexperia.com/product/PESD12VL1BA",
    description: "PESD12VL1BA bidirectional ESD diode, SOD323 (Nexperia PESDxL1BA Rev. 02 Table 2: 1 cathode 1, 2 cathode 2)",
  },
]

function quoted(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

/** The block with property `key`'s value replaced; refuses a property the block lacks. */
function withProperty(block: string, key: string, value: string): string {
  const pattern = new RegExp(`\\(property "${key}" "(?:[^"\\\\]|\\\\.)*"`)
  if (!pattern.test(block)) throw new Error(`the base symbol has no "${key}" property to set`)
  return block.replace(pattern, `(property "${key}" ${quoted(value)}`)
}

/** One project symbol's text, made from its stock base as the module comment says. */
export function projectSymbolText(spec: ProjectSymbolSpec): string {
  const table = PEDAL_PIN_TABLES[spec.table]
  if (table === undefined) throw new Error(`PEDAL_PIN_TABLES has no "${spec.table}" for project symbol ${spec.name}`)
  const { name: baseName } = splitLibId(spec.base)
  let block = installedFlattenedSymbol(spec.base)
    .replace(`(symbol "${baseName}"`, `(symbol "${spec.name}"`)
    .split(`(symbol "${baseName}_`).join(`(symbol "${spec.name}_`)
  const seen = new Set<string>()
  block = block.replace(
    /\(pin (\w+) (\w+)([\s\S]*?)\(name "((?:[^"\\]|\\.)*)"([\s\S]*?)\(number "([^"]*)"/g,
    (_all, _type: string, style: string, beforeName: string, stockName: string, beforeNumber: string, number: string) => {
      const want = table.pins[number]
      if (want === undefined) throw new Error(`${spec.base} pin ${number} is not in the ${spec.table} table`)
      seen.add(number)
      const name = renderedName(stockName) === renderedName(want.name) ? stockName : want.name
      const move = spec.moves?.[number]
      let head = beforeName
      if (move !== undefined) {
        if (!/\(hide yes\)/.test(head)) throw new Error(`${spec.name} moves pin ${number}, which the stock symbol does not hide`)
        head = head.replace(/\(at [^)]*\)/, `(at ${move.join(" ")})`).replace(/\s*\(hide yes\)/, "")
      }
      return `(pin ${want.type} ${style}${head}(name ${quoted(name)}${beforeNumber}(number "${number}"`
    },
  )
  const missing = Object.keys(table.pins).filter((n) => !seen.has(n))
  const strayMoves = Object.keys(spec.moves ?? {}).filter((n) => !seen.has(n))
  if (strayMoves.length > 0) throw new Error(`${spec.name} moves pins ${strayMoves.join(", ")}, which it does not have`)
  if (missing.length > 0) throw new Error(`${spec.base} has no pin ${missing.join(", ")} of the ${spec.table} table`)
  block = withProperty(block, "Value", spec.value)
  block = withProperty(block, "Footprint", "")
  block = withProperty(block, "Datasheet", spec.datasheet)
  block = withProperty(block, "Description", spec.description)
  return block
}

/** The project library's text with every pedal project symbol in place, added or replaced. */
export function libraryWithPedalSymbols(libraryText: string): string {
  let text = libraryText
  const existing = librarySymbols(text)
  for (const spec of PEDAL_PROJECT_SYMBOLS) {
    const fresh = projectSymbolText(spec)
    const old = existing.get(spec.name)
    if (old !== undefined) {
      text = text.replace(old, () => fresh)
      continue
    }
    const close = text.lastIndexOf(")")
    if (close < 0) throw new Error("the project library has no closing parenthesis")
    text = `${text.slice(0, close)}\t${fresh}\n${text.slice(close)}`
  }
  return text
}

/** The committed library's block for `name`, for comparing with `projectSymbolText`. */
export function committedSymbol(libraryText: string, name: string): string | undefined {
  return librarySymbols(libraryText).get(name)
}

