/**
 * THE CONTRACT OVER `tests/fixtures/pcb/pt2399-core-empty/pt2399-core.kicad_pcb`:
 * what it is, and that it has not drifted from the board it is a copy of.
 *
 * WHY A COPY OF A LIVE ARTIFACT EXISTS. The headless update tool refuses a board
 * that already holds footprints, and its tests used to copy
 * `circuits/pt2399-core/pt2399-core.kicad_pcb` as their EMPTY input. Running the
 * tool against that board for real - the act the tool exists for - filled it,
 * and 25 tests then refused at `board-not-empty` before reaching the guard each
 * was written for. The circuit's board is a MOVING artifact (an outline, tracks,
 * a revision bump); what those tests need is a FIXED empty input. Asking one
 * file to be both is what produced the false reds.
 *
 * WHAT THE COPY BUYS, AND THEREFORE WHAT MUST STAY TRUE. It is the real board's
 * own layer stack, `(setup)` block and DRC floors, which is what makes the
 * end-to-end test a test of THIS circuit rather than of a toy - and R8
 * (`setup-block`) exists specifically to prove the tool preserves its input's
 * setup, so a hand-built input would satisfy R8 while establishing nothing about
 * this board. If the committed board's configuration changes and this fixture
 * does not, every test on it keeps passing against a configuration the circuit
 * no longer has.
 *
 * THE FIRST VERSION OF THIS GUARD DID NOT CATCH THAT, and the review drove it.
 * It compared setup KEY NAMES in ONE direction, with `lostSetupKeys`. Deleting
 * `(pad_to_mask_clearance 0)` from the fixture left it green, and - worse for
 * the drift this file is actually about - `setupKeysOf` discards VALUES, so the
 * committed board changing that clearance from 0 to a real figure left the key
 * set identical and the guard green. Five fixture keys against the committed
 * board's forty-four made the relation near-trivial as well.
 *
 * SO THE COMPARISON IS BY CONTENT, IN BOTH DIRECTIONS, WITH THE ADDITIONS
 * ENUMERATED. `(layers)` must match exactly both ways. In `(setup)`, every
 * `key=value` the fixture has must appear identically in the committed board,
 * and every entry the committed board has and the fixture does not must have its
 * key on `EXPECTED_SETUP_ADDITIONS` - which is the measured list of values KiCad
 * writes out after a load-and-save, not a wildcard. A real divergence therefore
 * forces a deliberate edit to that list rather than passing quietly.
 */
import { test, expect } from "bun:test"
import crypto from "node:crypto"
import fs from "node:fs"
import { parseSexpr, child } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"
import { COMMITTED_BOARD, EMPTY_BOARD } from "../support/pcb-update.ts"
import { surveyBoard } from "../../tools/pcb/board-survey.ts"

/**
 * The fixture's provenance, PINNED IN CODE rather than asserted in prose.
 *
 * These are the bytes committed by `aa5034b`, "pcb: KiCad project and empty
 * 2-layer board for pt2399-core" - the commit that created the board. The whole
 * fixture rests on that claim, and `NOTES.txt` beside the file can only state
 * it; this is what makes it fail if the file is ever edited by hand. A
 * deliberate re-baseline is then a deliberate edit to this constant, which is
 * the point.
 *
 * The commit hash is NOT checked here, and that is deliberate: resolving it
 * would couple a unit test to a subprocess and to history staying
 * rewrite-free, and would break in an export or tarball. The hash identifies
 * the bytes; the commit is where they came from.
 */
const FIXTURE_SHA256 = "493c8ffff6512d05c3c2ea1232ed542e45b8e9886e6d4a1401962374d766365b"

/**
 * Every `(setup)` entry the committed board carries and the fixture does not, by
 * KEY. MEASURED, by taking the difference against the populated board on
 * 2026-11-13 - not reasoned about and not a pattern.
 *
 * All of them are values KiCad previously left implicit and wrote out when
 * `pcbnew` loaded and saved the board; `tools/pcb/update-from-schematic.ts`'s R8
 * comment names that growth as expected. VALUES are not pinned for these,
 * because a plot parameter changing is not drift in the configuration the update
 * tests depend on; what is pinned is that no NEW kind of setup entry appears
 * without somebody adding it here.
 */
const EXPECTED_SETUP_ADDITIONS: readonly string[] = [
  "capping",
  "covering/back",
  "covering/front",
  "filling",
  "pcbplotparams/creategerberjobfile",
  "pcbplotparams/crossoutdnponfab",
  "pcbplotparams/dashed_line_dash_ratio",
  "pcbplotparams/dashed_line_gap_ratio",
  "pcbplotparams/disableapertmacros",
  "pcbplotparams/drillshape",
  "pcbplotparams/dxfimperialunits",
  "pcbplotparams/dxfpolygonmode",
  "pcbplotparams/dxfusepcbnewfont",
  "pcbplotparams/hidednponfab",
  "pcbplotparams/mirror",
  "pcbplotparams/mode",
  "pcbplotparams/outputformat",
  "pcbplotparams/pdf_back_fp_property_popups",
  "pcbplotparams/pdf_front_fp_property_popups",
  "pcbplotparams/pdf_metadata",
  "pcbplotparams/pdf_single_document",
  "pcbplotparams/plot_black_and_white",
  "pcbplotparams/plot_on_all_layers_selection",
  "pcbplotparams/plotframeref",
  "pcbplotparams/plotpadnumbers",
  "pcbplotparams/psa4output",
  "pcbplotparams/psnegative",
  "pcbplotparams/scaleselection",
  "pcbplotparams/sketchdnponfab",
  "pcbplotparams/sketchpadsonfab",
  "pcbplotparams/subtractmaskfromsilk",
  "pcbplotparams/svgprecision",
  "pcbplotparams/useauxorigin",
  "pcbplotparams/usegerberadvancedattributes",
  "pcbplotparams/usegerberattributes",
  "pcbplotparams/usegerberextensions",
  "plugging/back",
  "plugging/front",
  "tenting/back",
  "tenting/front",
]

