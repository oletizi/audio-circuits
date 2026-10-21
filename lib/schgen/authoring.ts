/**
 * WHAT A CIRCUIT'S SCHEMATIC AUTHORING FILE DECLARES, SO NO BACKEND INVENTS IT.
 *
 * Hand-written for Task 9 of the M1 schematic-authoring plan. The criterion is
 * `docs/known-gaps.md` **G99**'s, verbatim: ***"every input a layout backend needs is either
 * declared in the model or derived by a reviewed rule - none invented at the call site."***
 *
 * G99 measured five inventions a spike harness had to make. Each one lands somewhere stated:
 *
 * | invention | where it lives now |
 * | --- | --- |
 * | a **symbol** per kind | `rules/symbols.ts`'s `symbolForKind`, with `ComponentOverride.symbol` for the residue |
 * | a **pin-side partition** | `rules/pin-sides.ts`'s `pinSidesFor`, read off the symbol's own pin angles, on every path. `ComponentOverride.pinSides` is an ASSERTION checked against that geometry, never an override of it (**G155**) |
 * | a **drawn orientation** | `rules/orientation.ts`, as step 2 of spec §1.5's authority order |
 * | a **rail convention** | `SchematicAuthoring.rails` - declared per net, with its power symbol and whether it is a ground or a supply |
 * | a **port direction** | `SchematicAuthoring.portDirections` - declared per net |
 *
 * **BLOCKS COME FROM WHAT THE CIRCUIT ALREADY DECLARES AND FROM NOTHING CHOSEN HERE**
 * (plan decision **D1**): `include()` prefixes, `OWNERSHIP`/`partitionReference()`, `LEGS`,
 * `allStandIns()`. D1's own words: *"recovering it by string-prefix matching would put the cut
 * back in the generator's hands. The authoring file lists ids; Task 9 adds a check that the
 * declared blocks AGREE WITH the `include()` prefixes wherever a prefix exists."*
 *
 * **AND A BLOCK'S INTERFACE IS DECLARED BESIDE ITS MEMBERS** (plan decision **D9**, spec §1.9).
 * §1.9's table says an interface port is *"named, and agreeing with the block's declared ports in
 * the model - **never inferred from which nets happen to leave**"*. That sentence cuts both ways
 * and `interfaceDisagreements` enforces both: a declared port no member touches refuses, and a
 * net that leaves and is undeclared refuses too. **Seam B (Task 15) is the only consumer** of
 * `BlockDeclaration.interface`; nothing on Task 12's or Task 13's seam-A path reads it.
 *
 * **TWO FIELDS HERE ARE NOT IN TASK 9's BRIEF, AND BOTH ARE DEVIATIONS WITH REASONS.**
 * `BlockDeclaration.prefixes` and `SchematicAuthoring.declared` are recorded in
 * `docs/known-gaps.md` **G148** and **G149**; the short forms are on the fields themselves.
 */

import { NET_NAME, PORT_DIRECTIONS, type BlockId, type BomFields, type NetName, type RailSpec, type SheetSpec } from "./ir/types.ts"
import type { PortDirection, Rendering, TemplateAnchor } from "./ir/types.ts"
import { isPinSide } from "./rules/pin-sides.ts"
import type { PinSide } from "./rules/pin-sides.ts"
import type { Network } from "../model/types.ts"

export type { PinSide } from "./rules/pin-sides.ts"

/**
 * Which way a net crosses a boundary.
 *
 * G99's fifth invention: the spike emitted every declared port as `direction: "input"`, so
 * *"on `leg-upper` the exit port `to` draws as an arrow pointing INTO the trim-pot"*. The model
 * says a net crosses - `Network.ports` - and says nothing about which way, so this is declared.
 *
 * **IT IS DECLARED IN `./ir/types.ts` NOW AND RE-EXPORTED HERE** - ruling **R29**, closing
 * **G186**. `CircuitSpec.portDirections` carries the declaration into the IR so a layout backend
 * reaches it from a `BlockSubgraph` instead of from a `GenerateEnv` field, and the type went with
 * it. It is re-exported rather than re-declared so that the four `circuits/*` authoring files and
 * the two test fixtures that import it from here keep one source of truth.
 */
