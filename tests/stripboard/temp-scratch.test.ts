/**
 * The standing guard that this suite leaves the system temp directory as it
 * found it.
 *
 * **IT EXISTS BECAUSE THE SUCCESS METRIC MEASURED THE WRONG DIRECTORY.** "Zero
 * run directories" was reported repeatedly as a clean bill of health for the
 * scratch-leak fix. It counted `build/stripboard/`, which that fix had made
 * correct; nothing counted `os.tmpdir()`, where the same fixtures also write.
 * On 2026-10-13 `TMPDIR` held over **60,000** directories across eight prefixes
 * and the owner's disk filled. `../support/temp-scratch.ts` carries the
 * per-prefix figures and the 4,606-directory threshold at which `spawnSync` of
 * the pinned fork starts returning exit 0 with empty stdout - the failure that
 * this pipeline reports as a legitimate refusal, which is why accumulation
 * makes a measurement wrong rather than merely slow.
 *
 * **IT IS BOTH BEHAVIOURAL AND STATIC, AND IT NEEDS TO BE BOTH.** The
 * behavioural tests drive the fixtures that leaked most and prove the registry
 * removes what they made - but they can only cover the fixtures somebody
 * remembered to list here. The static tests cover the fixtures nobody will: a
 * new `mkdtemp` site that neither removes its own directory nor registers it
 * fails here, naming the file, rather than being found in a year by a full
 * disk.
 *
 * **WHY `cleanUpTempScratch`'S RETURN VALUE IS ASSERTED.** A cleanup hook that
 * silently does nothing when its registry is empty looks exactly like a
 * cleanup hook that worked. Every behavioural test below asserts the count it
 * removed as well as the absence of a survivor, so a fixture that stops
 * registering cannot pass by leaving the registry empty.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import {
  cleanUpTempScratch,
  freshTempScratch,
  registeredTempScratch,
  tempScratchMatching,
} from "../support/temp-scratch.ts"
import { derivePrefixes } from "../../tools/stripboard/prune-temp.ts"
import { fixture } from "./rules-fixtures.ts"
import { freshRunDir } from "./climb-fixtures.ts"
import { freshSearchDir } from "./search-fixtures.ts"
import { freshPassDir } from "./complete-fixtures.ts"
import { fixtureDeclaration } from "./grade-fixtures.ts"
import { roundTrip } from "./vero-export-fixtures.ts"

afterAll(cleanUpTempScratch)

const TESTS_ROOT = path.resolve(import.meta.dir, "..")

/**
 * The modules that make registered scratch, and the exports through which a
 * test file reaches it.
 *
 * Keyed by file name rather than by import path because the same module is
 * imported from more than one directory - `./grade-fixtures.ts` from
 * `tests/stripboard/` and `../stripboard/grade-fixtures.ts` from
 * `tests/perfboard/`. A module that calls `freshTempScratch` and is missing
 * from this table fails `every registering fixture module is declared here`
 * below, so the table cannot go quietly stale.
 */
const REGISTERING: Readonly<Record<string, readonly string[]>> = {
  "rules-fixtures.ts": ["fixture"],
  "exemptions-fixtures.ts": ["fixture"],
  "approvals-fixtures.ts": ["fixture"],
  "climb-fixtures.ts": ["freshRunDir"],
  "search-fixtures.ts": ["freshSearchDir"],
  "complete-fixtures.ts": ["freshPassDir"],
  "grade-fixtures.ts": ["fixtureDeclaration"],
  "vero-export-fixtures.ts": ["roundTrip"],
  "materialize-low-boost.ts": ["materialisedLowBoost"],
  "run-scratch.ts": ["freshRoot", "registerCreated", "scratchStamp", "registerStampPrefix"],
}

/**
 * The helpers that make a temp directory and HAND ITS LIFETIME TO THE CALLER,
 * with the names a caller assigns it to.
 *
 * **THESE ARE NOT LEAKS AND THEY ARE NOT ROUTED THROUGH THE REGISTRY.** Every
 * caller already removes what it was handed, in the scope that asked for it -
 * `const root = tree()` then `finally { fs.rmSync(root, ...) }` - and neither
 * prefix appeared among the 134 directories the 2026-10-13 measurement caught.
 * Registering them as well would be a second cleanup path beside a first that
 * works, which is the thing not to do. They are declared here so the site check
 * below can hold the callers to the removal instead of waving the file through.
 */
const CALLER_REMOVES: Readonly<Record<string, readonly string[]>> = {
  "perfboard-test-helpers.ts": ["tree"],
  "refresh-fixtures.ts": ["tmpCatalogDir"],
}

/**
 * The hook a test file arms, per registering module.
 *
 * `run-scratch.ts`'s users arm `cleanUpFixtures`, which calls
 * `cleanUpTempScratch` - that module keeps its own name because it also sweeps
 * run directories under `build/stripboard/`, which this registry knows nothing
 * about.
 */
