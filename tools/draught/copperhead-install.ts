/**
 * Where the copperhead checkout lives, for `tools/draught/toolchain.ts`'s
 * probe and for `draughting/install.sh` (Task 3 of
 * `docs/superpowers/plans/2026-10-30-institutionalise-draughting.md`) to
 * install into.
 *
 * **COPPERHEAD IS NOT A SYSTEM BINARY, AND THAT MAKES ITS DEFAULT UNLIKE
 * `kicad-cli`'s, `magick`'s OR `qpdf`'s.** There is no installer and no
 * package manager entry to measure a candidate path from - `TOOLING.md`'s
 * reproduction steps are `git clone`, `git checkout <pinned commit>`,
 * `npm install`, into whatever directory you happen to be standing in, and
 * that directory has so far been an agent session's scratchpad
 * (`docs/superpowers/specs/2026-10-30-institutionalise-draughting-design.md`,
 * "Neither tool is pinned"). So there is exactly ONE candidate here, not a
 * per-platform list: `draughting/copperhead`, a sibling of
 * `draughting/tools.lock.json` and `draughting/install.sh`, resolved from the
 * repository root the same way `tools/perfboard/repo-root.ts` resolves it for
 * `.tools/` - never from `process.cwd()`, which would answer a different
 * question depending on where a command was run from.
 *
 * **THIS IS AN ASSUMPTION, RECORDED RATHER THAN ENGINEERED AROUND, LIKE
 * `tools/perfboard/repo-root.ts`'s OWN ONE.** Task 1 of the plan above does
 * not write `draughting/install.sh` - Task 3 does - so this default names the
 * location Task 3 is expected to install into rather than one it has
 * confirmed. If Task 3 chooses a different location, this is the one function
 * to change; nothing else in `./toolchain.ts` hardcodes the path a second
 * time - `howToFix`'s copperhead branch calls this function for its `git
 * clone` target rather than repeating the literal, which is exactly the
 * G170 shape: a fix-round review (task-1-review.md, Important 1) caught a
 * version of this file where that claim was false, because `howToFix` had
 * written `draughting/copperhead` out by hand instead.
 *
 * **DELIBERATELY NOT A PER-PLATFORM CANDIDATE LIST, NOT AN OMISSION OF
 * ONE.** `./akcli-install.ts` and `./magick-install.ts` both branch on three
 * platforms because each resolves an OS-level install path that genuinely
 * differs by platform. This function does not, because what it resolves is
 * a location INSIDE this checkout - the same value on darwin, linux or
 * win32, since it is built from `moduleRepoRoot()` plus two literal path
 * segments rather than from any platform-specific installer convention.
 * `G169` clause b's "three platforms" requirement is about an OS install
 * path; it does not apply to a project-relative directory any platform
 * computes identically, so there is nothing here for a `platform` parameter
 * to branch on.
 *
 * copperhead's CLI is a TypeScript entry point run under `tsx`
 * (`TOOLING.md`), so the resolved value here is the CHECKOUT DIRECTORY, and
 * `./toolchain.ts` joins `src/cli.ts` onto it rather than changing the probe
 * subprocess's working directory - `tsx` accepts an absolute script path.
 * `defaultCopperheadTsx` below resolves the `tsx` that runs it.
 */
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import path from "node:path"

/**
 * A best-effort copperhead checkout directory, never checked for existence
 * here - `./toolchain.ts`'s `checkToolchain` reports `found: null` rather
 * than throwing when nothing is there yet.
 */
export function defaultCopperheadDir(): string {
  return path.join(moduleRepoRoot(), "draughting", "copperhead")
}

/**
 * THE `tsx` THAT RUNS COPPERHEAD'S CLI: THE ONE `npm ci` INSTALLED INSIDE
 * THE CHECKOUT, NEVER `npx`'s PICK.
 *
 * **This is the final review's I-5, and the measurement is the whole
 * argument.** `npx tsx` resolves `tsx` from `node_modules/.bin` walking up
 * from the CURRENT WORKING DIRECTORY, and falls back to npm's `_npx` cache or
 * the registry. Measured on this machine, with the absolute `src/cli.ts`
 * argument IDENTICAL in both runs and `cwd` the only variable:
 *
 *     cwd = repository root        npx tsx --version -> 4.23.15   (_npx cache)
 *     cwd = draughting/copperhead  npx tsx --version -> 4.23.1    (the checkout's own)
 *
 * 4.23.1 is what copperhead's `package-lock.json` names and what `npm ci`
 * installs; its `package.json` asks for `^4.19.3`, so the three versions
 * 4.23.15, 4.23.1 and 4.19.3 were all resolvable here at once. `npx
 * --offline tsx --version` against an empty npm cache fails `ENOTCACHED`, so
 * a clean machine's first `make draught-doctor` or `make draw` FETCHED AN
 * UNPINNED tsx OVER THE NETWORK - under a lock whose whole purpose is that
 * it does not.
 *
 * **THE REVIEW'S STATED CAUSE WAS HALF WRONG AND THE CORRECTION MATTERS.**
 * It read the cause as passing an absolute `src/cli.ts` path with no `cwd`.
 * The absolute path is not causal: `npx` resolves the COMMAND before `tsx`
 * ever sees its arguments, and the measurement above holds the argument
 * fixed while only `cwd` moves. Removing the absolute path and leaving `cwd`
 * unset would therefore have changed nothing - the path is what makes
 * running from outside the checkout possible, not what breaks the pin.
 *
 * Resolving the binary directly is better than setting `cwd` on each
 * subprocess, not merely equivalent: it is independent of where anything is
 * run from, so there is no per-call-site option to forget, and it keeps the
 * deliberate property that nothing here changes a working directory. A
 * checkout whose `npm ci` has never run has no such binary, `execFileSync`
 * fails, and `./toolchain.ts`'s probe reports `found: null` - which is the
 * truth about that checkout, and `howToFix`'s repair command ends in `npm
 * ci`.
 *
 * **THE win32 ENTRY IS UNVERIFIED**, declared the way `./magick-install.ts`
 * declares its own unexercised candidates rather than left out: npm writes
 * `node_modules\.bin\tsx.cmd` there, and a `.cmd` is not directly
 * executable through `execFileSync` without a shell. Nothing on this
 * platform has been driven; if copperhead is ever run on Windows this is the
 * one function to measure.
 */
export function defaultCopperheadTsx(platform: string = process.platform): string {
  const binDir = path.join(defaultCopperheadDir(), "node_modules", ".bin")
  if (platform === "win32") return path.join(binDir, "tsx.cmd")
  return path.join(binDir, "tsx")
}
