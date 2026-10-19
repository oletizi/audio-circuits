# Schematic authoring, milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** M1 of sub-project T2, as `docs/superpowers/specs/2026-10-19-schematic-authoring-design.md` §6 defines it — **`schgen` ported, ELK integrated at both seams, the geometry and verification contracts of §1.3, §1.4, §1.5, §1.6, §2 and §2.1 established, and existing-template parity demonstrated.** M1 produces **no Pultec section schematic**, and the spec says why in terms: *"a plan that reorders T2 to reach a Pultec sheet earlier is reintroducing the shortcut."*

**Architecture:** Eighteen tasks in four arcs. **Tasks 1–7** port `tools/schgen/` from the pedals repository — 94 non-test TypeScript files, ~8,900 source lines in the parts that port, under `lib/schgen/` (pure) and `tools/schgen/` (fs, `kicad-cli`, the CLI verb). **Task 8** widens `RealiseResult`, which every later task's backend implements. **Tasks 9–11** give the model what a backend needs, take parity's first reading, and build the four gates and the round trip. **Tasks 12–18** add ELK at both seams, the manifest, the baseline, the re-measurement and the block-size decision, and delete the superseded stub.

**Tech Stack:** TypeScript on Bun. `elkjs` (new dependency, pinned). `kicad-cli` from the installed KiCad, which `make check` already requires. No `fast-xml-parser`: gate 3 reads this repository's own s-expression netlist importer instead (Task 11).

**Spec:** `docs/superpowers/specs/2026-10-19-schematic-authoring-design.md`, revision 2. **Parent:** `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`. Where this plan and the child spec disagree, the spec wins; where the spec and the parent disagree, the parent wins. The measurements the plan argues from are `docs/known-gaps.md` **G81, G84, G85, G90, G94–G103** and `docs/schematic/elk-spike.md` / `elk-block-spike.md`.

**Port source, read before this plan was written:** `/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen`. Every signature quoted below was read there, not recalled.

---

## What is NOT in this plan, and why

- **M2 in its entirety** — the five new analog idioms (`selectorBank`, `potNetwork`, `tappedReturn`, `modeSwitch`, `bjtStage`), the three uncovered constructs (the stand-in group, the junction bus, the cross-board gang) and **all five Pultec section schematics.** Spec §6's M2 column, and §5.5: *"Designing them is spec work, not plan work."*
- **`tools/schgen/h7/`** — 9 source files, 1,195 lines. Pedals' own board: its STM32H7 sheet harness, its designator map, its owner-items list, its datasheet-PDF provenance. Nothing here has an H7.
- **`tools/schgen/oscar/acquire.test.ts`** — the acquisition of a foreign reference design at a pinned commit. We have no OSCAR.
- **`tools/schgen/gates/oscar/`** — 5 source files, 916 lines, **deferred to M2 with the parent's instruction recorded against it.** The parent says *"`gates/oscar/` ports too, and this repository supplies its own reference material"* — `pt2399-core.kicad_sch` and `lab-board.kicad_sch`. Two things stop it being M1 work: its comparison is gated on `deltaIdsFromBrief(markdown)` reading a `CORE-BRIEF.md` of declared deltas, a document this repository does not have and whose analogue is a design decision; and `graphFromNetlist` is written against pedals' `connectivityFromXml`/`componentsFromXml` XML readers, which Task 11 replaces for gate 3 and would have to replace again here. **This is a deviation from a parent instruction, so Task 11 records it in `docs/known-gaps.md`** with the criterion that settles it: *a generated schematic is compared against a hand-arranged one by value and pin-level adjacency, independent of references and net names.* The round trip (Task 11) is not that check and must not be reported as it.
- **The MCU pin map** — `ir/build.ts`'s `PinmapInput`, `@/pinmap/load`, `@/pinmap/stPinData`, and `pintables/fromSt.ts`. There is no MCU here. Task 2 removes the branch rather than porting a dead one: *supersede means delete.*
- **A geometry repair pass after snapping.** Spec §1.4 obligation 5 decides refusal; §4 puts a repair pass out of scope.
- **A composite readability score.** Spec §3.3: the four measures are reported separately.

---

## Decisions this plan makes, which the spec left to it

Each is argued, not asserted. A later reader who disagrees should argue with the reason, not discover there was none.

### D1. Block cutting: declared blocks only, and the generator never cuts one (spec §1.8)

**The mechanism is decided here. The number is deferred to Task 17 with G101's own criterion.**

**Decided: a block is a set of component ids declared in a committed authoring file, and the generator never subdivides or merges one.** Reasoning, in order of force:

1. **A generator that chooses its own block cut chooses the unit its own measurements are taken over.** Spec §3.3 and §3.4 measure *per block*; §1.8 says a block above the ceiling has a measured quality that is *"partly a property of the order somebody typed the components in"*. An agent picking the cut would therefore be picking what the numbers mean — `CLAUDE.md`'s invariant wearing a measurement's clothes, which that file warns about by name.
2. **The declarations already exist and the spikes measured exactly them.** G100/G101 took 18 blocks *"from `include()`, `OWNERSHIP`/`partitionReference()`, `LEGS` and `allStandIns()` and from nothing an agent chose."* `includeNetwork` prefixes every component id with `${prefix}_`, so a declared block is recoverable — but recovering it by string-prefix matching would put the cut back in the generator's hands. The authoring file lists ids; Task 9 adds a check that the declared blocks **agree with** the `include()` prefixes wherever a prefix exists. Declared *and* checked against the model's own composition.
3. **The repository's own declarations fall outside G101's window on both sides** — `standin-mid` at 1 part and `pultec-mid` at 28, against a floor near 4 and a ceiling near 9. A numeric rule adopted now would immediately refuse the owner's declared structure, which is deriving a rule from measurement and then aiming it at a declaration.
4. **Both bounds were measured with no template in the loop** (§5.6, G101's own caveat). Choosing a number before Task 17's re-measurement would be inheriting figures that were never about M1's pipeline.

**What M1 does instead of choosing:** Task 16's report prints, per block, its part count, its port-glyph share of cells, and **which of G101's two bounds it is outside** — above the ceiling, below the floor, or inside the window — with the cost named. It is a report line, never a refusal. **Task 17 then makes the numeric decision against the criterion the spec states: *"a block-size decision names both bounds and says which cost it is paying."*** If Task 17's re-measurement moves a bound, the deviation is recorded.

### D2. The ELK backend is asynchronous and `Template.realise` is not, so ELK runs in a pre-pass

`elkjs`'s only public layout entry point is `ELK.prototype.layout(graph): Promise<ElkNode>`. `Template.realise(g: BlockSubgraph): RealiseResult` is synchronous, and `connectorFanout` depends on that: it calls `checkLayout` inside `realise` and tries four rotations. Making `realise` async would change seven templates and every caller for one backend's benefit.

**Decided: an asynchronous pre-pass lays out every ELK-routed block before the synchronous realise dispatch runs, and the ELK backend's `realise` reads that pre-pass's result by block id.** `layoutBlocks(inputs): Promise<ReadonlyMap<BlockId, ElkOutcome>>` runs once in `generate`; `elkBackendFrom(outcomes)` returns a synchronous `ElkBackend`. A block whose outcome is missing is a refusal naming the block, not a lazy layout. **Task 12 Step 1 verifies the premise** and records the deviation if `elkjs` turns out to expose a synchronous entry point.

### D3. The `labels` rendering is deleted from the port, not ported

`Rendering` has three variants in the source: `wired`, `bus`, `labels`. **`labels` is deleted.** The parent's *"There is no implicit fallback to label-rendering"*, the pedals review it quotes (*"Why generate a knowingly inferior schematic and rely on an agent later noticing it?"*), and `docs/known-gaps.md` **G81** — which records that `lib/kicad/schematic.ts` emits *"the exact pathology another project was blocked from shipping"* — all point the same way, and Task 18 deletes the only thing in this repository that draws that way. Porting a second labels-everywhere renderer in the change that deletes the first would be absurd. **`bus` ports** (pt2399-core's 16-pin PT2399 needs it). **A new variant `{ kind: "auto" }` is added** by Task 8: try every template in the registry's order; the first `ok` wins; **all** `not-applicable` selects ELK; **any** `invalid-geometry`, `clearance` or `backend-raised` refuses. This is a deliberate departure from *port whole* and Task 8 records it.

### D4. Flow direction is left-to-right, pinned here (spec §1.7, §5.2)

Spec §1.7: *"One must be pinned and the others made to match."* `netlistsvg`'s analog skin sets `direction=DOWN`; `schgen`'s `opampStage` puts `+` above `−` on the left and the output on the right, and its chains leave rightward. **The templates are the reviewed human arrangement (§3.1) and ELK is the thing being made to match**, so `elk.direction = "RIGHT"` and sheet-level flow is left-to-right. **The cost is stated: both spikes' numbers were taken under `DOWN`**, so every figure in §1.1, §1.8, §3.3 and §3.4 may move — which is §5.6's criterion, and Task 17 is where it is answered.

### D5. One cross-sheet mechanism per net, decided by a declared property (spec §1.6)

The port already emits exactly two: `anchorsToSymbols` turns a rail anchor into a `PowerSymbol` and every other anchor into a `GlobalLabel`, and `emit.ts` writes `global_label`. Hierarchical ports are not emitted at all. **Decided: a rail crosses a sheet boundary through its power symbol, every other net through a global label, and no net uses both.** Spec §1.6 asks that *"exactly one mechanism carries cross-sheet connectivity"*; the reading adopted here is **one mechanism per net, selected by whether the net is a declared rail** — a declared property of the model, not a choice at drawing time — and a net carrying two is the refusal. That reading is recorded in Task 15 so a later reader can dispute it.

### D6. Where the `RealiseResult` widening sits: Task 8, and it cannot move

Three constraints fix it:

- **After the templates exist (Task 7).** The widening is 30 `mismatch(...)` call sites across seven template files plus the five helper result types they forward from. You cannot edit call sites in code that is not there.
- **Before the ELK adapter (Task 13).** Spec §5.3: *"An ELK backend implements the same `realise(g: BlockSubgraph): RealiseResult`."* Writing the adapter against the two-valued type and widening afterwards would mean writing it twice.
- **Before parity is read (Task 10).** §5.1's measurement is *"run them and count"*, and §1.3's whole point is that the caller behaves differently on *not-applicable* than on *generation-failed*. A parity census taken against the two-valued type counts failures it cannot classify, which is the number that would get quoted.

### D7. Non-null assertions in ported code are kept

The port carries 194 non-null assertions across 13 non-test files. They are there because pedals compiles under `noUncheckedIndexedAccess`; this repository's `tsconfig.json` does not set it, so under this compiler they are redundant no-ops. **Decided: ported code keeps them unchanged** — rewriting 194 sites is unreviewable churn that would bury the port diff, and this repository's `lib/` already carries 19 of its own. **New code written by this plan carries none.** Task 1 records this.

### D8. File names are rewritten to this repository's kebab-case convention

Every file in `lib/kicad/` is kebab-case (`from-network.ts`, `lead-span-model.ts`, `symbol-library.ts`); the port is camelCase (`blockTypes.ts`, `sexprWrite.ts`). The port is renamed on the way in. Task 1 carries the map and the mechanical rewrite; the *content* of a ported file is byte-identical modulo imports and the file header, and Task 1 proves it.

---

## Global Constraints

Repository rules, carried verbatim because every task is bound by them.

- **No `any`, no `as Type`, no `@ts-ignore`.** The port source is already clean of all three; keep it that way. (Non-null assertions: see **D7**.)
- **No fallbacks and no mock data outside test code.** Every `throw` **names what is missing, where to fix it, and why it is not defaulted.** A message that only says something went wrong is incomplete.
- **Explicit relative imports with the file extension**: `import { circuit } from "../lib/model/index.ts"`, never `"../lib/model"`.
- **Files stay between 300 and 500 lines.** A ported file over the ceiling is split by what its parts establish, never by line count, and the split is reported.
- **The five adopted `.vrt` files and five committed `wiring.md` files are byte-unchanged** — `pultec-low-boost`, `pultec-hi-boost`, `pultec-mid`, `pultec-low-cut`, `pultec-hi-cut`. **Every task verifies this with `shasum` and reports it.** Write nothing under `boards/` except the git-ignored `guide/`.
- **`bun test` and `bun run typecheck` are clean before every commit.** Baseline: record the pass/fail counts in Task 1 Step 1 and report the count at every commit. The count may only go up.
- **Do not run the root `make check`** — it is red on `pt2399-core` and the transistor-preamp boards for reasons predating this work. Run `bun run check` and the five boards' own `make -C boards/<board> check`.
- **Perturb every new guard, watch it go red BY NAME, restore, and report the real output.** Perturb what a well-meaning person would write, not something obviously broken.
- **`lib/schgen/` imports nothing from `tools/`.** It reads its own vendored symbol libraries (precedent: `lib/kicad/symbol-library.ts`) and spawns nothing. `kicad-cli` lives behind `tools/schgen/kicad-run.ts`.
- **Look at the output, not only the tests.** Every task that emits a `.kicad_sch` exports it to PDF with `kicad-cli`, converts it, **reads the image with the Read tool, and says what it looks like.**
- **Anything a later reader would need and cannot re-derive goes in `docs/known-gaps.md`, committed in the change that found it** — a defect not being fixed, a measurement including one that found nothing wrong, a result that makes someone want to act, an owner decision or declination in his own words, an observation that could not be diagnosed. **Telling the owner is not recording it**, and `.superpowers/` is gitignored. Each entry says what was measured, where, what evidence establishes it, **whether the writer confirmed it or is relaying another agent's report**, and what would settle it.
- **A skipped check must never look like a passing one.** If a guard cannot run, say so loudly.
- **Verify every KiCad symbol and footprint name against the libraries on disk.** This repository has twice shipped a footprint that does not exist.
- **No AI attribution in commit messages.** No `Co-Authored-By`, no session links, no generated-with footer.
- **Never put a `#` inside a bash heredoc or a multi-line quoted bash argument.** Use the Write tool and `git commit -F <file>`.
- **Never use `sed` to write or execute.** Use Edit to modify and Write to create. Read-only `sed -n` is fine; the Read tool is preferred.
- **No git hooks.** **Supersede means delete.** **Commit and push after each task.**
- **Do not propose a merge.** AGENTS.md: *"stop worrying about merging. I'll tell you when to do that."*

---

### Task 1: The port's home, the import rewrite, and the reader that supersedes `lib/kicad/sexpr.ts`

**Files:**
- Create: `lib/schgen/README.md`, `lib/schgen/strict.ts`
- Create: `tools/schgen/port-manifest.json`, `tools/schgen/port.ts` (the one-shot rewriter, committed as evidence)
- Modify: `lib/kicad/sexpr.ts` (replaced in place — same path, new reader)
- Modify: `lib/kicad/netlist.ts`, `lib/kicad/footprint-extent.ts`, `lib/kicad/symbol-library.ts` (the three existing consumers)
- Test: `tests/kicad/sexpr.test.ts` (extended), `tests/schgen/port-fidelity.test.ts`

**Interfaces**
- Consumes: nothing.
- Produces, in `lib/kicad/sexpr.ts` — **the pedals reader, which the parent's *"absorbs `lib/kicad/sexpr.ts`"* means in practice:**
  ```ts
  export interface SAtom {
    readonly value: string
    readonly start: number
    readonly end: number
    readonly quoted: boolean
    /** The first escape a re-emitter cannot reproduce faithfully, or null. */
    readonly lossyEscape: string | null
  }
  export interface SList {
    readonly head: string | null
    readonly start: number
    readonly end: number
    readonly atoms: SAtom[]
    readonly lists: SList[]
  }
  export function parse(src: string): SList
  export function quoteString(value: string): string
  ```
  and the three shims the existing consumers need, kept so this task is not also a rewrite of three unrelated modules:
  ```ts
  export interface SNode { readonly name: string; readonly atoms: readonly string[]; readonly nodes: readonly SNode[] }
  export function parseSexpr(text: string): SNode
  export function children(node: SNode, name: string): readonly SNode[]
  export function child(node: SNode, name: string): SNode | undefined
  export function attr(node: SNode, name: string): string | undefined
  ```
- Produces, in `lib/schgen/strict.ts` — the two helpers eight ported files import from `@/placement/strict`:
  ```ts
  export function isRecord(value: unknown): value is Record<string, unknown>
  export function rejectUnknown(parsed: Record<string, unknown>, keys: readonly string[], where: string): void
  ```

**Why the reader is replaced and not added beside.** `lib/kicad/sexpr.ts`'s `parseSexpr` **drops the quoted-or-bare distinction and silently decodes `\n` to `n`** — the exact loss `lib/kicad/symbol-library.ts:5` works around by handling symbols as raw text. The port's `parse` records that loss in `lossyEscape` and `fromParsed` **refuses** to re-emit an atom carrying one. Two readers of one file format is two answers to one question. The shims keep `parseSexpr` as a thin derivation of `parse` so `netlist.ts`, `footprint-extent.ts` and `symbol-library.ts` keep working unchanged; **they are the derivation, not a second parser.**

**The name map** (`tools/schgen/port-manifest.json` is this table as data; the rewriter reads it):

| pedals | here |
| --- | --- |
| `ir/types.ts`, `build.ts`, `validate.ts`, `classify.ts`, `order.ts`, `author.ts` | `lib/schgen/ir/` same stems |
| `ir/validateNets.ts`, `validateParts.ts`, `validateRule.ts` | `lib/schgen/ir/validate-nets.ts`, `validate-parts.ts`, `validate-rule.ts` |
| `render/sexprWrite.ts` | `lib/schgen/render/sexpr-write.ts` |
| `render/blockTypes.ts` | `lib/schgen/render/block-types.ts` |
| `render/libPins.ts`, `libGraphics.ts` | `lib/schgen/render/lib-pins.ts`, `lib-graphics.ts` |
| `render/bodyClearance.ts`, `glyphClearance.ts`, `drawnExtent.ts` | `lib/schgen/render/body-clearance.ts`, `glyph-clearance.ts`, `drawn-extent.ts` |
| `render/layoutCheck.ts`, `layoutKit.ts`, `wireSafety.ts` | `lib/schgen/render/layout-check.ts`, `layout-kit.ts`, `wire-safety.ts` |
| `render/chainKit.ts`, `fanoutKit.ts`, `fanoutRows.ts`, `fieldPlacement.ts` | `lib/schgen/render/chain-kit.ts`, `fanout-kit.ts`, `fanout-rows.ts`, `field-placement.ts` |
| `render/sheetTypes.ts`, `sheetCheck.ts`, `pageRefs.ts`, `pinMarks.ts` | `lib/schgen/render/sheet-types.ts`, `sheet-check.ts`, `page-refs.ts`, `pin-marks.ts` |
| `render/textScene.ts`, `textBoxes.ts`, `powerText.ts`, `unitPins.ts`, `unitText.ts` | `lib/schgen/render/text-scene.ts`, `text-boxes.ts`, `power-text.ts`, `unit-pins.ts`, `unit-text.ts` |
| `render/symbolSelfText.ts`, `drawnText.ts`, `emitItems.ts`, `ercExclusions.ts` | `lib/schgen/render/symbol-self-text.ts`, `drawn-text.ts`, `emit-items.ts`, `erc-exclusions.ts` |
| `render/templates/railRow.ts`, `passiveChain.ts`, `opampStage.ts`, `opampClassify.ts`, `connectorFanout.ts` | `lib/schgen/render/templates/rail-row.ts`, `passive-chain.ts`, `opamp-stage.ts`, `opamp-classify.ts`, `connector-fanout.ts` |
| `lock/versionLock.ts` | `lib/schgen/lock/version-lock.ts` |
| `gates/pinIdentity.ts`, `pintable.ts` | `lib/schgen/gates/pin-identity.ts`, `pin-table.ts` |
| `generate.ts`, `generateFiles.ts`, `verify.ts`, `kicadRun.ts`, `kicadConfig.ts` | `tools/schgen/generate.ts`, `generated-files.ts`, `verify.ts`, `kicad-run.ts`, `kicad-config.ts` |

