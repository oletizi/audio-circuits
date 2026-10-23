/**
 * **THE PROVENANCE RULE AS CHECKS: a permitted electrical change is derived from a declared
 * TRANSFORMATION, in a COMMITTED file, and there is no path from a generated graph to a delta.**
 *
 * `docs/known-gaps.md` **G104** records why the alternative was withdrawn, in the review's words:
 * *"waiting until generated schematics exist to enumerate their differences creates precisely the
 * provenance risk gate 8 is supposed to prevent: a generator defect could be retrospectively
 * classified as an intended change."*
 *
 * **WHY THE CASES ARE COMMITTED FILES AND NOT STRING LITERALS.** `parseDeclaredDeltas` checks
 * provenance BEFORE content: a declaration whose text is not git's `HEAD` text is refused before it
 * is parsed. So a malformed declaration written into a temp directory never reaches the content
 * checks, and every content case needs a committed file to refuse.
 * `tests/schgen/__fixtures__/deltas/` is that corpus and its README says so. **The two lists are
 * held to each other below**, so a fixture with no case - or a case naming no fixture - fails here
 * rather than sitting unread.
 *
 * **THE LAST DESCRIBE IS THE BRIEF's STEP 7(3).** A claim of the form *"this cannot be reached"* is
 * not provable by calling something; it is provable by the absence of a path. So it is checked over
 * `declared-delta.ts`'s own source text - no import of `reference-graph.ts`, no mention of
 * `ReferenceGraph` or `graphFromNetlist` below the header - and over `parseDeclaredDeltas`'s arity,
 * which takes a declaration's text and its path and nothing a generator produced. The forbidden
 * helper was written during this task to see what it would take and then deleted; the task report
 * records what it needed, and what it needed was a `from` string invented by the author of the diff.
 */
import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { ImportedNetlist } from "../../../lib/kicad/netlist.ts"
import { EMPTY_DELTA, GRAPH_EDIT_KINDS, describePermitted, parseDeclaredDeltas, type PermittedDelta } from "../../../lib/schgen/gates/declared-delta.ts"
import { DECLARED_DELTAS_ARE_M2, checkReferenceGraph } from "../../../lib/schgen/gates/reference-graph.ts"

const comp = (designator: string, value: string, libPart: string) => ({ designator, value, libPart })

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..")
const FIXTURES = path.join(repoRoot, "tests", "schgen", "__fixtures__", "deltas")
const read = (name: string): { readonly text: string; readonly file: string } => {
  const file = path.join(FIXTURES, name)
  return { text: fs.readFileSync(file, "utf8"), file }
}

/** Every declaration in the corpus and what reading it must do. A fixture missing a row fails below. */
const CASES: readonly { readonly file: string; readonly refusal: RegExp | null; readonly why: string }[] = [
  { file: "empty.json", refusal: null, why: "M1's whole answer: no electrical change at all" },
  { file: "declared.json", refusal: null, why: "one well-formed delta naming its transformation" },
  { file: "all-edit-kinds.json", refusal: null, why: "all five GraphEdit kinds, so each parser arm is read" },
  { file: "blank-from.json", refusal: /transformation/, why: "the brief's Step 1 case: a delta naming no transformation is REFUSED" },
  { file: "no-why.json", refusal: /no "why"/, why: "a delta must say why the transformation produces it" },
  { file: "unknown-edit-kind.json", refusal: /unknown edit kind/, why: "an unrecognised edit is refused, never ignored" },
  { file: "unknown-kind.json", refusal: /unknown kind/, why: "an unrecognised top-level kind is refused" },
  { file: "unknown-file-key.json", refusal: /unknown key/, why: "strict.ts: an unknown key is refused, never ignored" },
  { file: "empty-with-deltas.json", refusal: /may not carry "deltas"/, why: "kind empty and a deltas array would disagree" },
  { file: "declared-empty-list.json", refusal: /empty "deltas" array/, why: "two spellings of one meaning, so the second is refused" },
  { file: "duplicate-id.json", refusal: /share the id/, why: "an id is how a delta is cited, so it must be unique" },
  { file: "not-json.json", refusal: /is not valid JSON/, why: "a malformed declaration names the file" },
]

