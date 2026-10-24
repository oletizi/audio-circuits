/**
 * Ported from digital-pedal-platform's `tools/schgen/gates/pintable.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus this entry's declared
 * `cuts` (a deliberate content deletion - see `docs/known-gaps.md`), per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { loadPinTables, parsePinTable } from "../../../lib/schgen/gates/pin-table.ts";

const GOOD = JSON.stringify({
  mpn: "TPS7A4901DGNR",
  document: { id: "SBVS121E", revision: "E", cited: "Table 5-1 Pin Functions", url: null },
  symbol: "H7:TPS7A4901",
  pins: { "1": "OUT", "2": "FB", "3": "NC", "4": "GND", "5": "EN", "6": "NR/SS", "7": "DNC", "8": "IN" },
  aliases: {},
  pinAliases: {},
  mechanicalPads: { "9": { net: "GND" } },
});

/** GOOD with one edit applied to its parsed form. Test-only: builds malformed input. */
function edited(edit: (t: Record<string, unknown> & { document: Record<string, unknown> }) => void): string {
  const t = JSON.parse(GOOD) as Record<string, unknown> & { document: Record<string, unknown> };
  edit(t);
  return JSON.stringify(t);
}

describe("parsePinTable", () => {
  it("reads a complete table", () => {
    const t = parsePinTable("TPS7A4901DGNR", GOOD);
    expect(t.pins["6"]).toBe("NR/SS");
    expect(t.mechanicalPads["9"]).toEqual({ net: "GND" });
  });

  it("names the missing citation field", () => {
    const bad = JSON.parse(GOOD);
    delete bad.document.revision;
    expect(() => parsePinTable("X", JSON.stringify(bad))).toThrow(/pin table X: document.revision must be a non-empty string/);
  });

  it("refuses a mechanical pad that is neither a net nor not connected", () => {
    const bad = JSON.parse(GOOD);
    bad.mechanicalPads["9"] = { net: "" };
    expect(() => parsePinTable("X", JSON.stringify(bad))).toThrow(/pin table X: mechanicalPads.9 must be \{"net": "<NAME>"\} or \{"nc": true\}/);
  });

  it("keeps the key, citation and aliases", () => {
    const t = parsePinTable("K", edited((x) => {
      x.aliases = { "NR/SS": "NR/SS" };
      x.pinAliases = { "1": { symbolName: "", identity: "OUT" } };
      x.mechanicalPads = { "9": { nc: true } };
      x.document.url = "https://example.invalid/ds.pdf";
    }));
    expect(t.key).toBe("K");
    expect(t.document).toEqual({ id: "SBVS121E", revision: "E", cited: "Table 5-1 Pin Functions", url: "https://example.invalid/ds.pdf" });
    expect(t.aliases).toEqual({ "NR/SS": "NR/SS" });
    expect(t.pinAliases["1"]).toEqual({ symbolName: "", identity: "OUT" });
    expect(t.mechanicalPads["9"]).toEqual({ nc: true });
  });

  const refusals: [string, (t: Record<string, unknown> & { document: Record<string, unknown> }) => void, RegExp][] = [
    ["invalid JSON", () => undefined, /^pin table X: invalid JSON: /],
    ["empty mpn", (t) => { t.mpn = ""; }, /pin table X: mpn must be a non-empty string/],
    ["missing symbol", (t) => { delete t.symbol; }, /pin table X: symbol must be a non-empty string/],
    ["document not an object", (t) => { (t as Record<string, unknown>)["document"] = "SBVS121E"; }, /pin table X: document must be an object/],
    ["empty document.id", (t) => { t.document.id = ""; }, /pin table X: document.id must be a non-empty string/],
    ["missing document.cited", (t) => { delete t.document.cited; }, /pin table X: document.cited must be a non-empty string/],
    ["document.url not string or null", (t) => { t.document.url = 3; }, /pin table X: document.url must be a string or null/],
    ["document.url absent", (t) => { delete t.document.url; }, /pin table X: document.url must be a string or null/],
    ["unknown document key", (t) => { t.document.page = 4; }, /pin table X: document: unknown key "page"/],
    ["unknown top-level key", (t) => { t.notes = "x"; }, /pin table X: unknown key "notes"/],
    ["pins not an object", (t) => { t.pins = ["OUT"]; }, /pin table X: pins must be an object/],
    ["pins empty", (t) => { t.pins = {}; }, /pin table X: pins must not be empty/],
    ["pin name empty", (t) => { t.pins = { "1": "" }; }, /pin table X: pins.1 must be a non-empty string/],
    ["aliases not an object", (t) => { t.aliases = null; }, /pin table X: aliases must be an object/],
    ["alias not a string", (t) => { t.aliases = { A: 1 }; }, /pin table X: aliases.A must be a string/],
    ["pinAliases not an object", (t) => { t.pinAliases = []; }, /pin table X: pinAliases must be an object/],
    ["pinAlias not an object", (t) => { t.pinAliases = { "1": "OUT" }; }, /pin table X: pinAliases.1 must be an object/],
    ["pinAlias symbolName missing", (t) => { t.pinAliases = { "1": { identity: "OUT" } }; }, /pin table X: pinAliases.1.symbolName must be a string/],
    ["pinAlias identity empty", (t) => { t.pinAliases = { "1": { symbolName: "", identity: "" } }; }, /pin table X: pinAliases.1.identity must be a non-empty string/],
    ["pinAlias unknown key", (t) => { t.pinAliases = { "1": { symbolName: "", identity: "OUT", note: "x" } }; }, /pin table X: pinAliases.1: unknown key "note"/],
    ["mechanicalPads not an object", (t) => { t.mechanicalPads = "GND"; }, /pin table X: mechanicalPads must be an object/],
    ["mechanical nc false", (t) => { t.mechanicalPads = { "9": { nc: false } }; }, /pin table X: mechanicalPads.9 must be/],
    ["mechanical net and nc", (t) => { t.mechanicalPads = { "9": { net: "GND", nc: true } }; }, /pin table X: mechanicalPads.9 must be/],
  ];
  for (const [name, edit, re] of refusals) {
    it(`refuses ${name}`, () => {
      const json = name === "invalid JSON" ? "{" : edited(edit);
      expect(() => parsePinTable("X", json)).toThrow(re);
    });
  }

  it("keeps prototype-named keys as own data, never as inherited properties", () => {
    const json = '{"mpn":"M","document":{"id":"D","revision":"A","cited":"T","url":null},"symbol":"L:S",' +
      '"pins":{"__proto__":"P","constructor":"C"},"aliases":{"toString":"T"},' +
      '"pinAliases":{"__proto__":{"symbolName":"a","identity":"P"}},"mechanicalPads":{"__proto__":{"nc":true}}}';
    const t = parsePinTable("X", json);
    expect(Object.keys(t.pins)).toEqual(["__proto__", "constructor"]);
    expect(Object.hasOwn(t.pins, "__proto__")).toBe(true);
    expect(Object.keys(t.aliases)).toEqual(["toString"]);
    expect(Object.keys(t.pinAliases)).toEqual(["__proto__"]);
    expect(Object.keys(t.mechanicalPads)).toEqual(["__proto__"]);
  });

  it("refuses a top level that is not an object", () => {
    expect(() => parsePinTable("X", "[]")).toThrow(/pin table X: expected a JSON object/);
  });
});

describe("loadPinTables", () => {
  it("loads every .json in a directory keyed by basename", () => {
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "__fixtures__", "pintables");
    const tables = loadPinTables(dir);
    expect([...tables.keys()]).toEqual(["OPA1688"]);
    expect(tables.get("OPA1688")?.symbol).toBe("Amplifier_Operational:OPA1678");
  });

  it("ignores non-JSON files and names the file in a parse error", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pintables-"));
    try {
      fs.writeFileSync(path.join(dir, "README.txt"), "not a table");
      fs.writeFileSync(path.join(dir, "A.json"), GOOD);
      expect([...loadPinTables(dir).keys()]).toEqual(["A"]);
      fs.writeFileSync(path.join(dir, "B.json"), "{}");
      expect(() => loadPinTables(dir)).toThrow(/pin table B: mpn must be a non-empty string/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a missing directory", () => {
    expect(() => loadPinTables("/nonexistent/pintables")).toThrow(/pin table directory \/nonexistent\/pintables/);
  });
});
