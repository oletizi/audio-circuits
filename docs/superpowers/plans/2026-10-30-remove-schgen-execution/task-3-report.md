Status: DONE

Commit: f44e3f0 (pushed to feature/schematics-tooling)

Test summary: bun test 4099 pass / 8 fail (baseline 4096 pass / 8 fail, all 8 pre-existing
SCHGEN_SOURCE-unset failures in tests/schgen/port-fidelity.test.ts; +3 new passing tests);
bun run typecheck clean; make check fails on exactly pt2399-core, transistor-preamp-lab,
transistor-preamp-loop, transistor-preamp-staged, all five Pultec boards ok; the five
drafted/pultec/*/*.generated-do-not-edit.kicad_sch digests are byte-identical before and after
(a1fa4159, e9843e6d, b9e42e6a, 5e1a4139, d4b0b8cc).

Concerns: none. pultecDesignator, JUNCTION_DESIGNATORS and the DESIGNATOR regex moved verbatim
from circuits/pultec/schematic/section-board.ts to the new circuits/pultec/designators.ts, with
only two literal path references updated because the move itself made them stale: the
`../physical/parts.ts` cross-reference in the doc comment became `./physical/parts.ts`, and the
refusal message's "add an entry in ... section-board.ts" became "... designators.ts". No other
file in the repository imported either symbol (verified by repo-wide grep before and after), so
the five schematic/{hi-boost,hi-cut,low-boost,low-cut,mid}.ts files needed no changes - they only
import `sectionAuthoring`, not the designator symbols directly. section-board.ts's own
"what this file declares" module comment was updated to say designators are used here but
declared in ../designators.ts, rather than left to claim a declaration that moved. Added one test
beyond the brief's given two - a throw case for an id whose transformed form is not a valid KiCad
designator - as the positive control for an assertion the original function made that the brief's
test did not exercise.
