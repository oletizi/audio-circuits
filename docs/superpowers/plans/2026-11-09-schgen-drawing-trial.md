# SchGen Drawing Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three SchGen attempts at each of the five approved Pultec boards, every attempt a rendered page or a neutral "no schematic generated" card, shown to the owner beside the approved page, with full provenance committed.

**Architecture:** TypeScript (bun) owns everything that reads the circuit model: the request generator and the netlist comparison. One Docker image (`schgen-runtime`) owns everything that runs SchGen's Python: symbol context, prompt token IDs, the fidelity check, extraction, and the emitter, with the network off for the emitter. The host's `kicad-cli` 10.0.5 renders, exports and runs ERC. A resumable Python runner on the host strings the stages together and talks to vLLM through the Kinference gateway.

**Tech Stack:** bun + TypeScript (repo standard, `bun test`); Python 3.12 in Docker (pytest); transformers 5.22.2 tokenizer only; SchGen at `0707520c587984651cd32908acfd9b117876e93b`; kicad-skip 0.2.5, sexpdata 1.0.0; KiCad 10.0.5 `kicad-cli` on macOS; GKE + vLLM v0.32.0 + Kinference from `tools/schgen-serving/`.

**Spec:** `docs/superpowers/specs/2026-11-09-schgen-drawing-trial-design.md` (approved). Executors read it before starting; it is the authority on every rule below.

## Global Constraints

- Boards: `pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`, `pultec-mid`; refuse any whose `drafted/pultec/<board>/<board>.generated-do-not-edit.kicad_sch` sha256 is absent from `docs/schematic/verdicts.md`.
- Three attempts per board; seeds 42, 43, 44 for attempts 1, 2, 3.
- Sampling sent explicitly: `temperature=1.0, top_k=50, top_p=1.0, max_tokens=13312`. Prompt sent as token IDs to `/v1/completions`, with `skip_special_tokens=false`.
- SchGen pinned at `0707520c587984651cd32908acfd9b117876e93b`; its user-message template and `get_final_python` are taken from its source, never retyped.
- Symbols: the model's intended symbol per component, plus `power:GND`; never `copperhead_power:*`, never `PWR_FLAG`.
- No request text is hand-written; the request generator opens no `.kicad_sch`.
- An attempt with a saved raw response is never regenerated.
- Model-written programs run only inside the container with `--network none`.
- Render, netlist and ERC use the host `kicad-cli` 10.0.5.
- No agent verdict vocabulary about any page (`EVALUATING-DRAWINGS.md` §2); every attempt shown, none withheld, none ranked.
- Failure cards read exactly `Attempt N: no schematic generated`.
- Repo rules: no git hooks, no `--no-verify`, no AI attribution in commits, no `sed` writes, no `#` inside multi-line quoted bash arguments, long work under `nohup`, commit and push after each task.

## Review Focus

1. **A response with no `final` channel** - SchGen's extractor silently falls back to the whole response; expect the attempt classified `no-final-channel` and the fallback's program still tried and recorded, not silently treated as a clean extraction. Test in Task 5.
2. **A response cut off at `max_tokens`** (`finish_reason: length`) - expect it recorded, extraction attempted, and the page (if any) shown like any other. Test in Task 5.
3. **A program that writes a sheet with zero symbols** (the nil-UUID class of blank page, or a program that places nothing) - expect `blank-page`, a neutral card for the owner, and the sheet kept. Test in Task 5.
4. **A Spot node reclaimed mid-request** - expect the attempt to have no raw response, a relaunch to regenerate only that attempt, and all others untouched. Test in Task 5.
5. **A program that never terminates or floods the disk** - expect the container's time and size limits to stop it and the attempt classified `program-raised` with the limit named. Test in Task 1.

---

### Task 1: The `schgen-runtime` image and the four emitter fixes

