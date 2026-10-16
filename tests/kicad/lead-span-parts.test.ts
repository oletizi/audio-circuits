/**
 * THE SPAN TABLE AGAINST THE PARTS CATALOGUE: is the part whose geometry a
 * family records the part `parts/*.json` actually buys?
 *
 * **IT EXISTS BECAUSE THE ANSWER IS NO FOR ONE FAMILY AND NOTHING COULD SEE IT.**
 * `lib/kicad/lead-span.ts` records the DIN0207 family's geometry as Vishay
 * MBB/SMA 0207's, cited to Vishay document 28766. Nine `parts/resistor-*-0207.json`
 * files fit that same footprint with Yageo MFR-25FBF52-xxx.
 * `grep -rn "MFR-25\|Yageo" lib docs/stripboard` returned NOTHING: the geometry
 * stack had never heard of the part the BOM orders, and the only cross-table test
 * in the area was the footprint-coverage pair in `./lead-span.test.ts`, which is
 * about names rather than parts.
 *
 * **WHAT THAT COSTS, STATED RATHER THAN IMPLIED.** Both recorded bounds are a
 * different manufacturer's guarantees than the parts in the drawer. The FLOOR
 * does not move (the MFR-25's worst-case body gives the same five holes), but
 * `leadLengthMm` is the only dimension that sets the MAXIMUM, the recorded
 * 16-hole ceiling is `TOOL_MAX_SPAN_HOLES` clamping a 28mm VISHAY lead, and the
 * Yageo part's lead length is recorded nowhere. `MBB0207`'s own comment and
 * `docs/stripboard/pipeline-verification.md` §9.3 carry the rest.
 *
 * **THIS FILE DOES NOT CLOSE THE GAP - IT PINS IT.** No lead length is invented
 * here: closing it means reading the MFR-25's own figure off its datasheet. What
 * this file forecloses is the gap WIDENING in silence, which is what happened the
 * first time. `DIVERGENT` below is the one recorded mismatch with its reason, and
 * a tenth part file naming a manufacturer the span table has not heard of fails
 * the second test by name rather than being absorbed.
 *
 * **ITS OWN FILE** because `./lead-span.test.ts` is at 469 lines against this
 * repository's 300-500 ceiling, and because the seam is real: that file checks
 * the geometry against its own arithmetic and its own sources, this one checks it
 * against a different table maintained for a different purpose.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { LEAD_SPANS } from "../../lib/kicad/lead-span.ts"
import { isRecord } from "../../lib/guards.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
const PARTS_DIR = path.join(REPO_ROOT, "parts")

interface CataloguePart {
  readonly file: string
  readonly manufacturer: string
  readonly mpn: string
  readonly package: string
}

/**
 * Every `parts/*.json` that states a package, read off disk.
 *
 * REFUSES A FILE IT CANNOT READ rather than skipping it, for the reason
 * `./footprint-library.ts` gives: a catalogue walk that silently dropped the one
 * divergent entry would be a check that passed by looking at less than it claims.
 */
function catalogueParts(): readonly CataloguePart[] {
  const found: CataloguePart[] = []
  for (const name of fs.readdirSync(PARTS_DIR).sort()) {
    if (!name.endsWith(".json")) continue
    const file = path.join(PARTS_DIR, name)
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
    if (!isRecord(parsed)) throw new Error(`${file} does not hold a JSON object`)
    const specs = parsed["specs"]
    if (!isRecord(specs)) continue
    const pkg = specs["package"]
    if (typeof pkg !== "string") continue
    const manufacturer = parsed["manufacturer"]
    const mpn = parsed["mpn"]
    if (typeof manufacturer !== "string" || typeof mpn !== "string") {
      throw new Error(
        `${file} states a package but no string manufacturer and mpn, so the part whose ` +
          "geometry the span table should be recording cannot be named. It is not skipped: a " +
          "part file with a package and no identity is exactly the entry this check exists to " +
          "notice.",
      )
    }
    found.push({ file: path.relative(REPO_ROOT, file), manufacturer, mpn, package: pkg })
  }
  return found
}

