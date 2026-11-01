/**
 * Where the akcli-kicad console script lives, for `tools/draught/toolchain.ts`'s
 * probe and for `draughting/install.sh` (Task 3 of
 * `docs/superpowers/plans/2026-10-30-institutionalise-draughting.md`) to
 * install into.
 *
 * **akcli IS A PIP PACKAGE'S CONSOLE SCRIPT, NOT A SYSTEM INSTALLER'S
 * BINARY, AND THAT MAKES ITS DEFAULT UNLIKE `kicad-cli`'s, `magick`'s OR
 * `qpdf`'s.** There is no `.app` bundle or distro package to measure a
 * candidate path from - `TOOLING.md`'s reproduction steps create a venv
 * (`python3 -m venv venv-akcli`) wherever you happen to be standing, and its
 * own text says the two committed `run.sh` scripts already disagree about
 * where that venv is. So the candidate here is not "where akcli's installer
 * puts it" but "where this repository's own install script is expected to
 * put it": the venv at `draughting/venv-akcli`, a sibling of
 * `draughting/tools.lock.json` and `draughting/install.sh`, resolved from the
 * repository root the way `tools/perfboard/repo-root.ts` resolves it for
 * `.tools/` - never from `process.cwd()`.
 *
 * **THIS IS AN ASSUMPTION, RECORDED RATHER THAN ENGINEERED AROUND**, the same
 * way `./copperhead-install.ts`'s is: Task 1 does not write
 * `draughting/install.sh` - Task 3 does - so this default names the location
 * Task 3 is expected to install into rather than one it has confirmed. If
 * Task 3 chooses a different venv location, this is the one function to
 * change.
 *
 * The platform split is real here, unlike copperhead's single directory:
 * a venv's console scripts land at `bin/<name>` on darwin and linux and at
 * `Scripts\<name>.exe` on win32 - `venv`'s own documented layout, not a guess
 * about akcli specifically.
 */
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import path from "node:path"

const VENV_DIR_NAME = "venv-akcli"

/**
 * A best-effort akcli path for `platform`, never checked for existence here -
 * `./toolchain.ts`'s `checkToolchain` reports `found: null` rather than
 * throwing when nothing is there yet.
 *
 * An unrecognised platform throws by name rather than silently handing it the
 * posix layout.
 */
export function defaultAkcli(platform: string = process.platform): string {
  // `path.join` (not `path.win32`/`path.posix`) deliberately: `moduleRepoRoot()`
  // always returns THIS HOST's real path flavour, so joining with the same
  // default module keeps every segment in one flavour. A `platform` other
  // than the host's own is therefore only ever an approximation - the same
  // limitation `./copperhead-install.ts`'s single candidate accepts, for the
  // same reason: this default names a location inside THIS checkout, not a
  // system install path a cross-platform candidate list would describe.
  const venv = path.join(moduleRepoRoot(), "draughting", VENV_DIR_NAME)
  if (platform === "win32") {
    return path.join(venv, "Scripts", "akcli.exe")
  }
  if (platform === "darwin" || platform === "linux") {
    return path.join(venv, "bin", "akcli")
  }
  throw new Error(
    `no known akcli venv layout for platform "${platform}". Set AKCLI to your own akcli ` +
      "binary's path - tools/draught/akcli-install.ts has no candidate for this platform.",
  )
}
