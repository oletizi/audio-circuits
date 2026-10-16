/**
 * **THE MILESTONE: can the constructive seeder produce a sound board for the
 * Pultec low-boost section?** Seven tasks removed four specific obstacles -
 * a strip may carry several nets with the cut derived, a moulded pin field may
 * be laid in any of four facings, a panel-mounted control reaches the board as
 * declared off-board landing pads, and an ordering may state a strip per net
 * rather than one uniform stride. This file is where it is found out whether
 * that was sufficient, on the circuit the repository is named for.
 *
 * **WHAT A PASS HERE ESTABLISHES, AND IT IS MODEL-LEVEL ONLY.** That the MODEL
 * can represent a Pultec section and that `seedsFrom` builds a candidate on
 * which `violationsOf` is empty - every reference net whole in one copper
 * component, no component carrying two nets, over the cuts `derivedCuts`
 * derives for that board. **IT DOES NOT ESTABLISH THAT THE PIPELINE CAN PRODUCE
 * A BUILDABLE PULTEC LAYOUT.** Nothing here is materialised into VeroRoute,
 * nothing here is graded by `make check`, and nothing here is a board anybody
 * has built. Materialising low-boost is the next piece of work's first task,
 * and no sentence in this file may be read as claiming it is done.
 *
 * **THE SEARCH CANNOT RUN ON THIS BOARD AND THAT IS NOT TESTED HERE.**
 * `movesFrom` calls `geometryFor` for every placement, a landing pad's
 * footprint sentinel has no recorded lead span, and it refuses by name
 * (`stripboard-moves-part-geometry-unreadable`). That refusal is pre-existing,
 * loud, and ruled to the next piece of work. It is recorded in this comment
 * rather than asserted below, because a test asserting it would make the
 * defect's removal a failure and would read as a claim that refusing is
 * correct. The milestone is the SEEDER, not the search.
 *
 * **NO FIGURE BELOW IS A TARGET.** Cuts, wires, bridges and `F` are reported in
 * this task's report and asserted nowhere: the owner prefers as few cuts as
 * possible and his own boards carry five, and an agent pinning a number it
 * produced would be *"authoring the acceptance criteria for the artifact it is
 * producing"*. What IS asserted is soundness, completeness of the placement,
 * and that both ordering forms reach it - three properties, none of them a
 * score.
 *
 * **EVERY ASSERTION OVER A COLLECTION IS PRECEDED BY A COUNT OF WHAT IS IN IT.**
 * `expect(sound.length).toBeGreaterThan(0)` over a list nothing was ever put
 * into is this repository's recurring defect - found nine times across two
 * plans - so the attempts, the forms, the sound candidates and the fields
 * examined are each counted before any property is asserted over them.
 */
