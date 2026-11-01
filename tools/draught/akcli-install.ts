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
    `no known akcli venv layout for platform "${platform}". There is deliberately no override ` +
      "to set (controller ruling R1: a second way to say where a tool lives is two places for " +
      "one fact to be wrong), so this needs a candidate adding to defaultAkcli in " +
      "tools/draught/akcli-install.ts.",
  )
}

/**
 * THE PYTHON INSIDE THAT SAME VENV, because the measurement suite's
 * numpy-and-Pillow half runs under it and under nothing else.
 *
 * **This is the final review's I-3.** `TOOLING.md`'s reproduction installs
 * `numpy` and `pillow` into this venv and says in bold why - *"`pixeldiff.py`
 * and every pixel measurement run under `venv-akcli/bin/python`"* - while
 * `draughting/install.sh` installed `akcli-kicad` alone. Measured at the time
 * the review was written: neither this venv's python nor the system `python3`
 * had numpy, so `draughting/measure/framegeom.py` - a PROMOTED member of the
 * measurement suite, and what `paper_fit.py`'s own docstring sends you to if
 * the frame geometry is ever in question - raised `ModuleNotFoundError` on the
 * machine that promoted it, covered by no test and no `make draw` step.
 *
 * **WHY A SECOND RESOLVER RATHER THAN A STRING BUILT AT EACH CALL SITE.** The
 * two pinned python libraries are now lock entries, so `./toolchain.ts`'s
 * probe has to run SOMETHING to ask them their version, and that something
 * must be this venv's interpreter rather than whatever `python3` resolves to
 * on `PATH` - the same argument `venvPipFor` already makes for pip. Deriving
 * it here, from the same `VENV_DIR_NAME` `defaultAkcli` uses, is what keeps
 * the probe, the repair command and the install script pointed at one venv.
 *
 * `python3` and not `python`: both exist in a `venv` on posix, and `python3`
 * is the name `TOOLING.md`'s own reproduction and `install.sh` use.
 */
export function defaultAkcliVenvPython(platform: string = process.platform): string {
  const venv = path.join(moduleRepoRoot(), "draughting", VENV_DIR_NAME)
  if (platform === "win32") {
    return path.join(venv, "Scripts", "python.exe")
  }
  if (platform === "darwin" || platform === "linux") {
    return path.join(venv, "bin", "python3")
  }
  throw new Error(
    `no known akcli venv layout for platform "${platform}" - tools/draught/akcli-install.ts has ` +
      "no python candidate for it, the same way it has no akcli candidate.",
  )
}
