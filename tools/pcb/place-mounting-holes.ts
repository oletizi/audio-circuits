/**
 * PLACE THE FOUR M3 MOUNTING HOLES AND THEIR RULE AREAS on a board, against
 * that board's own outline and the approved rule.
 *
 * It decides nothing. The count, the drill, the envelope and the inset come
 * from `circuits/pt2399-core/placement-rules.json` `anchors.mounting_holes`;
 * the corners come from the board's `Edge.Cuts`; the footprint comes from the
 * project-local library file's own bytes. Run it twice and you get the same
 * bytes, because the uuids are derived from the reference rather than generated.
 *
 * WHAT IT WRITES, per hole, and why both:
 *
 *  - the **footprint**, `(locked yes)` and `board_only`. Locked because the
 *    seeder treats a file-locked reference as already placed, which is what
 *    keeps the holes where the rule put them while everything else is
 *    re-seeded; `board_only` because a hole has no schematic symbol and
 *    `kicad-cli pcb drc --schematic-parity` otherwise reports `Extra
 *    footprint`, which `./drc-policy.ts` tolerates zero of at any severity
 *    (measured in `tests/pcb/mounting-envelope-drc.test.ts`).
 *  - the **Rule Area**, copper-only. The footprint's courtyard stops a PART
 *    overlapping the washer; the Rule Area stops COPPER under it. Two
 *    mechanisms, one diameter.
 *
 * IT IS IDEMPOTENT BY REPLACEMENT, not by skipping: every mounting-hole
 * footprint and every Rule Area whose name this tool owns is removed first. A
 * tool that skipped what was already there would leave a hole at a stale
 * position after the outline moved - which is the one failure mode that matters
 * here, since the whole point is that the corners move with the board.
 *
 *     bun tools/pcb/place-mounting-holes.ts <board.kicad_pcb> <placement-rules.json> [--write]
 */
import fs from "node:fs"
import path from "node:path"
import { assertStillParses, withoutTopLevelForms, withTopLevelForms } from "./board-forms.ts"
import { parseSexpr } from "../../lib/kicad/sexpr.ts"
import { footprintsOf, verifyFootprintAccounting } from "./footprint-accounting.ts"
import { outlineBounds } from "./resolve-intent-zones.ts"
import { describeBounds } from "./board-outline.ts"
import {
  MOUNTING_FOOTPRINT, PROJECT_LIBRARY, isMountingHoleFootprint, isOurMountingHole,
  mountingHoleRule, mountingHoles,
  placedMountingHoles,
} from "./mounting-hardware.ts"
import {
  inwardLabelOffsetY, mountingFootprintForm, readMountingFootprint, referenceLabelOffsetY, ruleAreaForm,
} from "./mounting-hardware-forms.ts"

/** `MH1`..`MH4`, in the order `mountingHoles` returns the corners. */
export const REFERENCES = ["MH1", "MH2", "MH3", "MH4"] as const

/** The Rule Area name prefix this tool owns, and therefore replaces. */
export const RULE_AREA_PREFIX = "mounting_hole_"

/**
 * Stable uuids, derived from the reference so a re-run produces identical bytes.
 *
 * Generated uuids would make every re-run a whole-file diff and would make the
 * board's bytes depend on when the tool ran, which `CLAUDE.md`'s rule about
 * comparing derived artifacts BY CONTENT rather than by timestamp exists to
 * prevent.
 */
function uuidFor(kind: "fp" | "zone", index: number): string {
  const tag = kind === "fp" ? "1" : "2"
  return `3c0a0000-0000-4000-8000-00000${tag}00000${index + 1}`
}

/** One footprint this tool took off the board, named so a deletion is visible. */
export interface RemovedFootprint {
  readonly reference: string
  readonly library: string
  /** Its own uuid, which is what `./footprint-accounting.ts` keys the check on. */
  readonly uuid: string
  readonly why: "project library id" | "MH-shaped reference on an all-NPTH footprint"
}

