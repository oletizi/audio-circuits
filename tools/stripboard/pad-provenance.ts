/**
 * HC8's pin IDENTITY half: which reference pin each hole holds, when the
 * board's own name for a hole is not the netlist's.
 *
 * ITS OWN FILE for the reason `geometry-contract.ts` is its own file:
 * `copper.ts` holds the reconstruction - the three join mechanisms and the
 * union-find over them - and this holds a mapping that adds no edge at all.
 * Keeping it there pushed that file past this repository's file-length rule
 * and buried a naming question inside a connectivity one.
 *
 * WHY IT EXISTS, MEASURED RATHER THAN ARGUED. VeroRoute expands a `PADS<n>`
 * component - how an off-board part's terminals reach a board - into n
 * one-hole pads with board names of their own. On the frozen low-boost
 * fixture the netlist export names `RV_LO_BOOST.1` and `SW_LO_BOOST.1`..`.7`
 * while the dump's `PIN` lines name `RV_LO_BOOST_1.1` and
 * `SW_LO_BOOST_1.1`..`SW_LO_BOOST_7.1`: ten of that board's twenty-seven pins
 * are pads, and comparing the two sides by `PIN` name alone refuses all ten
 * as `reference-pin-not-on-board`, leaving B1-frozen's own benchmark board
 * ungradable. The `PAD` line's `FROM <ref>.<pin>` field is the only place the
 * dump records which reference pin an expanded pad is.
 *
 * `PAD` IS VERSION 2'S ADDITION TO THE CONTRACT, and CRITERIA's
 * geometry-contract table - headed version 1, six lines - does not list it.
 * `geometry-contract.ts`'s module comment records that divergence and why it
 * is reported rather than papered over.
 *
 * IT IS PIN IDENTITY, NEVER AN EDGE. Nothing here unions two holes, so COST
 * 1.5's three join mechanisms and the absence of a fourth are untouched. A
 * board with no `PAD` lines - every board under `boards/` outside the Pultec
 * set - gets back exactly `pinHoles`.
 */
import { dumpLineFields } from "../perfboard/dump-lines.ts"
import { boardGeometry, pinHoles, type HoleKey } from "./copper.ts"
import { refuse } from "./geometry-contract.ts"

/**
 * Where a pad's one hole is, or that it has none because it is unplaced.
 *
 * **IT IS A UNION AND NOT AN OPTIONAL PAIR, so an unplaced pad's missing hole
 * is unrepresentable rather than `0,0`.** A `PAD` line's placement field is
 * `FLOATING` or `AT r,c` exactly as a `PART` line's is, so this mirrors
 * `PartPlacement` in `tools/guide/dump-model.ts` deliberately: the two fields
 * are the same field in the same grammar, and a reader who has learnt one
 * should not have to learn the other.
 */
export type PadPlacement = { readonly row: number; readonly col: number } | "floating"

/**
 * One `PAD` line, read into the four facts its readers need from it.
 *
 * `placement` is the hole the pad is at, or `"floating"`; `source` is the
 * `FROM <ref>.<pin>` reference pin, or `undefined` for `NOPROVENANCE`. `line`
 * is kept so a refusal can quote what it rejected.
 *
 * **THE HOLE IS HERE BECAUSE A GESTURE NEEDS IT AND NOTHING ELSE CARRIES IT.**
 * `parseBoardDump` reads `PART` lines only, so a pad is absent from
 * `BoardDump.parts` and its hole appears in no typed field of the dump;
 * `tools/stripboard/movable.ts` reads it from here rather than respelling the
 * `PAD` grammar, because a second spelling is a second thing to keep correct.
 */
export interface PadLine {
  readonly ref: string
  readonly placement: PadPlacement
  readonly source: string | undefined
  readonly line: string
}

/** The owning component of a `${ref}.${pin}` id - the board's name for it, not the netlist's. */
function refOf(pinId: string): string {
  return pinId.slice(0, pinId.lastIndexOf("."))
}

/**
 * Every `PAD` line, refusing one whose fields do not read as the fork's
 * grammar rather than guessing which field is which.
 *
 * The grammar, from `Src/Headless_dump.cpp`: `PAD <name> <value>
 * <FLOATING|AT <row>,<col>> <FROM <ref>.<pin>|NOPROVENANCE>`. Every field is
 * whitespace-free - an empty value prints as `-` - so the field positions are
 * fixed, and a line matching none of the four shapes is a grammar change
 * rather than a variant to accommodate.
 */
