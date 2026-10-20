/**
 * Ported from digital-pedal-platform's `tools/schgen/__fixtures__/circuits.ts` (with the MCU
 * pin-map cuts of `docs/known-gaps.md` **G112**), and DIVERGED from it by Task 8 of the M1
 * schematic-authoring plan: decision D3 deletes the `labels` rendering these fixtures declared.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 *
 * **WHY `bus` AND NOT `auto` IS THE SUBSTITUTE.** Every `{ kind: "labels" }` here existed to make
 * a block whose nets are all labelled - a peer block that forces a net across a boundary, or a
 * block holding the units a template does not draw. `labelledNets` labels every net of a `bus`
 * block and NONE of an `auto` block's internal ones, so `bus` is what these fixtures meant;
 * `valuesAlong` likewise treats `bus` as it treated `labels`. The fixture-backed assertions
 * therefore measure what they measured before.
 */

import { fixtureResolver, TEST_BOM } from "./fixture-lib.ts";
import { twoPin, UNNAMED } from "../../../lib/schgen/ir/author.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { BlockMember, BlockSpec, Circuit, PartSpec, RailSpec, Rendering, SheetNote } from "../../../lib/schgen/ir/types.ts";

export const symbols = fixtureResolver();

const passive = (prefix: string, libId: string) => (label: string, a: string, b: string): PartSpec =>
  twoPin({ label, refPrefix: prefix, libId, value: prefix === "R" ? "10k" : "100n", footprint: "F", bom: TEST_BOM, nets: [a, b], identities: UNNAMED, checklist: [], source: "fixture", dnp: false });

export const res = passive("R", "Fix:R");
export const cap = passive("C", "Fix:C");

export const diode = (label: string, k: string, a: string): PartSpec =>
  twoPin({ label, refPrefix: "D", libId: "Fix:D", value: "D", footprint: "F", bom: TEST_BOM, nets: [k, a], identities: ["K", "A"], checklist: [], source: "fixture", dnp: false });

export const RAILS: readonly RailSpec[] = [
  { net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null },
  { net: "3V3", symbol: "Pwr:+3V3", kind: "supply", pwrFlag: null },
  { net: "VDDA", symbol: "Pwr:+3V3", kind: "supply", pwrFlag: null },
];

/** A second ground drawn with the GND glyph, as the H7 draws VSSA (for moreRails). */
export const VSSA: RailSpec = { net: "VSSA", symbol: "Pwr:GND", kind: "ground", pwrFlag: null };

export interface BlockCircuitOptions {
  /** Nets that must leave the block: a peer block "PEER" gets one resistor from each to GND. */
  readonly external: readonly string[];
  /** Units of multi-unit parts moved out of "B" into a bus-rendered block "SPLIT" (e.g. unused op-amp units). */
  readonly splitUnits?: readonly { readonly part: string; readonly units: readonly number[] }[];
  /** Rails beyond RAILS (e.g. a second ground drawn with the GND glyph). */
  readonly moreRails?: readonly RailSpec[];
}

/** One wired block "B" holding `parts`, plus a PEER block making `external` nets cross blocks. */
export function blockCircuit(parts: PartSpec[], rendering: Rendering, opts: BlockCircuitOptions): Circuit {
  const peers = opts.external.map((n, i) => res(`R_PEER${i}`, n, "GND"));
  const splits = opts.splitUnits ?? [];
  const members: BlockMember[] = parts.flatMap((p): BlockMember[] => {
    const split = splits.find((s) => s.part === p.label);
    if (split === undefined) return [p.label];
    return p.units.filter((u) => !split.units.includes(u)).map((unit) => ({ part: p.label, unit }));
  });
  const splitMembers: BlockMember[] = splits.flatMap((s) => s.units.map((unit) => ({ part: s.part, unit })));
  return buildCircuit(
    {
      parts: [...parts, ...peers],
      blocks: [
        { id: "B", sheet: "s", title: "Block", members, checklist: [], rendering },
        ...(splitMembers.length > 0
          ? [{ id: "SPLIT", sheet: "s", title: "Split", members: splitMembers, checklist: [], rendering: { kind: "bus" as const, groups: [] } }]
          : []),
        ...(peers.length > 0
          ? [{ id: "PEER", sheet: "s", title: "Peer", members: peers.map((p) => p.label), checklist: [], rendering: { kind: "bus" as const, groups: [] } }]
          : []),
      ],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A3", notes: [] }],
      rails: [...RAILS, ...(opts.moreRails ?? [])],
    },
    { symbols },
  );
}

export interface LabelsCircuitOptions {
  /** The circuit's rails ([] for none). */
  readonly rails: readonly RailSpec[];
  /** Notes on sheet "s". */
  readonly notes: readonly SheetNote[];
  /** Checklist ids on block "B". */
  readonly checklist: readonly string[];
  /** Further blocks on sheet "s"; the parts they list are left out of block "B". */
  readonly others: readonly BlockSpec[];
}

/**
 * One A4 sheet "s" whose block "B" holds every part no block in `others` lists, rendered so that
 * EVERY net of it is labelled - which is what the name means and is why it is still `labelsCircuit`
 * after D3 deleted the `labels` rendering. The rendering that does that is now `bus` with no
 * groups.
 */
export function labelsCircuit(parts: PartSpec[], opts: LabelsCircuitOptions): Circuit {
  const taken = new Set(opts.others.flatMap((b) => b.members.map((m) => (typeof m === "string" ? m : m.part))));
  return buildCircuit(
    {
      parts,
      blocks: [
        {
          id: "B", sheet: "s", title: "B", checklist: opts.checklist, rendering: { kind: "bus", groups: [] },
          members: parts.filter((p) => !taken.has(p.label)).map((p) => p.label),
        },
        ...opts.others,
      ],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: opts.notes }],
      rails: opts.rails,
    },
    { symbols },
  );
}
