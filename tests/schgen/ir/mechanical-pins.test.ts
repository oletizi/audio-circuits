/**
 * `MECHANICAL_PINS` and `pinsDeclared`'s exemption for a symbol's mounting lug.
 *
 * Hand-written, not ported: `digital-pedal-platform` has no such table. Design at
 * `docs/superpowers/specs/2026-10-24-mechanical-pins-design.md`; the measurement behind it is
 * `docs/known-gaps.md` **G282** and the reason it is a whitelist rather than inferred geometry is
 * **G290**.
 *
 * **THIS FILE USES THE INSTALLED KICAD LIBRARY AND DOES NOT SKIP WHEN IT IS ABSENT.**
 * `symbolLibraries` refuses, and `CLAUDE.md` is explicit that a skipped check must never look
 * like a passing one. KiCad is a hard dependency here, like a compiler.
 *
 * **ARM 1 IS THE ONE THAT KEEPS THE TABLE HONEST**, and it asserts GEOMETRY rather than the pin's
 * electrical type. `passive` would prove nothing - ordinary resistor and switch terminals are
 * `passive` too, which a third-party review pointed out. What distinguishes the mount lug on this
 * symbol is that no graphic stroke ENDPOINT lands on its body-side end while every electrical
 * pin has exactly one. **G290 records that this is a sharp claim about THIS symbol and a
 * catastrophic rule in general** - it misclassifies both terminals of `Device:R` and six of eight
 * pins on a TL072 - so it belongs in a committed assertion about one symbol, never in the
 * validator.
 */

import { describe, expect, it } from "bun:test";
import { twoPin, UNNAMED } from "../../../lib/schgen/ir/author.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import { expectedConnectivity } from "../../../lib/schgen/gates/connectivity.ts";
import { MECHANICAL_PINS, mechanicalPinsOf } from "../../../lib/schgen/ir/mechanical-pins.ts";
import type { CircuitSpec, PartSpec, PinConnection, PinNumber, Rendering } from "../../../lib/schgen/ir/types.ts";
import { validateCircuit } from "../../../lib/schgen/ir/validate.ts";
import { createResolver, type LibPin, type LibSymbol, type SymbolResolver } from "../../../lib/schgen/render/library.ts";
import { symbolLibraries } from "../../../lib/schgen/render/stock-symbols.ts";
import { TEST_BOM } from "../__fixtures__/fixture-lib.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

const ROTARY = "Switch:SW_Rotary_1x6_MP";
const symbols = createResolver(symbolLibraries(["Switch", "Device", "power"]));

/** The six throws on one net and the pole on GND, so no net is a single-pin net. */
function rotary(pins: Readonly<Record<PinNumber, PinConnection>>): PartSpec {
  return {
    label: "SW_SEL",
    refPrefix: "SW",
    libId: ROTARY,
    units: [1],
    value: "6-position",
    // "F", not a "<Library>:<Name>" string: tests/kicad/footprint-names.test.ts sweeps the whole
    // repository for footprint names and refuses an invented library, because "a wholly invented
    // library is how a fictional footprint reads as a real one". These fixtures never place a
    // footprint, so they say what the neighbouring fixtures say rather than naming a real one.
    footprint: "F",
    bom: TEST_BOM,
    dnp: false,
    checklist: [],
    source: "tests/schgen/ir/mechanical-pins.test.ts",
    pinTable: null,
    pins,
    mechanicalPads: [],
    ncUnlisted: null,
  };
}

const THROWS_AND_POLE: Readonly<Record<PinNumber, PinConnection>> = {
  "1": { net: "T", identity: "" },
  "2": { net: "T", identity: "" },
  "3": { net: "T", identity: "" },
  "4": { net: "T", identity: "" },
  "5": { net: "T", identity: "" },
  "6": { net: "T", identity: "" },
  "7": { net: "GND", identity: "" },
};

const bridge = twoPin({
  label: "R_BRIDGE",
  refPrefix: "R",
  libId: "Device:R",
  value: "1k",
  footprint: "F",
  bom: TEST_BOM,
  nets: ["T", "GND"],
  identities: UNNAMED,
  checklist: [],
  source: "tests/schgen/ir/mechanical-pins.test.ts",
  dnp: false,
});

const NO_TEMPLATE: Rendering = { kind: "auto" };

