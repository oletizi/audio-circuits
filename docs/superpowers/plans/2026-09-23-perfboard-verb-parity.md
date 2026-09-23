# Perfboard Verb Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the `perfboard` CLI to parity with the make layer it was ported from, so Task 9 of the previous plan can actually execute.

**Architecture:** Four verbs currently ship as explicit refusals (`cuts`, `update`, `stripboard`, `edit`) plus `veroroute`, because each needs the forked VeroRoute binary. This plan wires them up, on top of a shared mutation prerequisite — a recoverability guard and an atomic replace — that the spec makes mandatory for anything that writes a layout.

**Tech Stack:** TypeScript, Bun (`bun test`), no runtime dependencies. An external GPLv3 Qt binary acquired at a pinned commit.

**Spec:** `docs/superpowers/specs/2026-09-21-pt2399-core-perfboard-port-design.md`

## Why this plan exists

The previous plan's self-review deferred the dirty-state guard and the atomic replace to "when those verbs are wired up" — and then no task wired them up, while its Task 9 step 7 ran `perfboard update` twice. The final whole-branch review caught that. This plan closes it.

## Global Constraints

- **Imports are explicit relative paths with the `.ts` extension.** Never a path alias.
- **No fallbacks, no mock data outside tests.** Every unhandled case throws or exits non-zero naming what is missing. A verb that silently does nothing is the failure shape this workflow exists to prevent.
- **Refusals must teach.** Name the thing, the observed state, and the fix. `lib/kicad/import-string.ts` is the standard to match.
- **Never bypass typing.** No `any`, no `as Type`, no `@ts-ignore`. Use narrowing predicates; `tools/perfboard/guards.ts` shows the pattern.
- **Files stay under 300–500 lines.** `tools/cli/perfboard.ts` is ~200 and will grow; split by responsibility if it passes 300.
- **`bun test` green and `bun run typecheck` clean before every commit.** Baseline is **363 pass, 0 fail**.
- **Report actual test counts. Never reshape tests to hit a number.**
- **No AI attribution in commit messages**, ever — no `Co-Authored-By`, no `Claude-Session:`, no session links. The branch's history was rewritten once already to remove these.
- **No test may require the real binary.** Every binary interaction is injected.

## The binary's surface, as established

```
--check <vrt> --netlist <net>                    exit 0 clean, 1 not, else throw
--update <vrt> --netlist <net> -o <out>          -o is MANDATORY, no in-place mode
--set-strips <vrt> --strips <horizontal|vertical> -o <out>
--dump-board <vrt>                               CUT_STATE / CUT / CUT_CONFLICT / SOLDER / CUT_UNCONNECTED_PIN
--adopt                                          one-time migration for pre-version-60 boards
```

The fork saves nothing on any failure path, and writes through a plain `QDataStream` over a `QFile` rather than a `QSaveFile` — so the atomic replace is this repository's responsibility.

## File Structure

| File | Responsibility |
| --- | --- |
| `tools/perfboard/mutate.ts` | **Create.** The shared mutation prerequisite: recoverability guard + atomic replace. |
| `tools/perfboard/verbs.ts` | **Create.** `cuts`, `update`, `stripboard`, `edit` as testable functions with injected spawn. |
| `tools/perfboard/acquire.ts` | **Create.** Read `veroroute.pin`, clone and build the fork, resolve the binary path. |
| `tools/cli/perfboard.ts` | **Modify.** Replace the five refusal branches with real dispatch; add `--allow-dirty` and the strip-direction argument. |
| `veroroute.pin` | **Create.** The pinned fork commit. |
| `.gitignore` | **Modify.** Ignore `.tools/`. |

---

### Task 1: The mutation prerequisite — guard and atomic replace

Everything that writes a layout goes through this. Implemented and tested once, so a mutating verb added later cannot quietly omit it.

**Files:**
- Create: `tools/perfboard/mutate.ts`
- Test: `tests/perfboard/mutate.test.ts`

**Interfaces:**
- Consumes: `node:fs`, `node:path`, `node:child_process` (for `git`).
- Produces:
  - `assertLayoutRecoverable(vrtPath: string, opts: { allowDirty: boolean; git?: GitRunner }): void`
  - `replaceAtomically(vrtPath: string, producedPath: string): void`
  - `type GitRunner = (args: readonly string[], cwd: string) => { status: number | null; stdout: string }`

- [ ] **Step 1: Write the failing tests**

Create `tests/perfboard/mutate.test.ts`:

```ts
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { assertLayoutRecoverable, replaceAtomically } from "../../tools/perfboard/mutate.ts"
import type { GitRunner } from "../../tools/perfboard/mutate.ts"

/** git stub: `tracked` decides ls-files, `dirty` decides diff --quiet. */
function stubGit(tracked: boolean, dirty: boolean): GitRunner {
  return (args) => {
    if (args[0] === "ls-files") return { status: tracked ? 0 : 1, stdout: "" }
    if (args[0] === "diff") return { status: dirty ? 1 : 0, stdout: "" }
    throw new Error(`unexpected git call: ${args.join(" ")}`)
  }
}

test("a committed, unmodified layout passes", () => {
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(true, false) }))
    .not.toThrow()
})

test("an untracked layout refuses, saying git has never seen it", () => {
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(false, false) }))
    .toThrow(/x\.vrt[\s\S]*not tracked[\s\S]*never seen/)
})

test("a modified layout refuses differently, naming the state it cannot reach", () => {
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(true, true) }))
    .toThrow(/x\.vrt[\s\S]*uncommitted changes/)
})

test("the two refusals are different messages, not one message for both mistakes", () => {
  let untracked = ""
  let modified = ""
  try { assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(false, false) }) }
  catch (e) { untracked = e instanceof Error ? e.message : String(e) }
  try { assertLayoutRecoverable("/b/x.vrt", { allowDirty: false, git: stubGit(true, true) }) }
  catch (e) { modified = e instanceof Error ? e.message : String(e) }
  expect(untracked).not.toBe(modified)
  expect(untracked.length).toBeGreaterThan(0)
  expect(modified.length).toBeGreaterThan(0)
})

test("--allow-dirty suppresses both refusals", () => {
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: true, git: stubGit(false, false) }))
    .not.toThrow()
  expect(() => assertLayoutRecoverable("/b/x.vrt", { allowDirty: true, git: stubGit(true, true) }))
    .not.toThrow()
})

test("the replace is atomic and lands the produced bytes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mutate-"))
  try {
    const vrt = path.join(dir, "board.vrt")
    const produced = path.join(dir, "board.produced.vrt")
    fs.writeFileSync(vrt, "OLD")
    fs.writeFileSync(produced, "NEW")
    replaceAtomically(vrt, produced)
    expect(fs.readFileSync(vrt, "utf8")).toBe("NEW")
    expect(fs.existsSync(produced)).toBe(false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("a replace across filesystems refuses rather than falling back to a copy", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mutate-"))
  try {
    const vrt = path.join(dir, "board.vrt")
    fs.writeFileSync(vrt, "OLD")
    expect(() => replaceAtomically(vrt, "/definitely/not/here.vrt")).toThrow(/here\.vrt/)
    expect(fs.readFileSync(vrt, "utf8")).toBe("OLD")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/perfboard/mutate.test.ts`
Expected: FAIL — `Cannot find module '../../tools/perfboard/mutate.ts'`

- [ ] **Step 3: Implement**

Create `tools/perfboard/mutate.ts`:

```ts
/**
 * The shared prerequisite of every verb that writes a layout.
 *
 * Stated once rather than per verb, so a mutating verb added later cannot
 * quietly omit it. Two things have to hold before a layout is overwritten:
 * git can bring it back, and the write cannot leave a half-file behind.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

/** Just the slice of git this module needs, so tests can pass one. */
export type GitRunner = (
  args: readonly string[],
  cwd: string,
) => { status: number | null; stdout: string }

function runGit(args: readonly string[], cwd: string): { status: number | null; stdout: string } {
  const result = spawnSync("git", [...args], { cwd, encoding: "utf8" })
  if (result.error) {
    throw new Error(`could not run git: ${result.error.message}`)
  }
  return { status: result.status, stdout: typeof result.stdout === "string" ? result.stdout : "" }
}

export interface RecoverableOptions {
  /** The operator's explicit statement that this run cannot be undone. */
  readonly allowDirty: boolean
  readonly git?: GitRunner
}

/**
 * Refuse to overwrite a layout git could not bring back.
 *
 * TWO WAYS THE UNDO IS ALREADY BROKEN, and they are different mistakes with
 * different fixes, so they get different messages. A layout git has never seen
 * cannot be restored at all. A tracked layout with uncommitted changes can be
 * restored, but only to a state that is not the one the operator is looking at.
 */
export function assertLayoutRecoverable(vrtPath: string, opts: RecoverableOptions): void {
  if (opts.allowDirty) return
  const git = opts.git ?? runGit
  const dir = path.dirname(vrtPath)

  if (git(["ls-files", "--error-unmatch", "--", vrtPath], dir).status !== 0) {
    throw new Error(
      `${vrtPath} is not tracked by git.\n` +
        "This verb rewrites the layout IN PLACE and git is the way back, and there is no " +
        "way back to a file git has never seen. Commit it first, or pass --allow-dirty to " +
        "accept that this run cannot be undone.",
    )
  }

  if (git(["diff", "--quiet", "--", vrtPath], dir).status !== 0) {
    throw new Error(
      `${vrtPath} has uncommitted changes.\n` +
        "This verb rewrites the layout IN PLACE and git is the way back, so it refuses " +
        "while the way back would not reach the state you are in now. Commit the layout " +
        "first, or pass --allow-dirty to accept that these changes are not recoverable.",
    )
  }
}

/**
 * Put `producedPath` in place of `vrtPath`, atomically.
 *
 * The fork requires `-o` and has no in-place mode, and it writes through a
 * plain QDataStream rather than a QSaveFile, so the atomicity is ours to
 * provide. `rename` within one directory is atomic, so the layout is either
 * the old one or the new one and never a half-written file.
 *
 * A rename that fails is NOT followed by a copy. A copy is not atomic, and
 * falling back to one would quietly remove the guarantee this function exists
 * to give.
 */
export function replaceAtomically(vrtPath: string, producedPath: string): void {
  if (!fs.existsSync(producedPath)) {
    throw new Error(
      `${producedPath}: the binary reported success but produced no output file. ` +
        `${vrtPath} is unchanged.`,
    )
  }
  try {
    fs.renameSync(producedPath, vrtPath)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `could not put ${producedPath} in place of ${vrtPath}: ${detail}. ` +
        `${vrtPath} is unchanged. The produced layout is still at ${producedPath}.`,
    )
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/perfboard/mutate.test.ts` then `bun test` and `bun run typecheck`
Expected: 7 new tests pass; full suite green.

- [ ] **Step 5: Verify the guard has teeth by mutation**

In a throwaway copy under `/tmp` (`cp -r`, never the working repo), change `assertLayoutRecoverable`'s early `if (opts.allowDirty) return` to `return` unconditionally. Confirm the untracked and modified tests fail. Discard the copy. Record what you did in your report.

- [ ] **Step 6: Commit**

```bash
git add tools/perfboard/mutate.ts tests/perfboard/mutate.test.ts
git commit -F <message file>
```

---

### Task 2: The binary-backed verbs

**Files:**
- Create: `tools/perfboard/verbs.ts`
- Test: `tests/perfboard/verbs.test.ts`

**Interfaces:**
- Consumes: `assertLayoutRecoverable`, `replaceAtomically` (Task 1); `PerfboardDeclaration`; the netlist export path already inside `tools/perfboard/check.ts`.
- Produces, each returning a report string and each taking an injected spawn:
  - `runCuts(declaration, deps): string`
  - `runUpdate(declaration, opts: { allowDirty: boolean }, deps): Promise<string>`
  - `runStripboard(declaration, opts: { strips: "horizontal" | "vertical"; allowDirty: boolean }, deps): Promise<string>`
  - `runEdit(declaration, deps): string`

- [ ] **Step 1: Write the failing tests**

Cover, with an injected spawn so no test needs the binary:

1. `cuts` reports the `CUT`/`SOLDER` lines from a dump.
2. **A dump with no `CUT_STATE` line REFUSES**, saying the tool no longer understands `--dump-board` output. This is the load-bearing one: printing an empty list would read as "no cuts needed".
3. `CUT_STATE NOT_APPLICABLE` reports isolated-hole mode and names `stripboard`, rather than printing an empty list.
4. `update` calls the guard before spawning — assert the spawn never happens when the guard throws.
5. `update` passes `-o` with a path in the SAME DIRECTORY as the layout, and replaces atomically only after exit 0.
6. `update` on a non-zero exit leaves the layout byte-identical and does not replace.
7. `stripboard` refuses without a strip direction.
8. `stripboard` runs `--set-strips`, replaces, then runs the update path with `allowDirty: true` — assert the second call receives it, since the first write made the layout dirty.
9. `edit` refuses when the binary is not executable, naming the `veroroute` verb.

- [ ] **Step 2: Run to verify they fail**
- [ ] **Step 3: Implement `tools/perfboard/verbs.ts`**

Follow the spec's "What each binary-backed verb actually does". Every spawn goes through an injected function with the same shape `tools/perfboard/check.ts` already uses. Reuse `check.ts`'s netlist export rather than duplicating it — extract it if it is not already exported.

