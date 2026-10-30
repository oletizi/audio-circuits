/**
 * Print `lib/kicad/install.ts`'s or `tools/guide/browser-install.ts`'s
 * resolved default for one name - the one thing `make/board.mk` shells out
 * to, so that an UNSET `KICAD_CLI` or `HTML_TO_PDF` reaches the per-platform
 * candidate list instead of a macOS literal baked into the Makefile.
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
 *   bun tools/cli/resolved-default.ts kicad-cli
 *   bun tools/cli/resolved-default.ts html-to-pdf
 *   bun tools/cli/resolved-default.ts pdf-merge
 *
 * Only called when the Makefile variable is UNSET (`$(origin)` is
 * `undefined`) - an explicitly set `KICAD_CLI`/`HTML_TO_PDF`/`PDF_MERGE`, from the
 * environment or a command line `make KICAD_CLI=...`, never reaches this
 * script at all, which is what keeps "an explicit override always wins"
 * true.
 */
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { defaultHtmlToPdf } from "../guide/browser-install.ts"
import { defaultPdfMerge } from "../guide/pdf-merge-install.ts"

const [name] = process.argv.slice(2)

if (name === "kicad-cli") {
  console.log(defaultKicadCli())
} else if (name === "html-to-pdf") {
  console.log(defaultHtmlToPdf())
} else if (name === "pdf-merge") {
  console.log(defaultPdfMerge())
} else {
  throw new Error(
    `resolved-default.ts takes exactly one argument, "kicad-cli", "html-to-pdf" or "pdf-merge", ` +
      `not ${JSON.stringify(name)}. make/board.mk is this script's only caller; a fourth name ` +
      "means a fourth resolver has shown up and this script needs a fourth branch.",
  )
}
