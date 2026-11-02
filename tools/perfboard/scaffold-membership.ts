/**
 * The guard that makes a board's stand-in diagram trustworthy: its scaffold doc
 * and its committed layout must agree about which parts belong to which group.
 *
 * **WHAT WAS NOT CHECKED ANYWHERE, AND WHY IT MATTERS AT A BENCH.** Three
 * comparisons exist around a Pultec section board and they do not close the
 * triangle. veroroute's own `--check` and `assertLayoutMatchesCircuit` compare
 * the LAYOUT against the CIRCUIT. `groupsFor` in
 * `circuits/pultec/physical/scaffold-doc.ts` compares the GROUPS against the
 * MODEL - every part the maximal network marks as scaffolding is in exactly one
 * group, and every listed part is one the network carries. Nothing compared the
 * GROUPS against the LAYOUT. So a group could claim a part with no position on
 * the board, or claim one part twice, and the first symptom would be a
 * confidently-hatched diagram in a printed packet. The five `.vrt` files are
 * immutable and owner-approved, which is exactly what makes that failure
 * expensive: a builder who finds a part hatched for the wrong section has no
 * reason to suspect the diagram rather than the board.
 *
 * **IT RUNS THROUGH THE SAME TWO VOCABULARIES THE REST OF THE TOOLING DOES.**
 * A group's `partIds` are COMPONENT IDS (`lib/board/scaffold/doc.ts`: *"PART
 * IDS, NOT COMPONENTS"*). A dump's `PART` refs are REFERENCE DESIGNATORS. The
 * board module's `DESIGNATORS` map is the only place the two vocabularies meet
 * (`CLAUDE.md`, *"Ids are semantic; designators belong to KiCad"*), so every
 * lookup here goes through it and an id with no designator refuses by name
 * rather than being compared against the dump as though it were one.
 *
 * **A BOARD WITH NO `SCAFFOLD` IS NEITHER A FAILURE NOR A SILENT PASS.**
 * `pt2399-core` and the transistor-preamp boards have no absent neighbours to
 * stand in for, so they declare none, and that is legitimate. It still prints a
 * `NOTICE:` of its own - the shape `./schematic-notice.ts` already established
 * for the other legitimately-skipped guard in this workflow - because
 * *"a skipped check must never look like a passing one"* (`CLAUDE.md`).
 *
 * **WHAT IT DOES NOT CHECK, STATED RATHER THAN LEFT TO BE DISCOVERED.** The
 * reverse direction - a part PLACED on the layout that no group claims - is not
 * asserted here, because telling a stand-in part from the board's own part
 * requires `STAND_IN_SOURCE`, which lives in `circuits/pultec/physical/board.ts`
 * and must not be imported by a generic `tools/perfboard/` guard. That direction
 * is covered transitively (groups-to-model by `groupsFor`, model-to-layout by
 * `--check`) and the gap is recorded in `docs/known-gaps.md`.
 */
import { parseBoardDump, type BoardDump } from "../guide/dump.ts"
import { dumpBoard } from "./buildability-input.ts"
import { assertDesignators } from "./circuit-exports.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { isRecord } from "./guards.ts"
import { moduleRepoRoot } from "./repo-root.ts"
import { assertScaffold } from "./wiring-sync.ts"
import type { ScaffoldDoc } from "../../lib/board/scaffold/doc.ts"

/** How many groups and how many parts the check actually looked at. */
export interface MembershipCounts {
  readonly groups: number
  readonly parts: number
}

/**
 * The counts, plus whatever the run has to say for itself.
 *
 * `status` is the whole verdict vocabulary, and there are only two values
 * because a DISAGREEMENT never arrives as a status: it throws. A third status
 * meaning "they disagree" would be a value a caller could forget to read, and
 * this guard exists precisely because nothing was reading the comparison at all.
 */
export interface ScaffoldMembershipResult {
  readonly status: "checked" | "no-scaffold"
  readonly groups: number
  readonly parts: number
  /** What to print. Always set, so no caller invents wording. */
  readonly message: string
}

/** The `NOTICE:` lines a board with no `SCAFFOLD` prints, in print order. */
export function noScaffoldNoticeLines(declarationFile: string): readonly string[] {
  return [
    `NOTICE: ${declarationFile}'s circuit exports no SCAFFOLD, so stand-in group`,
    "  membership was NOT checked on this board. Nothing compared any group's parts",
    "  against the positions the layout actually holds, because there are no groups to",
    "  compare - a board with no absent neighbours to stand in for has none, which is",
    "  true of pt2399-core and of every transistor-preamp board.",
    "  That is a legitimate configuration and not a failure; the check below still ran.",
    "  A board that DOES carry stand-in positions gets its SCAFFOLD from",
    "  circuits/pultec/physical/scaffold-doc.ts.",
  ]
}

function placedRefs(dump: BoardDump): ReadonlySet<string> {
  return new Set(dump.parts.map((part) => part.ref))
}

