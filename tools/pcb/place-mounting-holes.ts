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
import { outlineBounds } from "./resolve-intent-zones.ts"
import { describeBounds } from "./board-outline.ts"
import {
  MOUNTING_FOOTPRINT, isMountingHoleFootprint, mountingHoleRule, mountingHoles, placedMountingHoles,
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

export interface PlacedHardware {
  readonly text: string
  readonly removedFootprints: number
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

  // REMOVE FIRST, by what the form IS rather than by its uuid: a hole placed by
  // an earlier run of this tool at a stale corner must go, and so must one
  // placed by hand in pcbnew.
  //
  // **THE REMOVAL TEST IS THE DETECTION TEST, and it is one function so the two
  // cannot drift.** This predicate was its own regex -
  // `/\(pad\s+""\s+np_thru_hole/` over the form's text - which is `some` where
  // `isMountingHoleFootprint` is `every`, so it matched any part carrying one
  // mechanical hole beside its electrical pads and DELETED IT SILENTLY. A
  // vertical pot with an anti-rotation pin, an audio jack, a panel switch: 128
  // of them across four installed libraries. The read-back check below could not
  // catch it, because a part that was never a hole does not change "wrote 4,
  // found 4". `tests/pcb/mounting-hole-placement.test.ts` puts a real
  // mixed-pad footprint from the installed library on a board and asserts it
  // survives; a hand-built fixture would not have established it.
  //
  // The library-name clause stays as a second, NARROWER reason to remove: a
  // stale instance of this exact footprint that somehow stopped looking like a
  // hole must still go, or the board would carry two MH1s. It matches on the
  // footprint's own library id, not on the form containing the string anywhere.
  const withoutHoles = withoutTopLevelForms(boardText, boardWhere, (form, body) => {
    if (form.name !== "footprint") return false
    const node = parseSexpr(body)
    if ((node.atoms[0] ?? "").endsWith(`:${MOUNTING_FOOTPRINT}`)) return true
    return isMountingHoleFootprint(node)
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
        `${placed.length}. Something else on this board has non-plated-only pads, or a form did ` +
        "not land.",
    )
  }
  for (const hole of holes) {
    if (!placed.some((p) => Math.hypot(p.x - hole.x, p.y - hole.y) < 1e-6)) {
      throw new Error(`${boardWhere}: no mounting hole landed at the ${hole.corner} centre (${hole.x}, ${hole.y})`)
    }
  }

  return {
    text,
    removedFootprints: withoutHoles.removed,
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
      `replaced ${result.removedFootprints} mounting-hole footprint(s) and ` +
        `${result.removedZones} Rule Area(s) in ${board}`,
    )
  } else if (mode === undefined) {
    console.log("nothing written; pass --write")
  } else {
    throw new Error(`unrecognised argument ${JSON.stringify(mode)}; only --write is accepted.`)
  }
}
