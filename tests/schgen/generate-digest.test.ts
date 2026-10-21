/**
 * SPEC §2.1's TEMPLATE AND RULE LIBRARY VERSIONS: what `moduleTreeDigest` covers, and the
 * perturbations that prove it covers it.
 *
 * **THIS FILE EXISTS BECAUSE THE FIRST VERSION OF THAT DIGEST DID NOT DETECT THE THING ITS OWN DOC
 * COMMENT SAID IT EXISTED TO DETECT.** It hashed `lib/schgen/render/templates/*.ts`,
 * non-recursively. Eight of the nine modules in that directory import their geometry producers
 * from the PARENT directory - `chain-kit.ts`, `layout-kit.ts`, `fanout-kit.ts`, `geometry.ts`,
 * `drawn-extent.ts`, `power-text.ts`, `text-boxes.ts`, `lib-pins.ts` - so an edit to a template's
 * drawn geometry left `templateLibrarySha256` exactly where it was. The output change was still
 * caught by `generatedSha256` through gate 1, so this was a MIS-ATTRIBUTION rather than a blind
 * spot in the gate; but the manifest's job is to record the library version that graded the
 * output, and the recorded version was incomplete.
 *
 * **THE PERTURBATION IS REAL AND NOT A MEMBERSHIP ASSERTION.** Each case below copies the library
 * tree into a scratch directory, digests it, mutates one geometry producer's BYTES in the copy and
 * asserts the digest moved - which is why `moduleTreeDigest` takes its root as a parameter. No
 * tracked file is touched. The first test is what makes the copy admissible evidence: the copy and
 * the tree `generate` hashes digest identically, so a perturbation of the copy is a perturbation
 * of the subject.
 *
 * **AND EACH CASE ASSERTS THE MODULE IS OUTSIDE `templates/`**, because that is the finding: a
 * digest over `templates/` alone could not have seen any of the eight.
 */
