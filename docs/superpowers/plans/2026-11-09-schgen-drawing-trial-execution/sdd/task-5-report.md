Task 5 report: the resumable attempt runner

Status: DONE_WITH_CONCERNS. Everything in the brief is built and tested with no live endpoint. The concerns are assumptions that Task 7 has to confirm live, and one departure from the brief, all listed at the end.

Commits, both pushed to origin/ai-schgen:
- 1b27592 "SchGen trial Task 5: in-container extraction, host render and kicad CLIs"
- c8f8348 "SchGen trial Task 5: the resumable attempt runner"

## What was built

### Container side

The runtime image was rebuilt with build.sh. IMAGE_DIGEST is now sha256:d0da9e2e88b819ef034f98cfa1dca587d86190cbf08baa751818600168bd9799.

- runtime/trial/schgen_source.py gains final_channel_regex().
  - It finds the single assignment to `final_block_re` inside SchGen's get_final_python by ast, and evaluates that call with only `re` available.
  - It fails closed, with SchGenSourceError naming the file, when there is not exactly one such assignment.
  - Whether a response "had a final channel" is therefore decided by SchGen's own regex, not a retyped one.
- runtime/trial/extract.py: `python -m trial.extract RAW` prints {final_channel, program}.
  - `program` is always get_final_python's result. With no final channel that is SchGen's whole-response fallback, which is still handed on.
- runtime/tests/test_extract.py: 6 in-container tests.

### Host TypeScript

- render.ts: `bun render.ts SHEET OUT_DIR`.
  - It calls tools/draught/draw-render.ts renderSheet unchanged: kicad-cli PDF and SVG, then magick at 200 dpi from the PDF.
  - It renames the whole-page crop to `<stem>.png`.
  - On a failure, it lists the files kicad-cli did write.
- kicad.ts:
  - `version` refuses any kicad-cli other than 10.0.5, and also refuses an absent magick, so one call checks every host tool.
  - `netlist SHEET OUT` runs kicadsexpr from the repo root, via defaultRunExport.
  - `erc SHEET OUT` writes the report format.
- board-info.ts:
  - `BOARD` prints {board, approved_sheet_sha256 (from approvedSheetDigest, which throws if the sheet is unapproved), model_module}.
  - `--list` prints TRIAL_BOARDS.
- tests/circuits/sheet-model.ts: a new export, modelModuleFor(board). It returns declaredBoard(board).module, with the same manifest check.

### Host Python

All of it lives in tools/schgen-drawing-trial/ and uses the venv.

- persist.py:
  - write_atomic: write to .part, fsync, os.replace, then fsync the directory.
  - persist_response writes response.raw.txt, then response.json, then response.complete holding {file: sha256} for both.
  - response_complete is true only when the marker parses and both digests match.
  - quarantine_incomplete moves any response file or .part into interrupted/<UTC stamp>/ and appends {reason: generation-interrupted, at, moved_to} to reruns.jsonl.
  - reruns.jsonl is append-only and fsync'd. A partial last line raises an error rather than being repaired.
- generation.py:
  - The request body is exactly as the brief gives it, with an X-Request-Id of `schgen-trial-<board>-attempt-<n>-<uuid4>`.
  - The HTTP client is urllib, with a 3600 s ceiling.
  - check_token_identity reads the saved response.json:
    - prompt IDs are compared element by element, and a mismatch names the first differing index; a length mismatch is named the same way;
    - token_ids are decoded with tokenizers (tokenizer.json, checked against SHA256SUMS) with skip_special_tokens=False, and the result must equal the text;
    - when both fields are absent or null, it returns "unverified - count only", provided usage.prompt_tokens equals the number of IDs sent; otherwise it raises;
    - when exactly one of the two fields is present, it raises.
- board_request.py: the per-board request directory. It also has a CLI, `python board_request.py --exec-dir DIR BOARD`.
- host_tools.py: the HostTools protocol and RealHostTools. It is the only place that runs docker, bun, emit.sh and kicad.
- stages.py: the stage functions, classify(), page_produced(), and the readers for symbol instances, netlist components and SVG strings.
- manifest.py: builds manifest.json from files on disk.
- run_attempt.py: the orchestrator and CLI.
  - Usage: `python run_attempt.py --exec-dir DIR BOARD ATTEMPT [--rerun-reason TEXT]`.
  - Exit status: 0 when the manifest is written; 3 on TokenIdentityError, which stops run_all; 1 otherwise.
