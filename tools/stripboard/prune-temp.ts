/**
 * `make prune-temp`: remove the scratch directories this repository's tests and
 * tools leave under the system temp directory, and the ones the pinned VeroRoute
 * fork leaves there on its own.
 *
 * **IT IS THE COMPANION TO `prune-runs` AND IT EXISTS FOR THE SAME REASON.**
 * `make/aggregate.mk` records the measurement: at roughly **4,606** directories
 * in one directory, `spawnSync` of the fork began returning exit status 0 with
 * EMPTY STDOUT, and twenty-three tests in nine unrelated files failed with
 * *"--dump-board produced no GRID line"* - a refusal pointing at the fork, about
 * a fork that was fine. `prune-runs` sweeps `build/stripboard/`; nothing swept
 * `os.tmpdir()`, and on 2026-10-13 that held over **60,000** directories and the
 * owner's disk filled. `tests/support/temp-scratch.ts` is why the suite stopped
 * contributing; this verb is for what has already accumulated, and for the
 * prefixes nothing in this repository creates.
 *
 * **THE PREFIX LIST IS DERIVED FROM THE SOURCES, NOT WRITTEN DOWN HERE.** A
 * hand-kept list of forty-odd prefixes is a list that goes stale the first time
 * a fixture is renamed, and a prune verb that quietly misses a prefix is exactly
 * the silence this whole area is about. Every `mkdtempSync(path.join(os.tmpdir(),
 * "..."))` and every `freshTempScratch("...")` under `tests/` and `tools/` is
 * read out of the files.
 *
 * **`vr-gui-` IS THE FORK'S OWN AND IS DECLARED SEPARATELY.** 21,362 of them had
 * accumulated by 2026-10-13. No fixture creates one: the pinned binary makes one
 * per spawn, so the source is `oletizi/veroroute-perfboard` and fixing it there
 * is a change to the fork. This verb cleans them from THIS side and says whose
 * they are; it does not pretend they are ours.
 *
 * **A PREFIX THIS VERB CANNOT DERIVE IS REPORTED, NEVER GUESSED.** A site whose
 * prefix begins with an interpolation - `` `${stem}-stub-` `` - has no literal
 * leading text, and a verb that fell back to matching everything would delete
 * another program's scratch. Those sites are listed by file so a reader can see
 * what is NOT covered rather than assume the sweep was total.
 *
 * It is a deliberate verb and a prerequisite of nothing, and it names what it
 * will delete and how many before deleting any of it.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

/** Where the sources that create scratch live, relative to the repository root. */
const SOURCE_ROOTS = ["tests", "tools"] as const

/**
 * Prefixes nothing in this repository creates, with whose they are.
 *
 * Declared rather than derived because they are not in our sources at all - see
 * this module's comment on `vr-gui-`.
 */
const FOREIGN: Readonly<Record<string, string>> = {
  "vr-gui-": "the pinned VeroRoute fork, one per spawn (oletizi/veroroute-perfboard)",
}

function everySource(dir: string): readonly string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...everySource(full))
    else if (entry.name.endsWith(".ts")) out.push(full)
  }
  return out
}

/**
 * The registry's own module, excluded from the scan.
 *
 * Its refusal messages quote example prefixes (*'as in
 * `freshTempScratch("stripboard-rules-")`'*) and interpolate the caller's, so
 * scanning it reads prose rather than sites. Every real prefix it could
 * contribute is contributed by the fixture that passes it. This file is
 * excluded for the same reason - the comment above quotes the patterns it
 * matches on.
 */
const NOT_A_SITE: readonly string[] = [
  path.join("tests", "support", "temp-scratch.ts"),
  path.join("tools", "stripboard", "prune-temp.ts"),
]

/** A usable prefix, or the reason this literal is not one. */
function literalPrefix(raw: string): { readonly prefix: string } | { readonly why: string } {
  if (raw.startsWith("${")) return { why: "begins with an interpolation" }
  const interpolation = raw.indexOf("${")
  const literal = interpolation === -1 ? raw : raw.slice(0, interpolation)
  if (literal.length === 0) return { why: "is empty" }
  if (literal.includes("/") || literal.includes(path.sep)) {
    return { why: "contains a path separator" }
  }
  // The same rule `freshTempScratch` enforces on its callers. A literal without
  // it is not a scratch prefix - it is a refusal test's argument, or a stray
  // string - and matching TMPDIR against it could delete another program's work.
  if (!literal.endsWith("-")) return { why: 'does not end in "-"' }
  return { prefix: literal }
}

export interface DerivedPrefixes {
  /** Every prefix read out of the sources, sorted. */
  readonly own: readonly string[]
  /** Literals this verb will not treat as a prefix, as `<file>: <raw> - <why>`. */
  readonly underivable: readonly string[]
}

