### Task 5: The resumable attempt runner

**Files:**
- Create: `tools/schgen-drawing-trial/run_attempt.py`, `tools/schgen-drawing-trial/stages.py`
- Create: `tools/schgen-drawing-trial/render.ts` (CLI over the repository's own `renderSheet` in `tools/draught/draw-render.ts`: `kicad-cli sch export pdf` and `svg`, then `magick` to PNG. This is the same path the approved pages were rasterised with; **`kicad-cli` 10.0.5 has no `sch export png`**, checked with `kicad-cli sch export --help` 2026-11-09.)
- Test: `tests/schgen-trial/render.test.ts` (host integration on the installed KiCad 10.0.5: render an approved Pultec sheet; assert a PDF, an SVG and a PNG exist; that the PNG's non-white bounding box spans more than half the page in both axes; and that the SVG contains every designator in the sheet's netlist, so nothing was clipped)
- Create: `tools/schgen-drawing-trial/run_all.sh` (all boards and attempts in the fixed order, `nohup`-safe, idempotent)
- Test: `tools/schgen-drawing-trial/tests/test_stages.py` (host pytest; fixtures may be synthetic responses, this being test code)

**Interfaces:**
- Consumes: Tasks 1-4 CLIs; the gateway at `$TRIAL_ENDPOINT` (default `http://localhost:18000`, port-forwarded as `smoke.sh` does).
- Produces: attempt directory `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/<board>/attempt-<n>/` holding `request.txt`, `request.json`, `prompt.json`, `response.raw.txt`, `response.json` (usage, `finish_reason`, latency seconds), `program.py`, `page.kicad_sch`, `page.png`, `page.pdf`, `page.net`, `page.erc.rpt`, `compare.json`, `emitter.log`, `manifest.json`.
- Produces: `stages.classify(attempt_dir) -> Outcome`. **Outcomes name the stage observed, not the cause.** `program-raised` says the program raised while it ran; it does not say whose defect it was, since a valid program can hit an emitter defect. The traceback and the active fixes are kept, and cause is left to the diagnostics after the owner's verdict. The values:
  - `page`
  - `no-final-channel` (the program may still have been extracted by the fallback)
  - `no-program`
  - `program-raised`
  - `limit-exceeded` (carrying the `LIMIT:` name)
  - `tooling-failed`
  - `symbol-free-sheet`: the sheet is valid but has no symbol instances
  - `blank-render`: the sheet has symbol instances but the render or exported netlist is empty, which is the nil-UUID class
- `manifest.json` keys (spec, "Provenance and resumability"): `board`, `attempt`, `seed`, `model_module`, `git_revision`, `approved_sheet_sha256`, `schgen_commit`, `merged_manifest_sha256`, `tokenizer_files_sha256`, `template_sha256`, `vllm_version`, `vllm_image_digest`, `prompt_sha256`, `raw_response_sha256`, `sampling`, `prompt_tokens`, `output_tokens`, `finish_reason`, `latency_s`, `emitter_fixes`, `kicad_cli_version`, `outcome`, `failure_stage`, `downstream_reruns` (list of `{reason, at}`).

**The generation request body** is `{"model": "schgen-merged", "prompt": <ids>, "max_tokens": 13312, "temperature": 1.0, "top_k": 50, "top_p": 1.0, "seed": <seed>, "skip_special_tokens": false, "return_token_ids": true}`, with a unique `X-Request-Id` per attempt.

**Token identity, not token count.** vLLM's `return_token_ids` returns the prompt token IDs it consumed and the generated token IDs.
- The runner asserts the returned prompt IDs equal the IDs sent, element by element. A mismatch stops the run, naming the first differing index.
- It asserts that decoding the returned generated IDs with special tokens kept equals the `text` returned, so the harmony markers `get_final_python` needs were not stripped.
- Both checks need the field, and Task 7 step 3 proves it is present through the gateway on the pinned deployment.
- **If the field is absent, the run does not claim token-level fidelity.** It records `token_identity: "unverified - count only"` in every manifest and names the limitation in the README and the findings. Only after that may it continue on count equality.

**Persistence is atomic.**
- Each artifact is written to `<name>.part`, then `fsync`'d, then renamed into place.
- `response.raw.txt` and `response.json` are written first. `response.complete` is written last and holds both files' sha256.
- **An attempt counts as generated only when `response.complete` exists and its digests match the files.** A `.part` file, or a response with no valid marker, means the outcome is unknown.
- In that case the incomplete files are moved to `interrupted/<timestamp>/` (kept, never deleted) and the attempt is generated again once, with the same seed. The interruption is recorded in `downstream_reruns` with reason `generation-interrupted`.
- That one regeneration is not a resample: no response for the attempt was ever completed, so none was seen or discarded.

- [ ] **Step 1: Write the failing tests:**
  - `test_saved_response_is_not_regenerated`: with `response.raw.txt` present, `run_attempt` makes no HTTP call (inject a client that fails if called) and runs downstream.
  - `test_missing_response_is_generated_once`: with no response, exactly one call; the response is written before extraction runs.
  - `test_no_final_channel_classified`: a response with no `final` channel → outcome `no-final-channel`, `program.py` still written from SchGen's fallback, and the emitter still tried.
  - `test_length_cutoff_recorded`: `finish_reason: length` is in the manifest and does not by itself fail the attempt.
  - `test_symbol_free_sheet`: a well-formed sheet with zero symbol instances is classified `symbol-free-sheet`.
  - `test_blank_render`: a sheet with symbol instances but an empty exported netlist (the nil-UUID fixture from the 2026-10-29 trial) is classified `blank-render`.
  - `test_partial_response_is_not_complete`: a `response.raw.txt.part` with no `response.complete` makes the attempt ungenerated. The partial is moved to `interrupted/`, generation runs once, and the manifest records `generation-interrupted`.
  - `test_marker_digest_mismatch`: a `response.complete` whose digest does not match `response.raw.txt` is treated the same as no marker.
  - `test_prompt_ids_mismatch_stops`: a fake server returning prompt IDs that differ at index 7 raises an error naming index 7.
  - `test_special_tokens_stripped_stops`: a fake server whose `text` lacks markers its returned IDs decode to raises an error.
  - `test_no_token_ids_field_is_qualified`: a fake server without `return_token_ids` support produces `token_identity: "unverified - count only"` and does not raise.
  - `test_downstream_rerun_recorded`: re-running downstream appends to `downstream_reruns` and leaves `raw_response_sha256` unchanged.
- [ ] **Step 2: Run** `python -m pytest -q tools/schgen-drawing-trial/tests` → FAIL.
- [ ] **Step 3: Implement** `stages.py` (one function per stage, each a pure function of files on disk except `generate`), `run_attempt.py`, `run_all.sh`, `render.ts`. Render with `render.ts`; export the netlist with `kicad-cli sch export netlist`; run ERC with `kicad-cli sch erc`.
- [ ] **Step 4: Run** `python -m pytest -q tools/schgen-drawing-trial/tests && bun test tests/schgen-trial/render.test.ts`. Expect all to pass.
- [ ] **Step 5: Commit.**

