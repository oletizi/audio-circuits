SchGen drawing trial - execution record
=======================================

**This is the record of a run, not findings.** The findings are in
`docs/research/2026-11-09-schgen-drawing-trial.md`, and the owner's decision on
them is `docs/known-gaps.md` **G310**. Those bind; this directory is the audit
trail that makes them checkable.

Plan: `docs/superpowers/plans/2026-11-09-schgen-drawing-trial.md`.
Spec: `docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md`.

## Layout

- `<board>/request/` - the request (`request.txt`, `request.json`), the rendered
  prompt (`prompt.json`) and the input-fidelity result (`fidelity.json`).
- `<board>/attempt-N/` - `request.sent`, the raw and decoded responses,
  `response.complete` (sha256s), `extraction.json`, `program.py`,
  `emitter.log`, `stages.json`, and `manifest.json`, which carries the seed,
  outcome, failure stage, latency, token counts, `finish_reason`, token-identity
  result and provenance.
- `run.log` - the batch log.
- `serving/`, `serving-2/` - the two cluster provisionings: Kinference install
  capture, the vLLM KV block size measured as 16, and the completions smoke test.
- `presentation/<board>.png` - what the owner was shown: the approved page, then
  attempts 1-3.
- `sdd/` - the plan's subagent workspace: ledger with every controller ruling,
  briefs, reports and reviews.

## Things a reader should know

- **Region by ruling.** Every US, Canada and Europe zone, and `asia-east1-a`,
  had no L4 capacity when probed; the run used `asia-east1-b`
  (`tools/schgen-serving/env.sh`).
- **Generation took 36 to 96 s per attempt** at 3315 to 9139 output tokens.
- **Spot reclaim.** A reclaim mid-run made the gateway answer HTTP 403 for
  `pultec-low-boost` attempt 2, which was regenerated with
  `--allow-regeneration` and the reason recorded. The same reclaim had truncated
  `pultec-low-boost` attempt 1 (`finish_reason` `abort`), which had been
  accepted; the acceptance was fixed (`de991fe`), the response quarantined under
  `interrupted/` (`dfe6864`), and the attempt regenerated on a re-provisioned
  cluster (`166b361`, `serving-2/`).
- **Stop-token departure.** vLLM omits the stop token from `text`; the decoded
  response is accepted without it only when `finish_reason` is `stop`, by
  ruling (`45b5168`).
- **Token identity was verified on all fifteen attempts.**
- **Cloud resources are gone.** The cluster was torn down after each run, and
  the model bucket was deleted on 2026-11-10 at the owner's instruction. The
  merge record that was in it is committed under
  `docs/superpowers/plans/2026-11-09-schgen-merge-execution/`.
