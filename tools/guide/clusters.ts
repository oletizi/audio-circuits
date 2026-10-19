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
  /** Every marked part's ref -> the absent section it stands in for. */
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
export function clusterMarking(scaffold: ScaffoldDoc | undefined, dump: BoardDump): ClusterMarking | undefined {
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
  const groupOf = new Map<string, string>()
  for (const group of scaffold.groups) {
    for (const partId of group.partIds) {
      const already = groupOf.get(partId)
      if (already !== undefined) {
        refuse([
          `${partId} is listed in the ${already} group and in the ${group.section} group, so the ` +
            "image cannot say which hatch it carries.",
          "A part belongs to exactly one group: fix the group derivation in " +
            "circuits/pultec/physical/scaffold-doc.ts rather than marking it twice.",
        ])
      }
      const placement = placed.get(partId)
      if (placement === undefined) {
        refuse([
          `the ${group.section} stand-in group names ${partId}, and this board's layout holds no ` +
            "part with that ref, so there is nowhere on the drawing to hatch it.",
          "A group crosses into the guide as part IDS (lib/board/scaffold/doc.ts) precisely so this " +
            "refuses rather than drawing a board that is missing one of the positions the group " +
            "needs. Bring the .vrt in step with the circuit (`make update`), or fix the group in " +
            "circuits/pultec/physical/scaffold-doc.ts.",
        ])
      }
      if (placement === "floating") {
        refuse([
          `the ${group.section} stand-in group names ${partId}, and the layout leaves it FLOATING - ` +
            "off the board - so no image draws it and no hatch could mark it.",
          "An unhatched position is read as one of this board's own parts, which is the opposite of " +
            "what this group is. Place it in VeroRoute (`make edit`), save, then run this again.",
        ])
      }
      groupOf.set(partId, group.section)
    }
  }
  return { groups: scaffold.groups.map((group) => group.section), groupOf }
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
