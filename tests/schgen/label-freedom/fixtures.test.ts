/**
 * **THE COMMITTED FIXTURE SCHEMATICS ARE HELD TO `fixtures.ts` ON EVERY `bun test`, AND SO IS THE
 * ONE-DIFFERENCE PROPERTY EVERY ARM'S CLAIM RESTS ON.**
 *
 * Research check for Task 5 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` calls it.** It is this plan's own instrument, like
 * `tests/schgen/text-metrics/document-pastes.test.ts`, and it changes no production check.
 *
 * **WHY IT EXISTS.** `tools/schgen/label-freedom/fixtures/*.kicad_sch` are derived artifacts: the
 * probe writes them so that a reader can open the exact sheet a figure was measured on in KiCad.
 * `CLAUDE.md`: *"Derived artifacts are regenerated every run and compared by content, never by
 * timestamp."* `fixtureProblems` below is that content comparison. A hand-edited fixture, a renamed
 * arm, a missing file, a stray file, or a `fixtures.ts` change that was never re-driven fails here.
 *
 * **THE COMPARISON IS A FUNCTION OF ITS FILE SYSTEM, AND THAT IS THE WHOLE POINT OF FIX ROUND 1.**
 * The first version of this file did the comparison inline inside a test, and its "RED" case
 * therefore **never called the comparison and never touched a file**: it perturbed a string in
 * memory and asserted the perturbed string differed from the original, which is true by
 * construction. **So the thing it existed to prove was not proved by it, and weakening the real
 * comparison would have left that "RED" green** - the exact shape `docs/known-gaps.md` records
 * eleven-plus times on this branch. The comparison now takes its reader and its lister as
 * parameters, so a RED case can hand it a corrupted copy and read the refusal it produces. **No
 * test here writes to disk**: the corruption lives in the injected reader.
 *
 * **THE SECOND HALF IS THE OTHER LOAD-BEARING ONE.** Every §5 verdict of the form *"rotating a label
 * leaves net identity alone"* is only about rotation if the rotate arm differs from its base in
 * nothing else. The edit helpers in `fixtures.ts` throw when an arm names no item or two - but a
 * helper that throws does not establish that the RENDERED sheets differ in one place. That is
 * asserted, per arm, with the number of differing lines pinned.
 */

import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../../../tools/perfboard/repo-root.ts"
import { ARMS, render } from "../../../tools/schgen/label-freedom/fixtures.ts"

const repoRoot = moduleRepoRoot()
const FIXTURE_DIR = path.join(repoRoot, "tools/schgen/label-freedom/fixtures")

/**
 * How many LINES each arm's rendered sheet differs from its base's by, counting a line present in
 * one and absent from the other.
 *
 * **Pinned here rather than computed**, so a wider edit is a deliberate change in this file. A
 * one-item edit is 2 (the old line out, the new line in); `a4-reroute` replaces one wire with three,
 * which is 1 out and 3 in.
 */
const EXPECTED_DIFF_LINES: Readonly<Record<string, number>> = {
  "a1-rotate": 2,
  "a2-slide": 2,
  "a3-move-segment": 2,
  "a4-reroute": 4,
  "a5-rename-wired": 2,
  "a6-off-wire": 2,
  "b1-rename-bridge": 2,
  "b2-rotate": 2,
}

const rendered = new Map(ARMS.map((a) => [a.name, render(a.fixture, a.items)] as const))

/** Reads a fixture file by name, or null when it is absent. */
type Reader = (file: string) => string | null
/** Lists the fixture directory. */
type Lister = () => readonly string[]

const diskReader: Reader = (file) => {
  const full = path.join(FIXTURE_DIR, file)
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null
}
const diskLister: Lister = () => fs.readdirSync(FIXTURE_DIR).sort()

/**
 * **THE REAL COMPARISON PATH.** Every way the committed fixtures can disagree with what
 * `fixtures.ts` builds, one refusal string each; empty means they agree.
 *
 * It takes its file system so that a RED case can corrupt a copy. **Each refusal names the arm, the
 * kind of disagreement and - for a content mismatch - the first line that differs and both of its
 * sides**, because an assertion on a count establishes only that something broke, and this function
 * has four distinct refusal paths.
 */
function fixtureProblems(read: Reader, list: Lister): readonly string[] {
  const out: string[] = []
  for (const arm of ARMS) {
    const file = `${arm.name}.kicad_sch`
    const built = rendered.get(arm.name)
    if (built === undefined) throw new Error(`arm ${arm.name} was not rendered, so there is nothing to compare ${file} with`)
    const onDisk = read(file)
    if (onDisk === null) {
      out.push(`${file} is ABSENT from tools/schgen/label-freedom/fixtures; the probe writes it and the commit must carry it`)
      continue
    }
    if (onDisk === built) continue
    const a = onDisk.split("\n")
    const b = built.split("\n")
    const at = a.findIndex((l, i) => l !== b[i])
    out.push(
      `${file} DIFFERS from what fixtures.ts builds, first at line ${at + 1}: on disk ${JSON.stringify(a[at] ?? "(end of file)")}, ` +
        `built ${JSON.stringify(b[at] ?? "(end of file)")}`,
    )
  }
  const expected = ARMS.map((a) => `${a.name}.kicad_sch`).sort()
  for (const f of list()) {
    if (!expected.includes(f)) out.push(`tools/schgen/label-freedom/fixtures holds ${f}, which no arm of fixtures.ts names`)
  }
  return out
}