Every other stem is already kebab-safe and keeps its name.

**The import rewrite.** The port writes `import … from "@/schgen/ir/types"`. This repository writes `import … from "../ir/types.ts"`. `tools/schgen/port.ts` rewrites `@/schgen/<path>` to a relative path with `.ts`, maps the five external modules (`@/kicad/sexpr` → `lib/kicad/sexpr.ts`, `@/placement/strict` → `lib/schgen/strict.ts`, `@/repo` → `tools/perfboard/repo-root.ts`, `@/kicad/netlist` and `@/kicad/footprint` → named in the task that needs them), and renames per the manifest. **It is committed because it is the evidence the port is a port**, exactly as the block spike's `extract.js` was.

- [ ] **Step 1: Record the baseline.** Run `bun test` and `bun run typecheck`; write both counts into the task report. `shasum` the five `.vrt` and five `wiring.md` files and record the ten hashes.
- [ ] **Step 2: Write the failing fidelity test** at `tests/schgen/port-fidelity.test.ts`. It reads `tools/schgen/port-manifest.json`, and for every entry asserts that **the ported file equals the source file after the manifest's own rewrite is applied** — so a hand edit smuggled into a ported file fails:

```ts
test("every ported file is its source, rewritten only by the manifest", () => {
  for (const entry of manifest.files) {
    const source = fs.readFileSync(path.join(PEDALS_SCHGEN, entry.from), "utf8")
    const ported = fs.readFileSync(path.join(REPO_ROOT, entry.to), "utf8")
    expect(rewrite(source, entry, manifest), entry.to).toBe(ported)
  }
})
```

  **`PEDALS_SCHGEN` comes from the `SCHGEN_SOURCE` environment variable and the test FAILS when it is unset, naming the variable and why nothing is defaulted** — a fidelity test that silently skips is the failure mode `CLAUDE.md` names.
- [ ] **Step 3: Run it.** Expected: fails — `tools/schgen/port-manifest.json` does not exist.
- [ ] **Step 4: Write `tools/schgen/port.ts` and the manifest**, covering only the files Tasks 2–7 and 11 port. Run it. Run the fidelity test: it must pass over every manifest entry.
- [ ] **Step 5: Replace `lib/kicad/sexpr.ts`** with the port's reader plus the five shims. Extend `tests/kicad/sexpr.test.ts` with the cases the old reader could not express: an atom's `quoted` flag survives, `lossyEscape` is `"\\n"` for KiCad's multi-line text escape and `null` for `\"` and `\\`, and `quoteString` round-trips through `parse`.
- [ ] **Step 6: Run the whole suite.** `netlist.ts`, `footprint-extent.ts` and `symbol-library.ts` are untouched and their tests must pass unchanged. **If one fails, the shim is wrong, not the test** — the shim's contract is that it is observationally identical to the reader it replaced.
- [ ] **Step 7: Write `lib/schgen/strict.ts`** with `isRecord` and `rejectUnknown`, each with a test that the refusal names the unknown key and where it was found.
- [ ] **Step 8: Perturb** — change one character in a ported file by hand; the fidelity test goes red naming that file. Restore and report the output.
- [ ] **Step 9: Record in `docs/known-gaps.md`**: the 194 non-null assertions and **D7**'s reason for keeping them; that `parseSexpr` is now a derivation of `parse` rather than an independent reader; and that `lib/kicad/symbol-library.ts`'s raw-text workaround is now unnecessary but not yet removed, with the criterion *symbol geometry is read through one reader*.
- [ ] **Step 10: `shasum` the ten files, run `bun run check`, commit, push.**

---

### Task 2: The IR and its validator, with the pin map removed

**Files:**
- Create (ported): `lib/schgen/ir/types.ts`, `build.ts`, `validate.ts`, `validate-nets.ts`, `validate-parts.ts`, `validate-rule.ts`, `classify.ts`, `order.ts`, `author.ts`
- Test: `tests/schgen/ir/` — the port's five IR test files, rewritten imports only

**Interfaces**
- Consumes: Task 1's manifest, rewriter and `lib/schgen/strict.ts`.
- Produces: the whole normalised IR. The load-bearing shapes, as read in the source:
  ```ts
  export type NetName = string; export type PinNumber = string; export type PartLabel = string
  export type PinIdentity = string; export type BlockId = string; export type SheetId = string
  export const NET_NAME = /^[A-Z0-9][A-Z0-9_]*$/
  export type PinConnection =
    | { readonly net: NetName; readonly identity: PinIdentity }
    | { readonly nc: true; readonly identity: PinIdentity }
  export interface PartSpec {
    readonly label: PartLabel; readonly refPrefix: string; readonly libId: string
    readonly units: readonly number[]; readonly value: string; readonly footprint: string
    readonly bom: BomFields; readonly dnp: boolean; readonly checklist: readonly string[]
    readonly source: string; readonly pinTable: string | null
    readonly pins: Readonly<Record<PinNumber, PinConnection>>
    readonly mechanicalPads: readonly MechanicalPad[]
    readonly ncUnlisted: { readonly reason: string } | null
  }
  export interface Circuit {
    readonly parts: ReadonlyMap<PartLabel, IrPart>
    readonly pins: readonly IrPin[]
    readonly nets: ReadonlyMap<NetName, readonly PinRef[]>
    readonly blocks: ReadonlyMap<BlockId, IrBlock>
    readonly sheets: readonly SheetSpec[]
    readonly rails: ReadonlyMap<NetName, RailSpec>
    readonly unitBlock: ReadonlyMap<string, BlockId>
    readonly offSheet: ReadonlySet<NetName>
  }
  export function unitKey(part: PartLabel, unit: number): string
  export function buildCircuit(spec: CircuitSpec, ctx: BuildContext): Circuit
  export function validateCircuit(c: Circuit, symbols: SymbolResolver): string[]
  export function pinsOfUnit(c: Circuit, part: PartLabel, unit: number): IrPin[]
  export function labelledNets(c: Circuit): ReadonlySet<NetName>
  export function groundRails(c: Circuit): ReadonlySet<NetName>
  export function comparePinNumbers(a: string, b: string): number
  ```

**What is cut, and it is a cut rather than a port.** `ir/build.ts`'s `BuildContext` has `{ symbols, pinmap }`, `PinmapInput` imports `@/pinmap/types`, `partPins` takes an `isMcu` flag, `checkMcuConfig` enforces that a circuit naming an MCU is given a pin map, and `Circuit.mcu` carries the label. **All of it goes.** `BuildContext` becomes `{ readonly symbols: SymbolResolver }`, `partPins(p, ctx)` loses its third argument, `CircuitSpec.mcu` and `Circuit.mcu` are removed. Porting the branch would ship a dead parameter whose only caller is `generate.ts`'s MCU block, which Task 6 is not porting either.

`PinOrigin` keeps three values, not two: `"circuit" | "pinmap" | "nc-unlisted"` loses `"pinmap"`, so **`gates/pin-identity.ts`'s one test of `ir.origin !== "nc-unlisted"` is unaffected** — read it before cutting and confirm.

**The twelve validation rules all port** and all are load-bearing here: `netNames`, `partShapes`, `pinsDeclared`, `unitsPlaced`, `sheetsAndBlocks`, `renderings`, `singlePinNets`, `rails`, `pinSemantics`, `bomFields`, `sheetFiles`, `mechanicalPads`. `validateCircuit` has **no escape hatch** and that is the point of it.

- [ ] **Step 1: Run the rewriter** over the nine IR files and the five IR test files. Run `tests/schgen/ir/`: expected to fail — `SymbolResolver` (Task 4) does not exist.
- [ ] **Step 2: Add the type-only forward declaration.** `lib/schgen/ir/validate-rule.ts` and `build.ts` import `SymbolResolver` as a type from `../render/library.ts`, which Task 4 writes. Create that file with the interface only, no implementation, and a header saying Task 4 fills it:
```ts
export interface LibPin { readonly number: string; readonly name: string; readonly type: PinType
  readonly unit: number; readonly x: Um; readonly y: Um; readonly angle: PinAngle
  readonly length: Um; readonly hidden: boolean }
export interface SymbolResolver { resolve(libId: string): LibSymbol; readonly files: ReadonlyMap<string, string> }
```
- [ ] **Step 3: Write the failing test for the cut**, at `tests/schgen/ir/no-pin-map.test.ts`: a `CircuitSpec` is built with `buildCircuit(spec, { symbols })` and the `BuildContext` type has exactly one property.
```ts
test("the build context carries symbols and nothing else", () => {
  const ctx: BuildContext = { symbols: stubResolver() }
  expect(Object.keys(ctx)).toEqual(["symbols"])
})
```
- [ ] **Step 4: Make the cut** in `types.ts` and `build.ts`. Delete `checkMcuConfig`, `PinmapInput`, the `isMcu` branch of `partPins`, `CircuitSpec.mcu`, `Circuit.mcu`, and `"pinmap"` from `PinOrigin`. Run `bun run typecheck`: every remaining reference must be gone.
- [ ] **Step 5: Run `tests/schgen/ir/`.** Expected: the rules' own tests pass against a stub resolver; anything needing a real library fails until Task 4. **Report which tests are deferred and to which task, by name** — a deferred test must not look like a passing one.
- [ ] **Step 6: Perturb `singlePinNets`** to return `[]`; the port's own test goes red naming the one-pin net. Restore, report.
- [ ] **Step 7: Record in `docs/known-gaps.md`** that the IR has no pin map and the removal is deliberate, with the criterion *a circuit with an MCU pin map needs the branch restored from the port source, not reinvented*.
- [ ] **Step 8: `shasum`, `bun run check`, commit, push.**

---

### Task 3: Geometry, deterministic UUIDs, and the s-expression writer

**Files:**
- Create (ported): `lib/schgen/render/geometry.ts`, `uuid.ts`, `sexpr-write.ts`, `lib-pins.ts`, `lib-graphics.ts`
- Test: `tests/schgen/render/geometry.test.ts`, `uuid.test.ts`, `sexpr-write.test.ts`

**Interfaces**
- Consumes: Task 1's `lib/kicad/sexpr.ts` (`parse`, `quoteString`, `SList`), Task 2's `comparePinNumbers`.
- Produces:
  ```ts
  export type Um = number                 // integer micrometres; all schematic geometry is integral
  export const GRID: Um = 1270            // 1.27 mm
  export interface Point { readonly x: Um; readonly y: Um }
  export type Rotation = 0 | 90 | 180 | 270
  export type Side = "left" | "right" | "up" | "down"
  export function um(mm: number): Um
  export function fmtMm(v: Um): string
  export function onGrid(p: Point): boolean
  export function assertOnGrid(p: Point, what: string): void
  export function rotate(p: Point, rot: Rotation): Point
  export function pinEnd(at: Point, rot: Rotation, pin: LibPin): Point
  export function pinSide(rot: Rotation, pin: LibPin): Side
  export function placeBox(at: Point, rot: Rotation, box: Box): Box
  export function boxesOverlap(a: Box, b: Box): boolean
  export function growBox(b: Box, by: Um): Box
  export function unionBox(a: Box, b: Box): Box
  export function gridCeil(v: Um): Um
  export function gridFloor(v: Um): Um
  export function samePoint(a: Point, b: Point): boolean
  export function pointKey(p: Point): string
  export function segmentHitsBox(a: Point, b: Point, box: Box): boolean
  export const SCHGEN_NAMESPACE = "3f8b8a2e-6c55-4f0e-9d7a-2b9c4e1d7a60"
  export function uuidV5(name: string, namespace?: string): string
  export type SNode = SAtomNode | SListNode
  export function sym(text: string): SAtomNode
  export function str(text: string): SAtomNode
  export function mm(v: Um): SAtomNode
  export function int(n: number): SAtomNode
  export function yesNo(b: boolean): SAtomNode
  export function list(head: string, ...items: ReadonlyArray<SNode | readonly SNode[]>): SListNode
  export function headOf(n: SNode): string | null
  export function print(n: SNode): string
  export function fromParsed(l: SList): SListNode
  export interface Box { readonly minX: Um; readonly minY: Um; readonly maxX: Um; readonly maxY: Um }
  export function extractPins(node: SListNode, libId: string, isPower: boolean): LibPin[]
  export function unitBoxes(node: SListNode, pins: readonly LibPin[]): ReadonlyMap<number, Box>
  export function bodyBoxes(node: SListNode, pins: readonly LibPin[]): ReadonlyMap<number, Box>
  export function unitGraphics(node: SListNode, libId: string): ReadonlyMap<number, UnitGraphics>
  export function pinTextStyle(node: SListNode, libId: string): PinTextStyle
  export function graphicsBox(graphics: UnitGraphics): Box | null
  ```

**Why this layer is a task of its own.** It is what makes the output byte-stable, and byte stability is what the manifest (Task 16), the baseline (Task 16) and the *"regenerate every run, compare by content"* discipline all rest on. `um()` refuses a millimetre value that is not a whole micrometre; `fmtMm` is exact rather than rounded; `uuidV5` is SHA-1 over a fixed namespace plus a stable key, so there is no clock and no randomness anywhere in the emitter. **Contrast `lib/kicad/schematic.ts`, which takes `newUuid: () => string` and is handed `randomUUID`** — that is why its output cannot be compared by content, and Task 18 deletes it.

- [ ] **Step 1: Run the rewriter** over the five files and three test files.
- [ ] **Step 2: Run `tests/schgen/render/`.** The three tests above must pass with no edit beyond imports. **If one fails, the rewrite is wrong** — these modules depend on nothing this repository has yet.
- [ ] **Step 3: Write the byte-stability test** at `tests/schgen/render/uuid-stable.test.ts`:
```ts
test("the same key gives the same uuid, and the namespace is fixed", () => {
  expect(uuidV5("sheet:demo:core")).toBe(uuidV5("sheet:demo:core"))
  expect(uuidV5("sheet:demo:core")).not.toBe(uuidV5("sheet:demo:power"))
  expect(uuidV5("x", SCHGEN_NAMESPACE)).toBe(uuidV5("x"))
})
```
  Run it. Pin the three literal UUID strings it produces into the test, so a namespace change is a visible diff rather than a silent regeneration of every file.
- [ ] **Step 4: Write the `fromParsed` refusal test** — a symbol atom carrying KiCad's `\n` escape is refused by name, with the decoded value in the message. The 81 such escapes in the KiCad 10 stock libraries are why this refusal exists.
- [ ] **Step 5: Perturb `um()`** to round instead of refusing; the geometry test goes red naming the fractional micrometre. Restore, report.
- [ ] **Step 6: `shasum`, `bun run check`, commit, push.**

---

### Task 4: The symbol-library loader and its `extends` flattening

