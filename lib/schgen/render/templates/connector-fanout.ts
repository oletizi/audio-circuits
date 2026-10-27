/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/connectorFanout.ts`, and
 * DIVERGED from it by Task 8 of the M1 schematic-authoring plan: its three refusal sites are
 * classified, and the third is **the only `clearance` site in the whole template set**.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * connector-fanout: a connector (or any anchor part) with every connected pin fanned straight out
 * through its own series path to a rail or label, rows spread apart where their parts and text
 * need more room than the pin pitch (fanoutRows). The first rotation whose layout passes
 * `checkLayout` (text clearance included) is used; the template adds no connection the IR does not hold.
 *
 * **THE THREE REFUSALS, AND WHY THE THIRD IS NOT LIKE THE OTHER TWO.** No anchor and a refused
 * trace are shape tests over the subgraph - nothing has been drawn, another renderer may draw it,
 * `not-applicable`. The third has drawn **four** layouts, one per rotation, run `checkLayout` on
 * each and found a collision in every one. That is a defect in this template's output on this
 * block, not a statement that the idiom does not apply, so it is a `clearance` mismatch naming the
 * constraint and the two obstacles of rotation 0's first problem - and `selectRenderer` refuses on
 * it rather than letting ELK rescue it, which is `docs/known-gaps.md` **G84**'s whole point.
 *
 * **DIVERGED FURTHER BY TASK 3 of `docs/superpowers/plans/2026-10-27-gates-classify.md`:** that
 * third refusal now carries the rotation-0 layout and `checkLayout`'s own findings on it, so the
 * drawing survives the refusal and is classified rather than hidden. It is the only template site
 * in the set that has geometry to hand back.
 */
import { clearanceViolation, notApplicable, type BlockSubgraph, type Drawn, type RealiseResult, type Template } from "../block-types.ts";
import { fanout, tracePaths } from "../fanout-kit.ts";
import { ROTATIONS } from "../geometry.ts";
import { checkLayout } from "../layout-check.ts";
import { obstaclesOf } from "../problem-obstacles.ts";

function realise(g: BlockSubgraph): RealiseResult {
  const r = g.block.rendering;
  const anchor = r.kind === "wired" ? r.anchor : null;
  if (anchor === null) return notApplicable("connector-fanout needs an anchor");
  const unit = g.units.find((u) => u.part.label === anchor.part && u.unit === anchor.unit);
  if (unit === undefined) throw new Error(`unreachable: validated anchor ${anchor.part}#${anchor.unit} is a member of block ${g.block.id}`);
  const traced = tracePaths(g, unit, new Set());
  // A FORWARD of the fan-out primitive's mismatch, which is always `not-applicable`.
  if (!traced.ok) return { ok: false, mismatch: traced.mismatch };
  // **THE FIRST FAILING ROTATION'S DRAWING IS KEPT, NOT JUST ITS PROBLEM TEXT** - Task 3 fix round 1
  // of `docs/superpowers/plans/2026-10-27-gates-classify.md`, and this was a live hole in exactly
  // the thing that task exists to close. This loop had the geometry AND `checkLayout`'s `Finding[]`
  // in hand and threw both away, keeping only `.what` strings, so the refusal below carried no
  // `Drawn` and `render/blocks.ts` hid the picture. **It is NOT like the fourteen forward sites that
  // legitimately carry nothing**: those are shape and reachability verdicts taken before anything is
  // drawn, and this one has a complete layout.
  //
  // **THE REACHABLE PATH IS A `wired` BLOCK, NOT AN `auto` ONE, and the review that found this hole
  // said `auto`.** The anchor comes from `r.kind === "wired" ? r.anchor : null` at the top of this
  // function, so an `auto` block always takes the `not-applicable` arm here and can never reach the
  // refusal below. What reaches it is a block whose author DECLARED this template, which is what
  // `tests/schgen/render/templates/connector-fanout.test.ts`'s `EAR` fixture is - and
  // `selectRenderer` makes a non-`not-applicable` template mismatch FINAL, so that block was
  // refused with its drawing hidden. Same hole, one declaration away from where it was reported.
  let firstFail: Drawn | null = null;
  for (const rot of ROTATIONS) {
    const layout = fanout(g, unit, rot, traced.paths);
    const problems = checkLayout(g, layout);
    if (problems.length === 0) return { ok: true, layout };
    if (firstFail === null) firstFail = { layout, findings: problems };
  }
  const firstProblems = (firstFail?.findings ?? []).map((p) => p.what);
  const reason = `connector-fanout found no rotation without collisions (rotation 0: ${firstProblems.join("; ")})`;
  const first = firstProblems[0];
  // Both conditions are the same disagreement and neither is reachable: `firstFail` is set on every
  // iteration that records a problem, and it is only set when `problems.length > 0`. They are tested
  // together rather than asserted away, because the alternative is a non-null assertion.
  if (first === undefined || firstFail === null) {
    throw new Error(
      `block ${g.block.id}: connector-fanout rejected every rotation but checkLayout reported no problem for ` +
        "rotation 0. The loop only records problems when there are some, so the two disagree: this is a defect " +
        "in render/templates/connector-fanout.ts or in checkLayout, not a layout that cannot be drawn.",
    );
  }
  const pair = obstaclesOf(first);
  if (pair === null) {
    // Refuse rather than guess. An invented obstacle pair would be a classification nobody can
    // check, in the field a reader trusts most; and `selectRenderer` turns this throw into a
    // `backend-raised` mismatch, so the block is still refused rather than quietly drawn.
    throw new Error(
      `block ${g.block.id}: connector-fanout cannot name the two obstacles of checkLayout's first problem, ` +
        `"${first}", so it cannot report a clearance mismatch for it. Add that problem's relation phrase to ` +
        "RELATIONS in lib/schgen/render/problem-obstacles.ts, with the function that writes it. It is not " +
        `defaulted because the pair is what makes a clearance refusal actionable. The full refusal was: ${reason}`,
    );
  }
  return clearanceViolation(g.block.id, pair.constraint, pair.obstacles, reason, firstFail);
}

export const connectorFanout: Template = { id: "connector-fanout", realise };
