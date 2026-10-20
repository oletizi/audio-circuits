import { test, expect } from "bun:test"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { rewrite } from "../../tools/schgen/port.ts"
import { loadManifest, sourcePathFor } from "../../tools/schgen/port-manifest.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/**
 * Every file `tools/schgen/port-manifest.json` lists is the pedals source
 * file, rewritten only by `rewrite()` - never hand-edited afterwards. A hand
 * edit smuggled into a ported file makes this fail, naming the file.
 *
 * `SCHGEN_SOURCE` must point at `digital-pedal-platform`'s `tools/schgen/`
 * directory. This test FAILS rather than skips when it is unset: a fidelity
 * check that silently skips looks like a passing one, which `CLAUDE.md` and
 * this repository's own conventions both name as the failure to avoid.
 */
function requireSourceRoot(): string {
  const sourceRoot = process.env["SCHGEN_SOURCE"]
  if (sourceRoot === undefined || sourceRoot === "") {
    throw new Error(
      "SCHGEN_SOURCE is not set. It must point at digital-pedal-platform's tools/schgen/ " +
        "directory so this test can compare every ported file against its source - " +
        "nothing here defaults to a guessed path.",
    )
  }
  return sourceRoot
}

test("every ported file is its source, rewritten only by the manifest", () => {
  const sourceRoot = requireSourceRoot()
  const manifest = loadManifest()
  const repoRoot = moduleRepoRoot()

  expect(manifest.files.length).toBeGreaterThan(0)

  for (const entry of manifest.files) {
    const source = fs.readFileSync(sourcePathFor(sourceRoot, entry, manifest), "utf8")
    const ported = fs.readFileSync(path.join(repoRoot, entry.to), "utf8")
    expect(rewrite(source, entry, manifest), entry.to).toBe(ported)
  }
})

/**
 * **A DECLARED SOURCE ROOT IS A REAL DIRECTORY, AND IT IS USED** (Task 6b, ruling R25).
 *
 * `sourceRoots` is how a `files[]` entry reaches a pedals file outside `$SCHGEN_SOURCE` -
 * `tools/kicad/libtable.ts`, which `kicadConfig.ts` needs for `GlobalTable`. Two claims, both of
 * which can fail. **The root resolves:** each declared root is a directory on disk, so a typo in
 * one fails here naming the root rather than surfacing as "no such file" from whichever entry
 * happened to use it first. **No root is decorative:** a declared root that no entry names is an
 * unused widening of what this manifest may read, and widening it is the thing R25 bounded, so it
 * fails rather than sitting there.
 */
test("every declared source root is a directory on disk and is used by an entry", () => {
  const sourceRoot = requireSourceRoot()
  const manifest = loadManifest()
  const declared = Object.entries(manifest.sourceRoots)
  expect(declared.length, "an empty sourceRoots is a check that cannot fail").toBeGreaterThan(0)
  const notADirectory = declared
    .filter(([, rel]) => !fs.existsSync(path.join(sourceRoot, rel)) || !fs.statSync(path.join(sourceRoot, rel)).isDirectory())
    .map(([name, rel]) => `${name} -> ${rel}`)
    .sort()
  expect(
    notADirectory,
    "these declared source roots do not resolve to a directory under $SCHGEN_SOURCE",
  ).toEqual([])
  const used = new Set([...manifest.files, ...manifest.diverged].flatMap((e) => (e.root === undefined ? [] : [e.root])))
  const unused = declared.map(([name]) => name).filter((name) => !used.has(name)).sort()
  expect(
    unused,
    "these source roots are declared and no entry names them. A root widens what this manifest " +
      "may read outside the port's own source tree, so an unused one is a widening nobody needs.",
  ).toEqual([])
})

/**
 * The fixture symbol libraries the ported tests read are NOT `.ts`, so
 * `port.ts` does not rewrite them and the test above never sees them - they
 * are copied verbatim from the pedals source by hand (Task 4). This is the
 * check that keeps a transcription honest: a hand-edited or drifted copy
 * changes what every fixture-backed assertion in `tests/schgen/` measures,
 * silently, and `CLAUDE.md`'s rule is that a transcription checked only
 * against itself is one nobody verified.
 */
