/**
 * The positive control for "the page-one paper notice has cleared".
 *
 * WHAT IS BEING CLAIMED AND WHY IT NEEDS A CONTROL. After the five Pultec
 * sheets were all put on US Letter, a grep for `is not on this document's
 * paper` finds **zero** occurrences in all five `boards/<board>/guide/guide.html`.
 * On its own that is worth nothing: a grep for a string that is never emitted
 * in that spelling also finds zero, in every guide, forever. A cleared notice
 * and a misspelled search term are indistinguishable from the result alone, and
 * "a skipped check must never look like a passing one" is the rule this file
 * answers.
 *
 * SO THIS CALLS THE NOTICE ITSELF. `schematicPaperNotice` from
 * `tools/guide/schematic-notice.ts` is the only thing that emits the notice, and
 * the guide's paper is `GUIDE_PAPER` from `tools/guide/paper.ts`. The control
 * asks it for a notice on a schematic page that is NOT US Letter, and asserts:
 *
 *   1. it emits lines, and the SAME SEARCH STRING the five-guide grep used
 *      matches them - so the search term is spelled the way the emitter spells
 *      it;
 *   2. asked about a US Letter schematic page, it emits NOTHING - so the zero
 *      found in the five guides is the notice being correctly absent, not the
 *      notice being unreachable.
 *
 * It needs no sheet, no render and no guide run, and it is the check that makes
 * the grep over the five guides mean something.
 *
 * usage: bun paper-notice-control.ts
 */
import { GUIDE_PAPER } from "../../../../tools/guide/paper.ts"
import { schematicPaperNotice } from "../../../../tools/guide/schematic-notice.ts"
import type { GuideSchematic } from "../../../../tools/guide/schematic-notice.ts"

/** The exact string grepped over the five `guide.html` files. */
const SEARCH = "is not on this document's paper"

const schematic: GuideSchematic = { kind: "printed", path: "some-sheet.kicad_sch" }

// A3 landscape in points: 1191 x 842. Deliberately not US Letter.
const a3 = { widthPt: 1191, heightPt: 842 }
const letter = { widthPt: GUIDE_PAPER.widthPt, heightPt: GUIDE_PAPER.heightPt }

const onA3 = schematicPaperNotice(schematic, a3)
const onLetter = schematicPaperNotice(schematic, letter)

console.log(`guide paper            ${String(GUIDE_PAPER.widthPt)} x ${String(GUIDE_PAPER.heightPt)} pt`)
console.log(`search string          ${JSON.stringify(SEARCH)}`)
console.log()
console.log(`schematic page on A3     -> ${String(onA3.length)} lines emitted`)
const matched = onA3.filter((l) => l.includes(SEARCH))
console.log(`  lines matching the search string: ${String(matched.length)}`)
for (const l of matched) console.log(`    ${l}`)
console.log(`schematic page on Letter -> ${String(onLetter.length)} lines emitted`)
console.log()

if (onA3.length === 0) {
  throw new Error(
    "CONTROL FAILED: schematicPaperNotice emitted nothing for a schematic page on A3. " +
      "The notice cannot fire at all, so finding zero of it in the five guides says nothing.",
  )
}
if (matched.length === 0) {
  throw new Error(
    `CONTROL FAILED: the notice fired for A3 but no emitted line contains ${JSON.stringify(SEARCH)}. ` +
      "The search string used over the five guides is not the string the emitter writes, so the " +
      "zero it found is a misspelling and not a cleared notice.",
  )
}
if (onLetter.length !== 0) {
  throw new Error(
    `CONTROL FAILED: the notice emitted ${String(onLetter.length)} lines for a schematic page that ` +
      "IS on the guide's paper. It would fire on every correct packet, which is the false alarm " +
      "that devalues it everywhere it is true.",
  )
}

console.log(
  "CONTROL PASSED: the notice fires for a non-Letter schematic page and the five-guide search " +
    "string matches what it writes; it emits nothing for a Letter one. So zero occurrences across " +
    "the five guides is the notice correctly absent.",
)
