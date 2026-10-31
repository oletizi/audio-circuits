/**
 * Ported from digital-pedal-platform's `tools/schgen/render/fieldPlacement.ts`, and DIVERGED from
 * it by Task 8 of the M1 schematic-authoring plan: `FieldsResult`'s false arm carried a bare
 * `reason: string` and then a classified `Mismatch`.
 *
 * **DIVERGED FURTHER BY TASK 24, AND THIS ONE DELETES THAT ARM: THE PLACER NO LONGER REFUSES.**
 * It takes the least-covered candidate slot when no slot is clear, and every such placement is
 * recorded as a `FieldFallback` so a sheet carrying overlapped text can never read as a clean
 * sheet. `FieldsResult`, `tryPlaceFields`, `blockFieldsResult` and `blockFieldProblems` are
 * DELETED rather than left returning a result nothing can produce - a false arm no input reaches
 * is a check that cannot fail (`docs/known-gaps.md` **G236**). See `placeFields`.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * Where each placed unit's Reference and Value go: a deterministic search over candidate slots
 * (textBoxes.slotFields). First the conventional outside slots on sides no pin leaves — right,
 * up, left, down — then inside the body: centre, then its four quarters; then, for small ICs
 * with pins on every side, just beyond the outermost pins of each side.
 *
 * **A candidate is CLEAR when both texts, grown by half a text line, clear every obstacle of the
 * block** - wires, pin lines, pin numbers and outside names, other units' bodies, power glyphs and
 * values, labels and fields already placed; outside, its own body too; inside, it must lie strictly
 * within its body clear of its own pin names and interior graphics and text. The first clear
 * candidate is taken, exactly as before.
 *
 * **WHEN NO CANDIDATE IS CLEAR THE LEAST-COVERED ONE IS TAKEN AND THE OVERLAP IS REPORTED.** It
 * used to refuse the block, and that is the one thing no source in
 * `docs/schematic/text-placement-prior-art.md` does: Christensen, Marks & Shieber's survey of
 * point-feature label placement enumerates what a greedy placer may do when a label will not fit -
 * drop the label, *"[label] it even though a label overlap or feature obscuration results"*, or ask
 * a person - and KiCad's own field autoplacer has no refusal path at all (§5(c)). The cost is
 * overlap AREA weighted by obstacle category, from `occupancy.ts`, which is the guide's reviewed
 * weighting rather than a second one.
 *
 * **THE COST RANKS; IT NEVER DECIDES FEASIBILITY.** Whether a candidate is CLEAR is still the exact
 * predicate `blockerOf` always used - `boxesOverlap` and `segmentHitsBox` - because that is the same
 * predicate `text-scene.ts` checks, so what this module calls clear is exactly what the checker
 * calls clear. The area arithmetic models a line as a box (`LINE_WIDTH`), and a bounding box is not
 * a diagonal interior stroke; letting it decide feasibility would move the slot chosen on blocks
 * that draw today. So a clear candidate is found first, by the old test, and the area cost is
 * computed only to order the candidates when none is.
 */
import type { BlockId } from "../ir/types.ts";
import { valueIsSymbolPartName } from "../../kicad/value-notation.ts";
import type { BlockLayout, BlockSubgraph, BlockUnit, Placement, Wire } from "./block-types.ts";
import { boxesOverlap, GRID, growBox, segmentHitsBox, type Side, type Um } from "./geometry.ts";
import type { Box } from "./lib-pins.ts";
import { chooseLeastCovered, createOccupancy, MARK_WEIGHT } from "../../../tools/guide/occupancy.ts";
import { pinMarkBox, pinMarks } from "./pin-marks.ts";
import { anchorsToSymbols, powerText, type LibLookup, valuesAlong } from "./power-text.ts";
import type { GlobalLabel, PowerSymbol } from "./sheet-types.ts";
import {
  besidePinFields, INSIDE_SLOTS, labelBox, OUTSIDE_SLOTS, powerValueBox, reservedReference, slotFields, textBox, type FieldSlot, type Fields,
} from "./text-boxes.ts";
import { unitText, type Obstacle, type Segment, type UnitText } from "./unit-text.ts";

export type { Segment } from "./unit-text.ts";

