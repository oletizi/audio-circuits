/**
 * The transitive import closure of a module, and one content hash over it.
 *
 * **WHY THIS EXISTS.** Three tests in the stripboard pipeline make a structural
 * claim about what a module may reach - HC8's independence, R2's
 * generate-and-grade split, and the search's freedom from non-determinism - and
 * all three were first written as `expect(text).not.toContain("score.ts")` over
 * ONE file, which a single transitive import through any third module satisfies:
 * a weak check under a strong name, which is a false guarantee rather than a
 * known limit.
 *
 * **IT IS PRODUCTION CODE AND NOT A TEST HELPER, and that move is the point.**
 * It lived in `tests/stripboard/import-closure.ts` while the adoption gate -
 * which has exactly the same problem, and said so in its own refusal text -
 * hashed single files. `span-hash` named `lib/kicad/lead-span.ts` "the
 * authority for every physical lead span HC5 and HC9 grade a candidate by", but
 * `deriveSpanHoles`, `BEND_RULE`, the stripboard pitch and
 * `TOOL_MIN/MAX_SPAN_HOLES` are all in `lead-span-model.ts`, which that hash
 * never read; `pin-pattern-hash` named `lib/kicad/pin-pattern.ts` while the
 * runtime `admitPattern` is in `pin-pattern-model.ts`. So the bend arithmetic or
 * the hole clamp could be edited after a run and both hashes would still match -
 * and `make check` does not cover it, because such an edit changes the BOUNDS a
 * candidate was graded under without changing the netlist.
 *
 * **IT IS SYNCHRONOUS**, and always was in substance: the body is
 * `readFileSync`, `existsSync` and a regex, and the `async` on its old signature
 * bought nothing while making it unusable from `adoptLayout`, which is not
 * `async` and must not become so.
 *
 * **IT REFUSES RATHER THAN DEGRADES.** An import specifier it cannot resolve to
 * a file is an error naming the importer and the specifier, because a closure
 * computed over a partial graph is smaller than the real one and the module that
 * fell out of it may be exactly the one that mattered. A check that passes by
 * looking at nothing is the failure mode this whole pipeline is built against.
 *
 * **TYPE-ONLY IMPORTS COUNT.** `import type { Score } from "./score.ts"` ships
 * no runtime code, but R2 is about two implementations sharing nothing, and a
 * type definition crossing the boundary is a shared definition. For the gate's
 * purpose it counts for a second reason: a type whose shape changes changes what
 * the graders agree about. Counting it is the stricter and simpler rule and
 * nothing here needs the exemption.
 *
 * It relies on this repository's own import convention - explicit relative paths
 * with the `.ts` extension (CLAUDE.md) - and refuses a bare specifier rather
 * than guessing at a resolver. `EXTERNAL` is the enumerated set of bare
 * specifiers that are not repository files, skipped BY NAME: an empty whitelist
 * that refuses loudly beats a general rule that quietly accepts a guess, so a
 * new dependency arriving in a closure is a deliberate edit here rather than a
 * silently resolved edge.
 *
 * MEASURED, and recorded because the brief for the original helper got it wrong:
 * the bare specifiers in this repository are NOT only node builtins and
 * `bun:test`. `lib/sim/operating-point.ts` imports `eecircuit-engine`, the one
 * npm dependency, and any closure reaching `lib/sim/` hits it.
 *
 * ASSUMPTION, recorded rather than engineered around, and the same one
 * `tools/perfboard/repo-root.ts` records: this file goes on living one directory
 * below the repository root, and `import.meta.dir` resolves to its real
 * location. That holds for how this repository runs itself today.
 */
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const REPO_ROOT = path.resolve(import.meta.dir, "..")

/** Specifiers that are not repository files and are skipped by name, not by pattern. */
const EXTERNAL = new Set(["bun", "bun:test", "bun:sqlite", "eecircuit-engine"])

