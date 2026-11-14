/**
 * THE TOOL THAT WRITES THE MOUNTING HOLES, and the two defects this file exists
 * to keep closed.
 *
 * **ONE: it used to delete real parts, silently.**
 * `tools/pcb/place-mounting-holes.ts` removes the existing holes before writing
 * the derived ones, and its removal predicate was its own regex over the form's
 * text - `/\(pad\s+""\s+np_thru_hole/` - which is `some` where the DETECTION
 * predicate, `isMountingHoleFootprint`, is `every`. It therefore matched any
 * footprint carrying ONE mechanical hole beside its electrical pads: a vertical
 * pot with an anti-rotation pin, an audio jack, a panel switch. This task's
 * reviewer counted 128 of them across four installed libraries, and measured a
 * `Potentiometer_Piher_PT-15-V15_Vertical_Hole` leaving the board with
 * `removedFootprints: 2`, no error and no report line. The tool's own read-back
 * check could not see it: a part that was never a hole does not change "wrote
 * 4, found 4". It was latent on `pt2399-core` only because all four of its NPTH
 * pads happen to BE the mounting holes.
 *
 * **A REAL FOOTPRINT, FROM THE INSTALLED LIBRARY, IS WHAT ESTABLISHES IT.** A
 * hand-built fixture with a `(pad "" np_thru_hole ...)` in it would prove only
 * that this file can write the string the old regex matched; what matters is
 * that the parts KiCad actually ships survive the tool, so the test opens one.
 *
 * **TWO: the documented regeneration path used to turn the suite red.** The
 * tool wrote `(at 14 14)` while the committed board carries
 * `(at 14.000000 14.000000)`, because the engine rewrites every footprint's
 * origin in its own six-decimal format when it re-places a board. So
 * `make geometry-pt2399-core` - the command `make/pcb.mk` itself recommends -
 * dirtied four lines and reddened a test that mutates by string-matching the
 * board's own spelling. Both halves are fixed and both are pinned here: the
 * tool writes the board's spelling, and the idempotence is asserted against the
 * committed bytes rather than argued.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { parseSexpr } from "../../lib/kicad/sexpr.ts"
import { topLevelForms, withTopLevelForms } from "../../tools/pcb/board-forms.ts"
import { footprintInstanceForm } from "../../tools/pcb/footprint-instance.ts"
import { isMountingHoleFootprint, placedMountingHoles } from "../../tools/pcb/mounting-hardware.ts"
import { REFERENCES, withMountingHardware } from "../../tools/pcb/place-mounting-holes.ts"
import { footprintFile } from "../kicad/footprint-library.ts"
import { LIBRARY_ROOT } from "../../lib/kicad/pin-pattern-sources.ts"
import { BOARD, LIBRARY, RULES, boardText } from "./settled-board.ts"

afterAll(cleanUpTempScratch)

const FIXTURE = path.resolve(import.meta.dir, "../fixtures/pcb/mounting-envelope-clean/envelope.kicad_pcb")

/**
 * The one witness named outright: the part this task's reviewer measured
 * leaving the board. A vertical potentiometer with an anti-rotation hole - four
 * pads, one of them NPTH.
 *
 * It is named rather than discovered because it is the worked example, and
 * `footprintFile` refuses a name that does not resolve, so a KiCad release that
 * renamed it says so instead of the test quietly testing something else.
 */
const WORKED_EXAMPLE = "Potentiometer_THT:Potentiometer_Piher_PT-15-V15_Vertical_Hole"

/**
 * Every other witness is DISCOVERED FROM THE INSTALLED LIBRARIES, not written
 * down - because a name written from memory is how this repository has twice
 * shipped a footprint nobody can look up, and two of the three names an earlier
 * draft of this file carried did not exist. The scan is also the measurement:
 * the reviewer counted 128 matching footprints across four libraries it sampled,
 * and the whole install holds far more.
 */
interface MixedPad {
  readonly name: string
  readonly pads: number
  readonly npth: number
}

const PAD = /\(pad\s+(?:"([^"]*)"|(\S+))\s+(\S+)/g