/**
 * `specs.package` to the `LEAD_SPANS` footprint that package is fitted to.
 *
 * ENUMERATED BY NAME AND NOT PATTERN-MATCHED. A rule that turned "0207" into a
 * footprint name by string surgery would quietly match a package nobody checked;
 * an empty whitelist that refuses loudly beats a general rule that accepts a
 * guess, which is this repository's own posture. A package not in here is a
 * package whose geometry claim nobody has made, and the first test says how many
 * there are so the number cannot drift to zero unnoticed.
 */
const PACKAGE_FOOTPRINTS: ReadonlyMap<string, string> = new Map([
  ["0207", "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"],
])

/**
 * The recorded divergences: a package whose `LEAD_SPANS` geometry names a
 * DIFFERENT part from the one the catalogue buys.
 *
 * **BOTH SIDES ARE NAMED, AND THAT IS NOT BELT-AND-BRACES.** An entry recording
 * only the manufacturer the span table has would be satisfied by ANY catalogue
 * part for that package - a third manufacturer arriving tomorrow would be
 * absorbed by the entry written for Yageo, which is the widening this file exists
 * to prevent. MEASURED: with the value a bare `"Vishay"`, changing one part file
 * to Vitrohm MRE25-100K left the loop below silent. So an entry pins the
 * catalogue manufacturer as well, and a change to either side fails by name.
 */
interface RecordedDivergence {
  /** The manufacturer `parts/*.json` buys for this package. */
  readonly catalogue: string
  /** The manufacturer `LEAD_SPANS` records the geometry of. */
  readonly recorded: string
  readonly why: string
}

const DIVERGENT: ReadonlyMap<string, RecordedDivergence> = new Map([
  [
    "0207",
    {
      catalogue: "Yageo",
      recorded: "Vishay",
      why:
        "The span table records Vishay MBB/SMA 0207's dimensions as a conservative stand-in. " +
        "The FLOOR is unaffected - the MFR-25's worst-case body gives the same five holes - but " +
        "the 16-hole CEILING is TOOL_MAX_SPAN_HOLES clamping a 28mm Vishay lead, and the Yageo " +
        "part's lead length is recorded nowhere. See MBB0207's comment in lib/kicad/lead-span.ts.",
    },
  ],
])

test("every catalogue package this check knows about resolves to a recorded span family", () => {
  // THE GUARD AGAINST CHECKING NOTHING. Both tests below loop over the
  // intersection of the catalogue and PACKAGE_FOOTPRINTS, so an emptied map or a
  // renamed footprint would make them pass over no parts at all.
  expect(PACKAGE_FOOTPRINTS.size).toBeGreaterThan(0)
  for (const footprint of PACKAGE_FOOTPRINTS.values()) {
    expect(LEAD_SPANS.has(footprint), `${footprint} is not in LEAD_SPANS`).toBe(true)
  }
  const matched = catalogueParts().filter((part) => PACKAGE_FOOTPRINTS.has(part.package))
  expect(matched.length, "the 0207 resistors alone are nine files").toBeGreaterThanOrEqual(9)
})