- run_all.sh: runs the boards in the order `board-info.ts --list` gives, attempts 1 to 3.
  - `--requests-only` prepares the five request directories and stops.
  - It skips any attempt that has manifest.json.
  - It stops at the first non-zero exit; relaunching resumes there.
  - It checks bun, docker, the venv and `kicad.ts version` (kicad-cli 10.0.5 plus magick) before any attempt runs.
  - It never truncates or deletes anything; the caller redirects stdout.

### Pinned dependencies

host-requirements.txt is now the venv's full freeze. It adds tokenizers==0.23.3 (the image lock's pin) and its dependencies, all with == pins.

## How each ruling was applied

1. **Per-board request directory.**
   - `<exec>/<board>/request/` holds request.txt, request.json, fidelity.json and prompt.json, made once per board by board_request.prepare(). Attempt directories hold none of them.
   - Each step works in a scratch directory beside request/ and installs files with write_atomic, so an interrupted step leaves no half-written input.
   - prompt.json is never re-rendered once it exists.
   - The manifest records prompt_sha256 (the sha256 of prompt.json), request_dir (relative to the exec dir) and rendered_date.
2. **Approval gate.**
   - run_attempt calls tools.board_info(board), which runs board-info.ts and so approvedSheetDigest, as the first step after validating the seed: before the request directory is prepared and before any generation.
   - prepare() calls it again.
   - The digest goes into the manifest as approved_sheet_sha256.
   - Tested two ways: test_unapproved_board_refused_before_generation (no client is made), and test_real_board_info_gate (real bun: pultec-mid passes; transistor-preamp-staged is refused).