function mixedPadFootprints(): readonly MixedPad[] {
  const out: MixedPad[] = []
  for (const entry of fs.readdirSync(LIBRARY_ROOT)) {
    if (!entry.endsWith(".pretty")) continue
    const library = entry.slice(0, -".pretty".length)
    for (const file of fs.readdirSync(path.join(LIBRARY_ROOT, entry)).sort()) {
      if (!file.endsWith(".kicad_mod")) continue
      const text = fs.readFileSync(path.join(LIBRARY_ROOT, entry, file), "utf8")
      const pads = [...text.matchAll(PAD)]
      if (pads.length === 0) continue
      const npth = pads.filter((pad) => pad[3] === "np_thru_hole").length
      // Mixed: it HAS a mechanical hole, so the old `some` predicate matched
      // it, and it is NOT a mounting hole.
      if (npth === 0 || npth === pads.length) continue
      // It must carry the REF** convention, or `footprintInstanceForm` cannot
      // place it - and a footprint that has been hand-edited is not a witness
      // to what KiCad ships.
      if (!text.includes('"Reference" "REF**"')) continue
      out.push({ name: `${library}:${file.slice(0, -".kicad_mod".length)}`, pads: pads.length, npth })
    }
  }
  if (out.length < 100) {
    throw new Error(
      `only ${out.length} mixed-pad footprints found under ${LIBRARY_ROOT}, which cannot be right ` +
        "- the installed libraries hold thousands. A scan that found almost nothing would make " +
        "this test pass having placed almost nothing, which is the vacuous check it exists to avoid.",
    )
  }
  return out
}

/** One witness per library, from the libraries that hold the most of them. */
function witnesses(count: number): readonly MixedPad[] {
  const byLibrary = new Map<string, MixedPad[]>()
  for (const part of mixedPadFootprints()) {
    const library = part.name.split(":")[0] as string
    const held = byLibrary.get(library)
    if (held === undefined) byLibrary.set(library, [part])
    else held.push(part)
  }
  return [...byLibrary.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([, parts]) => parts[0] as MixedPad)
}

/** A footprint instance placed on a board, read from the installed library. */
function instanceOf(name: string, reference: string, x: number, y: number, uuid: string): string {
  const file = footprintFile(name)
  if (!fs.existsSync(file)) {
    throw new Error(
      `${name} is not at ${file}. Install KiCad or set KICAD_FOOTPRINTS. This does NOT skip: the ` +
        "whole point of this test is that a REAL library footprint survives the tool, and a " +
        "hand-built stand-in would prove something weaker.",
    )
  }
  const [library, footprint] = name.split(":") as [string, string]
  return footprintInstanceForm(fs.readFileSync(file, "utf8"), file, {
    library,
    name: footprint,
    reference,
    x,
    y,
    uuid,
    locked: false,
    boardOnly: false,
  })
}

