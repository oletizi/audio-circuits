/**
 * Ported from digital-pedal-platform's `tools/schgen/render/textScene.ts`, and DIVERGED from it by
 * Task 21 of the M1 schematic-authoring plan: a part Value that is nothing but its symbol's own
 * part name is emitted HIDDEN, so it is not drawn text and contributes no box to the scene.
 *
 * **WIDENED BY TASK 22** with `UnitFieldMode`: `textScene` takes an opt-in fourth argument that
 * builds the same scene with NO unit field boxes, for the one diagnostic that has to measure a
 * block whose field placement refused (`tools/schgen/masked-problems.ts`). Every check takes the
 * default and nothing about what they refuse changes; see `UnitFieldMode` for why the omitted
 * scene is sound in one direction only.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * Text clearance. Every drawn text — part Reference/Value, power symbol values, global labels,
 * sheet texts and frame titles — is a box (textBoxes.ts). None may overlap a wire, a pin, a
 * symbol body (fields that fieldPlacement put inside their own body excepted), a unit's pin
 * numbers and names or its interior graphics and text (unitText.ts, modelled here from the
 * placements, not taken from the placer), another text, or cross a frame border. checkLayout runs it on every block's own drawing, so a template cannot
 * produce overprinted text; layoutSheet runs it again over the whole sheet (frames, titles,
 * notes, power flags, and blocks side by side). Building a scene places fields, which throws
 * when a unit has no clear slot (fieldPlacement.placeFields).
 */
import { valueIsSymbolPartName } from "../../kicad/value-notation.ts";
import type { BlockLayout, BlockSubgraph } from "./block-types.ts";
import { fmtPoint } from "./connectivity.ts";
import { blockFields } from "./field-placement.ts";
import { boxesOverlap, segmentHitsBox } from "./geometry.ts";
import type { Box } from "./library.ts";
import { dnpCross, pinMarkBox, pinMarks } from "./pin-marks.ts";
import { powerText, type LibLookup } from "./power-text.ts";
import type { Frame, GlobalLabel, PowerSymbol, SheetText } from "./sheet-types.ts";
import { frameTitleSpot, labelBox, powerValueBox, reservedReference, textBox } from "./text-boxes.ts";
import { unitText, type Segment } from "./unit-text.ts";

interface Named {
  readonly what: string;
  readonly box: Box;
  /** Set on a unit's fields when they were placed inside its body, and on that body: they may overlap. */
  readonly owner?: string | undefined;
  /** Set on DNP pin-polarity marks, which must also clear every DNP cross. */
  readonly mark?: boolean | undefined;
}

export interface TextScene {
  readonly scope: string;
  readonly texts: readonly Named[];
  readonly segments: readonly Segment[];
  readonly bodies: readonly Named[];
  /** Pin numbers and names, interior text and arc areas of every unit: no text may overlap one. */
  readonly pinTexts: readonly Named[];
  /** Interior graphic strokes of every unit: no text may cross one. */
  readonly strokes: readonly Segment[];
  readonly frames: readonly Named[];
  /**
   * The areas KiCad's DNP crosses cover (pinMarks.dnpCross): no pin-polarity mark may lie under
   * one. (A DNP part's own Reference and Value may; KiCad's cross reaches them by design.)
   */
  readonly crosses: readonly Named[];
}

export interface SceneParts {
  readonly blocks: ReadonlyArray<{ readonly g: BlockSubgraph; readonly layout: BlockLayout }>;
  readonly powers: readonly PowerSymbol[];
  readonly labels: readonly GlobalLabel[];
  readonly texts: readonly SheetText[];
  readonly frames: readonly Frame[];
}

/**
 * **WHETHER A SCENE CARRIES THE UNITS' OWN FIELDS - `"placed"` for every check, `"omitted"` for
 * one diagnostic, and the asymmetry between them is the whole point** (Task 22).
 *
 * Building a scene PLACES fields, which throws when a unit has no clear slot, so a block whose
 * field placement refuses has no scene at all and `layout-check.ts` cannot run this pass on it -
 * which is how one defect hid another for the whole of **G232**'s life (`docs/known-gaps.md`
 * **G258**).
 *
 * `"omitted"` builds the same scene with no unit Reference or Value box in it. It is a STRICT
 * SUBSET of the `"placed"` scene and it is sound in one direction only:
 *
 * - **what it reports is true of the block whatever the fields do.** `textProblems` tests each
 *   text against the texts AFTER it, the segments, the bodies, the pin texts, the strokes, the
 *   crosses and the frames - every one of those comparisons is between two things that are already
 *   in the scene, so dropping a text can only drop the problems that text is party to, never alter
 *   another pair's answer. A problem between two labels, or a label and a wire, therefore survives
 *   ANY field placement, including the one a fix to field placement would produce;
 * - **what it does NOT report is unmeasured, not absent.** No problem involving a field can appear,
 *   and for the block that refused, where its fields would go is the question under dispute. A
 *   diagnostic that chose a placement to answer it would be reporting its own choice.
 *
 * **NO CHECK PASSES `"omitted"`, and that is a property to keep.** `layout-check.ts` and
 * `sheets.ts` take the default, so this parameter changes nothing about what anything refuses; the
 * one caller is `tools/schgen/masked-problems.ts`, which reports and never decides.
 */
