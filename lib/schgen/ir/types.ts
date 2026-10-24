/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/types.ts` (with the MCU pin-map cuts of
 * `docs/known-gaps.md` **G112**), and DIVERGED from it by Task 8 of the M1 schematic-authoring
 * plan: `Rendering` loses `labels` and gains `auto` (decision D3, below). **Diverged further by
 * Task 13 under ruling R29**: `CircuitSpec` and `Circuit` carry two derived/declared maps the
 * layout backend could not otherwise reach - `orientations` (spec §1.5 step 2's answer per part,
 * **G182**) and `portDirections` (**G186**'s *"only input genuinely missing from the IR"*) - and
 * `PortDirection` is declared here rather than in `../authoring.ts`.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it, and an upstream fix will
 * not arrive here by porting: **edit this file**. Its `diverged` entry in
 * `tools/schgen/port-manifest.json` carries the reason; see `lib/schgen/README.md` and
 * `docs/known-gaps.md` **G139**.
 */

/**
 * Authoring form and normalised IR for the schematic generator.
 *
 * Authoring is part-centric (one module per sheet). Nothing downstream of
 * buildCircuit() reads the authoring form: validation, rendering and the
 * expected-connectivity export all read Circuit.
 */

/**
 * **The one import this module has, and it is a type.** `Rotation` is `render/geometry.ts`'s
 * `0 | 90 | 180 | 270`, and `CircuitSpec.orientations` carries it. It is imported rather than
 * re-declared: a second four-value union would be a second thing to keep in step, and
 * `rules/orientation.ts`, `graph.ts` and every placement already speak this one.
 * `render/geometry.ts` imports only `./lib-pins.ts`, which imports `../ir/order.ts` (which imports
 * nothing) and `./sexpr-write.ts`, so nothing here is circular.
 */
import type { Rotation } from "../render/geometry.ts";

export type NetName = string;
export type PinNumber = string;
export type PartLabel = string;
export type PinIdentity = string;
export type BlockId = string;
export type SheetId = string;

export const TEMPLATE_IDS = [
  "rail-row",
  "decoupling-bank",
  "divider",
  "passive-chain",
  "crystal",
  "regulator",
  "opamp-stage",
  "connector-fanout",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/**
 * WHAT A NET NAME MAY BE. **The CASE half is gone by the owner's decision, 2026-10-23**, and this
 * is the whole of what replaced it.
 *
 * It was `/^[A-Z0-9][A-Z0-9_]*$/` - UPPER_SNAKE - until Task 3 of the net-names-and-floating-pins
 * plan. The owner, verbatim: *"i absolutely do not care about the letter case of net names. That's
 * a silly quibble."* `docs/known-gaps.md` **G150** carries the decision and what it unblocked; it
 * also records that the one regex refused two different things with one message, of which the case
 * half was the silly one.
 *
 * **WHAT REPLACED IT: non-empty, and no control character.** Both halves have a reason and
 * neither is a convention.
 *
 * **NON-EMPTY**, because `lib/model/types.ts`'s own `net()` refuses an empty name
 * (*"net name must not be empty"*). A rule here that accepted `""` would be weaker than the
 * contract it guards, which is the defect the change removing the case demand was most likely to
 * introduce.
 *
 * **NO CONTROL CHARACTER - AND THE REASON IS NOT THAT KICAD REJECTS ONE.** `[RAN]`
 * `tools/schgen/label-syntax/probe-run.log`, `kicad-cli` 10.0.5, six control arms through a real
 * global label:
 *
 * | arm | `kicad-cli sch export netlist` | the name that came back |
 * | --- | --- | --- |
 * | tab (`\u0009`) | exit 0, parsed | the tab, **verbatim** |
 * | newline (`\u000a`) | exit 3, nothing produced | - |
 * | carriage return (`\u000d`) | **exit 0, label drawn** | **`RAWCR` - a DIFFERENT net name** |
 * | NUL (`\u0000`) | **exit 0, label drawn** | **`RAW` - truncated** |
 *
 * So *"a control character breaks a net name"* is **false**: a tab is accepted verbatim and only
 * the newline is refused. **The hazard is the opposite of rejection - two of them SUCCEED and
 * RENAME the net**: exit 0, a drawn label, and a net name in the exported netlist that is not the
 * one the sheet carried. A check asking only whether `kicad-cli` succeeded would pass both, which
 * is this repository's cardinal failure mode landing in the one place a net name becomes a label.
 * That silent rename is why this is refused rather than defaulted.
 *
 * **The class is EXACTLY the one `str()` refuses** (`lib/schgen/render/sexpr-write.ts:31`,
 * `[\u0000-\u001f]`), deliberately: the writer and this rule then draw the same line, so a net
 * name that passes here cannot fail at emit for a reason this rule did not state. **DEL
 * (`\u007f`) and the C1 range are in NEITHER class and were never measured** -
 * `docs/known-gaps.md` **G280**.
 *
 * **PUNCTUATION IS NOT REFUSED, and that is measured rather than conceded.** Same run:
 * `Net-(C10-Pad1)` and `unconnected-(U1-CLK_O-Pad5)` parse, round-trip byte-identical and render,
 * and `lib/kicad/sexpr.ts`'s `quoteString` escapes nothing for either - it escapes only `\` and
 * `"`, both of which were measured too and both of which round-trip.
 *
 * **ITS ONE PRODUCTION CALLER IS `lib/schgen/gates/pin-table.ts`'s `mechanical()`**, where it
 * carries the type-plus-format check that gate has always made. The `netNames` rule that used to
 * apply it to every IR net name is deleted; `lib/schgen/ir/validate.ts` says where it was what
 * now carries what.
 */
