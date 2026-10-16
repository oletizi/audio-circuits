/**
 * The landing pads on a board, as the wiring guide needs them: one hole each,
 * and the identity of the terminal that hole brings off the board.
 *
 * **WHY THIS FILE EXISTS: THE GUIDE WAS SILENT ABOUT PADS.** `./dump.ts` reads
 * the dump by KEYWORD - `PART`, `PIN`, `WIRE`, `NODE`, `CUT`, `SOLDER` - so a
 * `PAD` line was not refused, it was SKIPPED. On the frozen low-boost that is
 * ten panel-control terminals vanishing from the guide without a word, and
 * `CLAUDE.md` names that exact failure: *"A skipped check must never look like a
 * passing one... Silence that resembles success is the failure mode the whole
 * workflow exists to prevent."*
 *
 * **IT IS NOT A SECOND READING OF THE `PAD` GRAMMAR, AND THAT IS THE POINT.**
 * `tools/stripboard/pad-provenance.ts` is the reader - its refusals are
 * registered members of HC8's geometry contract - so this module calls it rather
 * than respelling the five fields. A second parser is a second thing to keep
 * correct, which is that module's own stated reason for holding the grammar in
 * one place.
 *
 * **THE IMPORT DIRECTION IS DELIBERATE AND IT IS THE ONLY ONE AVAILABLE.**
 * `tools/stripboard/pad-provenance.ts` reaches `./dump.ts` through
 * `tools/stripboard/copper.ts`, so `./dump.ts` may not reach back for the pad
 * reader - that would be a cycle. A module ABOVE the dump reader can, because
 * nothing in that closure imports this one, and `./checklist.ts` already imports
 * `tools/stripboard/constraints-model.ts` in the same direction.
 *
 * **IT IS `PadTerminal` AND NOT `PlacedPad`, AND THE NAME IS THE WHOLE POINT.**
 * `tools/stripboard/moves-space-measure.ts` already exports a `PlacedPad` whose
 * `ref` is the fork's INVENTED per-pad board name (`RV_LO_BOOST_1`) - correctly,
 * because it keys `dump.pins[pad.ref]` with it, and the `PIN` lines are printed
 * under that name. The `ref` here is the OWNER's netlist ref (`RV_LO_BOOST`),
 * read off the `FROM` field. That is the invented-versus-owner distinction this
 * whole piece of work exists to keep straight, so the two must not share a name:
 * a reader who saw `PlacedPad` in both files would have no way to tell which
 * `ref` was in front of them. `PadTerminal` says what this one holds - ONE
 * TERMINAL of a component, named the way the netlist names it.
 *
 * **WHAT THIS DOES NOT DO, so the next person does not read more into it.** It
 * does not touch `./off-board.ts`, which labels a panel pot that reaches the
 * board as a HEADER PART with `PIN` lines - a different representation of the
 * same physical control, and reconciling the two changes the edge labels, the
 * checklist's junction rows and `valueLabel` together. That reconciliation
 * needs criteria this module may not author for itself.
 */
import { padLines } from "../stripboard/pad-provenance.ts"
import { pinId, pinIdParts } from "../../lib/stripboard/pin-id.ts"

/**
 * One placed landing pad: which terminal of which component it brings off the
 * board, and the hole it is in.
 *
 * `identity` IS `ref` AND `pin`, carried alongside them rather than derived
 * again by every reader - see `lib/stripboard/pin-id.ts` for why the pair is
 * formed in one place. Three pads of one potentiometer share a `ref` and have
 * three identities; a map keyed by `ref` alone would keep one of the three.
 *
 * `ref` IS THE OWNER'S, NOT THE BOARD'S - see this module's comment on the name,
 * and `tools/stripboard/moves-space-measure.ts`'s `PlacedPad` for the other one.
 */
export interface PadTerminal {
  /** `<ref>.<pin>`, the way the reference netlist names this terminal. */
  readonly identity: string
  /** The component the terminal belongs to - never the per-pad name the fork invents. */
  readonly ref: string
  /** The terminal on that component. */
  readonly pin: string
  readonly row: number
  readonly col: number
}

/**
 * Every landing pad on a board, from the dump TEXT.
 *
 * It takes text rather than a `BoardDump` for the reason
 * `tools/stripboard/pad-provenance.ts` gives for the same choice: a `BoardDump`
 * carries no `PAD` lines at all, so a caller handing one over would get an empty
 * list and no indication that the question had not been asked.
 *
 * Both faults below REFUSE rather than skipping the pad. A pad left out of this
 * list is a terminal the guide would print nothing about, which is the silence
 * this module exists to end - and a builder reading that guide would leave a
 * panel control unwired with every box ticked.
 */
export function padTerminals(dumpText: string): readonly PadTerminal[] {
  return padLines(dumpText).map((pad): PadTerminal => {
    if (pad.placement === "floating") {
      throw new Error(
        `guide-pad-unplaced: the dump reports the pad "${pad.ref}" as FLOATING, so it is in no ` +
          `hole and the guide has nowhere to draw it: "${pad.line}".\nFix it in the layout - ` +
          "place the pad, or take the terminal off the board - rather than here.\nIt is not " +
          "drawn at an invented hole and it is not left out: a terminal missing from the guide " +
          "is one the builder never solders, and every checkbox on the sheet would still tick.",
      )
    }
    const source = pad.source
    const parts = source === undefined ? undefined : pinIdParts(source)
    if (source === undefined || parts === undefined) {
      throw new Error(
        `guide-pad-unprovenanced: the dump prints the pad "${pad.ref}" with no readable ` +
          `FROM <ref>.<pin> field: "${pad.line}".\nThat field is the only place a dump records ` +
          "which terminal of which component an expanded pad is, so without it the guide can " +
          "name the hole and not what to solder to it. The fork prints NOPROVENANCE when its own " +
          "board carries none; fix it by re-importing the netlist into the layout.\nThe pad's " +
          `board name is not used instead: "${pad.ref}" is a name VeroRoute invented and no ` +
          "netlist knows it, so a wiring instruction carrying it would name a component the " +
          "schematic has not got.",
      )
    }
    return {
      // RE-FORMED THROUGH `pinId` RATHER THAN PASSED THROUGH, so the guide's
      // identity and the exporter's are the same string by construction and not
      // by coincidence: a pin name this convention cannot carry refuses here
      // instead of reaching a drawing.
      identity: pinId(parts.ref, parts.pin),
      ref: parts.ref,
      pin: parts.pin,
      row: pad.placement.row,
      col: pad.placement.col,
    }
  })
}
