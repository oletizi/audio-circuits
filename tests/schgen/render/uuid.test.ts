/**
 * Ported from digital-pedal-platform's `tools/schgen/render/uuid.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { SCHGEN_NAMESPACE, uuidV5 } from "../../../lib/schgen/render/uuid.ts";

const NAMESPACE_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("uuidV5", () => {
  it("matches the RFC 4122 v5 value Python's uuid module gives for python.org", () => {
    expect(uuidV5("python.org", NAMESPACE_DNS)).toBe("886313e1-3b8a-5372-9b90-0c9aee199e5d");
  });

  it("is stable for a key and differs between keys", () => {
    expect(uuidV5("sym:R_TOP:1")).toBe(uuidV5("sym:R_TOP:1"));
    expect(uuidV5("sym:R_TOP:1")).not.toBe(uuidV5("sym:R_TOP:2"));
  });

  it("uses the schgen namespace by default", () => {
    expect(uuidV5("k")).toBe(uuidV5("k", SCHGEN_NAMESPACE));
  });

  it("rejects a malformed namespace", () => {
    expect(() => uuidV5("k", "not-a-uuid")).toThrow(/namespace "not-a-uuid" is not a UUID/);
  });
});
