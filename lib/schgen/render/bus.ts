/**
 * Ported from digital-pedal-platform's `tools/schgen/render/bus.ts`, and DIVERGED from it by
 * Task 6b of the M1 schematic-authoring plan: the **labels renderer is deleted** (plan decision
 * D3, `docs/known-gaps.md` **G140**) and `renderBlock` routes an **`auto`** block to
 * `realiseBlock` beside a `wired` one.
 *
 * **Why it could not be a `cuts` entry, which is what was tried first.** Deleting
 * `realiseLabelled`, `labelledRotation` and the `"labels"` arm of `blockOf`/`attributed` IS pure
 * deletion. What is not is `renderBlock`'s switch: `Rendering` here is `wired | bus | auto`
 * (Task 8 deleted `labels` and added `auto`), so removing the `"labels"` case leaves the switch
 * non-exhaustive and the compiler says so - `TS2366: Function lacks ending return statement`.
 * Covering `auto` is new code, and new code is a divergence, not a cut.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * The bus renderer. It realises a block's IR pins as short stubs ending in a global label or
 * power symbol, and creates no connectivity. A stock symbol fixes where each pin sits, so an
 * interface group is declared by exact net name and printed as a legend line, never realised by
 * moving pins.
 *
 * (The pedals source calls this file *"bus and labels renderers"*; the labels one is gone - see
 * the divergence note above.)
 */
import type { BlockId, Circuit, NetName } from "../ir/types.ts";
import { SchgenRefusal, type Finding } from "../findings.ts";
import type { Anchor, Backend, BlockLayout, BlockSubgraph, BlockUnit, Placement, Wire } from "./block-types.ts";
import { checkLayout, realiseBlockReported, subgraphOf } from "./blocks.ts";
import { fmtPoint } from "./connectivity.ts";
// `gridCeil` and `PITCH` are gone from these two import lines with `realiseLabelled`, which was
// their only caller - the deleted labels renderer spaced its units by `gridCeil(width) + 4*PITCH`.
import { GRID, pinEnd, pinSide, pointKey, type Point, type Rotation, type Side } from "./geometry.ts";
import { glyphsClash } from "./glyph-clearance.ts";
import { STUB } from "./layout-kit.ts";
import type { SymbolResolver } from "./library.ts";
import { anchorsToSymbols, blockPowerLibs } from "./power-text.ts";
import type { PowerSymbol } from "./sheet-types.ts";

export interface BusResult {
  readonly layout: BlockLayout;
  readonly legend: readonly string[];
  /**
   * **What a gate found wrong with this layout, empty when it is ratified** - Task 3 of
   * `docs/superpowers/plans/2026-10-27-gates-classify.md`.
   *
   * `renderBlock` is the one door `render/frames.ts` reaches a block's geometry through, so a
   * finding that does not travel on this record is a finding that cannot reach the sheet, the
   * generation or the census without being thrown - which is the hiding the spec forbids. The bus
   * renderer's own `verified` still refuses outright: its layout is a stock symbol's fixed pin
   * geometry plus stubs, so a `checkLayout` problem on it is not crowding to be looked at but the
   * stock symbol disagreeing with the IR, and it has no second arrangement to offer.
   */
  readonly findings: readonly Finding[];
}

const ORIGIN: Point = { x: 0, y: 0 };
const ROT0: Rotation = 0;

function offsetOf(side: Side): Point {
  switch (side) {
    case "left": return { x: -STUB, y: 0 };
    case "right": return { x: STUB, y: 0 };
    case "up": return { x: 0, y: -STUB };
    case "down": return { x: 0, y: STUB };
  }
}

interface Stub {
  readonly wire: Wire;
  readonly anchor: Anchor;
}

/** One stub per distinct pin end of the unit placed at `at` turned by `rot`; NC pins get none. */
function stubsOf(blockId: BlockId, u: BlockUnit, at: Point, rot: Rotation = ROT0): Stub[] {
  const byEnd = new Map<string, { net: NetName | null; pin: string; end: Point; side: Side }>();
  const stubs: Stub[] = [];
  for (const p of u.pins) {
    const lib = u.symbol.pins.find((l) => l.number === p.pin);
    if (lib === undefined) throw new Error(`${u.symbol.libId} has no pin ${p.pin} (part ${p.part})`);
    const end = pinEnd(at, rot, lib);
    const key = pointKey(end);
    const prior = byEnd.get(key);
    if (prior !== undefined) {
      if (prior.net !== p.net) {
        throw new Error(`bus block ${blockId}: pins ${prior.pin} and ${p.pin} share a location but are on ${prior.net ?? "NC"} and ${p.net ?? "NC"}`);
      }
      continue;
    }
    byEnd.set(key, { net: p.net, pin: p.pin, end, side: pinSide(rot, lib) });
  }
  for (const { net, end, side } of byEnd.values()) {
    if (net === null) continue;
    const d = offsetOf(side);
    const far = { x: end.x + d.x, y: end.y + d.y };
    stubs.push({ wire: { a: end, b: far, net }, anchor: { net, at: far, side } });
  }
  return stubs;
}

/** How far a stub may grow past STUB, in grid steps, to clear its power glyph. */
const MAX_STAGGER = 8;

function lengthened(s: Stub, by: number): Stub {
  const d = offsetOf(s.anchor.side);
  const far = { x: s.anchor.at.x + (d.x / STUB) * by, y: s.anchor.at.y + (d.y / STUB) * by };
  return { wire: { ...s.wire, b: far }, anchor: { ...s.anchor, at: far } };
}

