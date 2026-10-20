/**
 * The mismatch census: every place a template refuses its subgraph, counted
 * and pinned.
 *
 * **WHY A COUNT IS WORTH A TEST.** `RealiseResult` has two outcomes here -
 * `{ok: true, layout}` and `{ok: false, reason}` - and the M1 plan's Task 8
 * widens the false arm to five classified outcomes. Every site that
 * constructs one has to be visited to do that, so the number of sites is the
 * size of that task, and a site added or removed between now and then
 * silently changes it. This test is the brief's Step 4, and the number in it
 * is **measured, not recalled**: 30, agreeing with spec 1.3's "30
 * `mismatch(...)` call sites".
 *
 * **THE PER-FILE BREAKDOWN IS THE PART THAT LOCALISES A CHANGE.** A total
 * that still says 30 after one template lost a refusal and another gained one
 * is a passing test that noticed nothing, so the counts are pinned per file
 * as the brief states them.
 *
 * **IT IS NOT A CLEARANCE CHECK AND NOT A PARITY CHECK.** Port parity is
 * `tests/schgen/render/templates/*.test.ts`, the pedals project's own
 * fixtures; this is a census over the ported source text.
 */
import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"

const TEMPLATE_DIR = path.resolve(import.meta.dir, "../../../../lib/schgen/render/templates")

/**
 * The brief's counts, per template module, and their sum is the 30 spec 1.3
 * states. `index.ts` and `opamp-classify.ts` are listed at 0 deliberately:
 * the registry constructs no result, and the classifier returns its own
 * `Planned` through a private `refuse` rather than through `mismatch`, which
 * is one of the five helper types Task 8 must widen alongside this list.
 */
const EXPECTED_SITES: Readonly<Record<string, number>> = {
  "connector-fanout.ts": 3,
  "crystal.ts": 6,
  "divider.ts": 6,
  "index.ts": 0,
  "opamp-classify.ts": 0,
  "opamp-stage.ts": 1,
  "passive-chain.ts": 1,
  "rail-row.ts": 5,
  "regulator.ts": 8,
}

/** Every `mismatch(` call site under `lib/schgen/render/templates/`, as "<file>:<line>". */
function mismatchSites(): readonly string[] {
  const out: string[] = []
  for (const f of fs.readdirSync(TEMPLATE_DIR).filter((n) => n.endsWith(".ts")).sort()) {
    const lines = fs.readFileSync(path.join(TEMPLATE_DIR, f), "utf8").split("\n")
    lines.forEach((line, i) => {
      for (const _ of line.matchAll(/\bmismatch\(/g)) out.push(`${f}:${i + 1}`)
    })
  }
  return out
}

describe("the template mismatch census", () => {
  test("every mismatch site is in the census Task 8 widens", () => {
    const found = mismatchSites()
    expect(found.length, `sites: ${found.join(" ")}`).toBe(30)
  })

  test("the census is where the brief says it is, module by module", () => {
    const onDisk = fs.readdirSync(TEMPLATE_DIR).filter((n) => n.endsWith(".ts")).sort()
    // A template module appearing or disappearing changes what the total is a
    // total OVER, so the file list is pinned with the counts.
    expect(onDisk).toEqual(Object.keys(EXPECTED_SITES).sort())
    const found = mismatchSites()
    const perFile = new Map<string, number>(onDisk.map((f) => [f, 0]))
    for (const site of found) {
      const file = site.slice(0, site.lastIndexOf(":"))
      perFile.set(file, (perFile.get(file) ?? 0) + 1)
    }
    expect(Object.fromEntries(perFile)).toEqual(EXPECTED_SITES)
    const sum = [...perFile.values()].reduce((a, b) => a + b, 0)
    expect(sum).toBe(found.length)
  })

  /**
   * **THE FIVE HELPER TYPES THAT FORWARD A REASON INTO A MISMATCH**, which is
   * the brief's Step 5 as a check rather than as a sentence in a report. Each
   * is `{ok: true, …} | {ok: false, reason: string}`, and each is a place a
   * refusal's reason is a bare string today; Task 8 widens these alongside
   * `RealiseResult` or the classification has a hole in it. The brief names
   * `StagePlanResult` for `opamp-classify.ts`; **the exported type is in fact
   * called `Planned`** - a Produces discrepancy, recorded in
   * `docs/known-gaps.md`, and this test uses the name the source has.
   */
  test("each helper result type that forwards a reason still has a bare-string false arm", () => {
    const RENDER = path.resolve(TEMPLATE_DIR, "..")
    const types: readonly { readonly file: string; readonly name: string }[] = [
      { file: "templates/rail-row.ts", name: "CommonRailLadder" },
      { file: "templates/opamp-classify.ts", name: "Planned" },
      { file: "fanout-kit.ts", name: "TraceResult" },
      { file: "drawn-extent.ts", name: "Measured" },
      { file: "field-placement.ts", name: "FieldsResult" },
    ]
    expect(types.length, "a helper-type list nothing iterates is a check that cannot fail").toBe(5)
    for (const { file, name } of types) {
      const text = fs.readFileSync(path.join(RENDER, file), "utf8")
      // Up to the first `;` that ENDS a line: the `;` separators inside the
      // union's object literals are each followed by a space, so a plain
      // non-greedy match to `;` stops inside the first member.
      const decl = new RegExp(String.raw`export type ${name} =([\s\S]*?);[ \t]*\r?\n`).exec(text)
      expect(decl?.[1], `${file} no longer exports a type alias called ${name}`).toBeTruthy()
      const body = decl?.[1] ?? ""
      expect(body, `${name} (${file})`).toContain("readonly ok: false")
      expect(body, `${name} (${file})`).toContain("readonly reason: string")
    }
  })
})
