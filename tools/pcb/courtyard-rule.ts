/**
 * THE OWNER'S HAND-ASSEMBLY SPACING AS A KiCad CUSTOM DESIGN RULE - the second
 * of the two mechanisms his own criteria file names for it.
 *
 * `circuits/pt2399-core/placement-rules.json` `separation.part_to_part` records
 * the directive and the figure: *"remember that I have fingers, so I need
 * enough room between parts to use my fingers. I'm not a pick and place
 * machine"* and *"Use 2mm min spacing"*. Its `enforced_by` names two mechanisms
 * at one number, deliberately, the same pattern the mounting envelope uses:
 *
 *  1. the PLACER, `--clearance 2.0`, which is a hard veto on candidate
 *     positions while a placement is being made;
 *  2. a KiCad `(constraint courtyard_clearance (min 2mm))` custom design rule,
 *     so **the shipped board is checkable independently of the placer that
 *     produced it**.
 *
 * This file is the second one. It GENERATES the `.kicad_dru` from the approved
 * figure and verifies the committed file still matches it, because a `.kicad_dru`
 * is a hand-editable text file that nothing else in this repository looks at:
 * `./fab-standard.ts` checks the `.kicad_pro`'s rules and severities and says in
 * its own header what it does not cover, and a custom rule file that was
 * deleted, renamed or quietly loosened would leave `make drc-pt2399-core`
 * passing with the spacing unchecked. That is the skipped-check-that-looks-like-
 * a-pass this repository's workflow exists to refuse.
 *
 * **WHAT IT REPORTS, MEASURED ON THE PINNED KiCad 10.0.5 RATHER THAN ASSUMED.**
 * A `courtyard_clearance` violation arrives as type `courtyards_overlap` at
 * `error` severity - *"Courtyards overlap (rule 'hand assembly courtyard
 * clearance' clearance 2.5000 mm; actual 2.0100 mm)"*, naming both footprints.
 * That type is ALREADY in `./drc-report.ts`'s `REQUIRED_ACTIVE_CHECKS`, so this
 * mechanism needed no change to that list - which matters, because that list is
 * not this task's to widen. `tests/pcb/courtyard-rule.test.ts` measures it both
 * ways on every run: at the declared minimum the settled board reports none, and
 * at a tightened minimum it reports one per offending pair.
 *
 * **IT IS A FLOOR AND NOT A TARGET.** The rule constrains courtyard-to-courtyard
 * distance, so it fails a board whose parts are CLOSER than the figure and says
 * nothing about one whose parts are further apart. Spreading parts out trades
 * against `floorplan-intent.json`'s `decaps.max_distance_mm`, and both numbers
 * are the owner's.
 */
import fs from "node:fs"
import path from "node:path"

/** The rule's name in the `.kicad_dru`, which KiCad quotes back in every violation. */
export const RULE_NAME = "hand assembly courtyard clearance"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * The minimum part-to-part courtyard gap the approved rules declare.
 *
 * Read, never defaulted. A default here would be a spacing figure nobody ruled
 * on, enforced by DRC, looking exactly like one that was - and the figure this
 * one replaced arrived precisely that way: `separation.part_to_part` records
 * that the board's spacing was silently 0.25 mm because the placer's
 * `--clearance` flag defaults to the Default net class's COPPER clearance.
 */
export function minPartGapMm(rules: unknown, where: string): number {
  const separation = isRecord(rules) ? rules["separation"] : undefined
  const partToPart = isRecord(separation) ? separation["part_to_part"] : undefined
  const value = isRecord(partToPart) ? partToPart["min_gap_mm"] : undefined
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(
      `${where}: no positive separation.part_to_part.min_gap_mm. This is the owner's ` +
        "hand-assembly spacing and is read from the approved rules, never defaulted: a defaulted " +
        "figure would be a DRC-enforced criterion nobody authored.",
    )
  }
  return value
}

