/**
 * `tools/schgen/port-manifest.json`'s SHAPE, its validation, and where each entry's pedals source
 * file is - everything about reading the manifest, and nothing about rewriting a file with it.
 *
 * It was split out of `tools/schgen/port.ts` at Task 6b round 2, which had grown to 617 lines
 * against `CLAUDE.md`'s 300-500 ceiling. The seam is the one the file already had: the three
 * declaration categories and their guards on this side, `rewrite()` and the porter on the other.
 * `port.ts` imports from here and is the only caller of `rewrite()`; **nothing re-exports across
 * the seam**, so there is one place to import each of these from.
 *
 * The three categories a file under a declared directory must be in exactly one of - `files`,
 * `diverged` and `handWritten` - are documented on `PortManifest` below, and
 * `tests/schgen/port-fidelity.test.ts` is what holds them to being disjoint and complete.
 */

import fs from "node:fs"
import path from "node:path"
import { isRecord, rejectUnknown } from "../../lib/schgen/strict.ts"

/**
 * A declared, auditable content deletion applied to one file's source before
 * the import rewrite runs - `text` must appear in the pedals source exactly
 * `occurrences` times, or porting refuses rather than silently cutting the
 * wrong (or an extra, coincidentally-matching) spot. This is how a port
 * carries a deliberate cut (see `docs/superpowers/plans/2026-10-19-schematic-authoring-m1.md`
 * Task 2's "what is cut, and it is a cut rather than a port") without ever
 * hand-editing the ported file itself: the cut is data, in the manifest,
 * reviewable and re-derivable, and `rewrite()` applies it the same way on
 * every run.
 */
export interface CutEntry {
  readonly text: string
  readonly occurrences: number
}

export interface ManifestFileEntry {
  readonly from: string
  readonly to: string
  /**
   * The declared source root `from` resolves against - a key of
   * `PortManifest.sourceRoots`. Omit for the default root, which is
   * `$SCHGEN_SOURCE` itself (the pedals `tools/schgen/` directory).
   *
   * See `PortManifest.sourceRoots` for why this exists and what it costs.
   */
  readonly root?: string
  /** Applied in order, before the import rewrite. Omit when the file needs none. */
  readonly cuts?: readonly CutEntry[]
}

/**
 * A file that has **deliberately stopped being a port** - it was ported once,
 * a later task changed its CONTENT for a stated reason, and it no longer
 * re-derives from the pedals source by `rewrite()` alone.
 *
 * This exists because `cuts` cannot express it. A cut is deletion-only, and
 * the changes that earn an entry here are modifications: Task 8 widens
 * `RealiseResult` from two outcomes to five across `render/block-types.ts`,
 * the seven templates and five helper modules, and deletes the `labels`
 * rendering the pedals source has (plan decision **D3**) - which the pedals
 * source will always have, so no rewrite rule can reconcile the two.
 *
 * **What it buys.** `tests/schgen/port-fidelity.test.ts` byte-checks every
 * `files[]` entry and nothing else, so without a declaration a diverged file
 * would have to leave the manifest, taking its provenance with it, and
 * nothing afterwards would record that it ever was a port or what it was a
 * port OF. An entry here keeps `from` (checked to exist in the pedals source),
 * says which task diverged it and why, and keeps the bidirectional
 * `lib/schgen/` completeness check whole: a file under `lib/schgen/` is
 * ported, hand-written **or** diverged, exactly one of the three, and an
 * undeclared hand edit to a still-ported file still fails the byte-check.
 *
 * **What it COSTS, and it is not small.** Nothing compares a diverged file
 * against its source again. A fix made upstream in `digital-pedal-platform`
 * will not arrive here by re-running the porter, and a drift between the two
 * is invisible to every check in this repository. `docs/known-gaps.md`
 * **G139** records the measured size of that loss: after Task 8 the three
 * lists are 64 ported, 26 diverged and 10 hand-written.
 *
 * **A PURE DELETION IS NOT A DIVERGENCE.** If the only content change a file
 * needs is removing text that is in the source, declare a `cuts` entry and
 * leave it in `files[]` - it stays byte-checked and re-derivable. Task 8 does
 * exactly that for `ir/validate.ts`'s one-line `labels` clause. This list is
 * for a change a cut cannot express.
 */