**Files:**
- Create (ported): `lib/schgen/render/library.ts` (replacing Task 2's type-only stub)
- Create: `lib/schgen/render/stock-symbols.ts`
- Test: `tests/schgen/render/library.test.ts`, `tests/schgen/render/extends-flattening.test.ts`

**Interfaces**
- Consumes: Task 1's `parse`, Task 3's `fromParsed`/`headOf`/`str`, `extractPins`, `unitBoxes`, `bodyBoxes`, `unitGraphics`, `pinTextStyle`.
- Produces:
  ```ts
  export interface LibSymbol {
    readonly libId: string
    readonly name: string
    /** Flattened symbol, first atom renamed to libId, ready for (lib_symbols …). */
    readonly node: SListNode
    readonly pins: readonly LibPin[]
    readonly unitCount: number
    readonly isPower: boolean
    readonly boxes: ReadonlyMap<number, Box>    // graphics plus both pin ends
    readonly bodies: ReadonlyMap<number, Box>   // graphics plus body-side pin ends only
    readonly graphics: ReadonlyMap<number, UnitGraphics>
    readonly pinText: PinTextStyle
  }
  export interface SymbolResolver { resolve(libId: string): LibSymbol; readonly files: ReadonlyMap<string, string> }
  export function createResolver(libs: ReadonlyMap<string, string>): SymbolResolver
  export function flattenSymbol(lib: SList, name: string, libId: string, file: string): SListNode
  export function splitLibId(libId: string): [string, string]
  export function stockSymbolDir(): string
  ```

**Why `extends` flattening is non-optional.** The parent: *"an unflattened copy silently drops every pin."* KiCad's `R_Small`, `C_Small`, `Conn_01x05` and most of `Device` are `(extends …)` symbols whose pins live in the parent. `flattenNamed` merges parent and child by category — properties, flags, sub-symbols, `embedded_fonts` — recursing with a cycle guard, and renames the parent's `<parent>_<n>_<m>` sub-symbols to the child's name. **This is the only thing in the port that knows what a library pin is**, which is why §1.5 builds the four-link mapping on it and forbids a second reader.

**The one decision this task makes.** `stockSymbolDir()` resolves `KICAD_SYMBOL_DIR`, then `dirname(KICAD_CLI)/../SharedSupport/symbols`, then `/usr/share/kicad/symbols`. This repository vendors six symbols under `lib/kicad/symbols/` *"so the output does not depend on the machine"*. **Decided: both, with the vendored set authoritative and the stock directory a declared extension.** `createResolver` takes nickname→file as it already does; `lib/schgen/render/stock-symbols.ts` builds that map from the vendored directory first and the stock directory second, and **refuses when a nickname resolves in both to files with different SHA-256** rather than preferring one silently. The version lock (Task 6) then fingerprints whatever was loaded, so drift in either source refuses. **The vendored set has six symbols and the four parity circuits need more than six** — Task 10 measures which, and the shortfall is a finding, not a licence to guess a name.

- [ ] **Step 1: Run the rewriter** over `library.ts` and its test. Run `tests/schgen/render/library.test.ts`: it will need a real `.kicad_sym` on disk.
- [ ] **Step 2: Write the failing flattening test** against a symbol this repository can name from disk. **Verify the name against the libraries first** — `CLAUDE.md`: *"Do not write one from memory; this repository has twice shipped a footprint that does not exist."* Then:
```ts
test("an extends symbol resolves with its parent's pins", () => {
  const sym = resolver.resolve("Device:R_Small")
  expect(sym.pins.map((p) => p.number)).toEqual(["1", "2"])
  expect(sym.pins.every((p) => p.length > 0)).toBe(true)
})
test("a symbol that did NOT flatten has no pins, which is the failure this guards", () => {
  const unflattened = parse(fs.readFileSync(deviceLib, "utf8"))
  expect(extractPins(fromParsed(topSymbolOf(unflattened, "R_Small")), "Device:R_Small", false)).toEqual([])
})
```
  The second assertion is the point: it shows the failure mode is **silent** and the first test is what catches it.
- [ ] **Step 3: Run both.** Expected: the first fails until `library.ts` is in place, the second passes immediately.
- [ ] **Step 4: Write `stock-symbols.ts`** with the vendored-first resolution and the SHA-256 disagreement refusal. The refusal names both files, both hashes, and that nothing is preferred because preferring one would make the drawing depend on the machine.
- [ ] **Step 5: Run the suite.** Report how many of the four parity circuits' declared symbols resolve and how many do not, by lib id.
- [ ] **Step 6: Perturb** — remove the `extends` recursion (return the child unflattened); the flattening test goes red naming `R_Small` with an empty pin list. Restore, report.
- [ ] **Step 7: Record in `docs/known-gaps.md`** the measured count of unresolvable lib ids across the four circuits, as a measurement with the criterion *every symbol a parity circuit names resolves through one reader*.
- [ ] **Step 8: `shasum`, `bun run check`, commit, push.**

---

### Task 5: The obstacle-category matrix, enumerated once

**Files:**
- Create (ported): `lib/schgen/render/connectivity.ts`, `wire-safety.ts`, `body-clearance.ts`, `glyph-clearance.ts`, `text-scene.ts`, `text-boxes.ts`, `power-text.ts`, `unit-pins.ts`, `unit-text.ts`, `field-placement.ts`, `drawn-extent.ts`, `symbol-self-text.ts`, `layout-check.ts`
- Create: `lib/schgen/render/obstacle-matrix.ts`
- Test: `tests/schgen/render/` — the port's clearance tests, plus `tests/schgen/render/obstacle-matrix.test.ts`

**Interfaces**
- Consumes: Tasks 2–4.
- Produces, ported:
  ```ts
  export type ConnItem =
    | { readonly kind: "wire"; readonly a: Point; readonly b: Point; readonly net: NetName; readonly what: string }
    | { readonly kind: "pin"; readonly at: Point; readonly net: NetName | null; readonly what: string }
    | { readonly kind: "anchor"; readonly at: Point; readonly net: NetName; readonly what: string }
  export function checkWireSafety(items: readonly ConnItem[]): string[]
  export function danglingWireEnds(items: readonly ConnItem[]): string[]
  export function connectedComponents(items: readonly ConnItem[]): ConnComponent[]
  export function junctionPoints(items: readonly ConnItem[]): Point[]
  export function clearanceProblems(g: BlockSubgraph, layout: BlockLayout): string[]
  export function sceneClearanceProblems(scene: ClearanceScene): string[]
  export function bodyGlyphProblems(scene: GlyphScene): string[]
  export function glyphGlyphProblems(scene: Pick<GlyphScene, "symbols" | "powers">): string[]
  export function textProblems(scene: TextScene): string[]
  export function checkLayout(g: BlockSubgraph, layout: BlockLayout): string[]
  export function drawnBoxes(g: BlockSubgraph, layout: BlockLayout): Measured
  ```
- Produces, **new** — the up-front matrix spec §1.4 requires:
  ```ts
  export const OBSTACLE_CATEGORIES = [
    "body", "pin-line", "pin-number", "pin-name", "interior-graphic", "wire", "junction",
    "power-glyph", "pwr-flag-glyph", "label-outline", "field-text", "frame-border",
    "no-connect-marker", "dnp-cross",
  ] as const
  export type ObstacleCategory = (typeof OBSTACLE_CATEGORIES)[number]
  export interface PairCoverage {
    readonly a: ObstacleCategory
    readonly b: ObstacleCategory
    /** The function that decides this pair, named so a reader can go and read it. */
    readonly checkedBy: string | null
    /** Why the pair needs no check — never blank when `checkedBy` is null. */
    readonly meaninglessBecause: string | null
    /** The pair is decided in one direction only, with the reason. */
    readonly asymmetric: string | null
  }
  export const PAIR_COVERAGE: readonly PairCoverage[]
  export function uncoveredPairs(): readonly string[]
  ```

**The criterion this implements is the research's, not this plan's.** `docs/known-gaps.md` **G85**: *"what would settle it: an up-front obstacle-category matrix."* The reason it binds is in `docs/schematic/schgen-development-history.md` §6, CONFIRMED over 105 commits: the ~160 refusals *"accreted one pair at a time over eleven steps, and every new check discovered that the previous checks had a blind spot, and the blind spot was always the same shape: category A had been modelled as an obstacle for category B but not for category C."* Body-vs-anchor but not body-vs-glyph. Glyph-vs-text but not glyph-vs-body. **They were grown against template-produced geometry, and Tasks 12–13 introduce a second geometry source** — which §1.4 names as exactly the condition that creates a fresh blind spot.

**The mechanism is the research's guess and the criterion binds.** If a pair turns out meaningless, or needs a direction-sensitive test rather than a symmetric one, **`meaninglessBecause` or `asymmetric` records it and the deviation goes in `docs/known-gaps.md`** — `CLAUDE.md`'s worked example at G52 is what happens when an implementer follows a mechanism past the point it meets its criterion.

14 categories give 105 unordered pairs including self-pairs. `PAIR_COVERAGE` has an entry for every one; `uncoveredPairs()` returns the ones with `checkedBy === null && meaninglessBecause === null`.

- [ ] **Step 1: Run the rewriter** over the thirteen files and their tests. Run them: the port's clearance tests must pass against ported template output only once Task 7 lands, so **report which need Task 7 and defer them by name.** The pure ones — `wire-safety`, `connectivity`, `glyph-clearance`, `text-clearance` — run now.
- [ ] **Step 2: Split `lib-pins.ts` if it is over the ceiling.** It is 275 lines; `layout-check.ts` is 194; nothing in this task exceeds 500. Report every ported file's line count.
- [ ] **Step 3: Write the matrix test** at `tests/schgen/render/obstacle-matrix.test.ts`:
```ts
test("every ordered-independent pair of obstacle categories is accounted for", () => {
  expect(uncoveredPairs()).toEqual([])
})
test("a pair with no check carries a reason, and a reason is never blank", () => {
  for (const p of PAIR_COVERAGE) {
    if (p.checkedBy === null) expect(p.meaninglessBecause?.trim(), `${p.a}/${p.b}`).toBeTruthy()
  }
})
test("the matrix covers each pair exactly once", () => {
  const keys = PAIR_COVERAGE.map((p) => [p.a, p.b].sort().join("|"))
  expect(new Set(keys).size).toBe(keys.length)
  expect(keys.length).toBe((OBSTACLE_CATEGORIES.length * (OBSTACLE_CATEGORIES.length + 1)) / 2)
})
```
- [ ] **Step 4: Run it.** Expected: fails — `PAIR_COVERAGE` is empty.
- [ ] **Step 5: Fill `PAIR_COVERAGE` by reading the ported checks**, pair by pair, naming the function that decides each. Four categories the research names are **not** obviously covered and must be settled here by reading: `pin-number` and `pin-name` as obstacles for `wire`; `frame-border` against everything inside its frame; `no-connect-marker` **at a hidden pin**; and KiCad's `dnp-cross`. For each, either name the function or write `meaninglessBecause` with the reason.
- [ ] **Step 6: Run it.** Report the number of pairs with a check, the number declared meaningless, and the number asymmetric.
- [ ] **Step 7: Perturb** — add a fifteenth category and leave it unaccounted; the first test goes red naming its uncovered pairs. Restore, report.
- [ ] **Step 8: Record in `docs/known-gaps.md`** every pair whose coverage was decided by reading rather than by a test that could have failed, and every deviation from the up-front-matrix mechanism, with G85's criterion carried across.
- [ ] **Step 9: `shasum`, `bun run check`, commit, push.**

---

### Task 6: The emitter, sheet arrangement, and the reference lock

**Files:**
- Create (ported): `lib/schgen/render/emit.ts`, `emit-items.ts`, `frames.ts`, `pack.ts`, `sheets.ts`, `sheet-types.ts`, `sheet-check.ts`, `page-refs.ts`, `pin-marks.ts`, `drawn-text.ts`, `project.ts`, `erc-exclusions.ts`, `bus.ts`
- Create (ported): `lib/schgen/lock/annotate.ts`, `refmap.ts`, `version-lock.ts`
- Create (ported): `lib/schgen/design.ts`, `lib/schgen/report.ts`
- Create (ported): `tools/schgen/generate.ts`, `generated-files.ts`, `kicad-run.ts`, `kicad-config.ts`
- Create: `tools/cli/schgen.ts`
- Test: the port's emit, lock, sheets and frames tests, plus `tests/schgen/emit-byte-stable.test.ts`

**Interfaces**
- Consumes: Tasks 2–5.
- Produces:
  ```ts
  export function emitContext(project: string, circuit: Circuit, symbols: SymbolResolver,
    refs: ReadonlyMap<PartLabel, string>, titleComments: readonly string[]): EmitContext
  export function emitSheet(d: SheetDrawing, ctx: EmitContext): string
  export function emitRoot(ctx: EmitContext): string
  export function layoutSheet(c: Circuit, sheetId: SheetId, symbols: SymbolResolver, flagLibId: string): SheetDrawing
  export function packFrames(sizes: readonly Size[], paper: Size): PackResult
  export const PAPER: Record<Paper, { readonly w: Um; readonly h: Um }>
  export function annotate(c: Circuit, lock: RefLock, pinned: ReadonlyMap<PartLabel, string>): Annotation
  export function parseRefLock(json: string): RefLock
  export function serializeRefLock(lock: RefLock): string
  export function compareVersionLock(locked: VersionLock, current: VersionLock): string[]
  export function fingerprintLibraries(files: ReadonlyMap<string, string>): Record<string, string>
  export function libraryDigest(v: VersionLock): string
  export function generate(d: LoadedDesign, env: GenerateEnv): Generation
  export function generatedFiles(x: FileInputs): Map<string, string>
  export function staleFiles(d: LoadedDesign, g: FilesOnly): string[]
  export function writeGeneration(d: LoadedDesign, g: FilesOnly): string[]
  export function exportNetlist(schPath: string): NetlistExport
  export function runErc(schPath: string, severity: "error" | "all"): ErcResult
  export function exportPdf(schPath: string, outFile: string): void
  export function kicadVersion(): string
  ```

**The two things this task must not lose.** `generate` **only reads**; `writeGeneration` is the only writer, *"so any refusal leaves every file untouched."* And `staleFiles` compares **by content**, never by mtime — which is `CLAUDE.md`'s *"Derived artifacts are regenerated every run and compared by content"* already implemented, and the reason the `pultec-schematic-agrees` target exists.

**What changes in the port.** `generate`'s MCU block (`pinmapInputFor`, `pinned.set(circuit.mcu, …)`) goes with Task 2's cut; `pinned` stays as an empty map parameter because `annotate` takes it and a design may still pin a reference. `generatedFiles` emits `REFS_LOCK`, `VERSION_LOCK`, `REFMAP.md`, `RENDER-REPORT.md`, `sym-lib-table`, `fp-lib-table`, the `.kicad_pro` and one `.kicad_sch` per sheet; **all of it ports**, because the lock files and the lib tables are what make the output reproducible on another machine. `generate` becomes `async` in Task 12, not here.

**`tools/cli/schgen.ts`** follows `tools/cli/schematic-stub.ts`'s shape — injected `SchgenDeps` for `exists`/`write`, `isMain` guard, a `USAGE` string — with verbs `check` (read-only: build, validate, report staleness) and `generate [--init] [--accept-toolchain]`. `package.json` gains `"schgen": "bun run tools/cli/schgen.ts"`.

- [ ] **Step 1: Run the rewriter** over the twenty-one files and their tests.
- [ ] **Step 2: Apply the MCU cut** to `generate.ts`. Typecheck.
- [ ] **Step 3: Write the byte-stability test** at `tests/schgen/emit-byte-stable.test.ts`, over a two-part fixture design built in the test:
```ts
test("generating twice gives identical bytes", () => {
  const a = generate(design, env)
  const b = generate(design, env)
  for (const [name, text] of a.files) expect(b.files.get(name), name).toBe(text)
})
test("generate writes nothing", () => {
  const before = fs.readdirSync(design.outDir)
  generate(design, env)
  expect(fs.readdirSync(design.outDir)).toEqual(before)
})
```
- [ ] **Step 4: Run it and the ported emit tests.** Fix only rewrite errors. **If a ported test fails on substance, stop and report it** — a ported check that fails here is a finding about the port, not a licence to edit the check.
- [ ] **Step 5: Write `tools/cli/schgen.ts`** and a test that `check` writes nothing and that an unknown verb refuses naming the verbs it has.
- [ ] **Step 6: Emit the fixture design and LOOK AT IT.** `exportPdf`, convert with `rsvg-convert` or `pdftoppm`, **read the image with the Read tool, and say what it looks like.** Run `runErc(…, "all")` and report the error and warning counts.
- [ ] **Step 7: Perturb `staleFiles`** to compare mtimes instead of content; write a test that a file with a fresh mtime and stale content is still reported stale, watch it go red, restore, report.
- [ ] **Step 8: `shasum`, `bun run check`, commit, push.**

---

### Task 7: The seven templates, ported verbatim

**Files:**
- Create (ported): `lib/schgen/render/templates/index.ts`, `rail-row.ts`, `divider.ts`, `passive-chain.ts`, `crystal.ts`, `regulator.ts`, `opamp-stage.ts`, `opamp-classify.ts`, `connector-fanout.ts`
- Create (ported): `lib/schgen/render/blocks.ts`, `block-types.ts`, `layout-kit.ts`, `chain-kit.ts`, `fanout-kit.ts`, `fanout-rows.ts`
- Test: the port's nine template test files

**Interfaces**
- Consumes: Tasks 2–6.
- Produces, **unchanged from the source — Task 8 is what widens it:**
  ```ts
  export interface Template { readonly id: TemplateId; realise(g: BlockSubgraph): RealiseResult }
  export type RealiseResult =
    | { readonly ok: true; readonly layout: BlockLayout }
    | { readonly ok: false; readonly reason: string }
  export function mismatch(reason: string): RealiseResult
  export interface BlockLayout {
    readonly placements: readonly Placement[]   // part, unit, at: Point, rot: Rotation
    readonly wires: readonly Wire[]             // a: Point, b: Point, net: NetName
    readonly anchors: readonly Anchor[]         // net, at: Point, side: Side
  }
  export interface BlockSubgraph {
    readonly block: IrBlock; readonly units: readonly BlockUnit[]
    readonly rails: ReadonlySet<NetName>; readonly groundRails: ReadonlySet<NetName>
    readonly external: ReadonlySet<NetName>
    readonly railSpecs: ReadonlyMap<NetName, RailSpec>
    readonly powerLibs: ReadonlyMap<string, LibSymbol>
    readonly labelRefs: ReadonlyMap<NetName, string>
  }
  export const TEMPLATES: ReadonlyMap<TemplateId, Template>
  export function subgraphOf(c: Circuit, id: BlockId, symbols: SymbolResolver): BlockSubgraph
  export function realiseBlock(c: Circuit, id: BlockId, symbols: SymbolResolver): BlockLayout
  export function ladder(spec: LadderSpec, g: BlockSubgraph, origin: Point): BlockLayout
  export function chain(spec: ChainSpec, g: BlockSubgraph): ChainLayout
  export function fanout(g: BlockSubgraph, unit: BlockUnit, rot: Rotation, paths: readonly Path[]): BlockLayout
  export function tracePaths(g: BlockSubgraph, unit: BlockUnit, skip: ReadonlySet<NetName>): TraceResult
  export function planStage(g: BlockSubgraph): StagePlanResult
  export function commonRailLadder(g: BlockSubgraph): CommonRailLadder
  ```
  The eight registered ids are `"rail-row"`, `"decoupling-bank"`, `"divider"`, `"passive-chain"`, `"crystal"`, `"connector-fanout"`, `"regulator"`, `"opamp-stage"` — eight entries for seven template modules, because `railRow.ts` exports two.

**The load-bearing constraint, carried over verbatim:** *templates never create electrical connectivity.* A template receives a fully connected IR subgraph and may only choose symbol positions, rotations and the wire geometry that realises connections the IR already defines. *"An op-amp template does not know that the feedback resistor joins OUT to IN−; it places the parts on the IR's feedback net in its feedback corridor."* **Any IR connection a template cannot realise is a generation error, never a silent omission.**

**Spec §5.3, answered: a template is a pure function from a subgraph to coordinates.** It returns geometry as plain data and calls into no shared geometry layer, so **seam A is a dispatch, not a refactor.** `connectorFanout` is the one template that calls `checkLayout` inside `realise`, to try four rotations — note it, because Task 8's classification has to say what kind of mismatch its final refusal is.

- [ ] **Step 1: Run the rewriter** over the fifteen files and nine test files.
- [ ] **Step 2: Check the line ceiling.** `regulator.ts` is 217, `passive-chain.ts` 201, `opamp-classify.ts` 179, `chain-kit.ts` 274, `fanout-kit.ts` 258 — all inside. Report every count.
- [ ] **Step 3: Run the nine template tests.** They must pass with imports rewritten and nothing else. **Report the count.** A failure here is a port defect; stop and diagnose with superpowers:systematic-debugging rather than editing the test.
- [ ] **Step 4: Count the mismatch sites and pin the count** at `tests/schgen/render/templates/mismatch-census.test.ts`:
```ts
test("every mismatch site is in the census Task 8 widens", () => {
  const found = mismatchSites()   // greps lib/schgen/render/templates/*.ts for "mismatch("
  expect(found.length).toBe(30)
})
```
  **30 is a measured number, not a recalled one**: `passive-chain` 1, `regulator` 8, `connector-fanout` 3, `opamp-stage` 1, `rail-row` 5, `divider` 6, `crystal` 6. It agrees with spec §1.3's *"30 `mismatch(...)` call sites"*. **If the census finds another number, that is a finding — report it and do not adjust the test to match.**
- [ ] **Step 5: List the five helper result types that forward a reason into a mismatch**, in the task report, because Task 8 must widen them too: `CommonRailLadder` (`rail-row.ts`), `StagePlanResult` (`opamp-classify.ts`), `TraceResult` (`fanout-kit.ts`), `Measured` (`drawn-extent.ts`), `FieldsResult` (`field-placement.ts`). Each is `{ok:true,…} | {ok:false, reason:string}`.
- [ ] **Step 6: Draw a block with each of the eight registered templates and LOOK AT THE OUTPUT.** Eight single-block fixture designs, emitted, exported to PDF, converted, **read with the Read tool.** Say what each one looks like. `CLAUDE.md`: netlist-level assertions are necessary and not sufficient.
- [ ] **Step 7: Perturb `ladder`'s row-split rule** (emit one wire per row instead of splitting at every attachment); the wire-safety check goes red naming the mid-wire pin end. Restore, report.
- [ ] **Step 8: `shasum`, `bun run check`, commit, push.**

---

### Task 8: Widening `RealiseResult` to five outcomes

**Files:**
- Modify: `lib/schgen/render/block-types.ts`, `blocks.ts`
- Modify: all seven template files (30 sites), `rail-row.ts`, `opamp-classify.ts`, `fanout-kit.ts`, `drawn-extent.ts`, `field-placement.ts` (the five helper result types)
- Modify: `lib/schgen/ir/types.ts` (`Rendering`), `lib/schgen/ir/validate.ts` (`renderings` rule)
- Test: `tests/schgen/render/realise-result.test.ts`, `tests/schgen/render/selection.test.ts`, and the nine template tests
- Modify: `docs/known-gaps.md`

**Interfaces**
- Consumes: Task 7's templates and its 30-site census.
- Produces — **the interface every backend from Task 12 onward implements:**
  ```ts
  export type MismatchKind = "not-applicable" | "invalid-geometry" | "clearance" | "backend-raised"

  export type Mismatch =
    /** No template supports this topology: nothing was drawn and there is no defect to hide. */
    | { readonly kind: "not-applicable"; readonly reason: string }
    /** A template applied and produced geometry disagreeing with the IR. */
    | { readonly kind: "invalid-geometry"; readonly reason: string
        readonly template: TemplateId; readonly connection: string }
    /** A template applied and violated a clearance constraint. */
    | { readonly kind: "clearance"; readonly reason: string
        readonly constraint: string; readonly obstacles: readonly [string, string]; readonly block: BlockId }
    /** The backend did not return a result at all: it raised, or did not terminate. */
    | { readonly kind: "backend-raised"; readonly reason: string
        readonly backend: string; readonly inputKey: string }

  export type RealiseResult =
    | { readonly ok: true; readonly layout: BlockLayout }
    | { readonly ok: false; readonly mismatch: Mismatch }

  export function notApplicable(reason: string): RealiseResult
  export function invalidGeometry(template: TemplateId, connection: string, reason: string): RealiseResult
  export function clearanceViolation(block: BlockId, constraint: string,
    obstacles: readonly [string, string], reason: string): RealiseResult
  export function backendRaised(backend: string, inputKey: string, reason: string): RealiseResult

  export type Selection =
    | { readonly kind: "template"; readonly template: TemplateId; readonly layout: BlockLayout }
    | { readonly kind: "elk" }
    | { readonly kind: "refused"; readonly mismatch: Mismatch }
  export function selectRenderer(g: BlockSubgraph, templates: ReadonlyMap<TemplateId, Template>): Selection

  export interface Backend { realise(g: BlockSubgraph): RealiseResult }
  export function realiseBlock(c: Circuit, id: BlockId, symbols: SymbolResolver,
    elk: Backend | null): BlockLayout
  ```
  and the `Rendering` change (**D3**):
  ```ts
  export type Rendering =
    | { readonly kind: "wired"; readonly template: TemplateId; readonly anchor: TemplateAnchor | null }
    | { readonly kind: "bus"; readonly groups: readonly BusGroup[] }
    | { readonly kind: "auto" }
  ```
  `{ kind: "labels" }` is **deleted**, per **D3**.

**Why this is a code change and not a wording change.** Spec §5.3 read the source: `RealiseResult` is two-valued, **30 `mismatch(...)` call sites across seven templates funnel into one `ok: false`**, and *"the caller cannot tell 'no template applies to this subgraph' from 'a template applied and failed'."* §1.3's whole point is that the caller behaves differently on the two. **G94 adds a state the type cannot express at all**: ELK raising `java.lang.IllegalStateException` on an op-amp self-loop, reproduced on `opamp-buffer` flat, on the 12-part `oc-audio` block, and on the 76-part Pultec reference under both vertical policies. **A widened type with 30 sites still reporting an undifferentiated string buys nothing** — spec §1.3, verbatim.

**Classifying the 30 sites is the substance of this task, and most of them are decided by reading the site.** The three categories, with worked examples read in the source:

- **`not-applicable`** — the site is a *shape* test over the subgraph: `divider.ts:12` *"divider needs two-terminal parts with both pins connected"*; `divider.ts:23` *"needs exactly one ground rail"*; `rail-row.ts:84` *"decoupling-bank holds only capacitors"*; `crystal.ts:46` *"crystal needs an anchor with roles a and b"*; `regulator.ts:159`. **These are the sites that select ELK.**
- **`invalid-geometry`** — the site reports geometry the template produced that the IR contradicts: `regulator.ts:189` *"pin … is on the `${bus}` net … but on the `${side}` side"*; `regulator.ts:193` *"its end is at x …, not the `${bus}` pin's …"*. Each must name the IR connection it failed to realise, which these two already carry.
- **`clearance`** — `connector-fanout.ts:27`, *"found no rotation without collisions"*, which is the one site that already ran `checkLayout`. It must name the constraint and the obstacle pair, which means **`checkLayout`'s problem strings need enough structure for the pair to be recovered.** `clearanceViolation` takes the pair explicitly, so `connector-fanout` passes the first problem's own two obstacles.
- **A site that cannot be classified by reading is a finding**, recorded with the reason, not forced into the nearest bucket.

**No site maps to `backend-raised`.** It exists for Task 14 and for `realiseBlock`'s `attributed(…)` wrapper, which today converts a thrown error into a thrown error and from here converts it into this value.

- [ ] **Step 1: Write the failing type test** at `tests/schgen/render/realise-result.test.ts`:
```ts
test("a mismatch says which kind it is, and the four kinds are exhaustive", () => {
  const describe = (m: Mismatch): string => {
    switch (m.kind) {
      case "not-applicable": return "no template applies"
      case "invalid-geometry": return `template ${m.template} cannot realise ${m.connection}`
      case "clearance": return `${m.constraint} between ${m.obstacles[0]} and ${m.obstacles[1]}`
      case "backend-raised": return `${m.backend} raised on ${m.inputKey}`
    }
  }
  expect(describe(notApplicableOf(divider, twoRailSubgraph()))).toBe("no template applies")
})
```
  The `switch` with no `default` is the exhaustiveness check: a fifth kind added later fails `tsc`.
- [ ] **Step 2: Write the failing selection test** at `tests/schgen/render/selection.test.ts` — the three rules of §1.3 as three assertions:
```ts
test("only not-applicable selects ELK", () => {
  expect(selectRenderer(subgraphNoTemplateFits(), TEMPLATES).kind).toBe("elk")
})
test("a template that applied and failed REFUSES, and ELK does not rescue it", () => {
  const s = selectRenderer(subgraphDividerGeometryFails(), TEMPLATES)
  expect(s.kind).toBe("refused")
  if (s.kind === "refused") expect(s.mismatch.kind).toBe("invalid-geometry")
})
test("a template that realised its subgraph is used", () => {
  expect(selectRenderer(dividerSubgraph(), TEMPLATES).kind).toBe("template")
})
```
- [ ] **Step 3: Run both.** Expected: fail — `Mismatch` and `selectRenderer` do not exist.
- [ ] **Step 4: Widen `block-types.ts`** — `Mismatch`, `RealiseResult`, the four constructors, `Backend`, `Selection`. **Delete `mismatch(reason: string)`**: leaving it would let a site stay unclassified. Typecheck: 30 errors, one per site, which is the list to work through.
- [ ] **Step 5: Widen the five helper result types** so a forwarded reason carries its kind: `CommonRailLadder`, `StagePlanResult`, `TraceResult`, `Measured`, `FieldsResult` each replace `reason: string` with `mismatch: Mismatch`. The ten forwarding sites (`return mismatch(plan.reason)`) become `return { ok: false, mismatch: plan.mismatch }`.
- [ ] **Step 6: Classify all 30 sites.** Work file by file. **Record the classification of each site in the task report, with the reason**, and record any site that could not be classified by reading in `docs/known-gaps.md`.
- [ ] **Step 7: Write `selectRenderer` and rewire `realiseBlock`.** `wired` runs its declared template; `auto` tries `TEMPLATES` in registered order; **all `not-applicable` → `{kind:"elk"}`; any other mismatch → `{kind:"refused"}`**. `realiseBlock` throws on `refused` with the mismatch's full text, and calls `elk.realise(g)` on `{kind:"elk"}` — or throws naming the block and that no ELK backend was supplied, when `elk` is null. `attributed(…)` returns `backendRaised("template", …)` instead of rethrowing.
- [ ] **Step 8: Delete the `labels` rendering** from `Rendering`, from `validate.ts`'s `renderings` rule and from `classify.ts`'s `labelledNets` (which tests `rendering.kind !== "wired"` and must now mean *not `wired` and not `auto`*, i.e. `bus`). **Read `labelledNets` before changing it** — getting this wrong silently unlabels a cross-block net.
- [ ] **Step 9: Run the full suite.** All nine template tests pass; the census test still reports 30 sites, now all classified.
- [ ] **Step 10: Perturb in both directions** — make `selectRenderer` route `invalid-geometry` to ELK, watch the second selection test go red by name; then make it refuse `not-applicable`, watch the first go red. Restore both, report both outputs. **This perturbation is the one that matters most in the plan**: it is the G84 lesson, that *"if ELK rescues a template that should have worked, defects in the preferred rendering path go dark."*
- [ ] **Step 11: Record in `docs/known-gaps.md`**: the `labels` deletion as a deviation from *port whole*, with **D3**'s reasons and the criterion *no generated schematic carries connectivity only in labels*; and the per-site classification summary as a measurement.
- [ ] **Step 12: `shasum`, `bun run check`, commit, push.**

---

### Task 9: What the model declares, so no backend invents it

**Files:**
- Create: `lib/schgen/from-network.ts`, `lib/schgen/authoring.ts`
- Create: `lib/schgen/rules/symbols.ts`, `lib/schgen/rules/pin-sides.ts`, `lib/schgen/rules/orientation.ts`
- Create: `circuits/opamp-buffer.schematic.ts`, `circuits/pt2399-core/schematic/authoring.ts`, `circuits/optical-compressor/schematic/authoring.ts`, `circuits/transistor-preamp/schematic/authoring.ts`
- Test: `tests/schgen/from-network.test.ts`, `tests/schgen/rules/*.test.ts`, `tests/schgen/authoring-complete.test.ts`
- Modify: `docs/known-gaps.md` — rewrite G99

**Interfaces**
- Consumes: Task 2's `CircuitSpec`/`PartSpec`/`BlockSpec`/`RailSpec`/`SheetSpec`, Task 4's resolver, Task 8's `Rendering`.
- Produces:
  ```ts
  export type PinSide = "left" | "right" | "top" | "bottom"
  export type PortDirection = "in" | "out" | "bidirectional"

  export interface BlockDeclaration {
    readonly id: BlockId
    readonly sheet: SheetId
    readonly title: string
    /** Component ids, exactly as the Network names them. Never a prefix pattern. */
    readonly members: readonly string[]
    readonly rendering: Rendering
    readonly anchor: TemplateAnchor | null
  }
  export interface SchematicAuthoring {
    readonly project: string
    readonly designators: Readonly<Record<string, string>>
    readonly blocks: readonly BlockDeclaration[]
    readonly sheets: readonly SheetSpec[]
    readonly rails: readonly RailSpec[]
    readonly portDirections: Readonly<Record<string, PortDirection>>
    /** Per component id, where the model's symbol or pin sides are not derivable by rule. */
    readonly overrides: Readonly<Record<string, ComponentOverride>>
  }
  export interface ComponentOverride {
    readonly symbol?: string
    readonly symbolPins?: Readonly<Record<string, Readonly<Record<string, string>>>>
    readonly pinSides?: Readonly<Record<string, PinSide>>
    readonly why: string          // never blank: an override is a claim and carries its reason
  }
  export function circuitSpecFrom(network: Network, authoring: SchematicAuthoring,
    symbols: SymbolResolver): CircuitSpec
  /** Per kind, the reviewed symbol and pin sides. Circuit-independent, reviewed before any artifact. */
  export function symbolForKind(kind: ComponentKind, parameters: Parameters): string
  export function pinSidesFor(kind: ComponentKind, symbol: LibSymbol): ReadonlyMap<string, PinSide>
  export function preferredOrientation(kind: ComponentKind, context: OrientationContext): Rotation | null
  ```

**The criterion this implements is G99's, verbatim: *"every input a layout backend needs is either declared in the model or derived by a reviewed rule — none invented at the call site."*** G99 measured five inventions the spike harness had to make, and named which hurt:

| invented | what the measurement says |
| --- | --- |
| a **symbol** per kind | *"low — a fixed per-kind map sufficed"* — so `symbolForKind` is a reviewed rule, and spec §5.4's open question is answered the way `lib/model/kinds.ts` already answers pin vocabulary: **by kind, with a per-component override that carries its reason** |
| a **drawn orientation** | *"decides whether ELK crashes (G94), and moves crossings from 16 to 139 on one circuit"* — so it follows spec §1.5's authority order: reviewed template, then `preferredOrientation`, then the backend |
| a **pin-side partition** for an IC | ***"no basis in the model at all"*** — `pt2399-core`'s 16-pin PT2399 was split *"first half in, second half out"* because nothing said otherwise. **`pinSidesFor` derives sides from the symbol's own pin geometry**, which `extractPins` already carries as `angle`, so the partition comes from the library and not from an agent. A symbol that leaves it ambiguous needs an override with a reason. |
| a **rail convention** | the IR has no power symbol; `GND`/`VCC`/`0` are ordinary nets. **`RailSpec` is declared in the authoring file**, per net, with its power symbol and `"ground" \| "supply"` |
| a **port direction** | *"on `leg-upper` the exit port `to` draws as an arrow pointing INTO the trim-pot"* — `portDirections` is declared |

**The measured starting point, so nobody discovers it mid-task.** Of the four parity circuits: `optical-compressor` declares **a symbol on none of its 30 components**; `pt2399-core` on 2 of 24; `opamp-buffer` on 1 of 8; `transistor-preamp` on 8 of 43, through shared constructors in `parts.ts`. **That is the work, not a footnote** (G99, G102). `symbolForKind` is what makes it tractable; the overrides are what make the residue visible.

**Blocks are declared, and checked against `include()`** (**D1**). `includeNetwork` prefixes component ids with `${prefix}_`, so a block declared as `{ id: "oc-audio", members: ["audio_…", …] }` can be checked: every member sharing an `include()` prefix must be in one block, and no block may hold members from two prefixes unless the authoring file says why. `buildCircuit` already refuses a unit in two blocks and a unit in none.

- [ ] **Step 1: Write the failing completeness test** at `tests/schgen/authoring-complete.test.ts`, over all four circuits:
```ts
for (const c of PARITY_CIRCUITS) {
  test(`${c.name}: every component resolves a symbol, every pin a side`, () => {
    const spec = circuitSpecFrom(c.network, c.authoring, resolver)
    for (const part of spec.parts) {
      expect(part.libId, part.label).not.toBe("")
      const sym = resolver.resolve(part.libId)
      for (const pin of sym.pins) expect(sidesOf(part, sym).has(pin.number), `${part.label}.${pin.number}`).toBe(true)
    }
  })
  test(`${c.name}: every declared block agrees with the include() prefixes`, () => {
    expect(blockPrefixDisagreements(c.network, c.authoring)).toEqual([])
  })
  test(`${c.name}: every component is in exactly one block`, () => {
    expect(unblockedComponents(c.network, c.authoring)).toEqual([])
  })
}
```
- [ ] **Step 2: Run it.** Expected: fails on all four, `circuitSpecFrom` does not exist. **Record the starting counts** — components with no symbol, pins with no side — per circuit, as the measurement Task 17 compares against.
- [ ] **Step 3: Write the three rule modules.** `symbolForKind` is a **whitelist that refuses loudly** rather than a general rule that accepts a guess (`CLAUDE.md`: *"An empty whitelist that refuses loudly beats a general rule that quietly accepts a guess"*). Every lib id in it is **verified against the libraries on disk** before it is written. `pinSidesFor` reads `LibPin.angle` through `pinSide(0, pin)` and maps `"up"/"down"` to `"top"/"bottom"`; a symbol whose pins give fewer than two distinct sides refuses, naming the symbol and that an override must say which pins leave where.
- [ ] **Step 4: Write `from-network.ts`.** A `Component` becomes a `PartSpec`: `label` from `designators` (UPPER_SNAKE, refused otherwise), `refPrefix` from the designator's letters, `libId` from the override or `symbolForKind`, `pins` from the unit and package connections through `symbolPins` or the symbol's own numbering, `value` from `lib/kicad/value-notation.ts`'s `valueFor`, `footprint` from `part.footprint`. **`BomFields` has no source in this model**: `BOM_EXEMPT_PREFIXES` covers `TP`/`H`/`FID` and nothing else, so either the authoring file declares them or `bomFields` refuses — **do not default them to empty strings and do not widen the exemption list silently.** Decide, implement, and record which.
- [ ] **Step 5: Write the four authoring files.** Each override carries a non-blank `why`. **Blocks come from what the circuit already declares** — `include()` prefixes, `OWNERSHIP`/`partitionReference()`, `LEGS`, `allStandIns()` — and from nothing chosen here.
- [ ] **Step 6: Run the completeness test.** Report, per circuit: components resolved by rule, components needing an override, pins whose side came from the symbol, pins needing one.
- [ ] **Step 7: Perturb** — add a component kind to a fixture with no entry in `symbolForKind`; the refusal names the kind, the component and that no symbol is guessed. Then narrow `pinSidesFor` to return one side for a two-pin passive; the completeness test goes red naming the pin. Restore both, report.
- [ ] **Step 8: Rewrite G99** to record what is now declared, what is derived by rule, and what still has no home — **port direction for a net with no declared port, and the IC pin-side case where the symbol itself is ambiguous** — carrying G99's criterion forward and G102's warning that the spike's mutation arm had a blind spot, so its list of inventions is a lower bound.
- [ ] **Step 9: `shasum`, `bun run check`, commit, push.**

---

### Task 10: The existing-template parity census — M1's acceptance, first reading

**Files:**
- Create: `tools/schgen/parity.ts`, `tools/cli/schgen-parity.ts`
- Create: `docs/schematic/template-parity.md`
- Test: `tests/schgen/parity.test.ts`
- Modify: `docs/known-gaps.md`

**Interfaces**
- Consumes: Task 8's `Selection`/`Mismatch`, Task 9's `circuitSpecFrom` and the four authoring files.
- Produces:
  ```ts
  export interface BlockParity {
    readonly circuit: string
    readonly block: BlockId
    readonly parts: number
    readonly declared: Rendering
    readonly outcome:
      | { readonly kind: "realised"; readonly template: TemplateId }
      | { readonly kind: "elk" }                               // all templates not-applicable
      | { readonly kind: "refused"; readonly mismatch: Mismatch }
  }
  export interface ParityCensus {
    readonly blocks: readonly BlockParity[]
    readonly byTemplate: ReadonlyMap<TemplateId, { realised: number; notApplicable: number; refused: number }>
    readonly unexercised: readonly TemplateId[]
  }
  export function censusOf(circuits: readonly ParityCircuit[], symbols: SymbolResolver): ParityCensus
  export function renderCensus(c: ParityCensus): string
  ```

**This is M1's acceptance** (spec §6: *"existing-template parity — the seven ported templates draw the circuits already in this repository, graded by the ported gates and the new contracts"*) and §5.1's measurement: *"They were sized by a 103-block digital mainboard. Nothing is known about their pass rate on circuits that are mostly passive chains, dividers and op-amp stages. The measurement: run them and count."*

**The parent's own table is the prediction this census tests**, and it is a prediction rather than a result: `opampStage` for `opamp-buffer` and the compressor's audio path and sidechain amplifier; the decoupling bank for `opamp-buffer`'s 4 capacitors, `pt2399-core`'s 14 and the compressor's power section; `divider` for the compressor's VBIAS divider; `fanoutKit` for `lab-board`'s 10 connectors; `bus` for the PT2399; `passiveChain` *"everywhere"*; `regulator` and `crystal` **unexercised and flagged**. **The census either reproduces that table or it does not, and either answer is the deliverable.**

**It is a report, not a gate, at this point.** A refused block is a finding about a template, and §5.1 is a measurement. **Task 17 is where the census becomes a threshold**, once the measures exist to say what parity means.

- [ ] **Step 1: Write the failing census test** at `tests/schgen/parity.test.ts`:
```ts
test("the census covers every block of every parity circuit", () => {
  const c = censusOf(PARITY_CIRCUITS, resolver)
  expect(c.blocks.length).toBe(declaredBlockCount(PARITY_CIRCUITS))
})
test("every refusal says which kind of mismatch it is", () => {
  for (const b of censusOf(PARITY_CIRCUITS, resolver).blocks) {
    if (b.outcome.kind === "refused") expect(["not-applicable","invalid-geometry","clearance","backend-raised"])
      .toContain(b.outcome.mismatch.kind)
  }
})
```
  The second test is why Task 8 precedes this one.
- [ ] **Step 2: Run it.** Expected: fails — `censusOf` does not exist.
- [ ] **Step 3: Write `parity.ts` and the verb.** `censusOf` calls `selectRenderer` per block with no ELK backend, so an `{kind:"elk"}` selection is recorded as *"all templates not-applicable"* rather than drawn. `renderCensus` writes the markdown table.
- [ ] **Step 4: Run the census and write `docs/schematic/template-parity.md`** — per block: circuit, block, parts, declared rendering, outcome, and for a refusal the mismatch kind and its full message. Per template: realised / not-applicable / refused. And the unexercised list.
- [ ] **Step 5: Compare the census against the parent's table, row by row, in the report.** Say which rows reproduced, which moved, and which templates the parent predicted would be exercised and were not.
- [ ] **Step 6: Emit every block that realised, and LOOK AT IT.** One PDF per circuit, converted, **read with the Read tool.** Say what each looks like, and whether a template-drawn block reads as the arrangement §3.1 describes. `CLAUDE.md`: *"A board can pass every test and be unbuildable, a schematic can be correct and unreadable."*
- [ ] **Step 7: Perturb** — drop one template from `TEMPLATES`; the census's `unexercised` list grows and the blocks it drew become `elk`. Watch the coverage test report the change, restore, report.
- [ ] **Step 8: Record in `docs/known-gaps.md`** the census as a measurement — including the rows that found nothing wrong, which is a kind of entry `CLAUDE.md` names explicitly — with the parent's predicted table beside the measured one, and the criterion *every template the parent's table claims is exercised draws at least one block of this repository's circuits*.
- [ ] **Step 9: `shasum`, `bun run check`, commit, push.**

---

### Task 11: The four gates and the round trip's complete contract

**Files:**
- Create (ported): `lib/schgen/gates/connectivity.ts`, `pin-identity.ts`, `pin-table.ts`, `traceability.ts`
- Create (ported, adapted): `tools/schgen/verify.ts`
- Create: `lib/schgen/gates/round-trip.ts`
- Test: `tests/schgen/gates/*.test.ts`, `tests/schgen/gates/round-trip.kicad.test.ts`
- Modify: `docs/known-gaps.md`

**Interfaces**
- Consumes: Tasks 2–10, `lib/kicad/netlist.ts`'s `importNetlist`/`ImportedNetlist`, `tools/schgen/kicad-run.ts`'s `exportNetlist`.
- Produces:
  ```ts
  export interface ExpectedNets {
    readonly labelled: ReadonlyMap<NetName, readonly string[]>
    readonly internal: ReadonlyMap<NetName, readonly string[]>
    readonly nc: readonly string[]
    readonly refs: readonly string[]
    readonly problems: readonly string[]
  }
  export function expectedConnectivity(c: Circuit, refs: ReadonlyMap<PartLabel, string>): ExpectedNets
  export function compareConnectivity(e: ExpectedNets, actual: ImportedNetlist, stderr: string): string[]
  export function checkPinIdentity(c: Circuit, symbols: SymbolResolver,
    tables: ReadonlyMap<string, PinTable>, pads: PadLookup, projectLibs: ReadonlySet<string>): string[]
  export function parsePinTable(key: string, json: string): PinTable
  export function loadPinTables(dir: string): Map<string, PinTable>
  export function checklistIds(markdown: string): string[]
  export function checkTraceability(t: TraceInput): string[]
  export function runGates(d: LoadedDesign, env: GenerateEnv): GateResult[]

  /** Spec §2's complete contract, as five separately reported comparisons. */
  export interface RoundTripProblems {
    readonly componentIdentity: readonly string[]
    readonly pinIdentity: readonly string[]
    readonly netMembership: readonly string[]
    readonly values: readonly string[]
    readonly footprints: readonly string[]
    /** Components with no declared part: compared against nothing, and NOT a pass. */
    readonly footprintsUndeclared: readonly string[]
  }
  export function roundTrip(c: Circuit, refs: ReadonlyMap<PartLabel, string>,
    exported: ImportedNetlist): RoundTripProblems
  ```

**The adaptation gate 3 needs, and it removes a dependency rather than adding one.** `gates/connectivity.ts` takes pedals' `Connectivity { nets: Map<string,string[]>; references: string[] }`, produced by `connectivityFromXml` over `kicadxml` with `fast-xml-parser`. **This repository already has `importNetlist`**, which reads the s-expression `.net` export into `ImportedNetlist { components: {designator, value, footprint?, libPart?}[]; nets: Record<string, readonly string[]> }` — everything `compareConnectivity` reads: references from `components[].designator`, net members already as sorted `"designator.pin"`. **Adapt `compareConnectivity` to `ImportedNetlist` and add no XML parser.** Its three name conventions are preserved exactly: `"unconnected-("` is the IR's NC set, `"Net-("` are the unlabelled internal nets matched one-for-one by pin set, everything else matches a labelled net by leaf name.

**Gate 6's footprint half needs a pad reader this repository does not have.** `footprintPads` resolves through pedals' `fp-lib-table` machinery and `padNumbers(kicadModPath)`. **Decided: port `padNumbers`'s body** — it is 13 lines over `parse`, reading `(pad "<n>" …)` atoms and skipping the empty number — into `lib/schgen/gates/footprint-pads.ts`, and resolve a footprint through the `fp-lib-table` that `generatedFiles` already writes plus the KiCad install's own table. **This repository has 155 `.pretty` libraries on disk and names every footprint against them**, so the resolution is a lookup and not a guess. A footprint that does not resolve is a gate-6 problem naming the footprint and where it was looked for.

**Gate 7 has no checklist here, and that is a finding rather than a port.** `checkTraceability` reads `SCHEMATIC-CHECKLIST.md`'s `- [ ] **PWR-07**` items and `design.checklist.nonSchematic`. **`DesignSpec.checklist` is `ChecklistConfig | null` and `runGates` already skips the gate when it is null** — so the gate ports whole, runs on nothing today, and **Step 8 records that it is unexercised.** An unexercised gate that looks exercised is the failure `CLAUDE.md` names; the census of which gates ran must say so.

**The round trip's contract, stated rather than inherited** (spec §2, finding 10). `tests/circuits/kicad-round-trip.ts`'s `expectSameCircuit` already compares three things — the net partition as sorted `designator.pin` sets ignoring net names, a designator→value map, and each component's footprint against `component.part?.footprint`. The spec's complete contract adds two and sharpens one:

| compared | why the one before it does not cover it |
| --- | --- |
| **component identity** | a net partition is over `designator.pin` strings; **two components swapped consistently produce the same partition** |
| **pin identity** | pad-count parity cannot catch a swapped IN/OUT |
| **net membership**, a partition ignoring net names | catches wrong connectivity and a renamed interface net with equivalent topology |
| **values** | a correct topology with a wrong capacitor is a correct netlist |
| **footprints where declared** | *where declared* is deliberate: a component with no declared part **has nothing to compare, and that must not read as a pass** — hence `footprintsUndeclared`, reported separately |

**And the two warnings that go where an implementer will read them**, in `round-trip.ts`'s module comment. *A certificate verifies what it was given, not what you meant*: a tool whose input format could not express a rotary selector drew *"an excellent picture of a circuit that is not the Pultec"* and its round-trip certificate was blind to it, because the substitution happened upstream. **The chain is only as good as the link checking the model against the authored schematic, and that link is the committed-netlist comparison, not this.** Second: a schematic can export a correct netlist while visually suggesting wrong connections. **The round trip is not a readability gate and must never be reported as one.**

- [ ] **Step 1: Run the rewriter** over the four gate files, `verify.ts` and their tests.
- [ ] **Step 2: Write the failing round-trip contract test** at `tests/schgen/gates/round-trip.kicad.test.ts`. It uses the real `kicad-cli` and **FAILS rather than skips when it is missing**, naming `KICAD_CLI` and why — the convention `tests/circuits/kicad-round-trip.ts` already sets. Five assertions, one per contract row, each with a deliberate mutation that only that row catches:
```ts
test("two components swapped consistently are caught by component identity, not by the partition", () => {
  const p = roundTrip(circuit, refs, swapTwoComponentsConsistently(exported))
  expect(p.netMembership).toEqual([])
  expect(p.componentIdentity.length).toBeGreaterThan(0)
})
test("a component with no declared part is reported, not passed", () => {
  const p = roundTrip(circuitWithUndeclaredPart, refs, exported)
  expect(p.footprints).toEqual([])
  expect(p.footprintsUndeclared).toContain("no_part_component")
})
```
- [ ] **Step 3: Run them.** Expected: fail — `roundTrip` does not exist.
- [ ] **Step 4: Adapt `compareConnectivity` to `ImportedNetlist`** and write the gate-3 test over a generated fixture through real `kicad-cli`.
- [ ] **Step 5: Write `footprint-pads.ts` and wire gate 6's `PadLookup`.**
- [ ] **Step 6: Write `roundTrip`** and run the contract tests.
- [ ] **Step 7: Run `runGates` over the four parity circuits.** Report, per circuit, each gate's name and problem count, and **which gates did not run and why** — gate 7 has no checklist, gate 8 is deferred.
- [ ] **Step 8: Perturb each of the five contract rows** — one mutation each, red by name, restore, report all five outputs. Then perturb gate 3's `"Net-("` convention and watch the internal-net comparison go red.
- [ ] **Step 9: Record in `docs/known-gaps.md`**: that **gate 8 (`gates/oscar/`) is deferred to M2 against a parent instruction that says it ports**, with the two reasons from **What is NOT in this plan** and the criterion *a generated schematic is compared against `pt2399-core.kicad_sch` and `lab-board.kicad_sch` by value and pin-level adjacency, independent of references and net names*; that **gate 7 ports and is unexercised**; and that **gate 3 now reads the s-expression netlist rather than `kicadxml`**, with the criterion *one netlist reader*.
- [ ] **Step 10: `shasum`, `bun run check`, commit, push.**

---

### Task 12: The ELK backend — the graph, fixed ports, and the asynchronous pre-pass

**Files:**
- Create: `lib/schgen/elk/graph.ts`, `lib/schgen/elk/options.ts`, `lib/schgen/elk/serialize.ts`
- Create: `tools/schgen/elk/layout.ts`
- Create (if needed): `lib/schgen/elk/elkjs.d.ts`
- Modify: `package.json` (pin `elkjs`), `tools/schgen/generate.ts` (becomes `async`)
- Test: `tests/schgen/elk/graph.test.ts`, `serialize.test.ts`, `tests/schgen/elk/layout.elk.test.ts`
- Modify: `docs/known-gaps.md`

**Interfaces**
- Consumes: Task 7's `BlockSubgraph`, Task 4's `LibSymbol`/`LibPin`, Task 9's `pinSidesFor`/`preferredOrientation`/`portDirections`, Task 3's `pinEnd`/`pinSide`/`placeBox`.
- Produces:
  ```ts
  export interface ElkBlockInput {
    readonly blockId: BlockId
    /** The EXACT bytes the manifest (§2.1) and the baseline (§3.3) hash. */
    readonly serialized: string
    readonly graph: ElkNode
  }
  export function elkInputOf(g: BlockSubgraph, authoring: SchematicAuthoring): ElkBlockInput
  export function serializeElkInput(graph: ElkNode): string
  export const BLOCK_OPTIONS: Readonly<Record<string, string>>
  export const NODE_OPTIONS: Readonly<Record<string, string>>
  export type ElkOutcome =
    | { readonly ok: true; readonly blockId: BlockId; readonly serialized: string; readonly graph: ElkNode }
    | { readonly ok: false; readonly blockId: BlockId; readonly serialized: string; readonly mismatch: Mismatch }
  export async function layoutBlocks(inputs: readonly ElkBlockInput[]): Promise<ReadonlyMap<BlockId, ElkOutcome>>
  export function elkBackendFrom(outcomes: ReadonlyMap<BlockId, ElkOutcome>): Backend
  ```

**The mechanism taken from `netlistsvg`, and the code path that is not** (spec §1.2). **What transfers: every symbol declares which SIDE each pin leaves from, and ELK is told those port positions are FIXED.** *"That one constraint is what turns a generic layered graph drawing into something that reads like a circuit."* **What does not transfer: the code path** — `netlistsvg` emits SVG through a skin and we emit `.kicad_sch`, so the graph is built here from the symbol library's own pin geometry rather than from `lib/analog.svg`'s templates.

**Both spikes drove ELK through `netlistsvg`. This does not, and that is a stated difference rather than a detail.** Consequences to carry: port glyphs were `netlistsvg`'s 30×20 `inputExt` cells (G101's floor is about those), the congruence result's x-offset was predicted by `6 * len(id) + 5` which is the skin's 10px monospace (G97), and `direction=DOWN` was the skin's. **Here a node's size is the symbol's own `boxes` entry in micrometres, a port is a `LibPin`'s transformed end, and the direction is `RIGHT` per D4.** Task 17 is the re-measurement that says how much moved.