/** Trailing-zero-free millimetres, as KiCad writes them. */
function mm(value: number): string {
  return `${Number(value.toFixed(4))}mm`
}

/**
 * The whole `.kicad_dru` file for a board, from the approved figure.
 *
 * ONE RULE AND NOTHING ELSE. Every other constraint this board is held to lives
 * in the `.kicad_pro` and is checked against `docs/standards/pcbway-fab-rules.md`
 * by `./fab-standard.ts`; a second home for any of them would be two places to
 * keep correct. `tests/pcb/placement-intent-geometry.test.ts` records the
 * separate decision to write NO net-to-net isolation rule here, and why.
 */
export function courtyardRuleText(rules: unknown, where: string): string {
  const gap = minPartGapMm(rules, where)
  return [
    "(version 1)",
    "",
    `(rule "${RULE_NAME}"`,
    "\t(constraint courtyard_clearance",
    `\t\t(min ${mm(gap)}))`,
    "\t(severity error)",
    ")",
    "",
  ].join("\n")
}

/** Where a board's custom design rules live: the board's own basename. */
export function druPathFor(boardPath: string): string {
  return path.join(path.dirname(boardPath), `${path.basename(boardPath, ".kicad_pcb")}.kicad_dru`)
}

/**
 * Refuses unless the board's `.kicad_dru` is exactly what the approved figure
 * generates.
 *
 * COMPARED BY CONTENT, not by existence and not by timestamp. A file that
 * exists but declares a looser minimum is the dangerous case: DRC runs, reports
 * nothing, and the spacing is unchecked at the figure that was approved.
 */
export function verifyCourtyardRule(boardPath: string, rulesPath: string): void {
  const dru = druPathFor(boardPath)
  const expected = courtyardRuleText(JSON.parse(fs.readFileSync(rulesPath, "utf8")), rulesPath)
  if (!fs.existsSync(dru)) {
    throw new Error(
      `no custom design rules at ${dru}. ${rulesPath} declares ` +
        `separation.part_to_part.min_gap_mm and names a KiCad courtyard_clearance rule as the ` +
        "second mechanism that enforces it, so without this file a clean DRC result says nothing " +
        "about part spacing. Write it with:\n" +
        `    bun tools/pcb/courtyard-rule.ts ${boardPath} ${rulesPath} --write`,
    )
  }
  const actual = fs.readFileSync(dru, "utf8")
  if (actual !== expected) {
    throw new Error(
      `${dru} is not what ${rulesPath} generates. A DRC run against it is clean against the ` +
        "wrong minimum, which is the same failure ./fab-standard.ts exists to catch in the " +
        `.kicad_pro.\n--- expected ---\n${expected}--- found ---\n${actual}`,
    )
  }
}

if (import.meta.main) {
  const [board, rules, mode] = process.argv.slice(2)
  if (board === undefined || rules === undefined) {
    throw new Error(
      "usage: bun tools/pcb/courtyard-rule.ts <board.kicad_pcb> <placement-rules.json> [--write]\n" +
        "  Without --write it VERIFIES the board's .kicad_dru against the approved figure and\n" +
        "  exits non-zero naming the drift. With --write it writes that file.",
    )
  }
  const dru = druPathFor(board)
  if (mode === "--write") {
    const text = courtyardRuleText(JSON.parse(fs.readFileSync(rules, "utf8")), rules)
    fs.writeFileSync(dru, text)
    console.log(`wrote ${dru}:`)
    console.log(text.replace(/^/gm, "  "))
  } else if (mode === undefined) {
    verifyCourtyardRule(board, rules)
    console.log(`${dru} matches ${minPartGapMm(JSON.parse(fs.readFileSync(rules, "utf8")), rules)} mm from ${rules}`)
  } else {
    throw new Error(`unrecognised argument ${JSON.stringify(mode)}; only --write is accepted.`)
  }
}
