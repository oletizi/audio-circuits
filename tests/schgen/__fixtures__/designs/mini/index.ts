/**
 * Ported from digital-pedal-platform's `tools/schgen/__fixtures__/designs/mini/index.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * The mini fixture design: two sheets on stock KiCad symbols, generated and proven against the
 * real kicad-cli by the integration tests. Test code: BOM fields are the test BOM.
 */
import type { DesignSpec } from "../../../../../lib/schgen/design.ts";
import { TEST_BOM } from "../../fixture-lib.ts";
import { twoPin, UNNAMED } from "../../../../../lib/schgen/ir/author.ts";
import type { BlockSpec, BomFields, PartSpec, PinConnection, RailSpec, SheetSpec } from "../../../../../lib/schgen/ir/types.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../../orientations.ts";

const FP_R = "Resistor_SMD:R_0603_1608Metric";
const FP_C = "Capacitor_SMD:C_0603_1608Metric";
const SOURCE = "schgen mini fixture";

const passive = (prefix: "R" | "C", libId: string, footprint: string) => (label: string, a: string, b: string, value: string): PartSpec =>
  twoPin({ label, refPrefix: prefix, libId, value, footprint, bom: TEST_BOM, nets: [a, b], identities: UNNAMED, checklist: [], source: SOURCE, dnp: false });
const R = passive("R", "Device:R", FP_R);
const C = passive("C", "Device:C", FP_C);

/** Pin number -> [net (null: not connected), identity]. */
type PinList = Readonly<Record<string, readonly [string | null, string]>>;

function pins(list: PinList): Record<string, PinConnection> {
  return Object.fromEntries(
    Object.entries(list).map(([n, [net, identity]]): [string, PinConnection] => [n, net === null ? { nc: true, identity } : { net, identity }]),
  );
}

interface PartArgs {
  readonly label: string;
  readonly refPrefix: string;
  readonly libId: string;
  readonly units: readonly number[];
  readonly value: string;
  readonly footprint: string;
  readonly pinTable: string | null;
  readonly pins: PinList;
  /** BOM fields: the test BOM, with a real MPN for every part-specific stock symbol (gate 6). */
  readonly bom: BomFields;
}

const mpn = (MPN: string): BomFields => ({ ...TEST_BOM, MPN });

function part(a: PartArgs): PartSpec {
  return {
    label: a.label, refPrefix: a.refPrefix, libId: a.libId, units: a.units, value: a.value, footprint: a.footprint,
    bom: a.bom, dnp: false, checklist: [], source: SOURCE, pinTable: a.pinTable, pins: pins(a.pins),
    mechanicalPads: [], ncUnlisted: null,
  };
}

const conn = (label: string, n: number, nets: readonly string[]): PartSpec =>
  part({
    label, refPrefix: "J", libId: `Connector_Generic:Conn_01x0${n}`, units: [1], value: `Conn_01x0${n}`,
    footprint: `Connector_PinHeader_2.54mm:PinHeader_1x0${n}_P2.54mm_Vertical`, pinTable: null, bom: TEST_BOM,
    pins: Object.fromEntries(nets.map((net, i) => [`${i + 1}`, [net, `Pin_${i + 1}`] as const])),
  });

const parts: PartSpec[] = [
  // The SOT-223 tab is pad 2 (TabPin2), the same number as the VO pin: no mechanical pad.
  part({
    label: "U_REG", refPrefix: "U", libId: "Regulator_Linear:AMS1117-3.3", units: [1], value: "AMS1117-3.3",
    footprint: "Package_TO_SOT_SMD:SOT-223-3_TabPin2", pinTable: null, bom: mpn("AMS1117-3.3"),
    pins: { "1": ["GND", "GND"], "2": ["3V3", "VO"], "3": ["VIN", "VI"] },
  }),
  C("C_IN", "VIN", "GND", "10u"),
  C("C_OUT", "3V3", "GND", "22u"),
  C("C_D1", "3V3", "GND", "100n"),
  C("C_D2", "3V3", "GND", "100n"),
  R("R_TOP", "VIN", "SENSE", "10k"),
  R("R_BOT", "SENSE", "GND", "10k"),
  C("C_SNS", "SENSE", "GND", "100n"),
  conn("J1", 4, ["VIN", "SENSE", "SIG_IN", "GND"]),
  part({
    label: "U_AMP", refPrefix: "U", libId: "Amplifier_Operational:OPA1678", units: [1, 2, 3], value: "OPA1678",
    footprint: "Package_SO:SOIC-8_3.9x4.9mm_P1.27mm", pinTable: "OPA1688", bom: mpn("OPA1688"),
    pins: {
      "1": ["AMP_OUT", "OUTA"], "2": ["AMP_OUT", "-INA"], "3": ["AMP_P", "+INA"],
      "5": [null, "+INB"], "6": [null, "-INB"], "7": [null, "OUTB"],
      "4": ["GND", "V-"], "8": ["3V3", "V+"],
    },
  }),
  R("R_SER", "SIG_IN", "AMP_P", "1k"),
  C("C_FLT", "AMP_P", "GND", "1n"),
  part({
    label: "Y1", refPrefix: "Y", libId: "Device:Crystal_GND24", units: [1], value: "12MHz",
    footprint: "Crystal:Crystal_SMD_3225-4Pin_3.2x2.5mm", pinTable: null, bom: TEST_BOM,
    pins: { "1": ["XI", "1"], "2": ["GND", "G"], "3": ["XO", "3"], "4": ["GND", "G"] },
  }),
  C("C_X1", "XI", "GND", "12p"),
  C("C_X2", "XO", "GND", "12p"),
  part({
    // Not the stock W25Q128JVS: its GND name runs into HOLD/RESET/IO3, which generate refuses (Task 10 ruling).
    label: "U_FL", refPrefix: "U", libId: "Memory_Flash:W25X40CLSS", units: [1], value: "W25X40CLSS",
    footprint: "Package_SO:SOIC-8_5.3x5.3mm_P1.27mm", pinTable: null, bom: mpn("W25X40CLSSIG"),
    pins: {
      "1": ["FL_CS", "~{CS}"], "2": ["FL_DO", "DO/IO_{1}"], "3": ["3V3", "~{WP}"], "4": ["GND", "GND"],
      "5": ["FL_DI", "DI/IO_{0}"], "6": ["FL_CLK", "CLK"], "7": ["3V3", "~{HOLD}"], "8": ["3V3", "VCC"],
    },
  }),
  conn("J2", 7, ["FL_CS", "FL_DO", "FL_DI", "FL_CLK", "XI", "XO", "AMP_OUT"]),
];

