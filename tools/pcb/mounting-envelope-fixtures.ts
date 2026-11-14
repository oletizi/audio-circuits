/**
 * THE THREE BOARDS THAT PROVE THE MOUNTING-HARDWARE ENVELOPE GATE EXISTS, and
 * the one that proves it does not reject its own mounting hole.
 *
 * Task 8 Step 4b of
 * `docs/superpowers/plans/2026-11-12-agent-pcb-place-and-route-phase-1.md`
 * specifies them, and specifies the COMPONENT one's geometry exactly, because
 * the obvious version of it proves nothing:
 *
 * | fixture             | geometry                                                  | must produce             |
 * | ------------------- | --------------------------------------------------------- | ------------------------ |
 * | clean control       | the mounting footprint at the Rule Area's centre, nothing else | ZERO violations     |
 * | component intrusion | a part whose ORIGIN AND PADS ARE OUTSIDE the envelope, body overlapping it | `courtyards_overlap` |
 * | copper intrusion    | a track entering the envelope                             | `items_not_allowed`      |
 *
 * **THE CLEAN CONTROL IS NOT A FORMALITY.** An earlier draft of this mechanism
 * used one Rule Area with `pads` and `footprints` also `not_allowed`, and it
 * rejected the mounting hole it surrounds - `items_not_allowed` on both the
 * `NPTH pad` and the `Footprint`. The control is what found that, and it is why
 * all three fixtures carry the mounting footprint rather than only the two that
 * must fail.
 *
 * **AND THE COMPONENT FIXTURE'S GEOMETRY IS CHECKED HERE, AT GENERATION TIME,
 * NOT ASSUMED.** A part placed wholly inside the envelope is caught by several
 * mechanisms at once and would pass Step 4b while the actual requirement - a
 * part whose BODY overlaps the washer while its origin and pads sit clear -
 * went untested. So this generator measures the three conditions off the board
 * it just built and refuses to write a fixture that does not meet them. The
 * test re-measures them from the committed bytes, so neither side is taking the
 * other's word for it.
 *
 * WHY A GENERATOR AND NOT THREE HAND-WRITTEN BOARDS. The fixtures must carry
 * the project-local mounting footprint's REAL courtyard, and a hand-written
 * copy of it could drift from the library file with every test still green.
 * Everything here is read from a file: the base board is the committed empty
 * board, the mounting hole is the project library's own bytes, the intruding
 * part is KiCad's installed footprint, and the envelope diameter is the
 * approved `placement-rules.json` rule.
 *
 *     bun tools/pcb/mounting-envelope-fixtures.ts            report, write nothing
 *     bun tools/pcb/mounting-envelope-fixtures.ts --write    rewrite the fixtures
 */
import fs from "node:fs"
import path from "node:path"
import { placedCourtyards, placedPads, withOutlineRect } from "./board-outline.ts"
import { withTopLevelForms } from "./board-forms.ts"
import { footprintInstanceForm } from "./footprint-instance.ts"
import {
  MOUNTING_FOOTPRINT, mountingHoleRule, readMountingFootprint, ruleAreaForm,
} from "./mounting-hardware.ts"
import { LIBRARY_ROOT } from "../../lib/kicad/pin-pattern-sources.ts"
import type { Bounds } from "./resolve-intent-zones.ts"

const REPO = path.resolve(import.meta.dir, "../..")
const EMPTY_BOARD = path.join(REPO, "tests/fixtures/pcb/pt2399-core-empty/pt2399-core.kicad_pcb")
const PROJECT = path.join(REPO, "circuits/pt2399-core/pt2399-core.kicad_pro")
const LIBRARY = path.join(REPO, "circuits/pt2399-core/pt2399-core.pretty", `${MOUNTING_FOOTPRINT}.kicad_mod`)
const RULES = path.join(REPO, "circuits/pt2399-core/placement-rules.json")
export const FIXTURE_ROOT = path.join(REPO, "tests/fixtures/pcb")
export const BOARD_BASENAME = "envelope"

/**
 * The intruder. A radial electrolytic is the right shape of part for this test:
 * its courtyard is a circle around the BODY while its two pads sit at one end
 * of it, so there is a wide band of positions where the body overlaps the
 * envelope and neither pad does. `CP_Radial_D10.0mm_P5.00mm` is the largest
 * body this circuit's own catalogue uses (parts/electrolytic-470uf-35v-radial-10x16mm.json).
 */