export interface DivergedEntry {
  /** The pedals source file this was ported from, relative to `$SCHGEN_SOURCE`. */
  readonly from: string
  readonly to: string
  /** As `ManifestFileEntry.root`. Omit for the default root (`$SCHGEN_SOURCE`). */
  readonly root?: string
  /** The task that diverged it, e.g. "Task 8". */
  readonly task: string
  /** Why it diverged: what changed and what rule or decision required it. */
  readonly why: string
  /**
   * SHA-256 of `from`'s content **as it stood when this file diverged**, lower-case hex.
   *
   * **This is the only check a diverged file gets beyond existing**, and it recovers the half of
   * the loss that matters most: a diverged file is never compared against its source again, so an
   * upstream fix or refactor in `digital-pedal-platform` is invisible here. With this,
   * `port-fidelity.test.ts` fails when the source MOVES - it cannot say whether the move matters,
   * only that a human now has to look at it and either re-reconcile the divergence or re-stamp
   * the hash with a reason.
   *
   * It is `docs/known-gaps.md` **G139**'s own weaker mechanism, taken up in review because the
   * stronger one (`replacements`, which would have returned mechanically-diverged files to the
   * byte-check) does not apply to the thirteen `lib/` files this task genuinely rewrote.
   */
  readonly sourceSha: string
}

export interface PortManifest {
  readonly sourceEnvVar: string
  /**
   * **A SECOND DECLARED SOURCE ROOT, so a `from` can name a pedals file that is not under
   * `tools/schgen/`** (Task 6b, Controller ruling R25). Root name -> a path relative to
   * `$SCHGEN_SOURCE`. An entry with no `root` resolves against `$SCHGEN_SOURCE` itself, which is
   * every entry written before this field existed.
   *
   * **Why it had to exist.** `kicadConfig.ts` imports `GlobalTable` from `@/kicad/libtable`, which
   * is `digital-pedal-platform`'s `tools/kicad/libtable.ts` - 279 lines of generic KiCad plumbing
   * that reads the install's own global library tables. `SCHGEN_SOURCE` names
   * `<pedals>/tools/schgen/`, so that file is outside every path a `files[]` entry could reach,
   * and the only alternatives were to hand-transcribe it (losing both the byte-check and the
   * provenance the whole port mechanism rests on - *"transcription is evidence, not memory"*) or
   * to leave `@/kicad/libtable` unresolved, which blocks `kicadConfig.ts`, `kicadRun.ts` and with
   * them every schematic this repository can emit. **The criterion R25 states is that no file
   * enters this repository from the pedals tree without being byte-checked against its source or
   * declared diverged with a `sourceSha`**; a declared root keeps the byte-check.
   *
   * **What it costs.** `$SCHGEN_SOURCE` was a leaf directory and is now also a waypoint: a root
   * value is a `..`-relative path out of it, so the env var's own meaning (*"the port's source
   * tree"*) is narrower than what the manifest can now read. `assertDeclaredRoots` holds the
   * escape to one step and refuses an absolute path, so a root cannot name an arbitrary directory
   * on the machine, and `docs/known-gaps.md` records the widening because every later port task
   * inherits it.
   */
  readonly sourceRoots: Readonly<Record<string, string>>
  readonly externals: Readonly<Record<string, string>>
  /**
   * Bare (non-`@/`) import specifiers rewritten verbatim, e.g. the pedals
   * test suite's `"vitest"` to this repository's `"bun:test"`. Checked
   * before the `@/schgen/` and `externals` resolution, so it never competes
   * with them; it only ever touches specifiers nothing else would resolve.
   */
  readonly moduleRenames: Readonly<Record<string, string>>
  readonly files: readonly ManifestFileEntry[]
  /**
   * Every file that was ported and has since deliberately diverged - see
   * `DivergedEntry`. The porter never writes these; `runPort()` lists them so
   * a run cannot be mistaken for having refreshed them.
   */
  readonly diverged: readonly DivergedEntry[]
  /**
   * Every hand-written (never ported) `.ts` file under `lib/schgen/` **and under
   * `tests/schgen/`**, repo-relative. `tests/schgen/port-fidelity.test.ts` asserts
   * this list plus `files[].to` plus `diverged[].to` is the *complete* set of
   * `.ts` files under BOTH directories, so a new hand-written file in either
   * must be added here deliberately, or the test fails naming it, rather than
   * silently passing as if it were ported.
   *
   * **IT COVERED `lib/schgen/` ONLY UNTIL TASK 8 ROUND 2, AND WIDENING IT DOES NOT
   * REPEAL RULING R6 - IT ANSWERS A QUESTION R6 DID NOT ASK.** R6 narrowed this
   * field in Task 4 because it carried two `tests/schgen/` entries "for
   * visibility" while three other hand-written files there were not listed: it
   * was neither a complete inventory nor no inventory, and a reader could not use
   * it as either. **That rationale is about EXISTENCE** - `bun test` discovers
   * test files by glob, so a declaration list adds nothing to finding them - and
   * existence is still not why these entries are here. They are here for
   * **PROVENANCE**, which R6's reasoning does not cover: with `diverged[]` (Task
   * 8) a file can leave `files[]` legitimately, so "is this file a port, a
   * divergence, or hand-written?" became a question the manifest must answer for
   * every file - and for the nine ported TEST files Task 8 diverged, nothing
   * answered it. Deleting one of their declarations failed no check. The list is
   * now COMPLETE over both directories, which is what R6 actually objected to its
   * not being.
   *
   * **AND NO ENTRY HERE MAY SHADOW A PEDALS SOURCE FILE.** A second
   * `port-fidelity.test.ts` assertion derives each entry's candidate pedals path
   * and fails if it exists, because relabelling a `files[]` or `diverged[]` entry
   * as hand-written would otherwise erase its provenance silently - nothing here
   * reads `$SCHGEN_SOURCE`. There is exactly one declared exception and it is in
   * that test, citing `docs/known-gaps.md` **G123**.
   */
  readonly handWritten: readonly string[]
}

