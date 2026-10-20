/**
 * THE REAL `elkjs`, DRIVEN: DETERMINISM FOR A FIXED INPUT, AND A RAISE AS A VALUE.
 *
 * Hand-written for Task 12 of the M1 schematic-authoring plan. It runs the pinned `elkjs` rather
 * than a double, which is what the `.elk.test.ts` suffix says - the same convention
 * `*.kicad.test.ts` already uses for a test that needs `kicad-cli`.
 *
 * **WHAT IT PINS, AND IT IS THE ONE THING THE SPIKES ESTABLISH ABOUT THIS LAYER.**
 * `docs/known-gaps.md` **G95**: *"determinism for a FIXED input still holds - 14 of 14 inputs gave
 * one distinct output over three runs."* That is what makes the serialized input usable as a
 * manifest key at all, and it is the only property of the engine the manifest rests on. The
 * drawing's QUALITY is not pinned here and must not be: that is Task 16's measurement and Task
 * 17's decision, and a threshold written by the agent producing the drawing is the failure
 * `CLAUDE.md`'s governing invariant is about.
 *
 * **AND IT IS DETERMINISM OF THE DECLARED GEOMETRY, NOT OF THE RETURNED OBJECT.** `elkjs`
 * decorates the graph it returns with a GWT identity hash code (`$H`) that counts up as the worker
 * hashes objects - so `JSON.stringify` of a returned `ElkNode` is a function of everything laid out
 * before it on that worker and not of its own input. `serializeElkInput` emits only declared keys,
 * so it is the comparison. The test two below is the measurement. `docs/known-gaps.md` **G181**.
 */

import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { ELK_BACKEND, elkBackendFrom, elkPrePass, layoutBlocks, raiseLines, type ElkOutcome } from "../../../tools/schgen/elk/layout.ts"
import { elkInputOf } from "../../../lib/schgen/elk/graph.ts"
import { serializeElkInput } from "../../../lib/schgen/elk/serialize.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { selectRenderer, subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../../lib/schgen/render/templates/index.ts"
import { PARITY_CASES, parityResolver } from "../../../tools/schgen/authoring-census.ts"
import { declaredBlockCount } from "../../../tools/schgen/parity.ts"
import { LAYER_CONSTRAINT_KEY } from "../../../lib/schgen/elk/options.ts"
import { dividerSubgraph } from "./fixtures.ts"
import type { ElkBlockInput } from "../../../lib/schgen/elk/graph.ts"
import type { BlockId } from "../../../lib/schgen/ir/types.ts"

test("ELK_BACKEND names the version actually installed", () => {
  const file = fileURLToPath(import.meta.resolve("elkjs/package.json"))
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"))
  const version =
    typeof parsed === "object" && parsed !== null && "version" in parsed ? Reflect.get(parsed, "version") : undefined
  expect(typeof version).toBe("string")
  expect(ELK_BACKEND).toBe(`elkjs@${String(version)}`)
})

test("the same input three times gives one distinct output", async () => {
  const input = elkInputOf(dividerSubgraph())
  const seen = new Set<string>()
  for (let run = 0; run < 3; run += 1) {
    const outcomes = await layoutBlocks([input])
    const outcome = outcomes.get(input.blockId)
    expect(outcome?.ok, raiseLines(outcomes).join("; ")).toBe(true)
    if (outcome !== undefined && outcome.ok) seen.add(serializeElkInput(outcome.graph))
  }
  expect(seen.size).toBe(1)
  // The run really laid something out: every node carries a position it did not have going in.
  const laid = [...seen][0] ?? ""
  expect(laid).toContain('"x":')
  expect(laid).not.toBe(input.serialized)
})

test("the serialized output carries no GWT internals, which is why it is the comparison", async () => {
  const input = elkInputOf(dividerSubgraph())
  const outcome = (await layoutBlocks([input])).get(input.blockId)
  expect(outcome?.ok).toBe(true)
  if (outcome === undefined || !outcome.ok) return
  expect(serializeElkInput(outcome.graph)).not.toContain("$H")
  // ... and the raw object does carry it, so this is not a check of nothing.
  expect(JSON.stringify(outcome.graph)).toContain("$H")
})

/**
 * **THE MEASUREMENT BEHIND THAT, AND IT IS WHY THE SERIALIZER IS THE COMPARISON** (G181).
 *
 * `$H` is the GWT identity hash code the worker stamps on an object, and it counts up as the
 * worker hashes objects - so it is a function of everything the worker laid out BEFORE this block,
 * not of this block's input. `layoutBlocks` runs every block on one worker, so **two blocks with
 * the same graph come back with different `$H` values**: 277/282/286/288/13 against
 * 371/375/379/381/369, measured. A manifest or a baseline comparing the raw returned object would
 * therefore report two identical drawings as different, depending on what preceded them.
 */