export const INTRUDER_FOOTPRINT = "Capacitor_THT:CP_Radial_D10.0mm_P5.00mm"

/** A 50 mm square at (10, 10): big enough that nothing here is near an edge. */
export const FIXTURE_OUTLINE: Bounds = { x0: 10, y0: 10, x1: 60, y1: 60 }
export const HOLE: { readonly x: number; readonly y: number } = { x: 35, y: 35 }

/**
 * Where the intruder's origin goes, measured in mm to the right of the hole.
 *
 * Not tuned by hand: `--write` recomputes the feasible window from the
 * footprint on disk and refuses if this value is outside it, so a KiCad release
 * that reshapes the part fails loudly instead of producing a fixture that
 * proves something weaker.
 */
export const INTRUDER_OFFSET_MM = 5.0

/** Fixed uuids, so re-running the generator produces byte-identical fixtures. */
const UUID = {
  outline: "e5e70000-0000-4000-8000-000000000001",
  hole: "e5e70000-0000-4000-8000-000000000002",
  zone: "e5e70000-0000-4000-8000-000000000003",
  intruder: "e5e70000-0000-4000-8000-000000000004",
  track: "e5e70000-0000-4000-8000-000000000005",
}

export interface Fixture {
  readonly dir: string
  readonly board: string
  readonly notes: string
}

function distance(box: Bounds, cx: number, cy: number): number {
  const dx = Math.max(box.x0 - cx, 0, cx - box.x1)
  const dy = Math.max(box.y0 - cy, 0, cy - box.y1)
  return Math.hypot(dx, dy)
}

/** The track that crosses the envelope, straight through its centre on `F.Cu`. */
function trackForm(): string {
  return [
    "(segment",
    `\t\t(start ${HOLE.x - 12} ${HOLE.y})`,
    `\t\t(end ${HOLE.x + 12} ${HOLE.y})`,
    "\t\t(width 0.3)",
    '\t\t(layer "F.Cu")',
    "\t\t(net 0)",
    `\t\t(uuid "${UUID.track}")`,
    "\t)",
  ].join("\n")
}

/** The base every fixture shares: outline, mounting hole, Rule Area. */
function baseBoard(): string {
  const rule = mountingHoleRule(JSON.parse(fs.readFileSync(RULES, "utf8")), RULES)
  const empty = fs.readFileSync(EMPTY_BOARD, "utf8")
  const outlined = withOutlineRect(empty, EMPTY_BOARD, FIXTURE_OUTLINE, UUID.outline)
  const hole = footprintInstanceForm(readMountingFootprint(LIBRARY), LIBRARY, {
    library: "pt2399-core",
    name: MOUNTING_FOOTPRINT,
    // REF** is kept deliberately: the plan's own measured output names
    // `NPTH pad of REF**` and `Footprint REF**`, so a renamed fixture would not
    // be comparable with the measurement that specified these fixtures.
    reference: "REF**",
    x: HOLE.x,
    y: HOLE.y,
    uuid: UUID.hole,
    locked: false,
    boardOnly: false,
  })
  const zone = ruleAreaForm({
    cx: HOLE.x,
    cy: HOLE.y,
    envelopeDiameterMm: rule.envelopeDiameterMm,
    name: "mounting_hole_envelope",
    uuid: UUID.zone,
  })
  return withTopLevelForms(outlined.text, EMPTY_BOARD, [hole, zone])
}

