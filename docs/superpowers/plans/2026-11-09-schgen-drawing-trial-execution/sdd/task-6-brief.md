### Task 6: Serving changes for completions

**Files:**
- Modify: `tools/schgen-serving/manifests/kinference.yaml.tmpl` (second HTTPRoute rule, `PathPrefix /v1/completions`, same backend)
- Modify: `tools/schgen-serving/manifests/vllm-schgen.yaml` (`--max-model-len` = longest Task 4 `token_count` + 13312, rounded up to a multiple of 1024; the comment states the measured inputs)
- Modify: `tools/schgen-serving/smoke.sh` (a `completions` mode: token-ID prompt via the gateway, `return_token_ids: true`, `skip_special_tokens: false`, marker in `X-Request-Id`; it compares the returned prompt IDs with those sent and checks that a harmony marker survives in `text`)

**Interfaces:**
- Produces: `smoke.sh completions` exits 0 when the gateway routes `/v1/completions`, the returned prompt IDs equal the IDs sent, and the special tokens survive. It exits 2, with the message `return_token_ids unsupported`, when the field is absent, which is the signal for Task 5's qualified mode.

- [ ] **Step 1: Make the edits.** There is no offline test for the route; it is proven live in Task 7, step 3.
- [ ] **Step 2: Run** `bash -n` on each script and `kubectl apply --dry-run=client -f` on the rendered manifests → expect no errors.
- [ ] **Step 3: Commit.**