export interface PlacedHardware {
  readonly text: string
  /**
   * EVERY footprint removed, named. It was a COUNT, and that is half of why two
   * rounds of silent deletion were silent: `removedFootprints: 2` on a board
   * that should have lost one is a number a reader has to already be suspicious
   * of to notice. A list makes a wrong deletion visible in the tool's own
   * output, which is the net that catches the next variant of this nobody
   * anticipated - the other half being the narrowed predicate.
   */
  readonly removed: readonly RemovedFootprint[]
  readonly removedZones: number
  readonly report: readonly string[]
}

export function withMountingHardware(
  boardText: string,
  boardWhere: string,
  rulesPath: string,
  libraryPath: string,
): PlacedHardware {
  const rule = mountingHoleRule(JSON.parse(fs.readFileSync(rulesPath, "utf8")), rulesPath)
  const outline = outlineBounds(boardText, boardWhere)
  const holes = mountingHoles(outline, rule)
  if (holes.length !== REFERENCES.length) {
    throw new Error(
      `the rule derives ${holes.length} holes but this tool names ${REFERENCES.length} references ` +
        `(${REFERENCES.join(", ")}). A reference list and a count that disagree would place a hole ` +
        "with no designator or leave one unnamed.",
    )
  }
  const library = readMountingFootprint(libraryPath)
  const labelOffsetY = referenceLabelOffsetY(library, libraryPath)

  // REMOVE FIRST, because a hole this tool placed at a corner the outline has
  // since moved away from must go, or the board ends up with two MH1s. Skipping
  // what is already there is the one failure mode that matters here.
  //
  // **DELETION IS BY IDENTITY, NEVER BY SHAPE, and that took two rounds to get
  // right.** The first predicate was a regex for `(pad "" np_thru_hole`, which
  // is `some` - it deleted any part carrying one mechanical hole beside its
  // electrical pads, so a vertical pot with an anti-rotation pin went. The
  // second made the removal test identical to the DETECTION test, which closed
  // the drift between them and left the width: all-NPTH is true of 87 installed
  // footprints and **49 of them are not mounting holes** - a heatsink, a
  // DIN-rail adapter, 17 lightpipes, 27 panelization break lines - and three of
  // those were measured leaving a board with nothing in the output naming them.
  // The per-library breakdown is re-derived by
  // `tests/pcb/mounting-hole-placement.test.ts` rather than transcribed here.
  //
  // `isOurMountingHole` is the identity test: this project's own library id, or
  // an `MH<n>` reference on an all-NPTH footprint. A heatsink satisfies neither.
  // Shape remains the right test for what the GRADER counts, and
  // `isMountingHoleFootprint` says so where it is defined; it is not a licence
  // to delete, and the lesson generalises past the predicate -
  // **a tool's DELETE test must be narrower than its FIND test, not equal to it.**
  const removed: RemovedFootprint[] = []
  const withoutHoles = withoutTopLevelForms(boardText, boardWhere, (form, body) => {
    if (form.name !== "footprint") return false
    const node = parseSexpr(body)
    if (!isOurMountingHole(node)) return false
    const library = node.atoms[0] ?? ""
    const reference =
      node.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")?.atoms[1] ?? "?"
    const uuid = node.nodes.find((n) => n.name === "uuid")?.atoms[0]
    // NO DEFAULT. This read `?? ""`, which was harmless ONLY because
    // `footprintsOf(before)` refuses a uuid-less footprint and happens to run
    // first - harmlessness that depends on call ordering, and this repository's
    // rule is that a fallback outside test code is a bug factory because it
    // hides absence. An empty uuid would be a removal record keyed on nothing,
    // which `./footprint-accounting.ts` would then match against no footprint
    // and report as "reported REMOVED and still on the board" - a true-looking
    // refusal pointing at the wrong thing.
    if (uuid === undefined || uuid === "") {
      throw new Error(
        `${boardWhere}: the footprint ${reference} (${library}) this tool is about to remove ` +
          "carries no (uuid ...), so the removal cannot be recorded in a way the accounting in " +
          "./footprint-accounting.ts can check. It is not defaulted to an empty string: a " +
          "removal keyed on nothing is indistinguishable from one that was never recorded, which " +
          "is the silent deletion that whole module exists to make impossible. KiCad writes a " +
          "uuid on every footprint, so a board without one has been hand-edited.",
      )
    }
    removed.push({
      reference,
      library,
      uuid,
      why:
        library === `${PROJECT_LIBRARY}:${MOUNTING_FOOTPRINT}`
          ? "project library id"
          : "MH-shaped reference on an all-NPTH footprint",
    })
    return true
  })
  const withoutZones = withoutTopLevelForms(withoutHoles.text, boardWhere, (form, body) => {
    if (form.name !== "zone") return false
    return new RegExp(`\\(name\\s+"${RULE_AREA_PREFIX}`).test(body)
  })

  const forms: string[] = []
  const report: string[] = []
  holes.forEach((hole, index) => {
    const reference = REFERENCES[index] as string
    const referenceOffsetY = inwardLabelOffsetY(hole, outline, labelOffsetY)
    forms.push(
      mountingFootprintForm(library, libraryPath, {
        reference,
        x: hole.x,
        y: hole.y,
        referenceOffsetY,
        uuid: uuidFor("fp", index),
        locked: true,
        boardOnly: true,
      }),
    )
    forms.push(
      ruleAreaForm({
        cx: hole.x,
        cy: hole.y,
        envelopeDiameterMm: rule.envelopeDiameterMm,
        name: `${RULE_AREA_PREFIX}${hole.corner}`,
        uuid: uuidFor("zone", index),
      }),
    )
    report.push(
      `${reference} (${hole.corner}) at (${hole.x}, ${hole.y}): ${rule.holeDiameterMm} mm drill, ` +
        `${rule.envelopeDiameterMm} mm envelope, ${rule.centreInsetMm} mm from both edges, ` +
        `reference label at y ${referenceOffsetY} (inward)`,
    )
  })

  const text = withTopLevelForms(withoutZones.text, boardWhere, forms)
  assertStillParses(text, boardWhere)

  // PROVE IT, from the bytes just built rather than from the intent to build
  // them: every derived centre must now carry a hole, and no hole may sit
  // anywhere else. This is the same comparison `derivedHardware` makes when it
  // resolves the keepouts, run here so a bad write fails at the write.
  const placed = placedMountingHoles(text, boardWhere)
  if (placed.length !== holes.length) {
    throw new Error(
      `${boardWhere}: wrote ${holes.length} mounting holes but reading the result back finds ` +
        `${placed.length} (${placed.map((p) => `${p.ref} at (${p.x}, ${p.y})`).join(", ")}). ` +
        "Either a form did not land, or this board already carried a footprint that this tool " +
        "counts as one of its own holes - an MH-shaped reference on an all-NPTH footprint, or an " +
        "instance of this project's mounting footprint that the removal arm did not match. " +
        "It REFUSES rather than removing the extra one: deleting a footprint nobody asked about " +
        "is the defect this whole predicate exists to prevent.",
    )
  }
  for (const hole of holes) {
    if (!placed.some((p) => Math.hypot(p.x - hole.x, p.y - hole.y) < 1e-6)) {
      throw new Error(`${boardWhere}: no mounting hole landed at the ${hole.corner} centre (${hole.x}, ${hole.y})`)
    }
  }

  // NAMED IN THE REPORT, not only in the return value, so a deletion is visible
  // to someone reading the tool's output and not only to a caller that thought
  // to look.
  for (const gone of removed) {
    report.push(`REMOVED ${gone.reference} (${gone.library}) - ${gone.why}`)
  }

  // AND THE INVERSE CASE IS REPORTED TOO, because "visible" cuts both ways. A
  // footprint that is a hole BY SHAPE but not one of ours - someone else's
  // `H1`, a heatsink's fixation holes - is left alone, which is the whole point
  // of the identity test. But silence about it would mean a reader cannot tell
  // "the tool saw it and left it" from "the tool never looked", and the second
  // is what two rounds of this defect felt like from outside. Each gets a line.
  //
  // WHAT THIS DOES NOT DO, named rather than implied: give those holes an
  // envelope keepout. The approved rule declares FOUR holes at derived corners
  // and says nothing about hardware somebody else put on the board, so copper
  // may run under a foreign hole's washer as far as this tooling is concerned.
  const foreign = parseSexpr(text)
    .nodes.filter((n) => n.name === "footprint")
    .filter((n) => isMountingHoleFootprint(n) && !isOurMountingHole(n))
    .map((n) => ({
      reference: n.nodes.find((c) => c.name === "property" && c.atoms[0] === "Reference")?.atoms[1] ?? "?",
      library: n.atoms[0] ?? "?",
    }))
  for (const left of foreign) {
    report.push(
      `LEFT ALONE ${left.reference} (${left.library}) - all-NPTH but not one of this tool's ` +
        "holes, so it keeps its place and gets no envelope keepout",
    )
  }
  // THE ACCOUNTING, over the board's own bytes both sides of the edit:
  // after === before - removed + added, with every discrepancy named.
  //
  // **THIS REPLACED A COUNT COMPARISON THAT WAS NEARLY TAUTOLOGICAL.** It
  // checked `withoutHoles.removed !== removed.length` - a number the removal
  // callback produces against a number pushed on the line above it - so it
  // caught the next `return true` added without a matching push and nothing
  // else, not a wrong predicate, which is the defect that actually happened
  // twice. And no test could reach its throw without editing this file, so its
  // only evidence was a mutation in a transcript. `./footprint-accounting.ts`
  // is a pure function over four arguments, it compares SETS rather than the
  // editing mechanism's own bookkeeping - so a footprint dropped by a path
  // nobody instrumented is still caught - and
  // `tests/pcb/footprint-accounting.test.ts` drives every one of its refusals.
  verifyFootprintAccounting({
    before: footprintsOf(boardText, `${boardWhere} before`),
    after: footprintsOf(text, `${boardWhere} after`),
    removed: removed.map((gone) => gone.uuid),
    added: holes.map((_hole, index) => uuidFor("fp", index)),
    where: boardWhere,
  })

  return {
    text,
    removed,
    removedZones: withoutZones.removed,
    report,
  }
}

if (import.meta.main) {
  const [board, rules, mode] = process.argv.slice(2)
  if (board === undefined || rules === undefined) {
    throw new Error(
      "usage: bun tools/pcb/place-mounting-holes.ts <board.kicad_pcb> <placement-rules.json> [--write]\n" +
        "  Without --write it reports the four derived positions and changes nothing.",
    )
  }
  const library = path.resolve(
    import.meta.dir,
    "../../circuits/pt2399-core/pt2399-core.pretty",
    `${MOUNTING_FOOTPRINT}.kicad_mod`,
  )
  const text = fs.readFileSync(board, "utf8")
  console.log(`outline ${describeBounds(outlineBounds(text, board))}`)
  const result = withMountingHardware(text, board, rules, library)
  for (const line of result.report) console.log(`  ${line}`)
  if (mode === "--write") {
    fs.writeFileSync(board, result.text)
    console.log(
      `replaced ${result.removed.length} mounting-hole footprint(s) and ` +
        `${result.removedZones} Rule Area(s) in ${board}`,
    )
  } else if (mode === undefined) {
    console.log("nothing written; pass --write")
  } else {
    throw new Error(`unrecognised argument ${JSON.stringify(mode)}; only --write is accepted.`)
  }
}