export type { PortDirection }

export { PORT_DIRECTIONS }

/**
 * Spec §1.9: a named electrical interface port, its acceptable sides, and whether its position is
 * negotiable.
 */
export interface InterfacePort {
  readonly net: NetName
  /**
   * Acceptable attachment sides. **An empty list is a refusal, not "any side"** - `CLAUDE.md`:
   * an empty whitelist that refuses loudly beats a general rule that quietly accepts a guess.
   */
  readonly sides: readonly PinSide[]
  /** Fixed by the block's own internal geometry, or seam B's to choose. */
  readonly position: "fixed" | "negotiable"
  /** Never blank for "fixed": a fixed position is a claim about the block's geometry. */
  readonly why: string
}

/**
 * Which `include()` prefixes a block's members come from - decision **D1**'s check made possible.
 *
 * **NOT IN TASK 9's BRIEF; A DEVIATION, RECORDED IN G148.** `includeNetwork` prefixes component
 * ids with `${prefix}_` and then the prefix is GONE: a composed `Network` is a flat component
 * list of plain strings, so nothing in it says that `audio_input_coupling_cap` arrived through
 * `include("audio", …)` rather than being called that. D1 forbids recovering it by string-prefix
 * matching, and every derivation this writer tried produced a measured false positive: taking a
 * block's members' longest common `_`-segment prefix flags `collector_test_point` as a member of
 * the `collector` leg of `circuits/transistor-preamp/lab-board.ts`, and `emitter_bypass_cap` as a
 * member of the `emitterBypass` leg, and neither is. See `docs/known-gaps.md` **G148**.
 *
 * So the prefix is DECLARED, beside the members, and checked against the component ids.
 */
export interface BlockPrefixes {
  /**
   * The prefixes, without the trailing underscore. Empty for a block of an uncomposed circuit -
   * which is a claim that is checked too: no member of such a block may carry another block's
   * declared prefix.
   */
  readonly prefixes: readonly string[]
  /**
   * Required (non-blank) when `prefixes` holds more than one. D1: *"no block may hold members
   * from two prefixes unless the authoring file says why."*
   */
  readonly why: string | null
}

export interface BlockDeclaration {
  readonly id: BlockId
  readonly sheet: string
  readonly title: string
  /** Component ids, exactly as the `Network` names them. Never a prefix pattern. */
  readonly members: readonly string[]
  readonly rendering: Rendering
  readonly anchor: TemplateAnchor | null
  /** Spec §1.9's contract. Declared here per D9; read only by seam B (Task 15). */
  readonly interface: readonly InterfacePort[]
  /** See `BlockPrefixes`. Not in the brief; deviation recorded in G148. */
  readonly prefixes: BlockPrefixes
}

export interface ComponentOverride {
  readonly symbol?: string
  /** Unit name as the model names it -> canonical pin -> KiCad pin number. */
  readonly symbolPins?: Readonly<Record<string, Readonly<Record<string, string>>>>
  /**
   * KiCad pin number -> side, as an ASSERTION rather than an override: a pin's side is read from
   * the library on every path, and a declaration that disagrees with the symbol's own
   * `(at x y angle)` refuses naming the pin, the declared side and the library's. None of the
   * four parity circuits declares one; `docs/known-gaps.md` **G155** records why the nineteen it
   * once carried are gone.
   */
  readonly pinSides?: Readonly<Record<string, PinSide>>
  /** Never blank: an override is a claim and carries its reason. */
  readonly why: string
}