const MANIFEST_PATH = path.join(import.meta.dir, "port-manifest.json")

function readString(obj: Record<string, unknown>, key: string, where: string): string {
  const value = obj[key]
  if (typeof value !== "string" || value === "") throw new Error(`${where}: "${key}" must be a non-empty string`)
  return value
}

function readStringRecord(obj: Record<string, unknown>, key: string, where: string): Record<string, string> {
  const value = obj[key]
  if (!isRecord(value)) throw new Error(`${where}: "${key}" must be an object`)
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "string") throw new Error(`${where}.${key}.${k}: must be a string`)
    out[k] = v
  }
  return out
}

function readCutEntry(value: unknown, where: string): CutEntry {
  if (!isRecord(value)) throw new Error(`${where}: each cuts[] entry must be an object`)
  rejectUnknown(value, ["text", "occurrences"], where)
  const text = readString(value, "text", where)
  const occurrences = value["occurrences"]
  if (typeof occurrences !== "number" || !Number.isInteger(occurrences) || occurrences < 1) {
    throw new Error(`${where}: "occurrences" must be a positive integer`)
  }
  return { text, occurrences }
}

/** `root`, when the entry declares one; `undefined` means the default root (`$SCHGEN_SOURCE`). */
function readOptionalRoot(value: Record<string, unknown>, where: string): string | undefined {
  const root = value["root"]
  if (root === undefined) return undefined
  if (typeof root !== "string" || root === "") throw new Error(`${where}: "root" must be a non-empty string`)
  return root
}