const COPIED_FIXTURES: readonly { readonly from: string; readonly to: string }[] = [
  { from: "__fixtures__/symbols/Fix.kicad_sym", to: "tests/schgen/__fixtures__/symbols/Fix.kicad_sym" },
  { from: "__fixtures__/symbols/Pwr.kicad_sym", to: "tests/schgen/__fixtures__/symbols/Pwr.kicad_sym" },
  // Task 11: the THIRD fixture library, which Task 4 did not copy because nothing then needed it.
  // `generate`'s `designResolver` always adds the `power` nickname (`FLAG_NICK`, for
  // `power:PWR_FLAG`) to the stock set, so ANY test that calls `generate` with `stockDir` pointed
  // at this directory refuses without it - `tests/schgen/verify.test.ts` is the first that does.
  //
  // IT IS BYTE-IDENTICAL TO Pwr.kicad_sym, in the pedals source and therefore here: both hold the
  // same GND / +3V3 / PWR_FLAG set, under two filenames. That is not redundancy to tidy away -
  // `designResolver` resolves a nickname by looking for `<nickname>.kicad_sym` in `stockDir`, so
  // the same content has to exist under both names for `Pwr:GND` (what the ported fixtures
  // declare) and `power:PWR_FLAG` (what `generate` always adds) to resolve in one directory.
  { from: "__fixtures__/symbols/power.kicad_sym", to: "tests/schgen/__fixtures__/symbols/power.kicad_sym" },
  // Task 11: the datasheet pin table gate 6 compares the `mini` fixture's MPN-overridden op-amp
  // against. The ported `mini/index.ts` names it (`pinTables: "../../pintables"`) and
  // `tests/schgen/gates/pin-table.test.ts` asserts its contents, so a drifted copy changes what
  // both measure. It is `.json`, so `port.ts` never rewrites it and the byte-check above cannot
  // see it either.
  { from: "__fixtures__/pintables/OPA1688.json", to: "tests/schgen/__fixtures__/pintables/OPA1688.json" },
]

test("every copied (non-.ts) fixture is byte-identical to its pedals source", () => {
  const sourceRoot = requireSourceRoot()
  const repoRoot = moduleRepoRoot()
  expect(COPIED_FIXTURES.length, "a list nothing iterates is a check that cannot fail")
    .toBeGreaterThan(0)
  for (const { from, to } of COPIED_FIXTURES) {
    const source = fs.readFileSync(path.join(sourceRoot, from), "utf8")
    const copied = fs.readFileSync(path.join(repoRoot, to), "utf8")
    expect(copied, `${to} has drifted from ${from}; re-copy it rather than editing it here`)
      .toBe(source)
  }
})

/**
 * `handWritten` MEANS `lib/schgen/`, and this is where that is enforced
 * (Controller ruling R6, Task 4).
 *
 * Two claims, both of which can fail. **Existence:** an entry naming a path
 * that is not on disk fails here, whatever directory it names. The
 * completeness test below cannot catch that for a path outside `lib/schgen/`,
 * because it filters such entries out of both arms, and the comment that
 * claimed `bun test` would catch it was simply wrong - a missing test file is
 * one the glob never discovers, so the suite reports fewer tests and stays
 * green. **Scope:** the field names the directories the completeness check
 * below enumerates, and no others - `lib/schgen/`, `tests/schgen/` and, since
 * Task 6b round 2, `tools/schgen/`, which four ported files now land in. It
 * once carried two `tests/schgen/` entries "for visibility" while three other
 * hand-written files there were not listed, which was neither a complete
 * inventory nor no inventory at all; the rule since R6 is that a root is
 * either enumerated completely or not at all.
 */