/**
 * Every group part resolves to a part on the board, and no part is claimed
 * twice. Throws listing EVERY disagreement; returns what it counted.
 *
 * **EVERY DISAGREEMENT IS REPORTED, NOT THE FIRST.** A doc whose group list has
 * drifted usually drifted in more than one place, and a guard that names one
 * part per run turns one fix into several. The duplicate pass runs FIRST and is
 * reported first, because a part claimed twice is a statement about the doc
 * alone and reads as the cause of the placement complaints that follow it.
 *
 * `where` is what the caller prints to say WHICH board - five section modules
 * are near-identical, and a refusal with no board name sends somebody reading
 * all of them.
 */
export function assertScaffoldMembership(
  doc: ScaffoldDoc,
  designators: Readonly<Record<string, string>>,
  dump: BoardDump,
  where: string,
): MembershipCounts {
  const problems: string[] = []

  const claims = new Map<string, string[]>()
  for (const group of doc.groups) {
    for (const partId of group.partIds) {
      const sections = claims.get(partId) ?? []
      sections.push(group.section)
      claims.set(partId, sections)
    }
  }
  for (const [partId, sections] of claims) {
    if (sections.length < 2) continue
    problems.push(
      `part "${partId}" is claimed by ${String(sections.length)} groups: ${sections.join(", ")}. ` +
        "A part stands in for exactly one absent section, so a diagram hatching it would have " +
        "to pick one of those groups and would be wrong about the others.",
    )
  }

  const placed = placedRefs(dump)
  for (const group of doc.groups) {
    for (const partId of group.partIds) {
      const designator = designators[partId]
      if (designator === undefined) {
        problems.push(
          `the "${group.section}" group claims part "${partId}", which is in no DESIGNATORS ` +
            "entry for this board, so there is no reference designator to look for on the " +
            "layout at all. Nothing is guessed from the id: a group part and a board part meet " +
            "only through DESIGNATORS.",
        )
        continue
      }
      if (!placed.has(designator)) {
        problems.push(
          `the "${group.section}" group claims part "${partId}" (${designator}), which the ` +
            "layout holds no PART line for, so it has no position to hatch. If it is " +
            "panel-mount it belongs in OFF_BOARD_IDS and in no group - an off-board part is " +
            "expanded into bare pads and carries no designator of its own on the board.",
        )
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `${where}: the scaffold doc's stand-in groups and the committed layout disagree:\n` +
        problems.map((problem) => `  - ${problem}`).join("\n") +
        "\nThis is NOT a reason to edit the layout or the doc to make the check pass. The " +
        "layouts are owner-approved and immutable; a disagreement means the group derivation " +
        "in circuits/pultec/physical/scaffold-doc.ts and the board it describes have drifted, " +
        "and the hatched stand-in diagram in the build packet would be confidently wrong about " +
        "which section a part stands in for.",
    )
  }

  return {
    groups: doc.groups.length,
    parts: doc.groups.reduce((sum, group) => sum + group.partIds.length, 0),
  }
}

/** Injected so no test needs the veroroute binary for the hand-built cases. */
export interface ScaffoldMembershipDeps {
  readonly dumpBoard?: (vrtPath: string) => string
  readonly repoRoot?: string
}

/**
 * One declared board's scaffold doc against its committed layout.
 *
 * The dump comes from `dumpBoard`, which REFUSES rather than returning an empty
 * board when the binary cannot be run: an empty dump has no `PART` lines at all,
 * so every group's every part would read as unplaced and this would refuse the
 * five committed boards for a reason that is not about them.
 */
export async function checkScaffoldMembership(
  declaration: PerfboardDeclaration,
  deps: ScaffoldMembershipDeps = {},
): Promise<ScaffoldMembershipResult> {
  const imported: unknown = await import(declaration.circuitPath)
  if (!isRecord(imported)) {
    throw new Error(
      `${declaration.file}: the module at ${declaration.circuitPath} did not import as an object`,
    )
  }
  const doc = assertScaffold(imported["SCAFFOLD"], declaration)
  if (doc === undefined) {
    return {
      status: "no-scaffold",
      groups: 0,
      parts: 0,
      message: noScaffoldNoticeLines(declaration.file).join("\n"),
    }
  }
  const designators = assertDesignators(imported["DESIGNATORS"], declaration)
  const repoRoot = deps.repoRoot ?? moduleRepoRoot()
  const dumpText = (deps.dumpBoard ?? ((vrt: string) => dumpBoard(vrt, repoRoot)))(
    declaration.vrtPath,
  )
  const counts = assertScaffoldMembership(
    doc,
    designators,
    parseBoardDump(dumpText),
    declaration.file,
  )
  return {
    status: "checked",
    groups: counts.groups,
    parts: counts.parts,
    // THE FIGURES ARE IN THE PASS LINE, deliberately. A pass that says nothing
    // is indistinguishable from a pass that checked nothing, and this guard's
    // whole subject is a comparison that was never being made.
    message:
      `scaffold membership ok ${declaration.vrtPath}: ${String(counts.groups)} stand-in ` +
      `group(s), ${String(counts.parts)} part(s), every one placed on the layout and claimed ` +
      "by exactly one group.",
  }
}
