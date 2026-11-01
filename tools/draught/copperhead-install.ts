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
 * time.
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