Concretely: one ELK node per `BlockUnit`, sized from `u.symbol.boxes.get(u.unit)`; one ELK port per connected pin, positioned at `pinEnd({x:0,y:0}, rot, libPin)` relative to the node's origin with `"elk.port.side"` from `pinSidesFor`; `"elk.portConstraints": "FIXED_POS"` on every node; one node per declared port of the block, with its `portDirections` entry; one edge per pin pair of each net, so a net of degree *n* is *n−1* edges of a tree; `"elk.algorithm": "layered"`, `"elk.direction": "RIGHT"`, `"elk.edgeRouting": "ORTHOGONAL"`, `"elk.spacing.nodeNode"` and `"elk.layered.spacing.nodeNodeBetweenLayers"` in whole grid steps.

**`serializeElkInput` is load-bearing and its output is a contract.** G95: three shuffles of the same netlist — same components, same nets, same partition — give **three distinct drawings out of three on 4 of 4 circuits**, moving crossings up to 2.1× at block scale and 3× flat. *"Reordering the `.capacitor(...)` calls in a circuit file would change every generated schematic."* **So the manifest and the baseline hash these bytes, not the `Network`'s content**, and a hash over the network *"would certify two different drawings under one input hash, which is exactly the failure the manifest exists to prevent."* Determinism for a fixed input holds — 14 of 14 inputs gave one distinct output over three runs — so this is a stable key. `serializeElkInput` is `JSON.stringify` with keys in a declared order, and a test pins that two serializations of one input are byte-identical and that two different cell orders serialize differently.