test("every handWritten entry is under a declared root and is on disk", () => {
  const manifest = loadManifest()
  const repoRoot = moduleRepoRoot()
  expect(manifest.handWritten.length, "an empty handWritten list is a check that cannot fail")
    .toBeGreaterThan(0)
  const DECLARED_ROOTS = ["lib/schgen/", "tests/schgen/", "tools/schgen/"]
  const outsideScope = manifest.handWritten.filter((p) => !DECLARED_ROOTS.some((r) => p.startsWith(r))).sort()
  const missing = manifest.handWritten.filter((p) => !fs.existsSync(path.join(repoRoot, p))).sort()
  expect(
    outsideScope,
    `handWritten declares hand-written files under ${DECLARED_ROOTS.join(", ")} and nothing ` +
      "else. Remove these, or change the rule in PortManifest.handWritten, here, and in " +
      "DECLARED_DIRS below - all three state the same scope, and Task 6b widened it to " +
      "tools/schgen/ because four ported files now land there.",
  ).toEqual([])
  expect(
    missing,
    "these handWritten paths are not on disk. A typo here is otherwise invisible: bun test never " +
      "discovers a file it cannot find, so the suite stays green with fewer tests.",
  ).toEqual([])
})

/**
 * **A DIVERGED FILE IS DECLARED, AND THE DECLARATION IS CHECKED** (Task 8,
 * Controller ruling R18).
 *
 * `diverged[]` holds the files that were ported and have since deliberately
 * changed content - Task 8's five-outcome `RealiseResult` across
 * `render/block-types.ts`, the seven templates and five helper modules, and
 * the `labels` rendering plan decision D3 deletes although the pedals source
 * has it. `rewrite()` cannot reconcile those, and `cuts` cannot either: a cut
 * is deletion-only and these are modifications.
 *
 * Three claims, each of which can fail. **The source is real:** `from` must
 * exist under `$SCHGEN_SOURCE`, so the provenance an entry claims is checked
 * rather than asserted - a typo or an entry for a file the pedals project
 * never had fails here. **The file is real:** `to` must be on disk.
 * **The reason is given:** `task` and `why` are non-empty, so no file
 * diverges without saying which task did it and why.
 *
 * What this does NOT buy is the byte-check. A diverged file is compared
 * against nothing, ever again; `docs/known-gaps.md` **G139** records how much
 * of the tree that is.
 */
test("every diverged entry names a real pedals source, a file on disk, and its reason", () => {
  const sourceRoot = requireSourceRoot()
  const manifest = loadManifest()
  const repoRoot = moduleRepoRoot()
  expect(manifest.diverged.length, "an empty diverged list is a check that cannot fail").toBeGreaterThan(0)
  expect(new Set(manifest.diverged.map((d) => d.from)).size, "two entries claiming one source").toBe(manifest.diverged.length)
  const missingSource = manifest.diverged.filter((d) => !fs.existsSync(sourcePathFor(sourceRoot, d, manifest))).map((d) => d.from).sort()
  const missingFile = manifest.diverged.filter((d) => !fs.existsSync(path.join(repoRoot, d.to))).map((d) => d.to).sort()
  const unexplained = manifest.diverged.filter((d) => d.task.trim() === "" || d.why.trim() === "").map((d) => d.to).sort()
  expect(
    missingSource,
    "these diverged entries name a pedals source file that is not under $SCHGEN_SOURCE. An entry " +
      "whose `from` is wrong records provenance nobody can follow back.",
  ).toEqual([])
  expect(missingFile, "these diverged paths are not on disk").toEqual([])
  expect(unexplained, "a diverged file must say which task diverged it and why").toEqual([])
})

/**
 * **AND THE SOURCE HAS NOT MOVED SINCE IT DIVERGED.**
 *
 * This is the only check a diverged file gets beyond existing, and it recovers the half of
 * **G139**'s loss that is otherwise total: nothing compares a diverged file against its source
 * again, so an upstream fix or refactor in `digital-pedal-platform` is invisible here. A
 * `sourceSha` is SHA-256 of the pedals file as it stood when the divergence was declared, so when
 * the source MOVES this fails naming the file. It cannot say whether the move matters - only that
 * a human has to look and either re-reconcile the divergence or re-stamp the hash with a reason.
 *
 * **It is NOT a byte-check and must not be read as one.** It says nothing about this repository's
 * copy, which may drift freely; it watches the other end of the line. Added in Task 8's review as
 * **G139**'s own weaker mechanism, because the stronger one (`replacements`) does not apply to the
 * thirteen `lib/` files Task 8 genuinely rewrote.
 */
