/**
 * The stand-in section of a board's wiring guide: which groups to populate on THIS
 * board for the build in front of you, which board carries the rest, which junction
 * pins to wire, and the setting the stand-ins emulate.
 *
 * WHAT THIS EXISTS TO CLOSE. The five sections share a signal ladder, so a section
 * built alone has no signal path, and every board therefore carries positions for the
 * absent sections' parts. Nothing on the board says which of those positions a
 * particular build populates. The failure that invites is the one the supplier rule
 * exists to prevent: two boards each populating the same absent section's group put the
 * copies in parallel across the same nets and quietly halve a value, which at the bench
 * is a plausible wrong measurement rather than an obvious fault. A guide that lists the
 * stand-in parts without saying when to fit them is worse than silent - it reads as an
 * instruction to fit them all.
 *
 * RENDERING ONLY. Everything here comes out of a `ScaffoldDoc` (`./doc.ts`), computed
 * by `circuits/pultec/physical/scaffold-doc.ts` from the configuration networks
 * themselves. See that file for why the computation is on the design's side of the
 * fence rather than in `lib/`.
 *
 * THE EMULATED SETTING IS READ, NEVER WRITTEN DOWN HERE. It comes off
 * `doc.flat`, which travels with the stand-in derivation. Up to 3.71 dB rides on that
 * setting - an upper bound measured at an earlier reference; see "Limits, measured" in
 * the design doc - it is the limit most likely to be mistaken for a circuit fault, and a
 * transcribed copy of it in this prose would be the one sentence in the document that
 * could silently stop being true.
 *
 * THE PART IDS ARE RESOLVED AGAINST THE BOARD NETWORK and refuse when they miss, so
 * this section cannot describe a part the board does not carry.
 */
import { PART_TABLE_HEADER, describePart, gangOf, partRow } from "../part-text.ts"
import type { Component, Network } from "../../model/types.ts"
import type { BuildDoc, ScaffoldDoc, StandInGroupDoc } from "./doc.ts"

/** How `describePart` renders a zero-ohm part: a wire link, not a resistor to buy. */
const ZERO_OHM = "0R"

/** Every part id the doc lists, so the always-populated table can keep them out. */
export function standInPartIds(doc: ScaffoldDoc): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const group of doc.groups) for (const id of group.partIds) ids.add(id)
  return ids
}

/** Part id -> the absent section it stands in for, for the panel-part note. */
export function standInOwners(doc: ScaffoldDoc): ReadonlyMap<string, string> {
  const owners = new Map<string, string>()
  for (const group of doc.groups) {
    for (const id of group.partIds) {
      const existing = owners.get(id)
      if (existing !== undefined && existing !== group.section) {
        throw new Error(
          `Stand-in part "${id}" is listed under both ${existing} and ${group.section} on the ` +
            `${doc.section} board. One part belongs to one group: a part in two groups would be ` +
            "populated twice, which is the parallel-copy mistake the supplier rule exists to " +
            "prevent. Fix the group derivation in circuits/pultec/physical/scaffold-doc.ts.",
        )
      }
      owners.set(id, group.section)
    }
  }
  return owners
}

function componentFor(id: string, byId: ReadonlyMap<string, Component>, doc: ScaffoldDoc): Component {
  const component = byId.get(id)
  if (component === undefined) {
    throw new Error(
      `The stand-in group listed for the ${doc.section} board names part "${id}", which is not ` +
        "on that board's network. The guide would then tell a builder to fit a part the layout " +
        "has no position for, so it refuses instead. Either the group derivation in " +
        "circuits/pultec/physical/scaffold-doc.ts and circuits/pultec/physical/board.ts have " +
        "drifted apart, or the guide is being generated against the wrong board.",
    )
  }
  return component
}

/** Said at every group, because a group is populated whole or not at all, and the one
 * with a single part is the one where that is least obvious. */
function wholeGroupText(parts: number): string {
  if (parts === 1) return "This group is a single part. Either it is fitted or it is not."
  if (parts === 2) return "Both parts of this group go in together, or neither does."
  return `All ${parts} parts of this group go in together, or none of them do.`
}

