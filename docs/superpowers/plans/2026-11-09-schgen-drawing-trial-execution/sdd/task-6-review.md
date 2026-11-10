Verdict: Approved. No Critical or Important issues. Three Minor items.

### Spec Compliance
- max-model-len: 19456 = ceil((5505 + 13312) / 1024) * 1024. The comment states 5505 (pultec-mid, Task 4 fixture path), 13312 (max_tokens), the sum 18817, and 18.375. The inputs are stated and the arithmetic is correct. No other 16384 in tools/schgen-serving needs changing. The older research and execution docs record the earlier value as history and are not edited.
- HTTPRoute: the second rule is well formed and has the same indentation and structure as the first. It uses the same backendRef, with kind InferencePool, group kinference.buoyant.io and name inference-pool. `/v1/completions` and `/v1/chat/completions` are disjoint prefixes, so neither rule can shadow the other.
- smoke.sh completions sends the same three fields as tools/schgen-drawing-trial/generation.py:41-43 (skip_special_tokens false, spaces_between_special_tokens false, return_token_ids true). Sampling and seed are set. The prompt is sent as IDs, and the marker goes in both `user` and X-Request-Id.
- check_completions.py reads exactly choices[0].prompt_token_ids and choices[0].token_ids.
  - It exits 2 with "return_token_ids unsupported" only when both are None.
  - Exit 1, not 2, applies when only one field is present or a stray key contains `token_ids` (the key's path is named).
  - Compared with token_identity.py, the stray-key walker is identical, as are the one-choice check, the neither/one-only ordering and the int-list check. Stray keys are checked before the choice, as in the runner.
  - The comparison is element by element with the index named, and then the lengths are compared. This is the same semantics as token_identity.py, including the length case.
  - The decode(token_ids) == text check is deliberately left to the runner. The brief does not ask for it in the smoke.
- Marker check:
  - The marker is a literal substring of `choices[0].text`.
  - Non-vacuous: the request does not set `echo`, so `text` is the completion only. Prompt specials 200006/200008/200007 (`<|start|>`, `<|message|>`, `<|end|>`) cannot be echoed back into it.
  - Not guaranteed: it depends on the model emitting `<|channel|>` or `<|message|>` within 32 tokens after `<|start|>assistant`. This is expected of harmony output, but it is only proven live in Task 7. A failure there reads as "special tokens stripped", which is slightly misleading but still loud.
- I checked smoke-prompt-ids.json against the pinned tokenizer.json. Encoding source_text gives the IDs, and decoding the IDs with skip_special_tokens=false returns source_text. Both are True.
- The commit message carries no AI attribution. The author is the user.
- Offline: client dry-run was not possible, and the substitute (envsubst plus YAML parse) is honestly labelled as not a schema validation. This is within the ruling.

### Strengths
- A single shared logic path: the check mirrors the runner's semantics and names exact paths, so smoke and runner cannot disagree on names.
- The tests cover each exit-code branch, including both one-field variants and a stray key.
- The smoke tool does not mutate the checked-in prompt, and the display-only log grep cannot mask the check's exit code.

### Issues
Critical: none.
Important: none.
Minor:
1. tools/schgen-serving/smoke.sh:~46 (venv check) and the jq dependency. Both are loud but late. The venv check runs after the port-forward has started. A missing jq shows only the shell's "command not found", and by then curl has already sent an empty body. pipefail plus set -e still exits non-zero. Fix: add `command -v jq >/dev/null || { echo "jq required" >&2; exit 1; }` and do the venv check before the port-forward.
2. tools/schgen-serving/smoke.sh:~47. The mktemp RESP file is never removed, and the trap only kills the port-forward. The file is a harmless leak, and it is also useful for post-mortem.
3. tools/schgen-serving/check_completions.py, the `f"choices[0].text is not a string"` line, has a pointless f-prefix. The no-marker message also blames "skip_special_tokens not honoured", although the cause could be that the model did not emit a marker within 32 tokens. Fix: reword to name both causes.

Port-forward failure: the failure is silent in the forward itself (output goes to /dev/null, as in the existing modes), but the curl that follows fails loudly with connection refused. This matches the existing gateway and direct behaviour, so I did not raise it.

### Assessment
Task quality: Approved.
Reasoning: Every item in the brief and the dispatch values is met, and the semantics match token_identity.py. The prompt IDs were verified against the pinned tokenizer, and the marker check is not vacuous because `echo` is unset. The remaining items are cosmetic. The live behaviour (whether the deployed vLLM returns the fields under these names, and whether a marker appears within 32 tokens) is proven only in Task 7 step 3.
I did not run the 7 pytest cases, because I had no specific doubt about them.
