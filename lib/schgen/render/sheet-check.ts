/**
 * Ported from digital-pedal-platform's `tools/schgen/render/sheetCheck.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 *
 * **DIVERGED BY TASK 2 of `docs/superpowers/plans/2026-10-27-gates-classify.md`:** `assertSheetSafe`
 * throws `SchgenRefusal(findings, message)` rather than a plain `Error`, with the thrown message
 * text unchanged. The function already split its own two throw sites into `"wire safety"`
 * (`checkWireSafety`, `danglingWireEnds`) and `"body clearance"` (`bodyOverlaps`, `clearance`,
 * `bodyGlyphProblems`, `glyphGlyphProblems`) - the owner's line, already present here - and that
 * split is preserved as `kind`s rather than re-derived: wire safety's batches are tagged
 * `"missing-junction"` and `"dangling-end"`; body clearance's are tagged `"body-clearance"` (the
 * overlap and margin checks) and `"glyph-clearance"` (the glyph checks), matching the dedicated
 * kinds those two concerns already have in `findings.ts`.
 *
 * **`"missing-junction"`, NOT `"short"`, FOR THE SAME REASON `layout-check.ts` GIVES AT ITS OWN
 * USE OF THIS BATCH:** `checkWireSafety`'s messages are predominantly "split the wire there"
 * mid-wire junction cases, which `CLAUDE.md` names by this name as the class that must keep
 * refusing. **One branch this tag still gets wrong:** `wireOverWires`'s collinear-overlap case
 * (rule 2) runs with no net test, and a SAME-NET collinear overlap is "redundant geometry" per
 * its own docstring - correct about the circuit, merely ugly, which is `"usable"`. Tagging it
 * `"missing-junction"` (or `"short"`) withholds an ugly-but-correct drawing rather than shipping
 * it. Not fixed here: that needs `wireOverWires` itself to say which branch produced a line.
 */

/**
 * Sheet-wide backstop over every block's translated layout plus the sheet's power symbols and
 * labels. Each block was checked on its own; this catches what only appears once blocks share a
 * sheet: contacts between blocks, bodies of different blocks overlapping or crossed by another
 * block's wiring, a body drawn over another block's power glyph, PWR_FLAG or label, two power glyphs that meet (glyphClearance), and a power symbol (a pin to KiCad: it joins by coincidence only) left mid-wire
 * where its block's label anchor would have joined anywhere on the wire, and a wire end that
 * touches nothing once every block's pins, power symbols and labels are on the sheet.
 */
import { unitKey, type SheetId } from "../ir/types.ts";
import { finding, SchgenRefusal, type Finding } from "../findings.ts";
import type { BlockLayout, BlockSubgraph } from "./block-types.ts";
import { placedPins } from "./blocks.ts";
import { sceneClearanceProblems } from "./body-clearance.ts";
import type { ConnItem } from "./connectivity.ts";
import { boxesOverlap, placeBox } from "./geometry.ts";
import { bodyGlyphProblems, glyphGlyphProblems } from "./glyph-clearance.ts";
import type { LibLookup } from "./power-text.ts";
import type { GlobalLabel, PowerSymbol } from "./sheet-types.ts";
import { checkWireSafety, danglingWireEnds } from "./wire-safety.ts";

export interface SheetBlock {
  readonly g: BlockSubgraph;
  /** The block's layout in sheet coordinates. */
  readonly layout: BlockLayout;
}

export interface SheetScene {
  readonly sheet: SheetId;
  /** Resolves every power symbol's lib id (its glyph is checked against every body). */
  readonly symbols: LibLookup;
  readonly blocks: readonly SheetBlock[];
  readonly powers: readonly PowerSymbol[];
  readonly labels: readonly GlobalLabel[];
}

const powerWhat = (p: PowerSymbol, i: number): string => (p.flag ? `PWR_FLAG ${p.net} ${i}` : `power ${p.net} ${i}`);

/** Wires, placed pin ends, power symbol pins (on their rail) and label anchors of the whole sheet. */
export function sheetItems(scene: SheetScene): ConnItem[] {
  const wires: ConnItem[] = scene.blocks.flatMap(({ g, layout }) =>
    layout.wires.map((w, i): ConnItem => ({ kind: "wire", a: w.a, b: w.b, net: w.net, what: `wire ${i} of ${g.block.id}` })),
  );
  const pins: ConnItem[] = scene.blocks.flatMap(({ g, layout }) =>
    placedPins(g, layout.placements).map((p): ConnItem => ({ kind: "pin", at: p.at, net: p.net, what: `${p.part}.${p.pin}` })),
  );
  const powers: ConnItem[] = scene.powers.map((p, i): ConnItem => ({ kind: "pin", at: p.at, net: p.net, what: powerWhat(p, i) }));
  const labels: ConnItem[] = scene.labels.map((l, i): ConnItem => ({ kind: "anchor", at: l.at, net: l.net, what: `label ${l.net} ${i}` }));
  return [...wires, ...pins, ...powers, ...labels];
}

