/**
 * `stripboard/exemptions.json` as a committed artifact, the verdicts it answers
 * with, and the standing check that **every entry in it is consulted by
 * something**.
 *
 * **WHY A REGISTRY EXISTS AT ALL, in the owner's words, 2026-10-15:** ***"You
 * should keep a record of exemptions. My ad-built boards should be exempt from
 * the stricter standards of our new tooling—and, that exemption should carry a
 * reason and provenance so we don't have to keep having this dumb
 * conversation"*** - *"ad-built"* is his typo for *"as-built"* and is quoted as
 * he typed it, here and in the registry, because a quote an agent tidies is a
 * quote nobody can check.
 *
 * **THE ONE DESIGN DECISION EVERYTHING HERE TURNS ON: AN EXEMPTION MAKES A
 * VIOLATION REPORTED, NOT INVISIBLE.** An exempt board does not fail and it does
 * not go quiet either. So the loader answers with a VERDICT - a discriminated
 * union carrying a one-line notice - and never with a boolean a caller can drop
 * on the floor. **A silent exemption is a skipped check that looks like a
 * passing one**, which is the most-punished defect in this repository, and the
 * `exempt` outcome is built so that a consumer cannot reach it and say nothing.
 *
 * **THE LAST TEST IN THIS FILE IS THE ONE THAT MATTERS MOST.** An exemption
 * nobody reads is a rule nobody enforces, hiding in a file that looks like
 * governance, so every entry must be reached - structurally, by a named consumer
 * whose import closure really holds the loader, and LIVE, by a real measurement
 * of a real board. It is not vacuous: an entry for a subject nothing measures
 * leaves `unconsulted` non-empty and this file goes red. That was driven by
 * adding a throwaway entry and watching it fail.
 *
 * **WHAT IS NOT HERE.** The loader's strictness - two dozen refusals, one per
 * clause - is `./exemptions-refusals.test.ts`, split off so neither file is a
 * list of near-identical assertions nobody reads. The rules themselves are
 * `lib/stripboard/seed-area.ts` and are untouched by this file: the owner settled
 * that direction before this registry existed - *"my directives are more
 * authoritative than a file on disk"* - and an exemption is the OTHER half, the
 * board being excused rather than the rule being bent.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { importClosure } from "../../lib/import-closure.ts"
import { rigidOverlap, routedUnderRigid } from "../../lib/stripboard/seed-area.ts"
import {
  EXEMPTABLE_RULES,
  EXEMPTIONS_PATH,
  consultedIds,
  loadExemptions,
  noticesOf,
  unconsulted,
  verdictFor,
  type Exemption,
  type ExemptableRule,
} from "../../tools/stripboard/exemptions.ts"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { fixture, refusalFrom } from "./exemptions-fixtures.ts"
import { rigidOverlapPlaces, routedUnderRigidPlaces } from "./model/area-places.ts"
import { handBoard } from "./model/seed-room-fixtures.ts"

afterAll(cleanUpTempScratch)

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")

/** This file, which an entry may NOT cite as the thing that consults it. */
const SELF = "tests/stripboard/exemptions.test.ts"

/** The owner's two as-built boards, which are the whole of what is exempt. */
const SUBJECTS: readonly string[] = [
  "transistor-preamp-buffered",
  "transistor-preamp-feedback",
]

function entryFor(subject: string): Exemption {
  const found = loadExemptions().exemptions.find((entry) => entry.subject === subject)
  if (found === undefined) throw new Error(`no exemption for "${subject}" in ${EXEMPTIONS_PATH}`)
  return found
}

// ---------------------------------------------------------------------------
// The committed artifact
// ---------------------------------------------------------------------------

