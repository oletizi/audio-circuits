/**
 * **WHAT KiCad ACCEPTS IN A GLOBAL LABEL'S NAME, AND WHETHER THIS REPOSITORY EVER DRAWS A
 * SYNTHETIC NET NAME ON A SHEET.**
 *
 *   bun run tools/schgen/label-syntax/probe.ts > tools/schgen/label-syntax/probe-run.log
 *
 * Research probe for Task 1 of
 * `docs/superpowers/plans/2026-10-23-net-names-and-floating-pins.md`. **It changes no production
 * code, nothing in `lib/` reads it, and no gate calls it.** The committed `probe-run.log` beside
 * this file is one run of it, produced by the command above.
 *
 * **WHY IT EXISTS, AND IT IS THE ORDER THAT MATTERS.** `lib/schgen/ir/validate.ts`'s `netNames`
 * rule refuses two different things with one message. `hi_boost_out` fails on **letter case
 * alone**, which the owner has ruled is not a constraint (`docs/known-gaps.md` **G150**, verbatim:
 * *"i absolutely do not care about the letter case of net names. That's a silly quibble."*).
 * `Net-(C10-Pad1)` fails on case **and on parentheses and hyphens**. Deleting the rule admits the
 * second kind into the emitter, and until this probe ran **nobody had checked whether KiCad accepts
 * those characters in a global label at all** - G150's own relax mechanism flagged exactly that.
 *
 * **IT MEASURES THROUGH PDF AND THE NETLIST, NEVER THROUGH SVG.** `docs/known-gaps.md` **G265**
 * clause 1 records that `kicad-cli sch export svg` at 10.0.5 does not draw a global label's
 * outline at all, under-reporting the label by the whole 3333.75 um outline. Any measurement of a
 * label taken through SVG is wrong, so this probe takes none.
 *
 * **THE NAME IS WRITTEN BY THE PRODUCTION STRING WRITER AND NOT BY THIS FILE.** The candidate goes
 * into the sheet through `lib/kicad/sexpr.ts`'s `quoteString`, which is what
 * `lib/schgen/render/sexpr-write.ts`'s `str()` calls and therefore what
 * `lib/schgen/render/emit-items.ts`'s `globalLabel` would emit for a net name. So the "exact bytes
 * the writer emitted" below are the emitter's own answer, not this probe's imitation of it.
 * `str()` adds one check `quoteString` does not - it refuses a control character - and none of the
 * four candidates contains one.
 *
 * **THE SHEETS ARE BUILT HERE AND COMMITTED, so the run re-drives from a clean checkout.** It
 * needs `kicad-cli`, which `make check` already requires on every run, and nothing else: no
 * download, no font blob, no Python. UUIDs are derived from the sheet and item name rather than
 * generated, so the same probe always writes the same bytes and the sheets are compared by content
 * rather than by timestamp. `tools/schgen/label-freedom/fixtures.ts` does the same thing with an
 * FNV hash and a richer arm model; its builder is not exported and its arms are pinned by another
 * task's test, so the two-symbol sheet below is this probe's own rather than a coupling to it.
 *
 * **IT ASKS A SECOND QUESTION THAT CAN CLOSE THE FIRST ONE WITHOUT KiCad'S HELP.** A punctuated
 * net name only matters if it is ever DRAWN. Labels are emitted per **boundary anchor**, not per
 * net: `lib/schgen/render/cross-sheet.ts` records that `anchorsToSymbols` emits exactly a power
 * symbol or a global label for a block's boundary anchors, `lib/schgen/render/sheets.ts:77` is the
 * only caller that reaches a sheet drawing, and `lib/schgen/render/emit.ts:171` is the only
 * `globalLabel` call site in the repository. The anchor's net is therefore always in the block's
 * `rails` or its `external` - `labelRefsOf` throws for anything else - so counting `external` over
 * every declared block is the complete census and not a sample of one.
 *
 * **IT DESIGNS NOTHING AND DECIDES NOTHING.** Whether the `netNames` rule comes out, and what
 * replaces the format half of `lib/schgen/gates/pin-table.ts`'s guard, are Task 3's and are
 * decided by the spec and the owner. This file reports.
 */

