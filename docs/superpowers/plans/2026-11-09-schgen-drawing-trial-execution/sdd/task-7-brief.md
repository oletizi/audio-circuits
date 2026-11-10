### Task 7: The run

**Files:**
- Create: `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/README.md` (what the record is, per the repository rule)

- [ ] **Step 1:** Run `bash tools/schgen-drawing-trial/run_all.sh --requests-only`. It needs no GPU, and builds one request and one prompt per board under `<execution dir>/<board>/request/` (`request.txt`, `request.json`, `prompt.json`, `fidelity.json`). Expect five, each with `equal: true`. The three attempts per board read that one shared prompt and write only under their own `attempt-<n>/`. The runner refuses to write into an `attempt-<n>/` that already holds `response.complete`, except for downstream files.
- [ ] **Step 2:** `probe-capacity.sh` across the candidate zones; set `env.sh` to the zone found; `cluster-up.sh`; `install-kinference.sh`; deploy vLLM; `apply-kinference.sh 16`, re-measuring the block size from the vLLM log first and refusing if it is not 16.
- [ ] **Step 3:** Run `smoke.sh completions` through the gateway. Act on its result:
  - **Exit 0:** proceed.
  - **Exit 2** (`return_token_ids unsupported`): proceed in the qualified mode, and record the limitation in the README.
  - **The route itself fails:** run the same smoke direct to `svc/schgen-merged:8000`. Point `TRIAL_ENDPOINT` there and record the departure in the README.
  - **Token IDs differ through the gateway but match direct:** that is a Kinference finding. Record it, and run direct.
- [ ] **Step 3a:** Confirm `runtime/IMAGE_DIGEST` equals `docker image inspect schgen-runtime:0707520c --format '{{.Id}}'`.
- [ ] **Step 4: Preflight.** Under `nohup`, run `run_attempt.py` for attempt 1 of the first board in run order. Read its manifest: latency, output tokens, outcome. Fix any tooling failure and re-run downstream on the same response. Write the measured latency into the README, and from it the expected batch duration.
- [ ] **Step 5:** Run `nohup bash tools/schgen-drawing-trial/run_all.sh > run.log 2>&1 &`. Watch for completion with a background poller, not with sleeps.
- [ ] **Step 6:** `capture-record.sh` into the execution directory; then `gpu-scale.sh 0` and `down.sh` (bucket kept). Verify with `gcloud container clusters list` (empty) and `gcloud compute instances list` (empty).
- [ ] **Step 7: Commit and push** the whole execution directory.

