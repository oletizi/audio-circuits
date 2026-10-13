/**
 * EVERY KiCad FOOTPRINT NAME THIS REPOSITORY WRITES DOWN, CHECKED AGAINST THE
 * INSTALLED LIBRARIES.
 *
 * This is the footprint-side mirror of `./symbol-names.test.ts`, and it exists
 * because the footprint axis had the WEAKER half of the pair although both KiCad
 * names this repository has shipped that nobody can look up were footprints.
 * `./footprint-library.ts` refuses rather than skips, correctly, but until this
 * file landed it was only ever consulted over RECORDED TABLE ENTRIES -
 * `./pin-pattern.test.ts` iterating `PIN_PATTERNS`, and
 * `./lead-span-parts.test.ts`. A fictional footprint written straight into a
 * circuit, a fixture or a test was invisible to every check in the suite, and
 * the two fictional names fixed in the previous round were relabelled
 * `SYNTHETIC:` by convention with nothing enforcing the prefix. **The sweep
 * found nine more the first time it ran**; five were replaced with the real
 * name, three are recorded in `CONSTRUCTED_FOR_A_REFUSAL` with why no real name
 * can serve, and one - `Test_Synthetic:Ring_5Pin_D10mm` - took the enforced
 * prefix.
 *
 * **FOUR SOURCES, BECAUSE NO SINGLE ONE IS COMPLETE.** `./footprint-sweep.ts`
 * holds the first two and says what each catches and what neither covers.
 *
 * 1. Declaration-shaped matches over every `.ts` file.
 * 2. Any `<Library>:<Name>` literal whose library half is an installed footprint
 *    library, wherever it appears - which is how a real library plus a misspelled
 *    name gets caught, the shape BOTH prior defects had.
 * 3. THE DECLARED TABLES, imported rather than matched: `PIN_PATTERNS`,
 *    `LEAD_SPANS`, `UNSOURCED`, `FILM_CAPACITOR_IMPORT_STRINGS` and
 *    `FOOTPRINT_IMPORT_STRINGS`, which are map literals no pattern sees.
 * 4. WHAT PRODUCTION ACTUALLY EMITS: the footprint of every component of every
 *    circuit here. The Pultec boards DERIVE theirs from a capacitance
 *    (`footprintForKind` through `filmFootprint`), so those names are literals
 *    nowhere and only running the deriver can check them.
 *
 * **IT IS GUARDED AGAINST FINDING NOTHING**, the way the symbol sweep is: every
 * arm asserts a floor on what it found and the first names three it must
 * contain. A pattern that stopped matching would otherwise make this file pass
 * by checking an empty set, which is the skipped-check-that-looks-like-a-pass
 * this repository's own rule forbids.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import { LEAD_SPANS, UNSOURCED } from "../../lib/kicad/lead-span.ts"
import {
  FILM_CAPACITOR_IMPORT_STRINGS,
  FOOTPRINT_IMPORT_STRINGS,
} from "../../lib/kicad/import-string.ts"
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"
import { pt2399Core } from "../../circuits/pt2399-core/pt2399-core.ts"
import { opampBuffer } from "../../circuits/opamp-buffer.ts"
import { opticalCompressor } from "../../circuits/optical-compressor/index.ts"
import { transistorPreampLab } from "../../circuits/transistor-preamp/lab-board.ts"
import type { Network } from "../../lib/model/types.ts"
import {
  FOOTPRINT_LIBRARY_ROOT,
  allInstalledFootprintNames,
  installedFootprintLibraries,
  resolveFootprintOnDisk,
} from "./footprint-library.ts"
import {
  CONSTRUCTED_FOR_A_REFUSAL,
  NOT_A_KICAD_FOOTPRINT,
  SYNTHETIC_PREFIX,
  isLibId,
  sweptFootprints,
} from "./footprint-sweep.ts"

const SWEPT = sweptFootprints()

/** A name with the files that declare it, so one bad name is reported once with every site. */
function sites(name: string): string {
  return `${name} (${(SWEPT.get(name) ?? []).join(", ")})`
}

/** Named by its halves, so the literal is not itself a swept claim. */
const REAL_DIP = "Package_DIP:DIP-16_W7.62mm"

