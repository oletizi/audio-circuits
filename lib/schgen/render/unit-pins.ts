/**
 * Ported from digital-pedal-platform's `tools/schgen/render/unitPins.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * The pin ends of one placed unit, and which of them carry a no-connect X. The X emitter (sheets.ts,
 * through placedNoConnects) and the text obstacles (unitText.ts) both read these, so an X is never
 * drawn without its obstacle or the reverse (A2 Task 14 review minor 5).
 */
import type { NetName, PartLabel, PinNumber } from "../ir/types.ts";
import type { BlockUnit, Placement } from "./block-types.ts";
import { pinEnd, type Point } from "./geometry.ts";
import type { LibPin } from "./lib-pins.ts";

export interface PlacedPin {
  readonly part: PartLabel;
  readonly unit: number;
  readonly pin: PinNumber;
  readonly at: Point;
  readonly net: NetName | null;
}

interface UnitPin {
  readonly placed: PlacedPin;
  readonly lib: LibPin;
}

function unitPins(u: BlockUnit, pl: Placement): UnitPin[] {
  return u.pins.map((p) => {
    if (p.unit !== pl.unit && p.unit !== 0) throw new Error(`${u.part.label} unit ${pl.unit} carries pin ${p.pin} of unit ${p.unit}`);
    const lib = u.symbol.pins.find((l) => l.number === p.pin);
    if (lib === undefined) throw new Error(`${u.symbol.libId} has no pin ${p.pin} (part ${p.part})`);
    return { placed: { part: pl.part, unit: pl.unit, pin: p.pin, at: pinEnd(pl.at, pl.rot, lib), net: p.net }, lib };
  });
}

/** Every pin end of the placed unit, hidden pins included. Refuses a pin of another unit. */
export function unitPinEnds(u: BlockUnit, pl: Placement): PlacedPin[] {
  return unitPins(u, pl).map((p) => p.placed);
}

/**
 * The pin ends that get a no-connect X: every NC pin except a hidden pin the library types
 * no_connect (a stock KEY pin), which KiCad ERC never flags and which has no drawn pin to mark.
 */
export function noConnectEnds(u: BlockUnit, pl: Placement): PlacedPin[] {
  return unitPins(u, pl)
    .filter((p) => p.placed.net === null && !(p.lib.hidden && p.lib.type === "no_connect"))
    .map((p) => p.placed);
}