function readFileEntry(value: unknown, where: string): ManifestFileEntry {
  if (!isRecord(value)) throw new Error(`${where}: each files[] entry must be an object`)
  rejectUnknown(value, ["from", "to", "root", "cuts"], where)
  const root = readOptionalRoot(value, where)
  const base = { from: readString(value, "from", where), to: readString(value, "to", where) }
  const withRoot = root === undefined ? base : { ...base, root }
  const cutsValue = value["cuts"]
  if (cutsValue === undefined) return withRoot
  if (!Array.isArray(cutsValue)) throw new Error(`${where}: "cuts" must be an array`)
  return { ...withRoot, cuts: cutsValue.map((c, i) => readCutEntry(c, `${where}.cuts[${i}]`)) }
}

function readDivergedEntry(value: unknown, where: string): DivergedEntry {
  if (!isRecord(value)) throw new Error(`${where}: each diverged[] entry must be an object`)
  rejectUnknown(value, ["from", "to", "root", "task", "why", "sourceSha"], where)
  const root = readOptionalRoot(value, where)
  const sourceSha = readString(value, "sourceSha", where)
  if (!/^[0-9a-f]{64}$/.test(sourceSha)) {
    throw new Error(
      `${where}: "sourceSha" must be 64 lower-case hex digits (SHA-256 of the pedals source as it ` +
        `stood when this file diverged); got "${sourceSha}". Compute it with ` +
        "`shasum -a 256 \"$SCHGEN_SOURCE/<from>\"` rather than guessing.",
    )
  }
  const base = {
    from: readString(value, "from", where),
    to: readString(value, "to", where),
    task: readString(value, "task", where),
    why: readString(value, "why", where),
    sourceSha,
  }
  return root === undefined ? base : { ...base, root }
}

function readStringArray(obj: Record<string, unknown>, key: string, where: string): string[] {
  const value = obj[key]
  if (!Array.isArray(value)) throw new Error(`${where}: "${key}" must be an array`)
  return value.map((v, i) => {
    if (typeof v !== "string" || v === "") throw new Error(`${where}.${key}[${i}]: must be a non-empty string`)
    return v
  })
}

/**
 * Every declared root is a relative path that leaves `$SCHGEN_SOURCE` by at most one directory,
 * and every `root` an entry names is declared.
 *
 * The bound is the point. A root is how a `from` reaches outside the port's own source tree, so
 * without one `sourceRoots` would be an arbitrary read of the machine's filesystem written in a
 * manifest. One `..` reaches `<pedals>/tools/`, which is what `tools/kicad/libtable.ts` needs and
 * is as far as any sibling of `tools/schgen/` can be. A deeper escape, or an absolute path, is a
 * different claim and refuses here rather than being allowed quietly.
 */
function assertDeclaredRoots(m: PortManifest): void {
  for (const [name, rel] of Object.entries(m.sourceRoots)) {
    const where = `${MANIFEST_PATH}.sourceRoots.${name}`
    if (path.isAbsolute(rel)) {
      throw new Error(`${where}: "${rel}" is absolute; a source root is relative to $${m.sourceEnvVar}`)
    }
    const normalised = path.normalize(rel)
    const up = normalised.split(path.sep).filter((s) => s === "..").length
    if (up > 1 || normalised.split(path.sep).some((s, i) => s === ".." && i > 0)) {
      throw new Error(
        `${where}: "${rel}" leaves $${m.sourceEnvVar} by more than one directory. A declared root ` +
          "reaches a SIBLING of the pedals tools/schgen/ directory and no further; anything deeper " +
          "is a different claim about what this manifest may read and needs its own decision.",
      )
    }
  }
  const undeclared = [...m.files, ...m.diverged]
    .flatMap((e) => (e.root === undefined || Object.hasOwn(m.sourceRoots, e.root) ? [] : [`${e.from} -> root "${e.root}"`]))
    .sort()
  if (undeclared.length > 0) {
    throw new Error(
      `${MANIFEST_PATH}: these entries name a source root that "sourceRoots" does not declare: ` +
        `${undeclared.join(", ")}. Declare the root, or drop the field to use $${m.sourceEnvVar} itself.`,
    )
  }
}