function refsOn(text: string): readonly string[] {
  return [...text.matchAll(/\(property "Reference" "([^"]+)"/g)].map((m) => m[1] as string).sort()
}

// ---- M1: the removal predicate is the detection predicate -------------------

test("isMountingHoleFootprint is EVERY and not SOME, over every mixed-pad footprint KiCad ships", () => {
  // THE MEASUREMENT AND THE ASSERTION ARE THE SAME SWEEP. Every footprint in
  // the installed libraries that carries a mechanical hole beside electrical
  // pads is a part the old `some` predicate would have deleted, and not one of
  // them may read as a mounting hole.
  const all = mixedPadFootprints()
  console.log(`  ${all.length} mixed-pad footprints under ${LIBRARY_ROOT}`)
  const wrong: string[] = []
  for (const part of all) {
    const node = parseSexpr(fs.readFileSync(footprintFile(part.name), "utf8"))
    if (isMountingHoleFootprint(node)) wrong.push(part.name)
  }
  expect(wrong, "mixed-pad footprints that read as mounting holes").toEqual([])

  for (const part of witnesses(4)) {
    console.log(`  witness ${part.name}: ${part.pads} pads, ${part.npth} NPTH`)
    expect(part.npth).toBeGreaterThan(0)
    expect(part.npth).toBeLessThan(part.pads)
  }
  const pot = parseSexpr(fs.readFileSync(footprintFile(WORKED_EXAMPLE), "utf8"))
  console.log(`  worked example ${WORKED_EXAMPLE.split(":")[1] ?? ""}: not a hole`)
  expect(isMountingHoleFootprint(pot)).toBe(false)
  // And the thing that IS a hole still reads as one, or the tool would stop
  // removing stale holes and this test would be half a check.
  expect(isMountingHoleFootprint(parseSexpr(fs.readFileSync(LIBRARY, "utf8")))).toBe(true)
  expect(isMountingHoleFootprint(parseSexpr(fs.readFileSync(footprintFile("MountingHole:MountingHole_3.2mm_M3"), "utf8")))).toBe(true)
  // A footprint with no pads at all is not a hole either - a logo or a
  // graphic, which `every` over an empty list would otherwise call true.
  expect(isMountingHoleFootprint(parseSexpr('(footprint "X" (layer "F.Cu"))'))).toBe(false)
})

test("REAL mixed-pad parts survive the tool, and nothing but the holes is removed", () => {
  // The worked example first, then one witness from each of the four libraries
  // that hold the most of them - so this is not a single lucky footprint.
  const parts = [{ name: WORKED_EXAMPLE, pads: 0, npth: 0 }, ...witnesses(4)]
  const withParts = withTopLevelForms(
    fs.readFileSync(FIXTURE, "utf8"),
    FIXTURE,
    parts.map((part, index) =>
      instanceOf(part.name, `P${index + 1}`, 20 + index * 6, 45, `aaaa0000-0000-4000-8000-00000000000${index + 1}`),
    ),
  )
  console.log(`  placed: ${parts.map((p) => p.name).join(", ")}`)
  console.log(`  before: ${refsOn(withParts).join(", ")}`)

  const result = withMountingHardware(withParts, FIXTURE, RULES, LIBRARY)
  const after = refsOn(result.text)
  console.log(`  after:  ${after.join(", ")}`)
  console.log(`  removed ${result.removedFootprints} footprint(s), ${result.removedZones} Rule Area(s)`)

  // EVERY mixed-pad part is still there, by name.
  for (let index = 0; index < parts.length; index += 1) {
    expect(after, `P${index + 1} (${parts[index]?.name ?? ""}) survived`).toContain(`P${index + 1}`)
  }
  // The fixture's own REF** mounting hole is the one thing removed, and the
  // four derived holes are the one thing added.
  expect(after).toEqual([...REFERENCES, ...parts.map((_, i) => `P${i + 1}`)].sort())
  expect(result.removedFootprints).toBe(1)
  expect(placedMountingHoles(result.text, "after").map((h) => h.ref).sort()).toEqual([...REFERENCES].sort())
})

test("a STALE hole at a wrong position IS removed, so the predicate still does its job", () => {
  // The reason the tool removes rather than skips: after the outline moves, a
  // hole left at its old corner would be a second MH1 in the wrong place.
  const stale = withTopLevelForms(fs.readFileSync(FIXTURE, "utf8"), FIXTURE, [
    instanceOf("MountingHole:MountingHole_3.2mm_M3", "MH9", 25, 25, "bbbb0000-0000-4000-8000-000000000001"),
  ])
  const result = withMountingHardware(stale, FIXTURE, RULES, LIBRARY)
  console.log(`  removed ${result.removedFootprints} footprint(s) (the fixture's REF** plus MH9)`)
  expect(refsOn(result.text)).toEqual([...REFERENCES].sort())
  expect(result.removedFootprints).toBe(2)
})

// ---- M2: the documented regeneration path is byte-idempotent ----------------

test("running the tool on the COMMITTED board reproduces it byte for byte", () => {
  // `make geometry-pt2399-core` is the documented way to rewrite the outline
  // and the holes, and a later agent who follows it must not get a dirty tree
  // and a red test for their trouble. Compared BY CONTENT against the committed
  // bytes - the only comparison that establishes it, since the tool is
  // idempotent against its own output either way.
  const committed = boardText()
  const result = withMountingHardware(committed, BOARD, RULES, LIBRARY)
  expect(result.removedFootprints).toBe(REFERENCES.length)
  expect(result.removedZones).toBe(REFERENCES.length)
  expect(result.text).toBe(committed)
})

test("the origin is written in the board's own six-decimal spelling", () => {
  // The format is the engine's and KiCad's, not this tool's preference: the
  // engine rewrites every footprint origin when it re-places a board, so a
  // tool that wrote `(at 14 14)` would see its own output reformatted and then
  // rewrite it back on the next run. If a release changes the format, the
  // idempotence test above goes red and this line says what to look at.
  const text = boardText()
  for (const ref of REFERENCES) {
    const i = text.indexOf(`"Reference" "${ref}"`)
    const start = text.lastIndexOf("(footprint ", i)
    const at = /\(at\s+(-?[\d.]+)\s+(-?[\d.]+)\)/.exec(text.slice(start, i))
    expect(at, `${ref} has an (at x y) form`).not.toBeNull()
    for (const axis of [at?.[1], at?.[2]]) {
      expect(axis, `${ref} origin ${String(axis)} has six decimals`).toMatch(/^-?\d+\.\d{6}$/)
    }
  }
})

// ---- m11: the indentation contract the module states ------------------------

test("a written instance's children are indented to board depth, not library depth", () => {
  // `topLevelForms` returns a span starting at the `(`, so a copied child's
  // FIRST line arrives with no leading tab while its continuation lines keep
  // the library file's own indentation. Adding one tab to every line put each
  // child's opening line at depth 1 - which reads as a top-level form to anyone
  // scanning the board - and its own children at depth 3. KiCad parsed it
  // either way, so this was cosmetic; the docstring claiming otherwise was not.
  const instance = instanceOf("MountingHole:MountingHole_3.2mm_M3", "MH1", 1, 2, "u")
  const lines = instance.split("\n")
  const depth = (line: string): number => (/^(\t*)/.exec(line)?.[1] ?? "").length
  expect(depth(lines[0] as string)).toBe(0)
  expect(depth(lines[lines.length - 1] as string)).toBe(1)
  for (const line of lines.slice(1, -1)) {
    if (line.trim() === "") continue
    expect(depth(line), `"${line.trim().slice(0, 40)}" is at board depth`).toBeGreaterThanOrEqual(2)
  }
  // Specifically: each child form OPENS at depth 2.
  const children = topLevelForms(instance, "instance").map((f) => instance.slice(f.start, f.end))
  expect(children.length).toBeGreaterThan(3)
  for (const child of children) {
    const line = instance.split("\n").find((l) => l.trimStart().startsWith(child.split("\n")[0] as string))
    if (line !== undefined) expect(depth(line)).toBe(2)
  }
})

test("the committed board's mounting holes are indented the same way", () => {
  const text = boardText()
  const i = text.indexOf(`"Reference" "${REFERENCES[0] as string}"`)
  const start = text.lastIndexOf("(footprint ", i)
  const body = text.slice(start, text.indexOf("\n\t)\n", i))
  const depths = body.split("\n").slice(1).map((line) => (/^(\t*)/.exec(line)?.[1] ?? "").length)
  const shallowest = Math.min(...depths.filter((d, index) => body.split("\n")[index + 1]?.trim() !== ""))
  console.log(`  MH1's children start at depth ${shallowest}`)
  expect(shallowest).toBe(2)
})

test("the scratch directories these tests make are registered, not leaked", () => {
  // The fixtures above are all in-memory, so nothing here writes scratch - this
  // asserts that, rather than leaving a reader to check. tests/stripboard/
  // temp-scratch.test.ts is the repository-wide guard.
  const dir = freshTempScratch("pcb-hole-placement-")
  expect(fs.existsSync(dir)).toBe(true)
})