test("the sweep finds the footprint declarations it is supposed to, so it cannot pass over nothing", () => {
  // The floor is the count at the time of writing less a little slack, and the
  // three named entries are one per source the two collection patterns cover: a
  // part spec in a circuit, a recorded table entry quoted in a test, and a
  // committed fixture map's value.
  // 56 at the time of writing, measured.
  expect(SWEPT.size).toBeGreaterThanOrEqual(48)
  expect([...SWEPT.keys()]).toContain(REAL_DIP)
  expect([...SWEPT.keys()]).toContain("Package_TO_SOT_THT:TO-92_Inline")
  expect([...SWEPT.keys()]).toContain(
    "TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal",
  )
})

test("every footprint name swept out of the repository resolves in an installed KiCad library", () => {
  const noLibrary: string[] = []
  const noFootprint: string[] = []
  for (const name of SWEPT.keys()) {
    if (name.startsWith(SYNTHETIC_PREFIX)) continue
    if (CONSTRUCTED_FOR_A_REFUSAL.has(name)) continue
    // A BARE NAME IS CHECKED BY THE NEXT TEST, NOT DROPPED. Dropping it is how a
    // declaration this check cannot verify becomes one it pretends to have
    // verified.
    if (!isLibId(name)) continue
    const resolution = resolveFootprintOnDisk(name)
    if (resolution === "no-such-library") noLibrary.push(sites(name))
    if (resolution === "no-such-footprint") noFootprint.push(sites(name))
  }
  expect(
    noLibrary,
    `the <Library> half of these names is not installed under ${FOOTPRINT_LIBRARY_ROOT}; a ` +
      "wholly invented library is how a fictional footprint reads as a real one",
  ).toEqual([])
  expect(
    noFootprint,
    `these libraries are installed but hold no such footprint under ${FOOTPRINT_LIBRARY_ROOT}; ` +
      "verify the name against the .pretty directory rather than from memory",
  ).toEqual([])
})

test("every swept value that is not a KiCad lib id is one this repository has accounted for", () => {
  // THE `footprint` FIELD IS POLYMORPHIC and that is why this exists rather than
  // a blanket "everything must be a lib id". A VeroRoute import-string name and
  // a footprint name transcribed from the retired tscircuit modules both sit in
  // it legitimately, and neither is a claim about an installed library.
  //
  // PINNED IN BOTH DIRECTIONS: a new bare name fails until somebody says what it
  // is, and a recorded one that disappears fails too, so the list cannot rot.
  const bare = [...SWEPT.keys()].filter((name) => !isLibId(name)).sort()
  expect(bare).toEqual([...NOT_A_KICAD_FOOTPRINT.keys()].sort())
  for (const [name, reason] of NOT_A_KICAD_FOOTPRINT) {
    expect(reason.length, name).toBeGreaterThan(20)
  }
})

test("every constructed-for-a-refusal name is still swept, still fictional, and still reasoned", () => {
  // THE SAME DISCIPLINE ON THE OTHER RECORDED LIST. These are names in a real
  // library that the library does not hold, kept only because no installed
  // footprint has the property the refusal under test is about. Both directions
  // again: one that stops being used fails here rather than sitting as a stale
  // exemption, and - the teeth - each must still fail to resolve, so a real name
  // cannot hide behind the list.
  expect([...SWEPT.keys()].filter((name) => CONSTRUCTED_FOR_A_REFUSAL.has(name)).sort())
    .toEqual([...CONSTRUCTED_FOR_A_REFUSAL.keys()].sort())
  for (const [name, reason] of CONSTRUCTED_FOR_A_REFUSAL) {
    expect(resolveFootprintOnDisk(name), name).toBe("no-such-footprint")
    expect(reason.length, name).toBeGreaterThan(60)
  }
})

test("the SYNTHETIC prefix is enforced rather than trusted: no exempt name resolves anywhere", () => {
  // The exemption would otherwise be a hole exactly the size of whatever anybody
  // chose to label. IT IS THE NAME HALF THAT IS CHECKED, not the whole lib id:
  // the prefix replaces the library, so asking whether the lib id resolves could
  // only ever answer no-such-library, which is a tautology and no check at all.
  // Asking whether the NAME exists in ANY installed library catches the one
  // thing this exemption could hide - a real footprint relabelled synthetic to
  // get past the sweep. Driven: relabelling the ring fixture as a real
  // CP_Radial name and prefixing it SYNTHETIC: fails this test and only this
  // test.
  const synthetic = [...SWEPT.keys()].filter((name) => name.startsWith(SYNTHETIC_PREFIX)).sort()
  // Five at the time of writing; a floor rather than an equality, because adding
  // a synthetic fixture is ordinary work and the assertions below are the teeth.
  expect(synthetic.length).toBeGreaterThanOrEqual(5)
  // If KiCad ever ships a library by this name, the exemption stops being safe.
  expect(installedFootprintLibraries().has(SYNTHETIC_PREFIX.slice(0, -1))).toBe(false)
  const installed = allInstalledFootprintNames()
  for (const name of synthetic) {
    expect(installed.has(name.slice(SYNTHETIC_PREFIX.length)), sites(name)).toBe(false)
  }
})

