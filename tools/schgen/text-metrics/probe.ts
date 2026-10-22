/**
 * **HOW WRONG `text.length * GRID` IS, driven end to end.**
 *
 *   bun run tools/schgen/text-metrics/probe.ts --font <path to newstroke_font.cpp>
 *
 * Research probe for Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
 * **Nothing in `lib/` or any check calls it, and it changes no production code.** Every figure §1
 * of `docs/schematic/text-handling-research.md` publishes comes from one run of this file.
 *
 * **IT PINS ITS INPUT** (controller ruling R4): it prints the commit it measured and whether the
 * tree was dirty, the `kicad-cli` version, the KiCad Python build and the SHA-256 of the font blob,
 * and `newstroke.ts` REFUSES a font blob that is not the pinned one. A figure whose script ran
 * against a moving tree is as unreproducible as a shell line, which is what that ruling exists to
 * stop.
 *
 * **IT ELECTS NOTHING.** Step 0 of that task forbids this agent from choosing which of the three
 * quantities governs a collision - that is an acceptance criterion for the artifact this generator
 * produces, and `CLAUDE.md` reserves those to the owner. All three are measured and their
 * disagreements printed.
 */

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import { GRID, type Um } from "../../../lib/schgen/render/geometry.ts"
import { PARITY_CASES } from "../authoring-census.ts"
import { kicadVersion } from "../kicad-run.ts"
import { moduleRepoRoot } from "../../perfboard/repo-root.ts"
import { distinctStrings, glyphSet, wholeCorpus, type StringRow } from "./corpus.ts"
import { advanceGeometry, estimateGeometry, inkGeometry, kicadBoxGeometry, labelOutlineExtent, type Measured } from "./geometry.ts"
import { advanceWidth, boxPenWidth, estimatedWidth, inkCentrelines, kicadTextBoxExtent, kicadTextBoxExtentAtPen, TEXT_SIZE } from "./metrics.ts"
import { inkOutsideAdvance, loadGlyphs, FONT_SOURCE_SHA256, type Glyph } from "./newstroke.ts"
import type { TextGeometry } from "./placement.ts"
import { labelOutlineNear, pdfPathsOf } from "./pdf-probe.ts"
import { blockRuns, controlDisagreements, g239Slots } from "./step4.ts"
import { measureRows, writeProbeSheet, PAPER_HEIGHT_MM, type RowExtent, type RowSpec } from "./svg-probe.ts"

const um = (v: number): string => v.toFixed(1)

/** How many corpus strings the declared-advance check (route 3c) is driven over. */
const ADVANCE_SAMPLE = 16

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? (process.argv[i + 1] ?? null) : null
}

function kicadPython(): string {
  const env = process.env["KICAD_PYTHON"]
  if (env !== undefined) return env
  const guess = path.join(path.dirname(KICAD_CLI), "..", "Frameworks", "Python.framework", "Versions", "3.9", "bin", "python3.9")
  if (!fs.existsSync(guess)) {
    throw new Error(
      `no KiCad Python at ${guess}. Route 2 of Task 1 Step 2 is the installed runtime's own ` +
        "EDA_TEXT::GetTextBox, and this probe will not substitute its own arithmetic for it silently. " +
        "Set KICAD_PYTHON to the interpreter that can `import pcbnew`.",
    )
  }
  return guess
}

interface RuntimeRow {
  readonly text: string
  readonly effective_pen_nm: number
  readonly text_box_w_nm: number
  readonly text_box_h_nm: number
  readonly ink_present: boolean
  readonly ink_w_nm?: number
  readonly ink_h_nm?: number
}

