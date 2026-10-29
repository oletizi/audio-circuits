/**
 * THE ONE SCHEMATIC AUTHORING DECLARATION THE FIVE PULTEC SECTION BOARDS SHARE, because the five
 * boards are ONE module asked five questions.
 *
 * **WHY THIS IS A SHARED ASSEMBLER AND NOT FIVE FILES, STATED FIRST BECAUSE `docs/known-gaps.md`
 * G247 WARNS AGAINST EXACTLY THE OPPOSITE MISTAKE.** G247 measured that the four undeclared
 * transistor-preamp boards *"each need[] its own answer to 'what declares this board's blocks',
 * which is Task 9's work and is a decision per board rather than a copy"* - four different
 * leg-constant shapes and one board with none. **The Pultec five are the other case, and the
 * difference is checkable rather than asserted:** `circuits/pultec/physical/hi-boost.ts`,
 * `hi-cut.ts`, `low-boost.ts`, `low-cut.ts` and `mid.ts` are each `sectionBoard("<section>")` and
 * nothing else - one call, the same call, into `../physical/board.ts`. Five copies of this
 * assembler would be five copies of one derivation, and `CLAUDE.md`'s *"supersede means delete"*
 * and the repository's standing objection to a second source of truth both point the other way.
 * The five sibling modules beside this one are each four lines and name their own sheet.
 *
 * **THE BLOCKS COME FROM THE TWO PARTITION SOURCES PLAN DECISION D1 ALREADY NAMES, AND FROM
 * NOTHING CHOSEN HERE.** D1's list is *"from `include()`, `OWNERSHIP`/`partitionReference()`,
 * `LEGS` and `allStandIns()` and from nothing an agent chose"*, and a Pultec section board is
 * built out of two of the four:
 *
 * | block | what declares it |
 * | --- | --- |
 * | the section's own circuit | `partitionReference().modules[owner]`, reached through `ownComponents` - D1's `OWNERSHIP`/`partitionReference()` arm |
 * | one per absent section's stand-in group | `allStandIns()`, reached through `standInGroup` and `groupsOn` - D1's `allStandIns()` arm |
 * | the junction bus | `junctionComponents()`, which is the pair of 1x05 headers `../physical/parts.ts` declares |
 *
 * So a board gains a block when a group moves onto it, and no edit here is needed: `groupsOn` is
 * `suppliers()` run again on every call, which `../physical/board.ts` insists on *"never
 * remembered: remembering it is exactly the mistake that would put two copies of a group on one
 * bus."*
 *
 * **THE INTERFACE PER BLOCK IS `portsOn` APPLIED AT A FINER GRAIN, WHICH IS A DECLARATION AND NOT
 * AN INFERENCE.** Spec 1.9 says an interface port is *"never inferred from which nets happen to
 * leave"*. The candidate set here is DECLARED - `JUNCTION_NETS` is the five nets the junction puts
 * on every board, *"fixed and identical on every board"* - and `portsOn` is this repository's own
 * rule for which of them a set of components crosses the boundary on. Calling it with a block's
 * members instead of a board's components reads the same declaration one level down. What is NOT
 * done is reading `crossingNets` and transcribing its answer: that is the inference 1.9 forbids
 * wearing a literal's clothes.
 *
 * **WHAT THIS FILE DECLARES THAT THE MODEL CANNOT HOLD, each with its reason on the declaration:**
 * KiCad designators (`pultecDesignator`), the selectors' pin maps and their unused detents
 * (`switchOverride`, `THROW_PINS`), the ground rail and the five port directions.
 */

import { negotiablePort } from "../../../lib/schgen/authoring.ts"
import { GROUND_NET } from "../../../lib/board/scaffold/index.ts"
import { asModuleOwner, groupsOn, sectionBoard, standInGroup } from "../physical/board.ts"
import { JUNCTION_NETS, junctionComponents, ownComponents, portsOn, rotaryPadOrder } from "../physical/parts.ts"
import type { BlockDeclaration, ComponentOverride, PortDirection, SchematicAuthoring } from "../../../lib/schgen/authoring.ts"
import type { Component, Network } from "../../../lib/model/types.ts"
import type { RailSpec, SheetSpec } from "../../../lib/schgen/ir/types.ts"