/**
 * **A FIELD PAIR THE PLACER COULD NOT KEEP CLEAR, placed anyway.** One per unit, never aggregated:
 * the count a reader needs is per unit and per block, and a total alone cannot be acted on.
 *
 * It exists so that replacing a refusal with a placement does not convert a visible failure into a
 * silent degradation. `sheets.ts` carries these onto the `SheetDrawing`, `report.ts` prints them in
 * every generation's `RENDER-REPORT.md`, and `tools/schgen/board-sheets.ts` prints them per board.
 */
export interface FieldFallback {
  readonly block: BlockId;
  /** `<part>#<unit>` */
  readonly key: string;
  readonly libId: string;
  /**
   * The weighted overlap area accepted, in whole um^2. Comparable only within one run of one
   * placer, and ROUNDED: the arithmetic is floating point over micron coordinates, so an exact
   * value carries fifteen digits of which the last eight are noise, and a report is a thing a
   * person reads.
   */
  readonly cost: number;
  /** What the placed boxes cover, named as the drawing names it. Never empty. */
  readonly covers: readonly string[];
}

export interface PlacedUnit {
  /** `<part>#<unit>` */
  readonly key: string;
  /** Placed body box, pin tips excluded. */
  readonly body: Box;
  readonly fields: Fields;
  /** True when the fields are drawn inside the body. */
  readonly inside: boolean;
  /** Drawn pin lines, tip to body. */
  readonly pins: readonly Segment[];
  /** Null when the chosen slot is clear; otherwise what this placement covers. */
  readonly fallback: FieldFallback | null;
}

export interface FieldScene {
  /**
   * The block this scene is about. It was `scope: string`, always holding `block <id>` - every
   * construction in this tree and in the pedals source sets it that way - and Task 8 needs the
   * **id** rather than the prose, because a mismatch names the block it happened in.
   * Carrying both would be one fact in two places, so the prose is derived (`scopeOf`).
   */
  readonly block: BlockId;
  readonly units: readonly BlockUnit[];
  readonly placements: readonly Placement[];
  readonly wires: readonly Wire[];
  readonly powers: readonly PowerSymbol[];
  readonly labels: readonly GlobalLabel[];
  readonly libs: LibLookup;
}

interface Prepared extends UnitText {
  readonly u: BlockUnit;
  readonly freeSides: readonly Side[];
  /** DNP pin-polarity marks (pinMarks.ts): fields must clear them. */
  readonly marks: readonly Obstacle[];
}

function prepare(u: BlockUnit, pl: Placement): Prepared {
  const t = unitText(u, pl);
  const marks = pinMarks(u, pl).map((m) => ({ what: m.what, box: pinMarkBox(m) }));
  return { ...t, u, freeSides: OUTSIDE_SLOTS.filter((s) => !t.tips.has(s)), marks };
}

/** Clearance kept around a candidate field: half a text line. */
const MARGIN = GRID / 2;

/**
 * The width a line obstacle is given so that crossing one has an AREA like every other overlap.
 *
 * It is KiCad's default wire thickness, 6 mil, which is the number `emit.ts` writes explicitly for
 * the sheet border (`0.1524`) and the number KiCad substitutes for the `(width 0)` every emitted
 * wire carries. **It is a cost parameter and not a geometric claim**: nothing here asserts that a
 * wire covers this much, and the feasibility test never uses it.
 */
const LINE_WIDTH: Um = 152.4;

const within = (inner: Box, outer: Box): boolean =>
  outer.minX < inner.minX && inner.maxX < outer.maxX && outer.minY < inner.minY && inner.maxY < outer.maxY;

interface Candidate {
  readonly fields: Fields;
  readonly inside: boolean;
}

/** Free sides (KiCad's convention), then inside the body, then beside the outermost pins of pinned sides. */
function allCandidates(p: Prepared): Candidate[] {
  return [
    ...p.freeSides.map((s) => ({ fields: slotFields(p.body, s), inside: false })),
    ...INSIDE_SLOTS.map((s: FieldSlot) => ({ fields: slotFields(p.body, s), inside: true })),
    ...OUTSIDE_SLOTS.flatMap((s) => besidePinFields(p.body, s, p.tips.get(s) ?? []).map((fields) => ({ fields, inside: false }))),
  ];
}

