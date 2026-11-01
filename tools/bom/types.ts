/**
 * Types for deriving a board's parts-list needs from its circuit.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import type { ComponentKind } from "../../lib/model/types.ts"

/** The physical facts a footprint implies, for matching a catalog part to a line. */
export type Physical =
  | { readonly kind: "axial-resistor"; readonly body: "0207"; readonly leadSpacingMm: number }
  | { readonly kind: "radial-electrolytic"; readonly maxDiameterMm: number; readonly leadSpacingMm: number }
  /**
   * A two-lead, NON-POLARISED capacitor body at a fixed pitch - KiCad's `C_Disc`
   * footprint family. It names the FOOTPRINT's body style and not the part's: the part
   * fitted may be a literal ceramic disc or a radial dipped block, and
   * `parts/ceramic-100nf-50v-x7r-radial-2.5mm.json` records that no genuine 0.1 uF disc
   * is sold at 2.5 mm lead spacing at all. So only the two dimensions a datasheet and
   * this footprint both state bind: the body's extent across the lead axis
   * (`maxDiameterMm`, the footprint's `D`) and the pitch (`leadSpacingMm`, its `P`).
   * The footprint's `W` - the body's thickness - has NO `Specs` field to compare with
   * (tools/bom/catalog.ts), so it is deliberately absent here rather than carried as a
   * number nothing checks.
   */
  | { readonly kind: "disc-capacitor"; readonly maxDiameterMm: number; readonly leadSpacingMm: number }
  | { readonly kind: "to92"; readonly pinOrder: readonly string[] }
  | { readonly kind: "trimmer"; readonly package: "RM-065" }
  | { readonly kind: "pin-header"; readonly pins: number; readonly pitchMm: number }
  | { readonly kind: "panel-pot" }

/** One line of a board's derived needs: a requirement shared by every designator it covers. */
export interface BomLine {
  /** Stable, human-readable; built from kind, value, taper, part type and footprint. */
  readonly key: string
  readonly placement: "on-board" | "off-board"
  /** Sorted naturally (R2 before R10). */
  readonly designators: readonly string[]
  readonly quantity: number
  readonly kind: ComponentKind
  readonly ohms?: number
  readonly farads?: number
  readonly taper?: "linear" | "log"
  /** The device type the circuit requires, when it names one (e.g. 2N3904) - the circuit
   * model's `part.mpn`. For an active device it is compared with a catalog entry's
   * `specs.type`, never with the entry's `mpn` (tools/bom/fit.ts). */
  readonly partType?: string
  readonly physical: Physical
  /** Capacitors: the board's highest supply rail, rounded up to the next standard rating. */
  readonly minVolts?: number
  /** Resistors: operating-point dissipation x 2, never less than 0.25 W. */
  readonly minWatts?: number
}
