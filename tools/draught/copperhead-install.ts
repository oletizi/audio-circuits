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
 * copperhead is invoked as `npx tsx src/cli.ts --version` from inside its
 * checkout (`TOOLING.md`), so the resolved value here is the CHECKOUT
 * DIRECTORY, and `./toolchain.ts` joins `src/cli.ts` onto it rather than
 * changing the probe subprocess's working directory - `tsx` accepts an
 * absolute script path.
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
