/**
 * WHICH PART ON THE BOARD BELONGS TO WHICH STAND-IN GROUP, in the form the
 * renderer can draw: a part ref -> absent-section map and the groups in the
 * order their hatches are handed out.
 *
 * WHAT THE IMAGE IS FOR. The owner, asking for it: *"It would be very useful
 * to see what parts of the circuit are the various scaffolding clusters so I
 * can decide whether to populate them or not when I'm building them to be
 * paired or not with other modules."* The checklist's `Fit` column
 * (`./fit-condition.ts`) tells him a row is conditional and the **Stand-in
 * groups** section (`./stand-in-section.ts`) lists each group's part ids; what
 * neither can do is show him WHERE on the board a cluster is. That is this
 * image.
 *
 * **THE MARK IS PER PART, NEVER PER REGION.** A group's parts sit near each
 * other on these layouts but are not guaranteed contiguous, and an own-circuit
 * part can sit between two of them. A hatched region drawn round a group would
 * therefore claim parts the group does not hold - and the five Pultec layouts
 * are frozen and owner-approved, so a builder who finds the picture and the
 * board disagreeing has no reason to suspect the picture. So every part is
 * marked on its own, from the doc's own ids.
 *
 * **IT RUNS THROUGH THE SAME TWO VOCABULARIES THE REST OF THE TOOLING DOES.**
 * A group's `partIds` are COMPONENT IDS (`lib/board/scaffold/doc.ts`: *"PART
 * IDS, NOT COMPONENTS"*). A dump's `PART` refs are REFERENCE DESIGNATORS. The
 * board module's `DESIGNATORS` map is the only place the two meet (`CLAUDE.md`,
 * *"Ids are semantic; designators belong to KiCad"*), so every lookup here goes
 * through it and an id with no designator refuses by name rather than being
 * compared against the dump as though it were one. This is the rule
 * `tools/perfboard/scaffold-membership.ts` states and obeys for the same two
 * vocabularies, and the reason it is spelled out twice is that this module read
 * ids against refs until 2026-10-19 and got away with it only because
 * `circuits/pultec/physical/parts.ts`'s `designatorsFor` happens to be the
 * identity map. Under `CLAUDE.md`'s stated norm - semantic ids, KiCad
 * designators - that made `make check` pass and `make guide` refuse on the same
 * board, naming a cause that was not the cause.
 *
 * **IT REFUSES A GROUP PART THE BOARD DOES NOT CARRY, OR CARRIES UNPLACED.**
 * `lib/board/scaffold/doc.ts` states the reason ids rather than components
 * cross that boundary: "it makes the guide unable to describe a part the board
 * does not carry (the lookup refuses)". A floating part is drawn nowhere, so a
 * marking naming one would promise a hatch that no sheet has - which is a gap
 * that looks like a part in the board's own circuit.
 *
 * THE HATCHES THEMSELVES ARE `./hatch.ts`'s, ratified by the owner on
 * 2026-10-18 with a disclosed weakness - read that file's comment before
 * changing one. Nothing here depends on what one looks like: a group takes the
 * style at its own index, and that is the whole assignment rule.
 */
import type { ScaffoldDoc } from "../../lib/board/scaffold/doc.ts"
import type { BoardDump } from "./dump.ts"
import { HATCH_STYLES, type HatchStyle } from "./hatch.ts"

export interface ClusterMarking {
  /**
   * The groups, in the doc's own order. A group's hatch is `HATCH_STYLES` at
   * its index here, so this order is also the legend's order.
   */
  readonly groups: readonly string[]
  /**
   * Every marked part's REFERENCE DESIGNATOR -> the absent section it stands in
   * for.
   *
   * **KEYED BY DESIGNATOR AND NOT BY COMPONENT ID**, because the drawing is:
   * `./render-clusters.ts` reads this map by `part.part.ref`, which is what a
   * dump's `PART` line carries. The group's own ids are resolved through
   * `DESIGNATORS` in `clusterMarking` below - the one place the two
   * vocabularies meet - so nothing downstream has to know which of the two it
   * is holding.
   */
  readonly groupOf: ReadonlyMap<string, string>
}

/**
 * The legend's statement of what NO hatch means.
 *
 * **WITHOUT IT THE ABSENCE OF A HATCH HAS NO STATED MEANING**, and that matters
 * exactly when a hatch comes out faint on a bad photocopy: a builder looking at
 * a part they cannot see a hatch on has to be able to read what an unhatched
 * part IS, rather than inferring it from the four hatches that are named.
 */
export const UNHATCHED_MEANS = "no hatch: this board's own circuit - fit it in every build"

/** The legend's name for one group's hatch. */
export function groupLegendText(group: string): string {
  return `${group} stand-in group - fit only with it`
}

function refuse(lines: readonly string[]): never {
  throw new Error(lines.join("\n"))
}

/**
 * The marking for one board, or `undefined` when there is no groups image to
 * draw.
 *
 * **`undefined` HAS TWO SOURCES AND THEY ARE THE SAME DECISION.** A board that
 * declares no `SCAFFOLD` is not a Pultec section (`pt2399-core`, the
 * transistor-preamp boards); a board whose doc declares no groups has builds
 * but puts no group on this board. Neither has a cluster to show, and in both
 * cases the packet prints no fourth image and the **Stand-in groups** section
 * says in words which of the two it is (`./stand-in-section.ts`'s
 * `NO_STAND_IN_GROUPS` and `NO_GROUPS_DECLARED`). An empty marking is NOT
 * returned instead: it would produce a hatch-free copy of the designators image
 * whose legend announces groups the board has none of.
 */