const HOOK_FOR: Readonly<Record<string, string>> = { "run-scratch.ts": "cleanUpFixtures" }

function everyTestSource(dir: string): readonly string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...everyTestSource(full))
    else if (entry.name.endsWith(".ts")) out.push(full)
  }
  return out.sort()
}

const SOURCES = everyTestSource(TESTS_ROOT)

/** The names a file imports from a module with this file name, if any. */
function importedFrom(text: string, moduleFile: string): readonly string[] {
  const stem = moduleFile.replace(/\.ts$/, "")
  const pattern = new RegExp(
    String.raw`import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"[^"]*\b${stem}\.ts"`,
    "g",
  )
  const names: string[] = []
  for (const match of text.matchAll(pattern)) {
    const clause = match[1]
    if (clause === undefined) continue
    for (const part of clause.split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0]?.trim()
      if (name !== undefined && name.length > 0) names.push(name)
    }
  }
  return names
}

// ---------------------------------------------------------------- behavioural

/**
 * Each case drives one fixture whose prefix leaked, with the figure that fixture
 * contributed to the 134-per-run total measured on 2026-10-13.
 */
const CASES: readonly { readonly prefix: string; readonly leaked: number; readonly drive: () => void }[] = [
  { prefix: "stripboard-rules-", leaked: 65, drive: () => void fixture({ extra: 1 }) },
  { prefix: "stripboard-climb-", leaked: 55, drive: () => void freshRunDir() },
  { prefix: "stripboard-search-", leaked: 40, drive: () => void freshSearchDir() },
  { prefix: "stripboard-stock-", leaked: 10, drive: () => void fixtureDeclaration({}) },
  { prefix: "stripboard-complete-", leaked: 7, drive: () => void freshPassDir() },
]

for (const { prefix, leaked, drive } of CASES) {
  test(`a ${prefix} fixture leaves TMPDIR as it found it (it leaked ${leaked} a run)`, () => {
    const before = new Set(tempScratchMatching(prefix))
    drive()
    const removed = cleanUpTempScratch()
    const survivors = tempScratchMatching(prefix).filter((entry) => !before.has(entry))
    expect(
      removed,
      `${prefix}: the fixture registered nothing, so the cleanup hook did nothing and looked ` +
        "like it had worked - see ../support/temp-scratch.ts",
    ).toBeGreaterThan(0)
    expect(survivors, `${prefix}: these directories outlived the fixture`).toEqual([])
  })
}

test("the registry is empty once the hook has run, so a second call is a no-op", () => {
  freshTempScratch("temp-scratch-guard-")
  expect(registeredTempScratch()).toBe(1)
  expect(cleanUpTempScratch()).toBe(1)
  expect(registeredTempScratch()).toBe(0)
  expect(cleanUpTempScratch()).toBe(0)
})

test("a prefix that is not countable under TMPDIR refuses, naming what to pass", () => {
  expect(() => freshTempScratch("")).toThrow(/must be non-empty and end in "-"/)
  expect(() => freshTempScratch("noDash")).toThrow(/must be non-empty and end in "-"/)
  expect(() => freshTempScratch("nested/dir-")).toThrow(/may not contain a path separator/)
})

// ---------------------------------------------------------------------- static