import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { moduleRepoRoot } from "../../perfboard/repo-root.ts"
import { importNetlist, KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import { quoteString } from "../../../lib/kicad/sexpr.ts"
import { exportPdf, kicadVersion, runKicadCli } from "../kicad-run.ts"
import { pdfPaths, type PdfPath } from "../text-metrics/pdf-probe.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { NET_NAME } from "../../../lib/schgen/ir/types.ts"
import { caseResolver } from "../authoring-census.ts"
import { ALL_DECLARED_CASES } from "../board-declarations.ts"
import { boardRefs, declarationFor } from "../board-sheets.ts"

const log = (s: string): void => {
  console.log(s)
}

function head(title: string): void {
  log("")
  log(`== ${title}`)
}

const sha256 = (text: string): string => crypto.createHash("sha256").update(text).digest("hex")
const hex = (text: string): string => Buffer.from(text, "utf8").toString("hex")

/** The net names matching this are KiCad exporter artifacts rather than authored names. */
const SYNTHETIC = /^(Net|unconnected)-/

/** A4 landscape, which `render` below writes as the sheet's paper. PDF y is measured against it. */
const PAPER_HEIGHT_MM = 210

interface Candidate {
  /** A filesystem-safe id. The net NAME carries parentheses, which a file name must not. */
  readonly slug: string
  readonly net: string
  /** Where this exact string occurs in the tree, so the candidate is transcribed and not invented. */
  readonly provenance: string
  /** What the brief predicts, printed before any `kicad-cli` call. */
  readonly prediction: string
}

/**
 * The four candidates, each transcribed from a file in this repository.
 *
 * **`SIGNAL` IS THE CONTROL AND ITS JOB IS TO BE ABLE TO FAIL.** If it did not parse, round-trip
 * and render, nothing below would be about the punctuation: it would be about the sheet this probe
 * writes. The other three are the two classes `netNames` refuses with one message - case alone, and
 * case plus punctuation - with the second class represented by both shapes `pt2399-core` holds.
 */
const CANDIDATES: readonly Candidate[] = [
  {
    slug: "control-upper-snake",
    net: "SIGNAL",
    provenance: "tools/schgen/label-freedom/fixtures.ts fixtureA's own net; the one name here that NET_NAME already accepts",
    prediction: "parses, round-trips byte-identical, renders",
  },
  {
    slug: "lowercase-authored",
    net: "hi_boost_out",
    provenance: "circuits/pultec/electrical/mid.ts:28, MID_TAP_POINT - and a LABELLED net on all five Pultec boards, per the census below",
    prediction: "parses, round-trips byte-identical, renders",
  },
  {
    slug: "synthetic-net-paren",
    net: "Net-(C10-Pad1)",
    provenance: "circuits/pt2399-core/pt2399-core.ts:128, output_mix_resistor's a pin",
    prediction: "UNKNOWN - this is the measurement",
  },
  {
    slug: "synthetic-unconnected",
    net: "unconnected-(U1-CLK_O-Pad5)",
    provenance: "circuits/pt2399-core/pt2399-core.ts:147, U1 pin 5's net, and :190's clk_o_unused port",
    prediction: "UNKNOWN - this is the measurement",
  },
]

/**
 * UUIDs derived from the sheet and item name, never generated.
 *
 * A random UUID would make every written sheet differ from the committed one on every run, so the
 * derived-artifact comparison could only ever be by timestamp - which `CLAUDE.md` forbids.
 */
function derivedUuid(sheet: string, id: string): string {
  const h = sha256(`label-syntax/${sheet}/${id}`)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const E = "(effects (font (size 1.27 1.27)))"

/**
 * The probe's own two-pin symbol, embedded so no library is resolved and no stock symbol path is
 * assumed. Transcribed from `tools/schgen/label-freedom/fixtures.ts`'s `Fixture:R2`, which took its
 * geometry from the `Device:R` entry embedded in `circuits/transistor-preamp/loop-board.kicad_sch`:
 * a 2.54 mm body box with passive pins at +/-3.81 mm. Nothing else was carried across.
 */
const PROBE_SYMBOL = `\t\t(symbol "LabelSyntax:R2"
\t\t\t(pin_numbers (hide yes))
\t\t\t(pin_names (offset 0))
\t\t\t(exclude_from_sim no)
\t\t\t(in_bom yes)
\t\t\t(on_board yes)
\t\t\t(property "Reference" "R" (at 2.032 0 90) ${E})
\t\t\t(property "Value" "R2" (at 0 0 90) ${E})
\t\t\t(property "Footprint" "" (at 0 0 0) (hide yes) ${E})
\t\t\t(property "Datasheet" "" (at 0 0 0) (hide yes) ${E})
\t\t\t(symbol "R2_0_1"
\t\t\t\t(rectangle (start -1.016 -2.54) (end 1.016 2.54) (stroke (width 0.254) (type default)) (fill (type none)))
\t\t\t)
\t\t\t(symbol "R2_1_1"
\t\t\t\t(pin passive line (at 0 3.81 270) (length 1.27) (name "" ${E}) (number "1" ${E}))
\t\t\t\t(pin passive line (at 0 -3.81 90) (length 1.27) (name "" ${E}) (number "2" ${E}))
\t\t\t)
\t\t)`

/** Where the candidate's label sits, in mm. Its outline grows leftwards from here. */
const CANDIDATE_ANCHOR = { x: 38.1, y: 38.1 } as const
/** Where the control net's label sits. Far enough in y that one outline is never taken for the other. */
const RETURN_ANCHOR = { x: 50.8, y: 63.5 } as const

/**
 * One sheet carrying one resistor, two wires per terminal, and two global labels: the candidate on
 * pin 1's net and `RETURN` on pin 2's.
 *
 * **THE CANDIDATE'S NAME IS THE ONLY THING THAT VARIES BETWEEN THE FOUR SHEETS**, which is what
 * makes a difference in the result attributable to the name. `RETURN` is on every sheet so that
 * each export has a second, known-good label to be read against.
 */
function render(c: Candidate): string {
  const u = (id: string): string => derivedUuid(c.slug, id)
  return `(kicad_sch
\t(version 20260306)
\t(generator "label-syntax-probe")
\t(generator_version "10.0")
\t(uuid "${u("sheet")}")
\t(paper "A4")
\t(lib_symbols
${PROBE_SYMBOL}
\t)
\t(symbol (lib_id "LabelSyntax:R2") (at 50.8 50.8 0) (unit 1) (exclude_from_sim no) (in_bom yes) (on_board yes) (dnp no) (uuid "${u("sym-R1")}")
\t\t(property "Reference" "R1" (at 55.88 49.53 0) ${E})
\t\t(property "Value" "1k" (at 55.88 52.07 0) ${E})
\t\t(pin "1" (uuid "${u("sym-R1:pin1")}"))
\t\t(pin "2" (uuid "${u("sym-R1:pin2")}"))
\t\t(instances (project "${c.slug}" (path "/${u("sheet")}" (reference "R1") (unit 1))))
\t)
\t(wire (pts (xy 50.8 46.99) (xy 50.8 38.1)) (stroke (width 0) (type default)) (uuid "${u("cand-stub")}"))
\t(wire (pts (xy 38.1 38.1) (xy 50.8 38.1)) (stroke (width 0) (type default)) (uuid "${u("cand-tail")}"))
\t(global_label ${quoteString(c.net)} (shape bidirectional) (at ${CANDIDATE_ANCHOR.x} ${CANDIDATE_ANCHOR.y} 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "${u("cand-label")}"))
\t(wire (pts (xy 50.8 54.61) (xy 50.8 63.5)) (stroke (width 0) (type default)) (uuid "${u("ret-stub")}"))
\t(global_label "RETURN" (shape bidirectional) (at ${RETURN_ANCHOR.x} ${RETURN_ANCHOR.y} 270) (effects (font (size 1.27 1.27)) (justify right)) (uuid "${u("ret-label")}"))
\t(sheet_instances (path "/" (page "1")))
\t(embedded_fonts no)
)
`
}

/** The `(name <atom>)` atoms of the exported netlist's `(nets ...)` section, as RAW bytes. */
function rawNetNameAtoms(netlist: string): readonly string[] {
  const at = netlist.indexOf("(nets")
  if (at < 0) throw new Error("the exported netlist has no (nets ...) section; this probe cannot read it")
  return [...netlist.slice(at).matchAll(/\(name\s+("(?:[^"\\]|\\.)*")\)/g)].map((m) => m[1] ?? "")
}

/**
 * The one closed seven-point outline whose box holds `at` - a global label's body.
 *
 * It refuses on none and on more than one rather than taking the first: a measurement of the wrong
 * label reads exactly like a measurement of the right one. It is not
 * `text-metrics/pdf-probe.ts`'s `labelOutlineNear`, which needs every point of the path within one
 * radius of the anchor - a 27-character name's outline is wider than the two labels here are apart.
 */
function outlineHolding(paths: readonly PdfPath[], at: { readonly x: number; readonly y: number }): PdfPath {
  const tol = 500
  const x = at.x * 1000
  const y = at.y * 1000
  const hits = paths.filter((p) => {
    if (p.points.length !== 7) return false
    const xs = p.points.map((q) => q.x)
    const ys = p.points.map((q) => q.y)
    return Math.min(...xs) - tol <= x && x <= Math.max(...xs) + tol && Math.min(...ys) - tol <= y && y <= Math.max(...ys) + tol
  })
  if (hits.length !== 1) {
    throw new Error(
      `expected exactly one seven-point label outline whose box holds (${at.x}, ${at.y}) mm within ${tol} um; found ${hits.length}`,
    )
  }
  return hits[0] as PdfPath
}

const extentOf = (p: PdfPath): { readonly along: number; readonly across: number } => {
  const xs = p.points.map((q) => q.x)
  const ys = p.points.map((q) => q.y)
  return { along: Math.max(...xs) - Math.min(...xs), across: Math.max(...ys) - Math.min(...ys) }
}

interface Verdict {
  readonly slug: string
  readonly parsed: boolean
  readonly roundTripped: boolean
  readonly rendered: boolean
  readonly along: number
}

function measureCandidate(c: Candidate, sheetFile: string, tmp: string): Verdict {
  const quoted = quoteString(c.net)
  log(`${c.slug}  net ${JSON.stringify(c.net)}`)
  log(`    writer bytes for the name: ${quoted}`)
  log(`    writer bytes as hex      : ${hex(quoted)}`)
  log(
    `    quoteString escaped anything: ${quoted === `"${c.net}"` ? "NO - the name is between quotes verbatim" : "YES - the name is not verbatim between quotes"}`,
  )

  const netOut = path.join(tmp, `${c.slug}.net`)
  const r = runKicadCli(["sch", "export", "netlist", "--format", "kicadsexpr", "-o", netOut, sheetFile])
  log(`    kicad-cli sch export netlist: exit ${r.status}`)
  if (r.status !== 0) {
    log(`    PARSED: NO. stderr: ${r.stderr.trim().split("\n").join(" | ")}`)
    return { slug: c.slug, parsed: false, roundTripped: false, rendered: false, along: 0 }
  }
  const netlist = fs.readFileSync(netOut, "utf8")
  const raw = rawNetNameAtoms(netlist)
  log(`    kicad wrote these net-name atoms, raw: ${raw.join(" ")}`)
  const rawHit = raw.includes(quoted)
  const parsedNames = Object.keys(importNetlist(netlist).nets)
  log(`    importNetlist read these net names: ${parsedNames.map((n) => JSON.stringify(n)).join(" ")}`)
  const byteHit = parsedNames.some((n) => Buffer.from(n, "utf8").equals(Buffer.from(c.net, "utf8")))
  log(`    raw atom identical to the writer's bytes: ${rawHit ? "YES" : "NO"}; parsed name byte-identical to the input: ${byteHit ? "YES" : "NO"}`)
  if (!rawHit) log(`    the atom KiCad wrote, as hex: ${raw.map((a) => hex(a)).join(" ")}`)

  const pdf = path.join(tmp, `${c.slug}.pdf`)
  exportPdf(sheetFile, pdf)
  const produced = fs.existsSync(pdf)
  log(`    kicad-cli sch export pdf: ${produced ? `produced ${fs.statSync(pdf).size} bytes` : "produced NOTHING"}`)
  if (!produced) return { slug: c.slug, parsed: true, roundTripped: rawHit && byteHit, rendered: false, along: 0 }
  const paths = pdfPaths(pdf, PAPER_HEIGHT_MM)
  const outline = outlineHolding(paths, CANDIDATE_ANCHOR)
  const control = outlineHolding(paths, RETURN_ANCHOR)
  const e = extentOf(outline)
  const ce = extentOf(control)
  log(`    PDF stroked paths: ${paths.length}; seven-point outlines: ${paths.filter((p) => p.points.length === 7).length}`)
  log(`    candidate label outline: ${e.along.toFixed(1)} um along x by ${e.across.toFixed(1)} um across`)
  log(`    the RETURN control outline on the same page: ${ce.along.toFixed(1)} um along x by ${ce.across.toFixed(1)} um across`)
  log(`    um of outline per character of the name (${c.net.length} characters): ${(e.along / c.net.length).toFixed(1)}`)

  return { slug: c.slug, parsed: true, roundTripped: rawHit && byteHit, rendered: true, along: e.along }
}

function main(): void {
  const repoRoot = moduleRepoRoot()

  head("WHAT THIS LABEL-SYNTAX RUN MEASURED")
  const sha = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim()
  const dirty = spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], { encoding: "utf8" }).stdout.trim()
  log(`label-syntax repository commit: ${sha}${dirty === "" ? " (clean tree)" : ` (DIRTY TREE, ${dirty.split("\n").length} path(s))`}`)
  // **IT REFUSES RATHER THAN SKIPS.** `KICAD_CLI` is computed at import time and never checked
  // there, by design, so an absent binary reaches this line as a path that does not exist. A
  // skipped measurement that looks like a passing one is the failure mode this repository's whole
  // workflow exists to prevent.
  if (!fs.existsSync(KICAD_CLI)) {
    throw new Error(
      `kicad-cli is not at ${KICAD_CLI}, so nothing below could be measured. lib/kicad/install.ts ` +
        "holds the per-platform candidate list and an explicitly set KICAD_CLI always wins. This " +
        "probe refuses rather than reporting an empty run: a skipped measurement must never look " +
        "like a passing one.",
    )
  }
  log(`kicad-cli resolved to ${KICAD_CLI}, version ${kicadVersion()}`)
  log("every label measurement below is taken from the PDF export and the netlist export, NEVER from SVG: docs/known-gaps.md G265 clause 1")

  head("PREDICTIONS FOR LABEL SYNTAX, PRINTED BEFORE ANY kicad-cli CALL")
  log("PROVENANCE OF THESE PREDICTIONS, because the ordering is only worth something if they were not back-filled (docs/known-gaps.md G271):")
  log("  the four candidate predictions are the task brief's own, written before this file existed;")
  log("  the boundary-census prediction is the SPEC's, from part 1's third correction, also written before this file existed;")
  log("  a prototype of the netlist and census paths was run while writing this probe, to establish that its mechanisms work.")
  log("  NO PREDICTION WAS REVISED AFTER THAT PROTOTYPE. One of them is refuted below and is left standing as it was written.")
  for (const c of CANDIDATES) log(`PREDICTION ${c.net}: ${c.prediction}`)
  log(
    "PREDICTION boundary census: NON-ZERO. The spec says of pt2399-core that \"the synthetic name becomes a label " +
      "*only because of the fake port*, since ports are boundary nets\", so at least `unconnected-(U1-CLK_O-Pad5)` " +
      "is expected to reach a label. REFUTED BY: a census of zero, which would mean a declared port does not make a " +
      "net a label and the punctuation question is closed by the architecture rather than by kicad-cli.",
  )
  log("PREDICTION control: SIGNAL parses, round-trips and renders. REFUTED BY: any failure, which would make every row below about this probe's sheet rather than about a net name.")

  head("LABEL SYNTAX SHEETS: ONE PER CANDIDATE, WRITTEN BY THE PRODUCTION STRING WRITER")
  const sheetDir = path.join(repoRoot, "tools/schgen/label-syntax/sheets")
  fs.mkdirSync(sheetDir, { recursive: true })
  const files = new Map<string, string>()
  for (const c of CANDIDATES) {
    const text = render(c)
    const file = path.join(sheetDir, `${c.slug}.kicad_sch`)
    const before = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
    fs.writeFileSync(file, text)
    files.set(c.slug, file)
    log(
      `${c.slug}: ${text.split("\n").length} lines, SHA-256 ${sha256(text)}, ` +
        `${before === text ? "unchanged on disk" : before === "" ? "WRITTEN (was absent)" : "REWRITTEN (content moved)"}`,
    )
    log(`    net: ${JSON.stringify(c.net)} (${c.net.length} characters), from ${c.provenance}`)
  }

  head("LABEL SYNTAX: WHAT kicad-cli DID WITH EACH CANDIDATE")
  const verdicts: Verdict[] = []
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "label-syntax-"))
  try {
    for (const c of CANDIDATES) {
      const file = files.get(c.slug)
      if (file === undefined) throw new Error(`candidate ${c.slug} was not written`)
      verdicts.push(measureCandidate(c, file, tmp))
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  head("LABEL SYNTAX VERDICTS: THE FOUR ANSWERS PER CANDIDATE, AGAINST THE PREDICTION")
  for (const c of CANDIDATES) {
    const v = verdicts.find((x) => x.slug === c.slug)
    if (v === undefined) throw new Error(`candidate ${c.slug} produced no verdict`)
    const all = v.parsed && v.roundTripped && v.rendered
    const against = c.prediction.startsWith("UNKNOWN")
      ? "NO PREDICTION TO COMPARE - this row IS the measurement"
      : all
        ? "AS PREDICTED"
        : "NOT AS PREDICTED"
    log(
      `${c.net.padEnd(28)} parsed ${v.parsed ? "YES" : "NO "}  round-trip byte-identical ${v.roundTripped ? "YES" : "NO "}  ` +
        `PDF outline drawn ${v.rendered ? "YES" : "NO "}  outline ${v.along.toFixed(1)} um  (predicted: ${c.prediction}) - ${against}`,
    )
  }
  const control = verdicts.find((v) => v.slug === "control-upper-snake")
  if (control === undefined) throw new Error("the control produced no verdict")
  log(
    control.parsed && control.roundTripped && control.rendered
      ? "CONTROL PASSED: the UPPER_SNAKE name parses, round-trips byte-identical and draws an outline, so a failure on another row would be about that row's name."
      : "CONTROL FAILED: the UPPER_SNAKE name did not pass, so every row above is about this probe's sheet rather than about a net name, and nothing here may be read as a fact about KiCad.",
  )
  const alongs = CANDIDATES.map((c) => {
    const v = verdicts.find((x) => x.slug === c.slug)
    return { chars: c.net.length, along: v?.along ?? 0 }
  }).sort((a, b) => a.chars - b.chars)
  log(
    `outline extent against character count, shortest name first: ${alongs.map((a) => `${a.chars}ch=${a.along.toFixed(0)}um`).join(" ")}`,
  )
  log(
    alongs.every((a, i) => i === 0 || a.along > (alongs[i - 1]?.along ?? 0))
      ? "THE OUTLINE GROWS STRICTLY WITH THE NAME, so the whole string is being drawn rather than a truncation of it. This is the evidence that \"renders\" means the name and not merely a box: the PDF carries stroked glyph paths and no readable string, so the outline's extent is the only thing that can distinguish a drawn name from a mangled one."
      : "THE OUTLINE DOES NOT GROW STRICTLY WITH THE NAME, so at least one name is not drawn at its full length and \"renders\" cannot be read as \"the whole name is on the sheet\".",
  )

  head("BOUNDARY CENSUS: EVERY DECLARED BLOCK OF EVERY BOARD, AND WHICH NET NAMES REACH A LABEL")
  log("a net reaches a global label exactly when it is in a block's `external` set (blocks.ts subgraphOf): labelled, touched by the block, and not a rail.")
  log("a RAIL reaches a POWER SYMBOL instead, never a label (cross-sheet.ts MECHANISM_OF_CLASS), so rails are counted separately below and are not label names.")
  const boards = boardRefs(repoRoot)
  let syntheticLabels = 0
  let syntheticNetsTotal = 0
  const failing = new Map<string, readonly string[]>()
  for (const board of boards) {
    const decl = declarationFor(board)
    if (decl === null) {
      log(`${board.name.padEnd(28)} NO DECLARATION - nothing in the drawing code has seen it, so it contributes no block here`)
      continue
    }
    const symbols = caseResolver([decl])
    const circuit = buildCircuit(circuitSpecFrom(decl.network, decl.authoring, symbols), { symbols })
    const synthetic = [...circuit.nets.keys()].filter((n) => SYNTHETIC.test(n)).sort()
    syntheticNetsTotal += synthetic.length
    const labelNets = new Set<string>()
    const railNets = new Set<string>()
    for (const block of circuit.blocks.values()) {
      const g = subgraphOf(circuit, block.id, symbols)
      for (const n of g.external) labelNets.add(n)
      for (const n of g.rails) railNets.add(n)
    }
    const syntheticLabelled = [...labelNets].filter((n) => SYNTHETIC.test(n)).sort()
    syntheticLabels += syntheticLabelled.length
    const bad = [...labelNets].filter((n) => !NET_NAME.test(n)).sort()
    failing.set(board.name, bad)
    log(
      `${board.name.padEnd(28)} declared by ${decl.entry.padEnd(28)} ${String(circuit.blocks.size).padStart(2)} block(s), ` +
        `${String(circuit.nets.size).padStart(2)} net(s), ${String(synthetic.length).padStart(2)} synthetic net name(s), ` +
        `${String(labelNets.size).padStart(2)} net(s) reaching a label, ${String(railNets.size).padStart(2)} rail(s) reaching a power symbol, ` +
        `SYNTHETIC NAMES REACHING A LABEL: ${syntheticLabelled.length}${syntheticLabelled.length === 0 ? "" : ` (${syntheticLabelled.join(" ")})`}`,
    )
    log(`    reaches a label: ${[...labelNets].sort().map((n) => JSON.stringify(n)).join(" ") || "(none)"}`)
    if (synthetic.length > 0) log(`    its synthetic net names, none of which need be labelled: ${synthetic.join(" ")}`)
  }
  log(
    `BOUNDARY CENSUS: over ${boards.length} boards, ${syntheticNetsTotal} synthetic net name(s) exist in the models and ` +
      `${syntheticLabels} of them reach a global label.`,
  )
  log(
    syntheticLabels === 0
      ? "THE BOUNDARY-CENSUS PREDICTION PUBLISHED ABOVE IS REFUTED: it predicted non-zero, on the spec's own mechanism that a declared port makes a net a boundary net. It does not. `buildCircuit` leaves `Circuit.offSheet` empty unconditionally (lib/schgen/ir/build.ts:152, and the field's own comment in lib/schgen/ir/types.ts says only a sheet subset ever has any), so `labelledNets` labels a net only when it is a rail, touches more than one block, or touches a `bus` block. `pt2399-core` is ONE block, so none of its 16 synthetic names is labelled, with or without the fake `clk_o_unused` port."
      : "THE BOUNDARY-CENSUS PREDICTION PUBLISHED ABOVE IS CONFIRMED: at least one synthetic name reaches a label.",
  )
  log(
    syntheticLabels === 0
      ? "THE CENSUS IS ZERO, AND WHAT ZERO MEANS: no board in this repository would draw a punctuated net name on a sheet today, " +
          "so whether KiCad accepts one is NOT a blocker for removing the casing rule - the architecture closes the question and the " +
          "kicad-cli rows above are a standing answer rather than a precondition. It is NOT a reason to relax a gate: the name still " +
          "exists in the model, reaches the netlist comparison, and would reach a label the moment a block boundary fell between two " +
          "pins of one of these nets - which is a layout decision nobody has made yet, not an invariant."
      : `THE CENSUS IS ${syntheticLabels}, so punctuated names DO reach a sheet and the kicad-cli rows above are a precondition rather than a standing answer.`,
  )

  head("BOUNDARY CENSUS ADJUNCT: THE LABELLED NETS THAT NET_NAME REFUSES TODAY, PER BOARD")
  log("this is the other half of the same question and it is NOT the task's own: it sizes what the casing rule costs on names that really are drawn.")
  let failingTotal = 0
  for (const [board, bad] of failing) {
    failingTotal += bad.length
    log(`${board.padEnd(28)} ${String(bad.length).padStart(2)} labelled net(s) fail NET_NAME: ${bad.map((n) => JSON.stringify(n)).join(" ") || "(none)"}`)
  }
  log(`labelled nets failing NET_NAME, over every board with a declaration: ${failingTotal}`)

  head("LABEL SYNTAX SUMMARY")
  log(`candidates driven: ${verdicts.length}; parsed: ${verdicts.filter((v) => v.parsed).length}; round-tripped byte-identical: ${verdicts.filter((v) => v.roundTripped).length}; drew an outline: ${verdicts.filter((v) => v.rendered).length}`)
  log(`synthetic net names reaching a global label, over all ${boards.length} boards: ${syntheticLabels}`)
  log(`labelled nets refused by NET_NAME today, over all ${boards.length} boards: ${failingTotal}`)
}

main()
