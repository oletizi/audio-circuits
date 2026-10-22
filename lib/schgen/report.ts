/**
 * Ported from digital-pedal-platform's `tools/schgen/report.ts`, and DIVERGED from it by Task 8
 * of the M1 schematic-authoring plan: plan decision D3 deletes the `labels` rendering this file
 * reported on and adds `auto`.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 *
 * **DIVERGED FURTHER BY TASK 16**: the report carries spec §3.3's four measures per sheet.
 */

/**
 * RENDER-REPORT.md: the templates used, the blocks left to the automatic renderer, per-sheet
 * counts, and the pins declared not connected in bulk. Deterministic: circuit order, no timestamps.
 *
 * **The "label-rendered blocks" section is now the "automatically rendered blocks" section.** It
 * listed the blocks whose connectivity was drawn in labels with the reason each one gave; that
 * rendering is deleted (D3), and the blocks worth listing are instead the ones with no declared
 * template, since those are the ones whose drawing nobody chose. There is no reason string to
 * print any more: `{ kind: "auto" }` carries no payload.
 */
import type { BlockId, Circuit, PartLabel, SheetId } from "./ir/types.ts";
import type { SheetDrawing } from "./render/sheet-types.ts";
import type { FieldFallback } from "./render/field-placement.ts";
import { renderMeasures, sheetMeasuresOf, type SchematicMeasures } from "./readability/measures.ts";

export interface BlockReport {
  readonly id: BlockId;
  readonly sheet: SheetId;
  readonly rendering: "wired" | "bus" | "auto";
  /** Template id, `groups: <names>`, or - for `auto` - what chose the drawing, which nothing declared. */
  readonly detail: string;
}

export interface SheetCounts {
  readonly sheet: SheetId;
  readonly parts: number;
  readonly units: number;
  readonly wires: number;
  readonly labels: number;
  readonly powerSymbols: number;
  readonly noConnects: number;
  readonly junctions: number;
}

/**
 * Spec §3.3's four measures for one emitted sheet.
 *
 * **IT IS IN THE RENDER REPORT BECAUSE OF G209's LESSON AND NOT FOR COMPLETENESS.** That entry
 * records that Task 15's figures *"were computed in a scratch script and were the only number in
 * these entries nobody else could reproduce"*; the fix was to put the measure in a committed file.
 * These four go in the report every generation produces, so the numbers behind any claim about a
 * sheet are regenerated and compared by content on every run.
 *
 * **AND THEY ARE DIAGNOSTICS, WHICH THE REPORT SAYS IN WORDS.** Spec §3.3 revision 4: absent a
 * dominance rule, a four-measure comparison is descriptive, not pass/fail. The section carries
 * that sentence, so a reader cannot take a row of improving numbers for an acceptance result.
 */
export interface SheetMeasures {
  readonly sheet: SheetId;
  readonly measures: SchematicMeasures;
}

export interface RenderReport {
  readonly blocks: readonly BlockReport[];
  readonly sheets: readonly SheetCounts[];
  readonly measures: readonly SheetMeasures[];
  readonly ncUnlisted: readonly { part: PartLabel; reason: string; pins: readonly string[] }[];
  /**
   * **EVERY REFERENCE/VALUE PAIR THIS GENERATION DREW OVER SOMETHING, per sheet, per block, per
   * unit** - and this section is the whole reason Task 24's change is not a silent degradation.
   *
   * `render/field-placement.ts` used to refuse a block it had no clear slot for, which stopped the
   * generation. It now takes the least-covered candidate, which means a sheet can be produced with
   * overlapping text, and `render/text-scene.ts` deliberately does not report those overlaps - the
   * placer already knew. **So this is the channel.** A reader of `RENDER-REPORT.md` sees the count
   * and what each one covers; without it, the only visible difference between a clean sheet and a
   * degraded one would be the drawing itself.
   */
  readonly fieldFallbacks: readonly { sheet: SheetId; fallbacks: readonly FieldFallback[] }[];
}

function blockReports(c: Circuit): BlockReport[] {
  return [...c.blocks.values()]
    .sort((a, b) => a.order - b.order)
    .map((b): BlockReport => {
      const r = b.rendering;
      switch (r.kind) {
        case "wired":
          return { id: b.id, sheet: b.sheet, rendering: "wired", detail: r.template };
        case "bus":
          return { id: b.id, sheet: b.sheet, rendering: "bus", detail: `groups: ${r.groups.map((g) => g.name).join(", ")}` };
        case "auto":
          return { id: b.id, sheet: b.sheet, rendering: "auto", detail: "no declared template" };
      }
    });
}

