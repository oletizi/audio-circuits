/**
 * STEP 2 PROBE of `docs/superpowers/specs/2026-10-26-schematic-development-method-design.md`:
 * does a Pultec section DECOMPOSE across the templates an `auto` block can reach?
 *
 * **THE ANSWER, 2026-10-26: NO, AND THE RESIDUE IS THE SAME SHAPE EVERY TIME.** The capacitors
 * always decompose - `rail-row` and `passive-chain` draw groups of them. What never decomposes is
 * **the switch and its potentiometer**: hi-boost leaves `RV_HI_BOOST RV_HI_Q SW_HI_BOOST`, hi-cut
 * `R1 RV_HI_CUT SW_HI_CUT`, low-boost `R2 RV_LO_BOOST SW_LO_BOOST`, low-cut
 * `RV_LO_CUT SW_LO_CUT`. `pultec-mid` has 28 members and is not enumerated.
 *
 * So the construct with no template is **the selector** - a rotary switch with its pot - and NOT
 * the capacitor bank, which was what the plan had assumed. `docs/known-gaps.md` **G298**.
 *
 * `G84`: the method that worked resolved "no template fits" by **decomposing the block across
 * existing templates, not writing a new one** - "budget decomposition as the primary tool".
 * `G141`: an `auto` block only ever reaches four of the eight - `rail-row`, `decoupling-bank`,
 * `divider`, `passive-chain` - because the other four need an anchor only a `wired` block carries.
 *
 * Every Pultec section is ONE `auto` block holding the entire module, so every previous
 * measurement offered templates a whole module. This offers them SUBSETS: hold the circuit's
 * parts, pins and nets fixed and swap only the block's membership, then ask each template.
 *
 * It CHOOSES no decomposition and writes no declaration. A drawn subset is evidence that a
 * template CAN draw that group, nothing more.
 */
import { describe, expect, it } from "bun:test";
import { ALL_DECLARED_CASES } from "../../tools/schgen/board-declarations.ts";
import { circuitSpecFrom, nicknamesOf } from "../../lib/schgen/from-network.ts";
import { buildCircuit } from "../../lib/schgen/ir/build.ts";
import { runTemplate, subgraphOf } from "../../lib/schgen/render/blocks.ts";
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts";
import { createResolver } from "../../lib/schgen/render/library.ts";
import { symbolLibraries } from "../../lib/schgen/render/stock-symbols.ts";
import type { Circuit, IrUnitRef } from "../../lib/schgen/ir/types.ts";

/** The four an `auto` block can reach (G141). The other four refuse "needs an anchor". */
const REACHABLE = ["rail-row", "decoupling-bank", "divider", "passive-chain"] as const;

const CASES = ALL_DECLARED_CASES.filter((c) => c.name.startsWith("pultec-"));

const popcount = (x: number): number => { let c = 0; let v = x; while (v) { v &= v - 1; c += 1; } return c; };

describe("does a Pultec section decompose across the reachable templates?", () => {
  it("enumerates subsets of each section and reports which a template draws", () => {
    for (const kase of CASES) {
      const section = kase.name;
      const symbols = createResolver(symbolLibraries([...nicknamesOf(kase.network, kase.authoring)].sort()));
      const circuit = buildCircuit(circuitSpecFrom(kase.network, kase.authoring, symbols), { symbols });

      const own = [...circuit.blocks.values()].find((b) => b.id.endsWith("-own"));
      if (own === undefined) {
        console.log(`${section}: no -own block`);
        continue;
      }
      const members: readonly IrUnitRef[] = own.members;
      const n = members.length;
      if (n > 18) {
        console.log(`${section}: ${n} members, too many to enumerate exhaustively`);
        continue;
      }

      const hits: string[] = [];
      const drawnMasks: [number, string][] = [];
      let probes = 0;
      for (let mask = 1; mask < 1 << n; mask += 1) {
        const subset = members.filter((_, i) => (mask & (1 << i)) !== 0);
        if (subset.length < 2) continue;
        const blocks = new Map(circuit.blocks);
        blocks.set(own.id, { ...own, members: subset });
        const c: Circuit = { ...circuit, blocks };
        let g;
        try {
          g = subgraphOf(c, own.id, symbols);
        } catch {
          continue;
        }
        for (const id of REACHABLE) {
          const t = TEMPLATES.get(id);
          if (t === undefined) continue;
          probes += 1;
          let r;
          try {
            r = runTemplate(t, g);
          } catch {
            continue;
          }
          if (r.ok) {
            hits.push(`${id} <- ${subset.map((m) => m.part).join(" ")}`);
            drawnMasks.push([mask, `${id}: ${subset.map((m) => m.part).join(" ")}`]);
          }
        }
      }
      // A SUBSET DRAWING IS NOT A DECOMPOSITION. The question is whether the section
      // PARTITIONS: every member in exactly one group, every group drawn by some template.
      // Exact cover by masks, smallest number of groups first.
      const best = new Map<number, string>();
      for (const [mask, label] of drawnMasks) if (!best.has(mask)) best.set(mask, label);
      const full = (1 << n) - 1;
      const seen = new Map<number, number>();
      const from = new Map<number, [number, number]>();
      const queue: number[] = [0];
      seen.set(0, 0);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur === full) break;
        const lowest = (~cur) & (cur + 1);
        for (const [mask] of best) {
          if ((mask & cur) !== 0) continue;
          if ((mask & lowest) === 0) continue;
          const next = cur | mask;
          if (seen.has(next)) continue;
          seen.set(next, (seen.get(cur) ?? 0) + 1);
          from.set(next, [cur, mask]);
          queue.push(next);
        }
      }
      console.log(`\n=== ${section}: ${n} members, ${probes} probes, ${hits.length} subsets drawn ===`);
      if (seen.has(full)) {
        const parts: string[] = [];
        let cur = full;
        while (cur !== 0) {
          const step = from.get(cur);
          if (step === undefined) break;
          parts.push(best.get(step[1]) ?? "?");
          cur = step[0];
        }
        console.log(`  PARTITIONS into ${parts.length} groups:`);
        for (const g of parts.reverse()) console.log(`    ${g}`);
      } else {
        const covered = [...seen.keys()].reduce((a, b) => (popcount(b) > popcount(a) ? b : a), 0);
        const missing = members.filter((_, i) => (covered & (1 << i)) === 0).map((m) => m.part);
        console.log(`  DOES NOT PARTITION. Best cover leaves ${missing.length} member(s) undrawable: ${missing.join(" ")}`);
      }
    }
    expect(true).toBe(true);
  });
});
