/**
 * Ported from digital-pedal-platform's `tools/schgen/gates/connectivity.test.ts` and DIVERGED
 * from it by Task 11 of the M1 schematic-authoring plan.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, and re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**.
 * Its `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md`.
 *
 * **ONE SUBSTITUTION, AND NOT ONE ASSERTION.** `compareConnectivity` now takes this repository's
 * `ImportedNetlist` instead of pedals' `Connectivity`, so the `actual` helper builds that shape
 * instead: a record of nets rather than a `Map`, and a `components` list the references come from.
 * **Every expected problem string below is verbatim from the pedals source** - ruling R4 forbids
 * editing a ported test's assertions to make it pass, and nothing here is edited. What changed is
 * the fixture's shape, which is the one thing the adaptation forces.
 *
 * The record's key order is the array's, and `compareConnectivity` reads `Object.entries`, so the
 * order problems are reported in is the order the pedals `Map` gave - which three of the cases
 * below assert exactly.
 */
import { describe, expect, it } from "bun:test";
import { blockCircuit, res } from "../__fixtures__/circuits.ts";
import { compareConnectivity, expectedConnectivity, type ExpectedNets } from "../../../lib/schgen/gates/connectivity.ts";
import type { ImportedNetlist } from "../../../lib/kicad/netlist.ts";

const WIRED = { kind: "wired" as const, template: "passive-chain" as const, anchor: null };
const c = blockCircuit([res("R_A", "IN", "MID"), res("R_B", "MID", "OUT")], WIRED, { external: ["IN", "OUT"] });
const refs = new Map([["R_A", "R1"], ["R_B", "R2"], ["R_PEER0", "R3"], ["R_PEER1", "R4"]]);
const e = expectedConnectivity(c, refs);
const actual = (nets: Array<[string, string[]]>, references: string[] = ["R1", "R2", "R3", "R4"]): ImportedNetlist => ({
  nets: Object.fromEntries(nets),
  // `value` is the one required field beside the designator and nothing here reads it.
  components: references.map((designator) => ({ designator, value: "10k" })),
});
const GOOD: Array<[string, string[]]> = [
  ["GND", ["R3.2", "R4.2"]], ["IN", ["R1.1", "R3.1"]], ["OUT", ["R2.2", "R4.1"]], ["Net-(R1-Pad2)", ["R1.2", "R2.1"]],
];
const without = (name: string) => GOOD.filter(([n]) => n !== name);

