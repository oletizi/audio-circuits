/**
 * Ported from digital-pedal-platform's `tools/schgen/render/fieldPlacement.ts`, and DIVERGED from
 * it by Task 8 of the M1 schematic-authoring plan: `FieldsResult`'s false arm carried a bare
 * `reason: string` and now carries a classified `Mismatch`, which for this module is always a
 * `clearance` one - and naming its obstacle PAIR is why `clear` became `blockerOf`.
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
 * with pins on every side, just beyond the outermost pins of each side. A candidate is taken
 * only when both texts, grown by half a text line, clear every obstacle of the block: wires,
 * pin lines, pin numbers and outside names, other units' bodies, power glyphs and values, labels
 * and fields already placed; outside, its own body too; inside, it must lie strictly within its
 * body clear of its own pin names and interior graphics and text. When no candidate fits, the
 * block is refused.
 */
import { describeMismatch, type BlockLayout, type BlockSubgraph, type BlockUnit, type Mismatch, type Placement, type Wire } from "./block-types.ts";
import type { BlockId } from "../ir/types.ts";
import { boxesOverlap, GRID, growBox, segmentHitsBox, type Side } from "./geometry.ts";
import type { Box } from "./lib-pins.ts";
import { pinMarkBox, pinMarks } from "./pin-marks.ts";
import { anchorsToSymbols, powerText, type LibLookup, valuesAlong } from "./power-text.ts";
import type { GlobalLabel, PowerSymbol } from "./sheet-types.ts";
import {
  besidePinFields, INSIDE_SLOTS, labelBox, OUTSIDE_SLOTS, powerValueBox, reservedReference, slotFields, textBox, type FieldSlot, type Fields,
} from "./text-boxes.ts";
import { unitText, type Obstacle, type Segment, type UnitText } from "./unit-text.ts";

export type { Segment } from "./unit-text.ts";

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
}