function specifiersIn(text: string): readonly string[] {
  // The first pattern covers static imports and re-exports, the second the
  // dynamic `import()` call. Both are matched because either one reaches a
  // module.
  //
  // **NEITHER FORM IS SPELLED OUT WITH A QUOTED SPECIFIER IN THIS FILE'S OWN
  // COMMENTS, AND THAT IS NOT FASTIDIOUSNESS.** The dynamic pattern is not
  // anchored to the start of a line, so it reads a quoted specifier inside a
  // COMMENT as a real one: this comment used to illustrate the call with a
  // quoted ellipsis, and the walker consequently read a specifier of `...` from
  // itself - which nothing noticed, because no file in the repository imported
  // the walker until `tests/fixtures/from-literal-importer.ts.txt` did, and a
  // module's own specifiers are only read when something reaches it. Illustrate
  // the syntax without a quoted argument.
  //
  // **`from` MUST BE PRECEDED BY WHITESPACE OR `}`, AND THAT IS A BUG FIX WITH A
  // DRIVEN FAILURE BEHIND IT.** Without the boundary, the word `from` INSIDE A
  // STRING LITERAL was read as the keyword: a data array holding `"from",` -
  // `ENTRY_KEYS` in `tools/stripboard/exemptions-model.ts`, whose entries name
  // the fields of an exemption, one of which is `from` - matched with the
  // literal's own closing quote as the specifier's opening one, and the walker
  // refused the file with `imports ",\n  "`. The fault was in the walker and not
  // in the file: a module specifier never begins at a string's closing quote. In
  // a real statement - a default import, a braced one, or a re-export - the
  // keyword is always preceded by whitespace or by a closing brace, so nothing
  // real is dropped, and `tests/stripboard/equivalence.test.ts` drives both
  // halves. (Spelled out without a quoted specifier, for the reason just above.)
  const found = [
    ...text.matchAll(/(?:^|\n)\s*(?:import|export)[\s\S]{0,400}?[\s}]from\s*["']([^"'\n]+)["']/g),
    ...text.matchAll(/\bimport\(\s*["']([^"'\n]+)["']\s*\)/g),
  ]
  return found.map((match) => match[1] ?? "")
}

/**
 * Every module `entry` can reach, as repository-relative paths, INCLUDING
 * `entry` itself - so a test asserting a forbidden module is absent also fails
 * when the entry point IS the forbidden module, and a hash over the closure
 * moves when the entry's own bytes move.
 *
 * `entry` may be repository-relative or absolute.
 */
export function importClosure(entry: string): ReadonlySet<string> {
  const seen = new Set<string>()
  const queue = [path.resolve(REPO_ROOT, entry)]
  while (queue.length > 0) {
    const absolute = queue.pop()
    if (absolute === undefined) throw new Error("unreachable: popped an empty queue")
    const relative = path.relative(REPO_ROOT, absolute)
    if (seen.has(relative)) continue
    if (!fs.existsSync(absolute)) {
      throw new Error(
        `the import closure of "${entry}" reaches "${relative}", which is not a file. This is ` +
          "an error and not a skipped edge: a closure computed over a partial graph is smaller " +
          "than the real one, and the module that fell out of it may be the forbidden one.",
      )
    }
    seen.add(relative)
    for (const specifier of specifiersIn(fs.readFileSync(absolute, "utf8"))) {
      if (EXTERNAL.has(specifier) || specifier.startsWith("node:")) continue
      if (!specifier.startsWith(".")) {
        throw new Error(
          `"${relative}" imports "${specifier}", which is neither relative nor a known external. ` +
            "This repository's convention is explicit relative paths with the .ts extension " +
            "(CLAUDE.md), and this walker refuses to guess at a resolver rather than silently " +
            "dropping an edge from a closure a test draws a conclusion from.",
        )
      }
      queue.push(path.resolve(path.dirname(absolute), specifier))
    }
  }
  return seen
}

function lengthPrefixed(block: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(block.length, 0)
  return Buffer.concat([length, block])
}

/**
 * One sha256 over every file in `entry`'s import closure: each repository-
 * relative path and the file's raw bytes, in path-sorted order.
 *
 * **PATHS ARE IN THE DIGEST, not only contents.** Moving a module between two
 * files without changing a byte of either changes which file holds what, and a
 * digest that could not see that would be a digest of a different question.
 *
 * **EACH BLOCK CARRIES ITS OWN BYTE LENGTH** rather than being separated by a
 * NUL, for the reason `tests/stripboard/run-dir-fixtures.ts`'s `boardsDigest`
 * records: a bare separator is ambiguous, because a NUL inside one file's own
 * contents reads byte for byte as the separator a different two-file set would
 * produce. A fixed-width length prefix leaves nothing for a file's bytes to be
 * mistaken for.
 *
 * **IT IS SORTED BY PATH** because `importClosure` returns insertion order off a
 * stack, which is a property of the walk rather than of the sources, and a
 * digest that moved when the walk order moved would refuse runs for no reason.
 */
export function closureSha256(entry: string): string {
  const files = [...importClosure(entry)].sort()
  const hash = createHash("sha256")
  for (const relative of files) {
    hash.update(lengthPrefixed(Buffer.from(relative, "utf8")))
    hash.update(lengthPrefixed(fs.readFileSync(path.join(REPO_ROOT, relative))))
  }
  return hash.digest("hex")
}
