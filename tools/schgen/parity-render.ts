/**
 * **THE TEMPLATE-APPLICABILITY CENSUS AS A COMMITTED DOCUMENT.** Split out of
 * `tools/schgen/parity.ts` by the Task 10 review so neither file carries both the measurement and
 * its presentation; `censusOf` is there, the markdown is here.
 *
 * **WHICH MEASUREMENT: TEMPLATE APPLICABILITY, a MEASUREMENT WITH NO TARGET** - spec §5.1,
 * revision 4, finding 20. Not port parity (Task 7), not ELK coverage (Tasks 12-14), not integrated
 * correctness (Tasks 11 and 18). The document says so at the top, before any number, and
 * `tests/schgen/parity.test.ts` asserts that it still does.
 */

import type { Rendering } from "../../lib/schgen/ir/types.ts"
import type { BlockOutcome, ParityCensus } from "./parity.ts"

function describeDeclared(r: Rendering): string {
  if (r.kind === "wired") return `wired/${r.template}`
  return r.kind
}

function describeOutcome(o: BlockOutcome): string {
  if (o.kind === "realised") return `realised by \`${o.template}\``
  if (o.kind === "elk") return "**elk** - every template not-applicable"
  return `**refused** (${o.mismatch.kind})`
}

const HEADER = `# Template applicability: do the ported templates draw this repository's blocks?

**GENERATED - do not hand-edit.** \`bun run schgen-parity\` rewrites this file from
\`tools/schgen/parity.ts\`, and \`tests/schgen/parity.test.ts\` compares the committed copy against a
fresh run **by content**, never by timestamp. There is deliberately no date in this file: a
timestamp would make every run a diff and make stale look current.

**SOME OF THESE NUMBERS COME FROM THE INSTALLED KiCad, AND THAT IS A KNOWN DEPENDENCY.** A refusal
reason like *"U1#1 has 16 pins"* is a pin count read from the symbol library on the machine that
ran this, and \`docs/known-gaps.md\` **G158** measures that **15 of the 22 lib ids a drawing needs
are pinned by nothing** - not vendored, so resolved through whatever KiCad is installed. A diff in
this file can therefore mean a circuit changed, a declaration changed, a template changed, **or
only that the libraries did**.

## WHICH OF M1's FOUR MEASUREMENTS THIS IS

**Every number below is TEMPLATE APPLICABILITY: a MEASUREMENT WITH NO TARGET.** Spec §5.1,
revision 4, finding 20 separates four things that had been read as one, and names the failure of
confusing them:

| measurement | where it is taken | what it is |
| --- | --- | --- |
| port parity | Task 7, against the SOURCE project's own nine template fixtures | a **regression** requirement: it holds or the port is broken |
| **template applicability** | **this file**, against this repository's declared blocks | **a MEASUREMENT WITH NO TARGET** |
| ELK coverage | Tasks 12-14, over the blocks recorded here as \`elk\` | a test of the **new capability** |
| integrated correctness | Tasks 11 and 18 | the **artifact**, and the only verdict of the four |

§5.1: the templates *"were sized by a 103-block digital mainboard. Nothing is known about their
pass rate on circuits that are mostly passive chains, dividers and op-amp stages. The measurement:
run them and count."*

**So a low count here is a RESULT, not a problem.** A block no template draws is a finding about a
template. Nothing in the circuits, the declarations or the templates may be tuned to raise it, and
this census never becomes a threshold - Task 17 re-runs it as a second reading of the same
measurement.

## Two readings, and they answer different questions

- **Outcome** is what \`selectRenderer\` would actually do with the block under spec §1.3. For a
  \`wired\` block that consults only the declared template.
- **Verdicts** is an applicability probe: every registered template's own verdict on the block's
  subgraph, which is §5.1's question. \`Selection\`'s \`{kind:"elk"}\` carries no mismatch, so the
  reason each template declined is otherwise lost - recording it is \`docs/known-gaps.md\`
  **G141**'s third suggested mechanism. The census refuses if the two readings disagree.
`