- [ ] **Step 1: Pin `elkjs` and verify D2's premise.** Add it to `package.json`. **Report whether `elkjs` ships `lib/elk-api.d.ts`** and whether it exposes any synchronous layout entry point. Import the types if they exist; otherwise write `lib/schgen/elk/elkjs.d.ts` declaring the module with the exact shapes used — **a declaration file for an untyped dependency is not a type bypass, and the file says so in its header.** If a synchronous entry point exists, **record the deviation from D2** and take it.
- [ ] **Step 2: Write the failing graph test** at `tests/schgen/elk/graph.test.ts`:
```ts
test("every connected pin becomes a fixed-position port on its symbol's own side", () => {
  const { graph } = elkInputOf(dividerSubgraph(), authoring)
  for (const node of graph.children ?? []) {
    expect(node.layoutOptions?.["elk.portConstraints"]).toBe("FIXED_POS")
    for (const port of node.ports ?? []) {
      expect(["NORTH","SOUTH","EAST","WEST"]).toContain(port.layoutOptions?.["elk.port.side"])
    }
  }
})
test("a net of degree n becomes n-1 edges", () => {
  const { graph } = elkInputOf(groundOfDegreeSix(), authoring)
  expect((graph.edges ?? []).filter((e) => e.id.startsWith("GND:")).length).toBe(5)
})
```
- [ ] **Step 3: Write the failing serialization test** — two serializations of one input are identical; two declaration orders of the same circuit serialize differently. **The second assertion is the one that matters**: it is G95 made into a check that could fail.
- [ ] **Step 4: Run both.** Expected: fail.
- [ ] **Step 5: Write `graph.ts`, `options.ts`, `serialize.ts`.** Run the tests.
- [ ] **Step 6: Write `layoutBlocks`.** It wraps each `elk.layout(graph)` in a `try`/`catch` that turns a raise into `backendRaised("elkjs", serialized, message)` — **Task 14 decides what the caller does with it; this task only makes sure it is a value and not an escaped exception.** `elkBackendFrom` returns a synchronous `Backend` whose `realise` looks the block up and refuses, naming the block and the pre-pass, when it is absent.
- [ ] **Step 7: Make `generate` async** and thread the pre-pass: build, validate, annotate, version-lock, **then `layoutBlocks` over every block `selectRenderer` sends to ELK**, then `layoutSheet` with the backend. Update `tools/cli/schgen.ts` and every test that calls `generate`.
- [ ] **Step 8: Run the ELK determinism test** at `tests/schgen/elk/layout.elk.test.ts` — the same input three times gives one distinct output, which is the property G95 says holds and the only thing the spikes found that this layer can be trusted on.
- [ ] **Step 9: Perturb** — drop `FIXED_POS`; the graph test goes red naming the node. Then reorder the serializer's keys; the byte-identity test goes red. Restore both, report.
- [ ] **Step 10: Record in `docs/known-gaps.md`** that this driver replaces `netlistsvg`'s code path, so **every spike figure carries a new caveat**: port glyphs, the congruence x-offset formula and the flow direction were all properties of the skin. Criterion: Task 17's re-measurement reports each of §1.1's, §1.8's, §3.3's and §3.4's numbers as reproduced or moved.
- [ ] **Step 11: `shasum`, `bun run check`, commit, push.**