test("two identical graphs on one worker serialize alike and raw-stringify differently", async () => {
  const base = elkInputOf(dividerSubgraph())
  const first: ElkBlockInput = { ...base, blockId: "FIRST", graph: { ...base.graph, id: "FIRST" } }
  const second: ElkBlockInput = { ...base, blockId: "SECOND", graph: { ...base.graph, id: "SECOND" } }
  const outcomes = await layoutBlocks([first, second])
  const a = outcomes.get("FIRST")
  const b = outcomes.get("SECOND")
  expect(a?.ok).toBe(true)
  expect(b?.ok).toBe(true)
  if (a === undefined || b === undefined || !a.ok || !b.ok) return
  const sameIds = (s: string): string => s.replaceAll("FIRST", "ID").replaceAll("SECOND", "ID")
  expect(sameIds(serializeElkInput(a.graph))).toBe(sameIds(serializeElkInput(b.graph)))
  expect(sameIds(JSON.stringify(a.graph))).not.toBe(sameIds(JSON.stringify(b.graph)))
})

test("an empty input list lays nothing out and spawns no worker", async () => {
  expect((await layoutBlocks([])).size).toBe(0)
})

/** An edge to a node that does not exist: `elkjs` rejects, and the rejection must be a VALUE. */
const RAISING_INPUT: ElkBlockInput = {
  blockId: "RAISES",
  serialized: '{"id":"RAISES"}',
  graph: {
    id: "RAISES",
    children: [{ id: "a", width: 1270, height: 1270 }],
    edges: [{ id: "N:0", sources: ["a"], targets: ["absent"] }],
  },
}

test("a backend raise is a backend-raised mismatch, never an escaped exception", async () => {
  const outcomes = await layoutBlocks([RAISING_INPUT])
  const outcome = outcomes.get("RAISES")
  expect(outcome?.ok).toBe(false)
  if (outcome === undefined || outcome.ok) return
  expect(outcome.mismatch.kind).toBe("backend-raised")
  if (outcome.mismatch.kind !== "backend-raised") return
  expect(outcome.mismatch.backend).toContain("elkjs")
  expect(outcome.mismatch.inputKey).toBe(RAISING_INPUT.serialized)
  expect(outcome.mismatch.reason).toContain("Referenced shape does not exist")
  expect(raiseLines(outcomes)).toEqual([`RAISES: ${outcome.mismatch.reason} [backend-raised: ${ELK_BACKEND} raised on ${RAISING_INPUT.serialized}]`])
})

test("the backend forwards a raise to the caller and refuses a missing block by name", async () => {
  const outcomes = await layoutBlocks([RAISING_INPUT])
  const backend = elkBackendFrom(outcomes)
  const g = dividerSubgraph()
  const raising = { ...g, block: { ...g.block, id: "RAISES" } }
  const result = backend.realise(raising)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.mismatch.kind).toBe("backend-raised")
  expect(() => backend.realise(g)).toThrow(/holds no outcome for it/)
})

test("a block the pre-pass DID lay out refuses, naming Task 13's adapter", async () => {
  const input = elkInputOf(dividerSubgraph())
  const backend = elkBackendFrom(await layoutBlocks([input]))
  expect(() => backend.realise(dividerSubgraph())).toThrow(/adaptElkLayout/)
})

/**
 * **EVERY DECLARED BLOCK OF THE FOUR PARITY CIRCUITS, THROUGH THE REAL BACKEND.**
 *
 * Task 10's census measured that the eight ported templates draw **2 of these 12 blocks**, and
 * only when handed an anchor nothing derives - so every one of the twelve reaches ELK, and this is
 * the only path that can draw them (`docs/known-gaps.md` **G141**, **G160**). What is asserted is
 * that each one produces an OUTCOME: a raise is a value and never an escaped exception.
 *
 * **The ok/raised split is deliberately NOT asserted.** It is a property of a dependency defect
 * (**G94**) at a pinned version, and Task 14 is the task that decides what the generator does with
 * it. The numbers are reported in `docs/known-gaps.md` **G185** as a measurement instead.
 */