import { expect, test } from "bun:test"
import { sectionBoard } from "../../../circuits/pultec/physical/board.ts"
import { LEAD_SPANS } from "../../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import type { Candidate, Grid } from "../../../lib/stripboard/board.ts"
import { derivedCuts, type ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import { describeViolations, violationsOf } from "../../../lib/stripboard/invariants.ts"
import type { Ordering } from "../../../lib/stripboard/seed-homes.ts"
import { leadsOf, type SeedNetlist, type SeedPart } from "../../../lib/stripboard/seed-model.ts"
import { seedPartsFrom } from "../../../lib/stripboard/seed-parts.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import { loadRules } from "../../../tools/stripboard/rules.ts"
import { assignStrips, referenceNetsFor } from "../../../tools/stripboard/seed-arrangement.ts"
import { deriveTargets, type BoardTargets } from "../../../tools/stripboard/targets.ts"
import { derivedOrderings } from "./seed-fixtures.ts"

/** The section this plan is about. One board, named as `boards/` spells it. */
const SECTION = "low-boost"
const BOARD = `pultec-${SECTION}`

/**
 * The stride ordering strides tried, and the `assignStrips` seeds tried.
 *
 * The seeds are `stripboard/rules.json`'s own reviewed list, read through
 * `loadRules` rather than written here, because which restarts the pipeline
 * takes is a settled parameter and a second list in a test would be a second
 * thing to keep in step. The strides are a test-side choice and nothing more:
 * one, two and three holes between adjacent nets, three rules over the same
 * netlist, none of them tuned after seeing a score.
 */
const STRIDES: readonly number[] = [1, 2, 3]

/** Everything the low-boost section hands the seeder. */
interface LowBoost {
  readonly netlist: SeedNetlist
  readonly nets: ReferenceNets
  readonly targets: BoardTargets
  readonly stock: Grid
}

/**
 * The low-boost section as a `SeedNetlist`, by the route the tools already use.
 *
 * **A TEST MAY IMPORT `tools/` AND THE MODULES UNDER TEST MAY NOT**, which is
 * the whole reason this assembly lives here: `deriveTargets` and
 * `referenceNetsFor` read the circuit, and `lib/stripboard/` must not.
 *
 * **THE FOOTPRINT MAP IS BUILT THE WAY `prepareBoard` BUILDS ONE** - ref from
 * the board's designator index, footprint from `component.part?.footprint` -
 * and **RESIDENCY IS DECLARED RATHER THAN DERIVED FROM IT**. The declaration is
 * `sectionBoard`'s `offBoardIds`, which is `circuits/pultec/off-board.ts`'s set
 * plus the stand-in groups' own off-board ids. Taking residency as "whatever
 * the footprint map leaves out" would make the two one claim, and
 * `seedPartsFrom`'s `parts-residency-disagrees` refusal exists precisely
 * because they are two: a ref with no footprint is either panel-mounted or a
 * hole in the physicalization, and those must never become the same thing.
 */
function lowBoost(): LowBoost {
  const board = sectionBoard(SECTION)
  const rules = loadRules()
  const targets = deriveTargets(board.network, rules.stockRows, BOARD)
  const nets = referenceNetsFor(targets)
  const footprints = new Map<string, string>()
  const offBoard = new Set<string>()
  for (const component of board.network.components) {
    const ref = board.designators[component.id]
    if (ref === undefined) continue
    const footprint = component.part?.footprint
    if (footprint !== undefined) footprints.set(ref, footprint)
    if (board.offBoardIds.has(component.id)) offBoard.add(ref)
  }
  return {
    netlist: seedPartsFrom(nets, footprints, { patterns: PIN_PATTERNS, spans: LEAD_SPANS }, offBoard),
    nets,
    targets,
    stock: { strips: rules.stockRows, columns: rules.stockCols },
  }
}

/** One ordering tried: the candidate it built, or the message it refused with. */
interface Attempt {
  readonly name: string
  readonly form: "stride" | "stated"
  readonly candidate: Candidate | null
  readonly refusal: string
}

/**
 * Both ordering forms over one netlist: the stride form through
 * `derivedOrderings`, the stated form through the repository's own
 * reverse-Cuthill-McKee arrangement.
 *
 * **AN ORDERING THAT REFUSES IS RECORDED AND NOT DROPPED.** `seedsFrom` throws
 * on a net it cannot home or a join it cannot route, and a `catch` that
 * returned nothing would leave a refusal looking exactly like an ordering
 * nobody tried. Each attempt is built alone for the same reason: `seedsFrom`
 * maps over its orderings, so one refusal inside a batch would lose every
 * candidate beside it.
 */
function attemptsFor(board: LowBoost): readonly Attempt[] {
  const orderings: readonly { readonly form: "stride" | "stated"; readonly ordering: Ordering }[] = [
    ...STRIDES.flatMap((stride) =>
      derivedOrderings(board.netlist, stride).map((ordering) => ({ form: "stride" as const, ordering })),
    ),
    ...loadRules().seeds.map((seed) => ({
      form: "stated" as const,
      ordering: { name: `rcm s${seed}`, homes: assignStrips(board.targets, seed) },
    })),
  ]
  return orderings.map(({ form, ordering }) => {
    try {
      const built = seedsFrom(board.netlist, board.stock, LEAD_SPANS, [ordering])[0]
      if (built === undefined) {
        throw new Error(`seedsFrom returned no candidate for ordering "${ordering.name}"`)
      }
      return { name: ordering.name, form, candidate: built, refusal: "" }
    } catch (error) {
      return {
        name: ordering.name,
        form,
        candidate: null,
        refusal: error instanceof Error ? error.message : String(error),
      }
    }
  })
}

/** An attempt that built a board on which `violationsOf` is empty. */
interface Sound {
  readonly name: string
  readonly form: "stride" | "stated"
  readonly candidate: Candidate
}

/** The sound attempts, with every unsound one's violations named in the failure. */
function soundOf(board: LowBoost, attempts: readonly Attempt[]): readonly Sound[] {
  const sound: Sound[] = []
  for (const attempt of attempts) {
    const candidate = attempt.candidate
    if (candidate === null) continue
    const violations = violationsOf(candidate, derivedCuts(candidate, board.nets), board.nets)
    if (violations.length === 0) {
      sound.push({ name: attempt.name, form: attempt.form, candidate })
      continue
    }
    // `seedsFrom` refuses an unsound board itself (`stripboard-seed-unsound`),
    // so reaching here means a candidate it returned is unsound by the same
    // check it ran - which is a defect in the seeder and not a result.
    throw new Error(
      `ordering "${attempt.name}" returned a candidate seedsFrom's own checkSeed should have ` +
        `refused:\n${describeViolations(violations).join("\n")}`,
    )
  }
  return sound
}

/** The part of this netlist with that ref, or a failure naming the ref. */
function partOf(netlist: SeedNetlist, ref: string): SeedPart {
  const found = netlist.parts.find((part) => part.ref === ref)
  if (found === undefined) {
    throw new Error(`the candidate places "${ref}" and the netlist has no such part`)
  }
  return found
}

test("THE PREMISE: low-boost reaches the seeder carrying all three part kinds", () => {
  const board = lowBoost()
  expect(board.netlist.parts.length, "parts were built at all").toBeGreaterThan(0)
  expect(board.nets.size, "the reference nets were read at all").toBeGreaterThan(0)
  expect(board.targets.pinCount, "the circuit names pins at all").toBeGreaterThan(0)

  // ALL THREE KINDS, which is the capability claim rather than a size: a
  // Pultec section is the first circuit in this repository that carries a
  // moulded pin field, a two-lead passive and a panel-mounted control at once,
  // and before this plan the third of those had no kind to arrive as.
  const kinds = new Set(board.netlist.parts.map((part) => part.kind))
  expect([...kinds].sort(), "every part kind the seeder knows is exercised").toEqual([
    "fixed-field",
    "off-board",
    "two-lead",
  ])

  // EVERY NET IS NAMED BY A LEAD. A net in the reference that no part's lead
  // mentions would be a net the seeder homes and nothing ever lands on, and the
  // soundness check below would pass over it without noticing.
  const named = new Set<string>()
  for (const part of board.netlist.parts) {
    for (const lead of leadsOf(part)) named.add(lead.net)
  }
  expect(named.size, "nets were examined").toBeGreaterThan(0)
  expect([...named].sort(), "every net is named by some part's pin").toEqual(
    [...board.netlist.nets.keys()].sort(),
  )
})

test("THE MILESTONE: pultec-low-boost produces a sound candidate", () => {
  const board = lowBoost()
  expect(board.netlist.parts.length, "the premise: parts were built at all").toBeGreaterThan(0)

  const attempts = attemptsFor(board)
  expect(attempts.length, "orderings were tried at all").toBeGreaterThan(0)
  const strideAttempts = attempts.filter((attempt) => attempt.form === "stride")
  const statedAttempts = attempts.filter((attempt) => attempt.form === "stated")
  expect(strideAttempts.length, "the stride form was tried").toBeGreaterThan(0)
  expect(statedAttempts.length, "the stated form was tried").toBeGreaterThan(0)

  const sound = soundOf(board, attempts)
  expect(
    sound.length,
    `no ordering yielded a sound board; the refusals were:\n${attempts
      .filter((attempt) => attempt.candidate === null)
      .map((attempt) => `${attempt.name}: ${attempt.refusal.split("\n")[0] ?? ""}`)
      .join("\n")}`,
  ).toBeGreaterThan(0)

  // BOTH FORMS REACH IT, which is the point of Task 7 rather than a figure.
  // The stated form exists because no uniform stride can give a rigid five-pin
  // header five consecutive strips while six capacitors with a three-strip
  // reach tie to ground; that it also works is a measurement, not a target.
  expect(
    sound.filter((entry) => entry.form === "stride").length,
    "some stride ordering yields a sound board",
  ).toBeGreaterThan(0)
  expect(
    sound.filter((entry) => entry.form === "stated").length,
    "some stated ordering yields a sound board",
  ).toBeGreaterThan(0)
})

test("every sound low-boost candidate seats every part inside the stock", () => {
  const board = lowBoost()
  const sound = soundOf(board, attemptsFor(board))
  expect(sound.length, "sound candidates were found to examine").toBeGreaterThan(0)

  let examined = 0
  for (const entry of sound) {
    examined += 1
    expect(
      entry.candidate.placements.length,
      `"${entry.name}" seats every part of the netlist`,
    ).toBe(board.netlist.parts.length)
    for (const placement of entry.candidate.placements) {
      // THE PART'S OWN TERMINAL COUNT, from `leadsOf` rather than from the
      // placement: a placement compared against itself asserts nothing, which
      // is the defect this plan has been catching. An off-board control is
      // several one-pin placements sharing a ref, and every part with that ref
      // has one lead, so matching by ref answers this question unambiguously.
      expect(placement.pins.size, `"${entry.name}" seats every pin of ${placement.ref}`).toBe(
        leadsOf(partOf(board.netlist, placement.ref)).length,
      )
      for (const hole of placement.pins.values()) {
        expect(hole.strip, `${placement.ref} is on a strip of the stock`).toBeGreaterThanOrEqual(0)
        expect(hole.strip, `${placement.ref} is on a strip of the stock`).toBeLessThan(
          board.stock.strips,
        )
        expect(hole.column, `${placement.ref} is in a column of the stock`).toBeGreaterThanOrEqual(0)
        expect(hole.column, `${placement.ref} is in a column of the stock`).toBeLessThan(
          board.stock.columns,
        )
      }
    }
  }
  expect(examined, "candidates were examined").toBe(sound.length)
})

test("every sound low-boost candidate lays each five-pin field across five strips", () => {
  const board = lowBoost()
  const sound = soundOf(board, attemptsFor(board))
  expect(sound.length, "sound candidates were found to examine").toBeGreaterThan(0)

  // THE OBSTACLE THIS IS ABOUT. The junction is a 1x5 header at one-hole
  // pitch, and a field laid along ONE strip would short its five nets
  // together. The facing that puts its pins on the most distinct strips is
  // what `FIELD_FACINGS` buys, and this asserts the outcome of that choice on
  // a real circuit rather than on a fixture.
  let fieldsExamined = 0
  for (const entry of sound) {
    const fields = entry.candidate.placements.filter(
      (placement) => partOf(board.netlist, placement.ref).kind === "fixed-field",
    )
    expect(fields.length, `"${entry.name}" places the netlist's fields`).toBe(
      board.netlist.parts.filter((part) => part.kind === "fixed-field").length,
    )
    for (const field of fields) {
      fieldsExamined += 1
      const strips = new Set([...field.pins.values()].map((hole) => hole.strip))
      expect(
        strips.size,
        `"${entry.name}": ${field.ref}'s ${field.pins.size} pins are on that many strips`,
      ).toBe(field.pins.size)
    }
  }
  expect(fieldsExamined, "fields were examined").toBeGreaterThan(0)
})
