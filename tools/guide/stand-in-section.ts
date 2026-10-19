/**
 * The printed packet's **Stand-in groups** section: which positions on this
 * board belong to which absent section, which of three states this build puts
 * each group in, and every build this board can be part of.
 *
 * WHAT IT EXISTS TO CLOSE. The board's `wiring.md` has said all of this since
 * the stand-in groups existed, and the packet a person actually carries to the
 * bench said none of it: the checklist's `Fit` column (`./fit-condition.ts`)
 * tells a builder that a row is conditional, and nothing on the printed pages
 * told them which condition is true today. The owner, asking for this: *"It
 * would be very useful to see what parts of the circuit are the various
 * scaffolding clusters so I can decide whether to populate them or not when
 * I'm building them to be paired or not with other modules."* So this section
 * is a DECISION, taken before the iron is hot, and the part sections are the
 * work that follows from it.
 *
 * **IT CARRIES NO CHECKBOX, AND THAT IS THE POINT OF THE DESIGN.** Every part
 * row already has its own printed box. A box on a GROUP cannot be read: left
 * unticked on a group this build omits it is indistinguishable from unfinished
 * work, and ticked it is indistinguishable from "I fitted all of these" - the
 * exact ambiguity the `Fit` column was added to remove, reintroduced one level
 * up. So a group here records WHICH OF THREE STATES it is in - populated here,
 * not needed because that section is present in this build, or carried on
 * another board (which one, written in) - and the builder marks one of three
 * named states rather than leaving a tick to be interpreted.
 *
 * **THE BUILD IS NAMED FIRST, ON A LINE FILLED IN BY HAND.** The packet
 * carries every build this board can be part of, because the layout does: no
 * group decision below the build line means anything until the build itself is
 * recorded, and a packet that assumed one build would be wrong for fifteen of
 * sixteen of them.
 *
 * **NOTHING COUNTED HERE IS WRITTEN DOWN.** The build rows are
 * `scaffold.builds`, one for one; the part counts are each group's own list
 * length; the `Fit` label a block names comes from `fitCondition`, the same
 * function the checklist's column calls, so the two cannot print two spellings
 * of one condition. The four column headings and the two rules are IMPORTED
 * from `lib/board/scaffold/wiring.ts`, which is what the board's `wiring.md`
 * renders from - a copy of those words here would be a second place for them
 * to drift, and this section's whole job is to agree with that sheet.
 *
 * RENDERING IS `./guide.ts`'s. This module produces the section's content;
 * that one decides where it sits on the page and turns it into HTML, the same
 * division `./checklist.ts` has with it.
 */
import type { ScaffoldDoc, StandInGroupDoc } from "../../lib/board/scaffold/doc.ts"
import { BUILD_COLUMNS, ONE_GROUP_ONE_BOARD, POPULATE_WHOLE, buildCells } from "../../lib/board/scaffold/wiring.ts"
import { fitCondition, groupMembership } from "./fit-condition.ts"

/**
 * One of the three states a group can be in, as the builder marks it.
 *
 * `writeIn` is the "carried on <board>" state, which is not complete until a
 * board's name is on it: the build table below names that board, and a state
 * reading "carried elsewhere" with no elsewhere written down is the kind of
 * half-recorded configuration this section exists to prevent.
 */
export interface GroupStateOption {
  readonly text: string
  readonly writeIn: boolean
}

/** One absent section's group, as the packet prints it. */
export interface StandInGroupBlock {
  /** The ABSENT section these parts stand in for. */
  readonly section: string
  /** The group's own list length - never a separately stated number. */
  readonly partCount: number
  readonly partIds: readonly string[]
  /**
   * The `Fit` cell every one of this group's part rows carries in the
   * checklist, from `fitCondition` - so a builder can find this group's parts
   * in the part sections by the cell they already read there.
   */
  readonly fitLabel: string
  readonly states: readonly GroupStateOption[]
}

/**
 * The section, in the two shapes a board comes in. A union rather than an
 * optional field, for `GuideSchematic`'s reason (`./guide.ts`): the absence is
 * a shape the renderer has to handle rather than one it can skip, and a board
 * with no groups prints a sentence saying so rather than a blank.
 */
export type StandInSection =
  | {
      readonly kind: "groups"
      /** The hand-filled line that records which build this is. */
      readonly buildPrompt: string
      readonly intro: readonly string[]
      readonly rules: readonly string[]
      readonly groups: readonly StandInGroupBlock[]
      /**
       * The sentence printed in place of the group blocks when the doc
       * declares none - `undefined` whenever there is at least one block, so
       * the renderer never prints a sentence about groups beside the groups.
       */
      readonly noGroups: string | undefined
      readonly markOne: string
      readonly buildIntro: readonly string[]
      readonly buildColumns: readonly string[]
      readonly buildRows: readonly (readonly string[])[]
    }
  | { readonly kind: "none"; readonly sentence: string }