export function loadManifest(): PortManifest {
  const parsed: unknown = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"))
  if (!isRecord(parsed)) throw new Error(`${MANIFEST_PATH}: expected a JSON object at the top level`)
  rejectUnknown(
    parsed,
    ["sourceEnvVar", "sourceRoots", "externals", "moduleRenames", "files", "diverged", "handWritten"],
    MANIFEST_PATH,
  )
  const filesValue = parsed["files"]
  if (!Array.isArray(filesValue)) throw new Error(`${MANIFEST_PATH}: "files" must be an array`)
  const divergedValue = parsed["diverged"]
  if (!Array.isArray(divergedValue)) throw new Error(`${MANIFEST_PATH}: "diverged" must be an array`)
  const manifest: PortManifest = {
    sourceEnvVar: readString(parsed, "sourceEnvVar", MANIFEST_PATH),
    sourceRoots: readStringRecord(parsed, "sourceRoots", MANIFEST_PATH),
    externals: readStringRecord(parsed, "externals", MANIFEST_PATH),
    moduleRenames: readStringRecord(parsed, "moduleRenames", MANIFEST_PATH),
    files: filesValue.map((entry, i) => readFileEntry(entry, `${MANIFEST_PATH}.files[${i}]`)),
    diverged: divergedValue.map((entry, i) => readDivergedEntry(entry, `${MANIFEST_PATH}.diverged[${i}]`)),
    handWritten: readStringArray(parsed, "handWritten", MANIFEST_PATH),
  }
  assertDeclaredRoots(manifest)
  return manifest
}

/**
 * Where one entry's pedals source file is, given `$SCHGEN_SOURCE`.
 *
 * **Every reader of a pedals source path goes through this**, so the porter and
 * `tests/schgen/port-fidelity.test.ts` cannot disagree about where a declared root points - which
 * they would if each joined paths itself and only one of them knew about `root`.
 */
export function sourcePathFor(
  sourceRoot: string,
  entry: { readonly from: string; readonly root?: string },
  manifest: PortManifest,
): string {
  const base = resolveRootDir(sourceRoot, entry, manifest)
  const resolved = path.resolve(base, entry.from)
  assertInside(resolved, base, sourceRoot, entry)
  return resolved
}

function resolveRootDir(
  sourceRoot: string,
  entry: { readonly from: string; readonly root?: string },
  manifest: PortManifest,
): string {
  if (entry.root === undefined) return path.resolve(sourceRoot)
  const rel = manifest.sourceRoots[entry.root]
  if (rel === undefined) {
    throw new Error(
      `${entry.from}: names source root "${entry.root}", which tools/schgen/port-manifest.json does ` +
        "not declare in \"sourceRoots\". loadManifest() refuses this, so reaching here means an " +
        "entry was built by hand rather than read from the manifest.",
    )
  }
  return path.resolve(sourceRoot, rel)
}

/**
 * **`from` IS HELD TO ITS ROOT, not only the root to `$SCHGEN_SOURCE`.**
 *
 * `assertDeclaredRoots` bounds how far a declared ROOT may reach, and its refusal says a root
 * *"reaches a SIBLING of the pedals tools/schgen/ directory and no further"* - which a reader
 * takes as a bound on the whole path. It was not: `from` had no bound at all, so
 * `{ from: "../../../../../../etc/hosts" }` with no `root` resolved outside the pedals tree
 * entirely and `loadManifest` accepted it. The default root always had that hole; this closes it
 * for every entry, so the message and the behaviour now agree.
 */
function assertInside(
  resolved: string,
  base: string,
  sourceRoot: string,
  entry: { readonly from: string; readonly root?: string },
): void {
  const rel = path.relative(base, resolved)
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `${entry.from}: resolves to ${resolved}, which is outside its source root ${base}. A manifest ` +
        `entry's "from" is a path WITHIN $SCHGEN_SOURCE (${sourceRoot})` +
        (entry.root === undefined ? "" : ` as redirected by its declared root "${entry.root}"`) +
        ", never a way out of it. Declare a source root if the file genuinely lives elsewhere in " +
        "the pedals tree; `sourceRoots` is bounded to one directory up, and that bound exists so " +
        "this manifest cannot name an arbitrary file on the machine.",
    )
  }
}