test("the committed registry loads, and exempts exactly the owner's two as-built boards", () => {
  const registry = loadExemptions()
  expect(registry.schema).toBe(1)
  expect(registry.exemptions.map((entry) => entry.subject).sort()).toEqual([...SUBJECTS])
  for (const entry of registry.exemptions) {
    expect(entry.subjectKind, entry.id).toBe("as-built-board")
    expect(entry.grantedBy, entry.id).toBe("owner")
    expect(entry.grantedOn, entry.id).toBe("2026-10-15")
    // Both boards are exempt from BOTH hard rules. `buffered` breaks
    // `routedUnderRigid` nowhere today and its entry says so; the grant is over
    // the artifact against the tooling's placement rules, not over a count.
    expect([...entry.from].sort(), entry.id).toEqual([...EXEMPTABLE_RULES].sort())
    expect(entry.why.length, entry.id).toBeGreaterThan(80)
    expect(entry.note.length, entry.id).toBeGreaterThan(200)
  }
})

test("his words are carried verbatim, typo and all", () => {
  for (const entry of loadExemptions().exemptions) {
    expect(entry.ownerWords, entry.id).toContain(
      "My ad-built boards should be exempt from the stricter standards of our new tooling",
    )
    expect(entry.ownerWords, entry.id).toContain("this dumb conversation")
    // THE TYPO IS THE ASSERTION. "as-built" is what he meant and "ad-built" is
    // what he typed; a later reader tidying the quote is the exact edit this
    // catches, because a corrected quote cannot be checked against what was
    // said.
    expect(entry.ownerWords, entry.id).not.toContain("My as-built boards")
    expect(entry.note, entry.id).toContain("ad-built")
  }
  // And the note says the typo is deliberate, so nobody has to guess.
  expect(entryFor("transistor-preamp-feedback").note).toContain("THE TYPO IS HIS AND IS PRESERVED")
})

test("every entry writes down its edges, electrical soundness first", () => {
  for (const entry of loadExemptions().exemptions) {
    expect(entry.doesNotExcuse.length, entry.id).toBeGreaterThanOrEqual(2)
    const all = entry.doesNotExcuse.join(" ")
    // The two the design named: an exemption is about these specific as-built
    // artifacts and does not travel to a board the tooling generates, and it
    // does not excuse electrical soundness, which is a different claim.
    // `violationsOf` is required BY THE LOADER, which is why it is named here
    // as a symbol rather than described.
    expect(all, entry.id).toContain("violationsOf")
    expect(all, entry.id).toContain("GENERATES")
  }
})

test("the exemptable rules are the two hard rules, verified against the thing itself", () => {
  // A whitelist of rule NAMES is worth nothing if a name does not name a rule -
  // this repository has twice shipped a footprint that does not exist. So the
  // two names are resolved against the module that owns them.
  const real: Readonly<Record<ExemptableRule, unknown>> = {
    routedUnderRigid,
    rigidOverlap,
  }
  expect([...EXEMPTABLE_RULES].sort()).toEqual(["rigidOverlap", "routedUnderRigid"])
  for (const rule of EXEMPTABLE_RULES) {
    expect(typeof real[rule], rule).toBe("function")
  }
})

test("electrical soundness is not exemptable, and asking for it refuses by name", () => {
  const rules: readonly string[] = EXEMPTABLE_RULES
  expect(rules).not.toContain("violationsOf")
  const file = fixture({ patchEntry: { index: 0, set: { from: ["violationsOf"] } } })
  const message = refusalFrom(() => loadExemptions(file))
  expect(message).toStartWith("exemptions-unknown-rule")
  expect(message, "it names what was asked for").toContain("violationsOf")
  expect(message, "and why that one in particular is refused").toContain("soundness")
})

// ---------------------------------------------------------------------------
// The verdicts: reported, never invisible
// ---------------------------------------------------------------------------

test("a violation on an exempt board is REPORTED, in one line naming board, rule and count", () => {
  const registry = loadExemptions()
  const verdict = verdictFor(registry, {
    subject: "transistor-preamp-feedback",
    rule: "rigidOverlap",
    places: ["Q1/RV3", "R4/RV4"],
  })
  if (verdict.outcome !== "exempt") throw new Error(`expected an exempt verdict, got ${verdict.outcome}`)
  expect(verdict.count).toBe(2)
  expect(verdict.exemption.id).toBe("as-built-transistor-preamp-feedback")
  // ONE LINE. A notice that wrapped would be a notice a reader skims past, and
  // the whole point of it is that the run says this out loud and proceeds.
  expect(verdict.notice.includes("\n"), "one line").toBe(false)
  expect(verdict.notice).toContain("transistor-preamp-feedback")
  expect(verdict.notice).toContain("rigidOverlap")
  expect(verdict.notice).toContain("2")
  expect(verdict.notice, "where the grant is recorded").toContain("stripboard/exemptions.json")
  expect(verdict.notice, "and the places, so it is actionable").toContain("Q1/RV3")
})

