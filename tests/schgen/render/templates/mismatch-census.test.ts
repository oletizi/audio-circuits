/**
 * The mismatch census: every place a template refuses its subgraph, counted, pinned, **and since
 * Task 8 classified**.
 *
 * **WHY A COUNT WAS WORTH A TEST, AND STILL IS.** Before Task 8, `RealiseResult` had two outcomes
 * - `{ok: true, layout}` and `{ok: false, reason}` - and 30 sites constructed the second through
 * one `mismatch(reason)` helper. The number of sites was the size of Task 8, so the count was
 * pinned to stop that size changing unnoticed. Task 8 has now rewritten all 30, and the thing
 * worth pinning changed with them: **not how many refusals there are, but that every one of them
 * says WHICH KIND it is.** Spec 1.3, verbatim: *"A widened type with 30 sites still reporting an
 * undifferentiated string buys nothing."* The type alone cannot hold that - `notApplicable` is as
 * easy to write as the right constructor - so the census is what notices a site going back to
 * being undifferentiated, or a new one arriving unclassified.
 *
 * **THE NUMBERS BELOW ARE MEASURED, NOT ADJUSTED UNTIL GREEN.** They were produced by running
 * `sites()` over the tree and then checked against the per-site classification table in the Task 8
 * report, which was written by reading each site. The two agree, which is the only reason to
 * believe either.
 *
 * **THE PER-FILE BREAKDOWN IS THE PART THAT LOCALISES A CHANGE**, and it is now per-file AND
 * per-kind. A total that still says 30 after one template lost a refusal and another gained one is
 * a passing test that noticed nothing; so is a total that still says 30 after a `clearance` site
 * became a `not-applicable` one - which is the change that would quietly send a block with a
 * collision to ELK instead of refusing it (`docs/known-gaps.md` **G84**).
 *
 * **IT IS NOT A CLEARANCE CHECK AND NOT A PARITY CHECK.** Port parity is
 * `tests/schgen/render/templates/*.test.ts`, the pedals project's own fixtures; this is a census
 * over the source text.
 */
import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"

const TEMPLATE_DIR = path.resolve(import.meta.dir, "../../../../lib/schgen/render/templates")

/** The four constructors, plus the forward that carries another result's mismatch unchanged. */
type SiteKind = "notApplicable" | "invalidGeometry" | "clearanceViolation" | "backendRaised" | "forward"

/**
 * **THE CLASSIFIED REFUSAL SITES, per module and per kind.** Twenty-nine of them, and the number
 * MOVED in Task 24 from the thirty spec 1.3 states and Task 7 pinned:
 *
 * - **21 direct** - `notApplicable` x18, `invalidGeometry` x2 (both in `regulator.ts`, the two
 *   sites where a template has drawn and the IR contradicts it), `clearanceViolation` x1 (in
 *   `connector-fanout.ts`, the one site that runs `checkLayout` itself);
 * - **8 forwards** of another result type's already-classified mismatch.
 *
 * **THE SITE THAT WENT WAS `crystal.ts`'s, AND IT WENT BECAUSE THE THING IT FORWARDED CANNOT
 * HAPPEN ANY MORE.** It forwarded `drawn-extent.ts`'s `Measured` refusal, whose only cause was a
 * unit whose fields had nowhere to go; `render/field-placement.ts` no longer refuses that - it
 * takes the least-covered slot and records a `FieldFallback` - so `Measured` is deleted and
 * `drawnBoxes` returns the boxes. Keeping a forward of a value nothing can build would be a check
 * that cannot fail (`docs/known-gaps.md` **G236**). `regulator.ts`'s `reachOf` forwarded the same
 * refusal and is NOT in this count either way: it wrote `: drawn` rather than
 * `mismatch: drawn.mismatch`, which this file's `forward` pattern never matched - a gap in the
 * pattern, recorded here because the deletion is what made it visible.
 *
 * `backendRaised` is 0 everywhere, and that is deliberate rather than an omission: no template
 * raises on its own behalf. `render/blocks.ts` builds that kind when a template THROWS, and the
 * ELK backend will build it for the elkjs crash **G94** measured.
 *
 * `index.ts` and `opamp-classify.ts` are listed at zero for the reason Task 7 gave: the registry
 * constructs no result, and the classifier returns its own `Planned` through a private `refuse`.
 * **`opamp-classify.ts`'s refusals are therefore NOT in this census**, nor are `fanout-kit.ts`'s,
 * `rail-row.ts`'s planner's or `passive-chain.ts`'s classifier's - they are counted where they
 * are forwarded, which is what the `forward` column is. The helper types are pinned separately
 * below.
 */
