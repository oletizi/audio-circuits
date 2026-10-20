/**
 * Ported from digital-pedal-platform's `tools/schgen/lock/versionLock.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "bun:test";
import {
  compareVersionLock,
  fingerprintLibraries,
  libraryDigest,
  parseVersionLock,
  serializeVersionLock,
} from "../../../lib/schgen/lock/version-lock.ts";

describe("version lock", () => {
  it("hashes library bytes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vlock-"));
    const f = path.join(dir, "Device.kicad_sym");
    fs.writeFileSync(f, "abc");
    expect(fingerprintLibraries(new Map([["Device", f]]))).toEqual({ Device: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("refuses to fingerprint a library file that does not exist", () => {
    expect(() => fingerprintLibraries(new Map([["Device", "/nonexistent/Device.kicad_sym"]]))).toThrow(
      /library Device: cannot read \/nonexistent\/Device.kicad_sym/,
    );
  });

  it("accepts a patch-level KiCad difference when libraries are identical", () => {
    expect(compareVersionLock({ kicad: "10.0.5", libraries: { Device: "aa" } }, { kicad: "10.0.6", libraries: { Device: "aa" } })).toEqual([]);
  });

  it("rejects a minor-version change", () => {
    expect(compareVersionLock({ kicad: "10.0.5", libraries: {} }, { kicad: "10.1.0", libraries: {} })).toEqual([
      "KiCad 10.1.0 does not match the locked 10.0.5: 10.0.x is pinned",
    ]);
  });

  it("rejects a major-version change", () => {
    expect(compareVersionLock({ kicad: "10.0.5", libraries: {} }, { kicad: "11.0.0", libraries: {} })).toEqual([
      "KiCad 11.0.0 does not match the locked 10.0.5: 10.0.x is pinned",
    ]);
  });

  it("names a drifted library and both hashes (Review Focus 2)", () => {
    expect(compareVersionLock({ kicad: "10.0.5", libraries: { Device: "aa" } }, { kicad: "10.0.5", libraries: { Device: "bb" } })).toEqual([
      "library Device: sha256 bb differs from the locked aa (stock library drift); accept it deliberately with pnpm schgen generate --accept-toolchain and review the schgen.lock.json diff",
    ]);
  });

  it("reports libraries loaded but not locked, and locked but no longer loaded", () => {
    expect(compareVersionLock({ kicad: "10.0.5", libraries: { power: "p" } }, { kicad: "10.0.5", libraries: { Device: "d" } })).toEqual([
      "library Device is loaded but not in schgen.lock.json",
      "library power is locked but no longer loaded",
    ]);
  });

  it("round-trips", () => {
    const v = { kicad: "10.0.5", libraries: { power: "p", Device: "d" } };
    expect(parseVersionLock(serializeVersionLock(v))).toEqual(v);
    expect(serializeVersionLock(v)).toBe('{\n  "kicad": "10.0.5",\n  "libraries": {\n    "Device": "d",\n    "power": "p"\n  }\n}\n');
  });

  it("refuses malformed lock files", () => {
    expect(() => parseVersionLock("{")).toThrow(/schgen.lock.json is not valid JSON/);
    expect(() => parseVersionLock("[]")).toThrow(/schgen.lock.json must be an object/);
    expect(() => parseVersionLock('{"libraries":{}}')).toThrow(/schgen.lock.json: "kicad" must be a version string like 10.0.5/);
    expect(() => parseVersionLock('{"kicad":"10.0","libraries":{}}')).toThrow(/"kicad" must be a version string like 10.0.5/);
    expect(() => parseVersionLock('{"kicad":"10.0.5"}')).toThrow(/schgen.lock.json: "libraries" must be an object/);
    expect(() => parseVersionLock('{"kicad":"10.0.5","libraries":{"Device":3}}')).toThrow(
      /schgen.lock.json: library Device hash must be a string/,
    );
    expect(() => parseVersionLock('{"kicad":"10.0.5","libraries":{},"extra":1}')).toThrow(/schgen.lock.json: unknown key "extra"/);
  });

  it("digests the library set independently of key order", () => {
    const a = libraryDigest({ kicad: "10.0.5", libraries: { Device: "d", power: "p" } });
    const b = libraryDigest({ kicad: "10.0.6", libraries: { power: "p", Device: "d" } });
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).toBe(b);
    expect(libraryDigest({ kicad: "10.0.5", libraries: { Device: "x", power: "p" } })).not.toBe(a);
  });
});