test("nothing to excuse is a CLEAN verdict, which carries no notice and no exemption", () => {
  const verdict = verdictFor(loadExemptions(), {
    subject: "transistor-preamp-buffered",
    rule: "routedUnderRigid",
    places: [],
  })
  // `buffered` breaks this rule nowhere, measured below. A clean verdict is not
  // an exempt one: there is nothing to report, so no entry is consulted and the
  // registry does not get to look used.
  expect(verdict.outcome).toBe("clean")
  expect(noticesOf([verdict]), "a clean verdict says nothing").toEqual([])
})

test("a rule the entry does not name is UNEXCUSED on the very same board", () => {
  // THE PREDICATE CAN FIRE, which is the point of driving it: an exemption is
  // from NAMED rules, and a board that is exempt from one is not thereby exempt
  // from the other. The committed entries name both rules, so this is driven
  // over a fixture that names one.
  const file = fixture({ patchEntry: { index: 0, set: { from: ["rigidOverlap"] } } })
  const registry = loadExemptions(file)
  const verdict = verdictFor(registry, {
    subject: registry.exemptions[0]?.subject ?? "",
    rule: "routedUnderRigid",
    places: ["R4 under RV4"],
  })
  if (verdict.outcome !== "unexcused") {
    throw new Error(`expected an unexcused verdict, got ${verdict.outcome}`)
  }
  expect(verdict.count).toBe(1)
  expect(verdict.complaint).toContain("routedUnderRigid")
  expect(verdict.complaint, "it names the entry that does not cover it").toContain(
    "as-built-transistor-preamp-feedback",
  )
  expect(noticesOf([verdict]), "and it is reported, not swallowed").toHaveLength(1)
})

test("a board with no entry is UNEXCUSED rather than quietly exempt", () => {
  // THE DANGEROUS DIRECTION IS "EXEMPT". A subject nobody granted an exemption
  // for gets the loud answer, and `pt2399-core` is a real hand-laid board of
  // his that is deliberately NOT in the registry - see the feedback entry's
  // note on why it is not a blanket amnesty.
  const verdict = verdictFor(loadExemptions(), {
    subject: "pt2399-core",
    rule: "rigidOverlap",
    places: ["C1/U1"],
  })
  if (verdict.outcome !== "unexcused") {
    throw new Error(`expected an unexcused verdict, got ${verdict.outcome}`)
  }
  expect(verdict.complaint).toContain("pt2399-core")
  expect(verdict.complaint, "it says where an exemption would have to come from").toContain(
    "stripboard/exemptions.json",
  )
  expect(verdict.complaint, "and who may grant one").toContain("owner")
})

test("noticesOf reports every outcome that has something to say, and only those", () => {
  const registry = loadExemptions()
  const exempt = verdictFor(registry, {
    subject: "transistor-preamp-feedback",
    rule: "routedUnderRigid",
    places: ["R4 under RV4"],
  })
  const clean = verdictFor(registry, {
    subject: "transistor-preamp-feedback",
    rule: "rigidOverlap",
    places: [],
  })
  const unexcused = verdictFor(registry, {
    subject: "pultec-low-boost-frozen",
    rule: "rigidOverlap",
    places: ["C1/RV1"],
  })
  // **THE THREE OUTCOMES ARE ASSERTED AND NOT ASSUMED**, which is a correction
  // with a driven failure behind it: this test used to check only that two lines
  // came back, so when a throwaway entry for `pultec-low-boost-frozen` was added
  // to drive the standing check below, the third verdict silently became EXEMPT,
  // still produced a line, and this test went on passing - and worse, it marked
  // that entry consulted and hid the very failure it was being used to
  // demonstrate. A test whose fabricated subject might one day be granted an
  // exemption has to say which outcome it is exercising.
  expect(exempt.outcome).toBe("exempt")
  expect(clean.outcome).toBe("clean")
  expect(unexcused.outcome).toBe("unexcused")
  const lines = noticesOf([exempt, clean, unexcused])
  expect(lines).toHaveLength(2)
  expect(lines.every((line) => !line.includes("\n")), "one line each").toBe(true)
  expect(lines[0]).toContain("transistor-preamp-feedback")
  expect(lines[1]).toContain("pultec-low-boost-frozen")
})

