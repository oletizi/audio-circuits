/**
 * NO DECLARED DESIGN MAY NAME A SHEET FILE THE GENERATOR ALSO WRITES AS THE PROJECT ROOT.
 *
 * Hand-written, and it is the home of what `docs/known-gaps.md` **G284** recorded before that
 * entry was deleted with its resolution on 2026-10-25. The measurement was: `generatedFiles`
 * (`tools/schgen/generated-files.ts`) writes the hierarchical root as `${project}.kicad_sch` and
 * then one file per declared sheet, and its `add` refuses a repeated name - so a single-sheet
 * design that names its sheet after the project throws
 * `generate: two generated files are named <x>.kicad_sch` **after** validation and layout have
 * both passed, having written nothing.
 *
 * **THIS IS G284's CRITERION AND NOT ITS PREFERRED MECHANISM, and the deviation is deliberate.**
 * The entry's mechanism (b) was to have `lib/schgen/authoring.ts`'s `authoringProblems` refuse a
 * `SheetSpec` whose `file` is `${project}.kicad_sch`. **That checks the wrong name**, by the
 * entry's own evidence: `authoringProblems` sees a `SchematicAuthoring`, whose `project` field
 * G284 established is used for **error-message text at all five of its call sites and never names
 * a file**. The root is named from the `DesignSpec`'s project, which `parityDesign`
 * (`tools/schgen/gate-census.ts`) builds from the CASE NAME in
 * `tools/schgen/board-declarations.ts`. Checking the declaration's own `project` would repeat the
 * exact error G284's own first version made - comparing a column that does not decide the
 * collision - and would have reported `transistor-preamp` as colliding when it does not.
 *
 * So the check lives where **both** names are known: over `ALL_DECLARED_CASES`, which is also the
 * registry a new declaration has to be added to, so a new design cannot acquire the trap silently.
 *
 * **THE METHOD LESSON G284 CARRIED, PRESERVED HERE BECAUSE THAT ENTRY IS DELETED WITH ITS
 * RESOLUTION.** G284's own first version said ALL THIRTEEN designs collided. They did not - the
 * figure is eleven - and the cause of the error is worth more than the number: its writer read
 * the `project:` field off each `SchematicAuthoring` and compared it against the sheet's `file`,
 * **a column that does not decide the collision.** The figure was corrected only when a later
 * round drove the comparison over all thirteen cases in code instead of reading a field by eye.
 * That is why the check below is a sweep over the registry rather than a rule anyone applies by
 * inspection, and why it asserts the registry is non-empty before concluding anything from it.
 *
 * **AND ONE DESIGN ESCAPES BY ACCIDENT RATHER THAN BY DESIGN, which this check now guards.**
 * `transistor-preamp`'s case name is `transistor-preamp` while its sheet is
 * `transistor-preamp-lab.kicad_sch`, so nothing collides - but that is a mismatch between two
 * names somebody would reasonably align, and aligning them would start the collision. Under the
 * sweep below that alignment fails loudly instead of landing as a runtime throw in whichever
 * board next reaches generation.
 *
 * **WHY A TEST AND NOT A RUNTIME REFUSAL.** `generatedFiles` already refuses at runtime; the
 * problem G284 records is that the refusal arrives only for a design that gets that far, and ten
 * of the eleven colliding designs are blocked by an earlier refusal and so could never reach it.
 * A test over the registry checks every declaration whether or not its board draws, which is
 * precisely the gap. The runtime refusal is NOT removed - it is the backstop for a path that does
 * not come through `ALL_DECLARED_CASES`.
 */

import { describe, expect, it } from "bun:test";
import { ALL_DECLARED_CASES } from "../../tools/schgen/board-declarations.ts";

/** What `generatedFiles` writes the hierarchical root as, for a case named `name`. */
const rootFileOf = (name: string): string => `${name}.kicad_sch`;

describe("a declared design's sheet files never collide with its generated root", () => {
  it("the registry is non-empty, so an empty sweep cannot pass as a clean one", () => {
    expect(ALL_DECLARED_CASES.length).toBeGreaterThan(10);
  });

  it("every declared case's sheet files differ from the root the generator writes for it", () => {
    const collisions = ALL_DECLARED_CASES.flatMap((c) => {
      const root = rootFileOf(c.name);
      return c.authoring.sheets.filter((s) => s.file === root).map((s) => `${c.name}: sheet ${s.id} is "${s.file}", which is also the generated root`);
    });
    expect(collisions).toEqual([]);
  });

  it("every declared case declares at least one sheet, so a case with none cannot pass vacuously", () => {
    for (const c of ALL_DECLARED_CASES) {
      expect(c.authoring.sheets.length, `${c.name} declares no sheets`).toBeGreaterThan(0);
    }
  });

  /**
   * The control. Without it, the sweep above passes if `rootFileOf` is wrong, if `sheets` is
   * empty, or if the comparison never matches anything - the three ways a sweep reports a clean
   * result it never established.
   */
  it("CONTROL: the comparison does detect a collision when one exists", () => {
    const c = ALL_DECLARED_CASES[0];
    expect(c).toBeDefined();
    if (c === undefined) return;
    const planted = [{ ...c.authoring.sheets[0]!, file: rootFileOf(c.name) }];
    const found = planted.filter((s) => s.file === rootFileOf(c.name));
    expect(found.length).toBe(1);
  });
});