/** Leaf entries of a block as `path=value`, so a VALUE change is a different entry. */
function leafEntries(node: SNode, prefix: string, into: string[]): void {
  for (const sub of node.nodes) {
    if (sub.name === "") continue
    const key = prefix === "" ? sub.name : `${prefix}/${sub.name}`
    if (sub.nodes.length === 0) into.push(`${key}=${sub.atoms.join(" ")}`)
    else leafEntries(sub, key, into)
  }
}

function blockContent(boardPath: string, blockName: string): readonly string[] {
  const board = parseSexpr(fs.readFileSync(boardPath, "utf8"))
  const block = child(board, blockName)
  if (block === undefined) {
    throw new Error(
      `${boardPath} has no (${blockName}) block, so it cannot be compared. An absent block is not an empty one: ` +
        "reading it as empty would make every comparison below pass.",
    )
  }
  if (blockName === "layers") {
    // A layer is `(<ordinal> "<name>" <type> ["<user name>"])` - the whole form
    // is the content, so it is compared as written rather than by leaf.
    return block.nodes.map((layer) => `${layer.name} ${layer.atoms.join(" ")}`).sort()
  }
  const entries: string[] = []
  leafEntries(block, "", entries)
  return entries.sort()
}

const keyOf = (entry: string): string => entry.slice(0, entry.indexOf("="))

test("the fixture is the exact bytes its provenance claims", () => {
  const sha = crypto.createHash("sha256").update(fs.readFileSync(EMPTY_BOARD)).digest("hex")
  expect(sha).toBe(FIXTURE_SHA256)
})

test("the fixture is empty, which is the one property the update tool requires of it", () => {
  const fixture = surveyBoard(EMPTY_BOARD)
  expect(fixture.footprints).toBe(0)
  expect(fixture.nettedPads).toBe(0)
  // And not vacuously empty: it is a real board with a real (setup) block.
  expect(fixture.setupKeys.length).toBeGreaterThan(0)
})

test("the fixture's (layers) matches the committed board's exactly, in both directions", () => {
  // No additions are expected here: the layer stack is the thing a 2-layer board
  // IS, and `pcbnew` rewrites it unchanged. An exact comparison is therefore
  // right, and a sorted-array equality says which layer differs.
  const fixture = blockContent(EMPTY_BOARD, "layers")
  const committed = blockContent(COMMITTED_BOARD, "layers")
  expect(fixture).toEqual(committed)
  expect(fixture.length).toBeGreaterThan(0)
})

test("no (setup) entry of the fixture's differs from the committed board's, by value as well as by key", () => {
  // THE DIRECTION THE OLD GUARD HAD, now over CONTENT. A value change on a
  // shared key shows up here as an entry the fixture has and the committed board
  // does not, which is what the key-only comparison could not see.
  const fixture = blockContent(EMPTY_BOARD, "setup")
  const committed = new Set(blockContent(COMMITTED_BOARD, "setup"))
  expect(fixture.filter((entry) => !committed.has(entry))).toEqual([])
  expect(fixture.length).toBeGreaterThan(0)
})

test("every (setup) entry the committed board has gained is one this file enumerates", () => {
  // THE DIRECTION THE OLD GUARD DID NOT HAVE. A new setup entry on the real
  // board - a DRC-relevant one, not just a plot parameter - fails here until
  // somebody looks at it and decides whether the fixture needs re-baselining.
  const fixture = new Set(blockContent(EMPTY_BOARD, "setup"))
  const gained = blockContent(COMMITTED_BOARD, "setup").filter((entry) => !fixture.has(entry))
  const unexplained = gained.filter((entry) => !EXPECTED_SETUP_ADDITIONS.includes(keyOf(entry)))
  expect(
    unexplained,
    "the committed board's (setup) block has entries the empty-board fixture neither has nor expects. Either the " +
      "fixture needs re-baselining from the current board (and FIXTURE_SHA256 updating with it), or these keys " +
      "belong on EXPECTED_SETUP_ADDITIONS - decide which, rather than widening the list to make this pass.",
  ).toEqual([])
  // PINNED IN BOTH DIRECTIONS: a key that stops being an addition fails too, so
  // the list cannot rot into a set of exemptions for things that no longer exist.
  expect([...new Set(gained.map(keyOf))].sort()).toEqual([...EXPECTED_SETUP_ADDITIONS].sort())
})