/**
 * The ground rail. `GROUND_NET` is `"0"` - read from `lib/board/scaffold/flat.ts` rather than
 * typed, because the stand-in reduction and the junction's ground row both already use it.
 *
 * `pwrFlag` is null for the reason `circuits/opamp-buffer.schematic.ts` gives: a PWR_FLAG is an
 * ERC construct and nothing on this path runs ERC.
 */
const RAILS: readonly RailSpec[] = [
  { net: GROUND_NET, symbol: "power:GND", kind: "ground", pwrFlag: null },
]

/**
 * Per net, which way it crosses a section board's edge - G99's fifth invention, declared.
 *
 * **`in`, `out` AND `0` COME FROM THE REFERENCE NETWORK'S OWN PORTS**, which
 * `circuits/pultec/electrical/three-band.ts` declares as
 * `{ input: "in", output: "out", ground: "0" }`. Nothing here chooses them.
 *
 * **`hi_boost_out` AND `lo_boost_in` ARE `bidirectional`, AND THAT IS THE HONEST READING RATHER
 * THAN A SHRUG.** They are INTERNAL nodes of the three-band reference - it declares no port for
 * either - that the board split turned into crossing nets, so no document states a direction for
 * them. Worse for an arrow: which board drives one depends on which boards are on the bench, and
 * `lib/board/scaffold/supplier.ts` is a whole module about that assignment being a fact of the
 * build rather than of the circuit. `bidirectional` is the arrow that asserts nothing.
 *
 * `0` is `bidirectional` for the reason `circuits/opamp-buffer.schematic.ts` gives: it is the
 * return for the signal, so it is neither a source nor a sink at this boundary.
 */
const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  in: "in",
  hi_boost_out: "bidirectional",
  lo_boost_in: "bidirectional",
  out: "out",
  [GROUND_NET]: "bidirectional",
}

const CONTEXT = { portDirections: PORT_DIRECTIONS, rails: RAILS }

/** The KiCad designator for the two junction rows, which have no designator-shaped id. */
const JUNCTION_DESIGNATORS: Readonly<Record<string, string>> = {
  junction_signals: "J_SIGNALS",
  junction_grounds: "J_GROUNDS",
}

const DESIGNATOR = /^[A-Z][A-Z0-9_]*$/

/**
 * A component's KiCad designator: its own id, upper-cased, with `.` and `-` turned into `_`.
 *
 * **THIS IS A MAPPING AND IT IS NOT A NO-OP, WHICH IS THE POINT OF HAVING IT HERE RATHER THAN
 * REUSING THE BOARD'S OWN MAP.** `designatorsFor` in `../physical/parts.ts` maps every id to
 * ITSELF, annotated *"the reference ids are netlist-derived and already designator-shaped"*. That
 * is true of `C14` and `R3` and false of three kinds of id the boards actually carry, each of
 * which the IR's `partShapes` rule refuses as a label (`^[A-Z][A-Z0-9_]*$`):
 *
 * - the Pultec schematic's own lower-cased suffixes - `C2a2`, `C4a2`, `C5a2` on hi-boost, and
 *   every `C_MID_*Hz_*` on mid;
 * - the stand-in reduction's generated ids for a pot split into two resistors -
 *   `SI_HI_CUT_RV_HI_CUT.ccw-wiper`, which carries both a `.` and a `-`;
 * - the two junction rows, `junction_signals` and `junction_grounds`, which are handled by
 *   `JUNCTION_DESIGNATORS` above because upper-casing them would produce a label with no
 *   reference prefix a reader would recognise.
 *
 * **THE COST IS REAL AND IS RECORDED RATHER THAN HIDDEN.** For the Pultec the SCHEMATIC is
 * authoritative and the model is derived from a netlist export (`CLAUDE.md`, *"Authority runs in
 * both directions"*), so a generated drawing labelled `C2A2` disagrees with the authoritative
 * drawing's `C2a2` by one character. `docs/known-gaps.md` carries the measurement and the list.
 * Nothing in the circuit is edited to avoid it: an id is semantic and a designator is declared.
 */
