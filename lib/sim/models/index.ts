import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Where a model's SPICE text comes from, and what kind of trust that implies
 * (spec section 5.2):
 * - "discrete" - a standard small-signal part's short `.model` line, whose
 *   parameters are widely published and not vendor-specific.
 * - "vendor" - a manufacturer's `.subckt` text, vendored as a file with its
 *   own origin and licensing terms.
 * - "behavioural" - written for this project, with its derivation documented
 *   in its provenance rather than inherited from any external source.
 */
export type ModelCategory = "discrete" | "vendor" | "behavioural"

export interface DeviceModel {
  readonly name: string
  readonly category: ModelCategory
  /** SPICE text: a .model line, or a .subckt block. */
  readonly spice: string
  /** Where this came from and under what terms. Required, non-empty. */
  readonly provenance: string
  /** Canonical pin -> position in the .subckt line. Subcircuit-backed models only. */
  readonly pinOrder?: readonly string[]
}

function loadSpiceText(fileName: string): string {
  return readFileSync(join(import.meta.dir, fileName), "utf-8")
}

const PROVENANCE_1N4148 =
  "NXP Semiconductors' published SPICE model for the 1N4148 " +
  "(nxp.com/documents/spice_model/1N4148.prm; mirrored in the PySpice project's " +
  "example library at github.com/FabriceSalvaire/PySpice, retrieved and " +
  "cross-checked 2026-09-22). Parameter values are unchanged from the vendor " +
  "file; the syntax was reformatted onto a single `.model NAME D(...)` line " +
  "and the vendor's reverse-mode-only wrapping .subckt was dropped, since " +
  "this project files 1N4148 as a standard-discrete .model line, not a " +
  "vendor subcircuit. See lib/sim/models/1N4148.spice for the full note."

const PROVENANCE_2N3904 =
  "The Fairchild Semiconductor Gummel-Poon SPICE model for the 2N3904 " +
  "(catalogued in Fairchild's own model-library metadata as pid=23, " +
  "case=TO92, dated 88-09-08). This parameter set is the version most " +
  "widely redistributed across public SPICE model libraries (PSpice, " +
  "LTspice, ngspice) and course materials; corroborated 2026-09-22 via web " +
  "search against multiple independent mirrors, though a single stable " +
  "Fairchild-hosted original was not located in this session - see " +
  "lib/sim/models/2N3904.spice for the full caveat."

const PROVENANCE_IDEAL_OPAMP =
  "Authored for this project (audio-circuits canonical-model), 2026-09-22. " +
  "This is NOT a device model: it does not represent, and is not derived " +
  "from, any real operational amplifier part - it is not a TL072, and is " +
  "not intended to stand in for one. It is a deliberately ideal " +
  "voltage-controlled voltage source with very high input impedance and " +
  "very high open-loop gain. Results computed with this model are " +
  "properties of an IDEAL amplifier, not predictions about any real part; " +
  "mistaking it for a TL072 (or any other real op-amp) model would produce " +
  "false conclusions about a real circuit. It exists so the multi-unit " +
  "component lowering added in a later task has a subcircuit-backed model " +
  "to test against that does not depend on whichever real op-amp model a " +
  "later task registers."

const models: readonly DeviceModel[] = [
  {
    name: "1N4148",
    category: "discrete",
    spice: loadSpiceText("1N4148.spice"),
    provenance: PROVENANCE_1N4148,
  },
  {
    name: "2N3904",
    category: "discrete",
    spice: loadSpiceText("2N3904.spice"),
    provenance: PROVENANCE_2N3904,
  },
  {
    name: "IDEAL_OPAMP",
    category: "behavioural",
    spice: loadSpiceText("IDEAL_OPAMP.spice"),
    provenance: PROVENANCE_IDEAL_OPAMP,
    pinOrder: ["in+", "in-", "out"],
  },
]

const byName = new Map<string, DeviceModel>(models.map(model => [model.name, model]))

/** Looks up a registered device model by name. Throws, listing what is
 * registered, rather than returning a default or undefined for an unknown
 * name - an unknown model name is a bug to surface, not paper over. */
export function deviceModel(name: string): DeviceModel {
  const model = byName.get(name)
  if (!model) {
    const known = models.map(m => m.name).join(", ")
    throw new Error(`Unknown device model: ${name}. Known models: ${known}`)
  }
  return model
}

/** Every registered device model, so invariants (non-empty provenance,
 * pinOrder on subcircuit-backed entries) can be swept across the registry. */
export function allModels(): readonly DeviceModel[] {
  return models
}
