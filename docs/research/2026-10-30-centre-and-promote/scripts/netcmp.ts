/**
 * Prove a centred sheet is electrically the sheet it came from, through the
 * repository's own `importNetlist`.
 *
 * Nothing here parses a netlist. `TOOLING.md` trap 5 records a hand-rolled
 * parser merging all 15 hi-cut nets into one 51-member net while printing a
 * clean figure, so `lib/kicad/netlist.ts` does the parsing and `kicad-cli`
 * produces the file. It descends from
 * `../../2026-10-29-mid-full-run/scripts/netcmp-import.ts` and differs in three
 * ways, each closing a way the earlier one could have reported a pass it had
 * not earned:
 *
 *   1. IT COUNTS PARENTHESIS DEPTH BEFORE IT EXPORTS. `kicad-cli sch export
 *      netlist` EXITS 0 on a paren-broken sheet, writing `<components/>` and
 *      `<nets/>`; two empty netlists compare IDENTICAL, so a translation that
 *      destroyed the file would pass every assertion below. The depth is
 *      counted outside quoted strings, and a non-zero final depth or any
 *      negative excursion refuses by name.
 *   2. IT REFUSES A ZERO-COMPONENT OR ZERO-NET IMPORT rather than comparing
 *      it, which is the same trap caught one layer further in - an export that
 *      succeeded structurally but carries nothing.
 *   3. ITS CONTROL MOVES A PIN, which is what the claim is about. The earlier
 *      script deleted a wire; deleting a wire proves the comparator notices a
 *      missing wire. A centring bug does not delete wires - it moves a symbol
 *      without moving the wire that met it, which is exactly a pin leaving its
 *      net. So the control here shifts ONE symbol diagonally by 1.27 mm, off
 *      the grid in BOTH axes so its pins cannot stay on an axis-aligned wire,
 *      and the comparator must report a difference for that pair before any
 *      real result from it is believed.
 *
 * usage: bun netcmp.ts <before.kicad_sch> <after.kicad_sch> [<before2> <after2> ...]
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { importNetlist, KICAD_CLI } from "../../../../lib/kicad/netlist.ts"
import type { ImportedNetlist } from "../../../../lib/kicad/netlist.ts"

/**
 * Parenthesis depth outside quoted strings. Returns the final depth and the
 * most negative excursion; a well-formed sheet gives `0` and `0`.
 */
function parenDepth(text: string): { final: number; minimum: number } {
  let depth = 0
  let minimum = 0
  let inString = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (ch === "\\") i += 1
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === "(") depth += 1
    else if (ch === ")") {
      depth -= 1
      if (depth < minimum) minimum = depth
    }
  }
  return { final: depth, minimum }
}

function requireWellFormed(sheet: string): void {
  const { final, minimum } = parenDepth(readFileSync(sheet, "utf8"))
  if (final !== 0 || minimum < 0) {
    throw new Error(
      `${sheet}: parenthesis depth ends at ${String(final)} and dips to ${String(minimum)}; ` +
        "a well-formed sheet gives 0 and 0. REFUSING to export a netlist from it: " +
        "`kicad-cli sch export netlist` exits 0 on a paren-broken sheet and writes an " +
        "EMPTY components and nets section, and two empty netlists compare identical.",
    )
  }
}

function exportNetlist(sheet: string): ImportedNetlist {
  requireWellFormed(sheet)
  const dir = mkdtempSync(join(tmpdir(), "netcmp-"))
  const out = join(dir, "net.net")
  execFileSync(KICAD_CLI, ["sch", "export", "netlist", "--format", "kicadsexpr", "-o", out, sheet])
  const n = importNetlist(readFileSync(out, "utf8"))
  if (n.components.length === 0 || Object.keys(n.nets).length === 0) {
    throw new Error(
      `${sheet}: the netlist imported ${String(n.components.length)} components and ` +
        `${String(Object.keys(n.nets).length)} nets. REFUSING to compare an empty import - ` +
        "it is what a paren-broken sheet produces, and it compares identical to any other " +
        "empty import.",
    )
  }
  return n
}