export function pultecDesignator(id: string): string {
  const declared = JUNCTION_DESIGNATORS[id]
  if (declared !== undefined) return declared
  const designator = id.toUpperCase().replace(/[.-]/g, "_")
  if (!DESIGNATOR.test(designator)) {
    throw new Error(
      `the Pultec component id "${id}" does not become a KiCad designator by upper-casing and ` +
        `replacing "." and "-" with "_": the result "${designator}" is not ` +
        `${DESIGNATOR.source}, which the IR's partShapes rule requires of every part label. ` +
        "Add an explicit entry to JUNCTION_DESIGNATORS in " +
        "circuits/pultec/schematic/section-board.ts, beside the two junction rows, rather than " +
        "widening this transformation - a wider transformation would silently rename a part the " +
        "authoritative Pultec schematic names, which is the one thing a designator map must not " +
        "do quietly.",
    )
  }
  return designator
}

/** Every component's designator, derived from its own id. */
function designatorsFor(network: Network): Readonly<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const component of network.components) out[component.id] = pultecDesignator(component.id)
  return out
}

/**
 * Where the pole of a single-pole selector sits on its symbol, by the symbol the model declares.
 *
 * **READ OFF THE INSTALLED LIBRARY, NOT REMEMBERED** (`CLAUDE.md`: *"verify names against the
 * thing itself"*). In both rotary symbols the THROWS are pins `1..n` on the right at angle 180
 * and the POLE is the last pin, on the left at angle 0 - which is the opposite of what "pin 1 is
 * the common" would have you write. Confirm with:
 *
 *   awk '/\(symbol "SW_Rotary_1x6_MP"/,/\(symbol "SW_Rotary_1x7_MP"/' \
 *     "/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/Switch.kicad_sym" \
 *     | grep -E '\(at [-0-9.]+ [-0-9.]+ (0|180)\)|\(number "'
 *
 * `SW_Rotary_1x6_MP` also carries a mounting pin `MP`, which is a mechanical pad and is on no net
 * in the model; `SW_Rotary_1x12` has no `_MP` variant in the library at all, which is why
 * `../physical/parts.ts` keeps eleven throws out of its by-position table and serves them from a
 * separate clause.
 */
export const POLE_PIN: Readonly<Record<string, string>> = {
  "Switch:SW_Rotary_1x6_MP": "7",
  "Switch:SW_Rotary_1x12": "13",
}

/**
 * Each selector symbol's THROW pins, in detent order, read off the installed `Switch.kicad_sym`
 * the same way `POLE_PIN` above was.
 *
 * **IT REPLACES AN ASSUMPTION WITH A DATUM, and the assumption was already written down as a
 * comment.** `switchOverride` used to number the throws `String(index + 1)`, which is correct for
 * both of these symbols and is a rule nothing checked. The list is now the one statement of that
 * fact, it drives the pin map, and `tests/schgen/nc-pins.test.ts` asserts every entry against the
 * installed library - that each pin exists, that it is on the throw side at the throw angle, and
 * that **`THROW_PINS` plus `POLE_PIN` plus `MECHANICAL_PINS` is EXACTLY the symbol's pin set.**
 * That last assertion is what makes the unused-detent declaration below specific: a pin a future
 * KiCad adds to one of these symbols fails the test rather than quietly becoming an unaccounted
 * pin that stops a board drawing, or - worse - one a blanket silently excused.
 *
 * **AND IT IS WHAT LETS A SELECTOR BE DRAWN WITH A SYMBOL CARRYING MORE THROWS THAN THE CIRCUIT
 * WIRES.** `SW_MID` has eleven positions and `Switch:SW_Rotary_1x12` draws twelve, because the
 * owner's part choice is a twelve-position switch with its stop set to eleven - *"Assume a
 * 1x12"*, recorded on `ELEVEN_THROW_SYMBOL` in `../physical/parts.ts`. The detents past the
 * circuit's last position are then DECLARED no-connect by number, through
 * `ComponentOverride.ncPins`; nothing is exempted and nothing is inferred from the count.
 */
