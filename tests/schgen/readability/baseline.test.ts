/**
 * SPEC §3.3's BASELINE REGISTRY: the committed file is empty and refuses an agent, a moved
 * serialization hash still reports all four measures, and no comparison carries a verdict.
 *
 * **THE CONTROL CASE IS FIRST AND IT IS WHAT MAKES THE REFUSALS TESTS RATHER THAN WALLS.** A loader
 * that threw on everything would satisfy every refusal below, so a well-formed entry is driven
 * through it first - `tests/stripboard/approvals-refusals.test.ts` does the same thing with the
 * owner's real words, and for the same reason.
 */
import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import {
  BASELINES_FILE,
  BASELINE_GRANTORS,
  SCALE_INVARIANT_UPTO,
  SCALE_UNSTABLE_FROM,
  baselineFor,
  baselineScale,
  baselinesPath,
  compareMeasures,
  loadBaselines,
  parseBaselines,
  type ReadabilityBaseline,
} from "../../../lib/schgen/readability/baseline.ts"
import type { SchematicMeasures } from "../../../lib/schgen/readability/measures.ts"

const HASH_A = "a".repeat(64)
const HASH_B = "b".repeat(64)

const MEASURES: SchematicMeasures = { bends: 8, bendsPerEdge: 1.33, crossings: 0, wireLength: 48, occupiedArea: 513 }

/**
 * A well-formed entry, as a registry's text.
 *
 * **THE QUOTE IS INVENTED AND IS LABELLED AS INVENTED.** It is test data for the loader's shape
 * checks, not a record of anything anybody said; no entry built from it is ever written to
 * `schematic/readability-baselines.json`, which ships empty and which no agent may add to.
 */
const ENTRY = {
  id: "fixture-baseline",
  circuit: "transistor-preamp",
  block: "tp-leg-upper",
  layoutInputSha256: HASH_A,
  measures: MEASURES,
  why: "Test data for the loader's shape checks.",
  grantedBy: "owner",
  grantedOn: "2026-10-20",
  ownerWords: ["i can follow that one, let's hold it as the reference"],
  doesNotExcuse: [
    "it is not a pass: verdict is the literal \"descriptive\" and four numbers cannot be resolved into one",
    "it does not travel to a different layoutInputSha256",
    "it does not excuse any hard geometric check",
  ],
  consultedBy: ["tools/schgen/verify.ts"],
  note: "Fixture.",
}

const registry = (entries: readonly unknown[]): string =>
  JSON.stringify({
    schema: 1,
    baselines: entries,
    notes: {
      schema: "n",
      baselines: "n",
      measures: "n",
      layoutInputSha256: "n",
      grantedBy: "n",
      ownerWords: "n",
      twelveFieldShape: "n",
    },
  })

const withField = (patch: Readonly<Record<string, unknown>>): string => registry([{ ...ENTRY, ...patch }])

const parsed = (json: string): readonly ReadabilityBaseline[] => parseBaselines(json, "fixture.json")

describe("the committed registry", () => {
  it("ships EMPTY, with its seven design notes, and loads", () => {
    const r = loadBaselines()
    expect(r.schema).toBe(1)
    expect(r.baselines).toEqual([])
    expect(Object.keys(r.notes).sort()).toEqual([
      "baselines",
      "grantedBy",
      "layoutInputSha256",
      "measures",
      "ownerWords",
      "schema",
      "twelveFieldShape",
    ])
  })

  it("is the file the loader resolves, and holds a literal empty baselines list", () => {
    const text = fs.readFileSync(baselinesPath(), "utf8")
    expect(baselinesPath()).toEndWith(BASELINES_FILE)
    expect(text).toContain('"baselines": []')
  })

  it("admits exactly one grantor, so no agent may add an entry", () => {
    expect([...BASELINE_GRANTORS]).toEqual(["owner"])
  })
})

