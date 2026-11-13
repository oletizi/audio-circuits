/**
 * The instruction file `./update-from-schematic.py` reads: every schematic
 * component resolved to a real footprint file on disk with a position, and
 * every net resolved to pads that actually exist.
 *
 * SPLIT OUT OF `./update-from-schematic.ts` for length, not for layering - it
 * is the same tool, and the refusals here are that tool's own guards (R3
 * `library-nickname`, R4 `footprint-not-in-library`, R5 `net-member`, and the
 * `component-footprint` guard). Nothing here runs a process or touches the
 * board; it turns a parsed netlist into data, and refuses rather than placing
 * anything it could not prove.
 */
import fs from "node:fs"
import path from "node:path"
import { children, parseSexpr } from "../../lib/kicad/sexpr.ts"
import type { ImportedComponent } from "../../lib/kicad/netlist.ts"
import { KICAD_CLI } from "../../lib/kicad/netlist.ts"
import { defaultFootprintDir } from "../../lib/kicad/install.ts"
import { resolveFootprintLibraries } from "./fp-lib-table.ts"
import { UpdateRefusal } from "./update-refusal.ts"

/**
 * THE GRID IS SCAFFOLDING, NOT A FLOORPLAN. Components are laid out on a plain
 * grid purely so they do not land on top of each other, which is all a netted
 * board needs in order to be inspectable and DRC-able. The engine's placer
 * replaces it (Task 7 onward of the place-and-route plan); no later reader
 * should mistake these numbers for an intended arrangement, and nothing judges
 * a board by them.
 */
export const PLACEMENT = { originMm: 20.0, pitchMm: 15.0, perRow: 6 } as const

export interface PlacedFootprint {
  readonly libraryDir: string
  readonly footprintName: string
  readonly fpid: string
  readonly reference: string
  readonly value: string
  readonly path: string
  readonly fields: Readonly<Record<string, string>>
  readonly xMm: number
  readonly yMm: number
}

export interface InstructionNet {
  readonly code: number
  readonly name: string
  readonly members: readonly { readonly ref: string; readonly pin: string }[]
}

export interface PlacementPlan {
  readonly placed: readonly PlacedFootprint[]
  readonly padNumbers: ReadonlyMap<string, ReadonlySet<string>>
  readonly librariesResolved: number
}

/** Pad numbers a `.kicad_mod` declares. A number may appear on several pads; this is the SET. */
export function padNumbersOf(modPath: string): ReadonlySet<string> {
  const footprint = parseSexpr(fs.readFileSync(modPath, "utf8"))
  const numbers = new Set<string>()
  for (const pad of children(footprint, "pad")) {
    const number = pad.atoms[0]
    if (number !== undefined) numbers.add(number)
  }
  return numbers
}

/** Fields set by their own pcbnew calls, so copying them from the netlist too would be redundant. */
const FIELDS_SET_SEPARATELY = new Set(["Reference", "Value", "Footprint"])

/**
 * The schematic's own fields, minus the three set by their own calls. Without
 * these, schematic parity reports *"Field 'Description' differs"* and *"Field
 * 'Datasheet' differs"* - neither of which is a "Missing footprint", so a check
 * that only counts missing footprints sails past them.
 */
export function fieldsToCopy(component: ImportedComponent): Readonly<Record<string, string>> {
  const fields: Record<string, string> = {}
  for (const [name, value] of Object.entries(component.fields ?? {})) {
    if (!FIELDS_SET_SEPARATELY.has(name)) fields[name] = value
  }
  return fields
}

/** R3, R4 and `component-footprint`: every component resolved to a real file on disk, with a position. */
export function planPlacement(components: readonly ImportedComponent[], boardDir: string): PlacementPlan {
  const libraries = resolveFootprintLibraries({
    projectDir: boardDir,
    footprintRoot: defaultFootprintDir(KICAD_CLI),
  })
  const placed: PlacedFootprint[] = []
  const padNumbers = new Map<string, ReadonlySet<string>>()
  components.forEach((component, index) => {
    const fpid = component.footprint ?? ""
    if (fpid === "") {
      throw new UpdateRefusal(
        "component-footprint",
        `component "${component.designator}" has no (footprint) in the netlist, so there is nothing to place ` +
          "and nothing may be guessed. Assign its footprint in the schematic and export again.",
      )
    }
    const separator = fpid.indexOf(":")
    const nickname = separator === -1 ? "" : fpid.slice(0, separator)
    const footprintName = fpid.slice(separator + 1)
    const libraryDir = libraries.directories[nickname]
    if (libraryDir === undefined) {
      throw new UpdateRefusal(
        "library-nickname",
        `footprint library nickname "${nickname}" (from "${fpid}" on ${component.designator}) resolves in none ` +
          `of the fp-lib-table files searched: ${libraries.tablesSearched.join(", ")}. Add the library to one ` +
          "of them, or correct the nickname in the schematic.",
      )
    }
    const modPath = path.join(libraryDir, `${footprintName}.kicad_mod`)
    if (!fs.existsSync(modPath)) {
      throw new UpdateRefusal(
        "footprint-not-in-library",
        `footprint "${footprintName}" (on ${component.designator}) is not in its resolved library directory ` +
          `${libraryDir} - there is no ${footprintName}.kicad_mod there. Check the name against the library ` +
          "on disk; this repository has twice shipped a footprint name that does not exist.",
      )
    }
    padNumbers.set(component.designator, padNumbersOf(modPath))
    placed.push({
      libraryDir,
      footprintName,
      // The netlist's FULL Library:Name string, because pcbnew.FootprintLoad
      // returns a footprint whose FPID has an EMPTY library nickname - parity
      // then reports "<Name> doesn't match footprint given by symbol
      // (<Lib>:<Name>)", which is not a "Missing footprint" either.
      fpid,
      reference: component.designator,
      value: component.value,
      path: component.uuidPath ?? "",
      fields: fieldsToCopy(component),
      xMm: PLACEMENT.originMm + (index % PLACEMENT.perRow) * PLACEMENT.pitchMm,
      yMm: PLACEMENT.originMm + Math.floor(index / PLACEMENT.perRow) * PLACEMENT.pitchMm,
    })
  })
  return { placed, padNumbers, librariesResolved: Object.keys(libraries.directories).length }
}

/**
 * R5's pad half. Net CODES are assigned here, sequentially from 1: the board
 * starts with only net 0 (the unconnected net), and KiCad 10 writes a pad's net
 * by NAME with no code at all, so the code is an in-memory handle and nothing
 * downstream reads the numbering.
 */
export function planNets(
  nets: Readonly<Record<string, readonly string[]>>,
  padNumbers: ReadonlyMap<string, ReadonlySet<string>>,
): readonly InstructionNet[] {
  return Object.entries(nets).map(([name, members], index) => ({
    code: index + 1,
    name,
    members: members.map((member) => {
      const dot = member.indexOf(".")
      const ref = member.slice(0, dot)
      const pin = member.slice(dot + 1)
      const pads = padNumbers.get(ref)
      if (pads === undefined) {
        throw new UpdateRefusal(
          "net-member",
          `net "${name}" names designator "${ref}" (pad "${pin}"), which no component declares.`,
        )
      }
      if (!pads.has(pin)) {
        throw new UpdateRefusal(
          "net-member",
          `net "${name}" connects ${ref} pad "${pin}", but the footprint loaded for ${ref} has no such pad ` +
            `(it has: ${[...pads].sort().join(", ")}). The schematic symbol and the footprint disagree.`,
        )
      }
      return { ref, pin }
    }),
  }))
}
