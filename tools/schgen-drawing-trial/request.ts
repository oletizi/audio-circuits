/**
 * **THE USER REQUEST THE SCHGEN DRAWING TRIAL SENDS, GENERATED FROM THE BOARD MODEL ONLY.**
 *
 * The spec (`docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md`, "The user request")
 * makes this the one piece of text in the prompt not taken from SchGen, and fixes its shape for
 * every board: three sections, in this order, one item per line, nothing else.
 *
 *     PARTS:
 *     <designator> <value> <library:symbol>
 *     NETS:
 *     <net>: <designator.pin> <designator.pin> ...
 *     LABELS:
 *     <label> -> <net>
 *
 * **WHAT IT READS.** `modelForSheet(board)`'s `Network` and the reference each part carries,
 * `pinNumbersFor` for the symbol pin each canonical pin sits on, plus `valueFor` and
 * `intendedLibId`.
 *
 * **PIN NUMBERS COME FROM THE RULE, NOT FROM `modelForSheet`'s `pinNumbers`.** That map overlays
 * `DECLARED_PIN_NUMBERS` (`tests/circuits/sheet-model.ts`), which its own comment calls *"a pin
 * map the committed page declares and no rule derives"*: `pultec-low-boost`'s `R2` with `a`/`b`
 * swapped so the approved page's `out` wire runs straight. That is electrically a no-op, but it is
 * a layout fact taken from the approved drawing, so it stays out of the request. The test asserts
 * `R1.1` is on `out` for that board, which fails if the declared map comes back.
 *
 * **It opens no `.kicad_sch`**: nothing about where
 * the approved page put anything can reach the text, and `tests/schgen-trial/request.test.ts`
 * checks that no coordinate pair, rotation, mirror or UUID from the approved sheet appears in it.
 * The references are the model's annotation (`sheetDesignators`, network order counted per
 * prefix), which carries no placement.
 *
 * **THE GROUND NET IS NAMED `GND`.** The model names it `0` (SPICE's ground). SchGen is given
 * stock `power:GND` and no `PWR_FLAG` (the spec's departures table), so the ground net is
 * written under the name that symbol carries; the board's ground port is therefore not repeated
 * as a label. Every other port is a `LABELS` line, as the spec directs ("the board's ports as
 * labels"). A pin the model marks `nc` is on no net and appears in no `NETS` line.
 *
 * **HOW SCHGEN'S OWN REQUESTS STATE CONNECTIVITY**, read at the pinned commit
 * `0707520c587984651cd32908acfd9b117876e93b`. SchGen ships no request files: `sch_examples/`
 * holds the IMU example's programs and sheet, not a request. Its training requests are written by
 * a second model from each source schematic's netlist and image, under the instruction
 * `q_detailed` in `dataset_construction/make_dataset.py:77`, whose own example is: *"I want an IMU
 * module with the chip of ICM-20948 as U2, one 1.8v rail, 4 gnd rails, 3 capacitors with C1: 1.0
 * uF, C2: 0.1 uF, C3: 0.1 uF and 6 labels. U2 pin 1 is connected to the 1.8V rail, C1 pin 1, C2
 * pin 1, C3 pin 1, U2 pin 3 is connected to label INT, ..."* and which asks that it read *"like
 * an actual human customer"*. The inference-time request in `schematic_generation/generate.py` is
 * free text from a person. The Hugging Face dataset was not downloaded.
 *
 * - **Followed:** parts are named by reference designator with their value; pins are named by the
 *   symbol's pin NUMBER, which is what their `get_pin_location` / `connect_pins` take and what
 *   their example says ("U2 pin 1"); a net is stated as the full set of pins it joins, which is how
 *   their example groups a net ("connected to ... C1 pin 1, C2 pin 1, C3 pin 1"); a port is a
 *   label joined to a net, as in "connected to label INT"; ground is a power rail rather than a
 *   label.
 * - **Departed, and named as a departure:** their requests are prose; this is a fixed line format
 *   (`U2.1`, not "U2 pin 1"), with no function description, because the spec forbids hand-written
 *   or descriptive text and requires the request to parse back into a netlist. A netlist-shaped
 *   request may be off their training distribution; the spec accepts that cost rather than hiding
 *   it. Their requests also never name a library symbol in the request text - the symbol context
 *   that follows does - while this one names `library:symbol` on each part line as the spec
 *   directs, which ties each designator to its entry in that context.
 *
 * CLI: `bun tools/schgen-drawing-trial/request.ts BOARD OUT_DIR` writes `request.json` (the
 * `TrialRequest`) and `request.txt` (its `text`), byte-identical on every run. It does not check
 * the board's approval: `./boards.ts`'s `approvedSheetDigest` is that gate, kept out of this file
 * so the generator touches no sheet at all.
 */
