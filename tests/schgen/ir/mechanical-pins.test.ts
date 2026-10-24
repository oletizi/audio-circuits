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
import { MECHANICAL_PINS, mechanicalPinsOf } from "../../../lib/schgen/ir/mechanical-pins.ts";
import type { CircuitSpec, PartSpec, PinConnection, PinNumber, Rendering } from "../../../lib/schgen/ir/types.ts";
import { validateCircuit } from "../../../lib/schgen/ir/validate.ts";
import { createResolver, type SymbolResolver } from "../../../lib/schgen/render/library.ts";
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

describe("MECHANICAL_PINS", () => {
  it("arm 1: every listed pin exists on the installed symbol, and NO stroke endpoint lands on its body-side end while every electrical pin has exactly one", () => {
    const sym = symbols.resolve(ROTARY);
    const listed = mechanicalPinsOf(ROTARY);
    expect([...listed]).toEqual(["MP"]);

    const endpointsAt = (pin: (typeof sym.pins)[number]): number => {
      const rad = (pin.angle * Math.PI) / 180;
      const ix = pin.x + pin.length * Math.round(Math.cos(rad));
      const iy = pin.y + pin.length * Math.round(Math.sin(rad));
      const g = sym.graphics.get(pin.unit) ?? sym.graphics.get(1);
      return (g?.segments ?? []).filter(([a, b]) => (a[0] === ix && a[1] === iy) || (b[0] === ix && b[1] === iy)).length;
    };

    const mp = sym.pins.find((p) => p.number === "MP");
    expect(mp).toBeDefined();
    expect(mp?.name).toBe("");
    expect(endpointsAt(mp!)).toBe(0);

    const electrical = sym.pins.filter((p) => !listed.has(p.number));
    expect(electrical.map((p) => p.number)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    for (const p of electrical) expect(endpointsAt(p)).toBe(1);
  });

  it("arm 2: a circuit that omits the mechanical pin validates clean", () => {
    expect(problems(spec(rotary(THROWS_AND_POLE)))).toEqual([]);
  });

  it("arm 3 (NEGATIVE CONTROL): an undeclared THROW on the same symbol is still refused", () => {
    const { "3": _dropped, ...withoutThrow3 } = THROWS_AND_POLE;
    expect(problems(spec(rotary(withoutThrow3)))).toContain("part SW_SEL: pin 3 () is neither on a net nor declared not connected");
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
    expect(problems(s)).toContain("part R_BRIDGE: pin 2 () is neither on a net nor declared not connected");
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
});