/**
 * Where `BomFields` comes from.
 *
 * **THE DECISION, AND IT IS A DECISION RATHER THAN A DEFAULT** (Task 9 brief Step 4: *"either the
 * authoring file declares them or `bomFields` refuses - do not default them to empty strings and
 * do not widen the exemption list silently. Decide, implement, and record which."*).
 *
 * `BomFields` wants Manufacturer, MPN, Supplier and SupplierPart. **The circuit model has a slot
 * for exactly one of the four** - `PartSpec.mpn` - and no slot at all for the other three. This
 * repository's purchasing data is real but it is keyed the other way: `parts/*.json` holds a
 * catalog entry per orderable part with its manufacturer and supplier evidence, and
 * `boards/<board>/bom.json` joins a BOARD's lines to it by a `"<kind> <value> <footprint>"`
 * string. Two of eleven boards have a `bom.json` at all, and **no reviewed rule joins a board's
 * BOM to a circuit model's component.**
 *
 * So the authoring file states which case it is in, per circuit:
 *
 * - `declared` - the fields, per component id. A component with no entry refuses, by name;
 * - `unsourced` - **a declaration of SOURCING READINESS: this circuit is not sourced, and here is
 *   why.** `bomFieldsFor` then returns the four keys empty rather than invented, and
 *   `ir/validate.ts`'s `validateSourcing` - which runs the IR's own `bomFields` rule - names every
 *   non-exempt part for any consumer that has to source and place them. The exemption list is
 *   untouched: `BOM_EXEMPT_PREFIXES` still covers `TP`, `H` and `FID` and nothing else.
 *
 * What is NOT done, and why each is worse: defaulting to empty strings with no declaration (a
 * silent blank that nobody chose, which the brief forbids by name); widening
 * `BOM_EXEMPT_PREFIXES` so the rule stops asking (a check quietly made unable to fail); and
 * writing plausible manufacturers and supplier part numbers into the authoring files (fabricated
 * purchasing data, which is worse than no data because it looks orderable).
 *
 * **WHAT THIS COMMENT GOT WRONG UNTIL TASK 20, left visible because the error is more instructive
 * than the fix.** It read `unsourced` as an apology to a validator: *"an explicit declaration,
 * carrying its reason, that this circuit carries no purchasing data"*, followed by the observation
 * that `bomFields` then *"refuses every non-exempt part by name the moment anyone validates the
 * circuit"* - and that refusal was accepted as the price. All four options it weighed accept that a
 * PURCHASING rule gates a DRAWING. The owner's question - *"why does a schematic need bom-level
 * specificity?"* - raises the option that was not in the frame, which is that the gate is in the
 * wrong place; his ruling is quoted in full in `lib/schgen/ir/validate.ts`'s header, and
 * `docs/known-gaps.md` **G245** records why the earlier decision could not see it, and under ruling
 * **R69** the cause is NOT the one first offered: the port's edit rule on `validate-parts.ts`
 * reinforced the frame, and what SET it was Task 9's own brief, which said *"either the authoring
 * file declares them or `bomFields` refuses - do not default them to empty strings and do not
 * widen the exemption list silently"*. That is a binary with both relaxations forbidden by name,
 * so an obedient implementer could not reach *"the gate is in the wrong place"* without stepping
 * outside its instructions. `unsourced` is unchanged and is NOT optional: it is a statement about
 * sourcing readiness, which is what it always actually was.
 */
export type BomSource =
  | { readonly kind: "declared"; readonly fields: Readonly<Record<string, BomFields>> }
  | { readonly kind: "unsourced"; readonly why: string }

/**
 * The `PartSpec` fields the circuit model has no slot for, declared once per circuit.
 *
 * **NOT IN TASK 9's BRIEF; A DEVIATION, RECORDED IN G149.** `PartSpec.source` is required
 * non-blank by `ir/validate.ts`'s `partShapes` (*"name the design-note section or datasheet the
 * part comes from"*) and `Component.provenance` is set on **0 of 102** components across the four
 * parity circuits, so there is nothing to derive it from. Each circuit's module comment names its
 * own authority in prose; this is that sentence in a field.
 */
export interface DeclaredFields {
  /** `PartSpec.source` for every part of this circuit. Never blank. */
  readonly source: string
  readonly bom: BomSource
}

