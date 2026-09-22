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
  Provenance,
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
  /**
   * Whether this part's terminals have NO internal electrical relationship of
   * any kind - a screw terminal or a pin header, where each terminal is simply
   * a place a wire lands.
   *
   * A property of the concrete PART rather than of the kind, and that is the
   * whole point of putting it here: `kind: "connector"` covers both a screw
   * terminal and a switching jack, whose contact opens when a plug is
   * inserted. The kind cannot tell them apart, so the kind must not decide. A
   * part that switches is not an inert connector and belongs in
   * `kind: "switch"` with a control-state position, where the model already
   * expresses contacts that open and close.
   *
   * Consumers that need the answer (the SPICE emitter) REQUIRE it on a
   * connector and throw when it is absent, rather than assuming either value.
   * Assuming `true` is exactly how a switching part would vanish silently from
   * a deck; assuming `false` would refuse every screw terminal ever authored.
   */
  readonly electricallyInert?: boolean
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
  /** Where this component's data came from. Metadata; assertSameTopology ignores it. */
  readonly provenance?: Provenance
}

export interface Network {
  readonly components: readonly Component[]
  /** External interface: port name -> net name. */
  readonly ports: Readonly<Record<string, string>>
}

/** Per-kind component views.
 *
 * `Component` keeps `kind` and `parameters` as independent fields - a pin vocabulary
 * needs no fixed parameter shape - so narrowing a `Component` on `kind` alone does not
 * narrow `parameters`. These give consumers that read one kind's parameters (a physical
 * network's control-state resolver, for instance) something to narrow into via a type
 * predicate rather than a cast.
 */
export interface ResistorComponent extends Component {
  readonly kind: "resistor"
  readonly parameters: ResistorParameters
}
export interface CapacitorComponent extends Component {
  readonly kind: "capacitor"
  readonly parameters: CapacitorParameters
}
export interface InductorComponent extends Component {
  readonly kind: "inductor"
  readonly parameters: InductorParameters
}
export interface PotentiometerComponent extends Component {
  readonly kind: "potentiometer"
  readonly parameters: PotentiometerParameters
}
export interface SwitchComponent extends Component {
  readonly kind: "switch"
  readonly parameters: SwitchParameters
}