3. **Outcome and page.**
   - classify() returns the first abnormal stage in pipeline order. The manifest records page_produced separately: the PNG exists and is non-empty, the sheet places at least one symbol, the netlist has components, and the SVG shows the references.
   - A no-final-channel response still goes through extraction (SchGen's fallback), the emitter, render and the rest.
   - test_no_final_channel_classified asserts that the outcome is no-final-channel, that program.py is the whole response, that the emitter received it, and that page_produced is true.
4. **Untrusted code stays in the container.**
   - Extraction runs as `docker run --rm --network none --read-only` with cpus 1, memory 1g, pids 64 and a 16m /tmp. The raw response is bind-mounted read-only.
   - The program runs only through emit.sh.
   - On the host, only the tokenizers library decodes, for the identity check.
   - The prompt and fidelity steps also run in the container with --network none. Their scratch directory is bind-mounted read-write.
5. **Host environment.** Everything runs in the .venv, and host-requirements.txt pins every package with ==.
6. **Fidelity before generation.**
   - prepare() runs `python -m trial.fidelity` before `trial.prompt`.
   - fidelity.json is installed even when fidelity.py exits non-zero.
   - It raises FidelityError unless `equal` is true, so neither a prompt nor a generation happens (test_fidelity_not_equal_refuses).

## Manifest schema, as implemented

- **Identity:**
  - board, attempt, seed, request_id
  - model_module (from the board's perfboard.json, checked by sheet-model.ts)
  - git_revision (HEAD); git_dirty (whether tracked files differ from HEAD)
  - approved_sheet_sha256
- **Code and image:**
  - schgen_commit, parsed from the Dockerfile's ARG SCHGEN_COMMIT, which the build verifies
  - runtime_image_digest, the image ID, checked equal to IMAGE_DIGEST before use
- **Generation-time provenance:** saved in response.json at generation and read back from there, so downstream re-runs need no environment.
  - merged_manifest_sha256, endpoint, vllm_version, vllm_image_digest
- **Prompt, from request/prompt.json:**
  - tokenizer_files_sha256, template_sha256, user_message_template_sha256, rendered_date
  - request_dir, prompt_sha256
- **Response:**
  - raw_response_sha256
  - sampling: the request body minus the prompt, so it includes model and seed
  - prompt_tokens (usage.prompt_tokens), output_tokens (usage.completion_tokens)
  - finish_reason, latency_s
  - token_identity: "verified" or "unverified - count only"
- **Downstream:**
  - emitter_fixes (line 1 of emitter.log)
  - kicad_cli_version
  - outcome, outcome_detail, limit (null unless limit-exceeded), failure_stage (null for page)
  - page_produced
  - stage_status: {extraction, emitter, render, netlist, erc, compare} → ok | failed | not-run
  - downstream_reruns: the lines of reruns.jsonl, each {reason, at, plus moved_to or previous}

The keys added beyond the brief are request_id, git_dirty, runtime_image_digest, user_message_template_sha256, rendered_date, request_dir, endpoint, token_identity, outcome_detail, limit, page_produced and stage_status.

Other files in each attempt directory, besides the brief's list (whose request files now live in the shared request/):
- extraction.json
- stages.json
- page.svg
- reruns.jsonl, when anything was re-run
- interrupted/ and downstream-previous/, when used
- response.complete

## Classification order

Each rule is checked in turn, and the first that applies gives the outcome. An outcome's failure_stage is shown in parentheses.

1. The extraction container failed: tooling-failed (extraction).
2. final_channel is false: no-final-channel (extraction).
3. The program is empty: no-program (extraction).
4. The emitter did not exit 0:
   - if the last line of emitter.log is `LIMIT: x`: limit-exceeded, with limit x;
   - if there is no fixes line 1: tooling-failed;
   - if the log has EmitterSetupError or an `emit.sh:` line: tooling-failed;
   - if the traceback has a `File "/in/program.py"` frame, or "Cannot find import line": program-raised;
   - otherwise: tooling-failed.
5. The emitter exited 0 but there is no sheet: tooling-failed.
6. The sheet places no symbol (no `(lib_id` occurrence): symbol-free-sheet.
7. The netlist stage succeeded but the netlist has 0 components: blank-render (netlist). This is checked before the render's own status; see Concerns.
8. Render or netlist failed: tooling-failed.
9. Some sheet references exist but none appears in the SVG text: blank-render (render).
10. ERC or compare failed: tooling-failed.
11. Otherwise: page.

## TDD evidence

- **Container extraction.** RED: `docker run ... -v runtime:/trial:ro schgen-runtime:0707520c pytest /trial/tests/test_extract.py` gave `ImportError: cannot import name 'extract' from 'trial'` (collection error). GREEN: 6 passed. After the rebuild, test_extract.py plus test_prompt.py with the documented runtime bind mount gave 41 passed.
  - Without the mount, 5 test_prompt cases fail because .dockerignore keeps page_data.json out of the image by design. Task 4's tests are always run with the mount.
- **render.test.ts.** RED with render.ts absent: 0 pass, 1 fail, 1 error (module not found). GREEN: 2 pass.
- **Host Python.** RED: with the seven host modules moved aside, pytest gave `ERROR tests/test_stages.py` (collection, ImportError).
  - I drafted the host modules before writing these tests, so that RED is "the module is missing" rather than a behavioural RED. I am saying so plainly.
  - The first full run had a genuine behavioural failure: test_blank_render failed, with tooling-failed observed where blank-render was expected. Diagnosis: on the nil-UUID sheet, kicad-cli's SVG export exits 0 but writes `Schematic.svg`, not `page.svg`, so renderSheet reports a failure. The fix was the classify reorder in rule 7. Final: 26 passed.
- **Regression:**
  - test_emitter.py (Task 1) against the rebuilt image: 30 passed.
  - `bun test tests/schgen-trial/`: 47 pass.
  - `bun run typecheck`: clean.
  - Changed files were checked by counting bytes: no NUL or CR.
- **Manual end-to-end smoke** (not committed): a saved synthetic response whose final channel holds the 2026-10-29 hand-written pultec_low_boost program, run through RealHostTools against a scratch exec dir. It went through real board-info, real request, fidelity and prompt in the container, real extraction, emit.sh, render, netlist, ERC and compare.
  - Result: outcome page, every stage ok, the fixes recorded, runtime_image_digest and kicad 10.0.5 recorded, about 16 s downstream.
  - The request directory took 49 s; fidelity was equal, with 4638 tokens, matching Task 4.
  - A second run without a reason raised RerunReasonRequired. With a reason it appended the reason and moved the earlier outputs to downstream-previous/.
  - The identity check also caught a count mismatch in my first smoke, where the synthetic usage said 19 tokens against the 4638 sent.

Tests and what each covers:
- **test_stages.py**, 20 tests:
  - the 12 named in the brief
  - test_real_sheet_is_a_page: the control for the blank and symbol-free tests
  - test_token_ids_verified
  - test_no_token_ids_and_wrong_count_stops
  - test_generation_refuses_without_provenance
  - test_unapproved_board_refused_before_generation
  - test_fidelity_not_equal_refuses
  - test_attempt_out_of_range_refused
  - test_real_board_info_gate
- **test_classify.py**, 6 emitter-log cases: limit, program frame, no import line, no fixes line, setup error, an `emit.sh:` line.
- **Real tools used in tests:**
  - container extraction, in no_final_channel;
  - kicad-cli, render.ts and compare.ts, in symbol_free, blank_render and real_sheet;
  - bun board-info, in real_board_info_gate.

The token tests use a real localhost http.server through HttpCompletionsClient, and assert the request body and the X-Request-Id header.

## Files changed

New:
- tools/schgen-drawing-trial/{run_attempt.py, stages.py, generation.py, persist.py, manifest.py, board_request.py, host_tools.py, run_all.sh, render.ts, kicad.ts, board-info.ts}
- tools/schgen-drawing-trial/tests/{conftest.py, trial_fakes.py, test_stages.py, test_classify.py}
- tools/schgen-drawing-trial/runtime/trial/extract.py, runtime/tests/test_extract.py
- tests/schgen-trial/render.test.ts

Modified:
- tools/schgen-drawing-trial/runtime/trial/schgen_source.py (final_channel_regex)
- runtime/IMAGE_DIGEST
- host-requirements.txt
- tests/circuits/sheet-model.ts (modelModuleFor)

Every file is under 250 lines.

## Self-review

- No defaults for missing inputs:
  - The generation provenance environment variables are required; there is no default endpoint (see Concerns).
  - A re-run reason is required.
  - Seeds are fixed, and an attempt outside 1 to 3 is refused.
  - A missing tool or a wrong image ID raises.
- A complete response is never regenerated. An incomplete one is quarantined, never deleted. Earlier downstream outputs are moved, never deleted.
- The identity check runs from disk every time. A mismatch leaves the response saved, writes no manifest, and stops run_all with exit 3.
- No SchGen code runs on the host. final_channel_regex evaluates SchGen's regex expression inside the container only (extract.py), so the host never runs it.
- TypeScript: no `any`, no `as` and no ts-ignore; explicit relative `.ts` imports, matching the repo convention.
- Python test code uses `# type: ignore` in three places, for fakes passed where the protocol is expected.
- No drawing vocabulary is used in code or in this report.

## Concerns

1. **Departure: TRIAL_ENDPOINT has no default.** The brief says it defaults to http://localhost:18000. The binding rules forbid defaults for missing inputs, so run_attempt refuses when TRIAL_ENDPOINT is unset, as it does for TRIAL_MERGED_MANIFEST_SHA256, TRIAL_VLLM_VERSION and TRIAL_VLLM_IMAGE_DIGEST. These four are needed only when a generation is about to happen. Task 7 must export all four, for example TRIAL_ENDPOINT=http://localhost:18000 after the port-forward.
2. **Unproven assumption: vLLM's field names.** I assume vLLM 0.32 returns the IDs as `choices[0].prompt_token_ids` and `choices[0].token_ids` when `return_token_ids` is true. This is from my knowledge of vLLM's API, not verified against the pinned deployment. Task 6's smoke and Task 7 step 3 must confirm the names. If they differ, a live response would read as "absent" (count-only) where it should be checked.
3. **Observation: the nil-UUID class fails the render step.** kicad-cli's SVG export exits 0 and writes `Schematic.svg`, not `<stem>.svg`, so renderSheet reports a failure. classify therefore checks for an empty netlist export before the render's status: the outcome is blank-render, and stage_status.render is "failed". In that case no PNG exists, though the PDF of the empty frame is kept. The emitter's root_uuid fix should prevent this class in the real run.
4. **The program-raised versus tooling-failed boundary is a heuristic over emitter.log.** It looks for a program.py frame or SchGen's "Cannot find import line". A program missing SchGen's import line is classified program-raised, because SchGen's own init_project raises the same error. The detail string and the full log are kept either way.
5. **A downstream run that was interrupted part-way** (a response present, no manifest) has its partial outputs moved to downstream-previous/. It is recorded in downstream_reruns with reason "downstream-interrupted", so that list can contain entries the operator did not request.
6. **run_all.sh was not run end to end.** Doing so would write the real execution directory (Task 7 step 1), and it would fix today's date into the prompts ahead of the run. It is syntax-checked, and each of its steps was exercised (board-info --list, board_request.py, run_attempt.py).
7. **The compare stage runs on an empty netlist** in the blank-render case. It reports every model part missing and exits 0. It is kept as a recorded observation; it is not an outcome.
8. **Session-only environment workaround, not committed.** The image build used an empty DOCKER_CONFIG and a PATH shim containing only `docker`. This avoids the keychain helper hang; /usr/local/bin holds both docker and the helper, so the directory could not simply be dropped from PATH.

## Fix round 1

This round answers task-5-review.md. Commit: see the reply (one commit, pushed to ai-schgen).

### What changed

- **I1, count-only is never silent.** The checks moved out of generation.py into a new token_identity.py.
  - When neither `choices[0].prompt_token_ids` nor `choices[0].token_ids` is present, TokenIdentityError is raised and the run exits 3. It continues only when `TRIAL_ACCEPT_COUNT_ONLY=1` is set. Any other non-empty value is refused, too.
  - With the flag set, the count must still equal the IDs sent.
  - The manifest gains `count_only_acknowledged` (bool).
  - Before any other check, the body is walked for every key containing `token_ids`. Any such path other than the expected two is refused by name.
  - `run_attempt.summary_line` puts `token_identity` on each attempt's run-log line.
- **I2, a failed netlist export never hides a page.**
  - In `blank_reason`, an empty netlist counts only when stages.json records the netlist stage as `ok`. `page_produced` goes through `blank_reason`, so it is fixed too.
  - With the netlist failing and the render succeeding, the result is now `tooling-failed` (netlist) with `page_produced` true.
- **M1.** run_all.sh assigns `kicad_version="$(bun kicad.ts version)"` on its own line, so `set -e` stops the run when the check fails. I confirmed the bash behaviour: `v="$(false)"` exits under `set -e`.
- **M2, a lost request is recorded.**
  - Before the POST, `request.sent` holding {request_id, seed, at} is written atomically.
  - The client now returns (status, bytes). `generation.parse_completion` raises RejectedPayload for a non-200 status, a body that is not JSON, a body that is not an object, a body without exactly one choice, or a choice without a text string.
  - run_attempt keeps such a payload in `rejected/<stamp>/` (response.body, plus rejection.json with request_id, status and reason). It then raises GenerationError, so run_attempt exits 1 and run_all stops.
  - On the next run, quarantine moves `request.sent` into `interrupted/<stamp>/`, where the marker is kept. If no response file exists it records `generation-lost`, with the old request_id. If response files exist it records `generation-interrupted`. Either way it regenerates once.
  - Provenance is now checked before quarantining, so a refusal over a missing environment variable moves nothing.
- **M3, prompt.json is bound to the fidelity check.**
  - Container side: `trial.prompt.ids_sha256` is the sha256 of the IDs as compact JSON. fidelity.check now returns `ours_ids_sha256` and `rendered_date` from the same render it compares.
  - The image was rebuilt, and IMAGE_DIGEST is now `sha256:a6e23571d370f0af74ccd4950f066349279fac5c2fef28c61867c0ad607049a5`.
  - Host side: board_request computes the same digest. `check_prompt_bound` runs at the end of every `prepare`, which means on every attempt, and refuses with FidelityError when the IDs or the date do not match.
- **M4, details carry no cause.** Emitter details now say what emitter.log shows:
  - "emitter.log has no fixes line 1";
  - "emitter.log reports: <the first emit.sh: or EmitterSetupError line>";
  - "no frame of /in/program.py appears in emitter.log".
  The ambiguous case still gets the label `tooling-failed`, as the review allows.
- **M5.** `stages.stray_render_outputs` returns any `*.svg` other than page.svg, plus `crops/`. A re-run moves these to downstream-previous/ along with the other outputs.
- **M6.** `"spaces_between_special_tokens": false` is added to the request body. generation.py's module comment records it as a departure from the brief's body, made by controller ruling, with the reason.

### Tests

New file test_fix_round1.py, 10 tests:
- request.sent is written before the POST;
- a sent request with no response is recorded as lost;
- an HTTP 500 body is kept, and the next run records generation-lost;
- three 200 payloads that are not completions are each kept;
- a netlist failure does not hide the page;
- prompt.json not bound to fidelity is refused, once for the ids digest and once for the date.

Additions to test_stages.py:
- the request-body test now includes `spaces_between_special_tokens`;
- the qualified (count-only) test sets the flag and asserts the acknowledgement and the log line;
- the wrong-count test sets the flag;
- new: no IDs without the acknowledgement stops the run; IDs at another path (top-level `prompt_token_ids`) are refused; a verified attempt records no acknowledgement.

test_classify.py gains an ambiguous no-program-frame case. Every case now asserts its detail text, and that the detail contains none of: harness, not the program, defect, fault, because.

The fakes changed in two ways: a saved response now carries matching IDs, so the verified path is the default; and CountingClient returns (status, bytes).

### RED evidence

All of this round's tests passed on their first run against the fixed code. To show that each one detects its defect, I ran a scratch script, `revert_check.py`. It reverts each fix in turn, runs the covering test, and restores the file; git status confirmed every file was restored.

| reverted fix | covering test(s) |
| --- | --- |
| I2 netlist guard | 1 failed |
| I1 acknowledgement | 1 failed |
| I1 stray-key scan | 1 failed |
| M2 request.sent | 1 failed |
| M2 rejected kept | 3 failed |
| M3 binding | 2 failed |
| M4 detail | 2 failed, 5 passed |
| M5 stray outputs | 1 failed |
| M6 flag | 1 failed |

Container side, M3: a true RED, with `AttributeError` on 6 tests (5 test_fidelity_equal plus test_ids_sha256_is_compact_json), then GREEN.

### GREEN

- Host pytest: 40 passed.
- `bun test tests/schgen-trial/`: 47 pass.
- typecheck: clean.
- In-container test_prompt plus test_extract against the rebuilt image (runtime mount): 42 passed.
- test_emitter.py against the rebuilt image: see the reply.
- `bash -n run_all.sh`: ok.
- No NUL or CR bytes, checked by counting.

Real-tool smoke, in a fresh scratch exec dir:
- The real board_request made fidelity.json with ours_ids_sha256 4c678bfb..., and the host's binding check accepted the real prompt.json.
- The full chain on a saved response with matching IDs gave outcome page, token_identity verified, count_only_acknowledged false, and the new image ID.

### Concerns left

- The vLLM field names are still unverified until Task 6/7. A wrong name now stops the run instead of degrading it: either it shows up as a stray token_ids key, or both expected fields are absent.
- Task 7 must decide on TRIAL_ACCEPT_COUNT_ONLY explicitly if the gateway returns no IDs, and record that in the README.
- If midnight UTC passes between the fidelity call and the prompt call, prepare refuses. The message says to move both files aside and run again, before any attempt has generated.
- Every rejected payload stops run_all, and each relaunch then sends the same seed once more and records generation-lost. Nothing limits how many times that can repeat; each repeat is recorded. (Resolved in fix round 2, N2.)

## Fix round 2

This round answers task-5-rereview.md. Commit: 09dc205, pushed to ai-schgen.

### What changed

- **N2: regeneration is bounded across relaunches.** `run_attempt.check_regeneration_allowed` runs in `ensure_response` after the provenance check and before anything is moved. It refuses with RegenerationRefused (run_attempt exits 4, which stops run_all) in two cases:
  - reruns.jsonl already records one or more `generation-lost` or `generation-interrupted` entries for the attempt;
  - the pending request.sent's request_id has a rejection kept under rejected/ whose HTTP status is 4xx (`persist.pending_rejection_status`).

  `--allow-regeneration REASON` lets the send go ahead, and appends `{reason: "regeneration-allowed", operator_reason: REASON}` to reruns.jsonl.

  The brief's one automatic regeneration is kept: the first interruption, or the first loss after a 5xx or a dropped connection, is resent once without the flag. A 4xx is never resent automatically. run_all.sh never passes the flag, and its header says how to run the attempt by hand.
- **N1: a missing SVG never withholds a PNG.** blank_reason's SVG branch now applies only when the render stage is `ok` and page.svg exists, so a PNG is no longer withheld because page.svg is missing.
- **N3: an unreadable request.sent is recorded.** `persist.sent_request_id` returns the literal "request_id unreadable" when request.sent cannot be parsed or has no request_id string. The generation-lost entry carries that value, so the request id is never silently dropped.
- **N4: `count_only_acknowledged` now records whether the count-only path was used.** It is true only when `token_identity` is "unverified - count only"; that path requires the flag. A new key, `accept_count_only_env`, records the flag's value.

### Tests

New file: test_fix_round2.py, 6 tests.
- **Second relaunch after a rejection is refused.** The scenario is a 503, then the automatic resend, which is also 503. The next relaunch raises RegenerationRefused, the client is never called, and request.sent stays in place.
- **A 4xx is never resent automatically.** After a 400, the next relaunch raises RegenerationRefused with "HTTP 400", and the client is never called.
- **`--allow-regeneration` sends once and records it.** The send happens exactly once. The reruns list is [regeneration-allowed, generation-lost], and the operator's reason is recorded.
- **A PNG with no SVG is still a page.**
- **An unreadable request.sent is said.**
- **`count_only_acknowledged` means the path was used.** A verified attempt with the flag set gives (verified, False, True). A count-only attempt gives True.

### RED evidence

All of these tests passed on their first run. As in round 1, I reverted each fix in turn, ran its test and restored the file (scratch script revert_check2.py). Each of N2 bound, N2 4xx, N2 record, N1, N3 and N4 gave 1 failed when reverted.

### GREEN

- Host pytest: 46 passed.
- `bun test tests/schgen-trial/`: 47 pass.
- typecheck: clean.
- `bash -n run_all.sh`: ok.
- Byte count: no NUL or CR.
- No container code was touched, so the image is unchanged.

### Concerns

- An attempt whose own regeneration is lost, for example a second Spot reclaim, now needs a person to run run_attempt.py with --allow-regeneration before run_all can get past it. This is deliberate, but it can stall a nohup run until someone looks.
- A rejected/ entry with an unreadable rejection.json would raise in `pending_rejection_status` (JSONDecodeError). That is loud, not silent, but its message is Python's own rather than a named refusal.

## Live fix: the stop token (preflight, 2026-11-10)

Commit 45b5168.

**Finding.** vLLM 0.32 keeps the stop token in `token_ids` but leaves it out of `text`. On pultec-hi-boost attempt 1 the decoded text ended `<|return|>`, the returned text ended without it, and the identity check stopped the run with exit 3.

**What changed, by controller ruling:**
- **Extraction reads the decoded IDs.** Extraction now reads `response.decoded.txt`. That file is `decode(token_ids, skip_special_tokens=False)` with the pinned tokenizer, as SchGen's generate.py:150 decodes, and it is written atomically on every run.
  - response.raw.txt and response.json are untouched.
  - The manifest gains `extraction_input` and `extraction_input_sha256`, beside raw_response_sha256.
  - An acknowledged count-only attempt has no IDs to decode, so its extraction reads response.raw.txt. The manifest says so.
- **The identity check accepts one difference.** It is accepted only when finish_reason is `stop`, and only when the decoded text equals the returned text followed by one or more stop-token strings.
  - The stop strings are the `eos_token_id` of the merged model's generation_config.json ([200002, 199999, 200012] → `<|return|>`, `<|endoftext|>`, `<|call|>`).
  - That file is pinned at tools/schgen-drawing-trial/model/generation_config.json and refused unless its sha256 is 1fdf6869...8b7f. That digest is the one the bucket's MANIFEST.sha256 lists.
  - Any other difference still exits 3.
  - The manifest records `text_vs_decoded`: "equal" or "stop-token-omitted-by-server".

**Tests.** test_stop_token.py has 7 tests:
- the stop strings are the ones from the generation config;
- a trailing `<|return|>` omitted with finish_reason stop is accepted;
- extraction receives the decoded text;
- the same omission with finish_reason length is refused;
- a mid-text difference is refused;
- a trailing `<|end|>`, which is not a stop token, is refused;
- equal text is recorded as "equal".

The one existing test whose expected message changed was updated. Results: host pytest 56 passed, and `bun test tests/schgen-trial/` 47 pass. When reverted, the acceptance, the finish_reason gate and the decoded input each failed their test.

**Downstream on the saved preflight response.** response.complete was confirmed before the run, and nothing was generated.
- outcome program-raised, failure_stage emitter, page_produced false.
- latency_s 57.119, output_tokens 5382, finish_reason stop.
- token_identity verified, text_vs_decoded stop-token-omitted-by-server.
- There is no page.png.
- The traceback is in the model's program. It calls `connect_pins` on C8, but no `add_schematic_symbol` call has `reference="C8"`, while the request lists C8. That places the failure in the program's stage, not in tooling, so no downstream re-run was made.

**Note for diagnostics.** Traceback line numbers in emitter.log are one higher than the lines in program.py. run_emitter.py inserts a `set_schematic_filename` line after SchGen's import line, so the traceback's line 226 is program.py's line 225.
