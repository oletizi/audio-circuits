Context for every topic-document task (Tasks 3-8) of the h7-platform port

Where this fits: phase 1 ports the STM32H743 digital pedal platform's design knowledge from the pedals repository into this repository as documentation (no code, no models, no drawings). Each topic task writes one document under docs/h7-platform/, appends its open items to docs/h7-platform/open-items.md, and adds one check to verify.sh.

Read, in order:
1. your task brief (named in your dispatch) — requirements, exact values verbatim;
2. global-constraints.md in this directory — binding rules and process rules;
3. the spec docs/superpowers/specs/2026-11-10-digital-pedal-platform-port-design.md — Goals, Anti-goals, "How amendments resolve", "Done when".

Already on the branch (do not rewrite others' content; append only):
- docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh — add your check as one `check_<name>` function plus its dispatcher entry and all-checks list entry, following the existing pattern. The check must be able to FAIL (missing file = FAIL). Show it failing first (step 2), then passing.
- docs/h7-platform/open-items.md — table with columns `Id | Item | Board / domain | Status | Evidence that closes it | Phase that must close it | Source`, then `## Conflicts`. Append rows to the table (keep the table contiguous) and `### Conflict:` entries under `## Conflicts`. Give each row a unique, stable, descriptive Id (UPPER-KEBAB, e.g. VDDA-WIDEBAND); check existing ids first so you don't collide. Status must read as open (e.g. "open — paper analysis only", "open — not verified"), never as closed. Phase cell is one of `phase 2`, `phase 3`, `phase 4`, `bring-up`.
- docs/h7-platform/decisions.md — every owner decision, owner-supplied fact and controller ruling. Link entries by anchor: `decisions.md#o-17`, `#r-58`, `#rr-8`, `#d20`, `#own-05`, `#f-5`, `#ps-18v`, `#pw-tj`, `#an-d1`, `#an-d2` (the scheme is stated at the top of decisions.md — read it). Do NOT restate a decision's label differently from decisions.md; if you believe decisions.md is wrong, say so in your report rather than editing it.

Controller rulings that bind every topic task:
- An IN-FORCE 9-12 V range that is not the superseded Seed-bench rule (e.g. the pedal's production operating input range) is written "9 V to 12 V". The superseded Seed-bench value appears only on a `*Not in force:*` line. Same for 179 Hz vs 421 Hz.
- Count rule (step 1 / step 4): record your open-passage count per source section and the rows you added in the commit body and in your report; explain every difference.
- Figures: each analysis figure carries its inputs, its method in words, a pinned source, and is labelled paper analysis of an unbuilt board. If decisions.md states a consequence figure bare (e.g. R-58's 137.7 °C, R-59's 13.56 V, R-15's 1,123 µV, R-50's 95 °C/W) and your document derives it, make your section's heading a stable anchor and list it in your report so decisions.md can link to it later.
- Pre-split names (POWER.md, ANALOG.md) are amended by split spec §9; apply the amendments or mark clearly what is pre-split.
- Unreachable Task 17 sources: cite the ledger entry, say the underlying file is not in the pedals history.

Commit (plain message, subject "h7-platform port: <document>", body with counts; no attribution; written with Write to a file in this workspace and `git commit -F`) and push. Do not dispatch subagents. Do not write memory files.

Report: write the full report to the report path in your dispatch: what you wrote; RED and GREEN verify output; the open-passage count per section vs rows added, with every difference explained; every conflict raised; every label you applied and its source wording; anchors other tasks may need; concerns. Then reply with ONLY (under 15 lines): Status (DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT), commits, one-line test summary, concerns, report path.
