/**
 * **WHAT ELK DOES WITH A LABEL, DRIVEN AGAINST THE GRAPHS THIS REPOSITORY ALREADY BUILDS.**
 *
 *   bun run tools/schgen/elk-labels/probe.ts
 *
 * Research probe for Task 2 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` or any check calls it, and it changes no production code.** Every figure §2 of
 * `docs/schematic/text-handling-research.md` publishes comes from one run of this file, and that run
 * is committed beside it as `probe-run.log`.
 *
 * **IT PINS ITS INPUT** (controller ruling R4). Two things can move under a figure here: the tree
 * and the layout engine. So it prints the commit it measured and whether the tree was dirty, and it
 * **refuses an `elkjs` bundle whose SHA-256 is not the pinned one** - an option vocabulary taken
 * from a different build of ELK is a different vocabulary, and every count below would silently be
 * about something else. **That refusal has already earned itself**: a scratch copy of this probe
 * kept outside the repository resolved `elkjs` through Bun's auto-install cache to **0.12.0**, not
 * `package.json`'s pinned 0.9.3, and reported a different option count under the same import.
 *
 * Unlike Task 1's probe this one needs **no external download and no installed application**:
 * `bun run` on a clean checkout re-drives every number in §2.
 *
 * **IT IS AN EXPERIMENT AND NOT AN INVENTORY**, because a third-party review of the plan
 * (2026-10-22) drew that distinction and it was accepted: *"an ELK option inventory is not a
 * capability demonstration"*. STEP 1 asks `elkjs` what label options exist, which is metadata; STEPS
 * 3 and 5 hand ELK the same real graph nine ways and measure what comes back, which is behaviour. §2
 * marks the two differently because Task 7 ranks them differently.
 *
 * **IT DESIGNS NOTHING AND RECOMMENDS NOTHING.** Whether a label ELK placed is acceptably placed is
 * an acceptance criterion for the artifact this generator produces, and `CLAUDE.md` reserves those
 * to the owner.
 */

import { spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import ELK from "elkjs/lib/elk-api.js"
import { BLOCK_OPTIONS, NODE_OPTIONS } from "../../../lib/schgen/elk/options.ts"
import { serializeElkInput } from "../../../lib/schgen/elk/serialize.ts"
import { moduleRepoRoot } from "../../perfboard/repo-root.ts"
import { ARMS, runArm, sum, type ArmResult } from "./arms.ts"
import { blockGraphs, labelFor, LINE_HEIGHT, LINE_HEIGHTS } from "./corpus.ts"
import type { ElkNode, LayoutOptions } from "elkjs/lib/elk-api.js"

/**
 * The `elkjs` build every figure here was taken against.
 *
 * **It refuses rather than warns.** `docs/known-gaps.md` **G187** records that `elkjs` ignores an
 * option id it does not recognise with no raise and no warning, so an inventory taken from another
 * build would differ silently in exactly the dimension this probe measures.
 */
const ELKJS_VERSION = "0.9.3"
const ELK_WORKER_SHA256 = "114c4f17aea4b297a2d3dd6c86bdfccb45e12040da964ea8f9766345fce4f538"

const um = (v: number): string => v.toFixed(1)

function head(title: string): void {
  console.log("")
  console.log(`== ${title}`)
}

function pinned(repoRoot: string): string {
  const workerPath = path.join(repoRoot, "node_modules/elkjs/lib/elk-worker.min.js")
  const workerSha = crypto.createHash("sha256").update(fs.readFileSync(workerPath)).digest("hex")
  const installed = JSON.parse(fs.readFileSync(path.join(repoRoot, "node_modules/elkjs/package.json"), "utf8")) as { version?: unknown }
  if (installed.version !== ELKJS_VERSION || workerSha !== ELK_WORKER_SHA256) {
    throw new Error(
      `this probe is pinned to elkjs ${ELKJS_VERSION} with elk-worker.min.js at SHA-256 ` +
        `${ELK_WORKER_SHA256}, and the installed bundle is version ${String(installed.version)} at ` +
        `${workerSha}. Every count in STEP 1 and every coordinate in STEP 5 is a property of ONE ` +
        "build of ELK, so it refuses rather than reporting an inventory of something else under the " +
        "pinned version's name (controller ruling R4). Re-pin both constants here in the same change " +
        "that re-takes the figures in docs/schematic/text-handling-research.md section 2.",
    )
  }
  return workerSha
}

async function main(): Promise<void> {
  const repoRoot = moduleRepoRoot()

  // **THE SECTION NAMES OF THIS LOG MUST NOT COLLIDE WITH TASK 1's, AND THIS ONE DID.**
  // `tools/schgen/text-metrics/verify-pastes.ts` fails the research document when a block NOT
  // declared as §1's probe output shares ANY line with §1's log - that is the relabel dodge it was
  // built to close. §2's pasted blocks are necessarily not §1's output, so the first version of
  // this header, "WHAT THIS RUN MEASURED", turned the document red by naming §1's own first section
  // header. It is renamed rather than trimmed out of §2's paste: trimming the evidence to satisfy a
  // checker is the failure that checker exists to catch. A later probe adding a section to any log
  // this document quotes must keep its names distinct for the same reason.
  head("WHAT THIS ELK LABEL RUN MEASURED")
  const sha = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim()
  const dirty = spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], { encoding: "utf8" }).stdout.trim()
  console.log(`repository commit: ${sha}${dirty === "" ? " (clean tree)" : ` (DIRTY TREE, ${dirty.split("\n").length} path(s))`}`)
  console.log(`elkjs ${ELKJS_VERSION}; elk-worker.min.js pinned at SHA-256 ${pinned(repoRoot)}`)
  // **WHICH INSTALL OF `elkjs` THE WORKER CAME FROM, PRINTED RATHER THAN ASSUMED.**
  // `import.meta.resolve` is relative to THIS file, so a copy of this probe kept outside the
  // repository resolves `elkjs` through Bun's auto-install cache instead of `package.json`'s pin -
  // a different version of ELK, with a different option vocabulary, under the same import.
  console.log(`elkjs resolved from: ${import.meta.resolve("elkjs/package.json")}`)

  const elk = new ELK({
    workerUrl: import.meta.resolve("elkjs/lib/elk-worker.min.js"),
    workerFactory: (url?: string) => new Worker(url ?? import.meta.resolve("elkjs/lib/elk-worker.min.js")),
  })

  try {
    const known = await elk.knownLayoutOptions()
    const algorithms = await elk.knownLayoutAlgorithms()
    const layered = algorithms.find((a) => a.id === "org.eclipse.elk.layered")
    if (layered === undefined) throw new Error("elkjs reports no org.eclipse.elk.layered algorithm, and BLOCK_OPTIONS names it")
    const layeredOptions = new Set(layered.knownOptions ?? [])
    console.log(`knownLayoutOptions(): ${known.length} ids; knownLayoutAlgorithms(): ${algorithms.length}; layered knownOptions: ${layeredOptions.size}`)
    console.log(`layered supportedFeatures: ${(layered.supportedFeatures ?? []).join(", ")}`)

    head("STEP 1: EVERY LABEL-RELATED OPTION elkjs EXPOSES")
    const byId = new Map(known.flatMap((o) => (o.id === undefined ? [] : [[o.id, o] as const])))
    const idLabel = known.flatMap((o) => (/label/i.test(o.id ?? "") ? [o] : []))
    console.log(`option ids containing "label": ${idLabel.length} of ${known.length}`)
    for (const o of idLabel) {
      console.log(
        `  ${(o.id ?? "").padEnd(62)} ${(o.type ?? "").padEnd(8)} targets=${(o.targets ?? []).join("|").padEnd(12)} ` +
          `${layeredOptions.has(o.id ?? "") ? "layered supports it" : "layered DOES NOT list it"}`,
      )
    }
    const named = known.flatMap((o) => (!/label/i.test(o.id ?? "") && /label/i.test(`${o.name ?? ""} ${o.description ?? ""}`) ? [o] : []))
    console.log(`options whose id does NOT say label but whose name or description does: ${named.length}`)
    for (const o of named) console.log(`  ${(o.id ?? "").padEnd(62)} ${(o.type ?? "").padEnd(8)} targets=${(o.targets ?? []).join("|").padEnd(12)} ${o.name ?? ""}`)
    for (const id of ["org.eclipse.elk.spacing.labelLabel", "org.eclipse.elk.nodeLabels.placement", "org.eclipse.elk.nodeSize.constraints"]) {
      console.log(`  ${id}: ${byId.get(id)?.description ?? "(no description)"}`)
    }
    // **A FIGURE THIS REPOSITORY ALREADY PUBLISHES ABOUT THIS VOCABULARY, RE-DRIVEN.**
    // `tests/schgen/elk/options.elk.test.ts` states a measured count in its own comment. It is read
    // out of the file rather than retyped, so a disagreement is REPORTED rather than inherited -
    // `docs/known-gaps.md` **G237** is a page of prose claims about drives that did not reproduce.
    const claimed = /all (\d+) ids/.exec(fs.readFileSync(path.join(repoRoot, "tests/schgen/elk/options.elk.test.ts"), "utf8"))
    if (claimed === null) {
      console.log('tests/schgen/elk/options.elk.test.ts no longer states a count in the form "all <n> ids", so there is nothing to compare')
    } else {
      const n = Number(claimed[1])
      console.log(
        `tests/schgen/elk/options.elk.test.ts says "all ${n} ids" begin org.eclipse.elk; this run counts ${known.length}, ` +
          `all ${known.filter((o) => (o.id ?? "").startsWith("org.eclipse.elk")).length} of them so prefixed. ` +
          (n === known.length ? "They AGREE." : `They DISAGREE by ${known.length - n} at the pinned elkjs ${ELKJS_VERSION} - the comment's figure does not reproduce.`),
      )
    }

    head("STEP 2: WHICH OF THEM THIS REPOSITORY SETS")
    const elkDir = path.join(repoRoot, "lib/schgen/elk")
    const sources = fs.readdirSync(elkDir).filter((f) => f.endsWith(".ts")).sort()
    const text = sources.map((f) => fs.readFileSync(path.join(elkDir, f), "utf8")).join("\n")
    console.log(`scanned ${sources.length} file(s) under lib/schgen/elk: ${sources.join(" ")}`)
    const emitted = new Set([...Object.keys(BLOCK_OPTIONS), ...Object.keys(NODE_OPTIONS), "elk.port.side", "elk.layered.layering.layerConstraint"])
    let setCount = 0
    for (const o of [...idLabel, ...named]) {
      const short = (o.id ?? "").replace(/^org\.eclipse\.elk\./, "elk.")
      const inSource = text.includes(short) || text.includes(o.id ?? "")
      const inEmitted = emitted.has(short)
      if (inSource || inEmitted) {
        setCount += 1
        console.log(`  SET OR MENTIONED: ${short} (in source: ${inSource}; in the emitted option set: ${inEmitted})`)
      }
    }
    console.log(`label-related options this repository sets: ${setCount} of ${idLabel.length + named.length}`)
    // **THE CONTROL.** The same scan over options the backend DOES set must find them, or an empty
    // result above would say nothing about labels and everything about the scan.
    for (const control of ["elk.spacing.nodeNode", "elk.spacing.nodeSelfLoop", "elk.portConstraints"]) {
      const found = text.includes(control) || emitted.has(control)
      console.log(`  CONTROL ${control}: found by the same scan = ${found}${found ? "" : " - THE SCAN IS BROKEN, not the finding"}`)
    }
    console.log(`the whole emitted option set (${emitted.size}): ${[...emitted].sort().join(" ")}`)

    head("STEP 3: WHAT layered DOES WITH A LABEL IT IS GIVEN - EACH OPTION DRIVEN AGAINST ITS ABSENCE")
    const blocks = blockGraphs(repoRoot)
    const probeBlock = blocks.find((b) => b.block === "pt-core") ?? blocks[0]
    if (probeBlock === undefined) throw new Error("no ELK block was built, so STEP 3 would compare two layouts of nothing")
    console.log(`on ${probeBlock.board}/${probeBlock.block}; label options layered lists: ${idLabel.filter((o) => layeredOptions.has(o.id ?? "")).length} of ${idLabel.length}`)
    console.log(`the ones it does not list: ${idLabel.filter((o) => !layeredOptions.has(o.id ?? "")).map((o) => o.id ?? "").join(", ") || "(none)"}`)
    // **AN OPTION'S DEFAULT IS DRIVEN HERE, NOT READ.** G187 records that elkjs ignores an option it
    // does not recognise in silence, so "setting it changes nothing" and "the default already does
    // it" are indistinguishable from the option alone. Each pair differs in exactly one option.
    const pairArm = async (what: string, decorate: (g: ElkNode, opts: LayoutOptions) => void, opts: LayoutOptions): Promise<void> => {
      const withIt = structuredClone(probeBlock.graph)
      const without = structuredClone(probeBlock.graph)
      decorate(withIt, opts)
      decorate(without, {})
      const a = await elk.layout(withIt)
      const b = await elk.layout(without)
      const coords = (g: ElkNode): string =>
        JSON.stringify((g.children ?? []).map((c) => [(c.labels ?? []).map((l) => [l.x, l.y]), (c.ports ?? []).map((p) => (p.labels ?? []).map((l) => [l.x, l.y]))]))
      console.log(
        `  ${what.padEnd(46)} with: ${um(a.width ?? 0)}x${um(a.height ?? 0)}  without: ${um(b.width ?? 0)}x${um(b.height ?? 0)}  ` +
          `geometry ${a.width === b.width && a.height === b.height ? "IDENTICAL" : "DIFFERS"}; label coordinates ${coords(a) === coords(b) ? "IDENTICAL" : "DIFFER"}`,
      )
    }
    await pairArm(
      "nodeLabels.placement [H_CENTER,V_TOP,OUTSIDE]",
      (g, opts) => {
        for (const c of g.children ?? []) {
          c.labels = [labelFor(c.id, probeBlock, LINE_HEIGHT, false)]
          c.layoutOptions = { ...c.layoutOptions, "elk.nodeSize.constraints": "[]", ...opts }
        }
      },
      { "elk.nodeLabels.placement": "[H_CENTER, V_TOP, OUTSIDE]" },
    )
    await pairArm(
      "portLabels.placement [OUTSIDE]",
      (g, opts) => {
        for (const c of g.children ?? []) {
          c.layoutOptions = { ...c.layoutOptions, "elk.nodeSize.constraints": "[]", ...opts }
          for (const p of c.ports ?? []) p.labels = [labelFor(p.id, probeBlock, LINE_HEIGHT, false)]
        }
      },
      { "elk.portLabels.placement": "[OUTSIDE]" },
    )
    await pairArm(
      "nodeSize.constraints [NODE_LABELS] vs [] (fixed)",
      (g, opts) => {
        for (const c of g.children ?? []) {
          c.labels = [labelFor(c.id, probeBlock, LINE_HEIGHT, false)]
          c.layoutOptions = { ...c.layoutOptions, "elk.nodeSize.constraints": "[]", "elk.nodeLabels.placement": "[H_CENTER, V_CENTER, INSIDE]", ...opts }
        }
      },
      { "elk.nodeSize.constraints": "[NODE_LABELS]" },
    )

    head("STEP 4: WHETHER THE GRAPH THIS REPOSITORY HANDS ELK CARRIES LABELS AT ALL")
    let nodes = 0
    let ports = 0
    let edges = 0
    let withLabels = 0
    let withOptions = 0
    for (const b of blocks) {
      for (const c of b.graph.children ?? []) {
        nodes += 1
        if ((c.labels ?? []).length > 0) withLabels += 1
        if (Object.keys(c.layoutOptions ?? {}).length > 0) withOptions += 1
        for (const p of c.ports ?? []) {
          ports += 1
          if ((p.labels ?? []).length > 0) withLabels += 1
        }
      }
      for (const e of b.graph.edges ?? []) {
        edges += 1
        if ((e.labels ?? []).length > 0) withLabels += 1
      }
    }
    console.log(`${blocks.length} ELK blocks over ${new Set(blocks.map((b) => b.board)).size} boards: ${nodes} nodes, ${ports} ports, ${edges} edges`)
    console.log(`elements carrying a non-empty labels array: ${withLabels}`)
    console.log(`CONTROL, so that zero is a finding and not a broken walk: nodes carrying a non-empty layoutOptions record: ${withOptions} of ${nodes}`)
    const sample = blocks[0]
    if (sample === undefined) throw new Error("no ELK block was built, so STEP 4 would report zero labels over zero graphs")
    console.log(`CONTROL, the serializer: an unlabelled graph serializes to ${serializeElkInput(sample.graph).length} bytes`)
    const labelled = structuredClone(sample.graph)
    const firstChild = (labelled.children ?? [])[0]
    if (firstChild === undefined) throw new Error(`block ${sample.block} has no children, so the serializer refusal cannot be driven`)
    firstChild.labels = [labelFor(firstChild.id, sample, LINE_HEIGHT, false)]
    try {
      serializeElkInput(labelled)
      console.log("CONTROL FAILED: serializeElkInput ACCEPTED a graph carrying an ELK label, and lib/schgen/elk/serialize.ts says it refuses one")
    } catch (e) {
      console.log(`CONTROL PASSED: serializeElkInput REFUSES a graph carrying an ELK label - ${(e instanceof Error ? e.message : String(e)).split(". ")[0]}`)
    }

    head("STEP 5: NINE ARMS OVER THE SAME GRAPHS, AT THE GetTextBox LINE HEIGHT")
    console.log(`line height ${um(LINE_HEIGHT)} um (RELAYED from section 1.4); label widths from lib/schgen/render/text-boxes.ts textWidth`)
    const results = new Map<string, readonly ArmResult[]>()
    for (const arm of ARMS) {
      const rows: ArmResult[] = []
      for (const b of blocks) rows.push(await runArm(elk, arm, b, LINE_HEIGHT))
      results.set(arm.name, rows)
    }
    const base = results.get(ARMS[0]!.name) ?? []
    console.log("arm                                     sent/back  unplaced  resized(worst um)  blocks moved  lbl-lbl  lbl-other-body  lbl-own-body  lbl-wire  on-grid")
    for (const arm of ARMS) {
      const rows = results.get(arm.name) ?? []
      let changed = 0
      rows.forEach((r, i) => {
        const b = base[i]
        if (b !== undefined && (r.width !== b.width || r.height !== b.height)) changed += 1
      })
      console.log(
        `  ${arm.name.padEnd(38)} ${String(sum(rows, (r) => r.labelsSent)).padStart(4)}/${String(sum(rows, (r) => r.labelsBack)).padEnd(4)} ` +
          `${String(sum(rows, (r) => r.unplaced)).padStart(8)}  ${String(sum(rows, (r) => r.resized)).padStart(7)} (${um(Math.max(0, ...rows.map((r) => r.worstResize)))})  ` +
          `${String(changed).padStart(8)}/${blocks.length}  ${String(sum(rows, (r) => r.labelLabelOverlaps)).padStart(7)}  ` +
          `${String(sum(rows, (r) => r.labelBodyOverlaps)).padStart(14)}  ${String(sum(rows, (r) => r.labelOwnBodyOverlaps)).padStart(12)}  ` +
          `${String(sum(rows, (r) => r.labelWireHits)).padStart(8)}  ${String(sum(rows, (r) => r.onGrid))}/${sum(rows, (r) => r.labelsBack - r.unplaced)}`,
      )
    }
    for (const arm of ARMS) console.log(`  ${arm.name}: ${arm.what}`)
    // **THE HAZARD ARMS b AND c OPEN, DRIVEN RATHER THAN ASSERTED** (controller ruling R13: hunt the
    // attack surface your own construction creates). Both arms get a node back at a size ELK chose.
    // `lib/schgen/elk/read-graph.ts` recovers a symbol's placement from `node.x`/`node.y` and the box
    // `elkInputOf` SENT; if the returned node is a different size, the symbol lands somewhere its
    // pins were not computed for. Whether anything compares the two is a greppable fact, and the
    // control is that the same grep finds the words where they ARE used.
    for (const f of ["lib/schgen/elk/read-graph.ts", "lib/schgen/elk/adapt.ts", "lib/schgen/elk/graph.ts"]) {
      const src = fs.readFileSync(path.join(repoRoot, f), "utf8")
      console.log(`  ${f.padEnd(34)} mentions "width" ${(src.match(/\bwidth\b/g) ?? []).length} time(s) and "height" ${(src.match(/\bheight\b/g) ?? []).length} time(s)`)
    }
    const raises = ARMS.flatMap((a) => (results.get(a.name) ?? []).flatMap((r, i) => (r.raised === "" ? [] : [`${a.name} on ${blocks[i]?.board}/${blocks[i]?.block}: ${r.raised}`])))
    console.log(`arms that raised: ${raises.length}${raises.length === 0 ? " - every arm laid out, so every row above is a layout and not a crash" : ""}`)
    for (const r of raises) console.log(`  ${r}`)

    head("STEP 5j: THE SAME EXPERIMENT AT ALL THREE OF SECTION 1's LINE HEIGHTS")
    console.log("Section 1 is forbidden from electing one quantity, so no conclusion here may depend on which is elected.")
    for (const h of LINE_HEIGHTS) {
      const line: string[] = []
      for (const arm of ARMS) {
        const rows: ArmResult[] = []
        for (const b of blocks) rows.push(await runArm(elk, arm, b, h.um))
        line.push(
          `${arm.name.slice(0, 1)}: unplaced ${sum(rows, (r) => r.unplaced)} lbl-lbl ${sum(rows, (r) => r.labelLabelOverlaps)} ` +
            `own-body ${sum(rows, (r) => r.labelOwnBodyOverlaps)} wire ${sum(rows, (r) => r.labelWireHits)} on-grid ${sum(rows, (r) => r.onGrid)}`,
        )
      }
      console.log(`  ${h.name.padEnd(22)} ${line.join("  |  ")}`)
    }

    head("STEP 5k: ONE BLOCK IN DETAIL, SO THE AGGREGATES ABOVE ARE READABLE")
    const detail = blocks.find((b) => b.block === "pt-core") ?? blocks[0]!
    console.log(`${detail.board}/${detail.block}: ${(detail.graph.children ?? []).length} nodes, ${(detail.graph.edges ?? []).length} edges`)
    for (const arm of ARMS) {
      const g = structuredClone(detail.graph)
      arm.decorate(g, detail, LINE_HEIGHT)
      const out = await elk.layout(g)
      const first = (out.children ?? [])[0]
      const boundary = (out.children ?? []).find((c) => c.id.startsWith("port:"))
      const l = first?.labels?.[0]
      const bl = boundary?.labels?.[0]
      console.log(
        `  ${arm.name.padEnd(38)} graph ${um(out.width ?? 0)} x ${um(out.height ?? 0)}; node ${first?.id} ${um(first?.width ?? 0)}x${um(first?.height ?? 0)} ` +
          `label ${l === undefined ? "(none)" : `"${l.text ?? ""}" ${um(l.width ?? 0)}x${um(l.height ?? 0)} at (${um(l.x ?? 0)}, ${um(l.y ?? 0)})`}; ` +
          `boundary ${boundary?.id} ${um(boundary?.width ?? 0)}x${um(boundary?.height ?? 0)} label ${bl === undefined ? "(none)" : `at (${um(bl.x ?? 0)}, ${um(bl.y ?? 0)})`}`,
      )
    }
  } finally {
    elk.terminateWorker()
  }
}

await main()