/**
 * The ganged-shaft hazard, told the way it reaches THIS board.
 *
 * WHY THIS IS CONDITIONAL. A ganged selector turns two sections at once, so moving it
 * when one of the two is absent moves the built section only and leaves the stand-in
 * where it was derived - up to 3.71 dB apart, and it reads as a circuit fault. That
 * figure is an UPPER BOUND measured at an earlier reference setting, where mid's
 * stand-in carried a tuned LC branch; at the current setting only hi-cut's stand-in
 * depends on a selector at all. See "Limits, measured" in the design doc. On four
 * of the five boards the shaft is on this panel and **Panel parts** flags it. On the mid
 * board nothing is ganged - `SW_MID` shares no shaft, the pairs being `hi_freq` and
 * `lo_freq` - so the unconditional version sent that reader hunting upward for a flag
 * that is not there, and a guide that points at something absent reads as a guide for a
 * different board. The hazard still reaches mid's board, because a group IT populates
 * can be standing in for a section whose shaft is on somebody else's panel, so the
 * paragraph is reworded rather than dropped.
 *
 * Both halves read the same model the panel flag does, through `gangOf`, so the flag and
 * this warning cannot disagree about whether this board has one.
 */
function gangedWarning(
  network: Network,
  offBoard: ReadonlySet<string>,
): readonly string[] {
  const ganged = network.components.some(
    (component) => offBoard.has(component.id) && gangOf(component) !== undefined)
  const consequence = [
    "Moving it then moves the section you built and not the stand-in covering the one you",
    "did not: the two disagree by up to 3.71 dB, which reads as a circuit fault rather than",
    "as a knob in the wrong place. That 3.71 dB is a worst case measured at an earlier",
    "reference setting, not a figure to expect — treat it as the reason to leave the knob",
    "alone, not as a prediction of what you will hear.",
  ]
  if (ganged) {
    return [
      "One of this board's selectors is one shaft shared by two sections — **Panel parts**",
      "above flags it — and one of those two may be a section a stand-in is covering.",
      ...consequence,
    ]
  }
  return [
    "Nothing on this board's panel is ganged, so no knob here turns two sections at once.",
    "A selector on ANOTHER board can be, and the section it shares a shaft with may be one",
    "a stand-in group is covering — on this board or on whichever board the table below says",
    "carries it.",
    ...consequence,
  ]
}

function groupTable(
  group: StandInGroupDoc,
  doc: ScaffoldDoc,
  byId: ReadonlyMap<string, Component>,
  designators: Readonly<Record<string, string>>,
  labels: Readonly<Record<string, string>>,
  offBoard: ReadonlySet<string>,
): readonly string[] {
  const rows = group.partIds.map((id) => {
    const component = componentFor(id, byId, doc)
    const note = offBoard.has(id)
      ? "panel part, wired back like the others under **Panel parts**"
      : undefined
    return partRow(component, designators[id] ?? id, labels, note)
  })
  return [
    `#### ${group.section} — stands in for the absent ${group.section} section`,
    "",
    wholeGroupText(rows.length),
    "",
    ...PART_TABLE_HEADER,
    ...rows,
    "",
  ]
}

/** "hi-boost + low-cut", or "low-cut alone" for a one-board build. */
function benchText(build: BuildDoc): string {
  return build.present.length === 1
    ? `${build.present[0]} alone`
    : build.present.join(" + ")
}

function buildRow(build: BuildDoc): string {
  const populate = build.populate.length > 0 ? build.populate.join(", ") : "nothing"
  const elsewhere = build.elsewhere.length > 0
    ? build.elsewhere.map((carried) => `${carried.section} → ${carried.board}`).join("; ")
    : "—"
  const junction = build.junction.length > 0
    ? build.junction
      .map((wire) => `${wire.pad} (${wire.net}) → ${wire.reaches.join(", ")}`)
      .join("; ")
    : "nothing crosses"
  return `| ${benchText(build)} | ${populate} | ${elsewhere} | ${junction} |`
}

/**
 * The whole section, in the register of the ones above it: what you fit, what you
 * leave empty, what wire goes where.
 */