describe("the loader", () => {
  it("accepts a well-formed entry - the control case", () => {
    const entries = parsed(registry([ENTRY]))
    expect(entries.length).toBe(1)
    expect(entries[0]?.measures).toEqual(MEASURES)
    expect(entries[0]?.grantedBy).toBe("owner")
  })

  it("accepts an EMPTY list, which is this registry's declared state", () => {
    expect(parsed(registry([]))).toEqual([])
  })

  it("refuses an entry granted by anything but the owner", () => {
    expect(() => parsed(withField({ grantedBy: "agent" }))).toThrow(/baselines-unknown-grantor/)
    expect(() => parsed(withField({ grantedBy: "agent" }))).toThrow(
      /AN AGENT MAY NEVER AUTHOR THE ACCEPTANCE CRITERIA FOR THE ARTIFACT IT IS PRODUCING/,
    )
  })

  it("refuses an entry with no ownerWords", () => {
    expect(() => parsed(withField({ ownerWords: [] }))).toThrow(/baselines-no-words/)
  })

  it("refuses a quote in the narrator's voice, naming the phrase that gave it away", () => {
    expect(() => parsed(withField({ ownerWords: ["the owner accepted this drawing as the reference"] }))).toThrow(
      /baselines-words-narrated/,
    )
    expect(() => parsed(withField({ ownerWords: ["he said the drawing reads well"] }))).toThrow(/"he said"/)
  })

  it("refuses a quote that is the entry's own reasoning in quotation marks", () => {
    // Nobody is speaking in it: it is the sentence an agent was about to write in `why`.
    expect(() => parsed(withField({ ownerWords: ["baseline accepted on the render"] }))).toThrow(
      /baselines-words-not-spoken/,
    )
  })

  it("reports whether a refused quote WOULD have passed the selection reading, so the narrowing is measured", () => {
    expect(() => parsed(withField({ ownerWords: ["tp-leg-upper: the cascade one"] }))).toThrow(
      /It WOULD pass the SELECTION reading/,
    )
    expect(() => parsed(withField({ ownerWords: ["baseline accepted on the render"] }))).toThrow(
      /It would not pass the SELECTION reading either/,
    )
  })

  it("refuses a hash that is not a lowercase 64-hex sha256", () => {
    expect(() => parsed(withField({ layoutInputSha256: HASH_A.toUpperCase() }))).toThrow(/baselines-hash-shape/)
    expect(() => parsed(withField({ layoutInputSha256: "aaaa" }))).toThrow(/baselines-hash-shape/)
  })

  it("refuses a fifth measure, which is how a composite would arrive", () => {
    expect(() => parsed(withField({ measures: { ...MEASURES, readability: 7 } }))).toThrow(/baselines-unknown-measure/)
  })

  it("refuses edges that do not name verdict and layoutInputSha256", () => {
    expect(() => parsed(withField({ doesNotExcuse: ["a", "b"] }))).toThrow(/baselines-thin-edges/)
    expect(() => parsed(withField({ doesNotExcuse: ["a", "b", "c"] }))).toThrow(/baselines-edge-unaddressed/)
  })

  it("refuses a consumer that is not in the repository", () => {
    expect(() => parsed(withField({ consultedBy: ["tools/schgen/does-not-exist.ts"] }))).toThrow(
      /baselines-consumer-missing/,
    )
  })

  it("refuses an unknown field, a missing field, a bad date and a wrong schema", () => {
    expect(() => parsed(registry([{ ...ENTRY, renderedFrom: "a png" }]))).toThrow(/baselines-unknown-entry-key/)
    const { note, ...withoutNote } = ENTRY
    expect(note).toBeDefined()
    expect(() => parsed(registry([withoutNote]))).toThrow(/baselines-missing-field/)
    expect(() => parsed(withField({ grantedOn: "2026-02-30" }))).toThrow(/baselines-granted-on/)
    expect(() => parsed(JSON.stringify({ schema: 2, baselines: [], notes: {} }))).toThrow(/baselines-schema/)
  })

  it("refuses two entries over one block at one serialization, and two sharing an id", () => {
    expect(() => parsed(registry([ENTRY, { ...ENTRY, id: "other" }]))).toThrow(/baselines-duplicate-scope/)
    expect(() => parsed(registry([ENTRY, { ...ENTRY, layoutInputSha256: HASH_B }]))).toThrow(/baselines-duplicate-id/)
  })
})