test("every diverged file's pedals source is unchanged since it diverged", () => {
  const sourceRoot = requireSourceRoot()
  const manifest = loadManifest()
  expect(manifest.diverged.length, "an empty diverged list is a check that cannot fail").toBeGreaterThan(0)
  const moved: string[] = []
  for (const d of manifest.diverged) {
    const sha = crypto.createHash("sha256").update(fs.readFileSync(sourcePathFor(sourceRoot, d, manifest))).digest("hex")
    if (sha !== d.sourceSha) moved.push(`${d.from}: declared ${d.sourceSha}, source is now ${sha}`)
  }
  expect(
    moved,
    "the pedals source of these diverged files has changed since they diverged. Nothing here can " +
      "tell whether the change matters: read the upstream diff, decide whether this repository's " +
      "copy should take it, and then re-stamp sourceSha in the same change with the reason.",
  ).toEqual([])
})

/**
 * **A HAND-WRITTEN FILE MAY NOT SHADOW A PEDALS SOURCE FILE**, which closes the second silent
 * path out of the manifest: relabelling a `files[]` or `diverged[]` entry as `handWritten`.
 * Nothing in `handWritten` reads `$SCHGEN_SOURCE`, so a relabelled entry would lose its `from`,
 * its reason and (for a divergence) its `sourceSha`, and no check would notice.
 *
 * The candidate pedals path is derived mechanically - drop the `lib/schgen/` or `tests/schgen/`
 * prefix, and try both the kebab-case name and its camelCase form, which is the only rename the
 * port performs. That is an over-approximation of the port's own mapping and deliberately so: it
 * is cheap and it errs toward refusing.
 *
 * **ONE DECLARED EXCEPTION, and it is a recorded one.**
 * `tests/schgen/render/symbol-self-text.test.ts` does shadow
 * `render/symbolSelfText.test.ts`: that test is import-clean and still cannot be ported, because
 * its fixture leaks a `mkdtemp` directory that the repository's temp-scratch guard refuses and a
 * `cuts` entry cannot add cleanup. `docs/known-gaps.md` **G123** carries the evidence, the
 * mechanisms ruled out, and the residual - that this hand-written transcription is byte-checked
 * against nothing. The exception is listed here rather than in the manifest so that adding one
 * means editing a test and saying why.
 */
const SHADOWS_A_PEDALS_FILE_BY_DECISION: Readonly<Record<string, string>> = {
  "tests/schgen/render/symbol-self-text.test.ts":
    "G123: render/symbolSelfText.test.ts is import-clean but its fixture leaks a mkdtemp directory, " +
    "which tests/stripboard/temp-scratch.test.ts refuses and a cuts entry cannot fix. This is a " +
    "hand-written transcription of it, and G123 records that nothing byte-checks it.",
  // A FORWARD DECLARATION ALWAYS SHADOWS ITS OWN FUTURE PORT, which is a shape this guard was
  // written after the last one had already been replaced and so had never met. Task 6b, ruling
  // R26: `lib/schgen/design.ts` imports `Subcircuit` as a type from
  // `@/schgen/gates/oscar/boundary`, whose real module needs `gates/oscar/graph.ts` and through it
  // `@/kicad/components` - Task 18's. The hand-written file carries the types `design.ts` needs
  // plus an `oscarParts` that throws naming Task 18, and Task 18 replaces it wholesale. The
  // shadowing is the POINT of the pattern rather than a lost provenance, and it expires when that
  // port lands and this entry is deleted with it.
  "lib/schgen/gates/oscar/boundary.ts":
    "R26 (Task 6b): a hand-written forward declaration for Task 18's gates/oscar/boundary.ts, " +
    "which cannot port until @/kicad/components resolves. It carries NetRef, DeltaEdit, SideSpec " +
    "and Subcircuit's five fields, and an oscarParts that throws naming Task 18. Task 18 replaces " +
    "the file wholesale and deletes this exemption. See docs/known-gaps.md.",
}

