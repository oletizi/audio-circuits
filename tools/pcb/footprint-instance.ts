/**
 * TURN A `.kicad_mod` INTO A BOARD `(footprint ...)` INSTANCE, from the library
 * file's own bytes.
 *
 * READ, NOT RETYPED, and that is the whole reason this exists. A hand-written
 * copy of a footprint inside a fixture or a tool can carry a different
 * courtyard from the library file while every test that reads the library goes
 * on passing - and a courtyard is exactly what the mounting-hole envelope gate
 * compares. This repository has twice shipped a footprint name that does not
 * exist; a footprint whose geometry silently disagrees with its library would
 * be the same failure with nothing to sweep it against.
 *
 * WHAT THE CONVERSION ACTUALLY IS. A `.kicad_mod` and a board footprint are the
 * same form with three differences, and nothing else is touched:
 *
 *  - the library file's `(version ...)` / `(generator ...)` /
 *    `(generator_version ...)` belong to the FILE and not to the instance;
 *  - an instance carries a `(uuid ...)`, an `(at x y)` and optionally
 *    `(locked yes)`, none of which a library file has;
 *  - the name becomes `Library:Name`, and `REF**` becomes a real designator.
 *
 * Children are copied as TEXT, with one tab added: a library file indents a
 * footprint's children once and a board indents them twice.
 */
import { parseSexpr } from "../../lib/kicad/sexpr.ts"
import { topLevelForms } from "./board-forms.ts"

export interface FootprintInstanceOptions {
  /** The library nickname, as an `fp-lib-table` defines it. */
  readonly library: string
  /** The footprint name, which must be the one the file declares. */
  readonly name: string
  readonly reference: string
  readonly x: number
  readonly y: number
  /** Degrees, KiCad's sense. Omitted rather than written as 0, as KiCad does. */
  readonly rotation?: number
  readonly uuid: string
  readonly locked: boolean
  /**
   * KiCad's "Not in schematic" attribute (`board_only`). A part with no
   * schematic symbol - a mounting hole, a fiducial - is reported by
   * `kicad-cli pcb drc --schematic-parity` as an extra footprint unless it
   * carries this. It is a per-INSTANCE decision, so it is a parameter here and
   * not a property of the library file.
   *
   * MEASURED, not assumed, by `tests/pcb/mounting-envelope-drc.test.ts`: on
   * KiCad 10.0.5 a mounting hole without it produces one parity finding,
   * `Extra footprint`, and with it produces none. `tools/pcb/drc-policy.ts`
   * tolerates zero parity findings at any severity, so a hole placed without
   * this attribute fails `make parity-pt2399-core`.
   */
  readonly boardOnly: boolean
}

/** Children of a `.kicad_mod` root that describe the FILE rather than the part. */
const FILE_ONLY = new Set(["version", "generator", "generator_version"])

export function footprintInstanceForm(
  libraryText: string,
  where: string,
  opts: FootprintInstanceOptions,
): string {
  const root = parseSexpr(libraryText)
  if (root.name !== "footprint") {
    throw new Error(`${where}: the root form is "${root.name}", not "footprint" - this is not a .kicad_mod`)
  }
  if (root.atoms[0] !== opts.name) {
    throw new Error(
      `${where}: the file declares footprint ${JSON.stringify(root.atoms[0])}, but an instance of ` +
        `"${opts.name}" was asked for. Refused rather than relabelled: the name is how the board, ` +
        "the fp-lib-table entry and the tests refer to the same geometry.",
    )
  }
  const at =
    opts.rotation === undefined || opts.rotation === 0
      ? `(at ${Number(opts.x.toFixed(4))} ${Number(opts.y.toFixed(4))})`
      : `(at ${Number(opts.x.toFixed(4))} ${Number(opts.y.toFixed(4))} ${Number(opts.rotation.toFixed(4))})`
  const lines: string[] = [`(footprint "${opts.library}:${opts.name}"`]
  if (opts.locked) lines.push("\t\t(locked yes)")
  lines.push(`\t\t(uuid "${opts.uuid}")`)
  lines.push(`\t\t${at}`)

  let sawReference = false
  let sawAttr = false
  for (const form of topLevelForms(libraryText, where)) {
    if (FILE_ONLY.has(form.name)) continue
    let body = libraryText.slice(form.start, form.end)
    if (form.name === "property" && /^\(property\s+"Reference"/.test(body)) {
      if (!body.includes('"REF**"')) {
        throw new Error(
          `${where}: the Reference property's value is not "REF**", so this function cannot tell ` +
            `which atom to replace with "${opts.reference}". A library footprint's reference is ` +
            "REF** by KiCad's own convention; one that is not has been edited by hand.",
        )
      }
      body = body.replace('"REF**"', `"${opts.reference}"`)
      sawReference = true
    }
    if (form.name === "attr") {
      sawAttr = true
      if (opts.boardOnly && !body.includes("board_only")) body = body.replace("(attr ", "(attr board_only ")
    }
    lines.push(body.split("\n").map((line) => `\t${line}`).join("\n"))
  }
  if (!sawReference) {
    throw new Error(`${where}: no (property "Reference" ...) form to rename to "${opts.reference}".`)
  }
  if (!sawAttr && (opts.boardOnly || opts.library !== "")) {
    // A footprint with no (attr ...) at all is through-hole-by-default and is
    // included in position files and the BOM. For a mounting hole that is
    // wrong in two ways at once, so it is named rather than silently accepted.
    if (opts.boardOnly) {
      throw new Error(
        `${where}: boardOnly was asked for but the file has no (attr ...) form to add it to. ` +
          "Add one to the library footprint rather than having this function invent attributes.",
      )
    }
  }
  lines.push("\t)")
  return lines.join("\n")
}