describe("the committed declaration corpus and the cases are held to each other", () => {
  it("has a case for every fixture and a fixture for every case", () => {
    const onDisk = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort()
    expect(onDisk.length).toBeGreaterThan(0)
    expect(CASES.map((c) => c.file).sort()).toEqual(onDisk)
    expect(new Set(CASES.map((c) => c.file)).size, "a file listed twice would hide a missing one").toBe(CASES.length)
  })
})

describe("parseDeclaredDeltas reads or refuses every committed declaration", () => {
  for (const c of CASES) {
    it(`${c.file}: ${c.why}`, () => {
      const f = read(c.file)
      if (c.refusal === null) {
        const p = parseDeclaredDeltas(f.text, f.file)
        expect(p.kind === "empty" || p.deltas.length > 0, "a declared list that parsed must hold deltas").toBe(true)
        return
      }
      expect(() => parseDeclaredDeltas(f.text, f.file)).toThrow(c.refusal)
    })
  }
})

describe("what the declarations that DO parse say", () => {
  it("reads M1's answer as the empty delta", () => {
    const f = read("empty.json")
    expect(parseDeclaredDeltas(f.text, f.file)).toEqual(EMPTY_DELTA)
  })

  it("keeps the transformation each delta names, and the edit verbatim", () => {
    const f = read("declared.json")
    const p = parseDeclaredDeltas(f.text, f.file)
    if (p.kind !== "declared") throw new Error(`the declared fixture parsed as ${p.kind}`)
    expect(p.deltas).toHaveLength(1)
    expect(p.deltas[0]?.id).toBe("D1")
    expect(p.deltas[0]?.from).toContain("fixture transformation")
    expect(p.deltas[0]?.edit).toEqual({ kind: "removePart", part: "R1" })
  })

  it("reads all five edit kinds, so no parser arm is unexercised", () => {
    const f = read("all-edit-kinds.json")
    const p = parseDeclaredDeltas(f.text, f.file)
    if (p.kind !== "declared") throw new Error(`the all-kinds fixture parsed as ${p.kind}`)
    expect(p.deltas.map((d): string => d.edit.kind).sort()).toEqual([...GRAPH_EDIT_KINDS].sort())
    expect(p.deltas.every((d) => d.from.trim() !== "" && d.why.trim() !== "")).toBe(true)
  })

  it("renders a permitted delta for a gate row without the caller spelling the union", () => {
    expect(describePermitted(EMPTY_DELTA)).toContain("no electrical change is permitted")
    const f = read("declared.json")
    expect(describePermitted(parseDeclaredDeltas(f.text, f.file))).toContain("D1 from fixture transformation")
  })
})