export const NET_NAME = /^[^\u0000-\u001f]+$/;

/** A pin is on a named net, or explicitly not connected. "NC" is a type, never a net name. */
export type PinConnection =
  | { readonly net: NetName; readonly identity: PinIdentity }
  | { readonly nc: true; readonly identity: PinIdentity };

export function connectedNet(c: PinConnection): NetName | null {
  return "net" in c ? c.net : null;
}

export interface BomFields {
  readonly Manufacturer: string;
  readonly MPN: string;
  readonly Supplier: string;
  readonly SupplierPart: string;
  /** Supply absolute maximum in volts, as text; required by bom-check for active VIN_PROT parts. */
  readonly AbsMaxV: string | null;
}

export type MechanicalConnection = { readonly net: NetName } | { readonly nc: true };

/**
 * A footprint pad with no symbol pin: shield, exposed pad, mounting pad. The validator refuses a
 * `{ net }` connection (the schematic cannot carry it); a pad that needs a net must be a symbol pin.
 */
export interface MechanicalPad {
  readonly pad: string;
  readonly connection: MechanicalConnection;
}

export interface PartSpec {
  /** Functional label, unique across the design, e.g. "R_DIV1_L". Never a reference. */
  readonly label: PartLabel;
  readonly refPrefix: string;
  readonly libId: string;
  /** Units to place, e.g. [1] or [1, 2, 3] for a dual op-amp with its power unit. */
  readonly units: readonly number[];
  readonly value: string;
  readonly footprint: string;
  readonly bom: BomFields;
  readonly dnp: boolean;
  readonly checklist: readonly string[];
  /** Provenance: the design note section or datasheet the part and its values come from. */
  readonly source: string;
  /** Key of h7-platform/pintables/<key>.json when this part needs a datasheet pin table. */
  readonly pinTable: string | null;
  readonly pins: Readonly<Record<PinNumber, PinConnection>>;
  readonly mechanicalPads: readonly MechanicalPad[];
  /**
   * Explicit opt-in: every symbol pin not declared in `pins` (and not assigned by the pin map)
   * is a no-connect. Used only for the MCU's unused GPIOs (CORE-27). The reason is required.
   */
  readonly ncUnlisted: { readonly reason: string } | null;
}

export type BlockMember = PartLabel | { readonly part: PartLabel; readonly unit: number };

export interface BusGroup {
  readonly name: string;
  /** Exact net names, never patterns. */
  readonly nets: readonly NetName[];
}

/** The part a template is organised around, with its pins' roles given by pin number. */
export interface TemplateAnchor {
  readonly part: PartLabel;
  readonly unit: number;
  readonly roles: Readonly<Record<string, PinNumber>>;
}

