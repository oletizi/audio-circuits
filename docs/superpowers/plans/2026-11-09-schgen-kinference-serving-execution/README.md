# Serving execution record: Kinference routing to merged SchGen

This directory is the execution record of the narrowed serving phase in
`docs/superpowers/specs/2026-11-09-schgen-kinference-serving-design.md`. It is
the raw evidence, not the findings; the findings are in
`docs/research/2026-11-09-schgen-kinference-serving.md`.

Captured 2026-11-09 by `tools/schgen-serving/capture-record.sh` and
`tools/schgen-serving/smoke.sh`, against the cluster in europe-west1-b.

| file | what it is |
| --- | --- |
| `helm-releases.json`, `kinference-images.txt` | chart and image versions as installed on the europe-west1 cluster (rewritten by `install-kinference.sh`; the diff from the us-central1 install is install timestamps and pod names only) |
| `nodes.txt`, `pods.txt` | the system node, the Spot 4 x L4 node, and the pods on them |
| `fetch-model.log` | the init container: cross-region copy from the US-CENTRAL1 bucket and `sha256sum -c MANIFEST.sha256`, ending `MODEL-VERIFIED` |
| `vllm.log` | vLLM v0.32.0 startup through the first two chat completions (one direct, one through the gateway) |
| `iws-schgen-merged.yaml`, `inferencepool.yaml`, `gateway.yaml`, `httproute.yaml` | Kinference and Gateway API resources with their status |
| `kinference.log`, `gatewayd.log` | Kinference controller/router and the gateway data plane |
| `smoke-direct.txt`, `smoke-gateway.txt` | a re-run of both smoke checks after the record above was captured; both 200, each response id carrying its own request's marker |