import fs from "node:fs"
import path from "node:path"
import { intendedLibId } from "../../lib/kicad/sheet-agreement.ts"
import { valueFor } from "../../lib/kicad/value-notation.ts"
import type { Component } from "../../lib/model/types.ts"
import { modelForSheet } from "../../tests/circuits/sheet-model.ts"
import { pinNumbersFor } from "../../tests/circuits/sheet-pin-numbers.ts"
import { assertTrialBoard } from "./boards.ts"

export interface TrialRequest {
  board: string
  text: string
  symbols: string[]
  netlist: {
    components: { designator: string; value: string; symbol: string }[]
    nets: Record<string, string[]>
    labels: Record<string, string>
  }
}

type Netlist = TrialRequest["netlist"]

/** The model's ground net, and the name the request gives it. */
const MODEL_GROUND = "0"
const GROUND = "GND"
const GROUND_SYMBOL = "power:GND"

/**
 * A symbol on a PARTS line: exactly `library:symbol`, refused here where it is created rather
 * than left for `parseRequest` to reject on the way back. A bare entry name ("R") names no
 * library, so it is not a symbol SchGen's symbol context or a schematic could place.
 */
export function symbolToken(text: string): string {
  if (!/^[^\s:]+:[^\s:]+$/.test(text)) {
    throw new Error(
      `symbol "${text}" is not a library:symbol id with exactly one colon and no whitespace. ` +
        "A PARTS line names the symbol a schematic places, which is always library-qualified; " +
        "the library is not guessed, because two libraries may carry an entry of the same name.",
    )
  }
  return text
}

/** A token on a request line: no whitespace, and no `:` that would read as a net header. */
function token(text: string, what: string): string {
  if (!/^[^\s:]+$/.test(text)) {
    throw new Error(
      `${what} "${text}" cannot be written on a request line: the format separates fields by ` +
        "single spaces and marks a net with a trailing colon, so a field holding whitespace or a " +
        "stray colon would parse back as something else. Not escaped or rewritten, because " +
        "SchGen must see the model's own name and the round trip must be exact.",
    )
  }
  return text
}

function requestNetName(net: string): string {
  if (net === GROUND) {
    throw new Error(
      `the model has a net already named "${GROUND}", and the request renames the model's ground ` +
        `net "${MODEL_GROUND}" to "${GROUND}". The two would merge in the request. Rename the ` +
        "model net; it is not suffixed here, because a renamed net is a claim nobody reviewed.",
    )
  }
  return token(net === MODEL_GROUND ? GROUND : net, "net")
}

/** Compares strings by code unit, so the order never depends on a locale. */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function pinGroups(component: Component): [string, Component["pins"][string]][] {
  return [component.pins, ...component.units.map((unit) => unit.pins)].flatMap((g) => Object.entries(g))
}

/**
 * Canonical pin -> symbol pin number for the request: `pinNumbersFor`'s rule, by kind and by the
 * part tables, with no page-declared override. Exported so the tests compare against this same
 * map.
 */
export function requestPinNumbers(component: Component): ReadonlyMap<string, string> {
  return pinNumbersFor(component)
}

/** The netlist the request states for `board`, from its model alone. */
function netlistFor(board: string): Netlist {
  const model = modelForSheet(board)
  const components: Netlist["components"] = []
  const nets: Record<string, string[]> = {}
  for (const component of model.network.components) {
    const designator = model.designators.get(component.id)
    if (designator === undefined) {
      throw new Error(
        `modelForSheet("${board}") gave component "${component.id}" no designator, so the ` +
          "request cannot name it. tests/circuits/sheet-model.ts builds one for every " +
          "component; reaching this means that changed.",
      )
    }
    // THE RULE, NEVER `model.pinNumbers`: that map carries DECLARED_PIN_NUMBERS, a pin swap
    // the approved page declares for its own wiring (see the module comment).
    const numbers = requestPinNumbers(component)
    components.push({
      designator: token(designator, "designator"),
      value: token(valueFor(component), "value"),
      symbol: symbolToken(intendedLibId(component)),
    })
    for (const [pin, connection] of pinGroups(component)) {
      if (connection.kind === "nc") continue
      const number = numbers.get(pin)
      if (number === undefined) {
        throw new Error(
          `component "${component.id}" pin "${pin}" has no pin number from pinNumbersFor, ` +
            "so the request cannot say which symbol pin joins the net. Not guessed: a wrong " +
            "number moves a connection to another pin of the drawn symbol.",
        )
      }
      ;(nets[requestNetName(connection.net)] ??= []).push(`${designator}.${token(number, "pin")}`)
    }
  }
  const sortedNets: Record<string, string[]> = {}
  for (const name of Object.keys(nets).sort(byCodeUnit)) sortedNets[name] = (nets[name] ?? []).sort(byCodeUnit)
  const labels: Record<string, string> = {}
  for (const port of Object.keys(model.network.ports).sort(byCodeUnit)) {
    const net = model.network.ports[port]
    if (net === undefined || net === MODEL_GROUND) continue
    const name = requestNetName(net)
    if (sortedNets[name] === undefined) {
      throw new Error(`port "${port}" names net "${net}", which no pin of "${board}" is on`)
    }
    labels[token(port, "label")] = name
  }
  return { components, nets: sortedNets, labels }
}

