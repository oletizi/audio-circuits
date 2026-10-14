/**
 * What `./formed-frame.test.ts` and `./formed-frame-layouts.test.ts` both need:
 * the three recorded formed footprints, their prepared-pitch counterparts in
 * KiCad's library, and the two pad-reading helpers.
 *
 * It is a helper rather than a second copy because the two test files grade the
 * anchor against two different records - KiCad's files and the owner's layouts -
 * and a drifted copy of the footprint list would let one of them silently stop
 * covering a footprint.
 */
import { expect } from "bun:test"
import { readFootprintPads } from "./footprint-library.ts"

/** The three recorded formed footprints, named here so a fourth fails loudly. */
export const FORMED = [
  "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm",
  "Capacitor_THT:CP_Radial_D8.0mm_P3.50mm",
  "Package_TO_SOT_THT:TO-92_Inline",
] as const

/**
 * Each formed body's other pitch, as KiCad ships it, and the VeroRoute type the
 * dumps name the part by.
 *
 * The `type` column is how a committed dump's `PART` line identifies the
 * footprint: a dump carries VeroRoute types, not footprint names, and
 * `lib/kicad/import-string.ts` is the one place the correspondence is written
 * down - `CP_Radial_D<mm>mm` by nearest enumerated diameter, `TO-92_Inline`
 * exactly. The three here are the three that module maps these footprints to.
 */
export const PAIRS = [
  {
    moulded: "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm",
    prepared: "Capacitor_THT:CP_Radial_D5.0mm_P2.50mm",
    type: "CAP_ELECTRO_200",
  },
  {
    moulded: "Capacitor_THT:CP_Radial_D8.0mm_P3.50mm",
    prepared: "Capacitor_THT:CP_Radial_D8.0mm_P2.50mm",
    type: "CAP_ELECTRO_300",
  },
  {
    moulded: "Package_TO_SOT_THT:TO-92_Inline",
    prepared: "Package_TO_SOT_THT:TO-92_Inline_Wide",
    type: "TO92",
  },
] as const

export function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    if (error instanceof Error) return error.message
    throw error
  }
  throw new Error("expected a refusal and none was thrown")
}

/** The along-row coordinates of a footprint's pads, read out of its own file. */
export function rowCoordinates(footprint: string): readonly number[] {
  const read = readFootprintPads(footprint)
  // All six files put their pads in one row along x, which is asserted rather
  // than assumed: a file whose pads were not collinear along x would make the
  // midpoint below a different quantity.
  for (const pad of read.pads) {
    expect(pad.yMm, `${footprint} pad ${pad.pad} y`).toBe(0)
  }
  return read.pads.map((pad) => pad.xMm).sort((a, b) => a - b)
}

export const midpointOf = (coords: readonly number[]): number => {
  const low = coords[0]
  const high = coords[coords.length - 1]
  if (low === undefined || high === undefined) throw new Error("a row with no pads")
  return (low + high) / 2
}
