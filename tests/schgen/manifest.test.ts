/**
 * SPEC §2.1's MANIFEST, AND THE ONE CHECK THAT IS THE REASON TASK 16 EXISTS.
 *
 * **`docs/known-gaps.md` G95 TURNED INTO A CHECK THAT COULD FAIL.** That entry measured three
 * shuffles of one netlist - *"same components, same nets, same partition"* - producing three
 * distinct drawings out of three, and concluded that *"a hash over the section `Network`'s CONTENT
 * would not detect the change that moved the drawing. A manifest built that way would certify two
 * different drawings under one input hash, which is exactly the failure the manifest exists to
 * prevent."* The first test below is that sentence as two assertions in opposite directions: the
 * network hash must AGREE across the shuffle and the layout-input hash must DISAGREE. Either one
 * alone passes for the wrong reasons - a manifest that hashed nothing would satisfy the first, and
 * one that hashed everything would satisfy the second.
 *
 * **WHAT IS SHUFFLED, and it is chosen from the pipeline rather than from the spike.** G95's spike
 * shuffled a netlist through its own converter. In THIS pipeline the order that reaches ELK is a
 * block's MEMBER order: `subgraphOf` builds `units` from `block.members`, `elkInputOf` builds the
 * graph's `children` and each net's terminal list from `units`, and `serializeElkInput` writes
 * them in that order. `CircuitSpec.parts` order does not reach it. So the shuffle here reverses one
 * drawn block's member list, which is *"same components, same nets, same partition"* exactly -
 * verified below, because the test asserts the two member lists are permutations of each other
 * rather than assuming it.
 */