/** The component-intrusion board, with its three required conditions measured. */
function componentBoard(): { readonly text: string; readonly report: readonly string[] } {
  const rule = mountingHoleRule(JSON.parse(fs.readFileSync(RULES, "utf8")), RULES)
  const radius = rule.envelopeDiameterMm / 2
  const [library, name] = INTRUDER_FOOTPRINT.split(":") as [string, string]
  // `LIBRARY_ROOT` is `lib/`'s own resolution of the installed footprint root -
  // KICAD_FOOTPRINTS, else derived from the resolved kicad-cli. Deliberately
  // not tests/kicad/footprint-library.ts's identical expression: tools/ must
  // not import tests/.
  const file = path.join(LIBRARY_ROOT, `${library}.pretty`, `${name}.kicad_mod`)
  if (!fs.existsSync(file)) {
    throw new Error(
      `the intruding footprint ${INTRUDER_FOOTPRINT} is not at ${file}. Install KiCad or set ` +
        "KICAD_FOOTPRINTS. This refuses rather than substituting another part: the fixture's " +
        "whole value is that the part's BODY overlaps the envelope while its pads do not, and " +
        "that is a property of this footprint's geometry.",
    )
  }
  const instance = footprintInstanceForm(fs.readFileSync(file, "utf8"), file, {
    library,
    name,
    reference: "P1",
    x: HOLE.x + INTRUDER_OFFSET_MM,
    y: HOLE.y,
    uuid: UUID.intruder,
    locked: false,
    boardOnly: false,
  })
  const text = withTopLevelForms(baseBoard(), EMPTY_BOARD, [instance])

  const courtyard = placedCourtyards(text, "component fixture").find((c) => c.ref === "P1")
  if (courtyard === undefined) throw new Error("component fixture: P1 did not land on the board")
  const pads = placedPads(text, "component fixture").filter((p) => p.ref === "P1")
  if (pads.length === 0) throw new Error("component fixture: P1 has no pads")

  const originGap = Math.hypot(INTRUDER_OFFSET_MM, 0) - radius
  const padGap = Math.min(...pads.map((p) => distance(p.box, HOLE.x, HOLE.y))) - radius
  const bodyReach = radius - distance(courtyard.box, HOLE.x, HOLE.y)
  const report = [
    `envelope radius ${radius} mm at (${HOLE.x}, ${HOLE.y})`,
    `P1 origin ${INTRUDER_OFFSET_MM.toFixed(2)} mm from the centre: ${originGap.toFixed(3)} mm OUTSIDE the envelope`,
    `P1's nearest pad: ${padGap.toFixed(3)} mm OUTSIDE the envelope`,
    `P1's courtyard: ${bodyReach.toFixed(3)} mm INSIDE the envelope`,
  ]
  const problems: string[] = []
  if (originGap <= 0) problems.push(`P1's origin is inside the envelope (${originGap.toFixed(3)} mm)`)
  if (padGap <= 0) problems.push(`P1 has a pad inside the envelope (${padGap.toFixed(3)} mm)`)
  if (bodyReach <= 0) problems.push(`P1's courtyard does not reach the envelope (${bodyReach.toFixed(3)} mm)`)
  if (problems.length > 0) {
    throw new Error(
      `the component-intrusion fixture would not test what it exists to test:\n  - ${problems.join("\n  - ")}\n` +
        "The requirement is a part whose BODY overlaps the washer while its ORIGIN AND PADS sit " +
        "clear of it - a part wholly inside the envelope is caught by several mechanisms and " +
        `would pass this step vacuously. Adjust INTRUDER_OFFSET_MM (now ${INTRUDER_OFFSET_MM}) or ` +
        "INTRUDER_FOOTPRINT, re-run, and read the measurements this prints.",
    )
  }
  return { text, report }
}

export function fixtures(): readonly { readonly name: string; readonly text: string; readonly notes: string }[] {
  const component = componentBoard()
  return [
    {
      name: "mounting-envelope-clean",
      text: baseBoard(),
      notes: [
        "THE CLEAN CONTROL for the mounting-hardware envelope gate: the project-local M3 mounting",
        "footprint at the centre of its own 7.0 mm Rule Area, and nothing else on the board.",
        "",
        "It must produce ZERO violations. That is not a formality: an earlier draft of the",
        "mechanism made `pads` and `footprints` `not_allowed` in the Rule Area as well as copper,",
        "and it then rejected the very mounting hole it surrounds - items_not_allowed on both the",
        "NPTH pad and the Footprint. This fixture is what found that, and the flags it proves are",
        "tracks/vias/copperpour not_allowed with pads and footprints ALLOWED.",
        "",
        "Generated by tools/pcb/mounting-envelope-fixtures.ts; do not hand-edit. The mounting",
        "footprint's bytes come from circuits/pt2399-core/pt2399-core.pretty/ so the fixture",
        "cannot carry a courtyard the library does not.",
      ].join("\n"),
    },
    {
      name: "mounting-envelope-component",
      text: component.text,
      notes: [
        "THE COMPONENT INTRUSION: a radial electrolytic (P1) whose ORIGIN AND BOTH PADS sit",
        "OUTSIDE the 7.0 mm envelope while its courtyard overlaps it. It must produce",
        "courtyards_overlap at error severity.",
        "",
        "THE GEOMETRY IS SPECIFIED THIS WAY BECAUSE THE OBVIOUS VERSION PROVES NOTHING. A part",
        "placed wholly inside the envelope is caught by several mechanisms at once, so a fixture",
        "like that would pass while the actual requirement went untested: courtyards_overlap is",
        "the ONLY check that catches a part whose body overlaps the washer with its pads clear,",
        "and it compares COURTYARDS - which is why the mounting footprint's courtyard has to be",
        "the envelope rather than the stock 6.9 mm.",
        "",
        "Measured at generation time, and re-measured from these bytes by",
        "tests/pcb/mounting-hardware.test.ts:",
        ...component.report.map((line) => `  ${line}`),
        "",
        "Generated by tools/pcb/mounting-envelope-fixtures.ts; do not hand-edit.",
      ].join("\n"),
    },
    {
      name: "mounting-envelope-copper",
      text: withTopLevelForms(baseBoard(), EMPTY_BOARD, [trackForm()]),
      notes: [
        "THE COPPER INTRUSION: a 0.3 mm F.Cu track straight through the centre of the 7.0 mm",
        "envelope. It must produce items_not_allowed at error severity.",
        "",
        "It is also the only proof that the Rule Area PARSED. A zone form KiCad cannot read is",
        "not an error - the board loads and the keep-out simply does not exist - so the clean",
        "control alone cannot tell a working mechanism from an absent one. This fixture can:",
        "no violation here means no Rule Area.",
        "",
        "Generated by tools/pcb/mounting-envelope-fixtures.ts; do not hand-edit.",
      ].join("\n"),
    },
  ]
}