test("every declared footprint table resolves on disk, including the unsourced and override maps", () => {
  const declared = [
    ...PIN_PATTERNS.keys(),
    ...LEAD_SPANS.keys(),
    ...UNSOURCED.keys(),
    ...FILM_CAPACITOR_IMPORT_STRINGS.keys(),
    ...FOOTPRINT_IMPORT_STRINGS.keys(),
  ]
  // `FOOTPRINT_IMPORT_STRINGS` is empty by design, so the floor is the other
  // four: a table that stopped being imported would make this pass over nothing.
  expect(declared.length).toBeGreaterThanOrEqual(12)
  const missing = declared.filter((name) => resolveFootprintOnDisk(name) !== "resolved")
  expect(missing).toEqual([])
})

test("every footprint the circuits actually emit resolves, which is the derived arm", () => {
  const emitted = new Map<string, string>()
  const networks: readonly (readonly [string, () => Network])[] = [
    ...["low-boost", "low-cut", "hi-boost", "hi-cut", "mid"].map(
      (section) => [`pultec/${section}`, () => physicalBoard(section)] as const,
    ),
    ["pt2399-core", pt2399Core],
    ["opamp-buffer", opampBuffer],
    ["optical-compressor", opticalCompressor],
    ["transistor-preamp/lab", transistorPreampLab],
  ]
  for (const [label, build] of networks) {
    for (const component of build().components) {
      const footprint = component.part?.footprint
      if (footprint !== undefined) emitted.set(footprint, `${label}/${component.id}`)
    }
  }
  // ASSERTED BY VALUE, not only checked for existence: "it resolves" would also
  // hold of the wrong film footprint, and the Pultec's capacitor footprints are
  // DERIVED from a capacitance rather than written down, so this is the only
  // place the derivation's answer is pinned.
  expect([...emitted.keys()]).toContain("Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm")
  expect([...emitted.keys()]).toContain("Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm")
  expect(emitted.size).toBeGreaterThanOrEqual(10)
  const missing: string[] = []
  for (const [footprint, where] of emitted) {
    if (!isLibId(footprint)) {
      // A bare name emitted by production is accounted for by the recorded list,
      // which the test above holds to the sweep; it is not a lookup.
      expect(NOT_A_KICAD_FOOTPRINT.has(footprint), `${footprint} (${where})`).toBe(true)
      continue
    }
    if (resolveFootprintOnDisk(footprint) !== "resolved") missing.push(`${footprint} (${where})`)
  }
  expect(missing).toEqual([])
})

test("an absent or empty footprint install refuses, and the message says it does not skip", () => {
  // THE PROPERTY THE WHOLE FILE RESTS ON. Every assertion above reads the
  // installed libraries, so a machine with no KiCad must FAIL here rather than
  // find nothing and pass. Both no-install shapes are driven, because an empty
  // directory and an absent one are different code paths.
  const absent = path.join(os.tmpdir(), "no-such-kicad-footprint-root-9e3f1")
  expect(fs.existsSync(absent)).toBe(false)
  expect(() => installedFootprintLibraries(absent)).toThrow(/does not skip/)
  expect(() => installedFootprintLibraries(absent)).toThrow(/KICAD_FOOTPRINTS/)

  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "kicad-footprints-empty-"))
  try {
    expect(() => installedFootprintLibraries(empty)).toThrow(/does not skip/)
    expect(() => installedFootprintLibraries(empty)).toThrow(/no .pretty footprint libraries/)
  } finally {
    fs.rmSync(empty, { recursive: true, force: true })
  }

  // And the real install is there, so everything above read something.
  expect(installedFootprintLibraries().size).toBeGreaterThan(50)
  expect(resolveFootprintOnDisk(REAL_DIP)).toBe("resolved")
  expect(resolveFootprintOnDisk(`${REAL_DIP}_Nonexistent`)).toBe("no-such-footprint")
  expect(resolveFootprintOnDisk("Nonexistent_Lib:Whatever")).toBe("no-such-library")
})