import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { RULE_LIBRARY_DIR, TEMPLATE_LIBRARY_DIR, moduleTreeDigest } from "../../tools/schgen/generate.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/**
 * The geometry producers a template draws with, each stated as its path relative to the template
 * library tree. They are the eight modules the review named; the list is here rather than derived
 * from an import walk, because an import walk is the mechanism this digest deliberately does NOT
 * use (see `moduleTreeDigest`'s comment) and deriving the expectation from it would make this test
 * check the walker instead of the digest.
 */
const GEOMETRY_PRODUCERS: readonly string[] = [
  "chain-kit.ts",
  "layout-kit.ts",
  "fanout-kit.ts",
  "geometry.ts",
  "drawn-extent.ts",
  "power-text.ts",
  "text-boxes.ts",
  "lib-pins.ts",
]

/** A scratch copy of one library tree, at the same repo-relative path, removed afterwards. */
function withTreeCopy<T>(dir: string, use: (root: string) => T): T {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "schgen-digest-"))
  try {
    const to = path.join(root, dir)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.cpSync(path.join(moduleRepoRoot(), dir), to, { recursive: true })
    return use(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

const live = (dir: string): string => moduleTreeDigest(moduleRepoRoot(), dir)

describe("the manifest's template library version", () => {
  it("is the whole render tree, so a scratch copy of it digests identically to what generate hashes", () => {
    expect(TEMPLATE_LIBRARY_DIR, "a digest over templates/ alone misses every geometry producer").toBe(
      "lib/schgen/render",
    )
    withTreeCopy(TEMPLATE_LIBRARY_DIR, (root) => {
      expect(
        moduleTreeDigest(root, TEMPLATE_LIBRARY_DIR),
        "the copy is the subject; if these differ, every perturbation below proves nothing",
      ).toBe(live(TEMPLATE_LIBRARY_DIR))
    })
  })

  it("names every module by its path relative to the tree, templates included", () => {
    const digest = live(TEMPLATE_LIBRARY_DIR)
    const lines = digest.split("\n")
    expect(lines.length, "the tree holds more modules than templates/ did").toBeGreaterThan(9)
    expect(digest).toContain("templates/opamp-stage.ts ")
    expect(digest).toContain("chain-kit.ts ")
    // Sorted, so the digest does not depend on the order the directory walk returned.
    expect(lines.map((l) => l.split(" ")[0] ?? ""), "sorted").toEqual(
      [...lines.map((l) => l.split(" ")[0] ?? "")].sort(),
    )
  })

  for (const module of GEOMETRY_PRODUCERS) {
    it(`moves when ${module}'s bytes move, and that module is NOT under templates/`, () => {
      expect(module.includes("/"), `${module} is a sibling of templates/, which is the finding`).toBe(false)
      withTreeCopy(TEMPLATE_LIBRARY_DIR, (root) => {
        const file = path.join(root, TEMPLATE_LIBRARY_DIR, module)
        const before = moduleTreeDigest(root, TEMPLATE_LIBRARY_DIR)
        fs.writeFileSync(file, `${fs.readFileSync(file, "utf8")}\n// a geometry edit\n`)
        expect(
          moduleTreeDigest(root, TEMPLATE_LIBRARY_DIR),
          `${module} is inside the digest's input set and an edit to it must move the recorded version`,
        ).not.toBe(before)
      })
    })
  }

  it("covers a module added in a NEW subdirectory, which the non-recursive version dropped", () => {
    withTreeCopy(TEMPLATE_LIBRARY_DIR, (root) => {
      const before = moduleTreeDigest(root, TEMPLATE_LIBRARY_DIR)
      const added = path.join(root, TEMPLATE_LIBRARY_DIR, "templates", "kits")
      fs.mkdirSync(added, { recursive: true })
      fs.writeFileSync(path.join(added, "new-kit.ts"), "export const x = 1\n")
      const after = moduleTreeDigest(root, TEMPLATE_LIBRARY_DIR)
      expect(after, "a subdirectory must not narrow the digest silently").not.toBe(before)
      expect(after, "and it is named, so a reader can see what moved").toContain("templates/kits/new-kit.ts ")
    })
  })

  it("refuses a file it cannot hash, naming the file and what to do about it", () => {
    withTreeCopy(TEMPLATE_LIBRARY_DIR, (root) => {
      fs.writeFileSync(path.join(root, TEMPLATE_LIBRARY_DIR, "templates", "geometry.json"), "{}\n")
      expect(() => moduleTreeDigest(root, TEMPLATE_LIBRARY_DIR)).toThrow(
        /does not hash: templates\/geometry\.json/,
      )
      expect(() => moduleTreeDigest(root, TEMPLATE_LIBRARY_DIR)).toThrow(/skipped check/)
    })
  })

  it("refuses a tree with no module rather than hashing a constant", () => {
    withTreeCopy(TEMPLATE_LIBRARY_DIR, (root) => {
      const tree = path.join(root, TEMPLATE_LIBRARY_DIR)
      fs.rmSync(tree, { recursive: true, force: true })
      fs.mkdirSync(tree, { recursive: true })
      expect(() => moduleTreeDigest(root, TEMPLATE_LIBRARY_DIR)).toThrow(/holds no \.ts module/)
    })
  })
})

describe("the manifest's rule library version", () => {
  it("is the rules tree, names its three modules, and is not the template digest", () => {
    expect(RULE_LIBRARY_DIR).toBe("lib/schgen/rules")
    const digest = live(RULE_LIBRARY_DIR)
    for (const module of ["orientation.ts", "pin-sides.ts", "symbols.ts"]) {
      expect(digest).toContain(`${module} `)
    }
    expect(digest, "two libraries, two versions").not.toBe(live(TEMPLATE_LIBRARY_DIR))
  })

  it("moves when a rule module's bytes move", () => {
    withTreeCopy(RULE_LIBRARY_DIR, (root) => {
      const file = path.join(root, RULE_LIBRARY_DIR, "pin-sides.ts")
      const before = moduleTreeDigest(root, RULE_LIBRARY_DIR)
      fs.writeFileSync(file, `${fs.readFileSync(file, "utf8")}\n// a rule edit\n`)
      expect(moduleTreeDigest(root, RULE_LIBRARY_DIR)).not.toBe(before)
    })
  })
})