/**
 * Each fixture carries its OWN copy of the project library, and that is not a
 * second source of truth.
 *
 * MEASURED: with the nickname unresolvable, `kicad-cli pcb drc` adds
 * `lib_footprint_issues` at warning severity - *"The current configuration does
 * not include the footprint library 'pt2399-core'"* - and the clean control is
 * then not the zero-violation board Step 4b specifies. The tests copy a fixture
 * to a scratch directory before running DRC, so a table pointing out of the
 * fixture would not survive the copy either.
 *
 * The copy is WRITTEN FROM `circuits/pt2399-core/pt2399-core.pretty/` by this
 * generator and compared against it byte for byte by the test, so a courtyard
 * that changed in one place and not the other is a red test rather than a
 * fixture quietly proving the wrong diameter.
 */
export const FIXTURE_LIB_TABLE = [
  "(fp_lib_table",
  "\t(version 7)",
  '\t(lib (name "pt2399-core")(type "KiCad")(uri "${KIPRJMOD}/pt2399-core.pretty")(options "")' +
    '(descr "A copy of the project library, written by tools/pcb/mounting-envelope-fixtures.ts ' +
    'and checked against the original by tests/pcb/mounting-hardware.test.ts. Without it DRC ' +
    'reports lib_footprint_issues and the clean control is no longer a zero-violation board."))',
  ")",
].join("\n")

if (import.meta.main) {
  const write = process.argv.includes("--write")
  const project = fs.readFileSync(PROJECT, "utf8")
  const library = readMountingFootprint(LIBRARY)
  for (const fixture of fixtures()) {
    const dir = path.join(FIXTURE_ROOT, fixture.name)
    console.log(`${fixture.name}: ${fixture.text.split("\n").length} lines`)
    if (!write) continue
    fs.mkdirSync(path.join(dir, "pt2399-core.pretty"), { recursive: true })
    fs.writeFileSync(path.join(dir, "pt2399-core.pretty", `${MOUNTING_FOOTPRINT}.kicad_mod`), library)
    fs.writeFileSync(path.join(dir, "fp-lib-table"), `${FIXTURE_LIB_TABLE}\n`)
    fs.writeFileSync(path.join(dir, `${BOARD_BASENAME}.kicad_pcb`), fixture.text)
    // The project file is the pt2399-core one with its filename corrected: the
    // three gate-critical severities must be at `error` here too, and
    // ./fab-standard.ts is what checks that in the test.
    fs.writeFileSync(
      path.join(dir, `${BOARD_BASENAME}.kicad_pro`),
      project.replace('"filename": "pt2399-core.kicad_pro"', `"filename": "${BOARD_BASENAME}.kicad_pro"`),
    )
    fs.writeFileSync(path.join(dir, "NOTES.txt"), `${fixture.notes}\n`)
    console.log(`  wrote ${dir}`)
  }
  if (!write) console.log("nothing written; pass --write to rewrite the fixtures")
}