test("a part whose span geometry names a different manufacturer is a RECORDED divergence", () => {
  // The property: for every catalogue part fitted to a recorded family, either
  // the family's geometry.mpn names that part, or the package is in DIVERGENT
  // with the manufacturer the table actually records. Anything else fails, which
  // is what keeps a tenth divergent part from being absorbed in silence.
  const unaccounted: string[] = []
  for (const part of catalogueParts()) {
    const footprint = PACKAGE_FOOTPRINTS.get(part.package)
    if (footprint === undefined) continue
    const entry = LEAD_SPANS.get(footprint)
    if (entry === undefined) throw new Error(`${footprint} left LEAD_SPANS`)
    // A RIGID FAMILY RECORDS A PACKAGE RATHER THAN AN ORDERABLE PART (`part`,
    // not `mpn`), so there is no manufacturer claim to compare and no divergence
    // to have. Mapping such a package here would be asking a question the data
    // does not answer; it refuses rather than reading `part` as an mpn.
    if (entry.geometry.kind !== "formable") {
      throw new Error(
        `${footprint} is a ${entry.geometry.kind} family, which records a package rather than ` +
          "an orderable part, so PACKAGE_FOOTPRINTS must not map a catalogue package to it: " +
          "there is no manufacturer claim to check. Remove the mapping in " +
          "tests/kicad/lead-span-parts.test.ts, or record the family as formable with the " +
          "part's own datasheet.",
      )
    }
    const recorded = entry.geometry.mpn
    if (recorded.includes(part.mpn) || recorded.includes(part.manufacturer)) continue
    const divergent = DIVERGENT.get(part.package)
    if (
      divergent !== undefined &&
      recorded.includes(divergent.recorded) &&
      part.manufacturer === divergent.catalogue
    ) {
      continue
    }
    unaccounted.push(
      `${part.file}: ${part.manufacturer} ${part.mpn} against geometry.mpn "${recorded}"`,
    )
  }
  expect(
    unaccounted,
    "each of these is a part whose recorded geometry is some other part's, with no entry in " +
      "DIVERGENT saying so",
  ).toEqual([])
  // AND EVERY RECORDED DIVERGENCE STILL APPLIES TO A PART THAT EXISTS. An entry
  // for a package nothing buys is a tolerance nobody can check, and it rots
  // silently - the same reason ./lead-span.test.ts checks the orphan direction.
  const packages = new Set(catalogueParts().map((part) => part.package))
  for (const [pkg, entry] of DIVERGENT) {
    expect(packages, `${pkg} is in DIVERGENT and nothing in parts/ has it`).toContain(pkg)
    expect(entry.why.length, `${pkg}'s divergence has no reason`).toBeGreaterThan(80)
  }
})

test("the 0207 divergence is the one on record, and it is the one the span table has", () => {
  // ASSERTED BY VALUE, so DIVERGENT cannot quietly become a list that absorbs
  // anything: the recorded geometry really does name Vishay and really does not
  // name Yageo, and the catalogue really does buy Yageo. If the span table is
  // corrected to the MFR-25, this test fails and this whole file's reason for
  // existing goes with it - which is the right way for a recorded gap to end.
  const footprint = PACKAGE_FOOTPRINTS.get("0207")
  if (footprint === undefined) throw new Error("the 0207 mapping left PACKAGE_FOOTPRINTS")
  const entry = LEAD_SPANS.get(footprint)
  if (entry === undefined) throw new Error(`${footprint} left LEAD_SPANS`)
  if (entry.geometry.kind !== "formable") throw new Error("the 0207 family must be formable")
  expect(entry.geometry.mpn).toContain("Vishay")
  expect(entry.geometry.mpn).not.toContain("Yageo")
  const resistors = catalogueParts().filter((part) => part.package === "0207")
  expect(resistors.length).toBeGreaterThanOrEqual(9)
  for (const part of resistors) {
    expect(part.manufacturer, part.file).toBe("Yageo")
    expect(part.mpn, part.file).toContain("MFR-25")
  }
  // AND THE UNVERIFIED DIMENSION IS NAMED: the ceiling rests on a lead length
  // that is the Vishay part's, and nothing in parts/ records the Yageo one. This
  // asserts the absence, so the day somebody records it the entry below moves
  // with the table rather than being left behind.
  const text = fs.readFileSync(path.join(PARTS_DIR, "resistor-100k-metal-film-0207.json"), "utf8")
  expect(text.toLowerCase()).not.toContain("leadlength")
  expect(entry.geometry.leadLengthMm, "the recorded ceiling's basis is Vishay's 28mm lead")
    .toBe(28.0)
})