describe("gate 3", () => {
  it("classifies IR nets into labelled and internal", () => {
    expect([...e.labelled.keys()]).toEqual(["GND", "IN", "OUT"]);
    expect([...e.internal.entries()]).toEqual([["MID", ["R1.2", "R2.1"]]]);
    expect(e.nc).toEqual([]);
    expect(e.refs).toEqual(["R1", "R2", "R3", "R4"]);
    expect(e.problems).toEqual([]);
  });

  it("passes on an exact match, internal net auto-named by KiCad", () => {
    expect(compareConnectivity(e, actual(GOOD), "")).toEqual([]);
  });

  it("matches hierarchical net names by their leaf", () => {
    const hier = GOOD.map(([n, p]): [string, string[]] => [n === "IN" ? "/power/IN" : n, p]);
    expect(compareConnectivity(e, actual(hier), "")).toEqual([]);
  });

  it("fails on a renamed interface net with identical topology", () => {
    const renamed = GOOD.map(([n, p]): [string, string[]] => [n === "IN" ? "INPUT" : n, p]);
    expect(compareConnectivity(e, actual(renamed), "")).toEqual([
      "net INPUT [R1.1, R3.1] is in the schematic but not in the IR",
      "net IN [R1.1, R3.1] is in the IR but not in the schematic",
    ]);
  });

  it("fails on a moved pin and on an unexpected extra net", () => {
    const moved: Array<[string, string[]]> = [
      ["GND", ["R3.2", "R4.2"]], ["IN", ["R1.1", "R3.1"]], ["OUT", ["R4.1"]], ["Net-(R1-Pad2)", ["R1.2", "R2.1", "R2.2"]],
    ];
    const p = compareConnectivity(e, actual(moved), "");
    expect(p).toContain("net OUT: IR [R2.2, R4.1] vs schematic [R4.1]");
    expect(p).toContain("internal net MID [R1.2, R2.1] has no matching unlabelled net in the schematic");
    expect(p).toContain("schematic has an unlabelled net [R1.2, R2.1, R2.2] that the IR does not have");
  });

  it("fails on a pin missing from a labelled net", () => {
    const missing: Array<[string, string[]]> = [...without("GND"), ["GND", ["R4.2"]]];
    expect(compareConnectivity(e, actual(missing), "")).toEqual(["net GND: IR [R3.2, R4.2] vs schematic [R4.2]"]);
  });

  it("fails on an extra pin on a labelled net", () => {
    const extra: Array<[string, string[]]> = [...without("GND"), ["GND", ["R2.2", "R3.2", "R4.2"]]];
    expect(compareConnectivity(e, actual(extra), "")).toEqual(["net GND: IR [R3.2, R4.2] vs schematic [R2.2, R3.2, R4.2]"]);
  });

  it("fails when a labelled net is missing from the schematic", () => {
    expect(compareConnectivity(e, actual(without("OUT")), "")).toEqual(["net OUT [R2.2, R4.1] is in the IR but not in the schematic"]);
  });

  it("fails on an internal net the schematic splits or lacks", () => {
    expect(compareConnectivity(e, actual(without("Net-(R1-Pad2)")), "")).toEqual([
      "internal net MID [R1.2, R2.1] has no matching unlabelled net in the schematic",
    ]);
  });

  it("fails when an IR net reaches the schematic only as unconnected pins", () => {
    const split: Array<[string, string[]]> = [...without("Net-(R1-Pad2)"), ["unconnected-(R1-Pad2)", ["R1.2"]], ["unconnected-(R2-Pad1)", ["R2.1"]]];
    expect(compareConnectivity(e, actual(split), "")).toEqual([
      "internal net MID [R1.2, R2.1] has no matching unlabelled net in the schematic",
      "pin R1.2 is unconnected in the schematic but the IR puts it on a net",
      "pin R2.1 is unconnected in the schematic but the IR puts it on a net",
    ]);
  });

  it("fails when a not-connected pin is connected in the schematic", () => {
    const nc: ExpectedNets = { ...e, nc: ["R9.1"] };
    expect(compareConnectivity(nc, actual(GOOD), "")).toEqual(["pin R9.1 is declared not connected but the schematic connects it"]);
    expect(compareConnectivity(nc, actual([...GOOD, ["unconnected-(R9-Pad1)", ["R9.1"]]]), "")).toEqual([]);
  });

  it("fails on annotation errors and unknown stderr, ignoring only allow-listed noise", () => {
    const p = compareConnectivity(e, actual(GOOD), "Fontconfig error: x\nSome annotation errors were found\nodd\n");
    expect(p).toEqual(["kicad-cli reported annotation errors (kicad-cli: Some annotation errors were found)", "kicad-cli: odd"]);
  });

  it("fails on unannotated, missing and unknown references", () => {
    expect(compareConnectivity(e, actual(GOOD, ["R1", "R2", "R3", "R?"]), "")).toEqual([
      "unannotated reference R? in the schematic",
      "reference R4 is in the IR but not in the schematic",
    ]);
    expect(compareConnectivity(e, actual(GOOD, ["R1", "R2", "R3", "R4", "R5"]), "")).toEqual([
      "reference R5 is in the schematic but not in the IR",
    ]);
  });

  it("fails on an unresolved reference", () => {
    const partial = expectedConnectivity(c, new Map([["R_A", "R1"]]));
    expect(partial.problems).toContain("part R_B has no reference in refs.lock.json");
    expect(compareConnectivity(partial, actual(GOOD), "")).toContain("part R_B has no reference in refs.lock.json");
  });
});