---

### Task 13: The ELK→`BlockLayout` adapter and the five realization obligations

**Files:**
- Create: `lib/schgen/elk/adapt.ts`, `lib/schgen/elk/snap.ts`, `lib/schgen/elk/junctions.ts`
- Test: `tests/schgen/elk/adapt.test.ts`, `snap.test.ts`, `junctions.test.ts`
- Modify: `docs/known-gaps.md`

**Interfaces**
- Consumes: Task 12's `ElkOutcome`, Task 8's `RealiseResult`/`Mismatch`, Task 5's `checkLayout`/`PAIR_COVERAGE`, Task 3's `GRID`/`gridCeil`/`samePoint`.
- Produces:
  ```ts
  export function adaptElkLayout(g: BlockSubgraph, outcome: ElkOutcome): RealiseResult

  export type SnapResult =
    | { readonly ok: true; readonly placements: readonly Placement[]; readonly wires: readonly Wire[]
        readonly anchors: readonly Anchor[] }
    /** Snapping merged distinct geometry or changed a net's membership: named pairs, and a refusal. */
    | { readonly ok: false; readonly collapsed: readonly string[] }
  export function snapToGrid(l: BlockLayout): SnapResult

  /** Every branch point of every net, which KiCad connects only with a junction object. */
  export function branchJunctions(l: BlockLayout, pins: readonly PlacedPin[]): readonly Point[]
  export function junctionProblems(l: BlockLayout, pins: readonly PlacedPin[],
    emitted: readonly Point[]): readonly string[]
  ```

**The claim an implementer starts from** (spec §1.4): **a geometrically valid ELK drawing is not necessarily a valid KiCad schematic.** ELK knows nodes, ports and orthogonal edges. KiCad knows a 1.27 mm electrical grid, pin ends as the only places a wire connects, junction objects that make a crossing a connection, and symbol transforms that move pins. **Every one of those is a way a correct ELK drawing becomes a wrong schematic.** And the electrical round trip cannot stand in for the geometric checks, *"because a schematic can export a correct netlist while visually suggesting wrong connections."*

**Spec §5.3: the adapter IS the realization contract.** *"The grid snapping, junction emission and route-invalidation questions all live in that adapter and nowhere else, which is a smaller and better-bounded problem than 'port a geometry layer'."*

The five obligations, each a function and a test:

1. **Grid snapping must not merge previously distinct wires.** *"The contract is that snapping is checked for identity collapse, not assumed to preserve it: after snapping, the set of distinct wire geometries and the set of net memberships must both be unchanged from before snapping, and a collapse refuses."* `snapToGrid` computes both sets before and after and returns `{ok:false, collapsed}` naming each merged pair.
2. **ELK edge junctions become KiCad wire junctions explicitly, including multi-terminal nets.** *"Every branch point of every net carries an emitted junction, and every emitted junction sits on exactly one net. A crossing between different nets carries no junction, and a net's branch point carrying none is a refusal rather than a cosmetic miss."* Note `layoutSheet` currently sets `junctions: junctionPoints(sheetItems(scene))` and the port's comment calls them *"cosmetic only"* — **for ELK geometry they are not cosmetic**, so `junctionProblems` compares `branchJunctions` against what was emitted and refuses on a difference.
3. **Port positions survive rotation and mirroring by being recomputed, never carried.** *"The transform is applied once, to the library pin geometry, and the result is what both ELK and the emitter see — so there is one transformed geometry and no second copy to drift."* The adapter therefore recomputes every pin end from `pinEnd(placement.at, placement.rot, libPin)` and **never reads an ELK port's returned coordinate as a wire attachment point.**
4. **Routes are kept off unrelated pins, labels and symbol bodies by the same obstacle matrix that grades template output**, not a second set of rules — Task 5's `PAIR_COVERAGE`, re-validated against this geometry source, which is why Task 5 built the matrix up front.
5. **When snapping makes a previously valid route invalid, the generator REFUSES.** *"Decided here, and it is deliberately the unambitious answer. A repair pass is a second layout engine with no gate of its own, written at the point in the pipeline where the agent has the least information and the most incentive to make the sheet pass."* **CRITERION: no generated schematic is emitted whose geometry was altered after its last clearance check.** So `adaptElkLayout` runs `checkLayout` **after** snapping and never again touches the geometry.

**And §1.5's four-link mapping is verified here, end to end:** `IR terminal → symbol-library pin → transformed geometric pin → KiCad electrical connection`. *"A sheet can hold every expected part on correctly named nets and still have a wire reaching the wrong terminal."* Obligation 3 is what makes link 3 checkable, and the test below is the check.