function spec(sw: PartSpec): CircuitSpec {
  const parts = [sw, bridge];
  return {
    parts,
    blocks: [{ id: "B", sheet: "s", title: "B", members: parts.map((p) => p.label), checklist: [], rendering: NO_TEMPLATE }],
    sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
    rails: [{ net: "GND", symbol: "power:GND", kind: "ground", pwrFlag: null }],
    orientations: noOrientationPreferences(parts),
    portDirections: NO_PORT_DIRECTIONS,
  };
}

const problems = (s: CircuitSpec, r: SymbolResolver = symbols) => validateCircuit(buildCircuit(s, { symbols: r }), r);

/** A resolver that hides `MP` from one symbol, so the table's entry becomes stale. */
function withoutMp(): SymbolResolver {
  return {
    files: symbols.files,
    resolve(libId: string) {
      const sym = symbols.resolve(libId);
      if (libId !== ROTARY) return sym;
      return { ...sym, pins: sym.pins.filter((p) => p.number !== "MP") };
    },
  };
}

/** How many graphic stroke ENDPOINTS land on a pin's body-side end. Zero means no conductor
 *  inside the symbol reaches it; `docs/known-gaps.md` G290 has why this is an assertion about one
 *  symbol and never a general rule. */
function endpointsAt(sym: LibSymbol, pin: LibPin): number {
  const rad = (pin.angle * Math.PI) / 180;
  const ix = pin.x + pin.length * Math.round(Math.cos(rad));
  const iy = pin.y + pin.length * Math.round(Math.sin(rad));
  const g = sym.graphics.get(pin.unit) ?? sym.graphics.get(1);
  return (g?.segments ?? []).filter(([a, b]) => (a[0] === ix && a[1] === iy) || (b[0] === ix && b[1] === iy)).length;
}