**Files:**
- Create: `tools/schgen-drawing-trial/runtime/Dockerfile`
- Create: `tools/schgen-drawing-trial/runtime/requirements.txt` (pinned: `transformers==5.22.2`, `tokenizers`, `kicad-skip==0.2.5`, `sexpdata==1.0.0`, `pytest`, plus whatever SchGen's emitter imports, each pinned)
- Create: `tools/schgen-drawing-trial/runtime/fixes/build_repo.py` (copied from `docs/research/2026-10-29-trial-microsoft-schgen/scripts/build_repo.py`, symbol dir a parameter)
- Create: `tools/schgen-drawing-trial/runtime/fixes/run_emitter.py` (from that trial's `run_like_init_project.py`, plus the pin-extraction patch applied before the program is executed)
- Create: `tools/schgen-drawing-trial/runtime/build.sh`, `tools/schgen-drawing-trial/runtime/emit.sh`
- Test: `tools/schgen-drawing-trial/runtime/tests/test_emitter.py`

**Interfaces:**
- Produces: image `schgen-runtime:0707520c`; `emit.sh PROGRAM.py OUT_DIR` writes `OUT_DIR/page.kicad_sch` and `OUT_DIR/emitter.log`, exit 0 on success, non-zero with the original traceback in the log otherwise. Runs `docker run --network none --read-only` with KiCad's symbol directory mounted read-only, `OUT_DIR` the only writable mount, `--cpus 2 --memory 4g`, `--pids-limit 256`, a 300 s wall limit, and an output size limit of 50 MB.
- Produces: `fixes_applied()` in `run_emitter.py` returning `["component_repository", "pin_extraction", "root_uuid", "skip_get_fp"]`, written into the log's first line as JSON.

- [ ] **Step 1: Write the failing tests** in `test_emitter.py`:
  - `test_imu_example_draws`: emit SchGen's own `schematic_generation/sch_examples/imu_L1.py`; assert exit 0, and that the sheet has at least one `(symbol (lib_id` instance.
  - `test_pin_fix_is_injected_not_written`: after emitting, assert the program file's bytes are unchanged (sha256 before = after).
  - `test_runaway_program_is_stopped`: emit a program that is `while True: pass`; assert non-zero exit and that the log names the time limit.
  - `test_no_network`: emit a program that opens a socket to `1.1.1.1:53`; assert non-zero exit and an `OSError` traceback in the log.
- [ ] **Step 2: Run** `bash tools/schgen-drawing-trial/runtime/build.sh && docker run --rm schgen-runtime:0707520c pytest -q /trial/tests` → expect FAIL (no emitter).
- [ ] **Step 3: Implement** the Dockerfile (clone SchGen at the pinned commit; `build_repo.py` at build time against the mounted KiCad 10.0.5 symbol dir, or at first run if the build cannot see it), `run_emitter.py`, `emit.sh`. The root-UUID and `get_fp` fixes are as `run_like_init_project.py` already does them; the pin fix is the `_extract_pins_all_children` replacement from `docs/research/2026-10-29-trial-microsoft-schgen/pultec_low_boost.schgen.py`, applied to `modules.utils.kicad_add_symbol` before the program is executed.
- [ ] **Step 4: Run** the Step 2 command → expect 4 passed.
- [ ] **Step 5: Commit** `tools/schgen-drawing-trial/runtime/`.

### Task 2: The request generator, from the model only

**Files:**
- Modify: `lib/kicad/sheet-agreement.ts` (export `intendedSymbol`; no behaviour change)
- Create: `tools/schgen-drawing-trial/request.ts`
- Create: `tools/schgen-drawing-trial/boards.ts`
- Test: `tests/schgen-trial/request.test.ts`

**Interfaces:**
- Consumes: `modelForSheet(board): SheetModel` (`tests/circuits/sheet-model.ts`); `toImportedNetlist` (`lib/kicad/from-network.ts`); `intendedSymbol(component): string`; `sha256OfFile`, `draftedSheet` (`tests/circuits/drafted-sheet.ts`).
- Produces: `TRIAL_BOARDS: readonly string[]` and `approvedSheetDigest(board): string` (throws if the sheet's sha256 is not in `verdicts.md`) in `boards.ts`.
- Produces: `interface TrialRequest { board: string; text: string; symbols: string[]; netlist: { components: {designator: string; value: string; symbol: string}[]; nets: Record<string, string[]>; labels: Record<string, string> } }` and `buildRequest(board: string): TrialRequest` and `parseRequest(text: string): TrialRequest["netlist"]` in `request.ts`.
- Produces: CLI `bun tools/schgen-drawing-trial/request.ts BOARD OUT_DIR` writing `request.json` and `request.txt`.

Request text format, fixed for every board (three sections, in this order; one item per line; nothing else):
`PARTS:` lines `<designator> <value> <library:symbol>`; `NETS:` lines `<net>: <designator.pin> <designator.pin> ...` with pin names as the symbol numbers them; `LABELS:` lines `<label> -> <net>`. The ground net is named `GND`. Before writing the generator, read SchGen's published request examples (its dataset on Hugging Face or `sch_examples`) and record in the module comment how they state connectivity. If a mechanical convention of theirs can be followed, follow it and record that; if not, record the difference as a departure.

- [ ] **Step 1: Write the failing tests** in `request.test.ts`, one `for` over `TRIAL_BOARDS`:
  - `round trip`: `parseRequest(buildRequest(b).text)` deep-equals `buildRequest(b).netlist`, and every model pin appears in exactly one net.
  - `matches the model`: the netlist's net partition equals the partition from `toImportedNetlist(modelForSheet(b)...)`, with `0` renamed to `GND`.
  - `control`: moving one pin to another net in the text makes `matches the model` fail (assert the comparison reports a difference).
  - `no placement leak`: no `(at `-derived coordinate pair, no `rotation`/`mirror` token, and no UUID from the approved sheet appears in `text`.
  - `symbols`: `symbols` contains `power:GND`, contains no `copperhead_power:` entry and no `PWR_FLAG`.
  - `approval check`: `approvedSheetDigest` returns a digest found in `docs/schematic/verdicts.md`, and throws for a temp copy with one byte changed.
- [ ] **Step 2: Run** `bun test tests/schgen-trial/request.test.ts` → expect FAIL (module missing).
- [ ] **Step 3: Implement** `boards.ts`, `request.ts`, the `intendedSymbol` export.
- [ ] **Step 4: Run** `bun test tests/schgen-trial/request.test.ts && bun run typecheck` → expect all pass.
- [ ] **Step 5: Commit.**

### Task 3: Prove the comparator before trusting it

**Files:**
- Create: `tools/schgen-drawing-trial/compare.ts`
- Test: `tests/schgen-trial/comparator-controls.test.ts`

**Interfaces:**
- Consumes: `compareSheetToModel`, `modelForSheet`, `exportDraftedSheet`, `importNetlist`.
- Produces: `compareAttempt(board: string, netlistPath: string): { attempt: SheetAgreement; approvedBaseline: SheetAgreement }` and CLI `bun tools/schgen-drawing-trial/compare.ts BOARD NETLIST OUT_JSON`. The baseline is the approved page's own lists, so the known drawn-elsewhere disagreements (the MP lug, the switch `Value`) are reported beside each attempt rather than mistaken for SchGen's.

- [ ] **Step 1: Write the failing tests**, on `pultec-low-boost`'s fresh export, each mutation a helper in the test file:
  - `known equal`: `compareAttempt` on the approved export → `attempt` equals `approvedBaseline`.
  - `pin moved` → `netMembership` non-empty.
  - `two nets merged` → `netMembership` non-empty.
  - `net renamed` → `netMembership` equals the baseline's (names do not count).
  - `pin number swapped between two pins of one part` → `pinIdentity` or `netMembership` non-empty.
  - `pin left unconnected` (removed from its net) → non-empty.
  - `power symbol replaced` (`GND` net's power symbol designator changed) → result equals baseline, or the test records exactly what it reports. If it reports a difference where the circuit is unchanged, that is a comparator defect: fix it in `compare.ts`'s normalisation, not in `lib/`, and say so in the commit.
- [ ] **Step 2: Run** `bun test tests/schgen-trial/comparator-controls.test.ts` → FAIL.
- [ ] **Step 3: Implement** `compare.ts`.
- [ ] **Step 4: Run** the same → all pass.
- [ ] **Step 5: Commit.**

### Task 4: Prompt token IDs, and the fidelity check

**Files:**
- Create: `tools/schgen-drawing-trial/runtime/trial/prompt.py`, `.../trial/schgen_source.py`, `.../trial/fidelity.py`
- Test: `tools/schgen-drawing-trial/runtime/tests/test_prompt.py`

**Interfaces:**
- Consumes: `request.json` (Task 2); the merged model's tokenizer files and `chat_template.jinja` (copied from the bucket's `schgen-merged/` into `tools/schgen-drawing-trial/runtime/tokenizer/`, sha256 recorded); SchGen's `training/modified_chat_template.txt`.
- Produces: `schgen_source.user_message_template() -> str`, which pulls the f-string from `schematic_generation/generate.py::run_raw_test` by `ast` (the module cannot be imported: it loads a model at import), and `schgen_source.get_final_python(decoded: str) -> str`, which pulls that function's source from `schematic_generation/evaluation.py` by `ast` and executes it in an isolated namespace with only `re` and `Path`.
- Produces: `prompt.render(request_text: str, symbols: list[str]) -> PromptRecord` with `PromptRecord = {ids: list[int], text: str, token_count: int, template_sha256: str, tokenizer_files_sha256: dict}`. Symbol context comes from SchGen's `describe_symbol_info` on objects carrying `lib_name` and `name`.
- Produces: `fidelity.check(request_text, symbols) -> {equal: bool, ours: int, theirs: int, first_diff: int | None}`. "Theirs" uses `config.prepare_context()`, the `ast`-extracted template, and a tokenizer with `modified_chat_template.txt` set, exactly as `generate.py` sets it. "Ours" is `prompt.render`.
- Produces: CLI `docker run ... python -m trial.prompt REQUEST_JSON OUT_DIR` writing `prompt.json`.

- [ ] **Step 1: Write the failing tests:**
  - `test_fidelity_equal`: for each of the five `request.json` fixtures, `fidelity.check(...)["equal"]` is true.
  - `test_fidelity_control`: with one character of the request changed only on "ours", `equal` is false and `first_diff` is not None.
  - `test_ends_with_generation_prefix`: the rendered text ends with `<|start|>assistant`.
  - `test_get_final_python_is_theirs`: on a synthetic response `...<|channel|>final<|message|>` + a fenced program + `<|return|>`, the returned code equals the program without the fences.
  - `test_symbol_context_has_no_page_data`: the rendered text contains no UUID and no `(at x y` pair from the approved sheet (the fixture supplies both, read in the test only).
  - `test_longest_prompt_recorded`: `token_count` is recorded for every board (the value Task 6 uses).
- [ ] **Step 2: Run** `docker run --rm -v ... schgen-runtime:0707520c pytest -q /trial/tests/test_prompt.py` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same → pass. Record each board's `token_count` in the commit message.
- [ ] **Step 5: Commit.**

### Task 5: The resumable attempt runner

**Files:**
- Create: `tools/schgen-drawing-trial/run_attempt.py`, `tools/schgen-drawing-trial/stages.py`
- Create: `tools/schgen-drawing-trial/run_all.sh` (all boards and attempts in the fixed order, `nohup`-safe, idempotent)
- Test: `tools/schgen-drawing-trial/tests/test_stages.py` (host pytest; fixtures may be synthetic responses, this being test code)

**Interfaces:**
- Consumes: Tasks 1-4 CLIs; the gateway at `$TRIAL_ENDPOINT` (default `http://localhost:18000`, port-forwarded as `smoke.sh` does).
- Produces: attempt directory `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/<board>/attempt-<n>/` holding `request.txt`, `request.json`, `prompt.json`, `response.raw.txt`, `response.json` (usage, `finish_reason`, latency seconds), `program.py`, `page.kicad_sch`, `page.png`, `page.pdf`, `page.net`, `page.erc.rpt`, `compare.json`, `emitter.log`, `manifest.json`.
- Produces: `stages.classify(attempt_dir) -> Outcome`, where `Outcome` is one of `page`, `no-final-channel`, `no-program`, `program-raised`, `tooling-failed`, `blank-page`; `blank-page` means the sheet has zero symbol instances.
- `manifest.json` keys (spec, "Provenance and resumability"): `board`, `attempt`, `seed`, `model_module`, `git_revision`, `approved_sheet_sha256`, `schgen_commit`, `merged_manifest_sha256`, `tokenizer_files_sha256`, `template_sha256`, `vllm_version`, `vllm_image_digest`, `prompt_sha256`, `raw_response_sha256`, `sampling`, `prompt_tokens`, `output_tokens`, `finish_reason`, `latency_s`, `emitter_fixes`, `kicad_cli_version`, `outcome`, `failure_stage`, `downstream_reruns` (list of `{reason, at}`).

Generation request body: `{"model": "schgen-merged", "prompt": <ids>, "max_tokens": 13312, "temperature": 1.0, "top_k": 50, "top_p": 1.0, "seed": <seed>, "skip_special_tokens": false}`, with a unique `X-Request-Id` per attempt. Assert the response's `usage.prompt_tokens` equals `len(ids)`; a mismatch stops the run.

- [ ] **Step 1: Write the failing tests:**
  - `test_saved_response_is_not_regenerated`: with `response.raw.txt` present, `run_attempt` makes no HTTP call (inject a client that fails if called) and runs downstream.
  - `test_missing_response_is_generated_once`: with no response, exactly one call; the response is written before extraction runs.
  - `test_no_final_channel_classified`: a response with no `final` channel → outcome `no-final-channel`, `program.py` still written from SchGen's fallback, and the emitter still tried.
  - `test_length_cutoff_recorded`: `finish_reason: length` is in the manifest and does not by itself fail the attempt.
  - `test_blank_page`: a sheet with zero symbol instances → `blank-page`.
  - `test_downstream_rerun_recorded`: re-running downstream appends to `downstream_reruns` and leaves `raw_response_sha256` unchanged.
  - `test_prompt_token_mismatch_stops`: a fake server reporting a different `prompt_tokens` raises with both numbers in the message.
- [ ] **Step 2: Run** `python -m pytest -q tools/schgen-drawing-trial/tests` → FAIL.
- [ ] **Step 3: Implement** `stages.py` (one function per stage, each a pure function of files on disk except `generate`), `run_attempt.py`, `run_all.sh`. Render with `kicad-cli sch export png|pdf|netlist` and `kicad-cli sch erc`, exactly as the 2026-10-29 trial did.
- [ ] **Step 4: Run** the same → pass.
- [ ] **Step 5: Commit.**

### Task 6: Serving changes for completions

**Files:**
- Modify: `tools/schgen-serving/manifests/kinference.yaml.tmpl` (second HTTPRoute rule, `PathPrefix /v1/completions`, same backend)
- Modify: `tools/schgen-serving/manifests/vllm-schgen.yaml` (`--max-model-len` = longest Task 4 `token_count` + 13312, rounded up to a multiple of 1024; the comment states the measured inputs)
- Modify: `tools/schgen-serving/smoke.sh` (a `completions` mode: token-ID prompt via the gateway, marker in `X-Request-Id`, asserts `usage.prompt_tokens` equals the IDs sent)

**Interfaces:**
- Produces: `smoke.sh completions` exit 0 when the gateway routes `/v1/completions` and the token count matches.

- [ ] **Step 1: Make the edits.** There is no offline test for the route; it is proven live in Task 7, step 3.
- [ ] **Step 2: Run** `bash -n` on each script and `kubectl apply --dry-run=client -f` on the rendered manifests → expect no errors.
- [ ] **Step 3: Commit.**

### Task 7: The run

**Files:**
- Create: `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/README.md` (what the record is, per the repository rule)

- [ ] **Step 1:** Run `bash tools/schgen-drawing-trial/run_all.sh --requests-only` (requests and prompt IDs for all boards, no GPU). Expect five `prompt.json` files, and fidelity `equal: true` for each.
- [ ] **Step 2:** `probe-capacity.sh` across the candidate zones; set `env.sh` to the zone found; `cluster-up.sh`; `install-kinference.sh`; deploy vLLM; `apply-kinference.sh 16`, re-measuring the block size from the vLLM log first and refusing if it is not 16.
- [ ] **Step 3:** Run `smoke.sh completions`, expecting exit 0. If the gateway will not route it, record that in the README, point `TRIAL_ENDPOINT` at `svc/schgen-merged:8000`, and name the departure there.
- [ ] **Step 4: Preflight.** Under `nohup`, run `run_attempt.py` for attempt 1 of the first board in run order. Read its manifest: latency, output tokens, outcome. Fix any tooling failure and re-run downstream on the same response. Write the measured latency into the README, and from it the expected batch duration.
- [ ] **Step 5:** Run `nohup bash tools/schgen-drawing-trial/run_all.sh > run.log 2>&1 &`. Watch for completion with a background poller, not with sleeps.
- [ ] **Step 6:** `capture-record.sh` into the execution directory; then `gpu-scale.sh 0` and `down.sh` (bucket kept). Verify with `gcloud container clusters list` (empty) and `gcloud compute instances list` (empty).
- [ ] **Step 7: Commit and push** the whole execution directory.

### Task 8: Show the owner, record his verdicts, write the findings

**Files:**
- Create: `tools/schgen-drawing-trial/present.py` (per board: one image with the approved page and attempts 1, 2, 3 left to right in that order, each captioned only `approved` / `attempt N`; a missing page is a card reading exactly `Attempt N: no schematic generated`)
- Modify: `docs/schematic/verdicts.md` (his words verbatim, bound to each SchGen sheet's sha256)
- Create: `docs/research/2026-11-09-schgen-drawing-trial.md` (observations only; nothing in §2's forbidden list)
- Test: `tools/schgen-drawing-trial/tests/test_present.py` (`test_order_and_captions`; `test_failure_card_text_exact`)

- [ ] **Step 1: Write the failing present tests.**
- [ ] **Step 2: Run** `python -m pytest -q tools/schgen-drawing-trial/tests/test_present.py`, expecting FAIL. Then implement and run again, expecting PASS.
- [ ] **Step 3:** Send the five board images to the owner **first**, in board order, with one question per board and nothing else: *"What do you make of SchGen's three attempts at `<board>` against the approved page?"*
- [ ] **Step 4:** Record each verdict verbatim in `verdicts.md`. Only after his verdicts, or if he asks, give the per-attempt diagnostics: outcome, failure stage and traceback, `compare.json` against the baseline, ERC counts, tokens, `finish_reason`.
- [ ] **Step 5:** Write the findings doc and point the 2026-10-29 model-running doc's open question 2 at it. Commit and push.
