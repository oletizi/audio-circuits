/**
 * Ported from digital-pedal-platform's `tools/schgen/lock/annotate.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { isRecord } from "../strict.ts";
import type { Circuit, PartLabel } from "../ir/types.ts";

export interface RefLock {
  readonly version: 1;
  readonly refs: Readonly<Record<PartLabel, string>>;
  readonly retired: Readonly<Record<PartLabel, string>>;
}

export const EMPTY_LOCK: RefLock = { version: 1, refs: {}, retired: {} };

export interface Annotation {
  readonly refs: ReadonlyMap<PartLabel, string>;
  readonly lock: RefLock;
}

const REF = /^([A-Z]+)([1-9][0-9]*)$/;

function refMap(v: unknown, key: string): Record<PartLabel, string> {
  if (!isRecord(v)) throw new Error(`refs.lock.json: ${key} must be an object`);
  const out: Record<PartLabel, string> = {};
  for (const [label, ref] of Object.entries(v)) {
    if (typeof ref !== "string" || !REF.test(ref)) throw new Error(`refs.lock.json: ${key}.${label} must be a reference string`);
    out[label] = ref;
  }
  return out;
}

/** Labels are disjoint across refs and retired; every reference is held by exactly one label. */
function checkLock(lock: RefLock): void {
  const holder = new Map<string, PartLabel>();
  for (const [label, ref] of Object.entries(lock.refs)) holder.set(ref, label);
  for (const [label, ref] of Object.entries(lock.retired)) {
    if (Object.hasOwn(lock.refs, label)) throw new Error(`refs.lock.json: ${label} is in both refs and retired`);
    const other = holder.get(ref);
    if (other !== undefined) throw new Error(`refs.lock.json: ${ref} is held by both ${other} and ${label}`);
    holder.set(ref, label);
  }
  const seen = new Map<string, PartLabel>();
  for (const [label, ref] of Object.entries(lock.refs)) {
    const other = seen.get(ref);
    if (other !== undefined) throw new Error(`refs.lock.json: ${ref} is held by both ${other} and ${label}`);
    seen.set(ref, label);
  }
}

export function parseRefLock(json: string): RefLock {
  let root: unknown;
  try {
    root = JSON.parse(json);
  } catch (e) {
    throw new Error(`refs.lock.json: invalid JSON (${e instanceof Error ? e.message : String(e)})`);
  }
  if (!isRecord(root) || root["version"] !== 1) throw new Error("refs.lock.json: version must be 1");
  const lock: RefLock = { version: 1, refs: refMap(root["refs"], "refs"), retired: refMap(root["retired"], "retired") };
  checkLock(lock);
  return lock;
}

function sorted(r: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(r).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

export function serializeRefLock(lock: RefLock): string {
  return `${JSON.stringify({ version: 1, refs: sorted(lock.refs), retired: sorted(lock.retired) }, null, 2)}\n`;
}

function split(ref: string): [string, number] {
  const m = REF.exec(ref);
  if (m === null || m[1] === undefined || m[2] === undefined) throw new Error(`internal: "${ref}" is not a reference`);
  return [m[1], Number(m[2])];
}

/**
 * Rename trade-off: the lock is keyed by functional label, so renaming a label is a
 * removal plus an addition. The new label gets a fresh reference and the old one is retired.
 */
export function annotate(c: Circuit, lock: RefLock, pinned: ReadonlyMap<PartLabel, string>): Annotation {
  checkLock(lock);
  const refs: Record<PartLabel, string> = {};
  const retired: Record<PartLabel, string> = { ...lock.retired };
  for (const [label, ref] of Object.entries(lock.refs)) {
    if (c.parts.has(label)) refs[label] = ref;
    else retired[label] = ref;
  }
  for (const label of Object.keys(retired)) {
    const ref = retired[label];
    if (ref !== undefined && c.parts.has(label)) {
      refs[label] = ref;
      delete retired[label];
    }
  }
  const owner = new Map<string, PartLabel>();
  for (const [l, r] of [...Object.entries(refs), ...Object.entries(retired)]) owner.set(r, l);
  for (const [label, ref] of pinned) {
    if (!c.parts.has(label)) throw new Error(`${label} is pinned to ${ref} but is not in the circuit`);
    const locked = refs[label];
    if (locked !== undefined && locked !== ref) throw new Error(`${label} is pinned to ${ref} but locked as ${locked}`);
    const holder = owner.get(ref);
    if (holder !== undefined && holder !== label) throw new Error(`${ref} is pinned for ${label} but already belongs to ${holder}`);
    refs[label] = ref;
    owner.set(ref, label);
  }
  const maxUsed = new Map<string, number>();
  for (const r of owner.keys()) {
    const [p, n] = split(r);
    maxUsed.set(p, Math.max(maxUsed.get(p) ?? 0, n));
  }
  const parts = [...c.parts.values()].sort((a, b) => a.order - b.order);
  for (const part of parts) {
    const locked = refs[part.label];
    if (locked !== undefined) {
      const [p] = split(locked);
      if (p !== part.refPrefix) {
        throw new Error(`${part.label} is locked as ${locked} but its refPrefix is now ${part.refPrefix}; a prefix change needs a new functional label`);
      }
      continue;
    }
    const n = (maxUsed.get(part.refPrefix) ?? 0) + 1;
    maxUsed.set(part.refPrefix, n);
    refs[part.label] = `${part.refPrefix}${n}`;
  }
  const out = new Map<PartLabel, string>(parts.map((p) => [p.label, refs[p.label] ?? ""]));
  const seen = new Set<string>();
  for (const [label, ref] of out) {
    if (ref === "" || seen.has(ref)) throw new Error(`internal: reference for ${label} is missing or duplicated (${ref})`);
    seen.add(ref);
  }
  return { refs: out, lock: { version: 1, refs, retired } };
}