/**
 * What the section says on a board that declares no `SCAFFOLD` at all -
 * `pt2399-core`, the transistor-preamp boards: not a Pultec section, with no
 * absent neighbours to stand in for.
 *
 * It is a SENTENCE and not an empty section, for `PAD_NO_MOUNTING`'s reason
 * (`./checklist.ts`): a reader meeting nothing where an instruction belongs
 * cannot tell "nothing is required of you here" from "nobody worked it out".
 * A gap says which gap it is.
 */
export const NO_STAND_IN_GROUPS =
  "This board holds no stand-in groups: it is not one section of a shared ladder, so nothing on " +
  "it stands in for a board that is not on the bench, and it is populated the same way in every " +
  "build. Fit everything the checklist lists."

/**
 * What stands in place of the group blocks when a board declares a `SCAFFOLD`
 * with no groups in it. `lib/board/scaffold/doc.ts` permits that shape, and it
 * is a different claim from declaring no `SCAFFOLD`: this board's builds are
 * known and none of them puts a group here. Same reason as above for why it is
 * a sentence.
 */
export const NO_GROUPS_DECLARED =
  "This board's scaffold declares no stand-in groups, so there is no group decision to take here: " +
  "the build table below is what the build changes, and every part the checklist lists is fitted."

/**
 * Printed directly above each group's three states.
 *
 * SHORT, AND REPEATED AT EVERY GROUP RATHER THAN SAID ONCE ABOVE THEM ALL. A
 * group block is `page-break-inside: avoid` and the blocks are not, so a single
 * instruction above the first block can end up on the previous sheet from the
 * states it governs. WHY there is no checkbox is said once, in the intro, where
 * repeating it four times would be noise.
 */
export const MARK_ONE = "Mark the one that applies:"

function statesFor(group: StandInGroupDoc): readonly GroupStateOption[] {
  return [
    { text: "populated here - the whole group, every part listed above", writeIn: false },
    { text: `not needed - the ${group.section} section is present in this build`, writeIn: false },
    { text: "carried on", writeIn: true },
  ]
}

/**
 * The `Fit` cell this group's rows carry, resolved through the checklist's own
 * `fitCondition` for every part in the group and refused if they disagree.
 *
 * A disagreement means one part is listed under two sections in the doc (or
 * under none), and the block would then name a condition that is false of some
 * of the parts beneath it - a builder cross-referencing the part sections by
 * that cell would find a row this block claims and the column denies. The doc
 * has its own guard against a part in two groups
 * (`lib/board/scaffold/wiring.ts`'s `standInOwners`); this is the same fact
 * checked where this section depends on it.
 */
function fitLabelFor(group: StandInGroupDoc, membership: ReadonlyMap<string, string>): string {
  const labels = new Set(group.partIds.map((partId) => fitCondition(partId, membership)))
  const [label] = labels
  if (labels.size !== 1 || label === undefined) {
    throw new Error(
      `the ${group.section} stand-in group's parts (${group.partIds.join(", ")}) do not all resolve to ` +
        `one Fit condition - ${[...labels].join(" / ")} - so the packet cannot say which cell names ` +
        "this group in the checklist. A part belongs to exactly one group: fix the group derivation " +
        "in circuits/pultec/physical/scaffold-doc.ts rather than printing a condition that is false " +
        "of some of the parts listed under it.",
    )
  }
  return label
}

function blockFor(group: StandInGroupDoc, membership: ReadonlyMap<string, string>): StandInGroupBlock {
  return {
    section: group.section,
    partCount: group.partIds.length,
    partIds: group.partIds,
    fitLabel: fitLabelFor(group, membership),
    states: statesFor(group),
  }
}

/**
 * What the section says about the board's `wiring.md`, and it is told whether
 * there IS one rather than assuming it.
 *
 * **THE TWO FACTS ARE DELIBERATELY SEPARATE AND THIS IS WHERE THEY MEET.**
 * `tools/guide/packet.ts` decides the page-one `Wiring guide` row BY LOOKING AT
 * DISK, not from `circuit.scaffold`, and says in a comment why: a board can
 * carry a `wiring.md` for reasons other than stand-in groups, and
 * `tools/perfboard/wiring-sync.ts` writes none at all for a board with no
 * off-board or physical-only parts. So a board with a `SCAFFOLD` and no sheet
 * is possible - no Pultec section is one today, all five having panel controls -
 * and prose that said "named on page one" unconditionally would send a builder
 * to a row that is not there, on paper, which is G45's class of defect.
 *
 * The fix is NOT to re-couple the two: this takes the same `wiringPath` page one
 * takes, so the sentence and the row are the one fact. `undefined` says there is
 * no sheet, and the section says that instead of pointing at one.
 */