const block = (id: string, sheet: string, title: string, members: BlockSpec["members"], rendering: BlockSpec["rendering"]): BlockSpec => ({
  id, sheet, title, members, checklist: [], rendering,
});
const wired = (template: "regulator" | "decoupling-bank" | "divider" | "connector-fanout" | "opamp-stage" | "crystal", anchor: { part: string; unit: number; roles: Record<string, string> } | null): BlockSpec["rendering"] => ({
  kind: "wired", template, anchor,
});

const blocks: BlockSpec[] = [
  block("REG", "power", "3V3 regulator", ["U_REG", "C_IN", "C_OUT"], wired("regulator", { part: "U_REG", unit: 1, roles: { in: "3", out: "2" } })),
  block("DEC", "power", "3V3 decoupling", ["C_D1", "C_D2"], wired("decoupling-bank", null)),
  block("DIV", "power", "VIN sense divider", ["R_TOP", "R_BOT", "C_SNS"], wired("divider", null)),
  block("J_IN", "signal", "Input connector", ["J1"], wired("connector-fanout", { part: "J1", unit: 1, roles: {} })),
  block("AMP", "signal", "Input buffer", [{ part: "U_AMP", unit: 1 }, "R_SER", "C_FLT"],
    wired("opamp-stage", { part: "U_AMP", unit: 1, roles: { out: "1", inv: "2", noninv: "3" } })),
  block("AMP_SPARE", "signal", "Spare op-amp channel", [{ part: "U_AMP", unit: 2 }],
    { kind: "bus", groups: [] }),
  block("AMP_PWR", "signal", "Op-amp supply", [{ part: "U_AMP", unit: 3 }],
    { kind: "bus", groups: [] }),
  block("XTAL", "signal", "Crystal", ["Y1", "C_X1", "C_X2"], wired("crystal", { part: "Y1", unit: 1, roles: { a: "1", b: "3" } })),
  block("FLASH", "signal", "SPI flash", ["U_FL"], { kind: "bus", groups: [{ name: "SPI", nets: ["FL_CS", "FL_DO", "FL_DI", "FL_CLK"] }] }),
  block("J_OUT", "signal", "Output connector", ["J2"], wired("connector-fanout", { part: "J2", unit: 1, roles: {} })),
];

const sheets: SheetSpec[] = [
  { id: "power", title: "Power", file: "power.kicad_sch", paper: "A4", notes: [] },
  { id: "signal", title: "Signal", file: "signal.kicad_sch", paper: "A3", notes: [] },
];

const rails: RailSpec[] = [
  // Power inputs sit on GND and only the connector's passive pin feeds it.
  { net: "GND", symbol: "power:GND", kind: "ground", pwrFlag: { sheet: "power" } },
  // The regulator's power_out drives 3V3.
  { net: "3V3", symbol: "power:+3V3", kind: "supply", pwrFlag: null },
  { net: "VIN", symbol: "power:+3V3", kind: "supply", pwrFlag: { sheet: "power" } },
];

export const design: DesignSpec = {
  project: "mini",
  outDir: "out",
  circuit: {
    parts, blocks, sheets, rails,
    // Ruling R29: see ../../orientations.ts for what these two values mean and why a
    // hand-built fixture spec has no orientation rule to consult.
    orientations: noOrientationPreferences(parts),
    portDirections: NO_PORT_DIRECTIONS,
  },
  symbolLibs: {},
  footprintLibs: {},
  pinTables: "../../pintables",
  checklist: null,
  oscar: null,
  ercExclusions: [],
};