export function clusterMarking(
  scaffold: ScaffoldDoc | undefined,
  designators: Readonly<Record<string, string>>,
  dump: BoardDump,
): ClusterMarking | undefined {
  if (scaffold === undefined || scaffold.groups.length === 0) return undefined
  if (scaffold.groups.length > HATCH_STYLES.length) {
    refuse([
      `the ${scaffold.section} board declares ${scaffold.groups.length} stand-in groups and ` +
        `tools/guide/hatch.ts holds ${HATCH_STYLES.length} hatch styles, so two groups would be ` +
        "drawn with one hatch and the image would say a part stands in for a section it does not.",
      "Add a style to HATCH_STYLES in tools/guide/hatch.ts - one that differs from the others in " +
        "geometry rather than in density, so it survives a photocopy - rather than reusing one or " +
        "leaving a group unmarked.",
    ])
  }
  const placed = new Map(dump.parts.map((part) => [part.ref, part.placement]))
  /** Designator -> the group part that claimed it, so a collision names both ids. */
  const claimed = new Map<string, { readonly partId: string; readonly section: string }>()
  for (const group of scaffold.groups) {
    for (const partId of group.partIds) {
      const designator = designators[partId]
      if (designator === undefined) {
        refuse([
          `the ${group.section} stand-in group names ${partId}, which is in no DESIGNATORS entry ` +
            "for this board, so there is no reference designator to look for on the layout at all.",
          "A group's parts are COMPONENT IDS and a layout's parts are REFERENCE DESIGNATORS, and " +
            "DESIGNATORS is the only place the two meet - nothing is guessed from the id. Add it to " +
            "the DESIGNATORS export of this board's circuit module, or fix the group derivation in " +
            "circuits/pultec/physical/scaffold-doc.ts if the id is not a part this board carries.",
        ])
      }
      const already = claimed.get(designator)
      if (already !== undefined) {
        if (already.partId === partId) {
          refuse([
            `${partId} is listed in the ${already.section} group and in the ${group.section} group, ` +
              "so the image cannot say which hatch it carries.",
            "A part belongs to exactly one group: fix the group derivation in " +
              "circuits/pultec/physical/scaffold-doc.ts rather than marking it twice.",
          ])
        }
        refuse([
          `${already.partId} and ${partId} both resolve to the designator ${designator}, so one ` +
            `position on the board would have to carry both the ${already.section} group's hatch ` +
            `and the ${group.section} group's.`,
          "Two component ids sharing one designator is a defect in this board's DESIGNATORS export, " +
            "not in the layout: a designator names one part. Fix DESIGNATORS in the board's circuit " +
            "module.",
        ])
      }
      const placement = placed.get(designator)
      if (placement === undefined) {
        refuse([
          `the ${group.section} stand-in group names ${partId} (${designator}), and this board's ` +
            "layout holds no PART line for that designator, so there is nowhere on the drawing to " +
            "hatch it.",
          "A group crosses into the guide as part IDS (lib/board/scaffold/doc.ts) precisely so this " +
            "refuses rather than drawing a board that is missing one of the positions the group " +
            "needs. This is NOT a reason to edit the layout: the five Pultec layouts are " +
            "owner-approved and immutable, and `make check`'s scaffold-membership guard " +
            "(tools/perfboard/scaffold-membership.ts) refuses the same disagreement. Either the " +
            "group derivation in circuits/pultec/physical/scaffold-doc.ts has drifted from the " +
            "board, or the part is panel-mount - in which case it belongs in OFF_BOARD_IDS and in " +
            "no group, since an off-board part is expanded into bare pads and carries no designator " +
            "of its own on the board.",
        ])
      }
      if (placement === "floating") {
        refuse([
          `the ${group.section} stand-in group names ${partId} (${designator}), and the layout ` +
            "leaves it FLOATING - off the board - so no image draws it and no hatch could mark it.",
          "An unhatched position is read as one of this board's own parts, which is the opposite of " +
            "what this group is. Place it in VeroRoute (`make edit`), save, then run this again.",
        ])
      }
      claimed.set(designator, { partId, section: group.section })
    }
  }
  return {
    groups: scaffold.groups.map((group) => group.section),
    groupOf: new Map([...claimed].map(([designator, by]) => [designator, by.section])),
  }
}

/**
 * The hatch one group carries: the style at the group's own index.
 *
 * It refuses an unknown group rather than returning a default style, because
 * the caller asking is either the patch drawer or the legend builder and a
 * default would let those two print different answers for one group - the
 * misidentification this module exists to prevent, one level up.
 */
export function hatchFor(marking: ClusterMarking, group: string): HatchStyle {
  const index = marking.groups.indexOf(group)
  const hatch = index === -1 ? undefined : HATCH_STYLES[index]
  if (hatch === undefined) {
    refuse([
      `no hatch for the "${group}" group: this marking holds ${marking.groups.join(", ")}.`,
      "Every group in a marking is given a style by clusterMarking (tools/guide/clusters.ts), so a " +
        "group that reaches here unknown came from somewhere else - a legend built from a different " +
        "board's doc, or a group name spelled two ways.",
    ])
  }
  return hatch
}
