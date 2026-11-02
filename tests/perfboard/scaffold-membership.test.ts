import { test, expect } from "bun:test"
import path from "node:path"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { dumpBoard } from "../../tools/perfboard/buildability-input.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import {
  assertScaffoldMembership,
  checkScaffoldMembership,
} from "../../tools/perfboard/scaffold-membership.ts"
import { DESIGNATORS, SCAFFOLD } from "../../circuits/pultec/physical/low-boost.ts"
import type { ScaffoldDoc, StandInGroupDoc } from "../../lib/board/scaffold/doc.ts"

/**
 * The guard that makes the hatched stand-in diagram trustworthy: the scaffold
 * doc's group membership and the committed layout have to agree.
 *
 * **WHY IT IS NOT COVERED BY WHAT WAS ALREADY HERE.**
 * `assertLayoutMatchesCircuit` and veroroute's own `--check` compare the LAYOUT
 * against the CIRCUIT. `circuits/pultec/physical/scaffold-doc.ts`'s `groupsFor`
 * compares the GROUPS against the MODEL. Nothing compared the GROUPS against
 * the LAYOUT, so a group could claim a part that is not placed and the first
 * symptom would be a confidently-hatched diagram at a bench - where the five
 * `.vrt` files are immutable and owner-approved, so a builder who spots the
 * discrepancy has every reason to blame the diagram's own subject rather than
 * the diagram.
 *
 * **THE REAL-BOARD CASE IS ASSERTED FIRST AND SEPARATELY**, and it asserts the
 * COUNTS. A check that vacuously passed over an empty group list could satisfy
 * every refusal case below by refusing everything, and would then also "pass"
 * the real board without having looked at a single part.
 */
const REPO_ROOT = moduleRepoRoot()

function declarationFor(board: string) {
  return loadDeclaration(path.join(REPO_ROOT, "boards", board, "perfboard.json"))
}

/** The real low-boost doc with its group list swapped - everything else real. */
function withGroups(groups: readonly StandInGroupDoc[]): ScaffoldDoc {
  return { ...SCAFFOLD, groups }
}

test("low-boost's real scaffold doc agrees with its real layout, over real parts", async () => {
  const result = await checkScaffoldMembership(declarationFor("pultec-low-boost"))
  expect(result.status).toBe("checked")
  // The counts, so a vacuous pass over nothing cannot satisfy this test: the
  // low-boost board carries four stand-in groups and eight stand-in parts.
  expect(result.groups).toBe(4)
  expect(result.parts).toBe(8)
  expect(result.message).toContain("4 stand-in group")
  expect(result.message).toContain("8 part")
})

test("every committed Pultec section's scaffold doc agrees with its layout", async () => {
  const sections = ["pultec-low-boost", "pultec-low-cut", "pultec-hi-boost", "pultec-hi-cut", "pultec-mid"]
  for (const board of sections) {
    const result = await checkScaffoldMembership(declarationFor(board))
    expect(result.status).toBe("checked")
    expect(result.groups).toBeGreaterThan(0)
    expect(result.parts).toBeGreaterThan(0)
  }
})

test("a board with no SCAFFOLD reports that it had no scaffold to check", async () => {
  const result = await checkScaffoldMembership(declarationFor("pt2399-core"))
  expect(result.status).toBe("no-scaffold")
  expect(result.groups).toBe(0)
  expect(result.parts).toBe(0)
  // Loud, and in the words `make check` prints: a skipped check must never look
  // like a passing one.
  expect(result.message).toContain("NOTICE")
  expect(result.message).toContain("SCAFFOLD")
  expect(result.message).toContain("NOT checked")
})

test("a group claiming a part id the board's DESIGNATORS do not map refuses, naming both", () => {
  const dump = parseBoardDump(dumpBoard(declarationFor("pultec-low-boost").vrtPath, REPO_ROOT))
  const doc = withGroups([{ section: "hi-cut", partIds: ["SI_HI_CUT_NOT_A_PART"] }])
  expect(() => assertScaffoldMembership(doc, DESIGNATORS, dump, "low-boost")).toThrow(
    /SI_HI_CUT_NOT_A_PART/,
  )
  expect(() => assertScaffoldMembership(doc, DESIGNATORS, dump, "low-boost")).toThrow(/hi-cut/)
})

test("a group claiming a part absent from the dump refuses, naming the part and the group", () => {
  const dump = parseBoardDump(dumpBoard(declarationFor("pultec-low-boost").vrtPath, REPO_ROOT))
  // RV_LO_BOOST is in low-boost's DESIGNATORS and is declared off-board, so it
  // has a designator and no PART line of its own - the exact shape of a group
  // claiming a part that is not placed on this board.
  expect(DESIGNATORS["RV_LO_BOOST"]).toBe("RV_LO_BOOST")
  expect(dump.parts.some((part) => part.ref === "RV_LO_BOOST")).toBe(false)
  const doc = withGroups([{ section: "mid", partIds: ["RV_LO_BOOST"] }])
  expect(() => assertScaffoldMembership(doc, DESIGNATORS, dump, "low-boost")).toThrow(
    /RV_LO_BOOST/,
  )
  expect(() => assertScaffoldMembership(doc, DESIGNATORS, dump, "low-boost")).toThrow(/mid/)
})

test("a part id claimed by two groups refuses, naming both groups", () => {
  const dump = parseBoardDump(dumpBoard(declarationFor("pultec-low-boost").vrtPath, REPO_ROOT))
  // Both groups claim a part that IS placed, so nothing but the double claim
  // can be what this refuses on.
  const doc = withGroups([
    { section: "hi-cut", partIds: ["SI_HI_CUT_R1"] },
    { section: "low-cut", partIds: ["SI_HI_CUT_R1"] },
  ])
  const run = () => assertScaffoldMembership(doc, DESIGNATORS, dump, "low-boost")
  expect(run).toThrow(/SI_HI_CUT_R1/)
  expect(run).toThrow(/hi-cut/)
  expect(run).toThrow(/low-cut/)
})

test("the production entry point refuses too, not only the pure assertion", async () => {
  // THE DUMP IS THE REAL ONE WITH ONE STAND-IN PART'S LINES REMOVED, so the
  // real low-boost SCAFFOLD - the doc that passes above - is what refuses here.
  // Without this, the only thing shown to have teeth is the inner function, and
  // `make check` reaches it through `checkScaffoldMembership`.
  const declaration = declarationFor("pultec-low-boost")
  const real = dumpBoard(declaration.vrtPath, REPO_ROOT)
  const gutted = real
    .split("\n")
    .filter((line) => !line.includes("SI_HI_CUT_R1"))
    .join("\n")
  expect(gutted).not.toBe(real)
  await expect(
    checkScaffoldMembership(declaration, {
      repoRoot: REPO_ROOT,
      dumpBoard: () => gutted,
    }),
  ).rejects.toThrow(/SI_HI_CUT_R1/)
})

test("the real groups, checked part by part, are all placed and all singly claimed", () => {
  const dump = parseBoardDump(dumpBoard(declarationFor("pultec-low-boost").vrtPath, REPO_ROOT))
  const counts = assertScaffoldMembership(SCAFFOLD, DESIGNATORS, dump, "low-boost")
  expect(counts.groups).toBe(SCAFFOLD.groups.length)
  expect(counts.parts).toBe(SCAFFOLD.groups.reduce((sum, group) => sum + group.partIds.length, 0))
  expect(counts.parts).toBeGreaterThan(0)
})