describe("the declaration must be the one in the history", () => {
  it("refuses a declaration in no repository at all, rather than defaulting", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "delta-uncommitted-"))
    try {
      const file = path.join(dir, "permitted.json")
      fs.writeFileSync(file, '{ "kind": "empty" }\n')
      // A temp directory is inside no repository, so git cannot even find a toplevel: that is the
      // "provenance could not be established" arm, and it refuses too.
      expect(() => parseDeclaredDeltas(fs.readFileSync(file, "utf8"), file)).toThrow(/NOT COMMITTED|cannot be checked for provenance/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it("refuses a file inside the repository that git has no HEAD copy of", () => {
    const file = path.join(FIXTURES, "never-committed.json")
    if (fs.existsSync(file)) throw new Error(`${file} exists, so this case would not test what it says`)
    try {
      fs.writeFileSync(file, '{ "kind": "empty" }\n')
      expect(() => parseDeclaredDeltas(fs.readFileSync(file, "utf8"), file)).toThrow(/NOT COMMITTED/)
    } finally {
      fs.rmSync(file, { force: true })
    }
  })

  /**
   * **THIS CASE FOUND A HOLE IN THE FUNCTION IT TESTS, which is why it is worth its lines.** The
   * first `assertCommitted` compared `HEAD` against the bytes it read from the path ITSELF, so for
   * a caller that passed text from anywhere the comparison was the path against itself and could
   * not fail - and the text that was then parsed was the unchecked argument. It now compares `HEAD`
   * against the declaration being read.
   */
  it("refuses a committed path whose declaration text is not the committed text", () => {
    const f = read("empty.json")
    expect(() => parseDeclaredDeltas('{ "kind": "declared", "deltas": [] }', f.file)).toThrow(/differs from the committed/)
    // And not by accident of the content: text that WOULD parse is refused too, on provenance alone.
    expect(() => parseDeclaredDeltas('{"kind": "empty"}', f.file)).toThrow(/differs from the committed/)
  })

  it("checks provenance BEFORE content, so a malformed uncommitted declaration fails on provenance", () => {
    const f = read("empty.json")
    expect(() => parseDeclaredDeltas("{ not json at all", f.file)).toThrow(/differs from the committed/)
  })
})

describe("there is no code path from a generated graph to a permitted delta", () => {
  const source = fs.readFileSync(path.join(repoRoot, "lib", "schgen", "gates", "declared-delta.ts"), "utf8")

  it("has the module on disk to read, so the assertions below are not vacuous", () => {
    expect(source.length).toBeGreaterThan(1000)
    expect(source).toContain("export function parseDeclaredDeltas")
  })

  it("does not import reference-graph.ts", () => {
    expect(source).not.toContain('from "./reference-graph.ts"')
    expect(source.match(/^import .*$/gm)?.some((l) => l.includes("reference-graph"))).toBe(false)
  })

  it("never names ReferenceGraph or graphFromNetlist in its code", () => {
    // The header's prose DOES name them, deliberately, to say they are absent - so the check is on
    // the code below the header. A check over the whole file would have to be deleted the moment
    // the explanation was written, which is the wrong trade.
    const headerEnd = source.indexOf("\n */")
    expect(headerEnd, "the module has a header comment this check skips past").toBeGreaterThan(0)
    const code = source.slice(headerEnd + 4)
    expect(code).toContain("export function parseDeclaredDeltas")
    expect(code).not.toContain("ReferenceGraph")
    expect(code).not.toContain("graphFromNetlist")
  })

  it("takes a declaration's text and its path, and nothing a generator produced", () => {
    expect(parseDeclaredDeltas.length).toBe(2)
  })

  /**
   * **THE PARSER IS NOT THE ONLY WAY TO BUILD A `PermittedDelta`, AND THIS IS WHAT STOPS THAT FROM
   * MATTERING IN M1.** `PermittedDelta` is a structural union, so a caller can write a literal with
   * a blank `from` and never reach `parseDeclaredDeltas`. The module header used to claim the
   * parser was the only way in; it is the only CALL SITE, not the only way.
   *
   * **In M1 the bypass cannot pass**, because a declared list is refused outright - and the control
   * is the same two netlists under an EMPTY delta, which IS a pass, so this case is about the
   * literal and not about the comparison failing. **This assertion goes RED the day M2 makes a
   * declared list something the gate acts on**, which is exactly when the bypass starts to matter
   * and `docs/known-gaps.md` **G242** says so.
   */
  it("cannot be bypassed to a PASS by a hand-written literal, because M1 refuses a declared list", () => {
    const N: ImportedNetlist = {
      components: [comp("R1", "10k", "R"), comp("R2", "10k", "R")],
      nets: { A: ["R1.1", "R2.1"], B: ["R1.2", "R2.2"] },
    }
    const reference = { file: "ref.kicad_sch", netlist: N }
    // The forbidden shape, built without the parser: a blank `from` and a blank `why`.
    const bypass: PermittedDelta = { kind: "declared", deltas: [{ id: "D1", from: "", why: "", edit: { kind: "removePart", part: "R1" } }] }
    const r = checkReferenceGraph(N, reference, bypass, "a manifest citation")
    expect(r.undeclared).toEqual([DECLARED_DELTAS_ARE_M2])
    expect(r.undeclared.length, "a hand-written literal must not reach a pass").toBeGreaterThan(0)
    // THE CONTROL: with an EMPTY delta the same pair IS a pass, so the refusal above is the literal's.
    expect(checkReferenceGraph(N, reference, EMPTY_DELTA, "a manifest citation").undeclared).toEqual([])
  })
})
