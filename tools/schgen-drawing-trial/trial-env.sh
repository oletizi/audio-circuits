# Sourced. The provenance values run_attempt.py refuses to run without, for the
# 2026-11-10 run (Task 7). Each was measured, not assumed:
#   TRIAL_ENDPOINT                 forward-gateway.sh on local port 18000 (the gateway, not vLLM direct;
#                                  smoke.sh completions exited 0 through it)
#   TRIAL_MERGED_MANIFEST_SHA256   sha256 of gs://oletizi-docs-cli-20261028-schgen-merge/schgen-merged/MANIFEST.sha256
#   TRIAL_VLLM_VERSION             the vLLM log banner, "version 0.32.0"
#   TRIAL_VLLM_IMAGE_DIGEST        the image pinned in tools/schgen-serving/manifests/vllm-schgen.yaml
export TRIAL_ENDPOINT=http://localhost:18000
export TRIAL_MERGED_MANIFEST_SHA256=6afd9664bbbb76afb7332c6f4c5b07f52faeb51f7469bc051b7b0efb3286b909
export TRIAL_VLLM_VERSION=0.32.0
export TRIAL_VLLM_IMAGE_DIGEST=sha256:befccf0e7e4089aa23926bb6f887a85c0d46c2a99e6de5c5ffdf5cb7957c5b34
