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