export interface FieldScene {
  /**
   * The block this scene is about. It was `scope: string`, always holding `block <id>` - every
   * construction in this tree and in the pedals source sets it that way - and Task 8 needs the
   * **id** rather than the prose, because a `clearance` mismatch names the block it happened in.
   * Carrying both would be one fact in two places, so the prose is derived (`scopeOf`) and the
   * messages are unchanged.
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

const within = (inner: Box, outer: Box): boolean =>
  outer.minX < inner.minX && inner.maxX < outer.maxX && outer.minY < inner.minY && inner.maxY < outer.maxY;

interface Candidate {
  readonly fields: Fields;
  readonly inside: boolean;
}

/** Free sides (KiCad's convention), then inside the body, then beside the outermost pins of pinned sides. */
function candidates(p: Prepared): Candidate[] {
  return [
    ...p.freeSides.map((s) => ({ fields: slotFields(p.body, s), inside: false })),
    ...INSIDE_SLOTS.map((s: FieldSlot) => ({ fields: slotFields(p.body, s), inside: true })),
    ...OUTSIDE_SLOTS.flatMap((s) => besidePinFields(p.body, s, p.tips.get(s) ?? []).map((fields) => ({ fields, inside: false }))),
  ];
}

export type FieldsResult = { readonly ok: true; readonly placed: PlacedUnit[] } | { readonly ok: false; readonly mismatch: Mismatch };

/** How this module names its scope in a message: unchanged text, derived from `FieldScene.block`. */
const scopeOf = (scene: FieldScene): string => `block ${scene.block}`;

/** Fields for every placement, in placement order; throws when a unit has no clear slot. */
export function placeFields(scene: FieldScene): PlacedUnit[] {
  const r = tryPlaceFields(scene);
  if (!r.ok) throw new Error(describeMismatch(r.mismatch));
  return r.placed;
}

/** Fields for every placement, in placement order, or why a unit has no clear slot. */
export function tryPlaceFields(scene: FieldScene): FieldsResult {
  const prepared = scene.placements.map((pl) => {
    const u = scene.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
    if (u === undefined) throw new Error(`${scopeOf(scene)}: placement ${pl.part}#${pl.unit} is not a unit of the block`);
    return prepare(u, pl);
  });
  const segments: Segment[] = [
    ...scene.wires.map((w, i) => ({ what: `wire ${i} (${w.net})`, a: w.a, b: w.b })),
    ...prepared.flatMap((p) => p.pins),
  ];
  const fixed: Obstacle[] = [
    ...prepared.flatMap((p) => p.decorations),
    ...prepared.flatMap((p) => p.marks),
    ...scene.labels.map((l) => ({ what: `label ${l.net}`, box: labelBox(l) })),
    ...scene.powers.flatMap((p) => {
      const t = powerText(scene.libs, p);
      return [{ what: `power ${p.net}`, box: t.glyph }, { what: `value of power ${p.net}`, box: powerValueBox(t.value, t.text) }];
    }),
  ];
  const placed: Obstacle[] = [];
  const out: PlacedUnit[] = [];
  for (const p of prepared) {
    const others = prepared.filter((q) => q !== p).map((q) => ({ what: `body of ${q.key}`, box: q.body }));
    const texts = (f: Fields): Box[] => [textBox(f.reference, reservedReference(p.u.part.refPrefix)), textBox(f.value, p.u.part.value)];
    /**
     * **What blocks this candidate, named as the drawing names it, or null when it is clear.**
     * This was `clear(): boolean`, and it is widened for one reason: Task 8's `clearance` mismatch
     * must name the obstacle PAIR, and a boolean throws away the half of the pair that is not the
     * text. The condition is unchanged - every box must be inside the body when inside, clear of
     * every blocker, and crossed by no stroke - so `blockerOf(c) === null` is exactly the old
     * `clear(c)`, and the candidate chosen for a layout that passed before passes now.
     */
    const blockerOf = ({ fields: f, inside }: Candidate): string | null => {
      // A clear gap, not mere abutment: rows of 1.27 mm text touching edge to edge read as one smear.
      const boxes = texts(f).map((t) => growBox(t, MARGIN));
      const blockers: Obstacle[] = [...fixed, ...others, ...placed, ...(inside ? p.interiorBoxes : [{ what: "own body", box: p.body }])];
      const strokes = inside ? [...segments, ...p.strokes] : segments;
      for (const b of boxes) {
        if (inside && !within(b, p.body)) return `the edge of ${p.key}'s own body`;
        const hit = blockers.find((o) => boxesOverlap(b, o.box));
        if (hit !== undefined) return hit.what;
        const stroke = strokes.find((s) => segmentHitsBox(s.a, s.b, b));
        if (stroke !== undefined) return stroke.what;
      }
      return null;
    };
    const cand = candidates(p).find((c) => blockerOf(c) === null);
    if (cand === undefined) {
      /**
       * **The obstacle pair is the PREFERRED slot's blocker, which is a measurement and not a
       * summary.** Every candidate is blocked, so there is no single obstacle that caused this;
       * what is reportable is what blocked the slot the placer wanted first - the conventional
       * outside slot, or the body centre when every side has a pin. Naming that is the honest
       * second half of the pair, and it is the one a person would look at first.
       */
      const preferred = candidates(p)[0];
      const blocker = preferred === undefined ? null : blockerOf(preferred);
      if (blocker === null) {
        throw new Error(
          `${scopeOf(scene)}: ${p.key}: every candidate field slot is blocked, but re-checking the first one found ` +
            "nothing blocking it. candidates() always offers the five inside slots, so this is a defect in " +
            "render/field-placement.ts (blockerOf and the search disagreeing), not a layout problem.",
        );
      }
      const reason =
        `${scopeOf(scene)}: ${p.key} (${p.u.symbol.libId}): no place for its Reference and Value — every pin-free side, every ` +
        "spot inside its body and beside its outermost pins is blocked by wires, pins, pin text, interior graphics, labels or other text";
      return {
        ok: false,
        mismatch: {
          kind: "clearance",
          reason,
          constraint: "field placement",
          obstacles: [`Reference and Value of ${p.key}`, blocker],
          block: scene.block,
        },
      };
    }
    for (const [i, b] of texts(cand.fields).entries()) placed.push({ what: `${i === 0 ? "Reference" : "Value"} of ${p.key}`, box: b });
    out.push({ key: p.key, body: p.body, fields: cand.fields, inside: cand.inside, pins: p.pins });
  }
  return { ok: true, placed: out };
}

function blockScene(g: BlockSubgraph, layout: BlockLayout, libs: LibLookup): FieldScene {
  const { powers, labels } = anchorsToSymbols(g,layout.anchors, valuesAlong(g.block.rendering));
  return { block: g.block.id, units: g.units, placements: layout.placements, wires: layout.wires, powers, labels, libs };
}

/**
 * One block's field placement as a `FieldsResult`, so a caller that forwards a refusal keeps its
 * classified `Mismatch`. `drawnBoxes` (`render/drawn-extent.ts`) is the caller that needs it; the
 * string form below is what `checkLayout` still wants, and its text is unchanged.
 */
export function blockFieldsResult(g: BlockSubgraph, layout: BlockLayout, libs: LibLookup): FieldsResult {
  return tryPlaceFields(blockScene(g, layout, libs));
}

/** Fields of one block's units against that block's own drawing (its anchors drawn as symbols/labels); throws when one has no slot. */
export function blockFields(g: BlockSubgraph, layout: BlockLayout, libs: LibLookup): PlacedUnit[] {
  return placeFields(blockScene(g, layout, libs));
}

/**
 * Why a unit of the block has no clear slot for its fields, or nothing when every unit has one.
 *
 * It returns the mismatch's `reason` ALONE, not `describeMismatch`: this feeds `checkLayout`, whose
 * problem lines are asserted verbatim by the ported clearance tests, and appending a kind tag
 * there would change text those tests measure for no gain - `checkLayout` returns strings and has
 * no mismatch to classify.
 */
export function blockFieldProblems(g: BlockSubgraph, layout: BlockLayout, libs: LibLookup): string[] {
  const r = blockFieldsResult(g, layout, libs);
  return r.ok ? [] : [r.mismatch.reason];
}
