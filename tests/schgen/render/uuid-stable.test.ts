/**
 * Byte-stability test for `lib/schgen/render/uuid.ts`'s `uuidV5`: the same
 * key must always give the same UUID, different keys must give different
 * UUIDs, and the default namespace must be `SCHGEN_NAMESPACE`. The three
 * literal UUIDs below are pinned so that a change to `SCHGEN_NAMESPACE` or
 * to `uuidV5`'s hashing is a visible diff in this file rather than a silent
 * regeneration of every emitted schematic - see Task 3's brief
 * (`.superpowers/sdd/2026-10-19-schematic-authoring-m1/task-3-brief.md`) and
 * `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test"
import { SCHGEN_NAMESPACE, uuidV5 } from "../../../lib/schgen/render/uuid.ts"

describe("uuidV5 byte stability", () => {
  it("the same key gives the same uuid, and the namespace is fixed", () => {
    expect(uuidV5("sheet:demo:core")).toBe(uuidV5("sheet:demo:core"))
    expect(uuidV5("sheet:demo:core")).not.toBe(uuidV5("sheet:demo:power"))
    expect(uuidV5("x", SCHGEN_NAMESPACE)).toBe(uuidV5("x"))
  })

  it("pins the literal UUIDs these keys produce today", () => {
    expect(uuidV5("sheet:demo:core")).toBe("65329e78-11a8-5c9b-a8c2-a5e81d059ae9")
    expect(uuidV5("sheet:demo:power")).toBe("21c71256-6986-5406-8891-818e5e6332a2")
    expect(uuidV5("x")).toBe("aba25abb-0266-5c9f-877c-2f3d7d8ac702")
  })
})