export interface SchematicAuthoring {
  readonly project: string
  /** Component id -> KiCad reference designator, which becomes the part's `label`. */
  readonly designators: Readonly<Record<string, string>>
  readonly blocks: readonly BlockDeclaration[]
  readonly sheets: readonly SheetSpec[]
  readonly rails: readonly RailSpec[]
  /** Net -> direction. Declared for every net the `Network` declares as a port. */
  readonly portDirections: Readonly<Record<string, PortDirection>>
  /** Per component id, where the model's symbol or pin sides are not derivable by rule. */
  readonly overrides: Readonly<Record<string, ComponentOverride>>
  /** See `DeclaredFields`. Not in the brief; deviation recorded in G149. */
  readonly declared: DeclaredFields
}

/** Every net any pin of the network is on. */
export function netsOf(network: Network): ReadonlySet<NetName> {
  const nets = new Set<NetName>()
  for (const component of network.components) {
    for (const connection of Object.values(component.pins)) {
      if (connection.kind === "net") nets.add(connection.net)
    }
    for (const unit of component.units) {
      for (const connection of Object.values(unit.pins)) {
        if (connection.kind === "net") nets.add(connection.net)
      }
    }
  }
  return nets
}

/** Net -> the component ids with a pin on it, in network order. */
export function netMembers(network: Network): ReadonlyMap<NetName, readonly string[]> {
  const out = new Map<NetName, string[]>()
  const touch = (net: NetName, id: string): void => {
    const ids = out.get(net) ?? []
    if (!ids.includes(id)) ids.push(id)
    out.set(net, ids)
  }
  for (const component of network.components) {
    for (const connection of Object.values(component.pins)) {
      if (connection.kind === "net") touch(connection.net, component.id)
    }
    for (const unit of component.units) {
      for (const connection of Object.values(unit.pins)) {
        if (connection.kind === "net") touch(connection.net, component.id)
      }
    }
  }
  return out
}

const BLANK = (s: string): boolean => s.trim() === ""

/**
 * Everything wrong with an authoring declaration read on its own, one line each, in a fixed
 * order. Empty means the declaration is well formed - it says nothing about whether it AGREES
 * with a circuit, which is `./authoring-checks.ts`'s job.
 */