test("all twelve declared blocks produce an ElkOutcome", async () => {
  const symbols = parityResolver()
  const inputs: ElkBlockInput[] = []
  const expectedBlocks: BlockId[] = []
  for (const parityCase of PARITY_CASES) {
    const circuit = buildCircuit(circuitSpecFrom(parityCase.network, parityCase.authoring, symbols), { symbols })
    for (const declaration of parityCase.authoring.blocks) {
      const g = subgraphOf(circuit, declaration.id, symbols)
      expect(selectRenderer(g, TEMPLATES).kind, `${parityCase.name}/${declaration.id}`).toBe("elk")
      inputs.push(elkInputOf(g))
      expectedBlocks.push(declaration.id)
    }
  }
  expect(inputs.length).toBe(declaredBlockCount(PARITY_CASES))
  const outcomes = await layoutBlocks(inputs)
  expect([...outcomes.keys()].sort()).toEqual([...expectedBlocks].sort())
  for (const id of expectedBlocks) {
    const outcome: ElkOutcome | undefined = outcomes.get(id)
    expect(outcome, `block ${id} produced no outcome`).toBeDefined()
    if (outcome !== undefined && !outcome.ok) {
      expect(outcome.mismatch.kind, `block ${id}`).toBe("backend-raised")
    }
  }
}, 120_000)

/**
 * **THIS TEST REPLACES ONE RULING R29 DELETED, AND THE REPLACEMENT IS THE OPPOSITE ASSERTION.**
 *
 * What stood here was *"the pre-pass refuses an ELK-bound block when no authoring declaration is
 * given"*, matching `/GenerateEnv.authoring/`. That refusal existed because the ELK graph needed
 * two declared things the IR had no slot for; R29 put the missing one in the IR
 * (`CircuitSpec.portDirections`), `GenerateEnv.authoring` is deleted and `elkPrePass` takes the
 * circuit and its symbols. **There is no state left for that refusal to name**, so the test is
 * replaced rather than adapted: keeping it against a nullable parameter nobody passes would be a
 * check that cannot fail.
 *
 * What is asserted instead is `docs/known-gaps.md` **G186**'s criterion directly - *"nothing beside
 * a design has to be handed to `generate` for a block to reach ELK"* - over a real parity circuit,
 * whose blocks all reach ELK (**G141**, **G160**). It fails if the pre-pass ever needs another
 * argument, and it fails if a boundary net's direction stops arriving: `3V3_SENSE` and its peers
 * are declared in the authoring file, `circuitSpecFrom` carries the declaration onto the spec, and
 * a graph built without it would have no `FIRST_SEPARATE`/`LAST_SEPARATE` constraint at all.
 */
test("the pre-pass needs nothing beside the circuit and its symbols (G186's criterion)", async () => {
  const symbols = parityResolver()
  const parityCase = PARITY_CASES[0]
  expect(parityCase).toBeDefined()
  if (parityCase === undefined) return
  const spec = circuitSpecFrom(parityCase.network, parityCase.authoring, symbols)
  // The declaration reached the spec: this is the input G186 says the IR was missing.
  expect(Object.keys(spec.portDirections).length, "the parity case declares port directions").toBeGreaterThan(0)
  const circuit = buildCircuit(spec, { symbols })
  expect(circuit.portDirections).toEqual(spec.portDirections)
  const outcomes = await elkPrePass(circuit, symbols)
  // Every declared block of this case selects ELK, so the pre-pass must have laid out all of them.
  expect(outcomes.size).toBe(parityCase.authoring.blocks.length)
  expect(outcomes.size).toBeGreaterThan(0)

  // **And the declared directions are what shaped the boundary nodes - measured over ALL FOUR
  // cases, which is where the constrained nodes are.** Scoping this to PARITY_CASES[0] was tried
  // and it measured ZERO: the Task 12 review's figure is 38 boundary nodes across all twelve
  // declared blocks, 34 unconstrained, 4 `LAST_SEPARATE` and 0 `FIRST_SEPARATE`, and none of the
  // four fall in the first case. An assertion over one case would have been an assertion about
  // nothing, which is why it is written over the population the figure was taken over.
  const constrained = PARITY_CASES.flatMap((c) => {
    const built = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    return c.authoring.blocks.flatMap((declaration) => {
      const graph = elkInputOf(subgraphOf(built, declaration.id, symbols)).graph
      return (graph.children ?? []).filter((n) => n.layoutOptions?.[LAYER_CONSTRAINT_KEY] !== undefined)
    })
  })
  expect(constrained.length, "a declared direction must constrain at least one boundary node").toBeGreaterThan(0)
}, 120_000)