function wiringSentence(wiringPath: string | undefined): string {
  if (wiringPath === undefined) {
    return (
      "This board has no wiring sheet in the repository - page one names one when there is one - so " +
      "these pages are the whole printed account of its stand-in groups, and the wires between " +
      "boards and the junction pads are not described anywhere in this packet."
    )
  }
  return (
    "The board's wiring sheet, named on page one, is the fuller account - the wires between " +
    "boards, the panel terminals, the junction pads. This section is the part of it you decide " +
    "before you solder."
  )
}

/**
 * The junction-pins paragraph of the build table's introduction, whose last
 * clause names the wiring sheet - and only when there is one, for
 * `wiringSentence`'s reason just above.
 */
function junctionParagraph(wiringPath: string | undefined): string {
  const pads =
    wiringPath === undefined
      ? " This packet does not list those pads; the board has no wiring sheet to list them."
      : " The board's wiring sheet lists the pads themselves."
  return (
    "Populate here is what you solder onto THIS board; every other group above is left empty. " +
    "Carried elsewhere says which board carries those instead, so a group you leave empty here " +
    "is one you can see is covered. Junction pins to wire are the pins of this board's junction " +
    `that carry a net to another board in that build.${pads}`
  )
}

/**
 * The emulated setting, read off `doc.flat` and never transcribed: the
 * stand-ins' values are derived at that setting and at no other, and up to
 * 3.71 dB rides on it (a worst case measured at an earlier reference setting -
 * see "Limits, measured" in the design doc). `lib/board/scaffold/wiring.ts`
 * says the same thing from the same field for the same reason.
 */
function flatSentence(scaffold: ScaffoldDoc): string {
  const flat = scaffold.flat
  return (
    "The stand-ins are the absent sections at one setting: low frequency " +
    `${flat.loFrequency}, high frequency ${flat.hiFrequency}, mid frequency ${flat.midFrequency}, ` +
    `mid in ${flat.midMode}. Their values hold at that setting and at no other, so leave the ` +
    "frequency selectors you DO have there."
  )
}

/**
 * The section for one board. `undefined` scaffold - a board declaring no
 * `SCAFFOLD` - is the one-sentence shape; everything else is derived from the
 * doc.
 *
 * `wiringPath` is the board's `wiring.md`, repository-relative, exactly as page
 * one has it - `undefined` when there is none on disk. It is a PARAMETER and
 * not read off the scaffold: see `wiringSentence` above for why those are two
 * facts and what printing one as the other would cost a builder.
 */
export function standInSection(
  scaffold: ScaffoldDoc | undefined,
  wiringPath: string | undefined,
): StandInSection {
  if (scaffold === undefined) return { kind: "none", sentence: NO_STAND_IN_GROUPS }
  const membership = groupMembership(scaffold)
  const groups = scaffold.groups.map((group) => blockFor(group, membership))
  return {
    kind: "groups",
    buildPrompt: "This build:",
    intro: [
      "The five sections of this EQ share one signal ladder, so a section board on its own has no " +
        "signal path at all: the only route from input to output runs through its neighbours. This " +
        `board - the ${scaffold.section} section - therefore holds positions for the other sections' ` +
        "parts, one stand-in group each, and which of them you solder depends on which other boards " +
        "are on the bench.",
      "The layout holds every position in every build. What configures a build is what you leave " +
        "out, so take the decisions here before you work the checklist: every row there whose Fit " +
        "cell names a group is one of the parts below.",
      "Each group below is in one of three states, and you mark which. There is deliberately no " +
        "checkbox on a group: a box left unticked on a group this build leaves out cannot be told " +
        "from a part you forgot, and a ticked one cannot be told from a group you decided against. " +
        "The parts themselves still each have their own box in the checklist.",
      flatSentence(scaffold),
      wiringSentence(wiringPath),
    ],
    rules: [
      `${POPULATE_WHOLE} A group with a part left out is not a cheaper version of itself - it is a ` +
        "different circuit, and nothing on the board will tell you.",
      `${ONE_GROUP_ONE_BOARD} Two boards both populating one absent section's group put the two ` +
        "copies in parallel across the same nets and halve a value, which at the bench is a " +
        "plausible wrong measurement rather than an obvious fault. The table below names the one " +
        "board that carries each group.",
    ],
    groups,
    noGroups: groups.length === 0 ? NO_GROUPS_DECLARED : undefined,
    markOne: MARK_ONE,
    buildIntro: [
      "Find the row for the boards you are building - the first column names every board in the " +
        "build, this one included - and write it on the build line above.",
      junctionParagraph(wiringPath),
    ],
    buildColumns: BUILD_COLUMNS,
    buildRows: scaffold.builds.map(buildCells),
  }
}
