import { test, expect } from "bun:test"
import path from "node:path"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { loadBoardCircuit } from "../../tools/guide/circuit.ts"

const REPO_ROOT = moduleRepoRoot()

test("a Pultec section's circuit carries its scaffold doc", async () => {
  const declaration = loadDeclaration(path.join(REPO_ROOT, "boards", "pultec-low-boost", "perfboard.json"))
  const circuit = await loadBoardCircuit(declaration)
  const scaffold = circuit.scaffold
  if (scaffold === undefined) throw new Error("low-boost declares SCAFFOLD; the guide did not load it")
  expect(scaffold.section).toBe("low-boost")
  // THE PREMISE, before any count that rests on it: four absent sections.
  expect(scaffold.groups.length, "low-boost holds a group for each of the other four sections").toBe(4)
  expect(scaffold.groups.flatMap((g) => g.partIds).length, "eight stand-in parts").toBe(8)
})

test("a board that declares no SCAFFOLD loads undefined rather than an empty doc", async () => {
  const declaration = loadDeclaration(path.join(REPO_ROOT, "boards", "pt2399-core", "perfboard.json"))
  const circuit = await loadBoardCircuit(declaration)
  expect(circuit.scaffold).toBeUndefined()
})
