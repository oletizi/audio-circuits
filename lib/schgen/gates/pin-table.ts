/**
 * Ported from digital-pedal-platform's `tools/schgen/gates/pintable.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import path from "node:path";
import { isRecord, rejectUnknown } from "../strict.ts";
import { NET_NAME, type MechanicalConnection } from "../ir/types.ts";

/**
 * A datasheet pin table: the cited source of truth gate 6 compares the symbol,
 * the circuit's pin identities and the footprint against. Aliases are
 * declarative and matched exactly; nothing here is ever case-folded or fuzzed.
 */
export interface PinTable {
  /** File basename without .json. */
  readonly key: string;
  readonly mpn: string;
  readonly document: { readonly id: string; readonly revision: string; readonly cited: string; readonly url: string | null };
  /** Lib id the table is for. */
  readonly symbol: string;
  /** Pin number -> canonical identity (datasheet name). */
  readonly pins: Readonly<Record<string, string>>;
  /** Symbol pin name -> identity (spec form). */
  readonly aliases: Readonly<Record<string, string>>;
  /** Per pin number: the symbol name it expects and the identity it maps to. */
  readonly pinAliases: Readonly<Record<string, { readonly symbolName: string; readonly identity: string }>>;
  readonly mechanicalPads: Readonly<Record<string, MechanicalConnection>>;
}

const TOP_KEYS = ["mpn", "document", "symbol", "pins", "aliases", "pinAliases", "mechanicalPads"] as const;
const DOCUMENT_KEYS = ["id", "revision", "cited", "url"] as const;
const PIN_ALIAS_KEYS = ["symbolName", "identity"] as const;

function nonEmpty(value: unknown, where: string, field: string): string {
  if (typeof value !== "string" || value === "") throw new Error(`${where}: ${field} must be a non-empty string`);
  return value;
}

function anyString(value: unknown, where: string, field: string): string {
  if (typeof value !== "string") throw new Error(`${where}: ${field} must be a string`);
  return value;
}

function object(value: unknown, where: string, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${where}: ${field} must be an object`);
  return value;
}

function mechanical(value: unknown, where: string, field: string): MechanicalConnection {
  const fail = () => new Error(`${where}: ${field} must be {"net": "<NAME>"} or {"nc": true}`);
  if (!isRecord(value)) throw fail();
  const keys = Object.keys(value);
  if (keys.length !== 1) throw fail();
  if (keys[0] === "net") {
    const net = value["net"];
    if (typeof net !== "string" || !NET_NAME.test(net)) throw fail();
    return { net };
  }
  if (keys[0] === "nc" && value["nc"] === true) return { nc: true };
  throw fail();
}

export function parsePinTable(key: string, json: string): PinTable {
  const where = `pin table ${key}`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`${where}: invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isRecord(parsed)) throw new Error(`${where}: expected a JSON object at the top level`);
  rejectUnknown(parsed, TOP_KEYS, where);

  const mpn = nonEmpty(parsed["mpn"], where, "mpn");
  const symbol = nonEmpty(parsed["symbol"], where, "symbol");

  const doc = object(parsed["document"], where, "document");
  rejectUnknown(doc, DOCUMENT_KEYS, `${where}: document`);
  const url = doc["url"];
  if (url !== null && typeof url !== "string") throw new Error(`${where}: document.url must be a string or null`);
  const document = {
    id: nonEmpty(doc["id"], where, "document.id"),
    revision: nonEmpty(doc["revision"], where, "document.revision"),
    cited: nonEmpty(doc["cited"], where, "document.cited"),
    url,
  };

  const rawPins = object(parsed["pins"], where, "pins");
  if (Object.keys(rawPins).length === 0) throw new Error(`${where}: pins must not be empty`);
  // Object.fromEntries defines own data properties, so a key such as "__proto__" stays a key, never a prototype.
  const pins: Record<string, string> = Object.fromEntries(Object.entries(rawPins).map(([n, v]): [string, string] => [n, nonEmpty(v, where, `pins.${n}`)]));

  const aliases: Record<string, string> = Object.fromEntries(
    Object.entries(object(parsed["aliases"], where, "aliases")).map(([n, v]): [string, string] => [n, anyString(v, where, `aliases.${n}`)]),
  );

  const pinAliases: Record<string, { symbolName: string; identity: string }> = Object.fromEntries(
    Object.entries(object(parsed["pinAliases"], where, "pinAliases")).map(([n, v]): [string, { symbolName: string; identity: string }] => {
      const a = object(v, where, `pinAliases.${n}`);
      rejectUnknown(a, PIN_ALIAS_KEYS, `${where}: pinAliases.${n}`);
      const alias = {
        symbolName: anyString(a["symbolName"], where, `pinAliases.${n}.symbolName`),
        identity: nonEmpty(a["identity"], where, `pinAliases.${n}.identity`),
      };
      return [n, alias];
    }),
  );

  const mechanicalPads: Record<string, MechanicalConnection> = Object.fromEntries(
    Object.entries(object(parsed["mechanicalPads"], where, "mechanicalPads")).map(([p, v]): [string, MechanicalConnection] => [p, mechanical(v, where, `mechanicalPads.${p}`)]),
  );

  return { key, mpn, document, symbol, pins, aliases, pinAliases, mechanicalPads };
}

/** Every *.json in `dir`, parsed and keyed by basename. */
export function loadPinTables(dir: string): Map<string, PinTable> {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`pin table directory ${dir} does not exist`);
  const out = new Map<string, PinTable>();
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const key = path.basename(name, ".json");
    out.set(key, parsePinTable(key, fs.readFileSync(path.join(dir, name), "utf8")));
  }
  return out;
}