const EXPECTED: Readonly<Record<string, Readonly<Partial<Record<SiteKind, number>>>>> = {
  "connector-fanout.ts": { notApplicable: 1, clearanceViolation: 1, forward: 1 },
  "crystal.ts": { notApplicable: 5 },
  "divider.ts": { notApplicable: 6 },
  "index.ts": {},
  "opamp-classify.ts": {},
  "opamp-stage.ts": { forward: 1 },
  "passive-chain.ts": { forward: 1 },
  "rail-row.ts": { notApplicable: 3, forward: 2 },
  "regulator.ts": { notApplicable: 3, invalidGeometry: 2, forward: 3 },
}

const TOTAL = 29

/**
 * Source text with comments and string/template literals blanked out, newlines kept so line
 * numbers still hold.
 *
 * **THIS IS THE FIX FOR A KNOWN WEAKNESS, AND IT IS NOT HYPOTHETICAL ANY MORE.** Task 7's version
 * matched `\bmismatch\(` over raw text, which counts a mention inside a comment or a string as a
 * call site. No false positive existed then. One does now: Task 8 wrote a header comment in
 * `divider.ts` saying its six `mismatch(...)` sites are classified, so the raw text of that file
 * contains one `mismatch(` and its code contains none.
 *
 * **WHAT THE BLANKING IS MEASURED TO CATCH, WHICH IS LESS THAN IT FIRST LOOKS.** Replacing
 * `code()` with the identity function was tried: **two tests go red** - *"no template constructs
 * an unclassified refusal"* and *"a constructor named in a comment is prose"*, both on that one
 * `divider.ts` mention - and the per-file breakdown does **not** move, because today's only prose
 * false positive is on `mismatch(`, which the site patterns no longer match. Disabling only the
 * block-comment rule and leaving the rest changes nothing at all, because the mention is inside
 * backticks and the template-literal rule blanks it anyway. So the blanking's teeth today are
 * narrower than "the census counts only code": it is insurance against a prose mention of a
 * CONSTRUCTOR, which has not happened yet and which the per-file counts would otherwise swallow.
 */