import { beforeAll, describe, expect, it } from "bun:test"
import {
  MANIFEST_FILE,
  buildManifest,
  canonicalNetworkText,
  canonicalTextOf,
  manifestInputsOf,
  parseManifest,
  serializeManifest,
  sha256,
  staleManifestInputs,
  type ManifestInputs,
} from "../../lib/schgen/manifest.ts"
import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { selectRenderer, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { elkInputOf } from "../../lib/schgen/elk/graph.ts"
import { PARITY_CASES, parityResolver } from "../../tools/schgen/authoring-census.ts"
import type { SchematicAuthoring } from "../../lib/schgen/authoring.ts"
import type { BlockId, CircuitSpec } from "../../lib/schgen/ir/types.ts"
import type { SymbolResolver } from "../../lib/schgen/render/library.ts"

/** The parity circuit whose blocks reach the ELK backend at all (docs/known-gaps.md G200). */
const SUBJECT = "transistor-preamp"

function caseFor(name: string): { readonly authoring: SchematicAuthoring; readonly spec: (a: SchematicAuthoring, s: SymbolResolver) => CircuitSpec } {
  const found = PARITY_CASES.find((c) => c.name === name)
  if (found === undefined) throw new Error(`no parity circuit is called ${name}`)
  return { authoring: found.authoring, spec: (a, s) => circuitSpecFrom(found.network, a, s) }
}

/** The same authoring declaration with one block's members reversed: a permutation, nothing else. */
function withMembersReversed(a: SchematicAuthoring, block: BlockId): SchematicAuthoring {
  return { ...a, blocks: a.blocks.map((b) => (b.id === block ? { ...b, members: [...b.members].reverse() } : b)) }
}

/** The five manifest inputs for one authoring order; only `layoutInputs` can move. */
function inputsFor(spec: CircuitSpec, symbols: SymbolResolver): ManifestInputs {
  const circuit = buildCircuit(spec, { symbols })
  const layoutInputs: Record<BlockId, string> = {}
  for (const block of circuit.blocks.values()) {
    if (block.rendering.kind === "bus") continue
    const g = subgraphOf(circuit, block.id, symbols)
    if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
    layoutInputs[block.id] = elkInputOf(g).serialized
  }
  return {
    canonicalNetlist: null,
    sectionNetwork: canonicalNetworkText(spec),
    layoutInputs,
    templateLibrary: "templates v0",
    ruleLibrary: "rules v0",
    generated: { "mini.kicad_sch": "(kicad_sch)" },
  }
}

describe("the generation manifest, spec 2.1", () => {
  const symbols = parityResolver()
  const subject = caseFor(SUBJECT)
  // A block with more than one member, so reversing its member list is a real permutation.
  const block = subject.authoring.blocks.find((b) => b.members.length > 1)?.id
  let shuffleOne: ManifestInputs
  let shuffleTwo: ManifestInputs

  beforeAll(() => {
    if (block === undefined) throw new Error(`${SUBJECT} declares no block with more than one member`)
    shuffleOne = inputsFor(subject.spec(subject.authoring, symbols), symbols)
    shuffleTwo = inputsFor(subject.spec(withMembersReversed(subject.authoring, block), symbols), symbols)
  })

  it("shuffles the SAME components, nets and partition - which is what makes the next test mean anything", () => {
    const one = subject.authoring.blocks.find((b) => b.id === block)?.members ?? []
    const two = withMembersReversed(subject.authoring, block ?? "").blocks.find((b) => b.id === block)?.members ?? []
    expect(one.length, "the subject block has members").toBeGreaterThan(1)
    expect([...two].sort(), "the shuffle is a permutation and adds or drops nothing").toEqual([...one].sort())
    expect(two, "and it is not the same order, or the comparison below is vacuous").not.toEqual(one)
  })

  it("the manifest hashes the serialized layout input, not the network", () => {
    const a = buildManifest(shuffleOne)
    const b = buildManifest(shuffleTwo)
    expect(a.sectionNetworkSha256, "the same circuit").toBe(b.sectionNetworkSha256)
    expect(a.layoutInputSha256, "a different drawing").not.toEqual(b.layoutInputSha256)
  })

  it("a manifest whose input hashes moved is stale, and does not regenerate", () => {
    expect(staleManifestInputs(buildManifest(shuffleOne), shuffleTwo).length).toBeGreaterThan(0)
  })

  it("is live against the inputs it was built from, so the staleness report is not just always non-empty", () => {
    expect(staleManifestInputs(buildManifest(shuffleOne), shuffleOne)).toEqual([])
  })

  it("names WHICH input moved, and a template edit is a different name from a reordered block", () => {
    const base = buildManifest(shuffleOne)
    expect(staleManifestInputs(base, shuffleTwo).join(" ")).toContain("layoutInput[")
    const templateEdited = staleManifestInputs(base, { ...shuffleOne, templateLibrary: "templates v1" })
    expect(templateEdited.length).toBe(1)
    expect(templateEdited[0] ?? "").toStartWith("templateLibrary:")
  })

  it("reports a block whose layout input appeared or vanished, in both directions", () => {
    const base = buildManifest(shuffleOne)
    const names = Object.keys(shuffleOne.layoutInputs)
    const first = names[0]
    if (first === undefined) throw new Error("no block of the subject circuit reached the layout backend")
    const without: Record<BlockId, string> = { ...shuffleOne.layoutInputs }
    delete without[first]
    expect(staleManifestInputs(base, { ...shuffleOne, layoutInputs: without }).join(" ")).toContain("and this block has none now")
    const extra = { ...shuffleOne.layoutInputs, "a-block-nobody-declared": "{}" }
    expect(staleManifestInputs(base, { ...shuffleOne, layoutInputs: extra }).join(" ")).toContain("has a layout input now and the manifest records none")
  })

  it("reports a canonical netlist that appeared, so the null is not read as agreement", () => {
    const base = buildManifest(shuffleOne)
    expect(base.canonicalNetlistSha256).toBeNull()
    const gained = staleManifestInputs(base, { ...shuffleOne, canonicalNetlist: "(export (version E))" })
    expect(gained.length).toBe(1)
    expect(gained[0] ?? "").toStartWith("canonicalNetlist:")
  })

  it("round-trips through its own serialization, and MANIFEST.json is not in generatedSha256", () => {
    const m = buildManifest(manifestInputsOf(
      { canonicalNetlist: null, sectionNetwork: "n", layoutInputs: {}, templateLibrary: "t", ruleLibrary: "r" },
      new Map([[MANIFEST_FILE, "whatever"], ["mini.kicad_sch", "(kicad_sch)"]]),
    ))
    expect(Object.keys(m.generatedSha256)).toEqual(["mini.kicad_sch"])
    expect(parseManifest(serializeManifest(m))).toEqual(m)
  })

  it("refuses a manifest with an unknown key, a wrong version, or a hash that is not a sha256", () => {
    const good = serializeManifest(buildManifest(shuffleOne))
    expect(() => parseManifest(good.replace('"version": 1', '"version": 2'))).toThrow(/"version" must be exactly 1/)
    expect(() => parseManifest(good.replace('"version": 1,', '"version": 1,\n  "extra": 1,'))).toThrow(/"extra", which is not a manifest field/)
    expect(() => parseManifest(good.replace(/"sectionNetworkSha256": "[0-9a-f]{64}"/, '"sectionNetworkSha256": "ABC"'))).toThrow(/not a lowercase 64-character hex sha256/)
    expect(() => parseManifest("not json")).toThrow(/is not valid JSON/)
  })
})

describe("canonicalNetworkText", () => {
  const symbols = parityResolver()
  const subject = caseFor(SUBJECT)

  it("is insensitive to declaration ORDER and sensitive to CONTENT", () => {
    const spec = subject.spec(subject.authoring, symbols)
    const reordered: CircuitSpec = { ...spec, parts: [...spec.parts].reverse(), blocks: [...spec.blocks].reverse() }
    expect(canonicalNetworkText(reordered), "a reordered declaration is the same circuit").toBe(canonicalNetworkText(spec))
    const dropped: CircuitSpec = { ...spec, parts: spec.parts.slice(1) }
    expect(canonicalNetworkText(dropped), "a circuit with a part removed is not").not.toBe(canonicalNetworkText(spec))
  })

  it("refuses an undefined field rather than letting JSON.stringify drop it, and refuses a function", () => {
    // A field JSON.stringify omits is a field two circuits could differ in while hashing the same,
    // which is the failure the manifest exists to prevent. Driven through canonicalTextOf, which
    // takes `unknown` precisely so these two arms need no cast.
    expect(() => canonicalTextOf({ portDirections: { GOOD: "in", BAD: undefined } }, "spec")).toThrow(
      /spec\.portDirections\.BAD is undefined/,
    )
    expect(() => canonicalTextOf({ build: () => 1 }, "spec")).toThrow(/spec\.build is a function/)
  })

  it("sorts a nested array of objects, so two orders of one list agree", () => {
    const a = canonicalTextOf({ parts: [{ id: "A" }, { id: "B" }] }, "x")
    const b = canonicalTextOf({ parts: [{ id: "B" }, { id: "A" }] }, "x")
    expect(a).toBe(b)
    expect(a).not.toBe(canonicalTextOf({ parts: [{ id: "A" }, { id: "C" }] }, "x"))
  })

  it("sha256 is the hash it says it is", () => {
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
  })
})
