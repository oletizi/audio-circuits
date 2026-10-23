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
 * timestamp."* This is the content comparison. A hand-edited fixture, a renamed arm, or a
 * `fixtures.ts` change that was never re-driven fails here.
 *
 * **THE SECOND HALF IS THE LOAD-BEARING ONE.** Every §5 verdict of the form *"rotating a label
 * leaves net identity alone"* is only about rotation if the rotate arm differs from its base in
 * nothing else. The arms are built as one edit each, and the edit helpers in `fixtures.ts` throw
 * when an arm names no item or two - but a helper that throws does not establish that the RENDERED
 * sheets differ in one place. This asserts the rendered difference, per arm, with the number of
 * differing lines pinned.
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
  "b1-rename-bridge": 2,
  "b2-rotate": 2,
}

const rendered = new Map(ARMS.map((a) => [a.name, render(a.fixture, a.items)] as const))

function diffLines(base: string, arm: string): readonly string[] {
  const a = base.split("\n")
  const b = arm.split("\n")
  return [...a.filter((l) => !b.includes(l)).map((l) => `- ${l.trim()}`), ...b.filter((l) => !a.includes(l)).map((l) => `+ ${l.trim()}`)]
}

describe("the committed label-freedom fixtures", () => {
  test("every arm has a committed sheet whose bytes are what fixtures.ts builds", () => {
    for (const arm of ARMS) {
      const file = path.join(FIXTURE_DIR, `${arm.name}.kicad_sch`)
      expect(`${arm.name} exists: ${fs.existsSync(file)}`).toBe(`${arm.name} exists: true`)
      expect(`${arm.name}: ${fs.readFileSync(file, "utf8")}`).toBe(`${arm.name}: ${rendered.get(arm.name) ?? ""}`)
    }
  })

  test("the directory holds exactly the arms and nothing else", () => {
    const onDisk = fs.readdirSync(FIXTURE_DIR).sort()
    expect(onDisk).toEqual(ARMS.map((a) => `${a.name}.kicad_sch`).sort())
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
      expect(base).toBeDefined()
      expect(mine).toBeDefined()
      const d = diffLines(base ?? "", mine ?? "")
      expect(`${arm.name}: ${d.length}`).toBe(`${arm.name}: ${EXPECTED_DIFF_LINES[arm.name] ?? -1}`)
    }
  })

  /**
   * RED: a fixture edited after the fact. The comparison above is byte-for-byte, so this drives the
   * failure path rather than trusting that it exists - with the file untouched on disk.
   */
  test("RED: one digit changed in a committed fixture", () => {
    const text = rendered.get("a2-slide")
    expect(text).toContain("(at 44.45 38.1 180)")
    const perturbed = (text ?? "").replace("(at 44.45 38.1 180)", "(at 45.72 38.1 180)")
    expect(perturbed).not.toBe(text)
    expect(perturbed).not.toBe(rendered.get("a0-base"))
  })

  /**
   * The predictions §5 publishes before its figures live on the arms. This pins that each arm
   * carries one, so an arm cannot be added without a prediction - which is how a figure becomes
   * unfalsifiable.
   */
  test("every arm carries a published prediction for both properties", () => {
    for (const arm of ARMS) {
      expect(["unchanged", "changed"]).toContain(arm.predictedIdentity)
      expect(["unchanged", "changed"]).toContain(arm.predictedNaming)
    }
    // The negative control is the only arm that predicts a CHANGED partition. If another one ever
    // does, §5's discrimination claim needs re-reading rather than this number updating quietly.
    expect(ARMS.filter((a) => a.predictedIdentity === "changed").map((a) => a.name)).toEqual(["b1-rename-bridge"])
  })
})
