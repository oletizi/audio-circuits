/**
 * Print a resolver's default for one name - the one thing `make/board.mk`
 * (and, from
 * `docs/superpowers/plans/2026-10-30-institutionalise-draughting.md` Tasks 2,
 * 3 and 5 onward, `make/perfboard.mk`) shells out to, so that an UNSET
 * `KICAD_CLI`, `HTML_TO_PDF`, `PDF_MERGE`, `QPDF`, `AKCLI`, `MAGICK` or
 * `COPPERHEAD_DIR` reaches the per-platform candidate list instead of a
 * macOS literal baked into a Makefile.
 *
 * `docs/known-gaps.md` **G170**: Task 10b's resolver made every TypeScript
 * default platform-aware, but `make/board.mk` kept `KICAD_CLI ?= <macOS
 * literal>` and `export`ed it unconditionally - so a Linux or Windows `make
 * check` still got the macOS path, on every one of the 21 `bun` invocations
 * that inherit it, AND on the two (`netlist-sync`, `guide`) that take it as
 * an explicit `--kicad-cli`/`--html-to-pdf` flag regardless of the
 * environment. Make cannot import TypeScript, so it cannot call
 * `defaultKicadCli()` directly - this script is the bridge, the same way
 * `tools/cli/perfboard.ts board-info --field sch` is already the bridge for
 * `$(SCH)` a few lines above `KICAD_CLI` in `make/board.mk`.
 *
 * **EXTENDED, NOT REINVENTED, for the four tools
 * `docs/superpowers/sdd/2026-10-30-institutionalise-draughting/rulings.md`'s
 * Finding 3 names: copperhead, akcli, magick and qpdf.** `qpdf` dispatches to
 * `tools/guide/pdf-merge-install.ts`'s existing `defaultQpdf` (an alias for
 * `defaultPdfMerge` - one binary, resolved once) rather than a new candidate
 * list; `akcli` and `magick` each get a new install module beside the
 * existing ones, in `tools/draught/`, in the same shape; `copperhead` has no
 * installed binary to resolve, so it names the checkout DIRECTORY
 * `tools/draught/copperhead-install.ts` installs into and expects
 * `src/cli.ts` joined onto it, not a bare executable.
 *
 *   bun tools/cli/resolved-default.ts kicad-cli
 *   bun tools/cli/resolved-default.ts html-to-pdf
 *   bun tools/cli/resolved-default.ts pdf-merge
 *   bun tools/cli/resolved-default.ts qpdf
 *   bun tools/cli/resolved-default.ts akcli
 *   bun tools/cli/resolved-default.ts magick
 *   bun tools/cli/resolved-default.ts copperhead-dir
 *
 * Only called when the Makefile variable is UNSET (`$(origin)` is
 * `undefined`) - an explicitly set override, from the environment or a
 * command line `make KICAD_CLI=...`, never reaches this script at all, which
 * is what keeps "an explicit override always wins" true.
 */
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { defaultHtmlToPdf } from "../guide/browser-install.ts"
import { defaultPdfMerge, defaultQpdf } from "../guide/pdf-merge-install.ts"
import { defaultAkcli } from "../draught/akcli-install.ts"
import { defaultCopperheadDir } from "../draught/copperhead-install.ts"
import { defaultMagick } from "../draught/magick-install.ts"

const [name] = process.argv.slice(2)

if (name === "kicad-cli") {
  console.log(defaultKicadCli())
} else if (name === "html-to-pdf") {
  console.log(defaultHtmlToPdf())
} else if (name === "pdf-merge") {
  console.log(defaultPdfMerge())
} else if (name === "qpdf") {
  console.log(defaultQpdf())
} else if (name === "akcli") {
  console.log(defaultAkcli())
} else if (name === "magick") {
  console.log(defaultMagick())
} else if (name === "copperhead-dir") {
  console.log(defaultCopperheadDir())
} else {
  throw new Error(
    `resolved-default.ts takes exactly one argument - "kicad-cli", "html-to-pdf", "pdf-merge", ` +
      `"qpdf", "akcli", "magick" or "copperhead-dir" - not ${JSON.stringify(name)}. Its callers ` +
      "are make/board.mk and make/perfboard.mk; a new name here means a new resolver has shown " +
      "up and this script needs a new branch.",
  )
}
