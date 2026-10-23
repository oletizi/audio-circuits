/**
 * Ported from digital-pedal-platform's `tools/schgen/lock/annotate.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { cap, labelsCircuit, RAILS, res } from "../__fixtures__/circuits.ts";
import type { PartSpec } from "../../../lib/schgen/ir/types.ts";
import { annotate, EMPTY_LOCK, parseRefLock, serializeRefLock } from "../../../lib/schgen/lock/annotate.ts";

const GND_ONLY = RAILS.filter((r) => r.net === "GND");
const circuit = (parts: PartSpec[]) => labelsCircuit(parts, { rails: GND_ONLY, notes: [], checklist: [], others: [] });
const NONE = new Map<string, string>();

describe("annotate", () => {
  it("numbers new labels per prefix in part order", () => {
    const a = annotate(circuit([res("R_A", "X", "GND"), cap("C_A", "X", "GND"), res("R_B", "X", "GND")]), EMPTY_LOCK, NONE);
    expect([...a.refs]).toEqual([["R_A", "R1"], ["C_A", "C1"], ["R_B", "R2"]]);
  });

  it("keeps existing references, retires removed ones and never reuses them (Review Focus 3)", () => {
    const first = annotate(circuit([res("R_A", "X", "GND"), res("R_B", "X", "GND"), res("R_C", "X", "GND")]), EMPTY_LOCK, NONE);
    const second = annotate(circuit([res("R_A", "X", "GND"), res("R_C", "X", "GND"), res("R_D", "X", "GND")]), first.lock, NONE);
    expect(second.refs.get("R_A")).toBe("R1");
    expect(second.refs.get("R_C")).toBe("R3");
    expect(second.refs.get("R_D")).toBe("R4");
    expect(second.lock.retired).toEqual({ R_B: "R2" });
  });

  it("gives a returning label its old reference back", () => {
    const first = annotate(circuit([res("R_A", "X", "GND"), res("R_B", "X", "GND")]), EMPTY_LOCK, NONE);
    const gone = annotate(circuit([res("R_A", "X", "GND"), res("R_C", "X", "GND")]), first.lock, NONE);
    const back = annotate(circuit([res("R_A", "X", "GND"), res("R_B", "X", "GND"), res("R_C", "X", "GND")]), gone.lock, NONE);
    expect(back.refs.get("R_B")).toBe("R2");
    expect(back.lock.retired).toEqual({});
  });

  it("honours a pinned reference and refuses a conflicting one", () => {
    const a = annotate(circuit([res("R_A", "X", "GND"), res("R_MAIN", "X", "GND")]), EMPTY_LOCK, new Map([["R_MAIN", "R1"]]));
    expect(a.refs.get("R_MAIN")).toBe("R1");
    expect(a.refs.get("R_A")).toBe("R2");
    expect(() => annotate(circuit([res("R_A", "X", "GND"), res("R_MAIN", "X", "GND")]), a.lock, new Map([["R_MAIN", "R2"]]))).toThrow(
      /R_MAIN is pinned to R2 but locked as R1/,
    );
  });

  it("refuses a pinned reference held by another active or retired label", () => {
    const a = annotate(circuit([res("R_A", "X", "GND"), res("R_MAIN", "X", "GND")]), EMPTY_LOCK, NONE);
    expect(() => annotate(circuit([res("R_A", "X", "GND"), res("R_MAIN", "X", "GND"), res("R_NEW", "X", "GND")]), a.lock, new Map([["R_NEW", "R1"]]))).toThrow(
      /R1 is pinned for R_NEW but already belongs to R_A/,
    );
    const gone = annotate(circuit([res("R_MAIN", "X", "GND")]), a.lock, NONE);
    expect(() => annotate(circuit([res("R_MAIN", "X", "GND"), res("R_Z", "X", "GND")]), gone.lock, new Map([["R_Z", "R1"]]))).toThrow(
      /R1 is pinned for R_Z but already belongs to R_A/,
    );
  });

  it("numbers new labels after a pinned reference", () => {
    const a = annotate(circuit([res("R_A", "X", "GND"), res("R_MAIN", "X", "GND")]), EMPTY_LOCK, new Map([["R_MAIN", "R7"]]));
    expect(a.refs.get("R_A")).toBe("R8");
  });

  it("refuses a prefix change on a locked label", () => {
    const a = annotate(circuit([res("X_1", "X", "GND"), res("R_B", "X", "GND")]), EMPTY_LOCK, NONE);
    expect(() => annotate(circuit([cap("X_1", "X", "GND"), res("R_B", "X", "GND")]), a.lock, NONE)).toThrow(
      /X_1 is locked as R1 but its refPrefix is now C/,
    );
  });

  it("refuses a lock holding one reference twice", () => {
    const lock = { version: 1 as const, refs: { R_A: "R1", R_B: "R1" }, retired: {} };
    expect(() => annotate(circuit([res("R_A", "X", "GND"), res("R_B", "X", "GND")]), lock, NONE)).toThrow(/R1 is held by both R_A and R_B/);
    expect(() => parseRefLock('{"version":1,"refs":{"R_A":"R1","R_B":"R1"},"retired":{}}')).toThrow(/refs.lock.json: R1 is held by both R_A and R_B/);
  });

  it("refuses a reference held by an active and a retired label", () => {
    expect(() => parseRefLock('{"version":1,"refs":{"R_A":"R1"},"retired":{"R_B":"R1"}}')).toThrow(/R1 is held by both R_A and R_B/);
  });

  it("refuses a label that is both active and retired", () => {
    expect(() => parseRefLock('{"version":1,"refs":{"A":"R1"},"retired":{"A":"R2"}}')).toThrow(/refs.lock.json: A is in both refs and retired/);
    const lock = { version: 1 as const, refs: { R_A: "R1" }, retired: { R_A: "R2" } };
    expect(() => annotate(circuit([res("R_A", "X", "GND")]), lock, NONE)).toThrow(/R_A is in both refs and retired/);
  });

  it("refuses a pinned label the circuit does not have", () => {
    expect(() => annotate(circuit([res("R_A", "X", "GND")]), EMPTY_LOCK, new Map([["U_MCU", "U1"]]))).toThrow(/U_MCU is pinned to U1 but is not in the circuit/);
  });

  it("never reuses the highest retired number", () => {
    const first = annotate(circuit([res("R_A", "X", "GND"), res("R_B", "X", "GND"), res("R_C", "X", "GND")]), EMPTY_LOCK, NONE);
    const second = annotate(circuit([res("R_A", "X", "GND"), res("R_B", "X", "GND"), res("R_D", "X", "GND")]), first.lock, NONE);
    expect(second.refs.get("R_D")).toBe("R4");
    expect(second.lock.retired).toEqual({ R_C: "R3" });
  });

  it("wraps JSON syntax errors", () => {
    expect(() => parseRefLock("{nope")).toThrow(/refs.lock.json: invalid JSON/);
  });

  it("round-trips the lock file with sorted keys", () => {
    const a = annotate(circuit([res("R_B", "X", "GND"), res("R_A", "X", "GND")]), EMPTY_LOCK, NONE);
    const text = serializeRefLock(a.lock);
    expect(text).toBe('{\n  "version": 1,\n  "refs": {\n    "R_A": "R2",\n    "R_B": "R1"\n  },\n  "retired": {}\n}\n');
    expect(parseRefLock(text)).toEqual(a.lock);
  });

  it("names the bad key in a malformed lock", () => {
    expect(() => parseRefLock('{"version":1,"refs":{"R_A":7},"retired":{}}')).toThrow(/refs.lock.json: refs.R_A must be a reference string/);
    expect(() => parseRefLock('{"version":1,"refs":{"R_A":"r1"},"retired":{}}')).toThrow(/refs.R_A must be a reference string/);
    expect(() => parseRefLock('{"version":1,"refs":{},"retired":{"R_B":"R0"}}')).toThrow(/retired.R_B must be a reference string/);
    expect(() => parseRefLock('{"version":1,"refs":[],"retired":{}}')).toThrow(/refs.lock.json: refs must be an object/);
    expect(() => parseRefLock('{"version":1,"refs":{}}')).toThrow(/refs.lock.json: retired must be an object/);
    expect(() => parseRefLock('{"version":2,"refs":{},"retired":{}}')).toThrow(/refs.lock.json: version must be 1/);
    expect(() => parseRefLock("[]")).toThrow(/refs.lock.json: version must be 1/);
  });
});