function code(text: string): string {
  const keepNewlines = (s: string): string => s.replace(/[^\n]/g, " ")
  return text
    .replace(/\/\*[\s\S]*?\*\//g, keepNewlines)
    .replace(/\/\/[^\n]*/g, keepNewlines)
    .replace(/`(?:[^`\\]|\\.)*`/g, keepNewlines)
    .replace(/"(?:[^"\\\n]|\\.)*"/g, keepNewlines)
    .replace(/'(?:[^'\\\n]|\\.)*'/g, keepNewlines)
}

interface Site {
  readonly file: string
  readonly line: number
  readonly kind: SiteKind
}

/**
 * How each kind is spelt at a site.
 *
 * **WHAT COUNTS AS A SITE IS NARROWER THAN "A REFUSAL", AND IT HAS TO BE.** This counts sites that
 * build a **`RealiseResult`** refusal - the value a template hands back - which is what spec 1.3's
 * thirty are. The helper result types refuse too, far more often (`classifyChain` alone has nine),
 * and those are NOT sites here: they are counted where they cross into a `RealiseResult`, which is
 * the `forward` column. Task 7's census drew the line in the same place, by counting `mismatch(`,
 * and listed `opamp-classify.ts` at zero for exactly this reason.
 *
 * The four constructors are unambiguous: each returns a `RealiseResult`, so a call to one can only
 * appear where that is the value wanted - a non-template module calling `notApplicable` would not
 * typecheck. **A forward is not**: `return { ok: false, mismatch: x.mismatch }` is how a `Planned`
 * or a `Core` forwards one too, and the text is identical. So `forward` is counted only in a
 * module that exports a `Template`, and `gatedByTemplateModule` says so where it is applied.
 */
const PATTERNS: readonly { readonly kind: SiteKind; readonly re: RegExp; readonly templateModuleOnly: boolean }[] = [
  { kind: "notApplicable", re: /\bnotApplicable\(/g, templateModuleOnly: false },
  { kind: "invalidGeometry", re: /\binvalidGeometry\(/g, templateModuleOnly: false },
  { kind: "clearanceViolation", re: /\bclearanceViolation\(/g, templateModuleOnly: false },
  { kind: "backendRaised", re: /\bbackendRaised\(/g, templateModuleOnly: false },
  { kind: "forward", re: /mismatch:\s*[A-Za-z_$][\w$.]*\.mismatch\b/g, templateModuleOnly: true },
]

/** A module that declares a `Template`, and so has a `RealiseResult` to build. */
const isTemplateModule = (text: string): boolean => /:\s*Template\s*=/.test(text)

/** Every classified refusal site under `lib/schgen/render/templates/`, in file then line order. */
function sites(): readonly Site[] {
  const out: Site[] = []
  for (const f of fs.readdirSync(TEMPLATE_DIR).filter((n) => n.endsWith(".ts")).sort()) {
    const text = code(fs.readFileSync(path.join(TEMPLATE_DIR, f), "utf8"))
    const templateModule = isTemplateModule(text)
    text.split("\n").forEach((line, i) => {
      for (const { kind, re, templateModuleOnly } of PATTERNS) {
        if (templateModuleOnly && !templateModule) continue
        for (const _ of line.matchAll(re)) out.push({ file: f, line: i + 1, kind })
      }
    })
  }
  return out
}

const describeSites = (found: readonly Site[]): string => found.map((s) => `${s.file}:${s.line} ${s.kind}`).join(" ")

describe("the template mismatch census", () => {
  test("every refusal site in the template set is classified, and there are twenty-nine", () => {
    const found = sites()
    expect(found.length, `sites: ${describeSites(found)}`).toBe(TOTAL)
  })

  test("the census is where it is measured to be, module by module and kind by kind", () => {
    const onDisk = fs.readdirSync(TEMPLATE_DIR).filter((n) => n.endsWith(".ts")).sort()
    // A template module appearing or disappearing changes what the total is a total OVER, so the
    // file list is pinned with the counts.
    expect(onDisk).toEqual(Object.keys(EXPECTED).sort())
    const found = sites()
    const perFile = new Map<string, Partial<Record<SiteKind, number>>>(onDisk.map((f) => [f, {}]))
    for (const s of found) {
      const counts = perFile.get(s.file)
      if (counts === undefined) throw new Error(`site in ${s.file}, which the directory listing does not hold`)
      counts[s.kind] = (counts[s.kind] ?? 0) + 1
    }
    expect(Object.fromEntries(perFile), `sites: ${describeSites(found)}`).toEqual(EXPECTED)
    const sum = [...perFile.values()].reduce((a, c) => a + Object.values(c).reduce((x, y) => x + y, 0), 0)
    expect(sum).toBe(found.length)
  })

  /**
   * **THE TOTALS BY KIND, which is the sentence spec 1.3 cares about.** Eighteen shape tests, two
   * pieces of invalid geometry, one clearance violation, EIGHT forwards (nine until Task 24
   * deleted `crystal.ts`'s), and **no site reporting an undifferentiated string, because
   * `mismatch(reason)` no longer exists**. The last of those is asserted directly below rather
   * than inferred from the counts.
   */
  test("the four kinds and the forwards add up, and nothing is unclassified", () => {
    const found = sites()
    const byKind = (k: SiteKind): number => found.filter((s) => s.kind === k).length
    expect({
      notApplicable: byKind("notApplicable"),
      invalidGeometry: byKind("invalidGeometry"),
      clearanceViolation: byKind("clearanceViolation"),
      backendRaised: byKind("backendRaised"),
      forward: byKind("forward"),
    }).toEqual({ notApplicable: 18, invalidGeometry: 2, clearanceViolation: 1, backendRaised: 0, forward: 8 })
  })

  /**
   * **THE DELETED CONSTRUCTOR, asserted as absent.** `mismatch(reason: string)` is gone from
   * `block-types.ts` (supersede means delete), and no template may reintroduce a refusal that
   * carries only prose. A site calling a local helper that builds `{ok: false, reason}` would be
   * caught by `bun run typecheck` - the type has no such member - so what this adds is the
   * narrower guard that the old helper has not come back under its old name.
   */
  test("no template constructs an unclassified refusal", () => {
    const blockTypes = fs.readFileSync(path.resolve(TEMPLATE_DIR, "../block-types.ts"), "utf8")
    expect(blockTypes.includes("export function mismatch("), "mismatch(reason) is deleted, per Task 8 Step 4").toBe(false)
    for (const f of fs.readdirSync(TEMPLATE_DIR).filter((n) => n.endsWith(".ts"))) {
      const text = code(fs.readFileSync(path.join(TEMPLATE_DIR, f), "utf8"))
      expect([...text.matchAll(/\bmismatch\(/g)].length, `${f} calls a bare mismatch(...)`).toBe(0)
      expect([...text.matchAll(/ok:\s*false,\s*reason:/g)].length, `${f} builds a refusal with a bare reason`).toBe(0)
    }
  })

  /**
   * **THE BLANKING HAS TEETH, MEASURED RATHER THAN ASSERTED.** `divider.ts`'s header comment says
   * how many `mismatch(...)` sites the file had, so its raw text holds one occurrence and its code
   * holds none. With `code()` replaced by the identity function this test goes red (`Expected: 0 /
   * Received: 1`) and so does *"no template constructs an unclassified refusal"*; the per-file
   * breakdown does not move, for the reason the header above gives.
   */
  test("a constructor named in a comment is prose, not a site", () => {
    const raw = fs.readFileSync(path.join(TEMPLATE_DIR, "divider.ts"), "utf8")
    expect([...raw.matchAll(/\bmismatch\(/g)].length, "divider.ts's header says how many mismatch(...) sites it had").toBe(1)
    expect([...code(raw).matchAll(/\bmismatch\(/g)].length, "and none of them is code").toBe(0)
    expect([...code(raw).matchAll(/\bnotApplicable\(/g)].length, "its six refusal sites are").toBe(6)
  })

  /**
   * **THE THREE HELPER TYPES THAT FORWARD A REFUSAL.** Task 7 pinned that each had a bare-string
   * false arm, because that was the hole Task 8 had to close; this is the same check inverted.
   * Each now carries a `Mismatch`, so a refusal keeps its kind across the boundary - and the eight
   * `forward` sites above are where they cross it. The brief named `StagePlanResult` for
   * `opamp-classify.ts`; the exported type is `Planned` (a Produces discrepancy recorded in
   * `docs/known-gaps.md` **G138**), and this uses the name the source has.
   *
   * **IT WAS FIVE UNTIL TASK 24 DELETED TWO OF THEM.** `field-placement.ts`'s `FieldsResult` and
   * `drawn-extent.ts`'s `Measured` are gone: the placer stopped refusing a unit with no clear
   * slot, so neither union had a false arm any input could reach. A union kept for the shape of it
   * is **G236**'s check that cannot fail, so the pair was deleted rather than left to be asserted
   * about here forever.
   */
  test("each helper result type that forwards a refusal carries a Mismatch, not a bare string", () => {
    const RENDER = path.resolve(TEMPLATE_DIR, "..")
    const types: readonly { readonly file: string; readonly name: string }[] = [
      { file: "templates/rail-row.ts", name: "CommonRailLadder" },
      { file: "templates/opamp-classify.ts", name: "Planned" },
      { file: "fanout-kit.ts", name: "TraceResult" },
    ]
    expect(types.length, "a helper-type list nothing iterates is a check that cannot fail").toBe(3)
    for (const { file, name } of types) {
      const text = fs.readFileSync(path.join(RENDER, file), "utf8")
      // Up to the first `;` that ENDS a line: the `;` separators inside the union's object
      // literals are each followed by a space, so a plain non-greedy match to `;` stops inside
      // the first member.
      const decl = new RegExp(String.raw`export type ${name} =([\s\S]*?);[ \t]*\r?\n`).exec(text)
      expect(decl?.[1], `${file} no longer exports a type alias called ${name}`).toBeTruthy()
      const body = decl?.[1] ?? ""
      expect(body, `${name} (${file})`).toContain("readonly ok: false")
      expect(body, `${name} (${file})`).toContain("readonly mismatch: Mismatch")
      expect(body, `${name} (${file}) still has a bare-string false arm`).not.toContain("readonly reason: string")
    }
  })
})
