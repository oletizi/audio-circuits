"""Every line the research document pastes as probe output must be in a probe run's log.

  bun run tools/schgen/text-metrics/probe.ts --font /tmp/newstroke_font.cpp > run.log
  python3 tools/schgen/text-metrics/verify-pastes.py run.log [document]

Research check for Task 1 of docs/superpowers/plans/2026-10-22-text-handling-research.md.
Nothing in lib/ or any gate calls it, and it is not wired into `make check`.

WHY IT EXISTS. The plan requires every number to be driven in the same action with its output
pasted, and the first round of this task tidied seven pasted blocks without meaning to: a line
truncated at a sentence boundary, a control that lost its parenthetical, two tables re-padded so
their columns lined up, one claim rewrapped across two lines, and one block left stale after the
probe grew a column. None of them changed a figure and all of them are edits to evidence. Reading
for that by eye does not work - that is what this file is for.

A fenced block counts as probe output when at least half its lines are in the log; then EVERY line
of it must be. A block with no matching lines is a transcription of KiCad's source rather than a
paste of a run, and is skipped. The threshold is what gives it teeth: a tidied block still matches
on most of its lines, so the tidied ones are reported rather than excusing the block.
"""

import re
import sys

DOC = "docs/schematic/text-handling-research.md"


def main():
    if len(sys.argv) not in (2, 3):
        raise SystemExit("usage: verify-pastes.py <probe run log> [document]")
    # The document is an argument so that this check can be driven RED against a perturbed COPY,
    # without the original ever being written - which is how it was proven to have teeth.
    path = sys.argv[2] if len(sys.argv) == 3 else DOC
    doc = open(path).read()
    log = set(line.rstrip() for line in open(sys.argv[1]))
    blocks = re.findall(r"\n```\n(.*?)\n```\n", doc, re.S)
    if not blocks:
        raise SystemExit("%s has no fenced blocks; either the document moved or this parser is wrong" % path)
    checked = 0
    output_blocks = 0
    missing = []
    for block in blocks:
        lines = [l.rstrip() for l in block.split("\n") if l.strip() != ""]
        hits = [l for l in lines if l in log]
        if len(hits) * 2 < len(lines):
            continue
        output_blocks += 1
        for l in lines:
            checked += 1
            if l not in log:
                missing.append(l)
    print("%d fenced block(s), %d of them probe output, %d line(s) checked" % (len(blocks), output_blocks, checked))
    if missing:
        print("NOT IN THE LOG - the document edited what it pasted:")
        for m in missing:
            print("   ", m)
        raise SystemExit(1)
    print("every pasted line is in the log")


main()
