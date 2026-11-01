/**
 * `make draw`'s intent-resolution and drafting stage - split out of
 * `tools/cli/draw.ts` in Task 5 fix round 1 (M-1: that file was 557 lines,
 * over this project's 300-500 ceiling). This half answers "what should
 * copperhead draft, and is it safe to" - resolving a committed intent,
 * parsing it, verifying its net partition against the model, and running
 * copperhead itself. `./draw-render.ts` is the other half: what happens to
 * what this module produces.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { defaultCopperheadDir, defaultCopperheadTsx } from "./copperhead-install.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

/**
 * One board's committed copperhead intent, repository-relative.
 *
 * **"COMMITTED" MEANS A FILE ALREADY ON DISK, FROM AN EARLIER RUN** - not
 * something this verb derives. `pultec-hi-cut`'s entry is
 * `docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json`,
 * the intent `drafted/pultec/pultec-hi-cut/RECORD.md` names as what produced
 * the committed page ("Produced by copperhead draft `v4-blocks-mid-late`").
 * Drafting from it here will NOT reproduce that page byte-for-byte: the
 * committed page went through akcli repairs and a field-restating pass
 * afterwards that this verb does not run (`TOOLING.md` steps 4-6 are
 * judgement-laden repair work, not mechanics - see `tools/cli/draw.ts`'s own
 * module comment). The other four Pultec boards with a page under
 * `drafted/pultec/` have no entry here yet; `make -C boards/<one of them>
 * draw` refuses, naming the board, until one is added.
 */
const COMMITTED_INTENT: Readonly<Record<string, string>> = {
  "pultec-hi-cut": "docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json",
}

// --- the committed intent file, as copperhead's own `schematic.intent.json` names its shape ---

export interface IntentPart {
  readonly ref: string
  readonly libId: string
  readonly value: string
  readonly group: string
}

export interface IntentNet {
  readonly name: string
  readonly pins: readonly string[]
}

