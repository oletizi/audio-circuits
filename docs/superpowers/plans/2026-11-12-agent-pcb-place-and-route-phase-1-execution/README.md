## Execution record: agent PCB place-and-route, Phase 1

This directory is the **execution record** of
`docs/superpowers/plans/2026-11-12-agent-pcb-place-and-route-phase-1.md`. It is
committed beside the plan for the reason `CLAUDE.md` gives: a plan produces a
decision record and an audit trail that are not findings and that the project's
registers have no home for, and the execution skill's default is to delete the
workspace a plan was run in.

**IT IS NOT FINDINGS, AND NOTHING HERE IS A GATE.** What binds is elsewhere:

- the **approved criteria** are `circuits/pt2399-core/floorplan-intent.json`,
  `placement-rules.json` and `placement-policy.json`, and no agent may author
  them;
- the **checks** are `tools/pcb/drc.ts` (schematic parity, DRC under three
  policies), `tools/pcb/courtyard-rule.ts`, `tools/pcb/fab-standard.ts`, the
  pinned engine's `check_connected.py` and `check_drc.py`, and
  `tools/pcb/routed-survey.ts`;
- the **pour measurement** is `tools/pcb/pour.ts` and it **gates nothing,
  indefinitely** - the owner declined to set thresholds (`docs/known-gaps.md`
  **G313**) and a declination is not a delegation.

What is here is the evidence a later reader cannot re-derive: which commands
ran, what they printed, and the artifacts they produced.

| Directory | What |
| --- | --- |
| `task-10-probe/` | The Phase 1 probe itself: the scripts, every candidate's logs and verdict, the routed boards whose checks passed, and the renders |

**The owner has not ruled on anything in here.** The renders under
`task-10-probe/render/` were produced so he can look; no verdict is attached to
them by this directory or by the agent that made them, and
`EVALUATING-DRAWINGS.md` is the authority on who may evaluate one.