describe("baselineFor", () => {
  const entries = parsed(registry([ENTRY]))

  it("finds an entry whose serialization hash matches", () => {
    expect(baselineFor(entries, "tp-leg-upper", HASH_A).kind).toBe("found")
  })

  it("reports comparable-hash-moved, not stale and not absent, when the serialization has moved", () => {
    const lookup = baselineFor(entries, "tp-leg-upper", HASH_B)
    expect(lookup.kind).toBe("comparable-hash-moved")
    if (lookup.kind !== "comparable-hash-moved") throw new Error("unreachable")
    expect(lookup.was).toBe(HASH_A)
    expect(lookup.entry.id).toBe("fixture-baseline")
  })

  it("is absent for a block nobody granted one for", () => {
    expect(baselineFor(entries, "tp-leg-collector", HASH_A).kind).toBe("absent")
  })
})

describe("compareMeasures", () => {
  const entry = parsed(registry([ENTRY]))[0]
  if (entry === undefined) throw new Error("the control registry parsed to nothing")
  const after: SchematicMeasures = { bends: 4, bendsPerEdge: 0.8, crossings: 2, wireLength: 96, occupiedArea: 400 }

  it("a moved serialization hash still reports all four measures, with the hash flagged", () => {
    const c = compareMeasures(entry, after, HASH_B, 3)
    expect(c.rows.length).toBe(4)
    expect(c.serializationMoved).toBe(true)
  })

  it("no comparison carries a verdict", () => {
    expect(compareMeasures(entry, after, HASH_A, 3).verdict).toBe("descriptive")
    expect(compareMeasures(entry, after, HASH_B, 3).verdict).toBe("descriptive")
  })

  it("reports BOTH sides of every row, so a trade is visible rather than resolved", () => {
    // Crossings down and length doubled: the case spec 3.3 says a composite would hide.
    const rows = compareMeasures(entry, after, HASH_A, 3).rows
    expect(rows).toEqual([
      { measure: "bends", baseline: 8, now: 4 },
      { measure: "crossings", baseline: 0, now: 2 },
      { measure: "wireLength", baseline: 48, now: 96 },
      { measure: "occupiedArea", baseline: 513, now: 400 },
    ])
  })

  it("does not set serializationMoved when the hash agrees, so the flag is not always true", () => {
    expect(compareMeasures(entry, after, HASH_A, 3).serializationMoved).toBe(false)
  })

  it("says which of G95's two kinds of baseline this is, with a third arm for the unmeasured range", () => {
    // The three sizes move with SCALE_INVARIANT_UPTO and SCALE_UNSTABLE_FROM, which Task 17's
    // re-measurement moved from 9 and 13 to 3 and 8 (G95, rewritten). 5 is in the new gap; 11 is
    // no longer in it and is now a serialization baseline, which is the measured answer.
    expect(compareMeasures(entry, after, HASH_A, 3).scale.kind).toBe("about-the-circuit")
    expect(compareMeasures(entry, after, HASH_A, 17).scale.kind).toBe("about-a-serialization")
    expect(compareMeasures(entry, after, HASH_A, 11).scale.kind).toBe("about-a-serialization")
    expect(compareMeasures(entry, after, HASH_A, 5).scale.kind).toBe("unmeasured-scale")
  })
})

describe("baselineScale, G95's block-scale refinement", () => {
  it("is about-the-circuit at and below the size G95 measured invariant", () => {
    expect(baselineScale(SCALE_INVARIANT_UPTO).kind).toBe("about-the-circuit")
    expect(baselineScale(3).kind).toBe("about-the-circuit")
  })

  it("is about-a-serialization at and above the size G95 measured moving", () => {
    expect(baselineScale(SCALE_UNSTABLE_FROM).kind).toBe("about-a-serialization")
    expect(baselineScale(39).kind).toBe("about-a-serialization")
  })

  it("refuses to extend either measured range into the gap between them", () => {
    for (let cells = SCALE_INVARIANT_UPTO + 1; cells < SCALE_UNSTABLE_FROM; cells += 1) {
      expect(baselineScale(cells).kind, `${cells} cells`).toBe("unmeasured-scale")
    }
    expect(baselineScale(SCALE_INVARIANT_UPTO + 1).why).toContain("nothing is known between")
  })

  it("every arm says why, so a report can print the reason beside the classification", () => {
    for (const cells of [3, 5, 17]) expect(baselineScale(cells).why.length).toBeGreaterThan(80)
  })
})