export interface Intent {
  readonly parts: readonly IntentPart[]
  readonly nets: readonly IntentNet[]
  readonly noConnect: readonly string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

/**
 * The minimum this verb needs to believe an intent file before handing it to
 * copperhead: a `parts` array of refs, a `nets` array of named pin lists, and
 * an optional `noConnect` list of bare pins. copperhead's own `draft
 * schematic` validates the file far more thoroughly than this; this check
 * exists only so `verifyIntentAgainstModel` below has something typed to
 * read before that point, and refuses by name rather than letting a
 * malformed file reach `Object.entries` as `unknown`.
 */
export function parseIntent(file: string): Intent {
  let raw: string
  try {
    raw = fs.readFileSync(file, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`could not read the committed intent ${file}: ${detail}.`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${file} is not valid JSON: ${detail}.`)
  }
  if (!isRecord(parsed)) throw new Error(`${file} must hold a JSON object; copperhead's intent schema requires one.`)

  const partsValue = parsed["parts"]
  if (!Array.isArray(partsValue)) throw new Error(`${file}: "parts" is missing or not an array.`)
  const parts = partsValue.map((item, index): IntentPart => {
    if (!isRecord(item)) throw new Error(`${file}: parts[${index}] is not an object.`)
    const { ref, libId, value, group } = item
    if (typeof ref !== "string") throw new Error(`${file}: parts[${index}].ref is missing or not a string.`)
    if (typeof libId !== "string") throw new Error(`${file}: parts[${index}].libId is missing or not a string.`)
    if (typeof value !== "string") throw new Error(`${file}: parts[${index}].value is missing or not a string.`)
    if (typeof group !== "string") throw new Error(`${file}: parts[${index}].group is missing or not a string.`)
    return { ref, libId, value, group }
  })

  const netsValue = parsed["nets"]
  if (!Array.isArray(netsValue)) throw new Error(`${file}: "nets" is missing or not an array.`)
  const nets = netsValue.map((item, index): IntentNet => {
    if (!isRecord(item)) throw new Error(`${file}: nets[${index}] is not an object.`)
    const { name, pins } = item
    if (typeof name !== "string") throw new Error(`${file}: nets[${index}].name is missing or not a string.`)
    if (!isStringArray(pins)) throw new Error(`${file}: nets[${index}].pins is missing or not an array of strings.`)
    return { name, pins }
  })

  const noConnectValue = parsed["noConnect"]
  if (noConnectValue !== undefined && !isStringArray(noConnectValue)) {
    throw new Error(`${file}: "noConnect" must be an array of strings when present.`)
  }
  const noConnect = noConnectValue ?? []

  return { parts, nets, noConnect }
}

// --- resolving the intent: a committed one, or a refusal naming the board ---

export type IntentResolution = { readonly path: string } | { readonly refusal: string }

export function resolveIntentPath(board: string, override: string | undefined): IntentResolution {
  if (override !== undefined) {
    const abs = path.resolve(override)
    if (!fs.existsSync(abs)) {
      return { refusal: `--intent override ${override} does not exist.` }
    }
    return { path: abs }
  }
  const relative = COMMITTED_INTENT[board]
  if (relative === undefined) {
    const known = Object.keys(COMMITTED_INTENT).sort().join(", ")
    return {
      refusal:
        `no committed copperhead intent is declared for board "${board}". ` +
        "COMMITTED_INTENT in tools/draught/draw-draft.ts names one intent file per board that has one, and " +
        `this plan does not derive an intent from a Network (the board has none yet, among [${known}]). ` +
        `Add "${board}" to COMMITTED_INTENT, pointing at a committed intent file, before drafting it here.`,
    }
  }
  return { path: path.join(moduleRepoRoot(), relative) }
}

// --- verifying the intent's net partition against the model ---

/** A partition as a sorted list of sorted member strings - a MULTISET. */
function partitionOf(sets: readonly (readonly string[])[]): string[] {
  return sets.map((members) => [...members].sort().join(" ")).sort()
}

/** `a` minus `b` as MULTISETS: an entry in `a` twice and in `b` once survives once. */
function withoutOnce(a: readonly string[], b: readonly string[]): string[] {
  const remaining = new Map<string, number>()
  for (const x of b) remaining.set(x, (remaining.get(x) ?? 0) + 1)
  const out: string[] = []
  for (const x of a) {
    const n = remaining.get(x) ?? 0
    if (n > 0) remaining.set(x, n - 1)
    else out.push(x)
  }
  return out
}

export type Agreement = { readonly agrees: true } | { readonly agrees: false; readonly disagreements: readonly string[] }

/**
 * Compare the intent's net partition to the model's, AS SETS OF `REF.PIN`
 * SETS - `TOOLING.md`'s own description of `intent_vs_model.py`, the research
 * script this reimplements against a production module instead of a
 * one-off. "The model" here is the board's own COMMITTED netlist export
 * (`perfboard.json`'s `"netlist"` field, imported through
 * `lib/kicad/netlist.ts`'s `importNetlist` - a production module, not a test
 * helper) rather than a fresh derivation from the `Network`: that export is
 * already the netlist `tests/circuits/<board>.test.ts` binds to the TS model
 * on every `bun test` run (`make/board.mk`'s `netlist-agrees`), so comparing
 * against it is comparing against the model through a link this repository
 * already keeps honest, not inventing a second one.
 */
export function verifyIntentAgainstModel(intent: Intent, netlistText: string): Agreement {
  const modelSets = partitionOf(Object.values(importNetlist(netlistText).nets))
  const intentSets = partitionOf([...intent.nets.map((net) => net.pins), ...intent.noConnect.map((pin) => [pin])])
  if (modelSets.join("\n") === intentSets.join("\n")) return { agrees: true }
  const disagreements: string[] = []
  for (const set of withoutOnce(modelSets, intentSets)) {
    disagreements.push(`the model connects [${set}] and the intent does not`)
  }
  for (const set of withoutOnce(intentSets, modelSets)) {
    disagreements.push(`the intent connects [${set}] and the model does not`)
  }
  return { agrees: false, disagreements }
}

// --- drafting with copperhead ---

/**
 * The `draughting/tools.lock.json` tools THIS MODULE ACTUALLY SPAWNS, so
 * `tools/cli/draw.ts`'s pre-draft gate can refuse on these and on nothing
 * else - controller Ruling 1 of the final review's fix round 2.
 *
 * **IT IS DECLARED HERE, BESIDE THE SPAWN, AND NOT IN A LIST IN `draw.ts`.**
 * Which tools a step needs is a fact about the step's own code: this module
 * runs `defaultCopperheadTsx()` on `src/cli.ts` and nothing else from the
 * lock. `git` is spawned too and is deliberately absent - `TOOLING.md`'s
 * table lists it as a system tool this repository has never pinned, so it is
 * not in the lock and there is nothing here to check it against.
 *
 * `tests/draught/draw.test.ts` cross-checks this against the source: a lock
 * tool whose resolver is referenced by a drawing-path module and is NOT
 * declared fails, and so does one declared here but referenced nowhere.
 */
export const DRAFT_TOOLS: readonly string[] = ["copperhead"]

export interface DraftOutcome {
  readonly ok: boolean
  readonly schematicPath: string
  readonly stdout: string
  readonly stderr: string
}

/**
 * Draft `board`'s schematic from `intentPath`, into a throwaway git
 * repository under `outDir` - copperhead "REFUSES to draft outside a git
 * repository" (`TOOLING.md`), which every prior run satisfied with
 * `git init -q`. The intent is copied to copperhead's own default location
 * beside the schematic (`schematic.intent.json`), the same way every prior
 * run's `draft.py` used it, rather than passed via `--intent` - both are
 * equivalent for a fresh directory with nothing else in it.
 *
 * **COPPERHEAD IS INVOKED AS `<the checkout's own pinned tsx> <abs path to
 * src/cli.ts>`, NOT `bun`** (`TOOLING.md`: *"the bun path has never been
 * measured"*), with both the `tsx` binary and the script path resolved
 * through `./copperhead-install.ts` - never a hardcoded checkout directory -
 * and never by changing this process's own working directory, the same way
 * `tools/draught/toolchain.ts`'s probe invokes it.
 *
 * **IT WAS `npx tsx` UNTIL THE FINAL REVIEW'S I-5, AND `npx` IS WHAT BROKE
 * THE PIN.** `npx` resolves `tsx` from the current working directory
 * upwards, so with no `cwd` set this ran an unpinned `tsx` out of npm's
 * `_npx` cache - and, on a machine with an empty cache, fetched one over the
 * network. `defaultCopperheadTsx()` carries the measurement and the
 * correction to the review's own stated cause.
 *
 * **THIS WRITES NO `hints.paper`, AND THAT IS A MEASURED DECISION, NOT AN
 * OMISSION (Task 5 fix round 1, I-1).** The fix round's own reviewer pointed
 * at a real mechanism - `SchematicIntent.hints.paper` - and it was tried
 * first: setting it to `"USLetter"` on this exact intent produces the
 * engine's own note `paper hint "USLetter" is not a standard size; deriving
 * paper from content` and drafts on A4 regardless, reproduced directly
 * against `draughting/copperhead/src/kicad/draft/engine.ts`. Its `PAPERS`
 * table (line ~219) holds only the ISO series, A5 through A0; the
 * `PAPER_SIZES` table that DOES know `USLetter` lives in
 * `src/kicad/legibility.ts` and is read by the LEGIBILITY CHECKER, a
 * different consumer entirely, never by the draft engine's own sizing. A
 * hint the engine does not recognise is silently ignored, not silently
 * honoured - the engine's `PAPERS.some(p => p.name === paperHint)` guard
 * (`engine.ts` ~3807) is what drops it to the "deriving from content" path.
 * So the paper token has to be fixed up AFTER copperhead drafts, in
 * `./draw-render.ts`'s `repaperToUSLetter` - the same one-line rewrite this
 * project already measured and used for the other four Pultec boards
 * (`docs/research/2026-10-30-letter-repaper.md` §5: *"`git diff` of each
 * sheet: 1 insertion, 1 deletion - the `(paper ...)` line and nothing
 * else"*), not an invention made for this fix.
 */
export function draftWithCopperhead(opts: { readonly outDir: string; readonly board: string; readonly intentPath: string }): DraftOutcome {
  const schematicRelative = `${opts.board}.kicad_sch`
  const schematicPath = path.join(opts.outDir, schematicRelative)

  fs.rmSync(opts.outDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(opts.outDir, ".copperhead"), { recursive: true })
  fs.writeFileSync(
    path.join(opts.outDir, ".copperhead", "config.json"),
    JSON.stringify({ schematic: schematicRelative, docs: "docs/" }) + "\n",
  )
  fs.copyFileSync(opts.intentPath, path.join(opts.outDir, "schematic.intent.json"))

  const gitInit = spawnSync("git", ["init", "-q", opts.outDir], { encoding: "utf8" })
  if (gitInit.status !== 0) {
    return {
      ok: false,
      schematicPath,
      stdout: "",
      stderr: `git init -q ${opts.outDir} failed: ${gitInit.stderr || gitInit.error?.message || "no output"}. ` +
        "copperhead refuses to draft outside a git repository (TOOLING.md).",
    }
  }

  const cliPath = path.join(defaultCopperheadDir(), "src", "cli.ts")
  const draft = spawnSync(defaultCopperheadTsx(), [cliPath, "--repo", opts.outDir, "draft", "schematic"], {
    encoding: "utf8",
  })
  const produced = fs.existsSync(schematicPath)
  return {
    ok: draft.status === 0 && produced,
    schematicPath,
    stdout: draft.stdout ?? "",
    stderr: produced ? (draft.stderr ?? "") : `${draft.stderr ?? ""}\ncopperhead did not produce ${schematicPath}.`.trim(),
  }
}
