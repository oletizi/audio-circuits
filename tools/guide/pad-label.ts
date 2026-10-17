/**
 * What a pad's wire IS, in the words the owner asked for: `LO BOOST wiper`,
 * `LO BOOST 60Hz`, `LO BOOST common`.
 *
 * **WHY THIS IS NOT THE PAD'S IDENTITY.** The guide used to print a pad's
 * `<ref>.<pin>` identity - `RV_LO_BOOST.1` - which names the terminal exactly
 * and tells a builder nothing. Shown that, the owner said *"I like the more
 * descriptive names"*, and `docs/known-gaps.md` G1 records that the choice was
 * his to make and not this module's. **So no label here ever falls back to the
 * ref.** Every refusal below says that in as many words, because a fallback
 * would reinstate precisely the spelling he rejected while every test still
 * passed.
 *
 * **TWO SOURCES, JOINED BY INDEX, AND THAT JOIN IS THE DANGEROUS PART.**
 *
 *   - `padOrderFor` (`circuits/pultec/physical/parts.ts`) states the terminal
 *     order for a kind, and `./pad-terminal.ts` turns a pin number into the
 *     terminal's name by indexing it. For a rotary that name is `common`
 *     followed by the component's own throw pins - `t1`...`t6` on the low
 *     selectors - which say WHICH throw and not WHAT it selects.
 *   - `SELECTORS` (`circuits/pultec/electrical/controls.ts`) states what each
 *     throw selects: `["20Hz", "30Hz", "60Hz", "100Hz", "150Hz", "200Hz"]` for
 *     `SW_LO_BOOST`, with its own provenance - *"P3bandDoc.pdf p4 Cboost
 *     column; LOSWB, the other pole of the low frequency selector"*. That is
 *     transcribed evidence, which is what this repository means by not
 *     guessing, and it is the ONLY authority for a frequency here.
 *
 * The *i*-th throw is the *i*-th position **only while the two lists agree in
 * count**, so `detentsOf` checks that and REFUSES on a disagreement rather than
 * matching as far as the shorter list goes. This is subtler than an off-by-one
 * in a pad order and much harder to catch by eye: `100Hz` printed against the
 * wrong detent looks perfectly reasonable on a build sheet, and a builder
 * solders it. The count check is the only thing standing between a
 * provenance-backed frequency table and a confidently wrong instruction.
 *
 * **HOW FAR THE COUNT CHECK REACHES, MEASURED RATHER THAN ASSUMED.** On the
 * three selectors `SELECTORS` names, the two lists it compares are not fully
 * independent: `buildSelectors` (`circuits/pultec/electrical/from-netlist.ts`)
 * generates the throw pins `t1`...`tN` from `selector.positions` in the same
 * loop that fills `contacts`, so a component built that way cannot disagree
 * with the entry it was built from, and the check cannot fire on the committed
 * model. **It is still load-bearing**, at the two places a disagreement is
 * reachable: a rotary whose throw pins come from somewhere else - `SW_HI_BOOST`
 * builds `t_3kHz`...`t_16kHz` from `HI_BOOST_POSITIONS`, a second source - and
 * any hand edit to a `positions` list or a component's pins. It is stated here
 * so nobody reads a green suite as evidence that the two sources were compared
 * on this board.
 *
 * **WHY THE CONTROL MODEL IS A PARAMETER AND NOT AN IMPORT HERE.** `padLabelOf`
 * takes the model it consults, so a caller states which model a label was read
 * out of and a test can drive a DISAGREEING one - the count check is otherwise
 * unprovable, since the committed `SELECTORS` agrees with the committed pad
 * orders and a guard nobody can make fire is a guard nobody knows works.
 * `PULTEC_CONTROLS` below is the committed model, built from `POTS` and
 * `SELECTORS` rather than restating either.
 *
 * **A GANG IS NEVER CONSULTED.** `SW_LO_BOOST` and `SW_LO_CUT` are two poles of
 * one shaft (`LO_FREQUENCY_GANG`) and each declares its own `positions`. Those
 * two happen to be identical, but NOTHING in the model requires it: the gang
 * check in `lib/model/control-state.ts` compares the SELECTED position of two
 * poles at simulation time, never the position LISTS they declare. So a label
 * is read off the selector's own entry, by its own ref, and never off its gang
 * partner's - see `docs/known-gaps.md` G39 for the missing guard.
 */
import type { Component } from "../../lib/model/types.ts"
import { padOrderFor } from "../../circuits/pultec/physical/parts.ts"
import {
  POTS,
  SELECTORS,
  type PotTerminal,
  type SelectorTerminals,
} from "../../circuits/pultec/electrical/controls.ts"
import { terminalNameOf } from "./pad-terminal.ts"

/**
 * The controls a label may be read out of: the panel pots and the rotary
 * selectors, each keyed by the ref the netlist calls it.
 *
 * It is the two lists and not a map, because `POTS` and `SELECTORS` are the
 * transcribed sources and re-keying them here would be a second shape to keep
 * in step with them.
 */