test("no hand-written file shadows a pedals source file", () => {
  const sourceRoot = requireSourceRoot()
  const manifest = loadManifest()
  const camel = (s: string): string => s.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())
  const shadowing: string[] = []
  for (const p of manifest.handWritten) {
    const rel = p.replace(/^lib\/schgen\//, "").replace(/^tests\/schgen\//, "")
    const candidates = [...new Set([rel, camel(rel), path.posix.join(path.posix.dirname(rel), camel(path.posix.basename(rel)))])]
    const hits = candidates.filter((c) => fs.existsSync(path.join(sourceRoot, c)))
    if (hits.length > 0 && SHADOWS_A_PEDALS_FILE_BY_DECISION[p] === undefined) shadowing.push(`${p} shadows ${hits.join(", ")}`)
  }
  expect(
    shadowing,
    "these are declared hand-written and the pedals source has a counterpart. Either they are " +
      "ports and belong in files[] or diverged[] with their provenance, or the shadowing is " +
      "deliberate and belongs in SHADOWS_A_PEDALS_FILE_BY_DECISION with a register entry.",
  ).toEqual([])
  // The exemption list is held to being live: an entry for a file that no longer shadows anything
  // is an exemption nobody can see expire.
  const stale = Object.keys(SHADOWS_A_PEDALS_FILE_BY_DECISION).filter((p) => !manifest.handWritten.includes(p))
  expect(stale, "these are exempted from shadowing but are not declared hand-written any more").toEqual([])
})

/**
 * **EXACTLY ONE CATEGORY EACH.** A file that is in two of `files[]`,
 * `diverged[]` and `handWritten` is a file whose status cannot be read off
 * the manifest: the byte-check would iterate it while the divergence record
 * says it is not a port any more, and whichever a reader consulted first
 * would be the answer they got.
 */
test("no file is in two of files[], diverged[] and handWritten", () => {
  const manifest = loadManifest()
  const ported = new Set(manifest.files.map((f) => f.to))
  const diverged = new Set(manifest.diverged.map((d) => d.to))
  const hand = new Set(manifest.handWritten)
  const bothPortedAndDiverged = [...diverged].filter((p) => ported.has(p)).sort()
  const bothDivergedAndHand = [...diverged].filter((p) => hand.has(p)).sort()
  const bothPortedAndHand = [...hand].filter((p) => ported.has(p)).sort()
  expect(bothPortedAndDiverged, "in files[] and diverged[]: it cannot both re-derive and not").toEqual([])
  expect(bothDivergedAndHand, "in diverged[] and handWritten: it was either ported once or never").toEqual([])
  expect(bothPortedAndHand, "in files[] and handWritten").toEqual([])
})

/** Every `.ts` file under `dir`, repo-relative, posix-separated. */
function listTsFiles(repoRoot: string, dir: string): string[] {
  const out: string[] = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) {
      out.push(...listTsFiles(repoRoot, full))
    } else if (name.endsWith(".ts")) {
      out.push(path.relative(repoRoot, full).split(path.sep).join("/"))
    }
  }
  return out
}

/**
 * The manifest's `files[].to` entries that land under `lib/schgen/`, plus
 * the `handWritten` entries that do too, must be the *complete* set of
 * `.ts` files under `lib/schgen/` - not just a subset the manifest happens
 * to mention. Without this, a file that is hand-written or hand-patched
 * without a manifest or allowlist entry is invisible to the test above
 * (which only iterates `manifest.files`), so "every ported file is its
 * source" stays green while a file under `lib/schgen/` silently is not.
 *
 * **SINCE TASK 8's REVIEW IT COVERS `tests/schgen/` TOO, and that is the half
 * that was missing rather than a flourish.** The check used to filter every
 * non-`lib/schgen/` path out of **both** arms, on the reasoning that a ported
 * test's `files[].to` is a different claim (that *this* destination holds
 * exactly the rewritten source) which the first test in this file checks. True
 * - but it left a hole that `diverged[]` opened: **deleting the `diverged`
 * declaration of a ported TEST file failed no check at all.** Nothing imports
 * a test file, so the typecheck is silent; `bun test` finds it by glob and
 * runs it; it was filtered out of both arms here; and `handWritten` could not
 * hold it. Nine of Task 8's 26 divergences are ported test files, and
 * `docs/known-gaps.md` **G139** flags those nine as the costliest - so the one
 * clause of ruling R18 that is enforced over the directory rather than over
 * the manifest did not reach them.
 *
 * Both directories are now listed, both arms union all three categories, and a
 * deleted declaration in either turns this red naming the file. The earlier
 * comment's claim that a non-`lib/schgen/` entry was covered "by `bun test`
 * simply failing to find the file" was false in both directions and is gone.
 */