/**
 * **`{ kind: "labels" }` IS DELETED AND `{ kind: "auto" }` REPLACES NOTHING** (Task 8, plan
 * decision D3). The pedals source has a third variant, `labels`, which draws a block's
 * connectivity entirely in net labels. It is not ported: `docs/known-gaps.md` **G84** records the
 * design review that killed it there (*"Why generate a knowingly inferior schematic and rely on an
 * agent later noticing it?"*) and **G81** records that this repository's own
 * `lib/kicad/schematic.ts` emits that exact pathology. A block no template realises is a
 * generation error, not a degraded drawing.
 *
 * `auto` is the opposite claim: the block has no declared template and the renderer chooses one,
 * falling to the ELK backend only when EVERY template reports `not-applicable`. **The rule is
 * stated once, on `selectRenderer` in `render/blocks.ts`** - the sentence here is scoped to this
 * variant and is correct in place, but the canonical version is there and says what a `wired`
 * block does differently. It carries no payload, and it carries no anchor - which
 * is why the four anchor-driven templates can never apply to an `auto` block; see
 * `docs/known-gaps.md` **G141**.
 */
export type Rendering =
  | { readonly kind: "wired"; readonly template: TemplateId; readonly anchor: TemplateAnchor | null }
  | { readonly kind: "bus"; readonly groups: readonly BusGroup[] }
  | { readonly kind: "auto" };

export interface BlockSpec {
  readonly id: BlockId;
  readonly sheet: SheetId;
  readonly title: string;
  readonly members: readonly BlockMember[];
  readonly checklist: readonly string[];
  readonly rendering: Rendering;
}

/** Text placed on a sheet, e.g. a layout note. Each line becomes one text item. */
export interface SheetNote {
  readonly lines: readonly string[];
  readonly checklist: readonly string[];
}

export type Paper = "A4" | "A3" | "A2" | "A1";

export interface SheetSpec {
  readonly id: SheetId;
  readonly title: string;
  /** File name relative to the output directory, e.g. "core.kicad_sch". */
  readonly file: string;
  readonly paper: Paper;
  readonly notes: readonly SheetNote[];
}

export interface RailSpec {
  readonly net: NetName;
  /** Power symbol cloned for this rail, e.g. "power:GND" or "power:+3V3"; its Value becomes `net`. */
  readonly symbol: string;
  /** Ground rails are drawn at the bottom of blocks with downward symbols; supplies at the top. */
  readonly kind: "ground" | "supply";
  /** Rails driven only by passive pins need one PWR_FLAG, placed on this sheet. */
  readonly pwrFlag: { readonly sheet: SheetId } | null;
}

/**
 * Which way a net crosses a boundary.
 *
 * **IT MOVED HERE FROM `../authoring.ts` BY RULING R29, AND `authoring.ts` RE-EXPORTS IT** rather
 * than declaring a second copy. The type is now part of the IR's own vocabulary because
 * `CircuitSpec.portDirections` carries it: `docs/known-gaps.md` **G186** measured that
 * `portDirections` is *"the only input genuinely missing from the IR"* of the two
 * `GenerateEnv.authoring` was added for, and R29 settles that it *"belongs in the IR beside
 * `rails`"*. One declaration, re-exported where it used to live - `CLAUDE.md`'s *supersede means
 * delete* applied to a type.
 */
export type PortDirection = "in" | "out" | "bidirectional";

export const PORT_DIRECTIONS: readonly PortDirection[] = ["in", "out", "bidirectional"];

