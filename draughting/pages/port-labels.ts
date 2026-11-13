/**
 * Each port's hierarchical label must sit on the net the model puts that port on (the module's ruling
 * CR-MODULE-PORT-LABEL-CHECK). `compareSheetToModel` compares MEMBERSHIP, which a one-pin port cannot
 * fail: swap two one-pin ports' labels and every net still holds the same pins. This compares NAMES.
 *
 * The expected side is the board's `drawingPages()` `ports` for the block: each port's name and the
 * block's pins on it, as `DESIGNATOR.PIN`. The found side is the kicad-cli export of the block sheet
 * alone, read by `importNetlist`. Exported on its own, the block sheet is the root of what kicad-cli
 * sees, so a hierarchical (or local) label `NAME` names its net `/NAME`. A private net's label is its
 * UNPREFIXED model name (TOOLING.md, "Multi-page drawing"), which `drawingPagesFromNetwork` refuses
 * to let equal a port name (`checkPrivateTexts`), so `/<port>` can only be the port's own net.
 *
 * A port fails when no exported net is named `/<port>` (its label is missing, or another label won
 * the net's name), or when that net's pins differ from the port's (a swapped label or a label on
 * the wrong wire). Every failure names the port, the pins expected and the pins found.
 *
 * Known limitation (H7 module plan, Task 7b review): the expected side trusts `drawingPages()`. If it
 * gave a port the wrong pins, this check would agree with a page drawn the same wrong way.
 * `block-netcompare.ts` still compares the page's membership against the model directly, which is
 * what catches that.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 */
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import type { PageBoard } from "./board.ts"

export interface PortLabelResult {
  readonly checked: number
  readonly faults: readonly string[]
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((pin, i) => pin === b[i])
}

function list(pins: readonly string[]): string {
  return pins.length === 0 ? "(none)" : pins.join(", ")
}

export function checkPortLabels(board: PageBoard, block: string, exported: ImportedNetlist): PortLabelResult {
  const pages = board.drawingPages()
  const page = pages.find((p) => p.block === block)
  if (page === undefined) {
    throw new Error(`drawingPages() has no page "${block}"; its pages are ${pages.map((p) => p.block).join(", ")}`)
  }
  if (page.ports.length === 0) {
    throw new Error(`drawingPages() gives block "${block}" no ports, so there is no label to check; a block page joins the root only through its ports`)
  }
  const faults: string[] = []
  for (const port of page.ports) {
    const expected = [...port.pins].sort()
    const name = `/${port.name}`
    const found = exported.nets[name]
    if (found === undefined) {
      const holder = Object.entries(exported.nets).find(([, pins]) => expected.some((pin) => pins.includes(pin)))
      const where = holder === undefined ? "none of its pins is on any exported net" : `its pins are on net "${holder[0]}" (${list(holder[1])})`
      faults.push(`port ${port.name}: expected pins ${list(expected)} on net "${name}"; found no net named "${name}" - ${where}`)
      continue
    }
    if (!same(expected, found)) {
      faults.push(`port ${port.name}: expected pins ${list(expected)} on net "${name}"; found ${list(found)}`)
    }
  }
  return { checked: page.ports.length, faults }
}