/** The census as the committed markdown document. */
export function renderCensus(c: ParityCensus): string {
  const out: string[] = [HEADER]
  out.push("## Per block\n")
  out.push("| circuit | block | parts | units | crossing nets | declared | outcome |")
  out.push("| --- | --- | --- | --- | --- | --- | --- |")
  for (const b of c.blocks) {
    out.push(
      `| ${b.circuit} | \`${b.block}\` | ${b.parts} | ${b.units} | ${b.crossings} | ` +
        `${describeDeclared(b.declared)} | ${describeOutcome(b.outcome)} |`,
    )
  }
  const realised = c.blocks.filter((b) => b.outcome.kind === "realised").length
  const elk = c.blocks.filter((b) => b.outcome.kind === "elk").length
  const refused = c.blocks.filter((b) => b.outcome.kind === "refused").length
  out.push("")
  out.push(
    `**${c.blocks.length} declared blocks: ${realised} drawn by a template, ${elk} to the ELK backend, ` +
      `${refused} refused.**`,
  )
  out.push("")
  out.push("## The two predicates that do the refusing, measured per block\n")
  out.push(
    "Counted with the templates' own predicates rather than restatements of them: `twoPinNets`\n" +
      "from `render/layout-kit.ts`, which `rail-row`, `divider` and `passive-chain` each refuse a\n" +
      "block on, and `refPrefix !== \"C\"`, which is `decoupling-bank`'s. **This is description, not\n" +
      "prescription** - it says what the blocks hold, not what they should hold.\n",
  )
  out.push(
    "| circuit | block | units | `twoPinNets` says not two-terminal | genuinely more than two-terminal | parts that are not capacitors |",
  )
  out.push("| --- | --- | --- | --- | --- | --- |")
  for (const b of c.blocks) {
    out.push(
      `| ${b.circuit} | \`${b.block}\` | ${b.units} | ${b.notTwoTerminal} | ${b.notTwoTerminalGenuine} | ` +
        `${b.notCapacitors} |`,
    )
  }
  out.push("")
  const artefact = c.blocks.filter((b) => b.notTwoTerminal > 0 && b.notTwoTerminalGenuine === 0)
  if (artefact.length > 0) {
    const noGenuine = c.blocks.filter((b) => b.notTwoTerminalGenuine === 0)
    out.push(
      "**The two columns differ, and the difference is a PIN-COUNT CONVENTION rather than a topology\n" +
        "fact.** `twoPinNets` requires `pins.length === 2`; a part wired as a rheostat, with two of its\n" +
        `pins strapped to one net, has two terminals and three pins. **${noGenuine.length} of ${c.blocks.length} blocks hold no unit\n` +
        `that is genuinely more than two-terminal**, and **${artefact.length} of those are refused by \`twoPinNets\`\n` +
        `anyway** - ${artefact
          .map((b) => `\`${b.block}\``)
          .join(
            ", ",
          )} - so for those the convention is the ONLY obstacle to\n\`rail-row\`, \`divider\` and \`passive-chain\`. Recorded, not changed: \`twoPinNets\` is a ported,\nreviewed decision (\`docs/known-gaps.md\` **G160**).`,
    )
    out.push("")
  }
  const allTwoPin = c.blocks.filter((b) => b.notTwoTerminal === 0)
  out.push(
    `**${c.blocks.length - allTwoPin.length} of ${c.blocks.length} blocks hold at least one unit that is not ` +
      "two-terminal with both pins connected**, which is where the three subgraph-only templates stop" +
      (allTwoPin.length === 0
        ? "."
        : `. The ${allTwoPin.length === 1 ? "one that does" : `${allTwoPin.length} that do`} not - ${allTwoPin
            .map((b) => `\`${b.block}\``)
            .join(", ")} - ${allTwoPin.length === 1 ? "gets" : "get"} past that predicate and ${
            allTwoPin.length === 1 ? "is" : "are"
          } declined on TOPOLOGY instead; the verdict rows below say how.`),
  )
  out.push("")
  out.push("## Per template\n")
  out.push("Over all " + String(c.blocks.length) + " blocks, each template's own verdict:\n")
  out.push("| template | realised | not-applicable | refused |")
  out.push("| --- | --- | --- | --- |")
  for (const [id, t] of c.byTemplate) {
    out.push(`| \`${id}\` | ${t.realised} | ${t.notApplicable} | ${t.refused} |`)
  }
  out.push("")
  out.push(
    c.unexercised.length === 0
      ? "**Every registered template drew at least one block.**"
      : `**Unexercised - drew no block of this repository's circuits: ${c.unexercised
          .map((id) => `\`${id}\``)
          .join(", ")}** (${c.unexercised.length} of ${c.byTemplate.size}).`,
  )
  out.push("")
  out.push(
    "**WHAT `unexercised` DOES AND DOES NOT MEAN.** It means *as these circuits are declared today*,\n" +
      "no block reaches that template and is drawn by it. **It does NOT mean the template cannot draw\n" +
      "one of these blocks.** Every block here is declared `{kind:\"auto\"}` with no anchor, and the four\n" +
      "anchor-driven templates (`connector-fanout`, `crystal`, `regulator`, `opamp-stage`) can never be\n" +
      "offered one - `docs/known-gaps.md` **G141**. `bun run schgen-anchors` is the second column: it\n" +
      "brute-forces an anchor over each block's own member units and reports which templates draw\n" +
      "something then. **Read the two together, or this table will be read as a verdict on the\n" +
      "templates when half of it is a consequence of the declaration.**",
  )
  out.push("")
  out.push("## Every verdict, with its reason verbatim\n")
  out.push("The sentence each template gave, unedited. This is the diagnosis the counts above cannot carry.\n")
  for (const b of c.blocks) {
    out.push(`### ${b.circuit} / \`${b.block}\` - ${b.parts} parts, ${b.units} units, ${describeOutcome(b.outcome)}\n`)
    out.push("| template | verdict | reason |")
    out.push("| --- | --- | --- |")
    for (const v of b.verdicts) {
      out.push(`| \`${v.template}\` | ${v.kind} | ${v.kind === "ok" ? "-" : v.reason} |`)
    }
    out.push("")
  }
  return out.join("\n")
}
