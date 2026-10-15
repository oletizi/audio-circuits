/**
 * The hand-built boards `./moves.test.ts` generates moves FROM, and the two
 * helpers the task brief named but did not define.
 *
 * **IT IS NOT A `.test.ts` FILE**, following `./cuts-fixtures.ts` and
 * `./seed-fixtures.ts`: a board respelled per assertion is a second thing to
 * keep in step.
 *
 * **EACH BOARD IS THE SMALLEST SHAPE THAT MAKES ONE QUESTION ANSWERABLE**, and
 * none of them is a board anybody would build. The real circuits are in
 * `./seed-fixtures.ts`, which reads the committed exports.
 *
 * **THE FOOTPRINTS ARE REAL AND THE FIXTURES NEED THEM TO BE.**
 * `lib/stripboard/moves.ts` reads a part's rigidity out of the supplied span map
 * and its body out of the supplied pin-pattern map, so a placeholder footprint
 * would refuse before a move existed - which `./moves.test.ts` drives as its own
 * case. Both names below were printed from `LEAD_SPANS` and `PIN_PATTERNS` and
 * neither was typed from memory; the pad steps quoted in the comments came from
 * `padHolesFor` the same way.
 *
 * **THE RESISTOR IS FORMABLE AND THE TRIMMER IS RIGID**, which is the
 * distinction the owner's one hard geometric rule turns on: *"Rigid parts
 * shouldn't be routed through/under."* A board of resistors alone can never
 * exercise it, so the third fixture puts a trimmer on the board for exactly that
 * purpose.
 */