function bodyOverlaps(scene: SheetScene): Finding[] {
  const placed = scene.blocks.flatMap(({ g, layout }) =>
    layout.placements.map((pl) => {
      const u = g.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
      if (u === undefined) throw new Error(`sheet ${scene.sheet}: placement ${unitKey(pl.part, pl.unit)} is not a unit of block ${g.block.id}`);
      const box = u.symbol.boxes.get(pl.unit);
      if (box === undefined) throw new Error(`${u.symbol.libId} has no body box for unit ${pl.unit}`);
      return { key: unitKey(pl.part, pl.unit), box: placeBox(pl.at, pl.rot, box) };
    }),
  );
  return placed.flatMap((p, i) =>
    placed.slice(i + 1).flatMap((q) =>
      boxesOverlap(p.box, q.box) ? [finding("body-clearance", `bodies of ${p.key} and ${q.key} overlap`, `${p.key} & ${q.key}`)] : [],
    ),
  );
}

/**
 * `where` stays sheet-level: `sceneClearanceProblems` (`body-clearance.ts`) returns plain strings
 * with no per-item structure to read without parsing the text - restructuring that file is out of
 * this task's scope.
 */
function clearance(scene: SheetScene): Finding[] {
  const where = `sheet ${scene.sheet}`;
  const problems = sceneClearanceProblems({
    scope: `sheet ${scene.sheet}`,
    units: scene.blocks.flatMap((b) => b.g.units),
    placements: scene.blocks.flatMap((b) => b.layout.placements),
    wires: scene.blocks.flatMap((b) => b.layout.wires),
    anchors: [...scene.powers, ...scene.labels],
  });
  return problems.map((what) => finding("body-clearance", what, where));
}

const lines = (findings: readonly Finding[]): string => findings.map((f) => `\n  - ${f.what}`).join("");

/**
 * Throws `sheet <id>: wire safety:` or `sheet <id>: body clearance:` with one line per problem.
 * `where` on the wire-safety and glyph batches stays sheet-level, same reason as `clearance`
 * above: `checkWireSafety`, `danglingWireEnds` (`wire-safety.ts`) and `bodyGlyphProblems`/
 * `glyphGlyphProblems` (`glyph-clearance.ts`) return plain strings with no item to read out
 * without parsing text.
 */
export function assertSheetSafe(scene: SheetScene): void {
  const found = sheetSafety(scene);
  if (found.findings.length > 0) throw new SchgenRefusal(found.findings, found.message);
}

/**
 * **`assertSheetSafe` WITHOUT THE THROW** - Task 3 of
 * `docs/superpowers/plans/2026-10-27-gates-classify.md`, and the half of that task without which
 * nothing visible would have changed.
 *
 * The three transistor-preamp boards refuse at the ELK backend's clearance check on a power-symbol
 * value, and `textProblems` re-checks the same overlaps once the blocks are on a sheet. Carrying
 * the block-level geometry past the first gate and leaving this one throwing would have moved the
 * refusal twelve lines later and produced the same nothing: an independent review caught exactly
 * that reading of an earlier revision of the spec, which is why this function exists.
 *
 * **THE WIRE-SAFETY SHORT CIRCUIT IS PRESERVED, DELIBERATELY.** `assertSheetSafe` checked bodies
 * only when wire safety was clean, and this returns the safety batch alone when it is not. Both
 * batches would be a longer report, and it would be a report about a sheet whose connectivity is
 * already wrong - and `bodyOverlaps` throws rather than refusing when a placement is not a unit of
 * its block, so running it on a sheet the earlier gate rejected can surface a different error than
 * the one a reader is owed. `message` is empty exactly when `findings` is.
 */
export interface SheetSafety {
  readonly findings: readonly Finding[];
  /** The sentence `assertSheetSafe` throws: which of the two batches this is, and its lines. */
  readonly message: string;
}

export function sheetSafety(scene: SheetScene): SheetSafety {
  const where = `sheet ${scene.sheet}`;
  const items = sheetItems(scene);
  const safety: Finding[] = [
    ...checkWireSafety(items).map((what) => finding("missing-junction", what, where)),
    ...danglingWireEnds(items).map((what) => finding("dangling-end", what, where)),
  ];
  if (safety.length > 0) return { findings: safety, message: `sheet ${scene.sheet}: wire safety:${lines(safety)}` };
  const bodies: Finding[] = [
    ...bodyOverlaps(scene),
    ...clearance(scene),
    ...bodyGlyphProblems(scene).map((what) => finding("glyph-clearance", what, where)),
    ...glyphGlyphProblems(scene).map((what) => finding("glyph-clearance", what, where)),
  ];
  if (bodies.length > 0) return { findings: bodies, message: `sheet ${scene.sheet}: body clearance:${lines(bodies)}` };
  return { findings: [], message: "" };
}