export type UnitFieldMode = "placed" | "omitted";

export function textScene(scope: string, symbols: LibLookup, parts: SceneParts, unitFields: UnitFieldMode = "placed"): TextScene {
  const texts: Named[] = [];
  const segments: Segment[] = [];
  const bodies: Named[] = [];
  const pinTexts: Named[] = [];
  const strokes: Segment[] = [];
  const crosses: Named[] = [];
  for (const { g, layout } of parts.blocks) {
    layout.wires.forEach((w, i) => segments.push({ what: `wire ${i} of ${g.block.id} (${w.net})`, a: w.a, b: w.b }));
    for (const pl of layout.placements) {
      const u = g.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
      if (u === undefined) throw new Error(`${scope}: ${pl.part}#${pl.unit} is not a unit of block ${g.block.id}`);
      const drawn = unitText(u, pl);
      bodies.push({ what: `body of ${drawn.key}`, box: drawn.body, owner: drawn.key });
      segments.push(...drawn.pins);
      pinTexts.push(...drawn.decorations, ...drawn.interiorBoxes);
      strokes.push(...drawn.strokes);
      for (const m of pinMarks(u, pl)) texts.push({ what: m.what, box: pinMarkBox(m), mark: true });
      const cross = dnpCross(u, pl);
      if (cross !== null) crosses.push({ what: `DNP cross of ${drawn.key}`, box: cross });
    }
    for (const t of unitFields === "omitted" ? [] : blockFields(g, layout, symbols)) {
      const u = g.units.find((x) => `${x.part.label}#${x.unit}` === t.key);
      if (u === undefined) throw new Error(`${scope}: ${t.key} is not a unit of block ${g.block.id}`);
      const owner = t.inside ? t.key : undefined;
      texts.push({ what: `Reference of ${t.key}`, box: textBox(t.fields.reference, reservedReference(u.part.refPrefix)), owner });
      // A Value that is nothing but the symbol's own part name is emitted HIDDEN
      // (`render/emit-items.ts`), so it is not drawn text and has no box here. This is the same
      // rule `render/field-placement.ts` uses to decide what needs a slot, from the same function,
      // so what that places is exactly what this checks - the invariant this module's header
      // states. Task 21; `docs/known-gaps.md` **G232**, **G257**.
      if (!valueIsSymbolPartName(u.symbol.libId, u.part.value)) {
        texts.push({ what: `Value of ${t.key}`, box: textBox(t.fields.value, u.part.value), owner });
      }
    }
  }
  parts.powers.forEach((p, i) => {
    const t = powerText(symbols, p);
    const name = `${p.flag ? "PWR_FLAG" : "power symbol"} ${p.net} ${i} at ${fmtPoint(p.at)}`;
    texts.push({ what: `value of ${name}`, box: powerValueBox(t.value, t.text) });
    bodies.push({ what: `glyph of ${name}`, box: t.glyph });
  });
  for (const l of parts.labels) texts.push({ what: `label ${l.net} at ${fmtPoint(l.at)}`, box: labelBox(l) });
  for (const t of parts.texts) texts.push({ what: `text "${t.text}"`, box: textBox({ at: t.at, justify: "left" }, t.text) });
  const frames = parts.frames.map((f) => ({ what: `frame "${f.title}"`, box: f.box }));
  for (const f of parts.frames) texts.push({ what: `title of frame "${f.title}"`, box: textBox(frameTitleSpot(f.box), f.title) });
  return { scope, texts, segments, bodies, pinTexts, strokes, frames, crosses };
}

const strictlyWithin = (inner: Box, outer: Box): boolean =>
  outer.minX < inner.minX && inner.maxX < outer.maxX && outer.minY < inner.minY && inner.maxY < outer.maxY;

/** Every overlap of a text with something else, one line each naming both. */
export function textProblems(scene: TextScene): string[] {
  const out: string[] = [];
  scene.texts.forEach((t, i) => {
    for (const o of scene.texts.slice(i + 1)) if (boxesOverlap(t.box, o.box)) out.push(`${t.what} overlaps ${o.what}`);
    for (const s of scene.segments) if (segmentHitsBox(s.a, s.b, t.box)) out.push(`${t.what} overlaps ${s.what}`);
    for (const b of scene.bodies) if ((t.owner === undefined || t.owner !== b.owner) && boxesOverlap(t.box, b.box)) out.push(`${t.what} overlaps ${b.what}`);
    for (const p of scene.pinTexts) if (boxesOverlap(t.box, p.box)) out.push(`${t.what} overlaps ${p.what}`);
    for (const s of scene.strokes) if (segmentHitsBox(s.a, s.b, t.box)) out.push(`${t.what} overlaps ${s.what}`);
    if (t.mark === true) for (const x of scene.crosses) if (boxesOverlap(t.box, x.box)) out.push(`${t.what} lies under ${x.what}`);
    for (const f of scene.frames) {
      if (boxesOverlap(t.box, f.box) && !strictlyWithin(t.box, f.box)) out.push(`${t.what} crosses the border of ${f.what}`);
    }
  });
  return out;
}

export function assertTextClear(scene: TextScene): void {
  const problems = textProblems(scene);
  if (problems.length > 0) throw new Error(`${scene.scope}: text clearance:${problems.map((p) => `\n  - ${p}`).join("")}`);
}
