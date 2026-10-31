/**
 * Ported from digital-pedal-platform's `tools/schgen/render/blockTypes.ts`, and DIVERGED from it
 * by Task 8 of the M1 schematic-authoring plan: `RealiseResult`'s false arm carried a bare
 * `reason: string` and now carries a classified `Mismatch`, and `Selection` and `Backend` are new.
 * **Diverged further by Task 13 under ruling R29**: `BlockUnit` carries the rotation its unit is
 * drawn at and `BlockSubgraph` carries the circuit's `portDirections`, so the ELK backend reaches
 * spec §1.5's step-2 answer and §1.9's declared directions from its own declared input.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

import { finding, type Finding, type FindingKind } from "../findings.ts";
import type { BlockId, IrBlock, IrPart, IrPin, NetName, PartLabel, PortDirection, RailSpec, TemplateId } from "../ir/types.ts";
import type { Point, Rotation, Side } from "./geometry.ts";
import type { LibSymbol } from "./library.ts";

export interface BlockUnit {
  readonly part: IrPart;
  readonly unit: number;
  readonly symbol: LibSymbol;
  readonly pins: readonly IrPin[];
  /**
   * **THE ROTATION THIS UNIT IS DRAWN AT, RESOLVED ONCE** - ruling **R29**, spec §1.4 obligation 3.
   *
   * It is `drawnRotation(c.orientations.get(part.label))` - spec §1.5 step 2's answer where the
   * rule gave one, and the symbol's own library frame where it declined. `subgraphOf` computes it;
   * `lib/schgen/elk/graph.ts` fixes the ELK ports at it and `lib/schgen/elk/adapt.ts` recomputes
   * every pin end at it, **so ELK and the emitter see one transformed geometry and there is no
   * second copy to drift** - which is the obligation's operative clause verbatim.
   *
   * **A TEMPLATE DOES NOT READ IT, AND THAT IS §1.5's AUTHORITY ORDER AND NOT AN OVERSIGHT.** Step
   * 1 is *"an explicit orientation in a reviewed template wins"*: the seven ported templates each
   * choose their own rotation (`orientTwoPin`, `connector-fanout`'s four-rotation search), and a
   * rule-library preference may not override a human arrangement that was reviewed. This field is
   * step 2's answer, and only the step-3 backend consumes it.
   */
  readonly rot: Rotation;
}

export interface BlockSubgraph {
  readonly block: IrBlock;
  readonly units: readonly BlockUnit[];
  readonly rails: ReadonlySet<NetName>;
  readonly groundRails: ReadonlySet<NetName>;
  /** Labelled, non-rail nets touching this block: each piece needs a global label. */
  readonly external: ReadonlySet<NetName>;
  /** The specs of `rails`, for drawing their anchors as power symbols. */
  readonly railSpecs: ReadonlyMap<NetName, RailSpec>;
  /**
   * The circuit's declared port directions - **carried the way `railSpecs` already is**, by ruling
   * **R29**, which closes **G186**.
   *
   * `negotiablePort` reads two things to place a boundary net: a rail's `kind` and a net's
   * direction. The first was always here, in `railSpecs`; the second was the *"only input genuinely
   * missing from the IR"*, and `elkInputOf` therefore took a whole `SchematicAuthoring` for it. It
   * does not any more: a `BlockSubgraph` now answers both, so nothing beside a design has to be
   * handed to `generate` for a block to reach ELK.
   *
   * **It is the WHOLE circuit's map and not this block's subset, deliberately.** A net crossing
   * THIS block's boundary may be internal to the circuit and have no entry at all (**G99**'s open
   * residue), so a subset keyed to the block would be a map whose absences mean two different
   * things. `negotiablePort` handles an absent entry with a stated reason; a narrowed map would not
   * let it.
   */
  readonly portDirections: Readonly<Record<NetName, PortDirection>>;
  /** The power symbols of `rails`, by lib id. */
  readonly powerLibs: ReadonlyMap<string, LibSymbol>;
  /** The intersheet references of each net in `external`, as its labels print them (pageRefs.ts). */
  readonly labelRefs: ReadonlyMap<NetName, string>;
}

export interface Placement {
  readonly part: PartLabel;
  readonly unit: number;
  readonly at: Point;
  readonly rot: Rotation;
}

export interface Wire {
  readonly a: Point;
  readonly b: Point;
  readonly net: NetName;
}

/** Where a rail's power symbol or an external net's global label attaches; `side` points away from the circuit. */
export interface Anchor {
  readonly net: NetName;
  readonly at: Point;
  readonly side: Side;
}