describe("the committed label-freedom fixtures", () => {
  test("every arm's committed sheet is byte-identical to what fixtures.ts builds, and nothing else is there", () => {
    expect(fixtureProblems(diskReader, diskLister)).toEqual([])
    // The comparison must actually have looked at every arm, or an empty result would mean nothing.
    expect(diskLister().length).toBe(ARMS.length)
  })

  /**
   * **RED, DRIVEN THROUGH THE REAL COMPARISON.** One digit of one coordinate changed in a copy of a
   * committed fixture. The assertion is on the REFUSAL TEXT, not on a count: `fixtureProblems` has
   * four refusal paths and a count-only assertion would establish only that one of them fired.
   */
  test("RED: one digit changed in a committed fixture is refused, by name and by line", () => {
    const victim = "a2-slide.kicad_sch"
    const original = diskReader(victim)
    if (original === null) throw new Error(`${victim} is absent, so this case cannot corrupt it`)
    expect(original).toContain("(at 44.45 38.1 180)")
    const corrupted: Reader = (file) => (file === victim ? original.replace("(at 44.45 38.1 180)", "(at 45.72 38.1 180)") : diskReader(file))
    expect(fixtureProblems(corrupted, diskLister)).toEqual([
      'a2-slide.kicad_sch DIFFERS from what fixtures.ts builds, first at line 56: on disk "\\t(global_label \\"SIGNAL\\" (shape bidirectional) (at 45.72 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid \\"ae8bad41-f7be-422f-86ed-97137ed3ae31\\"))", built "\\t(global_label \\"SIGNAL\\" (shape bidirectional) (at 44.45 38.1 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid \\"ae8bad41-f7be-422f-86ed-97137ed3ae31\\"))"',
    ])
    // And the uncorrupted file system still passes, so the case is the corruption and not the reader.
    expect(fixtureProblems(diskReader, diskLister)).toEqual([])
  })

  /** RED: a fixture deleted. A different refusal path, asserted by its own text. */
  test("RED: a missing fixture is refused by name", () => {
    const gone: Reader = (file) => (file === "b0-base.kicad_sch" ? null : diskReader(file))
    expect(fixtureProblems(gone, diskLister)).toEqual([
      "b0-base.kicad_sch is ABSENT from tools/schgen/label-freedom/fixtures; the probe writes it and the commit must carry it",
    ])
  })

  /** RED: a stray file. The fourth refusal path, which the directory listing is there for. */
  test("RED: a file no arm names is refused by name", () => {
    const extra: Lister = () => [...diskLister(), "a7-left-over.kicad_sch"].sort()
    expect(fixtureProblems(diskReader, extra)).toEqual([
      "tools/schgen/label-freedom/fixtures holds a7-left-over.kicad_sch, which no arm of fixtures.ts names",
    ])
  })

  /**
   * **THE ONE-DIFFERENCE PROPERTY, ASSERTED ON THE RENDERED SHEETS.** Without this, an arm could
   * carry a second change - a moved wire alongside a rotated label - and its §5 verdict would be
   * about two things while naming one.
   */
  test("every arm differs from its base in exactly the pinned number of lines", () => {
    for (const arm of ARMS) {
      if (arm.name === arm.base) continue
      const base = rendered.get(arm.base)
      const mine = rendered.get(arm.name)
      if (base === undefined || mine === undefined) throw new Error(`arm ${arm.name} names base ${arm.base}, which was not rendered`)
      const a = base.split("\n")
      const b = mine.split("\n")
      const d = [...a.filter((l) => !b.includes(l)), ...b.filter((l) => !a.includes(l))]
      expect(`${arm.name}: ${d.length}`).toBe(`${arm.name}: ${EXPECTED_DIFF_LINES[arm.name] ?? -1}`)
    }
    // Every non-base arm is pinned, so adding an arm without pinning its diff fails here.
    expect(Object.keys(EXPECTED_DIFF_LINES).sort()).toEqual(ARMS.filter((a) => a.name !== a.base).map((a) => a.name).sort())
  })

  /**
   * The predictions §5 publishes before its figures live on the arms. This pins that each arm
   * carries one, so an arm cannot be added without a prediction - which is how a figure becomes
   * unfalsifiable.
   */
  test("every arm carries a published prediction, and only the stated arms predict a changed partition or a changed name", () => {
    for (const arm of ARMS) {
      expect(["unchanged", "changed"]).toContain(arm.predictedIdentity)
      expect(["unchanged", "changed"]).toContain(arm.predictedNaming)
    }
    // **The negative control is the only arm that predicts a CHANGED partition.** If another one
    // ever does, §5's discrimination claim needs re-reading rather than this number updating quietly.
    expect(ARMS.filter((a) => a.predictedIdentity === "changed").map((a) => a.name)).toEqual(["b1-rename-bridge"])
    // **And the two arms that predict a changed NAME are the discriminator's two halves.** They are
    // what makes "identity unchanged" on the four freedoms a measurement rather than a property of a
    // probe that ignores labels: `a6-off-wire` moves the label off the net and the exported name
    // changes, so the export demonstrably carries the attachment.
    expect(ARMS.filter((a) => a.predictedNaming === "changed").map((a) => a.name)).toEqual(["a5-rename-wired", "a6-off-wire", "b1-rename-bridge"])
  })
})