export interface ControlModel {
  readonly pots: readonly PotTerminal[]
  readonly selectors: readonly SelectorTerminals[]
}

/** The committed Pultec control model, from the transcribed sources themselves. */
export const PULTEC_CONTROLS: ControlModel = { pots: POTS, selectors: SELECTORS }

/**
 * Ref prefixes a function name can be read off, with the kind of control each
 * marks. A ref outside this list refuses: see `functionNameOf`.
 */
const FUNCTION_PREFIXES: readonly string[] = ["RV_", "SW_"]

/** The pad `rotaryPadOrder` puts first on every rotary: the pole, not a throw. */
const COMMON_TERMINAL = "common"

/**
 * Small counts in words, so a refusal reads as a sentence - *"six throws and
 * two positions"* rather than *"6 throws and 2 positions"*, which a reader
 * skimming a wall of numbers slides past. Beyond the table the digits are
 * printed: "thirteen" buys nothing once the number stops being small.
 */
const COUNT_WORDS: ReadonlyMap<number, string> = new Map([
  [0, "no"], [1, "one"], [2, "two"], [3, "three"], [4, "four"], [5, "five"],
  [6, "six"], [7, "seven"], [8, "eight"], [9, "nine"], [10, "ten"],
  [11, "eleven"], [12, "twelve"],
])

function inWords(count: number): string {
  const word = COUNT_WORDS.get(count)
  return word === undefined ? String(count) : word
}

/**
 * The control's function, read off its ref: the prefix dropped, underscores as
 * spaces, upper case. `RV_LO_BOOST` -> `LO BOOST`.
 *
 * A ref matching no prefix REFUSES rather than printing itself. An off-board
 * inductor (`L_HI_BOOST_100MH`) is the live case: it is not a panel control, it
 * has no function name of this shape, and `L_HI_BOOST_100MH.1` on a build sheet
 * is the spelling this module exists to stop printing.
 */
export function functionNameOf(ref: string): string {
  const prefix = FUNCTION_PREFIXES.find((candidate) => ref.startsWith(candidate))
  if (prefix === undefined || ref.length === prefix.length) {
    throw new Error(
      `pad-label-unprefixed-ref: "${ref}" does not begin with any prefix a function name can ` +
        `be read off - [${FUNCTION_PREFIXES.join(", ")}] - followed by a name, so this pad has ` +
        "no function to print. A label is the control's function: the ref with its prefix " +
        "dropped, underscores as spaces, upper case.\nIt is NOT printed raw. The ref is the " +
        "spelling the owner rejected when he asked for the more descriptive names, so a label " +
        "that degraded to it would reinstate the defect this module exists to fix.\nFix it by " +
        "adding the prefix to FUNCTION_PREFIXES in tools/guide/pad-label.ts, naming the kind of " +
        "control it marks - or, if the part is not a panel control at all, by labelling it " +
        "through the path that labels its kind rather than by widening this rule to fit it.",
    )
  }
  return ref.slice(prefix.length).split("_").join(" ").toUpperCase()
}

/**
 * Each throw of one selector mapped to the position it selects - `t3` ->
 * `60Hz` - with the count check that makes the mapping admissible at all.
 *
 * **THE COUNT CHECK IS THE POINT OF THIS FUNCTION.** The pad order and the
 * transcribed positions are two independent sources joined by index. They are
 * never truncated to the shorter, never padded to the longer, and never matched
 * as far as they go: a best-effort match prints a real frequency against the
 * wrong detent, which reads as a perfectly ordinary instruction and sends a
 * wire to the wrong lug.
 */
function detentsOf(component: Component, selector: SelectorTerminals): ReadonlyMap<string, string> {
  const order = padOrderFor(component)
  if (order[0] !== COMMON_TERMINAL) {
    throw new Error(
      `pad-label-no-common: the pad order for the selector "${component.id}" is ` +
        `[${order.join(", ")}], whose first entry is not "${COMMON_TERMINAL}", so its throws ` +
        "cannot be told apart from its pole and no throw can be matched to a position. A " +
        "selector's pad order is the common followed by its throws in detent order - " +
        "rotaryPadOrder in circuits/pultec/physical/parts.ts - and this component is not that " +
        `shape.\nIt is most likely a "${component.kind}" listed in SELECTORS by mistake: fix ` +
        "whichever of the two is wrong, in circuits/pultec/electrical/controls.ts or in the " +
        "physical model, rather than reading the first pad as a throw here.",
    )
  }
  const throws = order.slice(1)
  if (throws.length !== selector.positions.length) {
    throw new Error(
      `pad-label-detent-count: the pad order gives the selector "${component.id}" ` +
        `${inWords(throws.length)} throws and the control model gives it ` +
        `${inWords(selector.positions.length)} positions, so no throw can be told which detent ` +
        `it is.\nThe pad order is [${order.join(", ")}], stated by rotaryPadOrder in ` +
        "circuits/pultec/physical/parts.ts from the component's own throw pins. The positions " +
        `are [${selector.positions.join(", ")}], transcribed in SELECTORS in ` +
        `circuits/pultec/electrical/controls.ts from "${selector.source}".\nNeither list is ` +
        "truncated to the other and neither is padded: the i-th throw is the i-th position ONLY " +
        "while the counts agree. A frequency printed against the wrong detent is not a visible " +
        "fault - it reads as a perfectly ordinary instruction, and the builder solders the wire " +
        "to the wrong lug.\nFix whichever source is wrong, the component's throw pins or the " +
        "transcribed positions, rather than making this check pass.",
    )
  }
  return new Map(throws.map((name, index) => [name, selector.positions[index]]))
}