export function padLines(dumpText: string): readonly PadLine[] {
  return dumpLineFields(dumpText, "PAD").map((fields): PadLine => {
    const line = fields.join(" ")
    const ref = fields[1]
    const token = fields[3]
    if (ref === undefined || (token !== "AT" && token !== "FLOATING")) {
      refuse("pad-unreadable", `PAD line "${line}" has no readable name and placement field`)
    }
    const placed = token === "AT"
    // THE HOLE IS READ HERE OR THE LINE IS REFUSED - never defaulted. `AT` is
    // followed by one `<row>,<col>` token, which is `fields[4]` because the
    // fields are PAD, name, value, placement, [r,c], ...provenance (the same
    // count the `rest` slice below depends on).
    const placement = placed ? parsePadHole(fields[4], line) : "floating"
    // The placement field is one token when FLOATING and two when AT r,c, so
    // the provenance that follows it starts at index 5 or at index 4. `rest` is
    // that remainder: ["FROM", "x.y"] or ["NOPROVENANCE"]. (This read "3 or 4"
    // until the whole-branch review - off by one against the slice directly
    // below it and against the grammar quoted above. The code is right: the
    // fields are PAD, name, value, placement, [r,c], ...provenance, so a placed
    // pad's provenance begins at 5. A comment off by one in the one place a
    // field-position bug would be silent.)
    const rest = fields.slice(placed ? 5 : 4)
    if (rest.length === 1 && rest[0] === "NOPROVENANCE") {
      return { ref, placement, source: undefined, line }
    }
    const source = rest[1]
    if (rest.length !== 2 || rest[0] !== "FROM" || source === undefined) {
      refuse(
        "pad-unreadable",
        `PAD line "${line}" ends in neither FROM <ref>.<pin> nor NOPROVENANCE`,
      )
    }
    return { ref, placement, source, line }
  })
}

/**
 * One placed pad's `<row>,<col>` token, refusing anything else by name.
 *
 * It is `pad-unreadable` and quotes the whole line, exactly as the two
 * surrounding grammar refusals do: an `AT` with no readable pair is a grammar
 * change or a damaged capture, and a guessed hole would put a gesture's `--to`
 * somewhere nobody measured.
 */
function parsePadHole(field: string | undefined, line: string): PadPlacement {
  const match = field === undefined ? null : /^(\d+),(\d+)$/.exec(field)
  const rowStr = match?.[1]
  const colStr = match?.[2]
  if (rowStr === undefined || colStr === undefined) {
    refuse(
      "pad-unreadable",
      `PAD line "${line}" says AT and then "${field ?? ""}", which is not a <row>,<col> hole`,
    )
  }
  return { row: Number(rowStr), col: Number(colStr) }
}

/**
 * Every reference pin's hole, keyed the way the NETLIST EXPORT names it.
 *
 * A FLOATING PAD IS SKIPPED, not refused: it prints no `PIN` line, so it
 * contributes no hole, and its reference pin then refuses as
 * `reference-pin-not-on-board` in `equivalence.ts` - which is the honest
 * report and is HC3's refusal besides. Refusing here would name the pad's
 * board name where a reader needs the netlist's.
 *
 * It takes TEXT and parses it, for the same reason `netlistEquivalence` does:
 * a `BoardDump` carries no `PAD` lines at all, so a caller handing one over
 * would skip the whole mapping and get a verdict keyed the board's way
 * without being told.
 */
export function referencePinHoles(dumpText: string): ReadonlyMap<string, HoleKey> {
  const boardPins = pinHoles(boardGeometry(dumpText))
  const pads = padLines(dumpText)
  const padRefs = new Set(pads.map((pad) => pad.ref))
  const holes = new Map<string, HoleKey>()
  // Every pin of a non-pad part keeps its own id; a pad's pins are re-keyed
  // below, so they are left out here rather than added under both names.
  for (const [id, key] of boardPins) {
    if (!padRefs.has(refOf(id))) {
      holes.set(id, key)
    }
  }
  for (const pad of pads) {
    if (pad.placement === "floating") {
      continue
    }
    const own = [...boardPins].filter(([id]) => refOf(id) === pad.ref)
    const only = own.length === 1 ? own[0] : undefined
    if (only === undefined) {
      refuse(
        "pad-pin-count",
        `PAD ${pad.ref} is placed and the dump prints ${own.length} PIN lines for it, not one ` +
          `("${pad.line}")`,
      )
    }
    const source = pad.source
    if (source === undefined) {
      refuse("pad-without-provenance", `PAD line "${pad.line}" names no reference pin`)
    }
    const taken = holes.get(source)
    if (taken !== undefined) {
      refuse(
        "pad-provenance-collision",
        `reference pin ${source} is claimed by hole ${taken} and again by PAD ${pad.ref} at ` +
          `hole ${only[1]}`,
      )
    }
    holes.set(source, only[1])
  }
  return holes
}
