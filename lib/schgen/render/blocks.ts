/**
 * Ported from digital-pedal-platform's `tools/schgen/render/blocks.ts`, and DIVERGED from it by
 * Task 8 of the M1 schematic-authoring plan: `selectRenderer` is new, `realiseBlock` is rewired
 * around it and takes an ELK backend, and the thrown refusals carry a classified `Mismatch`.
 * **Diverged further by Task 13 under ruling R29**: `subgraphOf` resolves each unit's drawn
 * rotation once (`rotationOf`) and carries the circuit's `portDirections` onto the subgraph.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * The block layout contract: a wired block's IR subgraph goes to its template, and the template's
 * layout is checked against the IR before anything is drawn. A template that cannot realise its
 * subgraph, or that produces a layout whose geometry disagrees with the IR, is a generation error.
 */
import { labelledNets, pinsOfUnit } from "../ir/classify.ts";
import { drawnRotation } from "../rules/orientation.ts";
import type { Rotation } from "./geometry.ts";
import type { BlockId, Circuit, IrPart, NetName, RailSpec, Rendering, TemplateId } from "../ir/types.ts";
import {
  backendRaised, describeMismatch,
  type Backend, type BlockLayout, type BlockSubgraph, type BlockUnit, type Mismatch, type RealiseResult,
  type Selection, type Template,
} from "./block-types.ts";
import { checkLayout } from "./layout-check.ts";
import { intersheetRefs } from "./page-refs.ts";
import type { LibSymbol, SymbolResolver } from "./library.ts";
import { TEMPLATES } from "./templates/index.ts";

export { checkLayout, layoutItems, placedNoConnects, placedPins, type PlacedPin } from "./layout-check.ts";

/**
 * The rotation one unit of `part` is drawn at: spec §1.5 step 2's answer where the rule gave one,
 * the symbol's own library frame where it declined (`drawnRotation`). Ruling **R29**.
 *
 * **THE MAP IS PER-PART AND A UNIT IS NOT A PART, SO A MULTI-UNIT PACKAGE CARRYING A PREFERENCE
 * REFUSES RATHER THAN GUESSING.** R29 names this as the wrinkle to handle rather than discover.
 * `rules/orientation.ts`'s one entry applies only to `RAIL_END_KINDS` - resistor, capacitor,
 * inductor, photoresistor - which are single-unit passives, so the refusal below cannot fire on
 * anything in this repository today. It is here because the rule library is meant to grow, and
 * the guess it refuses is a specific and plausible one: applying one part-level rotation to every
 * section of a dual op-amp would rotate the section the rule was never asked about. Which unit a
 * part-level preference means is a question only whoever extends the rule can answer.
 *
 * A `null` for a multi-unit part is NOT a refusal: the rule declined, every unit draws in the
 * library frame, and there is nothing to distribute.
 */
function rotationOf(c: Circuit, id: BlockId, part: IrPart, symbol: LibSymbol): Rotation {
  const preferred = c.orientations.get(part.label);
  if (preferred === undefined) {
    throw new Error(
      `block ${id}: Circuit.orientations has no entry for part ${part.label}. The map is total ` +
        "over the circuit's parts by construction (buildCircuit refuses a hole in it), so an " +
        "absence here means this Circuit was assembled by something other than buildCircuit. It " +
        "is not read as null, because null is spec 1.5's rule library declining and would draw " +
        "the part in the library frame - indistinguishable from a part nobody asked about.",
    );
  }
  if (preferred !== null && symbol.unitCount > 1) {
    throw new Error(
      `block ${id}: part ${part.label} is drawn with ${symbol.libId}, which has ` +
        `${symbol.unitCount} units, and spec 1.5's orientation rule prefers rotation ${preferred} ` +
        "for it. Circuit.orientations is keyed per PART and an ELK node is per UNIT, so there is " +
        "no stated answer for which unit that rotation is about. It refuses rather than applying " +
        "it to every unit: a section the rule was never asked about would be turned with the one " +
        "it was. Extend lib/schgen/rules/orientation.ts to answer per unit, or leave the part " +
        "null and let the backend place it in the library frame (ruling R29).",
    );
  }
  return drawnRotation(preferred);
}