/** One selector pad's label: the pole, or the position the throw selects. */
function selectorLabel(
  component: Component,
  selector: SelectorTerminals,
  terminal: string,
  functionName: string,
): string {
  // The count check runs for the pole's pad too, deliberately: a selector whose
  // sources disagree is unlabelled whichever of its pads is asked about, and
  // labelling the common while every throw refused would hide the fault behind
  // one pad that happened to work.
  const detents = detentsOf(component, selector)
  if (terminal === COMMON_TERMINAL) return `${functionName} ${terminal}`
  const position = detents.get(terminal)
  if (position === undefined) {
    // Unreachable by construction, and stated as such rather than dressed up as
    // a guard: `terminal` came from `terminalNameOf`, which indexes the same
    // `padOrderFor` list `detents` was built from, so a non-common terminal is
    // one of its keys. The branch exists because a Map lookup is typed
    // `string | undefined` and the honest thing to do with the gap is refuse.
    throw new Error(
      `pad-label-unpositioned-throw: the terminal "${terminal}" of "${component.id}" is neither ` +
        `its "${COMMON_TERMINAL}" nor one of the throws its pad order states ` +
        `([${[...detents.keys()].join(", ")}]), so no position can be read for it. Both lists ` +
        "come from padOrderFor in circuits/pultec/physical/parts.ts, so reaching this means the " +
        "pad order changed shape between two reads of it.",
    )
  }
  return `${functionName} ${position}`
}

/**
 * The label a pad's wire carries on the guide: what the control is, and which
 * of its terminals this pad lands.
 *
 * `pin` is `PadTerminal.pin` (`./pads.ts`) - the number off the dump's
 * `PAD ... FROM <ref>.<pin>` field - and is turned into a terminal name by
 * `terminalNameOf`, which refuses a pin outside the component's pad order.
 *
 * A control the model does not name REFUSES. It is not labelled with its ref,
 * not labelled with its pin, and not given a partial label: see this module's
 * comment for whose decision that is.
 */
export function padLabelOf(component: Component, pin: string, controls: ControlModel): string {
  const functionName = functionNameOf(component.id)
  const pot = controls.pots.find((candidate) => candidate.ref === component.id)
  const selector = controls.selectors.find((candidate) => candidate.ref === component.id)
  if (pot !== undefined && selector !== undefined) {
    throw new Error(
      `pad-label-control-in-both-lists: "${component.id}" is named as a potentiometer AND as a ` +
        "selector by the control model handed in, so what its terminals ARE depends on which " +
        "list is read first - a pot's pads are its lugs and a selector's are its pole and " +
        `throws. The pot entry is sourced "${pot.source}"; the selector entry is sourced ` +
        `"${selector.source}".\nOne of the two entries is wrong. Remove it from POTS or from ` +
        "SELECTORS in circuits/pultec/electrical/controls.ts rather than letting a reading " +
        "order decide what a wire is soldered to.",
    )
  }
  const terminal = terminalNameOf(component, pin)
  if (pot !== undefined) return `${functionName} ${terminal}`
  if (selector !== undefined) return selectorLabel(component, selector, terminal, functionName)
  throw new Error(
    `pad-label-unknown-control: the pad "${component.id}.${pin}" belongs to a control the model ` +
      `does not name, so nothing says what its terminals do. POTS names ` +
      `[${controls.pots.map((candidate) => candidate.ref).join(", ")}] and SELECTORS names ` +
      `[${controls.selectors.map((candidate) => candidate.ref).join(", ")}]; "${component.id}" ` +
      "is in neither.\nIt is NOT labelled with its ref. " +
      `"${component.id}.${pin}" is the spelling the owner rejected when he asked for the more ` +
      "descriptive names, and a label that degraded to it would reinstate the defect this " +
      "module exists to fix while every test still passed.\nFix it by adding the control to " +
      "POTS or SELECTORS in circuits/pultec/electrical/controls.ts, with the document and page " +
      "its terminals are transcribed from - never from memory of what that kind of control " +
      "usually has - or by taking the terminal off the board.",
  )
}
