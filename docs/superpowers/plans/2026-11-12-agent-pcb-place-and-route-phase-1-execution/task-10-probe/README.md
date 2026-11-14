## The Phase 1 probe: fourteen candidates, placed, poured, routed, refilled and checked

Task 10 of `docs/superpowers/plans/2026-11-12-agent-pcb-place-and-route-phase-1.md`.
Run 2026-11-14 against engine commit `749cfa83` (KiCadRoutingTools v0.21.3) and
KiCad 10.0.5.

**NOTHING IN THIS DIRECTORY IS A VERDICT ON A DRAWING, AND NOTHING IN IT IS A
PASS MARK FOR THE POUR.** The numbers are numbers.

### What a candidate is

`adopted` is the committed board - the placement Task 8 settled, read from
`circuits/pt2399-core/pt2399-core.kicad_pcb`. Every other candidate is
`<arm>-seed-<n>`, generated from the pre-placement board `b926f69` by the route
`make/pcb.mk` documents: write the declared outline, place the four locked
mounting holes, resolve the intent against that board, then `place_seed.py`.

**The two arms exist because two approved files disagree about one flag**, and a
measurement is worth more than a ruling an agent writes:

| Arm | `place_seed` flags | Which approved file says so |
| --- | --- | --- |
| `a` | no `--clearance` | `placement-policy.json` lists `--clearance` under `place`.`forbidden` |
| `b` | `--clearance 2.0` | `placement-rules.json` `separation.part_to_part.enforced_by` names it as the placer-side mechanism for the owner's *"Use 2mm min spacing"*, and `make/pcb.mk` documents it |

`b-seed-1` reproduces the adopted placement exactly - every reference, position,
rotation and layer identical - which is the control on the generator, and its
routed copper is identical to `adopted`'s (119 F.Cu segments, 10 B.Cu, 9 vias,
same width histogram), which is the control on the router's determinism.

### Every flag used is one `placement-policy.json` lists

`route.py` was given `--output`, `--fab-overrides circuits/pt2399-core/route-fab-floor.txt`
and `--nets "*"`, and nothing else. `route_planes.py` was given `--nets GND
--plane-layers B.Cu`. The refill is `kicad-cli pcb drc --refill-zones
--save-board`. In particular **`--no-fix-drc-settings` and `--keep-thermal` were
NOT used**, although both would have suppressed the project writeback the
policy's post-conditions exist to catch: neither is a flag that file lists, and
suppressing the thing a post-condition checks for is not a way to satisfy it.

`--clearance` was not passed to `route.py` either, so each net routed at its own
net class (`Default` 0.3 mm, `Power` 0.5 mm for `GND` and `+5V`).

### How to re-run it

```
python3 -I scripts/run-probe.py <repo> <run-dir> adopted a-seed-1 b-seed-1 ...
```

Resumable and append-only: a candidate whose `result.json` exists is skipped and
`results.jsonl` is only appended to. It **stops after three identical board
failures**, because a batch hides a systematic failure. It stopped twice on this
run and both stops were correct; `scripts/run-probe.py`'s own docstring says why
the stop rule counts board failures and not the run-level policy findings.

The other scripts: `stage.sh` puts a board beside the siblings KiCad needs,
`seed-candidate.sh` is the standalone placement generator, `render.sh` makes the
five views under `render/`, `dead-copper-control.py` plants one isolated island
of ground fill and checks KiCad names it, `mutate.py` is the mutation sweep, and
`assemble.py` copied this directory out of the gitignored run directory.

### What is in here

| Path | What |
| --- | --- |
| `results.jsonl` | One line per candidate run, appended. The authority for what each candidate did |
| `results-pass1-ungated.jsonl` | **A defect, kept rather than deleted.** The first pass of the driver recorded the intent grade and did not act on it, so four candidates whose seeds put a decoupling capacitor 15 to 18 mm from U1 against the intent's 10 mm limit were reported as board passes. A check whose result is recorded and not acted on reads exactly like a check that passed. The driver was fixed and every candidate re-run; this file is what the ungated pass said |
| `candidates/<name>/` | That candidate's verdict (`result.json`), every command's log, its resolved intent, its DRC report, and its pour and copper measurements |
| `boards/<name>/` | The saved post-refill board, with the project and custom rules it was graded against - committed only for the candidates whose board checks passed |
| `render/<name>/` | Five views: both coppers, front copper, back copper (the pour, mirrored), and a 3D raytrace of each side |
| `control-dead-copper/` | The negative control for the dead-copper check |
| `mutation-sweep-routed-survey.txt` | The sweep over `tools/pcb/routed-survey.ts` |

### The dead-copper control, and why there is one

"No dead copper" is read off KiCad's `isolated_copper` check reporting nothing,
and **a check that produces no violation cannot by itself tell you that it ran.**
So `dead-copper-control.py` plants one 6 x 6 mm island of GND fill on `F.Cu` in
an area measured to hold no footprint origin and no track, refills, and re-runs
DRC. KiCad reported it - `isolated_copper`, warning, *"Isolated copper fill"* -
so the clean result on the real boards is evidence rather than silence.

### The project files the engine writes beside its own output

`placement-policy.json` carries two post-conditions on `route` and `zone-refill`:
the run must not print `FAB FLOOR RELAXED`, and the `.kicad_pro` left beside the
output must still satisfy `tools/pcb/fab-standard.ts`. **The first held on every
run and the second failed on every run**, which is exactly the case the policy's
second post-condition was written for - *"a log line can be absent for reasons
other than the floors being intact"*. The measured values are in each
candidate's `logs/post-fab-standard-*.log`.

Because of that, the board each candidate is graded on is staged with the
**canonical** `pt2399-core.kicad_pro` and `pt2399-core.kicad_dru`, restored from
`circuits/pt2399-core/`. That is disclosed here rather than quiet: it does not
change any copper, it restores the severities and floors the fabrication
standard declares, and the engine's own project files are checked separately and
their failure recorded against every candidate. `tools/pcb/courtyard-rule.ts`
runs on the staged `.kicad_dru` on every candidate and compares it by content to
the approved 2 mm figure, so the restore cannot smuggle in a different rule.