export function subgraphOf(c: Circuit, id: BlockId, symbols: SymbolResolver): BlockSubgraph {
  const block = c.blocks.get(id);
  if (block === undefined) throw new Error(`unknown block ${id}`);
  const units: BlockUnit[] = block.members.map((m) => {
    const part = c.parts.get(m.part);
    if (part === undefined) throw new Error(`block ${id}: unknown part ${m.part}`);
    const symbol = symbols.resolve(part.libId);
    return {
      part, unit: m.unit, symbol, pins: pinsOfUnit(c, m.part, m.unit),
      rot: rotationOf(c, id, part, symbol),
    };
  });
  const touched = new Set(units.flatMap((u) => u.pins.flatMap((p) => (p.net === null ? [] : [p.net]))));
  const rails = new Set([...touched].filter((n) => c.rails.has(n)));
  const groundRails = new Set([...rails].filter((n) => c.rails.get(n)?.kind === "ground"));
  const labelled = labelledNets(c);
  const external = new Set([...touched].filter((n) => labelled.has(n) && !rails.has(n)));
  const railSpecs = new Map<NetName, RailSpec>();
  const powerLibs = new Map<string, LibSymbol>();
  for (const n of rails) {
    const spec = c.rails.get(n);
    if (spec === undefined) throw new Error(`block ${id}: rail ${n} has no spec`);
    railSpecs.set(n, spec);
    powerLibs.set(spec.symbol, symbols.resolve(spec.symbol));
  }
  const pageRefs = intersheetRefs(c);
  const labelRefs = new Map<NetName, string>();
  for (const n of external) {
    const refs = pageRefs.get(n);
    if (refs === undefined) throw new Error(`block ${id}: labelled net ${n} has no intersheet references`);
    labelRefs.set(n, refs);
  }
  return { block, units, rails, groundRails, external, railSpecs, powerLibs, labelRefs, portDirections: c.portDirections };
}

/**
 * Run one template and turn a THROWN error into a `backend-raised` mismatch.
 *
 * Template helpers throw rather than refuse when something is wrong with the symbol or the model
 * rather than with the block - a missing body box, a pin the symbol does not have, `boundsOf` on
 * nothing drawn. The ported code attributed those to the block and template and rethrew; from
 * here they become a value, so one code path decides what happens to a block that could not be
 * drawn. **A throw is NEVER `not-applicable`**, so it can never select ELK: a template that
 * crashed has told us nothing about whether its idiom fits, and treating a crash as "does not
 * apply" is exactly how a defect in the preferred rendering path goes dark (**G84**).
 *
 * **THIS IS THE TASK 8 BRIEF'S `attributed(…)`, UNDER A NEW NAME.** The brief says *"`attributed(…)`
 * returns `backendRaised("template", …)` instead of rethrowing"*. The ported `attributed` wrapped
 * two different things - the template call and the layout check - and only the first should become
 * a value: a `checkLayout` that throws is this generator failing to check, not a block that cannot
 * be drawn, and turning it into a mismatch would report it as the block's fault. So the template
 * half is this function and the layout-check half keeps the name `attributed` and keeps rethrowing
 * (bottom of this file). A reader coming from the brief should look here for the behaviour it
 * describes.
 *
 * **IT IS EXPORTED, and only for a measurement to reuse rather than restate.** The rule above -
 * *a throw is NEVER `not-applicable`* (**G84**) - is one this project cares about getting right,
 * and `tools/schgen/parity.ts`'s applicability probe and `tools/schgen/anchor-sweep.ts` both need
 * a template's own verdict. They had a second copy of this wrapping; it is deleted, because
 * *supersede means delete* applies to a pattern and not only to a stub, and two copies of a rule
 * is two chances to classify a crash as "does not apply". Nothing about `selectRenderer` changes.
 */
