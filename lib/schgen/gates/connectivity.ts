/**
 * Ported from digital-pedal-platform's `tools/schgen/gates/connectivity.ts` and DIVERGED from it
 * by Task 11 of the M1 schematic-authoring plan: `compareConnectivity` takes this repository's
 * `ImportedNetlist` instead of pedals' `Connectivity`.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, and re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**.
 * Its `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md`.
 *
 * **WHAT CHANGED, AND IT REMOVES A DEPENDENCY RATHER THAN ADDING ONE.** Pedals produces its
 * `Connectivity { nets: Map<string, string[]>; references: string[] }` with
 * `connectivityFromXml`, which reads a `kicadxml` export through `fast-xml-parser`. This
 * repository already reads the s-expression `.net` export with `lib/kicad/netlist.ts`'s
 * `importNetlist`, and that result carries everything this file reads: the references are
 * `components[].designator`, and each net's members are already the sorted `"designator.pin"`
 * strings. So the two reads this file needs are the two lines below marked as such, and no XML
 * parser enters the tree.
 *
 * **THE THREE NAME CONVENTIONS ARE UNCHANGED**, because they are KiCad's and not pedals':
 * `"unconnected-("` nets are the IR's not-connected pins, `"Net-("` nets are the unlabelled
 * block-internal ones matched one-for-one by pin set, and everything else matches a labelled net
 * by its leaf name. Every problem message is verbatim from the pedals source.
 */

import { labelledNets } from "../ir/classify.ts";
import type { Circuit, NetName, PartLabel } from "../ir/types.ts";
import { stderrProblems } from "../../../tools/schgen/kicad-run.ts";
import type { ImportedNetlist } from "../../kicad/netlist.ts";

/**
 * Gate 3, connectivity: the exported netlist equals the IR. Both sides are
 * reduced to NetName -> sorted ["REF.PIN", ...]. Labelled nets must match by
 * exact name and pins; unlabelled block-internal nets (KiCad auto-names them
 * "Net-(...)") must match one for one by exact pin set; KiCad's one-pin
 * "unconnected-(...)" nets must be exactly the IR's not-connected pins.
 */
export interface ExpectedNets {
  readonly labelled: ReadonlyMap<NetName, readonly string[]>;
  readonly internal: ReadonlyMap<NetName, readonly string[]>;
  readonly nc: readonly string[];
  readonly refs: readonly string[];
  readonly problems: readonly string[];
}

/** A hierarchical net name ("/sheet/NET") reduced to its leaf ("NET"). */
const leaf = (n: string) => n.slice(n.lastIndexOf("/") + 1);

export function expectedConnectivity(c: Circuit, refs: ReadonlyMap<PartLabel, string>): ExpectedNets {
  const problems: string[] = [];
  for (const p of c.parts.keys()) if (!refs.has(p)) problems.push(`part ${p} has no reference in refs.lock.json`);
  const labels = labelledNets(c);
  const byNet = new Map<NetName, string[]>();
  const nc: string[] = [];
  for (const pin of c.pins) {
    const ref = refs.get(pin.part);
    if (ref === undefined) continue;
    const node = `${ref}.${pin.pin}`;
    if (pin.net === null) nc.push(node);
    else byNet.set(pin.net, [...(byNet.get(pin.net) ?? []), node]);
  }
  const labelled = new Map<NetName, string[]>();
  const internal = new Map<NetName, string[]>();
  for (const [net, nodes] of [...byNet.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    (labels.has(net) ? labelled : internal).set(net, nodes.sort());
  }
  return { labelled, internal, nc: nc.sort(), refs: [...refs.values()].sort(), problems };
}

export function compareConnectivity(e: ExpectedNets, actual: ImportedNetlist, stderr: string): string[] {
  const out = [...e.problems];
  // THE FIRST OF THE TWO ADAPTED READS: pedals' `actual.references`.
  const references: readonly string[] = actual.components.map((c) => c.designator);
  // THE SECOND: pedals' `actual.nets`, a Map rather than a record. The members are already the
  // sorted "designator.pin" strings `importNetlist` built, exactly as pedals' XML reader built
  // them, so nothing below re-sorts or re-formats a member.
  const actualNets: readonly (readonly [string, readonly string[]])[] = Object.entries(actual.nets);
  for (const line of stderrProblems(stderr)) out.push(/annotation error/i.test(line) ? `kicad-cli reported annotation errors (${line})` : line);
  for (const r of references) if (r.includes("?")) out.push(`unannotated reference ${r} in the schematic`);
  const expRefs = new Set(e.refs);
  const actRefs = new Set(references);
  for (const r of e.refs) if (!actRefs.has(r)) out.push(`reference ${r} is in the IR but not in the schematic`);
  for (const r of references) if (!expRefs.has(r) && !r.includes("?")) out.push(`reference ${r} is in the schematic but not in the IR`);
  const auto = new Map<string, readonly string[]>();
  const actNc = new Set<string>();
  const seen = new Set<NetName>();
  for (const [name, nodes] of actualNets) {
    if (name.startsWith("unconnected-(")) {
      for (const n of nodes) actNc.add(n);
      continue;
    }
    if (name.startsWith("Net-(")) {
      auto.set(nodes.join(","), nodes);
      continue;
    }
    const n = leaf(name);
    const exp = e.labelled.get(n);
    if (exp === undefined) {
      out.push(`net ${n} [${nodes.join(", ")}] is in the schematic but not in the IR`);
      continue;
    }
    seen.add(n);
    if (exp.join(",") !== nodes.join(",")) out.push(`net ${n}: IR [${exp.join(", ")}] vs schematic [${nodes.join(", ")}]`);
  }
  for (const [n, nodes] of e.labelled) if (!seen.has(n)) out.push(`net ${n} [${nodes.join(", ")}] is in the IR but not in the schematic`);
  for (const [n, nodes] of e.internal) {
    const key = nodes.join(",");
    if (auto.has(key)) auto.delete(key);
    else out.push(`internal net ${n} [${nodes.join(", ")}] has no matching unlabelled net in the schematic`);
  }
  for (const nodes of auto.values()) out.push(`schematic has an unlabelled net [${nodes.join(", ")}] that the IR does not have`);
  const expNc = new Set(e.nc);
  for (const n of e.nc) if (!actNc.has(n)) out.push(`pin ${n} is declared not connected but the schematic connects it`);
  for (const n of actNc) if (!expNc.has(n)) out.push(`pin ${n} is unconnected in the schematic but the IR puts it on a net`);
  return out;
}