function sheetCounts(d: SheetDrawing): SheetCounts {
  return {
    sheet: d.sheet.id,
    parts: new Set(d.symbols.map((s) => s.part)).size,
    units: d.symbols.length,
    wires: d.wires.length,
    labels: d.labels.length,
    powerSymbols: d.powers.length,
    noConnects: d.noConnects.length,
    junctions: d.junctions.length,
  };
}

export function buildReport(c: Circuit, drawings: readonly SheetDrawing[]): RenderReport {
  const ncUnlisted = [...c.parts.values()]
    .sort((a, b) => a.order - b.order)
    .flatMap((p) =>
      p.ncUnlistedReason === null
        ? []
        : [{ part: p.label, reason: p.ncUnlistedReason, pins: c.pins.filter((x) => x.part === p.label && x.origin === "nc-unlisted").map((x) => x.pin) }],
    );
  return {
    blocks: blockReports(c),
    sheets: drawings.map(sheetCounts),
    measures: drawings.map((d) => ({ sheet: d.sheet.id, measures: sheetMeasuresOf(d) })),
    ncUnlisted,
    fieldFallbacks: drawings.map((d) => ({ sheet: d.sheet.id, fallbacks: d.fieldFallbacks })),
  };
}

const cell = (s: string): string => s.replaceAll("|", "\\|");

function section(title: string, lines: readonly string[]): string[] {
  return ["", `## ${title}`, "", ...(lines.length === 0 ? ["None."] : lines)];
}

export function renderReport(r: RenderReport): string {
  const blockRows = r.blocks.map((b) => `| ${cell(b.id)} | ${cell(b.sheet)} | ${b.rendering} | ${cell(b.detail)} |`);
  const automatic = r.blocks.filter((b) => b.rendering === "auto").map((b) => `- ${b.id} (${b.sheet}): ${b.detail}`);
  const sheetRows = r.sheets.map(
    (s) => `| ${cell(s.sheet)} | ${s.parts} | ${s.units} | ${s.wires} | ${s.labels} | ${s.powerSymbols} | ${s.noConnects} | ${s.junctions} |`,
  );
  const nc = r.ncUnlisted.map((n) => `- ${n.part} (${n.reason}): ${n.pins.length} pins: ${n.pins.join(", ")}`);
  const fallbacks = r.fieldFallbacks.flatMap((f) => f.fallbacks);
  const fallbackLines =
    fallbacks.length === 0
      ? []
      : [
          `**${fallbacks.length} field pair(s) on this generation's sheets are drawn over something.** The`,
          "placer had no clear slot for them and took the least-covered one rather than refuse the",
          "drawing. These overlaps are NOT reported by the text-clearance checks - the placer already",
          "knew - so this list is where they are reported, and a sheet with a row here is not a clean",
          "sheet.",
          "",
          "| Sheet | Block | Unit | Symbol | Covers | Weighted overlap (um^2) |",
          "|---|---|---|---|---|---|",
          ...r.fieldFallbacks.flatMap((s) =>
            s.fallbacks.map(
              (f) => `| ${cell(s.sheet)} | ${cell(f.block)} | ${cell(f.key)} | ${cell(f.libId)} | ${cell(f.covers.join("; "))} | ${f.cost} |`,
            ),
          ),
        ];
  return [
    "# Render report",
    "",
    "Generated by schgen; do not edit. Templates used, automatically rendered blocks, and per-sheet counts.",
    ...section("Blocks", blockRows.length === 0 ? [] : ["| Block | Sheet | Rendering | Template, groups or detail |", "|---|---|---|---|", ...blockRows]),
    ...section("Automatically rendered blocks", automatic),
    ...section(
      "Sheets",
      sheetRows.length === 0
        ? []
        : ["| Sheet | Parts | Units | Wires | Labels | Power symbols | No-connects | Junctions |", "|---|---|---|---|---|---|---|---|", ...sheetRows],
    ),
    ...section("Pins declared not connected in bulk", nc),
    ...section("Field placements the placer could not keep clear", fallbackLines),
    ...section("Readability measures, per sheet", [
      "Spec 3.3's four measures. There is NO composite score: four numbers moving in different",
      "directions cannot be resolved into a verdict by anything the spec states, so these are",
      "DIAGNOSTICS and never an acceptance result. Acceptance rests on the hard geometric checks",
      "and on independent render approval (schematic/readability-baselines.json).",
      "",
      ...r.measures.map((m) => `- ${cell(m.sheet)}: ${renderMeasures(m.measures)}`),
    ]),
    "",
  ].join("\n");
}