const DECLARED_DIRS = ["lib/schgen", "tests/schgen", "tools/schgen"] as const

/**
 * **THE PORTED FILES THAT LAND IN A DIRECTORY NOBODY ENUMERATES, pinned** (Task 6b round 2).
 *
 * The completeness check below makes a declaration undeletable for a directory it lists: delete a
 * `files[]` entry and the file becomes unaccounted-for on disk. **For a destination outside every
 * listed directory that property is lost** - the byte-check iterates the manifest, the directory
 * listing never sees the file, and `handWritten` may not name it either - so deleting the entry
 * would quietly stop the file being checked at all. That is precisely the hole Task 8's review
 * closed for `tests/schgen/`, and Task 6b reopened it in two new places.
 *
 * `tools/schgen` is now a DECLARED_DIR, which covers four of the six. These two are the
 * remainder: one file each in a directory whose other contents have nothing to do with the port
 * (`lib/kicad/` holds sixteen hand-written modules) so enumerating the directory would mean
 * declaring all of them. Pinning the two names here is the same mechanism in miniature, with
 * teeth in both directions: an entry deleted from the manifest fails, and a new outside
 * destination fails until it is listed. `docs/known-gaps.md` **G161**.
 */
const PORTED_OUTSIDE_DECLARED_DIRS: readonly string[] = [
  "lib/kicad/footprint.ts",
  "lib/kicad/libtable.ts",
  "tools/repo.ts",
]

test("every ported destination outside the declared directories is pinned here", () => {
  const manifest = loadManifest()
  const repoRoot = moduleRepoRoot()
  const outside = [...manifest.files, ...manifest.diverged]
    .map((e) => e.to)
    .filter((to) => !DECLARED_DIRS.some((d) => to.startsWith(`${d}/`)))
    .sort()
  expect(
    outside,
    "a ported file in a directory the completeness check does not list is one whose manifest entry " +
      "can be deleted without any test failing. Add the directory to DECLARED_DIRS (and declare its " +
      "hand-written files), or pin the destination in PORTED_OUTSIDE_DECLARED_DIRS with a reason.",
  ).toEqual([...PORTED_OUTSIDE_DECLARED_DIRS].sort())
  const missing = PORTED_OUTSIDE_DECLARED_DIRS.filter((p) => !fs.existsSync(path.join(repoRoot, p))).sort()
  expect(missing, "pinned here and not on disk").toEqual([])
})

/**
 * **A manifest entry may not read outside its own source root** (Task 6b round 2).
 *
 * `assertDeclaredRoots` bounds a declared ROOT and says so in its refusal; until this was added
 * nothing bounded `from`, so an entry with no `root` at all could name
 * `../../../../../../etc/hosts` and `loadManifest` accepted it. The guard's message claimed a
 * bound on the whole path that only held for half of it. `docs/known-gaps.md` **G161**.
 */
