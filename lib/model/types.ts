/**
 * The canonical circuit model.
 *
 * A circuit is components plus the nets their pins name. Nets are implied by
 * pin references rather than declared, so there is one place to keep correct.
 *
 * Design: docs/superpowers/specs/2026-09-21-canonical-circuit-model-design.md
 */
import type {
  CapacitorParameters,
  InductorParameters,
  PotentiometerParameters,
  ResistorParameters,
  SwitchParameters,
} from "./parameters.ts"

export type ComponentKind =
  | "resistor"
  | "capacitor"
  | "inductor"
  | "potentiometer"
  | "switch"
  | "photoresistor"
  | "diode"
  | "bjt"
  | "opamp"
  | "ic"
  | "connector"

/**
 * A pin is either on a net or deliberately not connected.
 *
 * Tagged rather than a magic string: "nc" is a legal net name, and a
 * representation that could not tell an intentional no-connect from a net
 * someone called "nc" would accept a defect silently.
 */
export type Connection =
  | { readonly kind: "net"; readonly net: string }
  | { readonly kind: "nc" }

export const NC: Connection = { kind: "nc" }

export function net(name: string): Connection {
  if (name.length === 0) throw new Error("net name must not be empty")
  return { kind: "net", net: name }
}

export type Parameters =
  | ResistorParameters
  | CapacitorParameters
  | InductorParameters
  | PotentiometerParameters
  | SwitchParameters
  | Record<string, never>

export interface PartSpec {
  readonly mpn?: string
  readonly footprint?: string
  /** KiCad symbol library id, e.g. "Amplifier_Operational:TL072". */
  readonly symbol?: string
  /** Canonical pin -> KiCad symbol pin number, keyed by unit name. */
  readonly symbolPins?: Readonly<Record<string, Readonly<Record<string, string>>>>
  /** Canonical pin -> footprint pad. */
  readonly pads?: Readonly<Record<string, string>>
}

export interface Unit {
  /** Unique within the component: "A"/"B" for a dual op-amp, "MAIN" otherwise. */
  readonly name: string
  readonly pins: Readonly<Record<string, Connection>>
  readonly symbol?: string
  readonly spiceModel?: string
}

export interface Component {
  /** Stable semantic identity, e.g. "input_bias". Never a designator. */
  readonly id: string
  readonly kind: ComponentKind
  readonly parameters: Parameters
  readonly part?: PartSpec
  /** Package pins shared across units: supply, shield, substrate. */
  readonly pins: Readonly<Record<string, Connection>>
  /** One entry per functional unit. Single-unit parts have exactly one. */
  readonly units: readonly Unit[]
}

export interface Network {
  readonly components: readonly Component[]
  /** External interface: port name -> net name. */
  readonly ports: Readonly<Record<string, string>>
}
