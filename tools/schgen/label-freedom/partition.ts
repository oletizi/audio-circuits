/**
 * **NET IDENTITY AND NET NAMING, EXPORTED BY `kicad-cli` AND KEPT APART.**
 *
 * Research apparatus for Task 5 of
 * `docs/superpowers/plans/2026-10-22-text-handling-research.md`. **It changes no production code.**
 *
 * **THE DISTINCTION THIS MODULE EXISTS TO MAKE, which a third-party review of the plan found the
 * first version of Task 5 had collapsed.** *"Renaming a net changes a string without necessarily
 * changing the partition of connected pins."* So two properties are read out of one netlist and
 * compared separately:
 *
 * - **IDENTITY** - the partition of connected component terminals, **as sets, ignoring names**. Two
 *   netlists have the same identity when the same terminals are grouped together, whatever the
 *   groups are called.
 * - **NAMING** - the exported net names, as a sorted list.
 *
 * A control that could not tell these apart would have passed whether the arm changed connectivity
 * or only a string, which is why the first version was not evidence.
 *
 * **IT ADDS NO PARSER.** The netlist is exported with `--format kicadsexpr` and read by
 * `lib/kicad/netlist.ts`'s `importNetlist`, which is this repository's existing path from a
 * `.kicad_sch` to a net membership map, and which THROWS on a net that references an undeclared
 * component rather than dropping it.
 */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { importNetlist, type ImportedNetlist } from "../../../lib/kicad/netlist.ts"
import { runKicadCli } from "../kicad-run.ts"

export interface Connectivity {
  /** Net name -> its sorted `designator.pin` members, as `importNetlist` returns them. */
  readonly nets: ReadonlyMap<string, readonly string[]>
  /** IDENTITY: every net's member set, each sorted, the list of them sorted, with NO name anywhere. */
  readonly partition: readonly (readonly string[])[]
  /** NAMING: the exported net names, sorted. */
  readonly naming: readonly string[]
}

/**
 * Export `schPath`'s netlist with `kicad-cli` and read identity and naming out of it.
 *
 * The export runs under `kicad-run.ts`'s hermetic configuration, which is how every other
 * `kicad-cli` call in this repository runs and which refuses when KiCad did not take its settings
 * from that configuration.
 */
export function connectivityOf(schPath: string): Connectivity {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "label-freedom-net-"))
  try {
    const out = path.join(dir, "netlist.net")
    const r = runKicadCli(["sch", "export", "netlist", "--format", "kicadsexpr", "-o", out, schPath])
    if (r.status !== 0) throw new Error(`kicad-cli netlist export failed (${r.status}) for ${schPath}:\n${r.stderr}`)
    return connectivityFrom(importNetlist(fs.readFileSync(out, "utf8")))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

export function connectivityFrom(n: ImportedNetlist): Connectivity {
  const nets = new Map<string, readonly string[]>(Object.entries(n.nets).map(([k, v]) => [k, [...v].sort()]))
  const partition = [...nets.values()].map((m) => [...m].sort()).sort((a, b) => a.join(",").localeCompare(b.join(",")))
  return { nets, partition, naming: [...nets.keys()].sort() }
}

/** How a partition is written in the log: one group per `{}`, terminals comma-separated. */
export function fmtPartition(p: readonly (readonly string[])[]): string {
  return p.map((g) => `{${g.join(",")}}`).join(" ")
}

export const samePartition = (a: Connectivity, b: Connectivity): boolean => fmtPartition(a.partition) === fmtPartition(b.partition)
export const sameNaming = (a: Connectivity, b: Connectivity): boolean => a.naming.join(",") === b.naming.join(",")

/**
 * The groups that are in `a`'s partition and not in `b`'s, and vice versa.
 *
 * **This is what makes the negative control's claim checkable in the form the brief states it** -
 * *"the connection between those segments disappears from the partition"* - rather than as a bare
 * "the partition changed".
 */
export function partitionDelta(a: Connectivity, b: Connectivity): { readonly gone: readonly string[]; readonly arrived: readonly string[] } {
  const keys = (c: Connectivity): string[] => c.partition.map((g) => `{${g.join(",")}}`)
  const ka = keys(a)
  const kb = keys(b)
  const countIn = (list: readonly string[], k: string): number => list.filter((x) => x === k).length
  const gone = ka.filter((k, i) => countIn(ka.slice(0, i + 1), k) > countIn(kb, k))
  const arrived = kb.filter((k, i) => countIn(kb.slice(0, i + 1), k) > countIn(ka, k))
  return { gone, arrived }
}
