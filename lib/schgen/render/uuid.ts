/**
 * Ported from digital-pedal-platform's `tools/schgen/render/uuid.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { createHash } from "node:crypto";

/** Fixed namespace for every schgen UUID. Changing it changes every generated file. */
export const SCHGEN_NAMESPACE = "3f8b8a2e-6c55-4f0e-9d7a-2b9c4e1d7a60";

function uuidBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error(`namespace "${uuid}" is not a UUID`);
  return Buffer.from(hex, "hex");
}

/** RFC 4122 version-5 UUID: SHA-1 of namespace bytes + UTF-8 name. */
export function uuidV5(name: string, namespace: string = SCHGEN_NAMESPACE): string {
  const digest = createHash("sha1").update(uuidBytes(namespace)).update(name, "utf8").digest();
  const b = Buffer.from(digest.subarray(0, 16));
  b[6] = (b[6]! & 0x0f) | 0x50;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const s = b.toString("hex");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}