export const THROW_PINS: Readonly<Record<string, readonly string[]>> = {
  "Switch:SW_Rotary_1x6_MP": ["1", "2", "3", "4", "5", "6"],
  "Switch:SW_Rotary_1x12": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
}

/**
 * Why one detent of a selector's symbol carries no connection - the per-pin reason
 * `ComponentOverride.ncPins` requires, composed so it names the part decision rather than
 * restating the rule.
 */
function unusedDetentReason(symbol: string, pin: string, wired: number, total: number): string {
  return (
    `pin ${pin} is a detent of ${symbol}, which draws ${total} throws, and this selector has ` +
    `${wired} positions - so detents ${wired + 1}..${total} exist on the switch and no conductor ` +
    "in the circuit reaches them. rotarySymbolFor in circuits/pultec/physical/parts.ts records " +
    "why a selector may be drawn with a symbol carrying more throws than the circuit wires: for " +
    "the eleven-position mid selector it is the owner's part choice, a 1x12 with its stop set to " +
    'eleven ("Assume a 1x12", on ELEVEN_THROW_SYMBOL there). It is declared by NUMBER rather ' +
    "than exempted, because a blanket no-connect would also excuse a throw a later edit dropped " +
    "from the pin map and any pin a future KiCad adds to this symbol."
  )
}

/**
 * The SPDT mid-mode switch's pins. `Switch:SW_SPDT` names them A, B, C at numbers 1, 2, 3, and
 * **B at angle 0 on the left is the pole** while A and C are the two throws on the right.
 *
 * **WHICH THROW IS "boost" AND WHICH IS "cut" IS THE MODEL'S DECLARATION ORDER AND NOTHING
 * STRONGER, and saying so is the honest form of this entry.** `SW_MID_MODE`'s unit declares its
 * pins `common`, `boost`, `cut` in that order; the model carries no mechanical detent, and the
 * switch is a physical part whose two positions nobody has measured against a panel. So `boost`
 * takes A and `cut` takes C because that is the order the component is written in. An
 * observation, not a measurement, is recorded in `docs/known-gaps.md`.
 */
const SPDT_PINS: Readonly<Record<string, string>> = { common: "2", boost: "1", cut: "3" }

/**
 * The `symbolPins` override one selector needs, or null when it needs none.
 *
 * `kind: "switch"` has an OPEN pin vocabulary (`CLAUDE.md`), so `canonicalPinNumbers` tries the
 * model's own pin names as pin numbers and then refuses - correctly: `common` and `t_3kHz` are
 * not pin numbers of anything. The map is therefore declared, and it is DERIVED from
 * `rotaryPadOrder`, which `../physical/parts.ts` already declares as *"the common first, then the
 * throws in detent order"* and derives from the component's own pins so it cannot disagree with
 * the frequency tables the selector was built from.
 *
 * **IT ALSO DECLARES THE DETENTS THE CIRCUIT DOES NOT REACH**, through `ComponentOverride.ncPins`
 * - for `SW_MID`, pin 12 of `Switch:SW_Rotary_1x12`, because the mid selector has eleven
 * positions and the owner's part is a 1x12 with its stop set to eleven. See `THROW_PINS` for why
 * that is a property of the symbol chosen to draw the part, and the field's own comment in
 * `lib/schgen/authoring.ts` for why it is neither a mechanical-pin exemption nor a blanket.
 */