/** How this module names its scope in a message: unchanged text, derived from `FieldScene.block`. */
const scopeOf = (scene: FieldScene): string => `block ${scene.block}`;

/** A line obstacle as a box, for the area cost only. */
const lineBox = (s: Segment): Box =>
  growBox(
    { minX: Math.min(s.a.x, s.b.x), minY: Math.min(s.a.y, s.b.y), maxX: Math.max(s.a.x, s.b.x), maxY: Math.max(s.a.y, s.b.y) },
    LINE_WIDTH / 2,
  );

/**
 * Fields for every placement, in placement order. Never refuses: a unit with no clear slot is
 * placed at its least-covered candidate and carries a `FieldFallback`.
 */
export function placeFields(scene: FieldScene): PlacedUnit[] {
  const prepared = scene.placements.map((pl) => {
    const u = scene.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
    if (u === undefined) throw new Error(`${scopeOf(scene)}: placement ${pl.part}#${pl.unit} is not a unit of the block`);
    return prepare(u, pl);
  });
  const segments: Segment[] = [
    ...scene.wires.map((w, i) => ({ what: `wire ${i} (${w.net})`, a: w.a, b: w.b })),
    ...prepared.flatMap((p) => p.pins),
  ];
  const powers = scene.powers.map((p) => ({ net: p.net, text: powerText(scene.libs, p) }));
  /** Text and pin text: whatever a reader can MISREAD under another string weighs `MARK_WEIGHT`. */
  const fixedMarks: Obstacle[] = [
    ...prepared.flatMap((p) => p.decorations),
    ...prepared.flatMap((p) => p.marks),
    ...scene.labels.map((l) => ({ what: `label ${l.net}`, box: labelBox(l) })),
    ...powers.map(({ net, text }) => ({ what: `value of power ${net}`, box: powerValueBox(text.value, text.text) })),
  ];
  /** Graphics: covering one is untidy rather than ambiguous, so it weighs 1. */
  const fixedBodies: Obstacle[] = powers.map(({ net, text }) => ({ what: `power ${net}`, box: text.glyph }));
  const placed: Obstacle[] = [];
  const out: PlacedUnit[] = [];
  for (const p of prepared) {
    const others = prepared.filter((q) => q !== p).map((q) => ({ what: `body of ${q.key}`, box: q.body }));
    /**
     * **THE BOXES THIS UNIT'S FIELDS MUST FIT - the Reference always, the Value only when it is
     * DRAWN** (Task 21).
     *
     * A Value that is nothing but the symbol's own part name is emitted hidden
     * (`render/emit-items.ts`), so it occupies no room on the sheet and requiring a slot wide
     * enough for it refused blocks over text nobody sees: `Jumper:Jumper_2_Open`'s Value field is
     * thirteen characters against a 5080 um body, and it was the sole blocker of
     * `transistor-preamp`'s generation (`docs/known-gaps.md` **G232**). `render/text-scene.ts`
     * drops the same box from the same rule, so what is checked here is still exactly what is
     * drawn there.
     *
     * **IT CHANGES NOTHING FOR A VALUE THAT CARRIES INFORMATION.** `100nF` on a capacitor is an
     * electrical parameter, it must be drawn, and it is still sized and placed - which is why
     * **G239**'s arithmetic over a small two-pin passive survives this change intact.
     */
    const texts = (f: Fields): Box[] => [
      textBox(f.reference, reservedReference(p.u.part.refPrefix)),
      ...(valueIsSymbolPartName(p.u.symbol.libId, p.u.part.value) ? [] : [textBox(f.value, p.u.part.value)]),
    ];
    const grown = (f: Fields): Box[] => texts(f).map((t) => growBox(t, MARGIN));
    /** Box obstacles this candidate must clear, by weight. */
    const obstacles = (inside: boolean): readonly { readonly weight: number; readonly items: readonly Obstacle[] }[] => [
      { weight: 1, items: [...fixedBodies, ...others, ...(inside ? [] : [{ what: "own body", box: p.body }])] },
      { weight: MARK_WEIGHT, items: [...fixedMarks, ...placed, ...(inside ? p.interiorBoxes : [])] },
    ];
    const strokesOf = (inside: boolean): readonly Segment[] => (inside ? [...segments, ...p.strokes] : segments);
    /**
     * **Whether this candidate is clear, by the exact predicate that has always decided it.** It
     * was `blockerOf`, which returned the first obstacle's name for a refusal message; nothing
     * refuses now, so what a caller needs is the whole list, and `covers` below is that. The
     * condition is unchanged, so the candidate chosen for a layout that passed before passes now.
     */
    const covered = (c: Candidate): string[] => {
      const names: string[] = [];
      for (const b of grown(c.fields)) {
        for (const { items } of obstacles(c.inside)) for (const o of items) if (boxesOverlap(b, o.box)) names.push(o.what);
        for (const s of strokesOf(c.inside)) if (segmentHitsBox(s.a, s.b, b)) names.push(s.what);
      }
      return [...new Set(names)];
    };
    /** The weighted overlap AREA this candidate accepts; used to ORDER the blocked candidates only. */
    const area = (c: Candidate): number => {
      const bodies = createOccupancy(1);
      const marks = createOccupancy(MARK_WEIGHT);
      for (const { weight, items } of obstacles(c.inside)) {
        for (const o of items) (weight === MARK_WEIGHT ? marks : bodies).add(o.box);
      }
      for (const s of strokesOf(c.inside)) bodies.add(lineBox(s));
      return grown(c.fields).reduce((sum, b) => sum + bodies.overlap(b) + marks.overlap(b), 0);
    };
    /**
     * **AN INSIDE SLOT THAT DOES NOT CONTAIN ITS TEXT IS NOT A SLOT, so it is not a candidate.**
     * The containment test is strict and is a property of the slot's geometry rather than of
     * anything drawn, so excluding it here says what it is instead of reporting a body as an
     * obstacle the text "covers". **G239** measures that this removes all five inside slots for
     * any symbol whose body is shorter than `4 x GRID`, which is every small two-pin passive.
     */
    const cands = allCandidates(p).filter((c) => !c.inside || grown(c.fields).every((b) => within(b, p.body)));
    const clear = cands.find((c) => covered(c).length === 0);
    const cand = clear ?? chooseLeastCovered(cands, area).candidate;
    let fallback: FieldFallback | null = null;
    if (clear === undefined) {
      const covers = covered(cand);
      // `covered` is the predicate the search just used, and every candidate was covered, so the
      // chosen one is covered too. Refused rather than defaulted: an empty `covers` on a fallback
      // would be a report of nothing wrong, which is the one thing this record exists to prevent.
      if (covers.length === 0) {
        throw new Error(
          `${scopeOf(scene)}: ${p.key}: no candidate field slot is clear, yet the chosen one covers nothing. ` +
            "`covered` is the predicate the search used, so these two cannot both hold: this is a defect in " +
            "render/field-placement.ts, not a layout problem.",
        );
      }
      fallback = { block: scene.block, key: p.key, libId: p.u.symbol.libId, cost: Math.round(area(cand)), covers };
    }
    for (const [i, b] of texts(cand.fields).entries()) placed.push({ what: `${i === 0 ? "Reference" : "Value"} of ${p.key}`, box: b });
    out.push({ key: p.key, body: p.body, fields: cand.fields, inside: cand.inside, pins: p.pins, fallback });
  }
  return out;
}

function blockScene(g: BlockSubgraph, layout: BlockLayout, libs: LibLookup): FieldScene {
  const { powers, labels } = anchorsToSymbols(g,layout.anchors, valuesAlong(g.block.rendering));
  return { block: g.block.id, units: g.units, placements: layout.placements, wires: layout.wires, powers, labels, libs };
}

/** Fields of one block's units against that block's own drawing (its anchors drawn as symbols/labels). */
export function blockFields(g: BlockSubgraph, layout: BlockLayout, libs: LibLookup): PlacedUnit[] {
  return placeFields(blockScene(g, layout, libs));
}

/** Every field pair of one block the placer could not keep clear. */
export function blockFieldFallbacks(g: BlockSubgraph, layout: BlockLayout, libs: LibLookup): readonly FieldFallback[] {
  return blockFields(g, layout, libs).flatMap((u) => (u.fallback === null ? [] : [u.fallback]));
}
