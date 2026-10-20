/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/connectorFanout.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * connector-fanout: a connector (or any anchor part) with every connected pin fanned straight out
 * through its own series path to a rail or label, rows spread apart where their parts and text
 * need more room than the pin pitch (fanoutRows). The first rotation whose layout passes
 * `checkLayout` (text clearance included) is used; the template adds no connection the IR does not hold.
 */
import { mismatch, type BlockSubgraph, type RealiseResult, type Template } from "../block-types.ts";
import { fanout, tracePaths } from "../fanout-kit.ts";
import { ROTATIONS } from "../geometry.ts";
import { checkLayout } from "../layout-check.ts";

function realise(g: BlockSubgraph): RealiseResult {
  const r = g.block.rendering;
  const anchor = r.kind === "wired" ? r.anchor : null;
  if (anchor === null) return mismatch("connector-fanout needs an anchor");
  const unit = g.units.find((u) => u.part.label === anchor.part && u.unit === anchor.unit);
  if (unit === undefined) throw new Error(`unreachable: validated anchor ${anchor.part}#${anchor.unit} is a member of block ${g.block.id}`);
  const traced = tracePaths(g, unit, new Set());
  if (!traced.ok) return mismatch(traced.reason);
  const firstProblems: string[] = [];
  for (const rot of ROTATIONS) {
    const layout = fanout(g, unit, rot, traced.paths);
    const problems = checkLayout(g, layout);
    if (problems.length === 0) return { ok: true, layout };
    if (firstProblems.length === 0) firstProblems.push(...problems);
  }
  return mismatch(`connector-fanout found no rotation without collisions (rotation 0: ${firstProblems.join("; ")})`);
}

export const connectorFanout: Template = { id: "connector-fanout", realise };
