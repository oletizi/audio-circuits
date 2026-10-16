/**
 * Four `PinPattern`s that re-point ONE recorded footprint at a different
 * `.kicad_mod`, so each of `occupiedAreaFor`'s refusals is reachable.
 *
 * **WHY THEY RE-POINT A REAL FOOTPRINT RATHER THAN INVENT A NAME.**
 * `geometryOf` runs `admitPattern` before it asks for an occupied area, and
 * `admitPattern` reads the module-level `LEAD_SPANS` directly - a seam its own
 * comment records - so there is no way to inject a span for a made-up name. A
 * synthetic footprint therefore refuses at `unmountable-pattern` for want of a
 * recorded lead span and never reaches the geometry at all. Keeping the recorded
 * name and changing only `source` is what makes these refusals reachable from
 * `geometryOf` as well as from `occupiedAreaFor`, and it needs no `SYNTHETIC:`
 * exemption from `./footprint-names.test.ts`, because no new footprint name
 * exists.
 *
 * **THE TWO FIXTURE FILES CARRY THE SAME PADS AS THE FOOTPRINT THEY STAND IN
 * FOR**, `(0,0)` and `(5,0)`, so an injected pattern is internally consistent:
 * nothing is relying on a pad list that disagrees with the file beside it.
 */
import path from "node:path"
import { PIN_PATTERNS, pinPatternFor } from "../../lib/kicad/pin-pattern.ts"
import type { PinPattern } from "../../lib/kicad/pin-pattern-model.ts"

/** The 2.5mm-bodied film cap: recorded, mountable, and the frozen board's `C19`. */
export const RE_POINTED = "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm"

const FIXTURES = path.resolve(import.meta.dir, "..", "fixtures", "kicad")

/** A hand-written `.kicad_mod` under `tests/fixtures/kicad`, by file name. */
export function fixtureFile(name: string): string {
  return path.join(FIXTURES, name)
}

/** The recorded entry with its `source` replaced, and nothing else touched. */
function rePointed(file: string, version: string): PinPattern {
  const recorded = pinPatternFor(RE_POINTED, PIN_PATTERNS)
  return { ...recorded, source: { ...recorded.source, file, version } }
}

/** A file with a courtyard, two pads and no `F.Fab` graphic at all. */
export const NO_BODY_OUTLINE: PinPattern = rePointed(
  fixtureFile("no-body-outline.kicad_mod"),
  "20260206",
)

/** A file whose `F.Fab` body outline is an `fp_poly`, which is not handled. */
export const POLY_BODY_OUTLINE: PinPattern = rePointed(
  fixtureFile("poly-body-outline.kicad_mod"),
  "20260206",
)

/** A file whose `F.Fab` rectangle states a `start` with only one coordinate. */
export const UNREADABLE_COORDINATE: PinPattern = rePointed(
  fixtureFile("unreadable-coordinate.kicad_mod"),
  "20260206",
)

/**
 * The real installed file, with a version this repository never recorded.
 *
 * `19700101` is not a KiCad token and is not meant to look like one: the point
 * is that the recorded version and the file's disagree, which is what a library
 * update under us looks like.
 */
export const VERSION_CHANGED: PinPattern = rePointed(
  pinPatternFor(RE_POINTED, PIN_PATTERNS).source.file,
  "19700101",
)

/** A path under the fixtures directory that deliberately holds no file. */
export const MISSING_FILE: PinPattern = rePointed(
  fixtureFile("this-fixture-is-deliberately-absent.kicad_mod"),
  "20260206",
)

/**
 * The real map with ONE entry replaced, never a map holding only the fixture.
 *
 * The same reason `tests/stripboard/synthetic-footprints.ts` gives: a map
 * holding just the injected entry would hide every recorded footprint, and a
 * test suite grading itself against nothing passes for the wrong reason.
 */
export function withRePointed(pattern: PinPattern): ReadonlyMap<string, PinPattern> {
  return new Map([...PIN_PATTERNS, [RE_POINTED, pattern]])
}