/** The partition as a set of sorted member lists, net NAMES ignored. */
function partition(n: ImportedNetlist): Set<string> {
  return new Set(Object.values(n.nets).map((m) => [...m].sort().join(" ")))
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

/** The name-to-pin-set mapping, which neither of the two checks above alone implies. */
function mapping(n: ImportedNetlist): string {
  return Object.keys(n.nets)
    .sort()
    .map((k) => `${k}=${[...(n.nets[k] ?? [])].sort().join(" ")}`)
    .join("\n")
}

function componentFingerprint(n: ImportedNetlist): string {
  return [...n.components]
    .map((c) => `${c.designator}|${c.value}|${c.libPart ?? ""}|${c.footprint ?? ""}`)
    .sort()
    .join("\n")
}

interface Verdict {
  readonly components: boolean
  readonly netNames: boolean
  readonly partition: boolean
  readonly mapping: boolean
}

function report(tag: string, a: ImportedNetlist, b: ImportedNetlist): Verdict {
  const pa = partition(a)
  const pb = partition(b)
  const partitionSame = sameSet(pa, pb)
  const na = new Set(Object.keys(a.nets))
  const nb = new Set(Object.keys(b.nets))
  const onlyA = [...na].filter((x) => !nb.has(x)).sort()
  const onlyB = [...nb].filter((x) => !na.has(x)).sort()
  const namesSame = onlyA.length === 0 && onlyB.length === 0
  const componentsSame = componentFingerprint(a) === componentFingerprint(b)
  const mappingSame = mapping(a) === mapping(b)

  console.log(tag)
  console.log(
    `  components            ${String(a.components.length)} vs ${String(b.components.length)}  ` +
      `designator/value/libpart/footprint: ${componentsSame ? "IDENTICAL" : "DIFFER"}`,
  )
  console.log(`  nets                  ${String(na.size)} vs ${String(nb.size)}`)
  console.log(`  NET NAMES             ${namesSame ? "IDENTICAL" : "DIFFER"}`)
  if (onlyA.length > 0) console.log(`    only in before: ${onlyA.join(", ")}`)
  if (onlyB.length > 0) console.log(`    only in after:  ${onlyB.join(", ")}`)
  console.log(`  PARTITION (pin sets)  ${partitionSame ? "IDENTICAL" : "DIFFERS"}`)
  if (!partitionSame) {
    for (const s of [...pa].filter((x) => !pb.has(x)).sort()) console.log(`    only in before: ${s}`)
    for (const s of [...pb].filter((x) => !pa.has(x)).sort()) console.log(`    only in after:  ${s}`)
  }
  console.log(`  NAME -> PIN SET       ${mappingSame ? "IDENTICAL" : "DIFFERS"}`)
  return { components: componentsSame, netNames: namesSame, partition: partitionSame, mapping: mappingSame }
}

/** One body symbol of `sheet`: where its `(at x y angle)` sits, and its designator. */
interface BodySymbol {
  readonly index: number
  readonly length: number
  readonly x: number
  readonly y: number
  readonly angle: string
  readonly designator: string
}

/**
 * Every symbol placed on the SHEET, in document order - not the `lib_symbols`
 * entries, which sit one tab deeper and carry symbol-local geometry.
 */
function bodySymbols(src: string): BodySymbol[] {
  const out: BodySymbol[] = []
  const block = /\n\t\(symbol\n([\s\S]*?)\n\t\)/g
  for (let m = block.exec(src); m !== null; m = block.exec(src)) {
    const body = m[1]
    if (body === undefined) continue
    const at = /\(at (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)/.exec(body)
    const ref = /\(property "Reference" "([^"]*)"/.exec(body)
    if (at === null || at.index === undefined) continue
    out.push({
      index: m.index + "\n\t(symbol\n".length + at.index,
      length: at[0].length,
      x: Number(at[1]),
      y: Number(at[2]),
      angle: String(at[3]),
      designator: ref === null ? "?" : String(ref[1]),
    })
  }
  return out
}

/**
 * A copy of `sheet` with ONE symbol moved diagonally by 1.27 mm. Off the grid
 * in both axes, so a pin that sat on an axis-aligned wire cannot still sit on
 * it - which is a pin leaving its net, the thing the real comparison claims
 * did not happen.
 *
 * WHY IT TRIES EVERY SYMBOL INSTEAD OF TAKING THE FIRST. The first body symbol
 * on `pultec-hi-boost` is `#FLG01`, a `PWR_FLAG` that is ALREADY FLOATING -
 * its pin touches nothing, so KiCad exports it as its own
 * `unconnected-(#FLG01-...)` net both before and after it is moved, and the
 * comparison correctly reports IDENTICAL. Taking the first symbol therefore
 * made the control report that the comparator was blind when the comparator
 * was fine and the PERTURBATION was inert. A control has to perturb something
 * that is actually connected, and which symbols those are is a property of each
 * sheet - so this searches for one rather than assuming, names the symbol it
 * used, and refuses only when NO symbol on the sheet produces a difference.
 */
function pinMovedCopy(src: string, sym: BodySymbol): string {
  const x = (sym.x + 1.27).toFixed(2)
  const y = (sym.y + 1.27).toFixed(2)
  const perturbed =
    src.slice(0, sym.index) + `(at ${x} ${y} ${sym.angle})` + src.slice(sym.index + sym.length)
  if (perturbed === src) throw new Error("the control perturbation changed nothing")
  const out = join(mkdtempSync(join(tmpdir(), "netctl-")), "control.kicad_sch")
  writeFileSync(out, perturbed)
  return out
}

const args = process.argv.slice(2)
if (args.length === 0 || args.length % 2 !== 0) {
  throw new Error("usage: netcmp.ts <before.kicad_sch> <after.kicad_sch> [<before2> <after2> ...]")
}

let failures = 0
for (let i = 0; i < args.length; i += 2) {
  const before = args[i]
  const after = args[i + 1]
  if (before === undefined || after === undefined) throw new Error("unreachable: pairs checked above")
  console.log("=".repeat(78))
  console.log(`${before}\n  ->  ${after}`)
  console.log()

  // THE CONTROL FIRST, for THIS pair's own before-sheet, so a comparator that
  // cannot see a moved pin is caught before its verdict on the real pair is read.
  const baseline = exportNetlist(before)
  const src = readFileSync(before, "utf8")
  const candidates = bodySymbols(src)
  if (candidates.length === 0) {
    throw new Error(`${before}: no body symbol found to move for the control.`)
  }
  let discriminated: { designator: string; verdict: Verdict } | undefined
  const inert: string[] = []
  for (const sym of candidates) {
    const v = report(
      `  POSITIVE CONTROL: the before-sheet vs itself with ${sym.designator} moved 1.27 mm diagonally`,
      baseline,
      exportNetlist(pinMovedCopy(src, sym)),
    )
    if (!v.partition || !v.mapping) {
      discriminated = { designator: sym.designator, verdict: v }
      break
    }
    inert.push(sym.designator)
    console.log(`    ${sym.designator} is already floating - moving it changes no net; trying the next symbol`)
  }
  if (discriminated === undefined) {
    throw new Error(
      `${before}: moving EVERY one of its ${String(candidates.length)} symbols by 1.27 mm ` +
        "left the netlist identical, so either every symbol on this sheet is floating or this " +
        "comparator cannot detect a moved pin. REFUSING to report on the real pair.",
    )
  }
  console.log(
    `  control discriminates: moving ${discriminated.designator} changes the netlist` +
      (inert.length > 0 ? ` (${inert.join(", ")} tried first and are floating)` : ""),
  )
  console.log()

  const real = report("  REAL PAIR: before vs centred", exportNetlist(before), exportNetlist(after))
  const ok = real.components && real.netNames && real.partition && real.mapping
  console.log(`  VERDICT  ${ok ? "electrically identical" : "NOT IDENTICAL"}`)
  if (!ok) failures += 1
  console.log()
}

if (failures > 0) {
  throw new Error(`${String(failures)} of ${String(args.length / 2)} pairs are not electrically identical`)
}
console.log(`All ${String(args.length / 2)} pairs are electrically identical, each with a control that reported a difference.`)