describe("MECHANICAL_PINS", () => {
  /**
   * **THIS ARM IS GENERIC OVER THE TABLE, not written against today's single entry**, which is
   * what makes "every entry is a deliberate edit with a test beside it" enforceable rather than
   * aspirational. A review found the first version hardcoded `ROTARY`, so the tenth `_MP` symbol
   * would have been added with no check at all. It also closes the typo'd-KEY hole:
   * `pinsDeclared`'s stale-table refusal catches a bad PIN on a good symbol, but a misspelled
   * SYMBOL key is a silent no-op there, and `tests/kicad/symbol-names.test.ts` cannot see a map
   * literal (its own header says so).
   */
  it("arm 1: every TABLE ENTRY names a resolvable symbol, and every pin it lists exists on that symbol with NO stroke endpoint at its body-side end", () => {
    const entries = Object.entries(MECHANICAL_PINS);
    expect(entries.length).toBeGreaterThan(0);

    for (const [libId, pins] of entries) {
      const sym = symbols.resolve(libId); // throws if the key is a typo - that IS the assertion
      const numbers = new Set(sym.pins.map((p) => p.number));
      expect(pins.length).toBeGreaterThan(0);
      for (const number of pins) {
        expect(numbers.has(number), `${libId} has no pin ${number}`).toBe(true);
        const pin = sym.pins.find((p) => p.number === number);
        expect(endpointsAt(sym, pin!), `${libId} pin ${number} is reached by a stroke, so it is not isolated`).toBe(0);
      }
      expect(pins.length).toBeLessThan(sym.pins.length);
    }
  });

  it("arm 1b: on the rotary specifically, all seven ELECTRICAL pins are reached by exactly one stroke endpoint - the contrast that makes MP's zero mean something", () => {
    const sym = symbols.resolve(ROTARY);
    const listed = mechanicalPinsOf(ROTARY);
    expect([...listed]).toEqual(["MP"]);
    const mp = sym.pins.find((p) => p.number === "MP");
    expect(mp?.name).toBe("");

    const electrical = sym.pins.filter((p) => !listed.has(p.number));
    expect(electrical.map((p) => p.number)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    for (const p of electrical) expect(endpointsAt(sym, p)).toBe(1);
  });

  it("arm 2: a circuit that omits the mechanical pin validates clean", () => {
    expect(problems(spec(rotary(THROWS_AND_POLE)))).toEqual([]);
  });

  it("arm 3 (NEGATIVE CONTROL): an undeclared THROW on the same symbol is still refused", () => {
    const { "3": _dropped, ...withoutThrow3 } = THROWS_AND_POLE;
    expect(problems(spec(rotary(withoutThrow3)))).toContain("part SW_SEL: pin 3 () is neither on a net nor declared not connected, nor a mechanical mount point in lib/schgen/ir/mechanical-pins.ts");
  });

  it("arm 4: a stale table entry is refused, naming the pin and the table", () => {
    const p = problems(spec(rotary(THROWS_AND_POLE)), withoutMp());
    expect(p).toContain(
      `part SW_SEL: MECHANICAL_PINS lists pin "MP" for ${ROTARY}, which has no such pin; ` +
        `the table is stale - re-verify it against the installed library (lib/schgen/ir/mechanical-pins.ts)`,
    );
  });

  it("arm 5: a symbol with no table entry still has every undeclared pin refused", () => {
    expect(mechanicalPinsOf("Device:R").size).toBe(0);
    const half: PartSpec = { ...bridge, pins: { "1": { net: "T", identity: "" } } };
    const parts = [rotary(THROWS_AND_POLE), half];
    const s: CircuitSpec = { ...spec(rotary(THROWS_AND_POLE)), parts, orientations: noOrientationPreferences(parts) };
    expect(problems(s)).toContain("part R_BRIDGE: pin 2 () is neither on a net nor declared not connected, nor a mechanical mount point in lib/schgen/ir/mechanical-pins.ts");
  });

  it("arm 6: an EXPLICITLY declared mechanical pin is still validated - the exemption is allow-omitted, not skip-if-present", () => {
    const bonded = rotary({ ...THROWS_AND_POLE, MP: { net: "CHASSIS", identity: "" } });
    expect(problems(spec(bonded))).toContain("net CHASSIS has only one pin (SW_SEL.MP); connect it or declare the pin not connected");
  });

  it("arm 6b: and an explicitly declared mechanical pin on a real net is accepted, so an intentional bond stays representable", () => {
    const bonded = rotary({ ...THROWS_AND_POLE, MP: { net: "GND", identity: "" } });
    expect(problems(spec(bonded))).toEqual([]);
  });

  it("the table carries only entries this repository has verified", () => {
    expect(Object.keys(MECHANICAL_PINS)).toEqual([ROTARY]);
  });

  /**
   * **GATE 3 WOULD HAVE REFUSED THE ARTIFACT THIS EXEMPTION UNBLOCKS, with a message that is
   * false twice over**, and a review found it before any board got far enough to hit it. The
   * spec's "nothing else is relaxed" survey listed validation RULES and missed the GATES, which
   * rebuild the pin set from `c.pins`.
   *
   * `kicad-cli` gives every unconnected pin its own `unconnected-(REF-PadN)` net - marker or no
   * marker - so the export always reports the mount lug while the IR, by design, has no pin for
   * it. Un-fixed, `compareConnectivity` says *"pin SW1.MP is unconnected in the schematic but the
   * IR puts it on a net"*: the IR does not put it on a net, and has no such pin.
   *
   * These two arms are the ones that fail if `mechanicalNodes` (`../../../lib/schgen/gates/
   * connectivity.ts`) or `modelPartition`'s equivalent in `round-trip.ts` is removed.
   */
  it("arm 7: gate 3's expected-connectivity treats an omitted mechanical pin as EXPECTED unconnected, matching what kicad-cli exports", () => {
    const c = buildCircuit(spec(rotary(THROWS_AND_POLE)), { symbols });
    const refs = new Map([
      ["SW_SEL", "SW1"],
      ["R_BRIDGE", "R1"],
    ]);
    const e = expectedConnectivity(c, refs);
    expect(e.problems).toEqual([]);
    expect(e.nc).toContain("SW1.MP");
  });

  it("arm 7b (CONTROL): a pin that is neither declared nor mechanical is NOT in the expected-unconnected set, so arm 7 is not just asserting that everything lands there", () => {
    const c = buildCircuit(spec(rotary(THROWS_AND_POLE)), { symbols });
    const refs = new Map([
      ["SW_SEL", "SW1"],
      ["R_BRIDGE", "R1"],
    ]);
    const e = expectedConnectivity(c, refs);
    expect(e.nc).toEqual(["SW1.MP"]);
    for (const n of ["SW1.1", "SW1.7", "R1.1", "R1.2"]) expect(e.nc).not.toContain(n);
  });
});
