import { test, expect } from "bun:test"
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import {
  EXPORT,
  NETLIST_JSON,
  SCHEMATIC,
  exportsAgree,
  syncPultecSchematic,
  withRepoRelativeSource,
  withoutVolatileFields,
} from "../../tools/reference/pultec-schematic-sync.ts"

const REPO = path.resolve(import.meta.dir, "../..")
const read = (relative: string) => fs.readFileSync(path.join(REPO, relative), "utf8")

/**
 * The hashes `reference/pultec/README.md` records for the schematics the
 * reference was transcribed from. Asserting the vendored copies against them
 * turns that table from a historical note into a checkable claim: if these
 * ever differ, the schematic in this repository is not the one every value in
 * `values.md` was corroborated against.
 */
const RECORDED_HASHES: Readonly<Record<string, string>> = {
  "pultec-three-band-eq.kicad_sch":
    "9937e9cd9cfa67acdeba7404289889653e740d807d9cdf8eb03e6509abb0622c",
  "pultec-mid-band.kicad_sch":
    "bc85ae3ae0ab5bb6f470ae34f9c3c9a22d3efdd9a138c0d5865b25e425611691",
}

test("the schematic is in this repository, not referenced from another one", () => {
  expect(fs.existsSync(path.join(REPO, SCHEMATIC))).toBe(true)
  // Hierarchical: the top sheet pulls the mid band in, so both must be present
  // or an export silently loses the whole mid section.
  expect(fs.existsSync(path.join(REPO, "circuits/pultec/pultec-mid-band.kicad_sch")))
    .toBe(true)
})

test("the vendored schematics are the ones the reference was transcribed from", () => {
  for (const [file, expected] of Object.entries(RECORDED_HASHES)) {
    const contents = fs.readFileSync(path.join(REPO, "circuits/pultec", file))
    expect(createHash("sha256").update(contents).digest("hex"), file).toBe(expected)
  }
})

test("the committed export names a path inside this repository", () => {
  // The whole point of vendoring: no artifact may point at another repository
  // or at somebody's home directory.
  expect(read(EXPORT)).toContain(`<source>${SCHEMATIC}</source>`)
  expect(read(EXPORT)).not.toContain("multi-channel-preamp")
  expect(read(EXPORT)).not.toContain("/Users/")
})

test("no reference artifact points outside this repository", () => {
  for (const file of [EXPORT, NETLIST_JSON]) {
    expect(read(file), file).not.toContain("multi-channel-preamp")
    expect(read(file), file).not.toContain("/Users/")
  }
})

test("only the date and the source path are treated as volatile", () => {
  const base = "<export><design><source>/a/b.kicad_sch</source><date>2026-01-01</date>" +
    "</design><components><comp ref=\"C1\"/></components></export>"
  const moved = "<export><design><source>/x/y.kicad_sch</source><date>2099-12-31</date>" +
    "</design><components><comp ref=\"C1\"/></components></export>"
  expect(exportsAgree(base, moved)).toBe(true)
})

test("a real change is NOT normalized away", () => {
  const base = "<export><design><source>/a/b</source><date>d</date></design>" +
    "<components><comp ref=\"C1\"/></components></export>"
  const changed = "<export><design><source>/a/b</source><date>d</date></design>" +
    "<components><comp ref=\"C2\"/></components></export>"
  expect(exportsAgree(base, changed)).toBe(false)
  expect(withoutVolatileFields(base)).toContain("C1")
})

test("rewriting the source touches only the design source, not sheet references", () => {
  const xml = "<export><design><source>/absolute/path.kicad_sch</source></design>" +
    "<sheet><source>pultec-mid-band.kicad_sch</source></sheet></export>"
  const rewritten = withRepoRelativeSource(xml)
  expect(rewritten).toContain(`<source>${SCHEMATIC}</source>`)
  expect(rewritten).toContain("<source>pultec-mid-band.kicad_sch</source>")
})

test("a missing schematic refuses, naming this repository rather than another", () => {
  // The path is injected rather than the real file moved: a test that renames a
  // committed schematic and then crashes leaves the tree broken for every test
  // after it.
  expect(() => syncPultecSchematic({
    schematic: "circuits/pultec/does-not-exist.kicad_sch",
    runExport: () => { throw new Error("the export must not run when the schematic is absent") },
  })).toThrow(/does not exist[\s\S]*THIS repository/)
})

test("regenerating the committed export is a no-op", () => {
  // The property the guard rests on: an unchanged schematic must leave the
  // tree clean, or every run would report drift and the signal would be noise.
  const before = read(EXPORT)
  const result = syncPultecSchematic()
  expect(result.changed).toBe(false)
  expect(read(EXPORT)).toBe(before)
})