function render(netlist: Netlist): string {
  const lines = ["PARTS:"]
  for (const c of netlist.components) lines.push(`${c.designator} ${c.value} ${c.symbol}`)
  lines.push("NETS:")
  for (const [net, pins] of Object.entries(netlist.nets)) lines.push(`${net}: ${pins.join(" ")}`)
  lines.push("LABELS:")
  for (const [label, net] of Object.entries(netlist.labels)) lines.push(`${label} -> ${net}`)
  return `${lines.join("\n")}\n`
}

/** The trial's request for one of `TRIAL_BOARDS`. */
export function buildRequest(board: string): TrialRequest {
  assertTrialBoard(board)
  const netlist = netlistFor(board)
  const symbols = [...new Set([...netlist.components.map((c) => c.symbol), GROUND_SYMBOL])].sort(byCodeUnit)
  return { board, text: render(netlist), symbols, netlist }
}

function refuse(lineNo: number, line: string, why: string): never {
  throw new Error(`request line ${lineNo} "${line}": ${why}`)
}

/**
 * Parses request text back into its netlist, refusing anything outside the fixed format: a
 * section out of order, a line before `PARTS:`, a malformed line, a repeated designator, net or
 * label, a pin on an undeclared part or on two nets, or a label naming a net that is not listed.
 */
export function parseRequest(text: string): Netlist {
  const body = text.endsWith("\n") ? text.slice(0, -1) : text
  const sections = ["PARTS:", "NETS:", "LABELS:"]
  let section = -1
  const components: Netlist["components"] = []
  const nets: Record<string, string[]> = {}
  const labels: Record<string, string> = {}
  const seenPins = new Set<string>()
  body.split("\n").forEach((line, i) => {
    const n = i + 1
    if (sections.includes(line)) {
      if (line !== sections[section + 1]) refuse(n, line, `sections must be ${sections.join(" ")} in that order`)
      section += 1
      return
    }
    if (section === 0) {
      const m = /^(\S+) (\S+) ([^\s:]+:[^\s:]+)$/.exec(line)
      if (m === null) refuse(n, line, "a PARTS line is <designator> <value> <library:symbol>")
      const [, designator = "", value = "", symbol = ""] = m
      if (components.some((c) => c.designator === designator)) refuse(n, line, "designator repeated")
      components.push({ designator, value, symbol })
    } else if (section === 1) {
      const m = /^([^\s:]+): (\S+(?: \S+)*)$/.exec(line)
      if (m === null) refuse(n, line, "a NETS line is <net>: <designator.pin> ...")
      const [, net = "", list = ""] = m
      if (nets[net] !== undefined) refuse(n, line, "net repeated")
      const pins = list.split(" ")
      for (const pin of pins) {
        const ref = /^([^\s.]+)\.([^\s.]+)$/.exec(pin)
        if (ref === null) refuse(n, line, `"${pin}" is not <designator>.<pin>`)
        if (!components.some((c) => c.designator === ref[1])) refuse(n, line, `"${pin}" names an undeclared part`)
        if (seenPins.has(pin)) refuse(n, line, `"${pin}" is on more than one net`)
        seenPins.add(pin)
      }
      nets[net] = pins
    } else if (section === 2) {
      const m = /^(\S+) -> (\S+)$/.exec(line)
      if (m === null) refuse(n, line, "a LABELS line is <label> -> <net>")
      const [, label = "", net = ""] = m
      if (labels[label] !== undefined) refuse(n, line, "label repeated")
      if (nets[net] === undefined) refuse(n, line, `label names net "${net}", which NETS does not list`)
      labels[label] = net
    } else {
      refuse(n, line, "text before PARTS:")
    }
  })
  if (section !== 2) throw new Error(`request text ends without all three sections ${sections.join(" ")}`)
  return { components, nets, labels }
}

function main(argv: readonly string[]): void {
  const [board, outDir] = argv
  if (board === undefined || outDir === undefined || argv.length !== 2) {
    throw new Error("usage: bun tools/schgen-drawing-trial/request.ts BOARD OUT_DIR")
  }
  const request = buildRequest(board)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, "request.json"), `${JSON.stringify(request, null, 2)}\n`)
  fs.writeFileSync(path.join(outDir, "request.txt"), request.text)
}

if (import.meta.main) main(process.argv.slice(2))