export interface BlockLayout {
  readonly placements: readonly Placement[];
  readonly wires: readonly Wire[];
  readonly anchors: readonly Anchor[];
}

/**
 * **WHY FOUR KINDS AND NOT ONE STRING** (Task 8; spec §1.3, `docs/known-gaps.md` **G84** and
 * **G94**). The ported type was `{ ok: false; reason: string }`, and 30 call sites across seven
 * templates funnelled into it, so *"the caller cannot tell 'no template applies to this subgraph'
 * from 'a template applied and failed'"*. The caller behaves differently on the two: the first
 * selects another renderer, the second is a generation error that nothing may rescue - because a
 * rescue would hide a defect in the preferred rendering path, which is **G84**'s finding.
 *
 * **Every site states which it is, and that is the work rather than the type.** *"A widened type
 * with 30 sites still reporting an undifferentiated string buys nothing"* - spec §1.3, verbatim.
 * `tests/schgen/render/templates/mismatch-census.test.ts` counts the classified sites per module
 * so a site cannot quietly go back to being unclassified, and there is no constructor that takes
 * a reason alone.
 *
 * **`reason` is still carried by every kind, and is still a sentence a person reads.** The
 * structured fields are what a caller branches on; the reason is what it prints. The two are not
 * alternatives, and `describeMismatch` puts them in that order.
 */
export type MismatchKind = "not-applicable" | "invalid-geometry" | "clearance" | "backend-raised";

/**
 * What produced a layout: one of the reviewed templates, or the ELK backend.
 *
 * **WIDENED BY TASK 13, AND THE WIDENING IS THE POINT.** `invalid-geometry`'s `template` field was
 * a `TemplateId`, so **the ELK backend could not report the kind at all** - and spec §1.4 gives it
 * two `invalid-geometry` defects of its own, an ambiguous wire overlap and a snap collapse, which
 * are exactly *"a renderer applied and produced geometry disagreeing with the IR"*. The alternative
 * was to file them as `backend-raised`, which `docs/known-gaps.md` **G84** forbids by name: that
 * kind means the backend *"did not return a result at all"*, and a geometry defect reported as a
 * crash is the misclassification that type exists to prevent.
 *
 * The field keeps its name so the 30 template sites and the nine tests that read it are untouched.
 */
export type Renderer = TemplateId | "elk";

/** The `Renderer` the ELK backend reports as. One string, named, rather than a literal at each site. */
export const ELK_RENDERER: Renderer = "elk";

export type Mismatch =
  /** No template supports this topology: nothing was drawn and there is no defect to hide. */
  | { readonly kind: "not-applicable"; readonly reason: string }
  /** A renderer applied and produced geometry disagreeing with the IR. */
  | { readonly kind: "invalid-geometry"; readonly reason: string;
      readonly template: Renderer; readonly connection: string }
  /** A template applied and violated a clearance constraint. */
  | { readonly kind: "clearance"; readonly reason: string;
      readonly constraint: string; readonly obstacles: readonly [string, string]; readonly block: BlockId }
  /** The backend did not return a result at all: it raised, or did not terminate. */
  | { readonly kind: "backend-raised"; readonly reason: string;
      readonly backend: string; readonly inputKey: string };

/**
 * **THE FALSE ARM CARRIES THE GEOMETRY THE RENDERER DID PRODUCE, which is Task 3 of
 * `docs/superpowers/plans/2026-10-27-gates-classify.md` and the owner's directive:** *"Gates can
 * still refuse to ratify an output, but they shouldn't hide the output."* A refusal used to carry
 * a `Mismatch` and nothing else, so a block whose route was drawn, snapped, canonicalised and
 * then failed a clearance check reached its caller as a sentence - and **four of the eleven boards
 * in `boards/` have never been seen because of it.**
 *
 * **BOTH NEW FIELDS ARE OPTIONAL, AND THAT IS A MEASURED TRADE RATHER THAN LAXITY.** Fourteen
 * sites across eight template modules forward an inner planning helper's refusal as
 * `{ ok: false, mismatch: plan.mismatch }`; every one of them is a SHAPE or REACHABILITY verdict
 * taken before any geometry exists, so an absent field states the truth at those sites. Making the
 * fields required would have diverged eight ported template modules to write `layout: null,
 * findings: []` fourteen times and bought nothing. **An absence therefore means "this renderer
 * drew nothing", and `refusedLayout` below is the one place that reading is stated.**
 *
 * `findings` is the per-item classification of what went wrong, when the producer HAS it -
 * `lib/schgen/elk/adapt.ts` runs `checkLayout`, which returns `Finding[]` already, and flattening
 * those to a sentence was the other half of the same loss. Where a producer has none,
 * `mismatchFindings` synthesises exactly one from the mismatch's own kind, so **no refusal reaches
 * the census without a class.**
 */