// ---------------------------------------------------------------------------
// The standing check: an exemption nobody reads is a rule nobody enforces
// ---------------------------------------------------------------------------

test("every exemption names a live consumer, and never this file", () => {
  for (const entry of loadExemptions().exemptions) {
    expect(entry.consultedBy.length, entry.id).toBeGreaterThan(0)
    for (const consumer of entry.consultedBy) {
      expect(fs.existsSync(path.join(REPO_ROOT, consumer)), consumer).toBe(true)
      // THE CITED FILE MUST REALLY READ THE REGISTRY, transitively - a grep for
      // a filename is satisfied by a comment, and a comment consults nothing.
      expect([...importClosure(consumer)], `${entry.id} via ${consumer}`).toContain(
        "tools/stripboard/exemptions.ts",
      )
      // AND IT MAY NOT BE THIS TEST. An entry whose only reader is the
      // registry's own test is an entry that exists to satisfy its own check,
      // which is the shape of circular governance this file is built against.
      expect(consumer, `${entry.id} may not cite its own test`).not.toBe(SELF)
    }
  }
})

test("THE STANDING CHECK: every exemption is reached by a real measurement", () => {
  // IT IS DRIVEN THROUGH THE SAME DERIVATION THE PLACER AND THE MOVE GENERATOR
  // USE - `handBoard` reads the committed dump into `Placement`s and
  // `./model/area-places.ts` applies the two rules to the areas `partAreasOf`
  // derives - so an entry is proven reachable by MEASURING THE BOARD, not by
  // being named in a list.
  //
  // **IT IS NOT VACUOUS, AND THAT WAS DEMONSTRATED RATHER THAN ASSUMED.** A
  // throwaway third entry for a subject nothing measures was added to
  // `stripboard/exemptions.json`, this test went red on `unconsulted` holding
  // that entry's id, and it was removed again.
  const registry = loadExemptions()
  const reported: string[] = []
  for (const subject of SUBJECTS) {
    const areas = handBoard(subject).areas
    const measured: ReadonlyMap<ExemptableRule, readonly string[]> = new Map([
      ["rigidOverlap", rigidOverlapPlaces(areas)],
      ["routedUnderRigid", routedUnderRigidPlaces(areas)],
    ])
    for (const rule of EXEMPTABLE_RULES) {
      const places = measured.get(rule)
      if (places === undefined) throw new Error(`no measurement for ${rule} on ${subject}`)
      const verdict = verdictFor(registry, { subject, rule, places })
      expect(verdict.outcome, `${subject} / ${rule}`).not.toBe("unexcused")
      reported.push(...noticesOf([verdict]))
    }
  }
  // THREE OF THE FOUR COMBINATIONS HAVE SOMETHING TO REPORT, measured
  // 2026-10-15: feedback breaks `rigidOverlap` twice (Q1/RV3, R4/RV4) and
  // `routedUnderRigid` once (R4 under RV4), buffered breaks `rigidOverlap`
  // twice (C1/RV4, C3/Q1) and `routedUnderRigid` not at all. The counts
  // themselves are pinned by `./model/seed-room.test.ts`, which is their one
  // owner; what is asserted here is that each one SURFACED.
  expect(reported).toHaveLength(3)
  expect(unconsulted(registry), "every entry was reached").toEqual([])
  expect([...consultedIds()], "and by id").toEqual(
    expect.arrayContaining(registry.exemptions.map((entry) => entry.id)),
  )
})
