Task 6 report: serving changes for completions

Edits
- manifests/kinference.yaml.tmpl: second HTTPRoute rule, PathPrefix /v1/completions, same InferencePool backend.
- manifests/vllm-schgen.yaml: --max-model-len 16384 -> 19456, comment states the inputs.
- smoke.sh: `completions` mode via the gateway (port-forward as before). Body built with jq from smoke-prompt-ids.json: prompt token IDs, max_tokens 32, temperature 1.0, top_k 50, top_p 1.0, seed 42, skip_special_tokens false, spaces_between_special_tokens false, return_token_ids true, user and X-Request-Id carry the marker. Response is checked by check_completions.py (host venv python, -I); exit code propagates; vLLM log lines for the marker are shown.
- New: tools/schgen-serving/check_completions.py (exit 0 ok; 2 with "return_token_ids unsupported" when neither field present; 1 for one-field-only, stray token_ids key at another path (named), prompt ID mismatch (index named) or length mismatch, marker absent from text, non-integer lists).
- New: tools/schgen-serving/smoke-prompt-ids.json (22 IDs from tokenizer.json, sha256 0614fe83..., source text recorded; round-trips with skip_special_tokens=false; includes harmony special tokens 200006/200008/200007).
- New: tools/schgen-serving/tests/test_check_completions.py.

max-model-len arithmetic
Longest prompt 5505 (pultec-mid), from tools/schgen-drawing-trial/runtime/tests/fixtures/token_counts.json ("longest": 5505; others 4917, 4668, 4638, 4660). 5505 + 13312 = 18817; 18817 / 1024 = 18.375; round up to 19 x 1024 = 19456 (verified by python ceil). Note: Kinference reports contextWindow from vLLM (16384 in the earlier execution record); it will read 19456 after redeploy. If the gateway enforces it, 19456 is what it will see.

vLLM v0.32.0 field names (source read via gh api at tag v0.32.0, vllm/entrypoints/openai/completion/protocol.py and serving.py)
- CompletionRequest.return_token_ids: bool | None (protocol.py ~line 171), description: result includes token IDs alongside generated text.
- CompletionResponseChoice has `token_ids: list[int] | None` ("For response") and `prompt_token_ids: list[int] | None` ("For prompt"), both choice-level (protocol.py ~lines 667-669).
- serving.py (non-streaming, ~line 590): prompt_token_ids=prompt_token_ids if request.return_token_ids else None; token_ids=as_list(output.token_ids) if request.return_token_ids else None.
- So the source confirms choices[0].prompt_token_ids and choices[0].token_ids, and that both are None (null) unless return_token_ids is set. It also has skip_special_tokens and spaces_between_special_tokens request fields (default True). This is from source only; the live smoke in Task 7 is still what proves the deployed image behaves so.
- Streaming chunks carry them too (prompt_token_ids in first chunk only); the trial does not stream.

Verification
- bash -n on every tools/schgen-serving/*.sh: no errors.
- pytest (host venv) tools/schgen-serving/tests: 7 passed (both present and equal; mismatch at index; length mismatch; neither -> 2 with message; one field only -> 1 (both variants); stray top-level token_ids and choices[0].output_token_ids named; marker missing).
- kubectl apply --dry-run=client: cannot run offline. With the default it fails on openapi download; with --validate=false it still needs API discovery ("connection refused localhost:80", no cluster context), and `kubectl create --local` is not a valid flag in this version. No cluster created. Substitute: rendered kinference.yaml.tmpl with envsubst (KV_BLOCK_SIZE=16) and parsed both manifests with ruby YAML: kinds are valid, HTTPRoute path prefixes are ["/v1/chat/completions", "/v1/completions"]; vllm-schgen.yaml parses as Service + Deployment. Not a schema validation.
- smoke.sh completions has not been run (no cluster); Task 7 step 3 proves it live.

Files changed
tools/schgen-serving/smoke.sh, check_completions.py, smoke-prompt-ids.json, tests/test_check_completions.py, manifests/kinference.yaml.tmpl, manifests/vllm-schgen.yaml, and this report.

Concerns
- Client dry-run was not possible offline (above).
- smoke.sh completions requires the host venv at tools/schgen-drawing-trial/.venv and jq; it refuses loudly if the venv is missing.
- The log grep in completions mode has `|| true` so a missing log line cannot mask the check's exit code; it is display only.
- Marker check accepts either <|channel|> or <|message|>; the 32-token generation after the harmony prompt should emit them, but that is unproven until the live run.