function switchOverride(component: Component): ComponentOverride | null {
  if (component.kind !== "switch") return null
  const symbol = component.part?.symbol
  if (symbol === undefined) {
    throw new Error(
      `the selector "${component.id}" declares no part.symbol, so there is no symbol to map its ` +
        "pins onto. Every off-board Pultec part gets one from symbolFor in " +
        "circuits/pultec/physical/parts.ts; a switch that reaches here without one means that " +
        "function stopped being applied, not that a symbol should be chosen here.",
    )
  }
  if (symbol === "Switch:SW_SPDT") {
    return {
      symbolPins: { MAIN: SPDT_PINS },
      why:
        "a three-pin mode toggle. Switch:SW_SPDT puts its pole (pin 2, named B) on the left and " +
        "its two throws on the right as pins 1 and 3; the model names the pins common, boost " +
        "and cut, which is not a pin numbering, so canonicalPinNumbers refuses. See SPDT_PINS " +
        "for what rides on the boost/cut assignment and what does not.",
    }
  }
  const pole = POLE_PIN[symbol]
  if (pole === undefined) {
    throw new Error(
      `no pole pin is recorded for the selector symbol "${symbol}" (component ` +
        `"${component.id}"). POLE_PIN in circuits/pultec/schematic/section-board.ts holds the ` +
        "two rotary symbols this circuit uses, each read off the installed Switch.kicad_sym. " +
        "Add this symbol with its pole pin read off the library the same way - do not assume " +
        "pin 1, which is a THROW in both symbols already recorded.",
    )
  }
  const detents = THROW_PINS[symbol]
  if (detents === undefined) {
    throw new Error(
      `no throw pins are recorded for the selector symbol "${symbol}" (component ` +
        `"${component.id}"). THROW_PINS in circuits/pultec/schematic/section-board.ts holds each ` +
        "rotary symbol's throw pins in detent order, read off the installed Switch.kicad_sym " +
        "beside POLE_PIN. Add this symbol the same way - do not assume the throws are pins 1..n, " +
        "which is true of the two symbols recorded there and is a fact about them rather than a " +
        "KiCad convention.",
    )
  }
  // `rotaryPadOrder` puts `common` first and refuses a rotary that has no `common` pin at all,
  // so the throws are the rest IN detent order and take the symbol's throw pins in that order.
  const [first, ...throws] = rotaryPadOrder(component)
  if (first !== "common") {
    throw new Error(
      `rotaryPadOrder("${component.id}") returned "${String(first)}" first, not "common", so ` +
        "the throws cannot be numbered 1..n from it. That function's contract is \"the common " +
        "first, then the throws in detent order\"; fix it in " +
        "circuits/pultec/physical/parts.ts rather than guessing here, because a throw numbered " +
        "one position out is a wrong connection in a drawing that looks right.",
    )
  }
  if (throws.length > detents.length) {
    throw new Error(
      `the selector "${component.id}" has ${throws.length} throws and ${symbol} draws only ` +
        `${detents.length} (THROW_PINS in circuits/pultec/schematic/section-board.ts), so there ` +
        "is no pin for every position. rotarySymbolFor in circuits/pultec/physical/parts.ts is " +
        "what chose this symbol: either the selector gained a position without its symbol being " +
        "re-chosen, or THROW_PINS is stale against the installed library. Fix one of those - a " +
        "throw silently dropped is a position of the switch that does nothing in a drawing that " +
        "looks complete.",
    )
  }
  const pins: Record<string, string> = { common: pole }
  throws.forEach((pad, index) => {
    const detent = detents[index]
    if (detent === undefined) throw new Error(`throw ${index} of "${component.id}" has no detent pin, which the length check above should have refused`)
    pins[pad] = detent
  })
  // THE DETENTS PAST THIS SELECTOR'S LAST POSITION, DECLARED BY NUMBER. Empty for every symbol
  // whose throw count equals the circuit's - the six-position selectors declare nothing here, and
  // an empty record is left off rather than carried, because a declaration with nothing in it is
  // not a claim anybody can check.
  const unused = detents.slice(throws.length)
  const ncPins = Object.fromEntries(unused.map((pin) => [pin, unusedDetentReason(symbol, pin, throws.length, detents.length)]))
  return {
    symbolPins: { MAIN: pins },
    ...(unused.length === 0 ? {} : { ncPins }),
    why:
      `a single-pole rotary selector drawn with ${symbol}. Its throws are that symbol's pins ` +
      `${detents[0] ?? "?"}..${detents[detents.length - 1] ?? "?"} on the right and its pole is ` +
      `pin ${pole} on the left, both read off the installed Switch.kicad_sym (see THROW_PINS and ` +
      "POLE_PIN); the detent order is rotaryPadOrder's, which " +
      "circuits/pultec/physical/parts.ts derives from the component's own pins. kind " +
      '"switch" has an open pin vocabulary, so no reviewed rule can map these names.' +
      (unused.length === 0
        ? ""
        : ` The symbol's last ${unused.length} detent(s) (${unused.join(", ")}) are declared ` +
          "no-connect by number through ncPins: the switch has them and this circuit wires " +
          `${throws.length} positions.`),
  }
}