export type RealiseResult =
  | { readonly ok: true; readonly layout: BlockLayout }
  | {
      readonly ok: false;
      readonly mismatch: Mismatch;
      /** The geometry this renderer produced before it was refused; absent when it drew nothing. */
      readonly layout?: BlockLayout | undefined;
      /** The per-item findings behind the refusal; absent when the producer has none to give. */
      readonly findings?: readonly Finding[] | undefined;
    };

/** The geometry a refusal carries, or `null` when the renderer drew nothing. */
export function refusedLayout(r: RealiseResult): BlockLayout | null {
  if (r.ok) return r.layout;
  return r.layout ?? null;
}

/**
 * **A `MismatchKind`'s `FindingKind`, and the mapping is the owner's line rather than this file's
 * judgement.** `findings.ts`'s `classOf` then decides the class, and nothing here may second-guess
 * it. The switch has no `default`: a fifth `MismatchKind` fails to compile here.
 *
 * - `not-applicable` -> `no-template-applies`. Nothing was drawn and nothing could be by this
 *   renderer, which is `not-drawable` - the one class where there is no artifact to call right or
 *   wrong.
 * - `invalid-geometry` -> `geometry-disagrees-with-ir`. Its own docstring is *"a renderer applied
 *   and produced geometry disagreeing with the IR"*: a drawing that asserts a connection the
 *   circuit does not have is WRONG ABOUT THE CIRCUIT, so it is `defective`. **A drawing exists and
 *   is still produced** - it is marked, not withheld.
 * - `clearance` -> `body-clearance`. *"A template applied and violated a clearance constraint"* is
 *   crowding: correct about the circuit, hard to read, which is the owner's *"ugly but usable"*.
 *   It is the GENERIC crowding kind because a `Mismatch` names a constraint and an obstacle pair
 *   rather than which of body, glyph or text clearance produced it; where the producer carries its
 *   own `Finding[]` those exact kinds travel instead of this one, which is the normal case on the
 *   ELK path.
 * - `backend-raised` -> `backend-raised`, the same name in both vocabularies. *"The backend did
 *   not return a result at all: it raised, or did not terminate"* is this generator failing rather
 *   than a fact about the circuit, which is `generator-defect` - and `findings.ts` had already
 *   classified that name before this mapping existed.
 */
export function findingKindOfMismatch(kind: MismatchKind): FindingKind {
  switch (kind) {
    case "not-applicable": return "no-template-applies";
    case "invalid-geometry": return "geometry-disagrees-with-ir";
    case "clearance": return "body-clearance";
    case "backend-raised": return "backend-raised";
  }
}

/**
 * The findings behind one refusal, **never empty**: the producer's own when it has them, otherwise
 * exactly one built from the mismatch's kind. `where` names the subject - a block, a sheet - so a
 * synthesised finding is as locatable as a measured one.
 *
 * The producer's findings win because they are per-item and the synthesised one is per-refusal:
 * `checkLayout` naming eleven overlaps is eleven classifiable facts, and collapsing them into one
 * `body-clearance` would throw away the distinction between a glyph collision and a label that
 * misnames a net.
 */
export function mismatchFindings(where: string, m: Mismatch, carried?: readonly Finding[] | undefined): readonly Finding[] {
  if (carried !== undefined && carried.length > 0) return carried;
  return [finding(findingKindOfMismatch(m.kind), describeMismatch(m), where)];
}

/** The findings behind a `RealiseResult` that refused; `[]` for one that did not. */
export function realiseFindings(where: string, r: RealiseResult): readonly Finding[] {
  return r.ok ? [] : mismatchFindings(where, r.mismatch, r.findings);
}

/** A template only positions parts and routes the IR's own connections; it never adds one. */
export interface Template {
  readonly id: TemplateId;
  realise(g: BlockSubgraph): RealiseResult;
}

/**
 * What a refusing renderer HAD when it refused: the geometry it drew, and the findings it measured
 * on that geometry. **Defaulted to `NOTHING_DRAWN` by the two constructors that can be handed one**,
 * so a template site that passes three arguments keeps saying exactly what it said before - it drew
 * nothing - while `lib/schgen/elk/adapt.ts` passes the route it snapped and the `checkLayout`
 * findings it ran on it.
 */
export interface Drawn {
  readonly layout: BlockLayout | null;
  readonly findings: readonly Finding[];
}

/** The `Drawn` of a renderer that produced no geometry and measured nothing on it. */
export const NOTHING_DRAWN: Drawn = { layout: null, findings: [] };

