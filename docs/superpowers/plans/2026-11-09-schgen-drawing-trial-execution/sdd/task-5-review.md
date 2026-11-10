Verdict: Needs fixes. Two Important issues, several Minor. The persistence, resumability, request body, manifest and container boundary match the brief and rulings.

### Spec Compliance

- **Atomic persistence.** Matches the brief. Evidence:
  - `persist.write_atomic` writes `.part`, fsyncs it, `os.replace`s it, then fsyncs the directory.
  - `persist_response` writes RAW, then META, then the marker holding both sha256s.
  - `response_complete` returns false on a missing marker, unparseable JSON, a non-dict marker, or either digest mismatching. A mismatch is treated as no marker (`test_marker_digest_mismatch`).
  - `quarantine_incomplete` moves the response files and their `.part` files to `interrupted/<µs stamp>/` with `exist_ok=False`, and appends `generation-interrupted`.
  - `ensure_response` then makes exactly one call with the attempt's fixed seed (`test_partial_response_is_not_complete` asserts one call and seed 42).
- **No regeneration of a saved response.** `ensure_response` returns early when `response_complete` is true, and nothing else writes RAW or META. A downstream rerun needs `--rerun-reason`, moves earlier outputs to `downstream-previous/`, and leaves `raw_response_sha256` unchanged (`test_downstream_rerun_recorded`).
- **Token identity.**
  - The prompt IDs are compared element by element and the first differing index is named. A length mismatch is named at `min(len)`.
  - The decode keeps special tokens and its result is compared to `text`.
  - When both fields are absent the result is exactly `"unverified - count only"`, gated on `usage.prompt_tokens` equal to the number of IDs sent. One field without the other raises.
  - The silent-degrade risk is Issue I1.
- **Request body.** It equals the brief's dict, asserted in `test_missing_response_is_generated_once`. The `X-Request-Id` is `schgen-trial-<board>-attempt-<n>-<uuid4>`, and its header is checked against a real localhost server.
- **Manifest keys.** All 24 keys in the brief are present in `manifest.build`. So are the ruling additions `page_produced` and `rendered_date`, alongside `request_dir` and `prompt_sha256`.
- **Rulings.**
  - The per-board shared `request/` holds request, fidelity and prompt. `prompt.json` is rendered once and never re-rendered.
  - The approval gate (`tools.board_info`) runs before `prepare` and before generation, and is tested both with a fake and with the real bun board-info.
  - The outcome is the first abnormal stage, and `page_produced` is recorded separately.
  - Extraction runs in the container (`--network none --read-only`, with limits), and host decode uses `tokenizers`.
  - The venv is pinned with `==`.
  - Fidelity runs before the prompt and must be equal (`FidelityError`).
  - There is no default `TRIAL_ENDPOINT`.
- **Untrusted code.** None runs on the host. No host module imports `trial.*` or `schgen_source`. `final_channel_regex`'s `eval` runs only inside the container. The program runs only through `emit.sh`.
- **run_all.sh.**
  - The order is fixed by `board-info.ts --list`, with attempts 1 to 3.
  - It is safe under `nohup`, because it writes only to stdout. It is idempotent: it skips any attempt that has `manifest.json`. It never truncates or deletes.
  - Every request directory, with fidelity, is prepared before any attempt.
  - Unset environment variables are refused by `run_attempt` before any HTTP call.
  - One preflight is not a gate (Minor M1).
- **Commits and file sizes.** No AI attribution in either commit. The largest file is 243 lines.

### Strengths

- The persistence layer is small and exact.
  - Both write and read run through one marker.
  - Leftovers include `.part` files.
  - Quarantine never deletes anything.
  - `reruns.jsonl` refuses a partial last line rather than repairing it.
- The token-identity check reads only the saved `response.json`, so it re-runs from disk on every relaunch. A mismatch keeps the response, writes no manifest, and exits 3 (`test_prompt_ids_mismatch_stops` asserts the response is still complete).
- The "one field without the other" case raises rather than degrading.
- Whether a response has a final channel is decided by SchGen's own `final_block_re`, located by AST. It fails closed when there is not exactly one assignment, and a test proves it.
- The blank and symbol-free tests use real kicad-cli on a real nil-UUID fixture, with a real-UUID control (`test_real_sheet_is_a_page`). The diagnosis of why the nil-UUID render fails (the `Schematic.svg` naming) is recorded in code beside the reorder it forced.
- Generation provenance is saved inside `response.json`, so a downstream rerun later does not read the environment.
- The report is candid about the RED being a missing-module failure and about `run_all.sh` never being run whole.

### Issues

#### Critical

None.

#### Important

**I1. `generation.py:495-496`: a real response whose IDs sit under other names degrades silently to count-only, and the whole run continues.**

`check_token_identity` returns `COUNT_ONLY` whenever `choices[0].prompt_token_ids` and `choices[0].token_ids` are both `None`. There are three ways a real response can land there:

- the field names are assumed and unverified (report concern 2);
- a vLLM build that predates `return_token_ids` ignores unknown request fields with only a server-side warning;
- the gateway may drop the fields.

In every case the request asked for `return_token_ids: true`, the run proceeds through all 15 attempts, and the only trace is a manifest string. `run_attempt.main` prints the outcome but not `token_identity`, so the run log is silent too.

The brief says count-only may continue "only after" the limitation is named in the README and the findings. Nothing in the code enforces that "after". As built, a fidelity claim is downgraded without anyone choosing it.