export function authoringProblems(authoring: SchematicAuthoring, network: Network): string[] {
  const out: string[] = []
  if (BLANK(authoring.project)) out.push("project name is blank")
  if (BLANK(authoring.declared.source)) {
    out.push("declared.source is blank; name the document that is the authority for this circuit")
  }
  const bom = authoring.declared.bom
  if (bom.kind === "unsourced" && BLANK(bom.why)) {
    out.push('declared.bom is "unsourced" with a blank why; an unsourced circuit states its reason')
  }
  const sheetIds = new Set(authoring.sheets.map((s) => s.id))
  for (const block of authoring.blocks) {
    if (!sheetIds.has(block.sheet)) out.push(`block ${block.id}: sheet "${block.sheet}" is not declared`)
    if (BLANK(block.title)) out.push(`block ${block.id}: title is blank`)
    // ONE PLACE HOLDS THE ANCHOR. `Rendering`'s `wired` variant carries an `anchor` field of its
    // own and `BlockDeclaration` carries one beside it, so a declaration that filled both would
    // have two answers to one question and a reader would get whichever they consulted first.
    // `BlockDeclaration.anchor` is the one; `circuitSpecFrom` composes it into the rendering.
    if (block.rendering.kind === "wired" && block.rendering.anchor !== null) {
      out.push(
        `block ${block.id}: the template anchor is declared on BlockDeclaration.anchor, not ` +
          "inside rendering. Set rendering.anchor to null.",
      )
    }
    if (block.rendering.kind !== "wired" && block.anchor !== null) {
      out.push(
        `block ${block.id}: rendering is "${block.rendering.kind}" and an anchor is declared. ` +
          'Only a "wired" template reads one - decision D3 gives "auto" no payload at all, and ' +
          "docs/known-gaps.md G141 records that the four anchor-driven templates can therefore " +
          "never apply to it.",
      )
    }
    if (block.prefixes.prefixes.length > 1 && (block.prefixes.why === null || BLANK(block.prefixes.why))) {
      out.push(
        `block ${block.id}: holds members from ${block.prefixes.prefixes.length} include() ` +
          `prefixes (${block.prefixes.prefixes.join(", ")}) and gives no reason; decision D1 ` +
          "requires the authoring file to say why",
      )
    }
    const seen = new Set<NetName>()
    for (const port of block.interface) {
      if (seen.has(port.net)) out.push(`block ${block.id}: interface port ${port.net} is declared twice`)
      seen.add(port.net)
      if (port.sides.length === 0) {
        out.push(
          `block ${block.id}: interface port ${port.net} declares no acceptable side. An empty ` +
            'list is a refusal, not "any side": name the sides seam B may attach it from',
        )
      }
      for (const side of port.sides) {
        if (!isPinSide(side)) out.push(`block ${block.id}: interface port ${port.net} declares side "${side}"`)
      }
      if (BLANK(port.why)) {
        out.push(
          `block ${block.id}: interface port ${port.net} (${port.position}) has a blank why; a ` +
            "fixed position is a claim about the block's own geometry and a negotiable one says " +
            "what seam B is free to do",
        )
      }
    }
  }
  for (const [id, override] of Object.entries(authoring.overrides)) {
    if (BLANK(override.why)) out.push(`override for ${id}: blank why; an override is a claim and carries its reason`)
    if (override.symbol === undefined && override.symbolPins === undefined && override.pinSides === undefined) {
      out.push(`override for ${id}: overrides nothing (no symbol, symbolPins or pinSides)`)
    }
    if (!network.components.some((c) => c.id === id)) {
      out.push(`override for ${id}: no component of this network has that id`)
    }
  }
  const nets = netsOf(network)
  for (const [net, direction] of Object.entries(authoring.portDirections)) {
    if (!nets.has(net)) out.push(`portDirections names net "${net}", which no pin of this network is on`)
    if (!PORT_DIRECTIONS.some((d) => d === direction)) {
      out.push(`portDirections["${net}"] is "${direction}", not one of ${PORT_DIRECTIONS.join(", ")}`)
    }
  }
  for (const [port, net] of Object.entries(network.ports)) {
    if (authoring.portDirections[net] === undefined) {
      out.push(
        `net ${net} is declared port "${port}" of this network and has no portDirections entry. ` +
          "G99 measured what an invented direction costs: every boundary net got an inbound " +
          "arrow and half of them pointed the wrong way",
      )
    }
  }
  for (const rail of authoring.rails) {
    if (!nets.has(rail.net)) out.push(`rail ${rail.net}: no pin of this network is on it`)
    if (rail.kind !== "ground" && rail.kind !== "supply") out.push(`rail ${rail.net}: kind "${rail.kind}" is neither ground nor supply`)
  }
  for (const sheet of authoring.sheets) {
    if (!authoring.blocks.some((b) => b.sheet === sheet.id)) out.push(`sheet ${sheet.id} has no blocks`)
  }
  const designated = new Set<string>()
  for (const component of network.components) {
    const designator = authoring.designators[component.id]
    if (designator === undefined) {
      out.push(`component ${component.id} has no designator; a part's KiCad label is declared, never derived from the semantic id`)
      continue
    }
    if (designated.has(designator)) out.push(`designator ${designator} is declared for two components`)
    designated.add(designator)
  }
  for (const [id, designator] of Object.entries(authoring.designators)) {
    if (!network.components.some((c) => c.id === id)) {
      out.push(`designators names component "${id}", which this network does not have`)
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(designator)) {
      out.push(`designator "${designator}" for ${id} is not UPPER_SNAKE (^[A-Z][A-Z0-9_]*$)`)
    }
  }
  return out
}