/**
 * **The site is a SHAPE test over the subgraph**: this template's idiom is not what the block
 * holds, nothing has been drawn, and another renderer may still draw it. These are the only
 * mismatches that select ELK.
 */
export function notApplicable(reason: string): RealiseResult {
  return { ok: false, mismatch: { kind: "not-applicable", reason } };
}

/**
 * **A template applied and produced geometry the IR contradicts.** `connection` names the IR
 * connection it failed to realise, because "the geometry is wrong" without saying which
 * connection is a refusal nobody can act on.
 */
export function invalidGeometry(template: Renderer, connection: string, reason: string, drawn: Drawn = NOTHING_DRAWN): RealiseResult {
  return { ok: false, mismatch: { kind: "invalid-geometry", reason, template, connection }, layout: drawn.layout ?? undefined, findings: drawn.findings };
}

/**
 * **A template applied and collided.** `obstacles` is the pair the constraint is about and is
 * passed in explicitly rather than parsed out of the reason: see
 * `render/problem-obstacles.ts` for how `checkLayout`'s problem text is turned into one, and why
 * it refuses rather than guessing when it cannot.
 */
export function clearanceViolation(block: BlockId, constraint: string,
  obstacles: readonly [string, string], reason: string, drawn: Drawn = NOTHING_DRAWN): RealiseResult {
  return { ok: false, mismatch: { kind: "clearance", reason, constraint, obstacles, block }, layout: drawn.layout ?? undefined, findings: drawn.findings };
}

/**
 * **The backend returned no result at all**: it threw, or did not terminate. No template site
 * produces this - it exists for the ELK backend (**G94**: elkjs raises
 * `java.lang.IllegalStateException` on an op-amp self-loop, a state the two-valued type could not
 * express at all) and for the wrapper that attributes a template helper's thrown error to the
 * block and template it came from. `inputKey` identifies the input that did it, so the same crash
 * twice is recognisable as the same crash.
 */
export function backendRaised(backend: string, inputKey: string, reason: string): RealiseResult {
  return { ok: false, mismatch: { kind: "backend-raised", reason, backend, inputKey } };
}

/**
 * The mismatch as one line for a person: **the reason verbatim and first**, then its structured
 * fields in brackets. The order is load-bearing - the ported template tests match the reason text
 * as a substring of the thrown message, so a kind tag in front of it would break nine of them -
 * and the fields are there because a refusal that prints only prose throws away the classification
 * this type exists for. The `switch` has no `default`: a fifth kind fails to typecheck here.
 */
export function describeMismatch(m: Mismatch): string {
  switch (m.kind) {
    case "not-applicable": return `${m.reason} [not-applicable]`;
    case "invalid-geometry": return `${m.reason} [invalid-geometry: template ${m.template} cannot realise ${m.connection}]`;
    case "clearance": return `${m.reason} [clearance: ${m.constraint} between ${m.obstacles[0]} and ${m.obstacles[1]} in block ${m.block}]`;
    case "backend-raised": return `${m.reason} [backend-raised: ${m.backend} raised on ${m.inputKey}]`;
  }
}

/**
 * What a renderer was chosen for one block: a template that realised it, the ELK backend, or
 * nothing at all.
 *
 * **`selectRenderer` (`render/blocks.ts`) is where the rule is stated, and it is stated there
 * ONCE.** Do not restate it here or anywhere else: the first version of this comment said *"`elk`
 * is reachable only when every template reported `not-applicable`"*, which is true of an `auto`
 * block and false of a `wired` one, and a Task 9-15 implementer reading it would have written the
 * wrong rule. `docs/known-gaps.md` **G147** records why the two differ.
 */
export type Selection =
  | { readonly kind: "template"; readonly template: TemplateId; readonly layout: BlockLayout }
  | { readonly kind: "elk" }
  /**
   * **The refused arm carries the geometry and findings its `RealiseResult` carried, for the same
   * reason that arm does** (Task 3). `selectRenderer` forwarding only the `Mismatch` would have
   * reinstated the drop one layer above the one the plan names.
   */
  | {
      readonly kind: "refused";
      readonly mismatch: Mismatch;
      readonly layout?: BlockLayout | undefined;
      readonly findings?: readonly Finding[] | undefined;
    };

/**
 * A renderer that is not a template: the ELK backend of Task 12 onward. It returns a
 * `RealiseResult` like a template does, so a backend that crashes reports `backendRaised` rather
 * than propagating a Java stack trace to the caller - which is the state **G94** measured and the
 * ported type could not hold.
 */
export interface Backend {
  realise(g: BlockSubgraph): RealiseResult;
}