/**
 * Stubs in order, each power stub lengthened a grid step at a time until its glyph clears every
 * earlier power stub's glyph (glyph clearance). A stock symbol fixes the pin pitch, so two ground
 * glyphs of different nets on neighbouring pins (GND and VSSA under U_MCU) would otherwise meet.
 */
function staggered(blockId: BlockId, g: BlockSubgraph, stubs: readonly Stub[]): Stub[] {
  const libs = blockPowerLibs(g);
  const powerOf = (s: Stub): PowerSymbol | undefined => anchorsToSymbols(g,[s.anchor], true).powers[0];
  const drawn: PowerSymbol[] = [];
  return stubs.map((s) => {
    for (let step = 0; step <= MAX_STAGGER; step++) {
      const t = lengthened(s, step * GRID);
      const p = powerOf(t);
      if (p === undefined) return t;
      if (!drawn.some((q) => glyphsClash(libs, p, q))) {
        drawn.push(p);
        return t;
      }
    }
    throw new Error(
      `block ${blockId}: the ${s.anchor.net} glyph of the stub from ${fmtPoint(s.wire.a)} meets another net's glyph on every stub up to ${MAX_STAGGER} grid steps longer`,
    );
  });
}

function blockOf(c: Circuit, id: BlockId, kind: "bus") {
  const block = c.blocks.get(id);
  if (block === undefined) throw new Error(`unknown block ${id}`);
  if (block.rendering.kind !== kind) {
    throw new Error(`block ${id} is rendered "${block.rendering.kind}"; the ${kind} renderer needs "${kind}"`);
  }
  return block;
}

function verified(c: Circuit, id: BlockId, symbols: SymbolResolver, layout: BlockLayout, who: string): BlockLayout {
  const problems = checkLayout(subgraphOf(c, id, symbols), layout);
  if (problems.length > 0) {
    throw new SchgenRefusal(problems, `block ${id}: ${who} produced an invalid layout:${problems.map((p) => `\n  - ${p.what}`).join("")}`);
  }
  return layout;
}

export function realiseBus(c: Circuit, id: BlockId, symbols: SymbolResolver): BusResult {
  const block = blockOf(c, id, "bus");
  const r = block.rendering;
  if (r.kind !== "bus") throw new Error(`unreachable: block ${id} is a bus block`);
  const g = subgraphOf(c, id, symbols);
  const [u, ...rest] = g.units;
  if (u === undefined || rest.length > 0) throw new Error(`bus block ${id} must hold exactly one unit (holds ${g.units.length})`);
  const stubs = staggered(id, g, stubsOf(id, u, ORIGIN));
  const placements: Placement[] = [{ part: u.part.label, unit: u.unit, at: ORIGIN, rot: ROT0 }];
  const layout: BlockLayout = { placements, wires: stubs.map((s) => s.wire), anchors: stubs.map((s) => s.anchor) };
  const onUnit = new Set(u.pins.flatMap((p) => (p.net === null ? [] : [p.net])));
  // Each group's nets on this unit, in the order the group declares them (pin order scatters a bus
  // such as SDRAM_D0…D15 across the package). V6 refuses a group net on no pin of the block.
  const legend = r.groups.map((grp) => `${grp.name}: ${grp.nets.filter((n) => onUnit.has(n)).join(", ")}`);
  return { layout: verified(c, id, symbols, layout, "the bus renderer"), legend, findings: [] };
}

/**
 * **`realiseLabelled` AND `labelledRotation` ARE DELETED HERE**, with the `labels` rendering
 * itself (plan decision D3, `docs/known-gaps.md` **G140** and **G84**). The pedals source has
 * both and will keep them. Nothing replaces them: the whole point of deleting the rendering is
 * that a block no template fits has no inferior second drawing to fall back to, so it reaches the
 * ELK backend or it refuses.
 */

/** Runs the bus renderer, attributing any throw to the block, as realiseBlock does for templates. */
function attributed<T>(id: BlockId, kind: "bus", run: () => T): T {
  try {
    return run();
  } catch (e) {
    throw new Error(`block ${id}: ${kind} rendering failed: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

/**
 * Realises any block: `wired` and `auto` through `realiseBlock` (which picks the template or the
 * ELK backend - `selectRenderer`, spec §1.3), `bus` through the bus renderer.
 *
 * **`auto` is this file's divergence.** **Task 12 threaded the `Backend` the rest of the way**:
 * `elk` is now a fourth parameter, passed on to `realiseBlock`, and it reaches here from
 * `layoutSheet` through `blockContent`. It still defaults to `null` for `docs/known-gaps.md`
 * **G146**'s reason - an `auto` block that no template draws and that is handed no backend
 * **throws, naming the block and saying the backend is missing**, which is a refusal and not a
 * fallback - and the default is what keeps the ported test files that call this with three
 * arguments byte-checked.
 */
export function renderBlock(c: Circuit, id: BlockId, symbols: SymbolResolver, elk: Backend | null = null): BusResult {
  const block = c.blocks.get(id);
  if (block === undefined) throw new Error(`unknown block ${id}`);
  switch (block.rendering.kind) {
    case "wired":
    case "auto": {
      // **THE REPORTED FORM, NOT `realiseBlock`** (Task 3). `realiseBlock` throws on any finding,
      // which is how three of the eleven boards in `boards/` have never been drawn: the gate was
      // right that their power-symbol values are crowded and wrong to withhold the picture that
      // says so. The findings travel on the result and `render/sheets.ts` puts them on the sheet.
      const r = realiseBlockReported(c, id, symbols, elk);
      return { layout: r.layout, legend: [], findings: r.findings };
    }
    case "bus": return attributed(id, "bus", () => realiseBus(c, id, symbols));
  }
}