export function runTemplate(t: Template, g: BlockSubgraph): RealiseResult {
  try {
    return t.realise(g);
  } catch (e) {
    return backendRaised("template", `block ${g.block.id}/${t.id}`, `template ${t.id} failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** The templates one block offers, in registered order: its declared one, or all of them. */
function candidatesFor(r: Rendering, id: BlockId, templates: ReadonlyMap<TemplateId, Template>): readonly Template[] {
  if (r.kind === "bus") {
    throw new Error(
      `selectRenderer: block ${id} is rendered "bus"; its connectivity is drawn by the bus renderer ` +
        "(render/bus.ts, Task 6b - see docs/known-gaps.md G131), not by a template. It is not offered to the " +
        "template set, because all eight would refuse it as not-applicable and it would go to ELK - a wrong " +
        "drawing, chosen by accident.",
    );
  }
  if (r.kind === "auto") return [...templates.values()];
  const declared = templates.get(r.template);
  if (declared === undefined) throw new Error(`no template registered for ${r.template}`);
  return [declared];
}

/**
 * **Which renderer draws this block, and spec §1.3's rules in one function.**
 *
 * **THIS COMMENT IS THE CANONICAL STATEMENT OF THE SELECTION RULE.** `block-types.ts`'s
 * `Selection` and `ir/types.ts`'s `auto` variant point here rather than paraphrasing it, because
 * three paraphrases is three chances to drop the qualifier below - which is what happened in round
 * 1 and is recorded as `docs/known-gaps.md` **G147**.
 *
 * A `wired` block offers its declared template; an `auto` block offers every template in the
 * registry's order. Then, for either:
 *
 * - the first template whose `realise` returns `ok` is **used**;
 * - a mismatch that is **not** `not-applicable` **refuses, immediately**, without trying the rest.
 *   A template applied, drew something and disagreed with the IR or collided: that is a defect in
 *   the preferred rendering path, and letting a later template - or ELK - produce a drawing anyway
 *   would hide it. `docs/known-gaps.md` **G84**: *"if ELK rescues a template that should have
 *   worked, defects in the preferred rendering path go dark."*
 *
 * **AND `not-applicable` IS WHERE `wired` AND `auto` PART COMPANY, WHICH THE RULE AS FIRST
 * WRITTEN GOT WRONG.** For an `auto` block, every candidate reporting `not-applicable` selects the
 * ELK backend: nothing was drawn by anyone and nothing is hidden. For a `wired` block the
 * author has DECLARED that this template draws this block, so `not-applicable` means the
 * declaration is false, and that is a generation error naming the block and the template - not an
 * invitation to ELK.
 *
 * **THAT IS A FAITHFUL READING OF §1.3 AND NOT A LIBERTY TAKEN WITH IT**, which matters because an
 * implementer may not author the criteria for what they produce. §1.3's ELK row quantifies over
 * the LIBRARY - *"no template in the library supports this topology"* - and a `wired` block
 * consults exactly one template, so one `not-applicable` can never establish that precondition.
 * §1.3 has no row at all for *a declared template that does not apply*; its refusing row is a
 * template that **supports** the topology and did not realise it acceptably. And **plan decision
 * D3 already states the rule this way**, inside the paragraph defining `auto`: *"A new variant
 * `{kind: "auto"}` is added by Task 8: try every template in the registry's order; the first `ok`
 * wins; all `not-applicable` selects ELK; any `invalid-geometry`, `clearance` or `backend-raised`
 * refuses."* The plan's Task 8 Step 7 then restates it without the `auto` scope, which is the
 * sentence that is wrong. `docs/known-gaps.md` **G147**.
 *
 * Written the other way, 43 tests went red in one run, every one of them a refusal that a declared
 * template was expected to produce and that had silently become *"this block needs the ELK
 * backend"*. **A declared template quietly replaced by a general router is the exact silent
 * degradation G84 exists to prevent**, and an undeclared one at that - the render report would
 * still have said `wired`.
 *
 * Note what is NOT here: no fallback, and no rescue. `{kind:"elk"}` is a selection, not a
 * forgiveness, and `{kind:"refused"}` is final.
 */
export function selectRenderer(g: BlockSubgraph, templates: ReadonlyMap<TemplateId, Template>): Selection {
  const rendering = g.block.rendering;
  const candidates = candidatesFor(rendering, g.block.id, templates);
  let last: Mismatch | null = null;
  for (const t of candidates) {
    const r = runTemplate(t, g);
    if (r.ok) return { kind: "template", template: t.id, layout: r.layout };
    if (r.mismatch.kind !== "not-applicable") return { kind: "refused", mismatch: r.mismatch };
    last = r.mismatch;
  }
  if (rendering.kind === "auto") return { kind: "elk" };
  if (last === null) {
    throw new Error(
      `selectRenderer: block ${g.block.id} offered no template at all. A wired block always offers the one it ` +
        "declares (candidatesFor throws when it is not registered), so this is a defect in render/blocks.ts.",
    );
  }
  return { kind: "refused", mismatch: last };
}

/** The refusal text, keeping the wording the ported template tests match on for a wired block. */
function refusalText(id: BlockId, r: Rendering, m: Mismatch): string {
  if (r.kind === "wired") {
    return `block ${id} has rendering="wired" but template ${r.template} cannot realise its subgraph: ${describeMismatch(m)}`;
  }
  return `block ${id} has rendering="auto" and a template applied and failed, so nothing may rescue it: ${describeMismatch(m)}`;
}

/**
 * The block's layout, drawn by whichever renderer `selectRenderer` chose and checked against the
 * IR before it is returned.
 *
 * **`elk` defaults to null, which is a DEVIATION from the task brief's signature and is recorded**
 * in `docs/known-gaps.md` **G146**. **Nine** ported test files call this with three arguments (49
 * call sites), and making the parameter required would have diverged all nine to add the word
 * `null` - **seven** of them otherwise untouched by this task, so seven is the marginal cost. A
 * `wired` block never needs a backend; an `auto` block that reaches ELK without one **throws**,
 * naming the block and saying what is missing. That is a refusal, not a fallback: nothing is drawn
 * by a second-choice renderer and nothing is skipped.
 *
 * (Round 1 of this comment said ten files and nine marginal. Both were wrong - the tenth file
 * only names `realiseBlock` in a comment - and **G146** had the measured numbers all along, which
 * is the point: a count in a doc comment is a claim, and this file is the first one Task 12 reads.)
 */
export function realiseBlock(c: Circuit, id: BlockId, symbols: SymbolResolver, elk: Backend | null = null): BlockLayout {
  const block = c.blocks.get(id);
  if (block === undefined) throw new Error(`unknown block ${id}`);
  const r = block.rendering;
  if (r.kind === "bus") throw new Error(`realiseBlock: block ${id} is rendered "bus"; use the bus renderer`);
  const g = subgraphOf(c, id, symbols);
  const chosen = selectRenderer(g, TEMPLATES);
  if (chosen.kind === "refused") throw new Error(refusalText(id, r, chosen.mismatch));
  const layout = chosen.kind === "template" ? chosen.layout : elkLayout(g, id, elk);
  // Checked for every renderer, not only for templates: a layout from ELK disagreeing with the IR
  // is the same generation error as a template's, and one gate is one place to keep correct.
  const problems = attributed(id, chosen, () => checkLayout(g, layout));
  if (problems.length > 0) {
    throw new Error(`block ${id}: ${drawnBy(chosen)} produced an invalid layout:${problems.map((p) => `\n  - ${p}`).join("")}`);
  }
  return layout;
}

/** What drew this layout, for a message: the template's id, or the backend. */
const drawnBy = (s: Selection): string => (s.kind === "template" ? `template ${s.template}` : "the ELK backend");

/**
 * The ELK backend's layout, or a refusal naming what is missing.
 *
 * **Nothing is defaulted here on purpose.** A block every template reported `not-applicable` for
 * has no second-choice drawing in this repository: the whole point of deleting the labels
 * rendering (**G84**, **G140**) is that there is no inferior output to fall back to. So a missing
 * backend is an error that names the block, and a backend that refuses is an error that carries
 * its mismatch - including the `backend-raised` one that **G94**'s elkjs crash produces.
 */
function elkLayout(g: BlockSubgraph, id: BlockId, elk: Backend | null): BlockLayout {
  if (elk === null) {
    throw new Error(
      `block ${id}: every template reported "not-applicable", so this block needs the ELK backend, and ` +
        "realiseBlock was called without one. Pass the backend (Task 12's) as its fourth argument. It is not " +
        "defaulted because the alternative to a backend here is a knowingly inferior drawing, which this " +
        "generator does not produce - see docs/known-gaps.md G84.",
    );
  }
  const r = elk.realise(g);
  if (!r.ok) throw new Error(`block ${id}: the ELK backend cannot realise its subgraph: ${describeMismatch(r.mismatch)}`);
  return r.layout;
}

/** Attribute a thrown error from the layout check to the block and the renderer that drew it. */
function attributed<T>(id: BlockId, chosen: Selection, run: () => T): T {
  try {
    return run();
  } catch (e) {
    throw new Error(`block ${id}: ${drawnBy(chosen)} failed: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}