/** Every scratch prefix this repository's own sources create. */
export function derivePrefixes(repoRoot: string): DerivedPrefixes {
  const own = new Set<string>()
  const underivable: string[] = []
  const patterns = [
    /mkdtempSync\(\s*path\.join\(\s*os\.tmpdir\(\)\s*,\s*["`]([^"`]*)["`]/g,
    /freshTempScratch\(\s*["`]([^"`]*)["`]/g,
  ]
  for (const root of SOURCE_ROOTS) {
    for (const file of everySource(path.join(repoRoot, root))) {
      const relative = path.relative(repoRoot, file)
      if (NOT_A_SITE.includes(relative)) continue
      const text = fs.readFileSync(file, "utf8")
      for (const pattern of patterns) {
        for (const match of text.matchAll(pattern)) {
          const raw = match[1]
          if (raw === undefined) continue
          const derived = literalPrefix(raw)
          if ("why" in derived) {
            underivable.push(`${relative}: \`${raw}\` - ${derived.why}`)
            continue
          }
          own.add(derived.prefix)
        }
      }
    }
  }
  return { own: [...own].sort(), underivable: [...new Set(underivable)].sort() }
}

/** The directories directly under the system temp directory matching one prefix. */
function matching(prefix: string): readonly string[] {
  const root = os.tmpdir()
  const found: string[] = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (!entry.name.startsWith(prefix)) continue
    found.push(path.join(root, entry.name))
  }
  return found
}

function repoRootOf(): string {
  return path.resolve(import.meta.dir, "..", "..")
}

export function pruneTemp(argv: readonly string[], log: (line: string) => void): number {
  const dryRun = argv.includes("--dry-run")
  const unknown = argv.filter((argument) => argument !== "--dry-run")
  if (unknown.length > 0) {
    throw new Error(
      `prune-temp: unrecognised argument(s) ${unknown.join(", ")}. It takes --dry-run and nothing ` +
        "else: the prefixes are derived from the sources rather than passed in, so there is no " +
        "prefix argument to forget to quote. See this module's comment.",
    )
  }
  const repoRoot = repoRootOf()
  const { own, underivable } = derivePrefixes(repoRoot)
  if (own.length === 0) {
    throw new Error(
      `prune-temp: no scratch prefix was found in ${SOURCE_ROOTS.join("/ or ")}/ under ` +
        `${repoRoot}. The prefixes are read out of the sources (see this module's comment), so an ` +
        "empty list means the scan is broken, not that there is nothing to prune - and deleting " +
        "nothing while reporting success is the failure this whole area exists to prevent.",
    )
  }

  log(`the system temp directory is ${os.tmpdir()}`)
  log("")
  // A SET AND NOT A LIST, because one prefix can be another's prefix -
  // `stripboard-rules-` matches every `stripboard-rules-bad-` directory too.
  // Summing the per-prefix counts would over-report what is about to be removed,
  // and a verb whose stated count is wrong is not a verb that named what it did.
  const doomed = new Set<string>()
  log("this repository's own prefixes, read out of tests/ and tools/:")
  for (const prefix of own) {
    const found = matching(prefix)
    if (found.length > 0) log(`  ${String(found.length).padStart(7)}  ${prefix}*`)
    for (const directory of found) doomed.add(directory)
  }
  log(`  ${String(doomed.size).padStart(7)}  distinct directories, nesting counted once`)

  log("")
  log("prefixes this repository does not create, and whose they are:")
  for (const [prefix, whose] of Object.entries(FOREIGN)) {
    const found = matching(prefix)
    log(`  ${String(found.length).padStart(7)}  ${prefix}* - ${whose}`)
    for (const directory of found) doomed.add(directory)
  }

  if (underivable.length > 0) {
    log("")
    log("NOT COVERED - literals this verb found and will NOT treat as a prefix, with why. It")
    log("reports them rather than guessing one, because a guessed prefix deletes another")
    log("program's scratch:")
    for (const site of underivable) log(`  ${site}`)
  }

  log("")
  if (doomed.size === 0) {
    log("nothing to prune.")
    return 0
  }
  if (dryRun) {
    log(`--dry-run: ${doomed.size} directory(ies) would be removed, and none were.`)
    return 0
  }
  log(`removing ${doomed.size} directory(ies)`)
  let removed = 0
  for (const directory of doomed) {
    fs.rmSync(directory, { recursive: true, force: true })
    removed += 1
  }
  log(`removed ${removed}.`)
  return 0
}

if (import.meta.main) {
  process.exit(pruneTemp(process.argv.slice(2), (line) => console.log(line)))
}