- [ ] **Step 1: Write the failing snap test** at `tests/schgen/elk/snap.test.ts`:
```ts
test("snapping two distinct parallel segments onto one grid line REFUSES", () => {
  const r = snapToGrid(twoSegmentsHalfAGridApart())
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.collapsed.join(" ")).toContain("wire 0")
})
test("snapping that preserves identity returns every wire on the grid", () => {
  const r = snapToGrid(alreadyNearGrid())
  expect(r.ok).toBe(true)
  if (r.ok) for (const w of r.wires) { expect(onGrid(w.a)).toBe(true); expect(onGrid(w.b)).toBe(true) }
})
test("snapping that changes a net's membership REFUSES", () => {
  expect(snapToGrid(twoNetsOneGridStepApart()).ok).toBe(false)
})
```
- [ ] **Step 2: Write the failing junction test:**
```ts
test("a net of degree 4 drawn as a tree needs a junction at every branch point", () => {
  const l = fourWayFan()
  expect(branchJunctions(l, pinsOf(l)).length).toBe(2)
})
test("a branch point with no emitted junction REFUSES", () => {
  expect(junctionProblems(fourWayFan(), pinsOf(fourWayFan()), []).length).toBe(2)
})
test("a crossing between different nets carries no junction", () => {
  expect(branchJunctions(twoNetsCrossing(), [])).toEqual([])
})
```
- [ ] **Step 3: Write the failing four-link test** at `tests/schgen/elk/adapt.test.ts`:
```ts
test("a mirrored symbol keeps its pin identity: the transform moves geometry, never assignment", () => {
  const plain = adaptElkLayout(bjtSubgraph(), outcomeWith(rot(0)))
  const mirrored = adaptElkLayout(bjtSubgraph(), outcomeWith(rot(180)))
  expect(netAtPin(mirrored, "Q1", "1")).toBe(netAtPin(plain, "Q1", "1"))
  expect(pointOf(mirrored, "Q1", "1")).not.toEqual(pointOf(plain, "Q1", "1"))
})
test("no wire attaches to an ELK port coordinate that disagrees with the recomputed pin end", () => {
  expect(portCoordinateDisagreements(bjtSubgraph(), outcomeWith(rot(90)))).toEqual([])
})
```
- [ ] **Step 4: Run all three groups.** Expected: fail.
- [ ] **Step 5: Write `snap.ts`, `junctions.ts`, `adapt.ts`** in that order. `adaptElkLayout` converts nodes to `Placement[]` (`rot` from `preferredOrientation`, never from ELK's graph direction — §1.5: *"it may not invent symbol semantics through graph direction alone"*), edge sections to `Wire[]` by splitting each section at its bend points, and boundary-port nodes to `Anchor[]`. Then snap, then `junctionProblems`, then `checkLayout`. **Each failure returns the right `Mismatch` kind**: a snap collapse is `invalid-geometry`, a clearance failure is `clearance` naming the constraint and the obstacle pair.
- [ ] **Step 6: Run the obstacle matrix against ELK geometry.** Draw every ELK-routed block of the four parity circuits and **report every `PAIR_COVERAGE` pair that fires on ELK geometry and never fired on template geometry.** That set is the fresh blind spot §1.4 predicted; an empty set is a result worth recording too.
- [ ] **Step 7: Emit an ELK-routed block and LOOK AT IT.** PDF, convert, **read with the Read tool.** Say whether the junctions are where the branch points are, whether the ports are on the boundary, and whether it reads as the same drawing as the template-drawn block beside it (§1.7's one visual language).
- [ ] **Step 8: Perturb all five obligations.** (1) make `snapToGrid` always return `ok: true`; (2) emit no junctions; (3) read a wire's attachment from the ELK port coordinate; (4) skip `checkLayout` after snapping; (5) add a one-grid-step nudge after the last clearance check. **Each goes red by name. Restore each. Report all five outputs.**
- [ ] **Step 9: Record in `docs/known-gaps.md`** the obstacle-pair result from Step 6 — including an empty one — and any deviation from the up-front-matrix mechanism, carrying G85's criterion.
- [ ] **Step 10: `shasum`, `bun run check`, commit, push.**

---

### Task 14: When the backend raises (G94)

**Files:**
- Modify: `tools/schgen/elk/layout.ts`, `lib/schgen/render/blocks.ts`
- Create: `lib/schgen/elk/self-loop.ts`, `tools/schgen/elk/diagnose.ts`
- Test: `tests/schgen/elk/raised.elk.test.ts`, `tests/schgen/elk/self-loop.test.ts`
- Modify: `docs/known-gaps.md` — rewrite G94

**Interfaces**
- Consumes: Task 12's `layoutBlocks`, Task 8's `backendRaised`.
- Produces:
  ```ts
  /** Cells whose own net reaches two of their own pins: the condition G94 found NECESSARY. */
  export interface SelfLoop { readonly part: PartLabel; readonly unit: number; readonly net: NetName }
  export function selfLoops(g: BlockSubgraph): readonly SelfLoop[]
  export interface RaiseDiagnosis {
    readonly blockId: BlockId
    readonly backend: string
    readonly message: string
    readonly selfLoops: readonly SelfLoop[]
    readonly horizontalPassives: readonly PartLabel[]
    /** The serialized input, so the raise is reproducible from the report alone. */
    readonly inputKey: string
  }
  export function diagnoseRaise(g: BlockSubgraph, input: ElkBlockInput, error: unknown): RaiseDiagnosis
  export function renderDiagnosis(d: RaiseDiagnosis): string
  ```

**This is not a theoretical case.** `[RAN]`, G94: elkjs **0.7.1 and 0.9.3 both raise** `java.lang.IllegalStateException: Invalid hitboxes for scanline constraint calculation.` on `circuits/opamp-buffer.ts`, **the simplest circuit this repository owns**, when `output_coupling_cap` is drawn horizontally. 9 of 32 orientation assignments fail, smallest failing set one component — **a one-character change to the layout input.** At block scale, **45 of 256 orientation assignments of the 12-part `oc-audio` block fail**, smallest failing set two components. The 76-part `THREE_BAND_REFERENCE` refuses under **both** vertical policies while all five of its declared sections lay out.

**And it is reachable from house style, which is why no rule can simply forbid the shape.** The four self-loop cells on that reference are strapped pot wipers that `circuits/pultec/electrical/three-band.ts` declares deliberately — *"the wiper is tied to the cw end, so only the ccw-wiper section carries current and the pot reads as a variable resistor"* — and `circuits/transistor-preamp/parts.ts` states the same strap as a convention across both preamp boards: *"every leg fails to its MAXIMUM resistance — never open, never zero."* **A rule that refuses an op-amp or pot self-loop refuses house style.**

**DECIDED: the generator REFUSES, with a diagnosis, and does not retry.** Four reasons:

- **The criterion is a defined outcome, and refusal is one.** G94: *"CRITERION: a generator must have a defined outcome when its layout backend throws."* Nothing in it asks for recovery.
- **A retry under different orientations would be the generator choosing a semantic property of the circuit**, which §1.5 assigns to a reviewed template or a reviewed rule and explicitly denies the backend.
- **The one mechanism anybody has proposed is measured wrong.** G94 suggested *"constraining laterals on a self-loop net to vertical"*; **on `oc-audio` that leaves 32 of 128 assignments still failing.** An implementer who followed it would ship a non-fix. **This is `CLAUDE.md`'s worked example exactly: the criterion binds, the mechanism was advice from someone who had not yet tried it, and the deviation is recorded.**
- **A silent retry would hide the dependency defect.** G84's lesson, one level down: the sheet would look fine and a backend that cannot draw a unity-gain buffer would never be reported.

**What the refusal carries, so it is worth more than a stack trace:** the block, the backend and its version, the exception message, **the self-loop cells** (the arm that cleared a whole sweep: 0 of 256 failures after breaking the self-loop), the horizontal passives on those nets, and the serialized input — *"so the raise is reproducible from the report alone."* **`selfLoops` is diagnostic and never a rule**: it is printed, and it refuses nothing by itself.

- [ ] **Step 1: Write the failing test** at `tests/schgen/elk/raised.elk.test.ts`, reproducing G94 on the real backend:
```ts
test("the measured crash is a refusal with a diagnosis, never an escaped exception", async () => {
  const outcomes = await layoutBlocks([elkInputOf(opampBufferWithHorizontalOutputCap(), authoring)])
  const o = outcomes.get("opamp-buffer")
  expect(o?.ok).toBe(false)
  if (o !== undefined && !o.ok) {
    expect(o.mismatch.kind).toBe("backend-raised")
    if (o.mismatch.kind === "backend-raised") {
      expect(o.mismatch.backend).toContain("elkjs")
      expect(o.mismatch.reason).toContain("Invalid hitboxes")
    }
  }
})
test("the diagnosis names the self-loop, which is the arm that cleared a whole sweep", () => {
  const d = diagnoseRaise(ocAudioBlock(), input, new Error("Invalid hitboxes for scanline constraint calculation."))
  expect(d.selfLoops.map((s) => s.part)).toContain("audio_gain_amp")
})
```
  **If the crash does not reproduce on the pinned `elkjs`, that is a finding: report it, record it against G94, and do not weaken the test to pass.**
- [ ] **Step 2: Run it.** Expected: fails — `diagnoseRaise` does not exist.
- [ ] **Step 3: Write `self-loop.ts` and `diagnose.ts`.** `selfLoops` finds every `BlockUnit` two of whose pins are on one net.
- [ ] **Step 4: Wire `layoutBlocks`' catch to `diagnoseRaise`** and `realiseBlock` to refuse on `backend-raised` with `renderDiagnosis`' full text.
- [ ] **Step 5: Run the test. Then print a real diagnosis into the task report**, in full, and say whether a person could reproduce the raise from it alone.
- [ ] **Step 6: Measure the three arms G94 names, on this driver rather than on `netlistsvg`'s.** On `oc-audio`: break the self-loop (G94: 0 of 256 fail); remove the lateral and keep the loop (G94: 32 of 128 still fail); remove both the lateral and the rheostat strap (G94: 31 of 128). **Report whether each reproduces or moves.** G94 could not decide whether the block-scale result corrects the first narrowing or is a second sufficient condition in a different circuit; **this measurement is on a third driver and must not be reported as deciding it either.**
- [ ] **Step 7: Perturb** — let the exception escape `layoutBlocks`; the test goes red as an unhandled rejection rather than a refusal. Then make `diagnoseRaise` omit the self-loops; the second test goes red by name. Restore both, report.
- [ ] **Step 8: Rewrite G94** with: the refusal-with-diagnosis decision and its four reasons; **the measured-wrong mechanism recorded as a deviation**, with `CLAUDE.md`'s criterion-versus-mechanism rule cited; Step 6's three arms as reproduced or moved; and what remains open — *whether §1.5's orientation rule library can be required never to emit the crashing shape*, which this task does not settle and which a rule refusing a strapped wiper would answer wrongly.
- [ ] **Step 9: `shasum`, `bun run check`, commit, push.**

---

### Task 15: Seam B, sheets, and one cross-sheet mechanism per net

**Files:**
- Create: `lib/schgen/elk/sheet-graph.ts`, `tools/schgen/elk/sheet-layout.ts`
- Modify: `lib/schgen/render/sheets.ts`, `lib/schgen/render/pack.ts`
- Create: `lib/schgen/render/cross-sheet.ts`
- Test: `tests/schgen/elk/sheet-graph.test.ts`, `tests/schgen/render/cross-sheet.kicad.test.ts`
- Modify: `docs/known-gaps.md`

**Interfaces**
- Consumes: Task 6's `layoutSheet`/`packFrames`/`FrameContent`/`frameSize`, Task 12's `layoutBlocks`, Task 13's adapter.
- Produces:
  ```ts
  export interface FramePlacement { readonly at: Point; readonly size: Size }
  export type SheetPacking =
    | { readonly ok: true; readonly at: readonly Point[]; readonly by: "shelf" | "elk" }
    | { readonly ok: false; readonly needed: Size }
  export function sheetGraphOf(contents: readonly FrameContent[], paper: Size): ElkNode
  export async function packFramesWithElk(contents: readonly FrameContent[], paper: Size): Promise<SheetPacking>

  export type CrossSheetMechanism = "power-symbol" | "global-label"
  export function mechanismFor(net: NetName, c: Circuit): CrossSheetMechanism
  /** A net carrying more than one mechanism, or crossing a boundary by neither. */
  export function crossSheetProblems(c: Circuit, drawings: readonly SheetDrawing[]): readonly string[]
  ```

**Seam B is the second place a layered orthogonal engine has something to offer** (spec §1.6, parent). Today `packFrames` shelf-packs: left to right inside `MARGIN`, a new shelf when a frame does not fit, the bottom `TITLE_BLOCK` strip kept free, and *"the packer never picks a larger paper; it reports the size it would have needed."* It knows nothing about which blocks are connected, which is why *"it is the one that produced a 1:1.97 unusable ribbon when a competing tool did it badly."*

**`packFramesWithElk` is a second packer beside the first, not a replacement, and the selection is mechanical.** ELK packs when every frame's size is known and the sheet graph has at least one inter-frame edge; the shelf packer is used otherwise. **Both report the same `SheetPacking`, so a refusal reads the same either way.** This is not a fallback: a sheet with no inter-frame edges has no graph to lay out, which is a property of the input and not a failure of the engine.

**And §3.4's disjointness criterion is measured here, because it is dissolved at block scale.** Revision 2: *"Inside a single block, disjointness is trivially satisfied, so a block-scale measurement can neither pass nor fail it. It stands measured only at flat scale, where it answers no (67% of canvas, 11 non-members inside the group's box), and whatever mechanism composes blocks onto a sheet — seam B — is what it will have to be measured against."* **So Task 16's measures include frame-box overlap and non-member containment, computed over this task's packing.**

**The cross-sheet mechanism, per D5.** `mechanismFor` returns `"power-symbol"` for a declared rail and `"global-label"` otherwise — a declared property of the model, decided upstream. `crossSheetProblems` refuses a net drawn with both, and a net whose pins are on two sheets with neither.

**The test is the reviewer's, adopted as written** (spec §1.6): *"generate the same network as one sheet and as multiple sheets, export both through `kicad-cli`, and verify identical net membership."* Its three required cases, each with the reason the spec gives:

- **a shared rail** — the case a power symbol exists for;
- **a signal crossing more than two sheets** — *"a two-sheet test cannot distinguish a working mechanism from one that happens to pair up"*;
- **a repeated block** — *"two instances of one function must not merge through a cross-sheet name collision, which is the failure a prefixed net scheme exists to prevent."*

*"This test is cheap and load-bearing because it compares the generator against itself through KiCad, so it needs no reference drawing and works in both authority directions."*

**And the hazard the reviewer named is already prevented, which the spec records as a correction to the review.** Sheets cannot alter the electrical partition: `circuits/pultec/partition.ts` runs **upstream** of generation and the generator consumes it. A sheet may group two functional blocks, split one across two sheets, or match a board one-to-one; **none of those is an electrical claim.** Nothing in this task may create a code path from a sheet decision to the partition, and the test above is what would catch one.

- [ ] **Step 1: Write the failing one-sheet-versus-multi-sheet test** at `tests/schgen/render/cross-sheet.kicad.test.ts`, three fixtures, real `kicad-cli`, failing rather than skipping when it is absent:
```ts
for (const f of [sharedRail(), signalAcrossThreeSheets(), twoInstancesOfOneBlock()]) {
  test(`${f.name}: one sheet and ${f.sheets} sheets export identical net membership`, async () => {
    expect(partitionOf(await exportOf(f.asOneSheet))).toEqual(partitionOf(await exportOf(f.asManySheets)))
  })
}
test("a net drawn with both a power symbol and a global label REFUSES", () => {
  expect(crossSheetProblems(railAlsoLabelled(), drawings).length).toBeGreaterThan(0)
})
```
- [ ] **Step 2: Run it.** Expected: the three partition cases fail or cannot run; `crossSheetProblems` does not exist.
- [ ] **Step 3: Write `cross-sheet.ts`** and wire `crossSheetProblems` into `layoutSheet`'s existing `assertSheetSafe` neighbourhood. Run the fourth test.
- [ ] **Step 4: Build the three fixtures and run the three partition cases.** **Report each partition side by side.** A disagreement is a defect in the mechanism, diagnosed with superpowers:systematic-debugging, not a test to relax.
- [ ] **Step 5: Write `sheetGraphOf` and `packFramesWithElk`**, with the frame-box-overlap and non-member-containment measures §3.4 needs.
- [ ] **Step 6: Pack one multi-block sheet both ways and LOOK AT BOTH.** Two PDFs, converted, **read with the Read tool.** Report each packing's occupied area, aspect and inter-frame wire length, and **say which you would rather read.** That sentence is an observation for the record, not an acceptance: §3.3 gives the measures no threshold.
- [ ] **Step 7: Perturb** — give `mechanismFor` a third mechanism for one net; the refusal fires by name. Then make `packFramesWithElk` ignore the paper bound; a frame lands outside the margin and `assertTextClear` goes red. Restore both, report.
- [ ] **Step 8: Record in `docs/known-gaps.md`**: D5's reading of §1.6's *"exactly one mechanism"* as one-per-net, so a later reader can dispute it; the two packings' measures as a measurement; and that **seam B's own crossings were untested in both spikes** (§1.1's third limit — each block was drawn on its own canvas, *"so the totals add crossings across three sheets and seam B would add its own"*), now measured for the first time, with the figure.
- [ ] **Step 9: `shasum`, `bun run check`, commit, push.**

---

### Task 16: The generation manifest, the readability baseline, and the four measures

**Files:**
- Create: `lib/schgen/manifest.ts`, `lib/schgen/readability/measures.ts`, `lib/schgen/readability/baseline.ts`, `lib/schgen/readability/finding.ts`
- Create: `schematic/readability-baselines.json`
- Modify: `tools/schgen/generated-files.ts`, `tools/schgen/verify.ts`, `lib/schgen/report.ts`
- Test: `tests/schgen/manifest.test.ts`, `tests/schgen/readability/*.test.ts`
- Modify: `docs/known-gaps.md`

**Interfaces**
- Consumes: Task 12's `serialized` bytes per block, Task 13's adapter, Task 15's sheet packing, Task 6's `generatedFiles`.
- Produces:
  ```ts
  export interface GenerationManifest {
    readonly version: 1
    /** The canonical schematic's netlist export: the authority for a schematic-first circuit. */
    readonly canonicalNetlistSha256: string | null
    readonly sectionNetworkSha256: string
    /** Block id -> SHA-256 of the EXACT bytes handed to the layout backend. */
    readonly layoutInputSha256: Readonly<Record<BlockId, string>>
    readonly templateLibrarySha256: string
    readonly ruleLibrarySha256: string
    readonly generatedSha256: Readonly<Record<string, string>>
  }
  export function buildManifest(x: ManifestInputs): GenerationManifest
  export function serializeManifest(m: GenerationManifest): string
  export function parseManifest(json: string): GenerationManifest
  /** Every input hash that disagrees with the files on disk. Empty means the manifest is live. */
  export function staleManifestInputs(m: GenerationManifest, current: ManifestInputs): readonly string[]

  export interface SchematicMeasures {
    readonly bends: number
    readonly bendsPerEdge: number
    readonly crossings: number        // between DIFFERENT nets only
    readonly wireLength: number       // total, in grid steps
    readonly occupiedArea: number     // sheet extent actually used, in square grid steps
  }
  export function measuresOf(l: BlockLayout, pins: readonly PlacedPin[]): SchematicMeasures
  export function sheetMeasuresOf(d: SheetDrawing): SchematicMeasures
  export function renderMeasures(m: SchematicMeasures): string      // four numbers side by side; NO composite

  export interface ReadabilityBaseline {
    readonly id: string
    readonly circuit: string
    readonly block: BlockId
    /** §3.3: scoped to the SAME serialized layout input the manifest hashes. */
    readonly layoutInputSha256: string
    readonly measures: SchematicMeasures
    readonly why: string
    readonly grantedBy: "owner"
    readonly grantedOn: string
    readonly ownerWords: readonly string[]      // one utterance per element, verbatim
    readonly doesNotExcuse: readonly string[]
    readonly consultedBy: readonly string[]
    readonly note: string
  }
  export type BaselineLookup =
    | { readonly kind: "found"; readonly entry: ReadabilityBaseline }
    | { readonly kind: "stale"; readonly entry: ReadabilityBaseline; readonly was: string }
    | { readonly kind: "absent" }
  export function parseBaselines(json: string, file: string): readonly ReadabilityBaseline[]
  export function baselineFor(bs: readonly ReadabilityBaseline[], block: BlockId, hash: string): BaselineLookup
  export function compareMeasures(b: ReadabilityBaseline, m: SchematicMeasures): readonly string[]

  export type FindingSeverity = "blocking" | "suggestion"
  export type FindingClass = "electrical-error" | "readability-problem"
  export interface ReadabilityFinding {
    readonly where: string            // the affected sheet or region
    readonly misreading: string       // stated AS the misreading, not as "this is unclear"
    readonly classification: FindingClass
    readonly evidence: string         // the render, the crop, the coordinates
    readonly severity: FindingSeverity
  }
  export function parseFindings(json: string, file: string): readonly ReadabilityFinding[]
  ```

**The manifest exists because four link checks that each pass prove nothing jointly unless they ran over the same derivation** (spec §2.1), and nothing said they did. **CRITERION: a gate that reports a pass names the manifest it passed against, and a manifest whose input hashes do not match the files on disk fails rather than regenerating silently.**

**It hashes the serialized layout input, not the network's content** (§2.1, revision 2, G95). Measured: three shuffles of one netlist — same components, same nets, same partition — give three distinct drawings out of three, moving crossings up to 2.1× at block scale and 3× flat. *"A hash over the section `Network`'s CONTENT would not detect the change that moved the drawing. A manifest built that way would certify two different drawings under one input hash, which is exactly the failure the manifest exists to prevent."*

**This is not a new discipline here, which is the argument for it:** the parent's `run.json` records hashes of the source board, the intent, the rules, the policy and the engine commit, and *"`adopt` refuses a run whose result hash has changed"*; `stripboard/render-approvals.json` scopes an owner approval to a `candidateSha256` *"for exactly this reason — an approval of a render is an approval of those bytes."* **The schematic side had no equivalent.**

**Measurement and acceptance are separate things, and nothing here invents a number.** *"No published source anywhere states an acceptable number of wire crossings, bends or wire length"* — not IEC 61082-1, not ANSI Y14.15 (*"as few as possible"*), and the research literature is weaker rather than stronger. **NO COMPOSITE SCORE AT THIS STAGE**: AEM's shape is *"a composite whose four sub-terms are unpublished"*, and adopting it *"would produce a number that looks cited, trades the four measures against each other at weights nobody chose, and answers 'crossings down, length doubled' by hiding the trade rather than showing it."* **Four numbers reported side by side show it.** `renderMeasures` reports bends first, then crossings — the order the literature puts them in, and consistent with the one user study in evidence, which attributes the harm to right-angle bends and finds **no correlation between crossing count and task performance at all**, while declaring its own sample too small to be conclusive. **That orders the report; it does not weight a score, because there is no score.**

Acceptance, per §3.3's table: **a known fixture** compares each measure against a reviewed, versioned baseline held outside the generator; **a circuit generated for the first time reports the measures with no pass or fail**, because *"a first generation has nothing to regress against, and inventing a verdict for it is inventing a threshold."*

**The baseline channel already exists and is not invented here.** `stripboard/render-approvals.json` holds **five** approvals — one per Pultec section board — with **twelve** declared fields each and **six** `ownerWords` utterances across them. Three of its properties are what a readability baseline needs: it is **scoped to bytes**, so *"the owner approved this board"* cannot silently cover a later different board; it **carries his words verbatim, one utterance per list element**, because *"a single string would have made an agent's concatenation of them the record"*; and **a producing agent cannot silently replace it** — `tools/stripboard/approvals-read.ts` refuses a record with no quote, a quote in the narrator's voice, and a quote that is the entry's own reasoning in quotation marks. **Its stated limit is recorded rather than papered over**: *"no file can prove the owner said anything"*, residual at G27.

**The mechanism is this spec's and the plan answers the implementation question.** §3.3 leaves open whether to add a `subjectKind` discriminator, build a new registry, or share a loader. **Decided: a new registry at `schematic/readability-baselines.json`, with a shared loader.** The twelve-field shape carries over with **one departure the spec predicted**: *"an approval admits one termination, whereas a baseline carries four measured numbers"*, so `admits` is replaced by `measures`. `schematic/readability-baselines.json` ships with **`"baselines": []`** and an `ownerWords`-shaped schema — **an empty registry that refuses loudly beats a general rule that quietly accepts a guess**, and **no agent may add an entry**: `grantedBy` is `"owner"` and the loader refuses anything else.

**And the block-scale refinement, which decides whether a baseline is worth holding at all.** `[RAN]` G95: order-instability is **absent below about 9 cells and present from 13 up**. *"A baseline over blocks small enough that the measure does not move under reordering is a baseline about the circuit. Over large blocks it is a baseline about a serialization"* — legitimate and much weaker — *"and a gate citing one must not be read as the former."* So `compareMeasures` reports which of the two it is, and **D1**'s per-block window report prints beside it.

**The readability finding contract** (§3.5): **a reviewing agent is handed the CRITERION and never the list.** Measured: the source project's reviewer had its defect categories pre-named and **five of twenty findings map onto the hint list one-to-one** (G83). The **form** of a finding is specified while its **content** is not — which is the distinction that keeps this from reintroducing the hint list. `ReadabilityFinding`'s five fields are exactly §3.5's five rows, and `misreading` is stated *as* the misreading: not *"this is unclear"* but *"a reader would take this wire as joining C3 to the coil return."* **AND THE REVIEWER MAY NOT SILENTLY MODIFY THE ACCEPTANCE CRITERIA**: a recurring new failure mode is a **proposed addition** to the standing rule library, subject to independent review, never automatically accepted. `parseFindings` refuses a finding carrying a criterion of its own.

- [ ] **Step 1: Write the failing manifest test:**
```ts
test("the manifest hashes the serialized layout input, not the network", () => {
  const a = buildManifest(inputsFor(circuit, shuffleOne))
  const b = buildManifest(inputsFor(circuit, shuffleTwo))
  expect(a.sectionNetworkSha256).toBe(b.sectionNetworkSha256)       // the same circuit
  expect(a.layoutInputSha256).not.toEqual(b.layoutInputSha256)      // a different drawing
})
test("a manifest whose input hashes moved is stale, and does not regenerate", () => {
  expect(staleManifestInputs(manifestOf(circuit), inputsFor(circuit, shuffleTwo)).length).toBeGreaterThan(0)
})
```
  **The first test is G95 turned into a check that could fail, and it is the reason this task exists.**
- [ ] **Step 2: Write the failing measures test** — a four-bend route measures four bends; two same-net wires crossing are **not** a crossing; two different-net wires crossing are one; wire length is in whole grid steps. And `renderMeasures` emits exactly four numbers and **no fifth**:
```ts
test("the report has four numbers and no composite", () => {
  expect(renderMeasures(m).match(/\d+(\.\d+)?/g)?.length).toBe(5)   // bends, bends/edge, crossings, length, area
  expect(renderMeasures(m).toLowerCase()).not.toContain("score")
})
```
- [ ] **Step 3: Write the failing baseline test** — an entry whose `layoutInputSha256` has moved is **`"stale"`, not a pass**; an entry with `grantedBy` other than `"owner"` is refused; an entry with no `ownerWords` is refused; a quote in the narrator's voice is refused. **Reuse `tools/stripboard/approvals-read.ts`'s three refusals rather than writing a fourth reader of the same shape**, and if they cannot be reused, say why in the report.
- [ ] **Step 4: Run all three groups.** Expected: fail.
- [ ] **Step 5: Write the three modules and the empty registry.** `generatedFiles` adds `MANIFEST.json`; `verify.ts`'s every `GateResult` names the manifest it passed against; a gate that cannot find a live manifest reports that **loudly** and does not pass.
- [ ] **Step 6: Write `finding.ts`.** Its module comment says, in terms, that **nothing here says what the findings should be, how many there should be, or what categories they fall into** — the fields are the contract.
- [ ] **Step 7: Generate the four parity circuits and report the four measures per block**, with **D1**'s window line beside each: parts, port-glyph share of cells, and whether the block is above G101's ceiling, below its floor, or inside the window, with the cost named. **No verdict** — every one of these is a first generation.
- [ ] **Step 8: Perturb** — hash the network instead of the layout input; the first manifest test goes red. Add a fifth composite number to `renderMeasures`; the no-composite test goes red. Accept a baseline whose hash moved; the stale test goes red. Restore all three, report.
- [ ] **Step 9: Record in `docs/known-gaps.md`** the four measures per block as a measurement, the empty baseline registry and why no agent may populate it, and **the departure from the twelve-field shape (`admits` → `measures`)** that §3.3 predicted, with its criterion.
- [ ] **Step 10: `shasum`, `bun run check`, commit, push.**

---

### Task 17: The re-measurement with templates in the loop AND WITHOUT `netlistsvg`, and the block-size decision

> **The task's remit is wider than its original title said, and the reason is a
> finding this plan itself surfaced.** Both spikes drove ELK through
> `netlistsvg`; Task 12's backend does not. So **two separate contaminations are
> being cleared here, not one**:
>
> 1. **No template was in the loop** (spec §5.6) - the gap this task was written
>    for;
> 2. **A front end this generator will not use was in the loop** - port glyphs
>    were `netlistsvg`'s `inputExt` cells, the congruence formula
>    `6*len(id) + 5` was its font metrics, and `direction=DOWN` was its analog
>    skin's setting, none of them ELK's.
>
> **What this does NOT invalidate, and the distinction decides how much work
> this task is:** the crash (G94) was verified by running the pre-layout graph
> directly through two elkjs builds with `netlistsvg` out of the loop, and the
> paired control (G100) is a RATIO taken under identical conditions on both
> sides, so a skin that inflates crossings inflates both. **The comparisons
> survive; the absolute numbers do not.**
>
> So this task re-measures absolutes and re-derives the two bounds of spec §1.8
> - and **the floor must be treated as unmeasured rather than as 4**, because a
> backend that emits no port glyph may have no floor of that kind at all.

**Files:**
- Create: `docs/schematic/m1-remeasurement.md`
- Create: `tools/schgen/remeasure.ts`
- Modify: `docs/schematic/template-parity.md`
- Modify: `docs/known-gaps.md` — rewrite G95, G96, G97, G100, G101; delete G99 if Task 9 settled it
- Test: `tests/schgen/remeasure.test.ts`

**Interfaces**
- Consumes: Tasks 10, 12, 13, 15, 16 — the census, the backend, the adapter, the sheet packing and the measures.
- Produces:
  ```ts
  export interface Remeasurement {
    readonly block: BlockId
    readonly parts: number
    readonly ports: number
    readonly portGlyphShare: number
    readonly measures: SchematicMeasures
    readonly drawnBy: "template" | "elk"
    /** The spike's figure for this block, where it has one, and whether it reproduced. */
    readonly spike: { readonly measures: SchematicMeasures; readonly verdict: "reproduced" | "moved" } | null
  }
  export function remeasure(circuits: readonly ParityCircuit[]): Promise<readonly Remeasurement[]>
  export interface BlockSizeDecision {
    readonly ceiling: number
    readonly floor: number
    readonly costPaid: string
    readonly evidence: string
  }
  export const BLOCK_SIZE: BlockSizeDecision
  ```

**§5.6 is the largest open assumption in the evidence, and it is stated as a reason M1 exists.** *"Seam A sends ELK the subgraph that is left over AFTER templates have drawn its neighbours. Both spikes measured a block in isolation: its own canvas, no neighbourhood, no template-produced geometry anywhere on the sheet, every port a free cell ELK could place where it liked. Those are different problems, and nothing measured so far says by how much."*

Three things that leaves uncertain, concretely:

- **a block's ports are fixed in seam A and were free in both spikes.** §7 of the block spike measured ELK putting interface ports in the interior: `input` at 0.02 and `hi_boost_out` at 0.06 of canvas width on `pultec-hi-boost`, adjacent at the far left. *"In seam A a neighbouring template has already decided where that net arrives, so both the measured defect and the measured boundary cost may move."*
- **§1.8's two bounds are bounds on an isolated block.** The ceiling is about crossings and order-sensitivity within the subgraph; **the floor is about port glyphs that a real neighbourhood may not emit at all** — and Task 12 does not emit `netlistsvg`'s `inputExt` cells, so the floor's whole basis may be gone.
- **§3.4's congruence held for two blocks drawn alone and broke when one gained a rail glyph.** *"A template in the loop is a much larger perturbation than a rail glyph."*

***"THIS GAP CANNOT BE CLOSED BEFORE M1, AND THAT IS A REASON M1 EXISTS RATHER THAN A DEFECT IN THE PLAN. ... The spikes measured what could be measured without the port, and the thing they could not measure is the port."*** **CRITERION: the measurements in §1.1, §1.8, §3.3 and §3.4 are RE-TAKEN at M1 with templates in the loop, and each is reported as either reproduced or moved. They are the before-measurement and nothing else.** **MECHANISM, untested:** the same 18 declared blocks, enumerated in the block spike's §1, re-run through the ported pipeline. **If a block no longer exists as declared, or a figure cannot be compared, record it rather than substituting a nearby block.**

**The block-size decision** (**D1**, spec §1.8). **CRITERION: a block-size decision names both bounds and says which cost it is paying.** `BLOCK_SIZE` is written **after** the re-measurement and carries both bounds as measured here, not as relayed. Its `costPaid` says which: above the ceiling, the measured quality is not a property of the circuit, so §3.3's baseline is measuring a serialization; below the floor, most of the drawing is interface glyphs and §1.6's cross-sheet mechanism inherits the cost. **The window comes from 18 blocks out of two unusual parents — a 76-part passive EQ and a 37-part compressor with two dual op-amps — the repository declares no block above 28 parts, and nothing above that was tested at all.** That caveat travels with the figure, here and in the register.

**What `BLOCK_SIZE` does and does not do.** It is **a reporting bound, not a refusal**: `remeasure`'s report says which declared blocks sit outside it, and the generator still draws them. **D1** is why: the generator never cuts a block, so a numeric bound that refused one would refuse a declaration.

- [ ] **Step 1: Re-run the parity census (Task 10) with the ELK backend live.** Report the difference from Task 10's reading: blocks that moved from `elk` to `realised`, blocks that moved to `refused`, and the mismatch kind of each new refusal.
- [ ] **Step 2: Write `remeasure.ts` and its test** — a block with a spike figure reports `reproduced` or `moved`; a block with none reports `null` and is **not** silently compared against a nearby block.
- [ ] **Step 3: Re-take §1.1's figures.** Per block: inter-net crossings, bends per edge, worst aspect, wire length. **Compare against the block spike's §3 table block by block** and say, per row, reproduced or moved. The paired control especially: `optical-compressor` whole gave 293 crossings / 3.18 bends per edge / 4.05:1 / 159,967 wire length, and as its three declared blocks gave 48 / 2.70 / 3.11:1 / 35,070. **Report the mechanism too** — the blocks carried 96 edges against the whole's 139, and *"a 6.1x crossing reduction with no stated mechanism is a number somebody will later explain away."*
- [ ] **Step 4: Re-take §1.8's two bounds.** Crossings against part count, and order-invariance under four declaration orders at 3, 4, 8, 9, 13, 17 and 28 cells. **And measure the port-glyph share with no `netlistsvg` skin**, which is the floor's whole basis.
- [ ] **Step 5: Re-take §3.4's congruence**, on the four structurally identical bias legs, **with the rail glyphs the two instances would actually get** — spec §3.4's criterion, because *"what broke it here was the glyph, not the topology, and a check run without them would pass and mean nothing."* Report whether `6 * len(id) + 5` still predicts the x difference; it was the skin's 10px monospace and should not.
- [ ] **Step 6: Re-take §3.3's disjointness at sheet level**, over Task 15's packing: frame-box overlap and non-member containment. Flat scale answered no (67% of canvas, 11 non-members inside the group's box).
- [ ] **Step 7: Write `docs/schematic/m1-remeasurement.md`** with every figure side by side — spike, M1, verdict — and a section stating what could not be compared and why.
- [ ] **Step 8: Write `BLOCK_SIZE`** with both bounds as measured here, the cost named, and the caveat. **If the re-measurement moved a bound, the deviation from D1's premise is recorded with its reasoning**, per `CLAUDE.md`'s criterion-versus-mechanism rule.
- [ ] **Step 9: Perturb** — make `remeasure` compare a block against the wrong spike row; the test goes red naming both blocks. Restore, report.
- [ ] **Step 10: Rewrite G95, G96, G97, G100 and G101** against the M1 figures, each entry saying plainly whether the writer **confirmed** the number or is **relaying** the spike's. **Delete G99 only if Task 9 settled every part of it** — and *"check what the deletion takes with it"*: G99 carries an open question about port direction, which must survive somewhere if it is still open.
- [ ] **Step 11: `shasum`, `bun run check`, commit, push.**

---

### Task 18: Supersede means delete

**Files:**
- Delete: `lib/kicad/schematic.ts`, `tools/cli/schematic-stub.ts`, `tests/kicad/schematic.test.ts`
- Modify: `tests/circuits/kicad-round-trip.ts` and the five `tests/circuits/transistor-preamp-*.test.ts`
- Modify: `package.json` (drop the `schematic-stub` script), `README.md`, `CLAUDE.md`
- Modify: `lib/kicad/symbol-library.ts` (its comments cite the deleted writer)
- Modify: `docs/known-gaps.md` — delete G81

**Interfaces**
- Consumes: Tasks 11 and 16 — the round trip and the manifest, which are what the five transistor-preamp tests move onto.
- Produces: nothing new. **This task removes.**

**The instruction, verbatim.** Parent, under **Schematic generation**: *"This supersedes `lib/kicad/schematic.ts` (203 lines) and absorbs `lib/kicad/sexpr.ts` (96 lines). Per **supersede means delete**, the stub writer is removed in the same change that replaces it, and `README.md`'s `schematic-stub` instructions go with it."* `CLAUDE.md`: *"A pattern replaced by a better one is removed in the same change, not left as a stub for somebody to find and trust."*

**And G81 is why it is not merely redundant.** The register records that `lib/kicad/schematic.ts` *"emits the exact pathology another project was blocked from shipping, and the review that blocked it cites THIS repository as where the pathology was first seen."* Every pin carried by a short wire to a net label; connectivity entirely in labels; `newUuid: () => string` handed `randomUUID`, so the output cannot be compared by content. Task 3's `uuidV5` is the opposite of that last property and Task 8's **D3** deletes the rendering that draws that way.

**The blocking dependency, and it is why this task is last.** `writeSchematicStub` has six live consumers: `tools/cli/schematic-stub.ts`, `tests/kicad/schematic.test.ts`, `tests/circuits/kicad-round-trip.ts`, and through it the five `transistor-preamp-*.test.ts` files. **Those five are among this repository's only real `kicad-cli` tests** — *"the only proof KiCad reads a stub the way the circuit means it, so a missing `kicad-cli` FAILS them rather than skipping."* They cannot simply be deleted with the writer: **they must move onto the generator**, and `kicadRoundTrip(board, stem)` becomes a call into Task 6's `generate` plus Task 11's `roundTrip`. **`lib/kicad/sexpr.ts` is NOT deleted** — Task 1 replaced its reader in place and three unrelated modules still import the shims; the parent's word for it is *absorbs*, not *deletes*, and Task 1 is where that happened.

- [ ] **Step 1: Record the five transistor-preamp tests' current output** — names and counts — before touching anything. That list is what must still pass at the end.
- [ ] **Step 2: Write the five circuits' authoring files** if Task 9 did not already cover all five boards (`lab`, `buffered`, `feedback`, `loop`, `staged`). Report which were missing.
- [ ] **Step 3: Rewrite `tests/circuits/kicad-round-trip.ts`** so `kicadRoundTrip` generates through `generate` and compares through `roundTrip`'s five-part contract. **Keep the fail-rather-than-skip refusal and its message**: it is the convention, and a `kicad-cli` test that skips is the failure mode this repository exists to prevent.
- [ ] **Step 4: Run the five tests.** Every name from Step 1 must still be there and still pass. **A test that needs editing to survive the move is a finding: report it rather than editing it** — a test that only passed against the stub was not testing what its name said.
- [ ] **Step 5: Delete `lib/kicad/schematic.ts`, `tools/cli/schematic-stub.ts` and `tests/kicad/schematic.test.ts`.** Drop the `schematic-stub` script. Typecheck: every remaining reference must be gone.
- [ ] **Step 6: Fix the prose.** `README.md:29` (*"`lib/kicad/schematic.ts` writes a `.kicad_sch` from a model, though today only as a stub"*) and `README.md:210` (the `schematic-stub` instructions) — rewrite both to describe `bun run schgen`. `CLAUDE.md:72` (*"`lib/kicad/schematic.ts` still emits a stub — a correct netlist with a useless arrangement"*) — **it also says *"expect it to stop being true as the schematic-generation port lands"*, so this is the change that makes it false.** `lib/kicad/symbol-library.ts`'s comments cite the deleted writer at lines 5, 149 and 174.
- [ ] **Step 7: Run the whole suite and `bun run typecheck`.** Report the count against Task 1's baseline. Run `make -C boards/<board> check` for all five Pultec boards.
- [ ] **Step 8: Generate a transistor-preamp board through `schgen` and LOOK AT IT.** PDF, convert, **read with the Read tool**, and compare it against the committed hand-arranged `lab-board.kicad_sch` printed the same way. Say which is more readable and where the generator is worse. **That comparison is the honest closing measurement of M1** and it is an observation, not an acceptance: §3.3 gives no threshold and §3.5's reviewer gets the criterion, never the list.
- [ ] **Step 9: Delete G81** — and **check what the deletion takes with it.** One earlier deletion in this register removed an open owner question that survived only in a gitignored report; read G81 in full before deleting and carry anything still open into a new entry.
- [ ] **Step 10: `shasum` the ten files, commit, push.**

---

## Self-review before committing the plan

### Spec coverage — every M1 obligation, and the task that implements it

| Spec | Obligation | Task |
| --- | --- | --- |
| §1 | Port the IR and its validator | 2 |
| §1 | Port the s-expression writer | 3 |
| §1 | Port the symbol-library loader that flattens `extends` | 4 |
| §1 | Port the geometry layer on the 1.27 mm grid | 3 |
| §1 | Port deterministic UUIDs (v5 from stable keys, byte-stable output) | 3 |
| §1 | Port the append-only reference lock | 6 |
| §1 | Port the wire-safety refusals | 5 |
| §1 | Port the seven templates | 7 |
| §1 | Port the ~160 clearance refusals | 5 |
| §1 | Port the gates | 11 |
| §1 | Delete `lib/kicad/schematic.ts`; absorb `lib/kicad/sexpr.ts` | 18; 1 |
| §1.2 | Every symbol declares which side each pin leaves from; ports FIXED | 9; 12 |
| §1.3 | A three-valued selection; only `not-applicable` selects ELK | 8 |
| §1.3 rev 2 | Five outcomes; all 30 `mismatch(…)` sites say which kind | 8 |
| §1.4 obl. 1 | Snapping checked for identity collapse, not assumed | 13 |
| §1.4 obl. 2 | Every branch point carries an emitted junction | 13 |
| §1.4 obl. 3 | Port positions recomputed through one transform, never carried | 13 |
| §1.4 obl. 4 | The same obstacle matrix grades both geometry sources | 5; 13 |
| §1.4 obl. 5 | Snapping that invalidates a route refuses; no repair pass | 13 |
| §1.4 | Clearance checks RE-VALIDATED via an up-front obstacle-category matrix | 5; 13 Step 6 |
| §1.5 | Orientation authority: template, then rule, then backend | 9; 13 |
| §1.5 | The four-link mapping verified end to end | 13 |
| §1.6 | Blocks, sheets and section boards distinguished | 9; 15 |
| §1.6 | Exactly one cross-sheet mechanism; a net using two refuses | 15 (**D5**) |
| §1.6 | One-sheet vs multi-sheet net membership, three cases | 15 |
| §1.7 | One visual language; the flow direction pinned | **D4**; 12; 15 |
| §1.8 | A block-size decision naming both bounds and the cost paid | **D1**; 16 Step 7; 17 |
| §2 | The round trip's complete five-part contract | 11 |
| §2 | The round trip is not a readability gate and is not reported as one | 11 |
| §2.1 | A generation manifest tying the link checks to one derivation | 16 |
| §2.1 rev 2 | The manifest hashes the serialized layout input | 12; 16 |
| §3.1 | Readable by construction — templates | 7 |
| §3.2 | Specific misreadings refused — clearance | 5 |
| §3.3 | Four measures, reported independently, no composite | 16 |
| §3.3 | A baseline held outside the generator, scoped to the input's bytes | 16 |
| §3.3 | A first generation reports measures with no verdict | 16 Step 7 |
| §3.4 | Congruence measured with the rail glyphs the instances get | 17 Step 5 |
| §3.4 | Disjointness measured against whatever composes blocks onto a sheet | 15; 17 Step 6 |
| §3.5 | A readability finding's required form; content unprescribed | 16 |
| §3.5 | A reviewer may not silently modify the criteria | 16 Step 6 |
| §5.1 | Existing-template parity: run them and count | 10; 17 Step 1 |
| §5.4 | Is a passive's symbol per part or per kind | 9 (per kind, with a reasoned override) |
| §5.6 | §1.1, §1.8, §3.3, §3.4 re-taken with templates in the loop | 17 |
| G94 | A defined outcome when the backend raises | 14 |
| G99 | No backend input invented at the call site | 9 |
| G85 | An up-front obstacle-category matrix | 5 |

**Spec obligations deliberately not covered, each with its reason stated in the plan:** gate 8 / `gates/oscar/` (**What is NOT in this plan**, recorded in `docs/known-gaps.md` by Task 11 Step 9 against a parent instruction that says it ports); §5.2's flow direction and cross-sheet mechanism, which the spec leaves open and **D4**/**D5** close with their reasoning recorded for dispute; §5.5's five new templates and three constructs, which are M2.

### Placeholder scan

Searched the document for `TBD`, `TODO`, `appropriate`, `similar to Task`, `as needed`, `etc.`, `and so on`, `handle errors`, `like above`. **No occurrence.** Every signature in an **Interfaces** block was read in `/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen` or is defined in full in the task that produces it. Every numeric claim — 30 mismatch sites, 14 obstacle categories, 105 pairs, 9 of 32 and 45 of 256 orientation failures, 293→48 crossings, 96 against 139 edges, five approvals with twelve fields and six utterances, the ceiling near 9 and floor near 4 — was read in the spec, the register or the spike documents and is attributed where it appears.

### Type consistency across tasks

- `RealiseResult` is **two-valued through Task 7 and five-outcome from Task 8**. No task between them assumes the widened shape, and every task after it — 10, 12, 13, 14 — consumes `Mismatch`. Task 10's census test asserts the widened kinds, which is **D6**'s third reason.
- `Backend` (Task 8) is what `elkBackendFrom` (Task 12) returns and what `realiseBlock` takes. One interface, two implementations, no second shape.
- `BlockLayout` is unchanged by every task: `{ placements, wires, anchors }` as the port defines it. Task 13's adapter produces exactly it, which is spec §5.3's point — *"every template-shaped consumer downstream takes `BlockLayout` and does not care which produced it."*
- The `serialized` string is produced once, by `serializeElkInput` (Task 12), and consumed by `ElkOutcome`, `RaiseDiagnosis.inputKey`, `GenerationManifest.layoutInputSha256` and `ReadabilityBaseline.layoutInputSha256`. **One set of bytes, four consumers, no second serialization** — which is what makes the manifest and the baseline name the same thing.
- `SchematicMeasures` is defined once (Task 16) and consumed by `ReadabilityBaseline` and `Remeasurement`.
- `SymbolResolver` is forward-declared as a type in Task 2 and implemented in Task 4 at the same path; nothing in between calls `resolve`.
- `generate` is synchronous through Task 11 and `async` from Task 12. Task 12 Step 7 names every caller it updates.
- `Rendering` loses `labels` and gains `auto` in Task 8, and Tasks 9, 10 and 15 are written against the post-Task-8 shape.
