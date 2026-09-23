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
 *
 * `--allow-dirty` (opts.allowDirty) is not a convenience toggle - it is the
 * operator explicitly accepting that this run cannot be undone. It exists
 * because `stripboard` needs it: that verb converts a layout to strip mode and
 * then immediately fills the strips through the update path, so its own first
 * write leaves the layout dirty and the second write would otherwise be
 * refused by the very guard the first write just satisfied.
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