function runtimeBoxes(strings: readonly string[]): { readonly build: string; readonly rows: readonly RuntimeRow[] } {
  const script = path.join(path.dirname(new URL(import.meta.url).pathname), "kicad-box.py")
  const r = spawnSync(kicadPython(), [script], { input: JSON.stringify({ size_nm: TEXT_SIZE * 1000, strings }), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`kicad-box.py failed (${r.status ?? "signal"}):\n${r.stderr}`)
  const parsed: unknown = JSON.parse(r.stdout)
  if (typeof parsed !== "object" || parsed === null) throw new Error(`kicad-box.py printed no JSON object: ${r.stdout.slice(0, 200)}`)
  const o = parsed as { kicad_build: string; rows: RuntimeRow[] }
  return { build: o.kicad_build, rows: o.rows }
}

function head(title: string): void {
  console.log("")
  console.log(`== ${title}`)
}

/** Route 3's three placement constants, solved from one left-justified row and checked against the rest. */
function measuredConstants(glyphs: readonly Glyph[], rows: readonly RowExtent[], probeText: string): Measured {
  const left = rows.find((r) => r.label === `${probeText} left rot0`)
  if (left === undefined) throw new Error(`the SVG probe produced no "${probeText} left rot0" row to solve the placement constants from`)
  const widths = [...new Set(rows.flatMap((r) => r.strokeWidths))]
  if (widths.length !== 1 || widths[0] === undefined) {
    throw new Error(`the SVG probe rows carry ${widths.length} distinct stroke widths (${widths.join(", ")}); the drawn pen is not one number`)
  }
  const drawnPen = widths[0] * 1000
  const c = inkCentrelines(glyphs, probeText, TEXT_SIZE)
  if (c === null) throw new Error(`"${probeText}" has no ink, so it cannot fix the placement constants`)
  return { drawnPen, fieldLeadX: left.ink.minX - c.minX + drawnPen / 2, fieldBaselineY: left.ink.minY - c.minY + drawnPen / 2 }
}

async function main(): Promise<void> {
  const repoRoot = moduleRepoRoot()
  const fontPath = arg("font") ?? path.join(os.tmpdir(), "newstroke_font.cpp")
  const outDir = arg("out") ?? fs.mkdtempSync(path.join(os.tmpdir(), "schgen-text-metrics-"))

  head("WHAT THIS RUN MEASURED")
  const sha = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim()
  const dirty = spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], { encoding: "utf8" }).stdout.trim()
  console.log(`repository commit: ${sha}${dirty === "" ? " (clean tree)" : ` (DIRTY TREE, ${dirty.split("\n").length} path(s))`}`)
  console.log(`kicad-cli: ${KICAD_CLI} version ${kicadVersion()}`)
  console.log(`font source: ${fontPath} pinned at SHA-256 ${FONT_SOURCE_SHA256}`)
  const glyphs = loadGlyphs(fontPath)
  console.log(`font records parsed: ${glyphs.length}`)

  head("STEP 1: THE GLYPH SET THE ELEVEN BOARDS ACTUALLY EMIT")
  const boards = wholeCorpus(repoRoot)
  const rows: StringRow[] = boards.flatMap((b) => [...b.rows])
  const drawn = rows.filter((r) => r.reachesTheDrawing)
  console.log(`boards: ${boards.length}; strings: ${rows.length}; of those, ${drawn.length} are on boards that pass validateCircuit`)
  for (const b of boards) console.log(`  ${b.board.padEnd(28)} ${String(b.rows.length).padStart(4)} strings  ${b.validationProblems.length === 0 ? "reaches the drawing" : `refused at gate 1 (${b.validationProblems.length} problems)`}`)
  const all = glyphSet(rows)
  const reached = new Set(glyphSet(drawn))
  console.log(`distinct characters over all eleven boards (${all.length}): ${all.map((c) => JSON.stringify(c)).join(" ")}`)
  console.log(`distinct characters on boards that reach the drawing (${reached.size}): ${[...reached].map((c) => JSON.stringify(c)).join(" ")}`)
  console.log(`characters that enter ONLY through a board gate 1 refuses: ${all.filter((c) => !reached.has(c)).map((c) => JSON.stringify(c)).join(" ") || "(none)"}`)

  head("STEP 2 ROUTE 1: THE FONT SOURCE - per-glyph advance, and whether strokes leave it")
  console.log("char  advance(um)   ink x (um)            ink y (um)")
  for (const ch of all) {
    const g = glyphs[(ch.codePointAt(0) ?? 0) - 0x20]
    if (g === undefined) {
      console.log(`${JSON.stringify(ch).padEnd(6)} NOT IN THE TABLE - KiCad draws '?' for it`)
      continue
    }
    const ink = g.ink
    console.log(
      `${JSON.stringify(ch).padEnd(6)}${um(g.advance * TEXT_SIZE).padStart(8)}   ` +
        (ink === null ? "(no strokes)" : `[${um(ink.minX * TEXT_SIZE).padStart(8)},${um(ink.maxX * TEXT_SIZE).padStart(8)}]  [${um(ink.minY * TEXT_SIZE).padStart(8)},${um(ink.maxY * TEXT_SIZE).padStart(8)}]`),
    )
  }
  const outside = inkOutsideAdvance(glyphs, all)
  console.log(
    outside.length === 0
      ? "CLAIM DRIVEN AND NOT REPRODUCED: no glyph of this corpus has a stroke outside [0, advance]. The third-party review's supporting claim that strokes may extend outside their nominal advance is FALSE for this glyph set."
      : `glyphs whose strokes leave [0, advance]: ${outside.map((o) => `${JSON.stringify(o.ch)} left ${um(o.leftOverhang * TEXT_SIZE)} right ${um(o.rightOverhang * TEXT_SIZE)}`).join("; ")}`,
  )
  const whole = inkOutsideAdvance(glyphs, glyphs.slice(0, 95).map((_, i) => String.fromCodePoint(0x20 + i)))
  console.log(`over the whole printable-ASCII range the count is ${whole.length}${whole.length === 0 ? "" : `: ${whole.slice(0, 12).map((o) => JSON.stringify(o.ch)).join(" ")}`}`)

  head("STEP 2 ROUTE 2: THE INSTALLED RUNTIME - EDA_TEXT::GetTextBox over every corpus string")
  const distinct = distinctStrings(rows)
  const texts = distinct.map((d) => d.text)
  const runtime = runtimeBoxes(texts)
  console.log(`pcbnew build ${runtime.build}; ${runtime.rows.length} strings measured`)
  let worstBox = { text: "", d: 0 }
  let worstInk = { text: "", d: 0 }
  for (const r of runtime.rows) {
    const predicted = kicadTextBoxExtent(glyphs, r.text, TEXT_SIZE)
    const dBox = Math.abs(predicted.width - r.text_box_w_nm / 1000)
    if (dBox > worstBox.d) worstBox = { text: r.text, d: dBox }
    if (r.ink_present && r.ink_w_nm !== undefined) {
      const c = inkCentrelines(glyphs, r.text, TEXT_SIZE)
      const penUm = r.effective_pen_nm / 1000
      const predInk = c === null ? 0 : c.maxX - c.minX + penUm
      const dInk = Math.abs(predInk - r.ink_w_nm / 1000)
      if (dInk > worstInk.d) worstInk = { text: r.text, d: dInk }
    }
  }
  console.log(`route 1 vs route 2, GetTextBox width: worst disagreement ${um(worstBox.d)} um on ${JSON.stringify(worstBox.text)}`)
  console.log(`route 1 vs route 2, stroked-outline width: worst disagreement ${um(worstInk.d)} um on ${JSON.stringify(worstInk.text)}`)
  const sampleBox = runtime.rows[0]
  if (sampleBox !== undefined) console.log(`example: ${JSON.stringify(sampleBox.text)} box ${sampleBox.text_box_w_nm / 1000} x ${sampleBox.text_box_h_nm / 1000} um at pen ${sampleBox.effective_pen_nm / 1000} um`)

  head("STEP 2 ROUTE 3: eeschema's OWN RENDERER - symbol fields, rotations, justifications")
  const probeText = "R100"
  const svgRows: RowSpec[] = [
    { kind: "field", label: `${probeText} left rot0`, text: probeText, justify: "left", rot: 0 },
    { kind: "field", label: `${probeText} right rot0`, text: probeText, justify: "right", rot: 0 },
    { kind: "field", label: `${probeText} center rot0`, text: probeText, justify: "center", rot: 0 },
    { kind: "field", label: `${probeText} left rot90`, text: probeText, justify: "left", rot: 90 },
    { kind: "field", label: `${probeText} left rot180`, text: probeText, justify: "left", rot: 180 },
    { kind: "field", label: `${probeText} left rot270`, text: probeText, justify: "left", rot: 270 },
    { kind: "field", label: "I left rot0", text: "I", justify: "left", rot: 0 },
    { kind: "field", label: "IIIIIIIIII left rot0", text: "IIIIIIIIII", justify: "left", rot: 0 },
    { kind: "field", label: "100nF left rot0", text: "100nF", justify: "left", rot: 0 },
    { kind: "label", label: "VCC right", net: "VCC", side: "right", refs: "[1]" },
    { kind: "label", label: "VCC up", net: "VCC", side: "up", refs: "[1]" },
    // A spread of the real corpus, so the declared-advance check below is over this repository's
    // own strings and not over six hand-picked ones. Sampled at a fixed stride rather than taken
    // from the front: the corpus is sorted, so the first N are all values beginning with a dot.
    ...Array.from({ length: ADVANCE_SAMPLE }, (_, i): RowSpec => {
      const text = distinct[Math.floor((i * distinct.length) / ADVANCE_SAMPLE)]!.text
      return { kind: "field", label: `sample ${i} ${text}`, text, justify: "left", rot: 0 }
    }),
  ]
  const { extents: measured, declaredAdvances } = measureRows(svgRows, path.join(outDir, "svg"))
  for (const r of measured) {
    console.log(`${r.label.padEnd(22)} paths=${String(r.paths).padStart(3)} ink x[${um(r.ink.minX)},${um(r.ink.maxX)}] y[${um(r.ink.minY)},${um(r.ink.maxY)}]`)
  }
  const m = measuredConstants(glyphs, measured, probeText)
  console.log(`drawn pen ${um(m.drawnPen)} um; anchor to pen origin ${um(m.fieldLeadX)} um; anchor to baseline ${um(m.fieldBaselineY)} um`)
  const ink = inkGeometry(glyphs, m)
  let worstPlace = { label: "", d: 0 }
  for (const r of measured) {
    const spec = svgRows.find((s) => s.label === r.label)
    if (spec === undefined || spec.kind !== "field") continue
    const b = ink.lineBox({ at: { x: 0, y: 0 }, justify: spec.justify }, spec.text)
    for (const [p, q] of [[b.minX, r.ink.minX], [b.maxX, r.ink.maxX], [b.minY, r.ink.minY], [b.maxY, r.ink.maxY]] as const) {
      if (Math.abs(p - q) > worstPlace.d) worstPlace = { label: r.label, d: Math.abs(p - q) }
    }
  }
  console.log(`route 1 placed by route 3's constants vs route 3's own measurement: worst edge disagreement ${um(worstPlace.d)} um (${worstPlace.label})`)
  const one = measured.find((r) => r.label === "I left rot0")
  const ten = measured.find((r) => r.label === "IIIIIIIIII left rot0")
  if (one === undefined || ten === undefined) throw new Error("the scaling control rows are missing")
  const predictedTen = one.ink.maxX - one.ink.minX + 9 * advanceWidth(glyphs, "I", TEXT_SIZE)
  console.log(`CONTROL (could have answered differently): ten 'I' measured ${um(ten.ink.maxX - ten.ink.minX)} um, predicted from one 'I' plus nine advances ${um(predictedTen)} um, difference ${um(Math.abs(predictedTen - (ten.ink.maxX - ten.ink.minX)))} um`)
  const right = measured.find((r) => r.label === `${probeText} right rot0`)
  const up = measured.find((r) => r.label === "VCC up")
  const rightLabel = measured.find((r) => r.label === "VCC right")
  if (right !== undefined) console.log(`CONTROL: the same string right-justified is ${um(right.ink.maxX - right.ink.minX)} um wide against ${um(measured.find((r) => r.label === `${probeText} left rot0`)!.ink.maxX - measured.find((r) => r.label === `${probeText} left rot0`)!.ink.minX)} um left-justified`)
  if (up !== undefined && rightLabel !== undefined) {
    console.log(
      `CONTROL: an 'up' label's box is the 'right' label's box transposed - up ${um(up.ink.maxX - up.ink.minX)} x ${um(up.ink.maxY - up.ink.minY)}, right ${um(rightLabel.ink.maxX - rightLabel.ink.minX)} x ${um(rightLabel.ink.maxY - rightLabel.ink.minY)}`,
    )
  }
  console.log("FINDING: `kicad-cli sch export svg` 10.0.5 draws a global label's TEXT and not its outline; `export pdf` draws both. The label rows above therefore measure the text alone.")

  head("STEP 2 ROUTE 3c: KiCad's OWN DECLARED ADVANCE, which is the only direct check Q1 has")
  // Routes 2 and 3 pin the BOX and the INK. The advance sum is otherwise confirmed only through
  // the box-width formula, which is the same arithmetic - so the `textLength` KiCad writes beside
  // every stroked string is the one reading of Q1 that is independent of everything else here.
  if (declaredAdvances.size === 0) {
    throw new Error(
      "the SVG export declared no textLength at this repository's text size. Either kicad-cli stopped " +
        "writing the invisible <text> element or SVG_FONT_SCALE in svg-probe.ts no longer describes " +
        "how it scales font-size. Refused rather than reporting a comparison over zero strings.",
    )
  }
  const residualsFor = (width: (t: string) => Um): { readonly n: number; readonly median: Um; readonly spread: Um; readonly worst: string } => {
    const rs = [...declaredAdvances].map(([t, tl]) => ({ t, r: tl - width(t) }))
    const sorted = [...rs].map((x) => x.r).sort((x, y) => x - y)
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0
    let worst = { t: "", d: -1 }
    for (const x of rs) if (Math.abs(x.r - median) > worst.d) worst = { t: x.t, d: Math.abs(x.r - median) }
    return { n: rs.length, median, spread: worst.d, worst: worst.t }
  }
  const byAdvance = residualsFor((t) => advanceWidth(glyphs, t, TEXT_SIZE))
  const byEstimate = residualsFor(estimatedWidth)
  console.log(`${byAdvance.n} strings carry a declared textLength at ${um(TEXT_SIZE)} um text`)
  console.log(
    `textLength MINUS the font source's advance sum is a CONSTANT ${um(byAdvance.median)} um; ` +
      `worst departure from it ${um(byAdvance.spread)} um on ${JSON.stringify(byAdvance.worst)}`,
  )
  console.log(
    `CONTROL (could have answered differently): the same residual against length * GRID is ${um(byEstimate.median)} um ` +
      `with a departure of ${um(byEstimate.spread)} um on ${JSON.stringify(byEstimate.worst)} - ` +
      `${(byEstimate.spread / Math.max(byAdvance.spread, 1e-9)).toFixed(0)}x wider, so this check discriminates`,
  )
  for (const [t, tl] of [...declaredAdvances].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
    console.log(`  ${JSON.stringify(t).padEnd(22)} textLength ${um(tl).padStart(9)}  advance ${um(advanceWidth(glyphs, t, TEXT_SIZE)).padStart(9)}  residual ${um(tl - advanceWidth(glyphs, t, TEXT_SIZE)).padStart(7)}`)
  }

  head("STEP 2 ROUTE 3b: THE GLOBAL-LABEL OUTLINE, from the PDF export's own vector coordinates")
  const labelRows: RowSpec[] = ["A", "ABC", "VCC", "BYPASS_CAP", "BUFFER_EMITTER"].map((net): RowSpec => ({ kind: "label", label: `${net} right`, net, side: "right", refs: "" }))
  const sheet = writeProbeSheet(labelRows, path.join(outDir, "pdf"), false)
  const paths = pdfPathsOf(sheet.sch, path.join(outDir, "pdf"), PAPER_HEIGHT_MM)
  let worstOutline = { net: "", d: 0 }
  const outlineConstants: { net: string; measured: Um; predicted: Um }[] = []
  for (const [i, a] of sheet.anchors.entries()) {
    const net = labelRows[i]!.kind === "label" ? (labelRows[i] as { net: string }).net : ""
    const outline = labelOutlineNear(paths, { x: sheet.rowX, y: a.y }, 40 * GRID)
    const xs = outline.points.map((p) => p.x - sheet.rowX)
    const ys = outline.points.map((p) => p.y - a.y)
    const along = Math.max(...xs) - Math.min(...xs)
    const across = Math.max(...ys) - Math.min(...ys)
    const predicted = labelOutlineExtent(glyphs, net)
    const d = Math.max(Math.abs(along - predicted.along), Math.abs(across - 2 * predicted.across))
    if (d > worstOutline.d) worstOutline = { net, d }
    const boxW = kicadTextBoxExtent(glyphs, net, TEXT_SIZE).width
    outlineConstants.push({ net, measured: along - boxW, predicted: predicted.constant })
    console.log(
      `${net.padEnd(16)} PDF outline along ${um(along)} across ${um(across)} um; sch_label.cpp predicts along ${um(predicted.along)} across ${um(2 * predicted.across)}; ` +
        `(net.length + 2) * GRID predicts along ${um((net.length + 2) * GRID)} across ${um(2 * GRID)}`,
    )
  }
  console.log(`route 1+2 outline formula vs the PDF's own coordinates: worst disagreement ${um(worstOutline.d)} um`)
  // **THE OUTLINE'S FIXED PART, DRIVEN.** The document quotes it as the amount an SVG export loses
  // and as the reason `(n + 2) * GRID` is wrong in both directions, so it is printed rather than
  // derived by hand: `sch_label.cpp`'s own arithmetic, and what the PDF measures it to be.
  const measuredConsts = outlineConstants.map((o) => o.measured)
  console.log(
    `the outline's fixed part - what it adds to GetTextBox's width, independent of the net name - ` +
      `is ${um(outlineConstants[0]?.predicted ?? 0)} um by sch_label.cpp's arithmetic and ` +
      `${um(Math.min(...measuredConsts))} to ${um(Math.max(...measuredConsts))} um as the PDF measures it over ${measuredConsts.length} nets`,
  )

  head("STEP 3: THE ERROR TABLE")
  const geometries: TextGeometry[] = [estimateGeometry, advanceGeometry(glyphs), ink, kicadBoxGeometry(glyphs)]
  const names = geometries.map((g) => g.name)
  console.log(`quantities: ${names.join(" | ")}`)
  console.log("")
  console.log(`${"string".padEnd(22)}${"len*GRID".padStart(10)}${names.slice(1).map((n) => n.slice(0, 9).padStart(11)).join("")}   ratios (estimate / quantity)`)
  const ratios = new Map<string, number[]>(names.slice(1).map((n) => [n, []]))
  for (const d of distinct) {
    const est = estimatedWidth(d.text)
    const ws = geometries.slice(1).map((g) => g.width(d.text))
    ws.forEach((w, i) => {
      const n = names[i + 1]!
      if (w > 0) ratios.get(n)!.push(est / w)
    })
    console.log(`${JSON.stringify(d.text).padEnd(22)}${um(est).padStart(10)}${ws.map((w) => um(w).padStart(11)).join("")}   ${ws.map((w) => (w > 0 ? (est / w).toFixed(3) : "n/a")).join("  ")}`)
  }
  console.log("")
  for (const [n, vs] of ratios) {
    const s = [...vs].sort((a, b) => a - b)
    const q = (p: number): string => (s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0).toFixed(3)
    const under = s.filter((v) => v < 1).length
    console.log(
      `estimate / ${n}: n=${s.length} min ${q(0)} p25 ${q(0.25)} median ${q(0.5)} p75 ${q(0.75)} max ${(s[s.length - 1] ?? 0).toFixed(3)}; ` +
        `the estimate is SMALLER than this quantity for ${under} of ${s.length} strings`,
    )
  }
  for (let i = 1; i < geometries.length; i += 1) {
    const g = geometries[i]!
    let over = { text: "", d: -Infinity }
    let under = { text: "", d: Infinity }
    for (const d of distinct) {
      const delta = estimatedWidth(d.text) - g.width(d.text)
      if (delta > over.d) over = { text: d.text, d: delta }
      if (delta < under.d) under = { text: d.text, d: delta }
    }
    console.log(
      `estimate minus ${g.name}: widest OVER-estimate ${um(over.d)} um (${(over.d / GRID).toFixed(2)} grid steps) on ${JSON.stringify(over.text)}; ` +
        (under.d < 0
          ? `widest UNDER-estimate ${um(-under.d)} um (${(-under.d / GRID).toFixed(2)} grid steps) on ${JSON.stringify(under.text)}`
          : `the estimate is never smaller - its narrowest margin is ${um(under.d)} um on ${JSON.stringify(under.text)}`),
    )
  }
  console.log("")
  console.log(`line HEIGHT: current model ${um(GRID)} um; rendered ink ${um(ink.height("R100"))} um for "R100"; EDA_TEXT::GetTextBox ${um(kicadTextBoxExtent(glyphs, "R100", TEXT_SIZE).height)} um (height does not depend on the string for a single line without descenders)`)
  // **WHERE GetTextBox'S HEIGHT ACTUALLY COMES FROM**, driven rather than left for a reader to
  // derive from the formula in the document. The owner elects between these quantities, and
  // without this he could discount the box's height as bookkeeping around a pen KiCad does not
  // plot with - a suspicion these three numbers refute.
  const atBoxPen = kicadTextBoxExtentAtPen(glyphs, "R100", boxPenWidth(), TEXT_SIZE)
  const atPlotPen = kicadTextBoxExtentAtPen(glyphs, "R100", m.drawnPen, TEXT_SIZE)
  const excess = atBoxPen.height - GRID
  console.log(
    `  of that ${um(excess)} um excess over the model: 2 x KiROUND(1.5 x pen) = ${um(2 * (atBoxPen.inflate ?? 0))} um ` +
      `(${((200 * (atBoxPen.inflate ?? 0)) / excess).toFixed(1)}%) and KiROUND(0.17 x extents.y) = ${um(atBoxPen.fudge ?? 0)} um ` +
      `(${((100 * (atBoxPen.fudge ?? 0)) / excess).toFixed(1)}%)`,
  )
  console.log(
    `  COUNTERFACTUAL: recomputed at the PLOTTED pen ${um(m.drawnPen)} um instead of the box pen ${um(boxPenWidth())} um, ` +
      `GetTextBox would return ${um(atPlotPen.height)} um - so the pen disagreement accounts for ` +
      `${um(atBoxPen.height - atPlotPen.height)} um, ${((100 * (atBoxPen.height - atPlotPen.height)) / excess).toFixed(1)}% of the excess`,
  )
  const desc = distinct.map((d) => d.text).find((t) => /[gjpqy]/.test(t))
  if (desc !== undefined) console.log(`a string with a descender, ${JSON.stringify(desc)}: ink height ${um(ink.height(desc))} um`)

  head("STEP 3b: WHERE THE THREE QUANTITIES DISAGREE WITH EACH OTHER")
  let worstPair = { text: "", a: "", b: "", d: 0 }
  for (const d of distinct) {
    for (let i = 1; i < geometries.length; i += 1) {
      for (let j = i + 1; j < geometries.length; j += 1) {
        const delta = Math.abs(geometries[i]!.width(d.text) - geometries[j]!.width(d.text))
        if (delta > worstPair.d) worstPair = { text: d.text, a: names[i]!, b: names[j]!, d: delta }
      }
    }
  }
  console.log(`widest disagreement between two measured quantities: ${um(worstPair.d)} um (${(worstPair.d / GRID).toFixed(2)} grid steps) on ${JSON.stringify(worstPair.text)}, ${worstPair.a} vs ${worstPair.b}`)

  head("STEP 4a: G239 - inside field slots for the four symbols that entry measures")
  for (const row of g239Slots(geometries)) {
    const body = row.body
    console.log(`${row.libId.padEnd(24)} body ${um(body.maxX - body.minX)} x ${um(body.maxY - body.minY)} um`)
    const bodyW = row.body.maxX - row.body.minX
    for (const g of geometries) {
      const p = row.pair.get(g.name)!
      const v = row.value === "" ? null : g.width(row.value)
      console.log(
        `    ${g.name.padEnd(30)} grown pair ${um(p.width)} x ${um(p.height)}   inside slots that fit: ${row.fits.get(g.name)} of 5` +
          (v === null ? "" : `   Value ${JSON.stringify(row.value)} ${um(v)} um = ${(v / bodyW).toFixed(2)}x the body WIDTH ${um(bodyW)} um, ${(v / (row.body.maxY - row.body.minY)).toFixed(2)}x its HEIGHT`),
      )
    }
  }

  head("STEP 4b: G260 - the fallback field placements, and the blocked blocks' text overlaps")
  const { runs, skipped } = await blockRuns(PARITY_CASES, geometries)
  for (const s of skipped) console.log(`  SKIPPED ${s}`)
  const bad = controlDisagreements(runs, estimateGeometry.name)
  if (bad.length > 0) {
    throw new Error(
      `the parallel search does not reproduce production's own fallbacks under the current ruler:\n  ${bad.join("\n  ")}\n` +
        "Nothing measured with another ruler is reported, because a copy that cannot reproduce the original is measuring itself.",
    )
  }
  console.log(`CONTROL PASSED: over ${runs.length} laid-out blocks the parallel search reproduces lib/schgen/render/field-placement.ts exactly, block, unit, lib id, cost and covers.`)
  console.log("")
  console.log(`${"block".padEnd(34)}${names.map((n) => n.slice(0, 9).padStart(11)).join("")}`)
  const totals = new Map<string, number>(names.map((n) => [n, 0]))
  for (const r of runs) {
    const counts = names.map((n) => (r.perGeometry.get(n) ?? []).length)
    counts.forEach((c, i) => totals.set(names[i]!, (totals.get(names[i]!) ?? 0) + c))
    console.log(`${`${r.circuit}/${r.block}`.padEnd(34)}${counts.map((c) => String(c).padStart(11)).join("")}`)
  }
  console.log(`${"TOTAL".padEnd(34)}${names.map((n) => String(totals.get(n)).padStart(11)).join("")}`)
  console.log("")
  console.log("SURVIVORS: of the fallbacks the current ruler produces, how many are still fallbacks under each measured quantity")
  for (const n of names.slice(1)) {
    let survived = 0
    let lost = 0
    let added = 0
    for (const r of runs) {
      const before = new Set(r.production.map((f) => f.key))
      const after = new Set((r.perGeometry.get(n) ?? []).map((f) => f.key))
      for (const k of before) (after.has(k) ? (survived += 1) : (lost += 1))
      for (const k of after) if (!before.has(k)) added += 1
    }
    console.log(`  ${n.padEnd(30)} survived ${survived} of ${totals.get(estimateGeometry.name)}; vanished ${lost}; NEW under this quantity ${added}`)
  }
  console.log("")
  console.log("SURVIVORS: drawn-text overlaps")
  for (const n of names.slice(1)) {
    let survived = 0
    let lost = 0
    let added = 0
    for (const r of runs) {
      const before = new Set(r.textOverlaps.get(estimateGeometry.name) ?? [])
      const after = new Set(r.textOverlaps.get(n) ?? [])
      for (const k of before) (after.has(k) ? (survived += 1) : (lost += 1))
      for (const k of after) if (!before.has(k)) added += 1
    }
    console.log(`  ${n.padEnd(30)} survived ${survived}; vanished ${lost}; NEW under this quantity ${added}`)
  }
  console.log("")
  for (const r of runs) {
    for (const n of names) {
      for (const f of r.perGeometry.get(n) ?? []) console.log(`  ${n.padEnd(30)} ${r.circuit}/${r.block} ${f.key}: covers ${f.covers.join(", ")}`)
    }
  }
  console.log("")
  console.log("drawn-text overlaps (labels against labels and against power values), per quantity:")
  for (const r of runs) {
    for (const n of names) {
      const o = r.textOverlaps.get(n) ?? []
      if (o.length > 0) for (const line of o) console.log(`  ${n.padEnd(30)} ${r.circuit}/${r.block}: ${line}`)
    }
  }
  console.log("")
  for (const r of runs) if (r.refusal !== "") console.log(`  refusal ${r.circuit}/${r.block}: ${r.refusal.split("\n")[0]}`)
  console.log("")
  console.log(`scratch output under ${outDir}`)
}

await main()