export interface CircuitSpec {
  readonly parts: readonly PartSpec[];
  readonly blocks: readonly BlockSpec[];
  readonly sheets: readonly SheetSpec[];
  readonly rails: readonly RailSpec[];
  /**
   * Per part, the rotation spec §1.5's step-2 rule library prefers, or `null` where it leaves the
   * choice open. **DERIVED DATA, carried rather than recomputed** - ruling **R29**.
   *
   * **WHY IT IS HERE AND NOT COMPUTED WHERE IT IS USED.** `rules/orientation.ts` keys on
   * `ComponentKind`, which lives in `lib/model/types.ts` and reaches `lib/schgen/` only through
   * `from-network.ts`'s `Network`. `IrPart` has no kind, so **no consumer downstream of the IR can
   * call the rule** (`docs/known-gaps.md` **G182**), and until R29 every ELK node was built at a
   * `GRAPH_ROTATION` constant with §1.5 step 2 never running at all. The map is computed where the
   * `Network` already is - `preferredOrientationsOf` in `from-network.ts` - and carried, which
   * keeps model vocabulary out of the IR while making the rule's answer reachable.
   *
   * **IT IS TOTAL OVER `parts`, AND `buildCircuit` REFUSES A HOLE.** A missing entry is not read as
   * "no preference": `null` already means that, and the two must not collapse, because a part the
   * deriving step skipped would then draw in the library frame and look exactly like a part the
   * rule declined. A `null` is the rule's answer; an absence is a defect in whoever built the spec.
   */
  readonly orientations: ReadonlyMap<PartLabel, Rotation | null>;
  /**
   * Per net, the direction it crosses a boundary in, as the authoring file declares it.
   *
   * **DECLARED AT THE CIRCUIT BOUNDARY AND OPEN BELOW IT**, which is `docs/known-gaps.md` **G99**'s
   * measured residue and not a gap this field introduces: a net that leaves a BLOCK without being a
   * declared port of the network has no entry, and `negotiablePort` states that case in its own
   * `why` rather than inventing a side for it. So an absent entry is a stated open case here, where
   * an absent `orientations` entry is a defect - the two fields differ on purpose.
   */
  readonly portDirections: Readonly<Record<NetName, PortDirection>>;
}

export interface PinRef {
  readonly part: PartLabel;
  readonly pin: PinNumber;
}

export type PinOrigin = "circuit" | "nc-unlisted";

export interface IrPin {
  readonly part: PartLabel;
  readonly pin: PinNumber;
  /** Symbol unit carrying the pin; 0 for pins common to all units. */
  readonly unit: number;
  readonly identity: PinIdentity;
  /** Null means explicitly not connected. */
  readonly net: NetName | null;
  readonly origin: PinOrigin;
}

export interface IrUnitRef {
  readonly part: PartLabel;
  readonly unit: number;
}

export interface IrPart {
  readonly label: PartLabel;
  readonly refPrefix: string;
  readonly libId: string;
  readonly units: readonly number[];
  readonly value: string;
  readonly footprint: string;
  readonly bom: BomFields;
  readonly dnp: boolean;
  readonly checklist: readonly string[];
  readonly source: string;
  readonly pinTable: string | null;
  readonly mechanicalPads: readonly MechanicalPad[];
  readonly ncUnlistedReason: string | null;
  /** Position in the authoring order; used for deterministic iteration. */
  readonly order: number;
}

export interface IrBlock {
  readonly id: BlockId;
  readonly sheet: SheetId;
  readonly title: string;
  readonly members: readonly IrUnitRef[];
  readonly checklist: readonly string[];
  readonly rendering: Rendering;
  readonly order: number;
}

export interface Circuit {
  readonly parts: ReadonlyMap<PartLabel, IrPart>;
  /** Every pin of every part, sorted by part order then pin number. */
  readonly pins: readonly IrPin[];
  /** Net name -> its pins in part order then pin order; nets sorted by name. */
  readonly nets: ReadonlyMap<NetName, readonly PinRef[]>;
  readonly blocks: ReadonlyMap<BlockId, IrBlock>;
  readonly sheets: readonly SheetSpec[];
  readonly rails: ReadonlyMap<NetName, RailSpec>;
  /** `CircuitSpec.orientations`, carried through `buildCircuit`, which refuses a hole in it. */
  readonly orientations: ReadonlyMap<PartLabel, Rotation | null>;
  /** `CircuitSpec.portDirections`, carried through `buildCircuit`. */
  readonly portDirections: Readonly<Record<NetName, PortDirection>>;
  /** unitKey(part, unit) -> the block that places it. */
  readonly unitBlock: ReadonlyMap<string, BlockId>;
  /**
   * Nets whose other pins are on sheets outside this circuit, so they are labelled like any
   * cross-sheet net. Only a sheet subset (the A2 sheet harness) has any; buildCircuit, which
   * always builds a whole design, leaves it empty.
   */
  readonly offSheet: ReadonlySet<NetName>;
}

export function unitKey(part: PartLabel, unit: number): string {
  return `${part}#${unit}`;
}
