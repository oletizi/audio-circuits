/**
 * The one way to build the base `--materialize` starts from, and the words a
 * caller gets back when it tries to skip naming one.
 *
 * **THE RULE, decided by the controller 2026-10-16 after the owner declined
 * the question** (*"re materialize — I don't care"*): a materialisation
 * starts from a base built fresh by `--import` from the circuit.
 * `boards/<board>/<board>.perfboard.vrt` is adoption's OUTPUT and is never its
 * input.
 *
 * **WHY, in the order that matters most first.**
 *
 *   1. Starting from the committed file would make every materialisation
 *      inherit whatever incidental footprint state that file was last left
 *      in - which is the root of the span defect `--materialize`'s span step
 *      was written to close. Fixing the span while keeping that file as the
 *      input would leave the same class of drift alive behind the fix.
 *   2. A step that writes the file it also reads is a loop in which
 *      yesterday's accident becomes today's input.
 *   3. It makes the materialised board a pure function of the circuit and the
 *      candidate - reproducible, and comparable by content, which is what
 *      this repository already demands of a derived artifact.
 *
 * **WHAT THIS COSTS, stated rather than discovered.** Anything in the
 * committed `.vrt` that `--import` cannot produce from the circuit is lost at
 * the first adoption. The one known instance was net names, and it is now
 * PAID rather than carried: `--import` wrote every `NODE` as `NAME -` where
 * the committed layout carried the real ones, and the pinned fork now stores
 * each net's name as it mints that net's nodeId from the netlist
 * (`Board::BuildFromParsedNetlist`), so a base built here arrives named and a
 * board materialised from it keeps those names. The names are the circuit's
 * own, by the only route that could make them so - the netlist this function
 * imports. **Finding a second thing reopens this ruling**; it is not a gap to
 * carry across quietly.
 *
 * **THIS MODULE DOES NOT CHOOSE THE BASE FOR A CALLER.** `freshImportBase`
 * builds one when handed a netlist; nothing here reads `boards/` or defaults
 * to a path inside it. `./vero-export.ts`'s `materialize` refuses outright
 * when `base` is not named, and `noBaseNamedRefusal` is that refusal's text -
 * kept here, beside the rule it states, rather than inlined at the one call
 * site that currently reads it.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { SpawnVeroroute } from "./seed.ts"

function refuse(key: string, detail: string): never {
  throw new Error(`${key}: ${detail}`)
}

/**
 * The message `materialize` throws when `base` is the empty string - which is
 * how a caller spells "I have no base to name" without inventing a sentinel
 * path that would read as a real one.
 */
export function noBaseNamedRefusal(): string {
  return (
    "materialize names no base board, and refuses to guess one. Two candidates exist and both " +
    "are wrong by default: the board's already-committed `.vrt` is adoption's OUTPUT and never " +
    "materialisation's input - starting there would make this materialisation inherit whatever " +
    "incidental footprint state that file was last left at - and a base built fresh by " +
    "`--import` from the circuit (this module's own `freshImportBase`) is specific to this call, " +
    "with no single path to default to.\nPass `base` as the path to a board `freshImportBase` " +
    "built from this circuit's own netlist; the committed `.vrt` is never it."
  )
}

/** What `freshImportBase` needs: a netlist to import, and where the board it builds should land. */
export interface FreshBaseInput {
  /** The circuit's own netlist text, in the format `--import` reads. */
  readonly netlist: string
  /**
   * Where the fresh base lands. Never a path under `boards/` - this module
   * builds materialisation's INPUT, and a board under `boards/` is this
   * pipeline's OUTPUT.
   */
  readonly outPath: string
}

/**
 * Build a base fresh by `--import` from a netlist, or refuse.
 *
 * The netlist is written to a temp file beside no permanent artifact - the
 * directory is removed whether `--import` succeeds or not - because the
 * netlist text itself is not the thing this function promises to produce.
 */
export function freshImportBase(input: FreshBaseInput, spawn: SpawnVeroroute): string {
  const netDir = fs.mkdtempSync(path.join(os.tmpdir(), "vero-export-fresh-base-"))
  try {
    const netPath = path.join(netDir, `${path.basename(input.outPath, ".vrt")}.net`)
    fs.writeFileSync(netPath, input.netlist)
    fs.mkdirSync(path.dirname(input.outPath), { recursive: true })
    const run = spawn(["--import", netPath, "-o", input.outPath])
    if (run.status !== 0) {
      refuse(
        "vero-export-fresh-base-refused",
        `veroroute --import ${netPath} -o ${input.outPath} exited ${run.status}, so no fresh ` +
          `base was built from the circuit.\n${run.stderr}${run.stdout}\nThe fork's message above ` +
          "names what it could not do; it is passed through rather than re-worded.",
      )
    }
    // NO PATH THROUGH THE CURRENT FORK REACHES THIS, AND IT STAYS ANYWAY.
    // `Headless::SaveBoard` (`Headless.cpp:158-174`) opens the output file,
    // writes, and only then checks `GetOK()`; `RunImport`
    // (`Headless_commands.cpp:160-225`) returns 0 only once `Close()` and that
    // check have both passed. So "exited 0 and wrote nothing" has no route
    // through this build, and no test fakes one - contorting a mock to reach an
    // unreachable branch would prove nothing about the fork.
    //
    // It is kept because the claim it refuses is about the CONTRACT, not about
    // this build: a verb reporting success and writing nothing is a silent
    // false success, which is the failure this whole module exists to refuse.
    // The guard above it is the one with teeth today - `--import` killed after
    // it has already created the file, which `tests/stripboard/
    // materialize-base.test.ts` reaches with a zero file-size limit, and which
    // returns a garbage path with NO error at all when that guard is removed.
    if (!fs.existsSync(input.outPath)) {
      refuse(
        "vero-export-fresh-base-not-written",
        `veroroute --import exited 0 and ${input.outPath} does not exist. A verb that reports ` +
          "success and writes nothing must not be read as having built a base.",
      )
    }
    return input.outPath
  } finally {
    fs.rmSync(netDir, { recursive: true, force: true })
  }
}
