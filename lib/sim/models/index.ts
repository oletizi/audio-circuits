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
  /** The literal SPICE-legal node names used in the .subckt argument list,
   * positionally aligned with pinOrder (same index = same physical pin;
   * canonical spelling in pinOrder vs. SPICE-legal spelling here - canonical
   * names like "in+" are not valid SPICE node names). The emitter never
   * reads this field; it exists so a test can check the declared
   * correspondence between the two spellings against the model's own
   * .subckt text, catching a permutation of either that a length-only
   * comparison would miss. Subcircuit-backed models only.
   */
  readonly subcktNodeNames?: readonly string[]
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
  "The 2N3904 parameter set from the PSpice/OrCAD evaluation library " +
  "entry `Q2N3904`, which appears in multiple public SPICE model " +
  "libraries (PSpice, LTspice, ngspice) and in course materials; how its " +
  "circulation ranks against other 2N3904 parameter sets is not measured " +
  "and not claimed. Which " +
  "company originated it is not resolved by the available sources: it " +
  "appears in multiple public mirrors whose accompanying comment blocks " +
  "are identical to each other except for the company name - some read " +
  "National Semiconductor, at least one reads Fairchild - and all of " +
  "them date it 88-09-08 (pid=23, case=TO92). No mirror is ranked above " +
  "another here. Corroborated 2026-09-22 via web search against multiple " +
  "independent mirrors - see lib/sim/models/2N3904.spice for the full " +
  "note. The 27 parameter values are consistent across every mirror " +
  "checked and were not invented; only the originating company is " +
  "unresolved."

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
  "later task registers. It carries v+/v- supply pins so it can be " +
  "instantiated against a package that has them, but it is behaviourally " +
  "unaffected by supply rail voltage - it stays an ideal amplifier " +
  "regardless of what is connected to those pins."

const PROVENANCE_GENERIC_OPAMP =
  "Authored for this project (audio-circuits canonical-model), 2026-09-22. " +
  "This is NOT a vendor part model: it does not represent, and is not " +
  "derived from, any real operational amplifier - it is not a TL072 and " +
  "must not be read as one. A circuit may record part.mpn = \"TL072\" " +
  "while its unit records spiceModel = \"GENERIC_OPAMP\"; the part and the " +
  "model are different claims. It exists because no redistributable TL072 " +
  "macromodel was found: Texas Instruments distributes one " +
  "(www.ti.com/lit/zip/sloj067, retrieved 2026-09-22), that file carries " +
  "no licence text of its own, and ti.com's Terms of Use puts software " +
  "with no accompanying terms under TI's Evaluation, Development and " +
  "Demonstration Software License Agreement (www.ti.com/lit/pdf/sszo061), " +
  "which states that it \"DOES NOT CONVEY ANY LICENSE ... TO DISTRIBUTE " +
  "THE LICENSED MATERIALS TO ANY THIRD PARTY\". Nothing was vendored. " +
  "Results computed with this model are properties of a generic, mildly " +
  "non-ideal amplifier (open-loop gain 1e4, dominant pole 300 Hz, output " +
  "resistance 100 ohm), NOT predictions about a TL072 or any other real " +
  "part. Its v+/v- pins are structural: no element inside the subcircuit " +
  "references them, so the model does not clip at the rails and has no " +
  "supply rejection, and no result obtained through it says anything " +
  "about headroom or supply behaviour. See lib/sim/models/GENERIC_OPAMP.spice " +
  "for the full note, including why the open-loop gain is deliberately " +
  "modest rather than as large as possible."

/** The single declared correspondence between IDEAL_OPAMP's canonical pin
 * names and the SPICE-legal node names its .subckt argument list actually
 * uses, in physical pin order. pinOrder and subcktNodeNames below are both
 * derived from this one array so they cannot drift apart from each other by
 * construction; the registry-invariant sweep in tests/sim/models.test.ts
 * checks subcktNodeNames (and therefore, transitively, this array) against
 * the model's own .subckt line.
 */
const IDEAL_OPAMP_PINS: readonly { readonly canonical: string; readonly spice: string }[] = [
  { canonical: "in+", spice: "inp" },
  { canonical: "in-", spice: "inn" },
  { canonical: "out", spice: "out" },
  { canonical: "v+", spice: "vplus" },
  { canonical: "v-", spice: "vminus" },
]

/** GENERIC_OPAMP's canonical-to-SPICE pin correspondence, in physical pin
 * order, for the same reason IDEAL_OPAMP_PINS exists: pinOrder and
 * subcktNodeNames are both derived from one array so they cannot drift apart,
 * and the registry sweep in tests/sim/models.test.ts checks subcktNodeNames
 * against the model's own .subckt line. That sweep proves the NAMES line up;
 * it cannot prove the semantic pairing (that "in+" really is `inp`), which is
 * established separately, by measurement, in the same test file.
 */
const GENERIC_OPAMP_PINS: readonly { readonly canonical: string; readonly spice: string }[] = [
  { canonical: "in+", spice: "inp" },
  { canonical: "in-", spice: "inn" },
  { canonical: "out", spice: "out" },
  { canonical: "v+", spice: "vplus" },
  { canonical: "v-", spice: "vminus" },
]

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
    pinOrder: IDEAL_OPAMP_PINS.map(pin => pin.canonical),
    subcktNodeNames: IDEAL_OPAMP_PINS.map(pin => pin.spice),
  },
  {
    name: "GENERIC_OPAMP",
    category: "behavioural",
    spice: loadSpiceText("GENERIC_OPAMP.spice"),
    provenance: PROVENANCE_GENERIC_OPAMP,
    pinOrder: GENERIC_OPAMP_PINS.map(pin => pin.canonical),
    subcktNodeNames: GENERIC_OPAMP_PINS.map(pin => pin.spice),
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