import type { Candidate, Hole, Placement } from "../../../lib/stripboard/board.ts"
import type { ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import { at } from "./cuts-fixtures.ts"

/** Axial resistor: pads at 0 and 4 steps along, span [2, 16] holes, FORMABLE, no body margin. */
export const AXIAL = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"

/** RM-065 trimmer: pads at (0,0), (1,2), (2,0) steps, span [3, 3] holes, RIGID. */
export const TRIMMER = "Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical"

/** A board and the reference nets it must be read against, which is one fact in two halves. */
export interface MoveCase {
  readonly base: Candidate
  readonly reference: ReferenceNets
}

/**
 * One placement, from its pins' holes.
 *
 * `holes` IS THE PIN HOLES, as `lib/stripboard/seed-place.ts`,
 * `tools/stripboard/vero-import.ts` and `./cuts-fixtures.ts` all set it: a
 * placement is its pins, and the body enters only through the placement RULES.
 *
 * **`origin` AND `direction` ARE NOT DECORATION HERE**, which is where this
 * builder differs from `./cuts-fixtures.ts`'s. A move reads them to work out
 * which board axis the part's body margins reach along, so every fixture below
 * states its pins at the offsets `holeInFrame(origin, direction, x, y)` puts
 * them at - checked by `./moves.test.ts` rather than asserted here.
 */
export function fitted(
  ref: string,
  footprint: string,
  direction: Placement["direction"],
  pins: Readonly<Record<string, Hole>>,
): Placement {
  const entries = Object.entries(pins)
  const first = entries[0]
  if (first === undefined) throw new Error(`the fixture placement "${ref}" was given no pins`)
  return {
    ref,
    footprint,
    origin: first[1],
    direction,
    holes: entries.map(([, hole]) => hole),
    pins: new Map(entries),
  }
}

function board(placements: readonly Placement[]): Candidate {
  return { grid: { strips: 12, columns: 12 }, placements, wires: [], bridges: [] }
}

/**
 * **THE BOARD AT THE OBJECTIVE'S FLOOR**: every net's pads contiguous on one
 * strip of its own, no strip carrying two nets, and so no cut, no wire and no
 * bridge. `F = 0`.
 *
 * Three axial resistors in a chain. `NET_A` hosts on strip 0, `NET_B` on strip 4
 * and `NET_C` on strip 8, and each part's two leads are 4 strips apart - a span
 * of 5 holes, inside the recorded `[2, 16]`, and the footprint's own moulded
 * pitch.
 *
 * **IT IS THE BASE THE BRIEF'S ASSERTION NEEDS, and the reason is arithmetic
 * rather than taste.** Adding a wire can never REDUCE the cut count - a wire
 * contributes contacts, and contacts only ever split a strip's runs further - so
 * on a base that already has cuts a relocation can pay off on its own by
 * removing one, and "the relocation alone is no better than the base" would be
 * false of a perfectly good compound move. At `F = 0` nothing can be better than
 * the base at all, which is what makes the brief's inequality hold over every
 * compound proposal rather than over the ones that happen to suit it.
 */
export function padContiguousOnOneStrip(): MoveCase {
  return {
    base: board([
      fitted("R1", AXIAL, "S", { "1": at(0, 1), "2": at(4, 1) }),
      fitted("R2", AXIAL, "S", { "1": at(4, 3), "2": at(8, 3) }),
      fitted("R3", AXIAL, "S", { "1": at(0, 5), "2": at(4, 5) }),
    ]),
    reference: new Map<string, readonly string[]>([
      ["NET_A", ["R1.1", "R3.1"]],
      ["NET_B", ["R1.2", "R2.1", "R3.2"]],
      ["NET_C", ["R2.2"]],
    ]),
  }
}

/**
 * **A BOARD WITH A CUT IN IT**: strip 0 carries `NET_A`'s two leads at columns 1
 * and 2 and `NET_B`'s one lead at column 6, so one cut falls between them and
 * `F = 1`.
 *
 * It is sound as it stands - `NET_A` is whole in the segment left of the cut,
 * `NET_B` in the segment right of it, `NET_C` whole along strip 4 - and it is
 * the shape a compound move can genuinely IMPROVE on: move `R3` off strip 0 and
 * the cut is no longer needed, at the price of the one wire that re-joins
 * `NET_C` across the strips its leads then sit on. One cut costs four wires at
 * the owner's `rho_w`, so the trade is worth 0.75 of a cut.
 */
export function twoNetsShareStripZero(): MoveCase {
  return {
    base: board([
      fitted("R1", AXIAL, "S", { "1": at(0, 1), "2": at(4, 1) }),
      fitted("R2", AXIAL, "S", { "1": at(0, 2), "2": at(4, 2) }),
      fitted("R3", AXIAL, "S", { "1": at(0, 6), "2": at(4, 6) }),
    ]),
    reference: new Map<string, readonly string[]>([
      ["NET_A", ["R1.1", "R2.1"]],
      ["NET_B", ["R3.1"]],
      ["NET_C", ["R1.2", "R2.2", "R3.2"]],
    ]),
  }
}

/**
 * **A RIGID PART WITH FREE HOLES INSIDE ITS OWN AREA**, and a resistor with the
 * reach to land a lead in one of them.
 *
 * `RV1` is the trimmer, at `origin` strip 2 column 7 facing `S`, so its pads sit
 * at (2,7), (3,5) and (4,7) - `holeInFrame`'s turn of the (0,0), (1,2), (2,0)
 * steps `padHolesFor` reports for it. Its body reaches one hole further across
 * than its pads do, so the area it covers is strips 2-4 of columns 5-8 and NINE
 * of those twelve holes are empty.
 *
 * **THE EMPTY HOLES ARE THE WHOLE POINT.** A lead in one of them is a joint
 * under a part whose terminals cannot be formed, which is the owner's one hard
 * geometric rule, and a generator that only checked whether a hole was free
 * would propose it. Every net here is a single pin, so nothing on this board
 * needs a join and no proposal from it carries a wire - which keeps the
 * clearance question clear of the wiring one.
 */
export function trimmerBesideAResistor(): MoveCase {
  return {
    base: board([
      fitted("RV1", TRIMMER, "S", { "1": at(2, 7), "2": at(3, 5), "3": at(4, 7) }),
      fitted("R1", AXIAL, "S", { "1": at(7, 1), "2": at(11, 1) }),
    ]),
    reference: new Map<string, readonly string[]>([
      ["NET_W", ["RV1.1"]],
      ["NET_X", ["RV1.2"]],
      ["NET_Y", ["RV1.3"]],
      ["NET_IN", ["R1.1"]],
      ["NET_OUT", ["R1.2"]],
    ]),
  }
}

/**
 * **TWO COLUMNS, TWO RESISTORS, AND ONE TRANSLATION WITH NOWHERE TO RUN ITS
 * JOIN.**
 *
 * `R1` and `R2` both lie across strips 0 and 4, in the only two columns the
 * stock has, so `NET_A` is whole along strip 0 and `NET_B` along strip 4 and the
 * board needs no cut, wire or bridge. Move `R1` one strip up and `NET_A`'s leads
 * are then on strips 0 and 1, which must be bridged - and **there is no column
 * left to bridge them in**: column 0 holds `R1`'s own relocated lead on strip 1,
 * and column 1 holds `R2`'s lead on strip 0.
 *
 * **IT EXISTS TO DRIVE A BRANCH THAT THE OTHER FIXTURES CANNOT REACH.** A
 * relocation whose join has no free column is refused, and on a 12-column board
 * that refusal never fires - so without this fixture it would be a guard nobody
 * knows works, which is the shape of defect this plan has already caught three
 * times.
 */
export function noColumnLeftToJoinIn(): MoveCase {
  return {
    base: {
      grid: { strips: 8, columns: 2 },
      placements: [
        fitted("R1", AXIAL, "S", { "1": at(0, 0), "2": at(4, 0) }),
        fitted("R2", AXIAL, "S", { "1": at(0, 1), "2": at(4, 1) }),
      ],
      wires: [],
      bridges: [],
    },
    reference: new Map<string, readonly string[]>([
      ["NET_A", ["R1.1", "R2.1"]],
      ["NET_B", ["R1.2", "R2.2"]],
    ]),
  }
}

/**
 * A board whose part is fitted with nothing, so a move generator has no
 * rigidity and no body to read for it - the refusal case.
 *
 * The footprint name is deliberately not a footprint: `./cuts-fixtures.ts`
 * states why a fixture must not spell a plausible library name, and the sweep in
 * `tests/kicad/footprint-sweep.ts` is the reason.
 */
export function partFittedWithNothing(): MoveCase {
  return {
    base: board([fitted("R1", "a fixture placement, fitted with no part", "S", {
      "1": at(0, 1),
      "2": at(4, 1),
    })]),
    reference: new Map<string, readonly string[]>([
      ["NET_A", ["R1.1"]],
      ["NET_B", ["R1.2"]],
    ]),
  }
}

/** `${strip},${column}` for every pin of a placement, in pin-name order. */
export function pinPrint(placement: Placement): string {
  return [...placement.pins]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pin, hole]) => `${pin}@${hole.strip},${hole.column}`)
    .join(" ")
}

/**
 * The refs whose placement sits somewhere else on `next` than it does on `base`
 * - the brief's `movedRefs`, defined here because the brief named it without
 * giving it.
 *
 * **IT COMPARES PINS AND NOT `origin`**, because where a part's TERMINALS are is
 * what a board is built from; an origin that moved while every pin stayed put
 * would be a bookkeeping change and not a relocation. A ref on one board and not
 * the other counts as moved, so a proposal that dropped or added a placement
 * cannot read as unchanged.
 */
export function movedRefs(base: Candidate, next: Candidate): readonly string[] {
  const before = new Map(base.placements.map((placement) => [placement.ref, pinPrint(placement)]))
  const after = new Map(next.placements.map((placement) => [placement.ref, pinPrint(placement)]))
  const moved: string[] = []
  for (const ref of new Set([...before.keys(), ...after.keys()])) {
    if (before.get(ref) !== after.get(ref)) moved.push(ref)
  }
  return moved.sort()
}