/** Every override a section board needs: the selectors' pin maps, and nothing else. */
function overridesFor(network: Network): SchematicAuthoring["overrides"] {
  const out: Record<string, ComponentOverride> = {}
  for (const component of network.components) {
    const override = switchOverride(component)
    if (override !== null) out[component.id] = override
  }
  return out
}

/** A block's interface: the junction nets its own members touch, per `portsOn`. */
function interfaceOf(members: readonly Component[]): BlockDeclaration["interface"] {
  return Object.keys(portsOn(members)).map((net) => negotiablePort(net, CONTEXT))
}

/**
 * Which net each section's DRAWING reads from. See `BlockSpec.readsFrom`: a statement about the
 * picture, never about the circuit, and `docs/known-gaps.md` **G294** for why it is not
 * `portDirections`.
 *
 * `LADDER_ORDER` (`lib/board/scaffold/supplier.ts`) is *"the sections in their position along the
 * ladder ... the one order this circuit's own documentation states"*: hi-boost, hi-cut, low-cut,
 * low-boost, mid. So each section reads from the net the section before it leaves on.
 *
 * **`mid` IS DELIBERATELY ABSENT.** `electrical/mid.ts` says it *"hangs off `hi_boost_out` as a
 * variable-depth shunt rather than sitting in series with the signal"*, so it has no upstream side
 * to read from and this file will not invent one.
 */
const READS_FROM: Readonly<Record<string, string>> = {
  "hi-boost": "in",
  "hi-cut": "hi_boost_out",
  "low-cut": "hi_boost_out",
  "low-boost": "lo_boost_in",
}

function block(
  id: string,
  sheet: string,
  title: string,
  members: readonly Component[],
  readsFrom: string | null = null,
): BlockDeclaration {
  return {
    id,
    sheet,
    title,
    members: members.map((c) => c.id),
    rendering: { kind: "auto" },
    // See `BlockSpec.readsFrom`: a statement about the PICTURE, not about the circuit. Left null
    // for every block whose reading side nobody has established - `docs/known-gaps.md` **G294**
    // and `tests/schgen/direction-seed.test.ts`, which counts them rather than defaulting.
    readsFrom,
    anchor: null,
    interface: interfaceOf(members),
    // Uncomposed: a Pultec section board uses no `include()`. The stand-in groups carry an id
    // PREFIX (`SI_HI_CUT_`) and that is NOT an include() prefix - `standInIdPrefix` in
    // ../physical/board.ts states its two jobs, neither of which is composition - so declaring
    // it here would claim a composition boundary the model does not have.
    prefixes: { prefixes: [], why: null },
  }
}

/**
 * One section board's authoring declaration, assembled from the board's own partition sources.
 *
 * `sheetFile` is relative to the GENERATOR's output directory, and nothing here writes into
 * `circuits/pultec/`: the authored `pultec-three-band-eq.kicad_sch` and `pultec-mid-band.kicad_sch`
 * are a different artifact that spec 2's derivation chain marks *"AUTHORED - never regenerated,
 * never overwritten"*.
 */