test("every mkdtemp site under tests/ either removes its own directory or registers it", () => {
  const offenders: string[] = []
  for (const file of SOURCES) {
    if (file === path.join(TESTS_ROOT, "support", "temp-scratch.ts")) continue
    const text = fs.readFileSync(file, "utf8")
    const sites = [...text.matchAll(/mkdtempSync\(/g)].length
    if (sites === 0) continue
    const named = [...text.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*fs\.mkdtempSync\(/g)].flatMap(
      (match) => (match[1] === undefined ? [] : [match[1]]),
    )
    if (CALLER_REMOVES[path.basename(file)] !== undefined) continue
    const unremoved = named.filter((name) => !new RegExp(String.raw`rmSync\(${name}\b`).test(text))
    if (sites !== named.length) {
      offenders.push(`${path.relative(TESTS_ROOT, file)}: ${sites - named.length} unnamed site(s)`)
    }
    for (const name of unremoved) {
      offenders.push(`${path.relative(TESTS_ROOT, file)}: "${name}" is never removed`)
    }
  }
  expect(
    offenders,
    "each of these makes a directory under TMPDIR that nothing removes. Either remove it in the " +
      "scope that made it, or call freshTempScratch from ../support/temp-scratch.ts and arm " +
      "afterAll(cleanUpTempScratch) in every test file that reaches it.",
  ).toEqual([])
})

test("every test file that reaches a registering fixture arms the cleanup hook", () => {
  const offenders: string[] = []
  for (const file of SOURCES) {
    if (!file.endsWith(".test.ts")) continue
    const text = fs.readFileSync(file, "utf8")
    const armed = (hook: string): boolean =>
      new RegExp(String.raw`afterAll\(\s*(?:\(\)\s*=>\s*)?${hook}`).test(text)
    // A test file that registers scratch ITSELF is held to the same hook. Three
    // of the eight leaking prefixes were made in a `.test.ts` rather than in a
    // fixtures module, so a check that looked only at imports would have missed
    // them.
    if (/\bfreshTempScratch\(|\bregisterTempScratch\(/.test(text) && !armed("cleanUpTempScratch")) {
      offenders.push(
        `${path.relative(TESTS_ROOT, file)}: registers scratch of its own but never calls ` +
          "afterAll(cleanUpTempScratch)",
      )
    }
    for (const [moduleFile, names] of Object.entries(REGISTERING)) {
      const reached = importedFrom(text, moduleFile).filter((name) => names.includes(name))
      if (reached.length === 0) continue
      const hook = HOOK_FOR[moduleFile] ?? "cleanUpTempScratch"
      if (armed(hook)) continue
      offenders.push(
        `${path.relative(TESTS_ROOT, file)}: imports ${reached.join(", ")} from ${moduleFile} ` +
          `but never calls afterAll(${hook})`,
      )
    }
  }
  expect(
    offenders,
    "a registering fixture's directories are removed by the hook and by nothing else, so a file " +
      "that uses one and does not arm it leaks every directory it makes.",
  ).toEqual([])
})

test("every caller of a hand-it-over helper removes what it was handed", () => {
  const offenders: string[] = []
  for (const file of SOURCES) {
    const text = fs.readFileSync(file, "utf8")
    for (const [moduleFile, helpers] of Object.entries(CALLER_REMOVES)) {
      for (const helper of importedFrom(text, moduleFile).filter((n) => helpers.includes(n))) {
        const calls = [...text.matchAll(new RegExp(String.raw`(?:const|let)\s+(\w+)\s*=\s*${helper}\(`, "g"))]
        if (calls.length === 0) continue
        for (const call of calls) {
          const name = call[1]
          if (name === undefined) continue
          if (new RegExp(String.raw`rmSync\(${name}\b`).test(text)) continue
          offenders.push(
            `${path.relative(TESTS_ROOT, file)}: "${name}" came from ${helper}() and is never ` +
              "removed",
          )
        }
      }
    }
  }
  expect(
    offenders,
    "a hand-it-over helper is only correct while its callers remove what they were handed. A " +
      "caller that does not either removes it or routes the helper through the registry instead " +
      "- see CALLER_REMOVES above.",
  ).toEqual([])
})

test("make prune-temp derives every prefix the behavioural cases above drive", () => {
  // THE TWO HALVES HAVE TO AGREE OR NEITHER IS WORTH MUCH: the guard keeps the
  // suite from adding to the pile, and the prune verb clears what is already
  // there. A prefix the guard tests and the verb cannot derive is a prefix that
  // accumulates for ever, which is how 60,000 directories happened.
  const { own } = derivePrefixes(path.resolve(TESTS_ROOT, ".."))
  const missing = CASES.map(({ prefix }) => prefix).filter((prefix) => !own.includes(prefix))
  expect(missing, "make prune-temp would never remove these").toEqual([])
})

test("every registering fixture module is declared in this file's table", () => {
  const undeclared: string[] = []
  for (const file of SOURCES) {
    if (file === path.join(TESTS_ROOT, "support", "temp-scratch.ts")) continue
    const text = fs.readFileSync(file, "utf8")
    if (!/\bfreshTempScratch\(|\bregisterTempScratch\(/.test(text)) continue
    if (file.endsWith(".test.ts")) continue
    if (REGISTERING[path.basename(file)] !== undefined) continue
    undeclared.push(path.relative(TESTS_ROOT, file))
  }
  expect(
    undeclared,
    "these modules make registered scratch but are not in REGISTERING, so no test file is held " +
      "to arming the hook for them. Add the module and the exports a test reaches it through.",
  ).toEqual([])
})

test("every module the table declares does register scratch, and exports what it names", async () => {
  const wrong: string[] = []
  for (const [moduleFile, names] of Object.entries(REGISTERING)) {
    const matches = SOURCES.filter((file) => path.basename(file) === moduleFile)
    if (matches.length !== 1) {
      wrong.push(`${moduleFile}: ${matches.length} files under tests/ have that name, expected 1`)
      continue
    }
    const file = matches[0]
    if (file === undefined) continue
    const text = fs.readFileSync(file, "utf8")
    if (!/\bfreshTempScratch\(|\bregisterTempScratch\(/.test(text)) {
      wrong.push(`${moduleFile}: declared as registering, but it calls neither registry function`)
    }
    const module: Record<string, unknown> = await import(file)
    for (const name of names) {
      if (!(name in module)) wrong.push(`${moduleFile}: does not export "${name}"`)
    }
  }
  expect(
    wrong,
    "REGISTERING is the only thing holding test files to arming the hook, so a stale entry in it " +
      "is a check that passes while guarding nothing.",
  ).toEqual([])
})