/**
 * **AN `externals` TARGET THAT DOES NOT EXPORT WHAT A PORTED FILE TAKES FROM IT REFUSES AT PORT
 * TIME** - `docs/known-gaps.md` **G121** clause (a), closed by Task 11 with that entry's own
 * suggested mechanism.
 *
 * The gap: `resolveSpecifier` checks `externals` before the `@/schgen/` lookup, so once a
 * specifier is mapped, a file importing a name the target does not have stops getting a refusal
 * from the porter and gets a `tsc` error at a line in a generated file instead. G121 measured
 * exactly that for `@/kicad/netlist`, whose pedals counterpart exports `connectivityFromXml` and
 * whose target here does not.
 *
 * **THE CASE BELOW IS A REAL PEDALS FILE, NOT A CONSTRUCTED ONE.** `gates/connectivity.ts` in the
 * pedals tree imports `type { Connectivity } from "@/kicad/netlist"`; that is why Task 11 declared
 * this repository's copy DIVERGED instead of porting it, and it is the one file G121's prediction
 * was about. The second case is the positive direction, so the check cannot pass by refusing
 * everything.
 */
test("a ported file importing a name an externals target does not export is refused, naming both", () => {
  const sourceRoot = requireSourceRoot()
  const manifest = loadManifest()
  const entry = { from: "gates/connectivity.ts", to: "lib/schgen/gates/connectivity.ts" }
  const source = fs.readFileSync(sourcePathFor(sourceRoot, entry, manifest), "utf8")
  expect(source, "the pedals source no longer imports the name this case is about").toContain(
    'from "@/kicad/netlist"',
  )
  expect(() => rewrite(source, entry, manifest)).toThrow(
    /imports "Connectivity" from "@\/kicad\/netlist".*lib\/kicad\/netlist\.ts exports no such name/s,
  )
  // The positive direction: a file whose externals imports all resolve is rewritten, not refused.
  const ok = { from: "gates/pinIdentity.ts", to: "lib/schgen/gates/pin-identity.ts" }
  const okSource = fs.readFileSync(sourcePathFor(sourceRoot, ok, manifest), "utf8")
  expect(okSource).toContain('from "@/kicad/footprint"')
  expect(rewrite(okSource, ok, manifest)).toContain("padNumbers")
})

test("a from that escapes its source root is refused, whether or not it declares one", () => {
  const sourceRoot = requireSourceRoot()
  const manifest = loadManifest()
  const escape = "../../../../../../etc/hosts"
  expect(() => sourcePathFor(sourceRoot, { from: escape }, manifest)).toThrow(/outside its source root/)
  expect(() => sourcePathFor(sourceRoot, { from: escape, root: "pedals-tools" }, manifest)).toThrow(
    /outside its source root/,
  )
  // And the two shapes that must still resolve, so the guard is not simply refusing everything.
  expect(sourcePathFor(sourceRoot, { from: "render/emit.ts" }, manifest)).toBe(
    path.join(sourceRoot, "render/emit.ts"),
  )
  expect(sourcePathFor(sourceRoot, { from: "kicad/libtable.ts", root: "pedals-tools" }, manifest)).toBe(
    path.resolve(sourceRoot, "..", "kicad/libtable.ts"),
  )
})

test("every .ts file under lib/schgen/, tests/schgen/ and tools/schgen/ is ported, diverged, or declared hand-written", () => {
  const manifest = loadManifest()
  const repoRoot = moduleRepoRoot()
  expect(DECLARED_DIRS.length, "a directory list nothing iterates is a check that cannot fail").toBe(3)
  for (const dir of DECLARED_DIRS) {
    const onDisk = new Set(listTsFiles(repoRoot, path.join(repoRoot, dir)))
    expect(onDisk.size, `no .ts files found under ${dir}/, so this iteration proves nothing`).toBeGreaterThan(0)
    const under = (p: string): boolean => p.startsWith(`${dir}/`)
    const accountedFor = new Set([
      ...manifest.files.map((f) => f.to).filter(under),
      ...manifest.diverged.map((d) => d.to).filter(under),
      ...manifest.handWritten.filter(under),
    ])

    const unaccountedOnDisk = [...onDisk].filter((f) => !accountedFor.has(f)).sort()
    const accountedButMissing = [...accountedFor].filter((f) => !onDisk.has(f)).sort()

    expect(unaccountedOnDisk, `on disk under ${dir}/ but in none of files[], diverged[] or handWritten`).toEqual([])
    expect(accountedButMissing, `in files[], diverged[] or handWritten but not on disk under ${dir}/`).toEqual([])
  }
})
