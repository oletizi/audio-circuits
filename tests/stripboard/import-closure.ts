/**
 * The transitive import closure of a module, as repository-relative paths.
 *
 * WHY THIS EXISTS. Three tests in this pipeline make a structural claim about
 * what a module may reach: HC8's independence (Task 4), R2's generate-and-grade
 * split (Task 14) and the search's freedom from non-determinism (Task 18). All
 * three were first written as `expect(text).not.toContain("score.ts")` over one
 * file, which a single transitive import through any third module satisfies -
 * a weak check under a strong name, which is a false guarantee rather than a
 * known limit.
 *
 * IT REFUSES RATHER THAN DEGRADES. An import specifier it cannot resolve to a
 * file is an error naming the importer and the specifier, because a closure
 * computed over a partial graph is smaller than the real one and a forbidden
 * module may be exactly what fell out of it. A check that passes by looking at
 * nothing is the failure mode this whole plan is built against.
 *
 * TYPE-ONLY IMPORTS COUNT. `import type { Score } from "./score.ts"` ships no
 * runtime code, but R2 is about two implementations sharing nothing, and a type
 * definition crossing the boundary is a shared definition. Counting it is the
 * stricter and simpler rule, and nothing in this plan needs the exemption.
 *
 * It relies on this repository's own import convention - explicit relative
 * paths with the .ts extension (CLAUDE.md) - and refuses a bare specifier
 * rather than guessing at a resolver. `EXTERNAL` is the enumerated set of
 * bare specifiers that are not repository files, skipped BY NAME: an empty
 * whitelist that refuses loudly beats a general rule that quietly accepts a
 * guess, so a new dependency arriving in a closure is a deliberate edit here
 * rather than a silently resolved edge.
 *
 * THE BRIEF'S CLAIM THAT THE ONLY BARE SPECIFIERS ARE NODE BUILTINS AND
 * `bun:test` IS WRONG, measured: `lib/sim/operating-point.ts` imports
 * `eecircuit-engine`, this repository's one npm dependency, and any closure
 * reaching `lib/sim/` hits it. It is enumerated below for that reason.
 *
 * It is NOT a `.test.ts` file: it is a helper several test files import,
 * following `tests/circuits/kicad-round-trip.ts`.
 */
import fs from "node:fs"
import path from "node:path"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")

/** Specifiers that are not repository files and are skipped by name, not by pattern. */
const EXTERNAL = new Set(["bun", "bun:test", "bun:sqlite", "eecircuit-engine"])

function specifiersIn(text: string): readonly string[] {
  // `from "..."` covers static imports and re-exports; `import("...")` covers
  // the dynamic form. Both are matched because either one reaches a module.
  const found = [
    ...text.matchAll(/(?:^|\n)\s*(?:import|export)[\s\S]{0,400}?from\s*["']([^"']+)["']/g),
    ...text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
  ]
  return found.map((match) => match[1] ?? "")
}

/**
 * Every module `entry` can reach, as repository-relative paths, INCLUDING
 * `entry` itself - so a test asserting a forbidden module is absent also fails
 * when the entry point IS the forbidden module.
 */
export async function importClosure(entry: string): Promise<ReadonlySet<string>> {
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