- [ ] **Step 4: Run tests, full suite, typecheck**
- [ ] **Step 5: Commit**

---

### Task 3: Fork acquisition

**Files:**
- Create: `tools/perfboard/acquire.ts`, `veroroute.pin`
- Modify: `.gitignore`
- Test: `tests/perfboard/acquire.test.ts`

**Interfaces:**
- Produces: `readPin(file: string): { repo: string; commit: string }`, `resolveBinary(env, repoRoot): { path: string; mode: "acquired" | "explicit" }`, `acquire(pin, opts): string`

- [ ] **Step 1: Write the failing tests**

1. `veroroute.pin` parses to repo and commit; a malformed pin refuses naming the file and the missing field.
2. `VEROROUTE` set to something other than the built path yields mode `"explicit"` and acquisition is NOT attempted — that checkout is the operator's.
3. `VEROROUTE` unset yields mode `"acquired"` pointing at the path under `.tools/` this repo is responsible for creating.
4. `VEROROUTE` set but empty refuses — an empty value can only come from something setting it to nothing.
5. Acquisition refuses to report success if the expected binary does not exist afterward.

- [ ] **Step 2: Run to verify they fail**

- [ ] **Step 3: Create `veroroute.pin`**

```
repo    git@github.com:oletizi/veroroute-perfboard.git
commit  b09727d8ee0eb2a062da74b530b637436296330c
```

- [ ] **Step 4: Implement, and add `.tools/` to `.gitignore`**

Clone and build are shelled out and injected so tests never build Qt. The build is macOS/Qt5 (`qmake` then `make`); document the prerequisite in the refusal when the build fails.

- [ ] **Step 5: Run tests, full suite, typecheck**
- [ ] **Step 6: Commit**

---

### Task 4: Wire the verbs into the CLI

**Files:**
- Modify: `tools/cli/perfboard.ts`
- Test: `tests/cli/perfboard.test.ts`

- [ ] **Step 1: Write the failing tests**

1. Each of the five verbs dispatches to its implementation instead of refusing — assert via injected deps, not by running a binary.
2. `--allow-dirty` reaches `update` and `stripboard`.
3. `stripboard` without a direction exits 1 naming the choice and why there is no default.
4. An invalid strip direction exits 1 listing the two valid values.
5. A mutating verb run outside a board directory exits 1 — these act on one declared board, never a batch.
6. **`--help` lists every verb as available**, with no "not wired up yet" text remaining anywhere.

- [ ] **Step 2: Run to verify they fail**
- [ ] **Step 3: Replace the refusal branches with real dispatch**

Delete the deferred-verb branch entirely. Argument parsing gains `--allow-dirty` and a strip direction; keep rejecting unknown flags.

- [ ] **Step 4: Run tests, full suite, typecheck**

- [ ] **Step 5: Verify by hand**

```bash
bun run perfboard --help
bun run perfboard update
bun run perfboard stripboard
```

The last two must refuse for the right reason — no declared board here, and no strip direction — not because they are unimplemented.

- [ ] **Step 6: Update the previous plan's Task 9**

In `docs/superpowers/plans/2026-09-22-perfboard-workflow-port.md`, remove the Self-Review paragraph deferring the guard and atomic replace, and note that the verbs are live. Task 9 then executes as written.

- [ ] **Step 7: Commit**

## Self-Review

**Spec coverage.** Guard and its `--allow-dirty` escape hatch → Task 1; atomic replace → Task 1; the four binary-backed verb contracts → Task 2; acquisition and the explicit-`VEROROUTE` rule → Task 3; CLI surface and help → Task 4.

**What this plan does NOT cover, deliberately.** `--adopt` (the one-time migration for pre-version-60 boards) is not wired up. The spec records it as a risk to confirm at acceptance, and whether this board needs it is unknown until the binary reads it — building a verb for a migration that may not apply would be speculative. If acceptance shows the layout is pre-60, that is a small follow-up. Likewise `--stretch`, `--import` and `--dump-netlist`: the make layer this was ported from exposes `set-strips` as a general non-declared form, but nothing in this repository's workflow needs the others.

**Type consistency.** `GitRunner`, `PerfboardDeclaration`, and the injected spawn shape from `check.ts` are used unchanged throughout. The verb functions all take `(declaration, opts, deps)` in that order.

**Test counts.** Baseline 363. Expect roughly +7 (Task 1), +9 (Task 2), +5 (Task 3), +6 (Task 4). These are sanity checks, not targets.