/** `authoringProblems`, as a refusal. */
export function assertAuthoring(authoring: SchematicAuthoring, network: Network): void {
  const problems = authoringProblems(authoring, network)
  if (problems.length === 0) return
  throw new Error(
    `the schematic authoring declaration for "${authoring.project}" has ` +
      `${problems.length} problem(s):\n  ${problems.join("\n  ")}`,
  )
}

/** Exported for the net-name measurement G150 records; `NET_NAME` is the IR's own rule. */
export function netsNotUpperSnake(network: Network): readonly NetName[] {
  return [...netsOf(network)].filter((n) => !NET_NAME.test(n)).sort()
}

/**
 * TASK 9's DECLARATION OF SPEC §1.9's OPEN QUESTION - *"which sides are acceptable for which kind
 * of port"* - written once so the four authoring files say the same thing and a reviewer reads it
 * once.
 *
 * **THIS IS NOT A GENERATOR RULE AND MUST NOT BECOME ONE.** §1.9 makes a block's interface a
 * DECLARATION, and plan decision **D9** puts that declaration in the authoring file; a function
 * the generator applied to every block would be the inference §1.9 forbids. What this is, is a
 * sentence the four authoring files declare by CALLING it, with its own reason attached to every
 * port it produces. Any file is free to write an `InterfacePort` literally instead, and a port
 * with something particular to say should.
 *
 * **THE SENTENCE, AND WHERE ITS TWO HALVES COME FROM** - both are already in the tree, neither is
 * this writer's taste:
 *
 * - a rail attaches where `RailSpec` in `./ir/types.ts` says its glyph goes: *"Ground rails are
 *   drawn at the bottom of blocks with downward symbols; supplies at the top"*;
 * - everything else attaches on the left or the right, because plan decision **D4** pins flow
 *   left-to-right (*"`elk.direction = "RIGHT"` and sheet-level flow is left-to-right"*): an `in`
 *   port arrives on the left, an `out` port leaves on the right, and a `bidirectional` port or a
 *   crossing net with no declared direction may be either.
 *
 * **EVERY PORT IT PRODUCES IS `negotiable`, and that is a fact about these four circuits rather
 * than a shortcut.** `position: "fixed"` means *"fixed by the block's own internal geometry"*, and
 * none of the four circuits declares a template on any block - every block is `{ kind: "auto" }` -
 * so no block has internal geometry yet for a position to be fixed by. A block that declares a
 * reviewed template will have one, and its ports can then be declared fixed with the geometry as
 * the reason. The measurement is recorded in `docs/known-gaps.md` **G153**.
 */
export interface InterfaceContext {
  readonly portDirections: Readonly<Record<string, PortDirection>>
  readonly rails: readonly RailSpec[]
}

export function negotiablePort(net: NetName, context: InterfaceContext): InterfacePort {
  const rail = context.rails.find((r) => r.net === net)
  if (rail !== undefined) {
    return {
      net,
      sides: [rail.kind === "ground" ? "bottom" : "top"],
      position: "negotiable",
      why:
        `${net} is a declared ${rail.kind} rail, and RailSpec in lib/schgen/ir/types.ts states ` +
        "where a rail's glyph goes: grounds at the bottom of a block, supplies at the top. The " +
        "position within that edge is seam B's, because this block declares no template and so " +
        "has no internal geometry to fix it.",
    }
  }
  const direction = context.portDirections[net]
  const sides: readonly PinSide[] =
    direction === "in" ? ["left"] : direction === "out" ? ["right"] : ["left", "right"]
  const because =
    direction === undefined
      ? "it is a net that leaves the block without being a declared port of the network, so " +
        "nothing states a direction for it (docs/known-gaps.md G99's fifth invention, still " +
        "open at this scale) and either horizontal edge is acceptable"
      : `it is declared "${direction}"`
  return {
    net,
    sides,
    position: "negotiable",
    why:
      `${net} crosses this block's boundary and ${because}; decision D4 pins flow left-to-right, ` +
      "so an inbound net arrives on the left and an outbound one leaves on the right. The " +
      "position within that edge is seam B's, because this block declares no template and so " +
      "has no internal geometry to fix it.",
  }
}