export function sectionAuthoring(section: string): SchematicAuthoring {
  const owner = asModuleOwner(section)
  const boardOf = sectionBoard(owner)
  const sheet = owner
  const sheets: readonly SheetSpec[] = [
    {
      id: sheet,
      title: `Pultec ${owner} section board`,
      file: `${owner}.kicad_sch`,
      // A3 rather than A4 because mid carries 39 components and the five boards share this
      // assembler; a per-board paper size would be a size chosen here for a drawing nobody has
      // looked at yet.
      paper: "A3",
      notes: [],
    },
  ]
  const blocks: BlockDeclaration[] = [
    // `readsFrom` for the hi-boost section ONLY, and the evidence is three things that agree:
    // `LADDER_ORDER` in lib/board/scaffold/supplier.ts puts "hi-boost" first - "the sections in
    // their position along the ladder ... the one order this circuit's own documentation states";
    // `circuits/pultec/electrical/three-band.ts` declares the reference network's port
    // `{ input: "in" }`; and the generated sheet shows `in` arriving at this block. The other four
    // sections are deliberately LEFT NULL: the ladder's five sections do not map one-to-one onto
    // the four signal nets, and `mid` is not in series at all - electrical/mid.ts says it "hangs
    // off `hi_boost_out` as a variable-depth shunt" - so which net each of them reads from is a
    // fact about this circuit that nobody has stated and this file will not invent.
    // `docs/known-gaps.md` **G294**.
    block(`pultec-${owner}-own`, sheet, `${owner} section`, ownComponents(owner), READS_FROM[owner] ?? null),
  ]
  for (const absent of groupsOn(owner, new Set([owner]))) {
    blocks.push(
      block(
        `pultec-${owner}-standin-${absent}`,
        sheet,
        `Stand-in group for the absent ${absent} section`,
        standInGroup(absent).components,
      ),
    )
  }
  blocks.push(block(`pultec-${owner}-junction`, sheet, "Junction bus", junctionComponents()))
  return {
    project: `pultec-${owner}`,
    designators: designatorsFor(boardOf.network),
    blocks,
    sheets,
    rails: RAILS,
    portDirections: PORT_DIRECTIONS,
    overrides: overridesFor(boardOf.network),
    declared: {
      source:
        "circuits/pultec/electrical/three-band.ts and circuits/pultec/electrical/mid.ts, which " +
        "assemble the sections from the machine-generated netlist in " +
        "source/three-band-eq.netlist.json (see electrical/from-netlist.ts) with values " +
        "corroborated against Ian Thompson-Bell's documentation in docs/pultec/values.md, and " +
        "off-board terminals from electrical/controls.ts. The stand-in parts are not in that " +
        "source at all: they are DERIVED by allStandIns() from the same reference at the " +
        "declared reference flat state, which circuits/pultec/physical/board.ts insists on - " +
        "\"values are derived, never transcribed\". docs/pultec/unresolved.md is the authority " +
        "for what the reference does NOT carry, including the hi boost resonant branch.",
      bom: {
        kind: "unsourced",
        why:
          "no boards/pultec-*/bom.json exists for any of the five section boards (two of the " +
          "eleven boards in this repository have one, and neither is a Pultec board). BomFields " +
          "wants Manufacturer, MPN, Supplier and SupplierPart; the model has a slot for mpn " +
          "alone and no Pultec component sets it, and the repository's supplier evidence lives " +
          "in parts/*.json keyed by orderable part and joined to a BOARD by a " +
          "\"<kind> <value> <footprint>\" line, with no reviewed rule joining either to a " +
          "circuit model's component. The four keys are empty BY DECLARATION rather than " +
          "invented; the IR's own bomFields rule, through validateSourcing, names every " +
          "non-exempt part for any consumer that has to source and place them, and it does not " +
          "gate a drawing (Task 20 and docs/known-gaps.md G245).",
      },
    },
  }
}