export function standInGroupsSection(
  doc: ScaffoldDoc,
  network: Network,
  designators: Readonly<Record<string, string>>,
  labels: Readonly<Record<string, string>>,
  offBoard: ReadonlySet<string>,
): string {
  const byId = new Map(network.components.map((component) => [component.id, component]))
  // Refuses a part listed under two group names before a line is rendered: a part in
  // two groups is one that gets populated twice.
  standInOwners(doc)

  const lines: string[] = [
    "## Stand-in groups",
    "",
    "The five sections of this EQ share one signal ladder, so a section board on its own has",
    "no signal path at all: at the flat setting its own level pot grounds its input, and the",
    "only route from input to output runs through its neighbours. This board therefore holds",
    `positions for the other sections' parts — one stand-in group each — and which of them you`,
    "solder depends on which other boards are on the bench. The layout holds every position in",
    "every build; what configures a build is what you leave out.",
    "",
    "**Populate a group whole, or leave it empty.** Every part of a group is listed below under",
    "that group's name, so a group with a part missing reads as unfinished rather than as a",
    "choice. It is not a cheaper version of itself — it is a different circuit, and nothing on",
    "the board will tell you.",
    "",
    "**One group, one board.** Every board's junction carries all five ladder nets, so any board",
    "on the bench could host any absent section's group. Exactly one must. Two boards each",
    "populating the same absent section's group put the two copies in parallel across the same",
    "nets and halve a value — at the bench that is a plausible wrong measurement, not an obvious",
    "fault. **What to populate, by build** below names the one board that carries each absent",
    "group, so a group you leave empty here is one you can see is covered somewhere else.",
    "",
    "**The stand-ins are the absent sections at one setting: low frequency " +
      `${doc.flat.loFrequency}, high frequency ${doc.flat.hiFrequency}, mid frequency ` +
      `${doc.flat.midFrequency}, mid in ${doc.flat.midMode}.**`,
    "Their values are derived at that setting and at no other, so leave the frequency",
    "selectors you DO have there.",
    ...gangedWarning(network, offBoard),
    "",
  ]

  // Only said when such a part is actually in a group here. Rendering it anyway would
  // be a sentence about the board that happened to be true, which is how a generated
  // document starts being read as prose nobody checked.
  const linkParts = doc.groups
    .flatMap((group) => group.partIds)
    .filter((id) => describePart(componentFor(id, byId, doc)) === ZERO_OHM)
  if (linkParts.length > 0) {
    lines.push(
      `**A part listed as \`${ZERO_OHM}\` is a wire link.** A level pot sitting at its end stop`,
      "reduces to a zero-ohm part rather than to nothing at all — an ideal short stays a part",
      "here, so that no two nodes are quietly merged into one — so where a group says",
      `\`${ZERO_OHM}\`, fit a wire or a solder bridge.`,
      "",
    )
  }

  lines.push(
    "### The groups this board holds",
    "",
    "None of these parts belong to this board's own circuit. **On the board** above is that, and",
    "it is populated in every build.",
    "",
  )

  if (doc.groups.length === 0) {
    lines.push("_None._", "")
  } else {
    for (const group of doc.groups) {
      lines.push(...groupTable(group, doc, byId, designators, labels, offBoard))
    }
  }

  lines.push(
    "### What to populate, by build",
    "",
    "Find the row for the boards you are building — the first column names every board in the",
    "build, this one included. **Populate here** is what you solder onto THIS board; every other",
    "group above is left empty. **Carried elsewhere** says which board carries those instead, so",
    "a group missing from this board is one you can account for rather than wonder about.",
    "**Junction pins** are the pins of this board's junction that carry a net to another board in",
    "that build — the pads are the same five on every board, listed under **Board terminals**",
    "above, and this says which of them are doing something.",
    "",
    "| Boards on the bench | Populate here | Carried elsewhere | Junction pins to wire |",
    "| --- | --- | --- | --- |",
    ...doc.builds.map(buildRow),
    "",
  )

  if (doc.external.length > 0) {
    lines.push(
      "### The EQ's own connections",
      "",
      "The source, the load and ground land on the junction as well, not on a separate",
      "connector, and they are the same pads in every build, including a one-board one. Ground",
      "has more than one pin — **Board terminals** above lists every junction pin, and every one",
      "of them on net `0` is the same ground.",
      "",
      "**On own parts** says whether this board's OWN circuit — what it carries in every build —",
      "sits on that net. Yes means a lead to that pad reaches the circuit whatever else you have",
      "built. No means it reaches it only through the junction bus, which a stack gives you, or",
      "through a stand-in group this board is populating in that particular build: if you are",
      "joining boards with individual leads rather than stacking them, land that connection on a",
      "board whose own parts are on the net instead.",
      "",
      "| Pad | Net | What lands here | On own parts |",
      "| --- | --- | --- | --- |",
      ...doc.external.map((landing) =>
        `| ${landing.pad} | ${landing.net} | ${landing.port} | ` +
        `${landing.onBoard ? "yes" : "no"} |`),
      "",
    )
  }

  return lines.join("\n")
}