This is not plan-mandated. The brief's `test_no_token_ids_field_is_qualified` requires "does not raise", which an acknowledged mode still satisfies.

Fix:
- When the request had `return_token_ids` true and both fields are absent, raise `TokenIdentityError` (exit 3) unless an explicit `TRIAL_ACCEPT_COUNT_ONLY=1` is set.
- Record that acknowledgement in `response.json` provenance and in the manifest.
- Also scan `body` for any key containing `token_ids` outside `choices[0]`, and refuse naming it, so a wrong field name is reported as a wrong name rather than as absence.
- Print `token_identity` in `run_attempt`'s per-attempt line.
- Have the test set the flag. Add one test where an absent field without the flag raises, and one where IDs at a different path raise.

**I2. `stages.py:1782-1790` and `1828-1834` (`blank_reason` and `page_produced`): a rendered page can be withheld because of a netlist tooling failure.**

`blank_reason` reads `netlist_components(_read(NETLIST))`. When the netlist stage *failed* (no file, or a partial file), that count is 0, so `blank_reason` returns "exported netlist lists no component". `page_produced` is then false even though `page.png` exists and the sheet places symbols.

The ruling has T8 show the page whenever one exists, and CLAUDE.md says every drawing is shown and only an electrical fault may withhold one. On this path a tooling failure turns a rendered drawing into a neutral card.

`classify` guards this correctly at line 1814 (`stages["netlist"]["status"] == "ok" and ...`). `blank_reason` and `page_produced` do not.

Fix: in `blank_reason`, count the empty netlist only when `read_stages(attempt_dir)["netlist"]["status"] == "ok"`. Add a test in which the fake netlist stage fails while render succeeds, and assert `page_produced is True` with outcome `tooling-failed` (netlist).

#### Minor

**M1. `run_all.sh:1204`: the kicad and magick preflight is not a gate.**

`echo "... $(bun "$HERE/kicad.ts" version) ..."` does not trip `set -e`. A failing substitution inside an echo argument is ignored, which I verified with `bash -c 'set -euo pipefail; echo "x $(false) y"; echo still running'`. A missing kicad-cli or magick therefore lets the request loop run, and lets `--requests-only` report done. No generation happens, because `run_attempt` calls `kicad_cli_version()` before `ensure_response`. But the script's header claims "each absence stops the run before any attempt".

Fix: put the call on its own line, `kicad_version="$(bun "$HERE/kicad.ts" version)"`, then echo the variable.

**M2. `run_attempt.py:1327-1337` and `generation.py:418-442`: a request that was sent and lost leaves no record.**

`generation-interrupted` is recorded only when response files or `.part` files exist. A Spot reclaim during the HTTP request (review focus 4), a connection reset, an HTTP error, or a 200 payload without `choices[0].text` writes nothing. The relaunch then regenerates with no trace that seed N was sent before. A non-conforming 200 payload is also discarded without being kept.

Fix:
- Write `request.sent` atomically (request_id, at) before the POST.
- On relaunch, treat a `request.sent` without a complete marker as interrupted: quarantine it and record `generation-interrupted`.
- Persist any non-conforming payload into `interrupted/` before raising.

**M3. `board_request.py:1271-1290`: `prompt.json` is not bound to the IDs the fidelity check compared.**

`fidelity.json` records only counts. `prompt.json` is rendered in a later container call, possibly on a different date, since the template embeds the current date.

Fix: have the fidelity step record the sha256 of the IDs it compared and the rendered date, and have `prepare` assert that `prompt.json` matches them. Alternatively, render `prompt.json` from the same call that checks fidelity.

**M4. `stages.py:1771-1775`: two classification issues.**
- The ambiguous emitter case (a fixes line, no program frame, no `emit.sh:` line) defaults to `tooling-failed`, and no test covers it.
- The `emit.sh:` and `EmitterSetupError` detail reads "the harness, not the program, failed". That is a cause claim the brief says outcomes do not make. For example, "could not inspect container ... OOM kill cannot be ruled out" may follow a program traceback.

Fix: make the detail state only what was observed, e.g. "emit.sh reported: <line>". Add a test for the ambiguous case. The default label is defensible, since the spec treats blank and harness failures as tooling until shown otherwise.

**M5. `stages.py:1638`: kicad-cli's misnamed `Schematic.svg` and a leftover `crops/` are not in `DOWNSTREAM_FILES`.** A downstream rerun leaves them beside the new outputs. Fix: move them aside with the rest.

**M6. A risk for Task 7, not a defect: vLLM's `spaces_between_special_tokens` defaults to true.** If the served detokenizer honours it, the decode check fails loudly on every attempt. That would be a stop, not a silent pass. Task 7 step 3 should check for it before the run.

### Assessment

Task quality: **Needs fixes.**

Reasoning: The resumability and persistence contract, the request body, the manifest, the classifier's order and the container boundary all match the brief and the rulings, and they are tested against real kicad-cli and real container extraction where it matters.

Two defects would undermine what the trial claims:
- **I1** lets a token-level fidelity claim fall to count-only with no one choosing it, which is exactly the case the field-name assumption makes plausible.
- **I2** can withhold a rendered page from the owner over a netlist tooling failure, which contradicts the ruling and the project's rule that every drawing is shown.

Both fixes are local, a few lines each, plus one test each. M1 and M2 are worth folding into the same round.
