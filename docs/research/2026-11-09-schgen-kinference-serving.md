# Kinference routing to merged SchGen on GKE: findings

Phase: the narrowed serving phase of
`docs/superpowers/specs/2026-11-09-schgen-kinference-serving-design.md` -
*"Let's just get kinference running and routing traffic to the model"* (owner,
2026-11-09). Raw evidence: `docs/superpowers/plans/2026-11-09-schgen-kinference-serving-execution/`.
Everything below was confirmed by this writer from that record unless marked.

## Result

Both pass layers in the spec passed.

1. **vLLM alone.** `/v1/models` lists `schgen-merged` (max_model_len 16384); a
   chat completion to `svc/schgen-merged` returned 200.
2. **Through Kinference.** The InferenceWorkerSet reports Accepted, Ready
   (1 endpoint), Referenced by `inference-pool`, and
   `kvEvents: {configured: true, subscribedEndpoints: 1}`. The pool resolves 1
   destination; the HTTPRoute is Accepted with ResolvedRefs. A chat completion
   sent to `svc/kinference-gw-gatewayd:8080` returned 200 with response id
   `chatcmpl-<its own marker>` - vLLM derives the id from the request's
   `X-Request-Id`, so the gateway request is the one vLLM served - and vLLM
   logged a new `POST /v1/chat/completions 200`.

## What it ran on

| | |
| --- | --- |
| cluster | GKE Standard, zonal, europe-west1-b, v1.36.4-gke.2377000 |
| GPU | one Spot g2-standard-48, 4 x NVIDIA L4 (22 GiB each) |
| model | merged SchGen bf16, copied from the US-CENTRAL1 bucket and sha256-verified by the init container |
| vLLM | v0.32.0, pinned by digest, tensor-parallel 4, prefix caching, KV events over ZMQ on 5557 |
| Kinference | charts `kinference` / `kinference-crds` 0.1.0-alpha.7 |
| gateway | charts `gateway` / `gateway-crds` 0.1.0-alpha.6, Gateway API CRDs v1.5.1 |

## Findings

1. **vLLM 0.32 loads the transformers-5 bf16 gpt-oss checkpoint.** This was
   the open load risk in the spec; it is settled for this checkpoint. Weights
   plus non-torch memory: 10.19 GiB per GPU; KV cache: 8.74 GiB per GPU,
   1,214,030 tokens in all. Engine init took 71.43 s.
2. **KV block size is 16, measured.** vLLM logs `kv cache group sizes (16, 16)`
   and `kv lcm block sizes 16`; `kvBlockSize: 16` was applied and Kinference
   logged `worker added ... block_size=16`.
3. **gpt-oss has two KV cache groups** - its alternating full and
   sliding-window attention layers. Kinference took one `kvBlockSize`; how its
   KV-aware routing treats events from two groups is not examined here and
   matters only once there is more than one replica. Left open.
4. **`subscribedEndpoints` was 0 until traffic flowed**, then 1. A status
   check taken right after apply would read as a failed subscription.
5. **The worker set first read `Accepted,Unreferenced`** for about ten seconds
   after apply, before the pool's reference landed.
6. **The smoke reply's `content` is null**: `finish_reason: length` at
   `max_tokens: 200`, all spent in gpt-oss's `reasoning` field, which was on
   topic. A smoke-test budget, not a model fault.
7. **The re-run reported `cached_tokens: 80` of 87 prompt tokens** - vLLM's
   prefix cache serving the repeated prompt.
8. **Not diagnosed:** vLLM's access log shows the gateway-routed request from
   `127.0.0.1`, as it shows the port-forwarded direct one. Possibly the
   gateway forwarding `X-Forwarded-For` from a port-forward client and uvicorn
   honouring it; unverified. The response-id marker, not the source address, is
   what establishes the route.

## What it took to get capacity (cost of this phase, in obstacles)

| obstacle | measured | resolution |
| --- | --- | --- |
| on-demand 4 x L4 stockout | `ZONE_RESOURCE_POOL_EXHAUSTED` in us-central1-a for 35 min, reported by gcloud only as "still running"; then autoscaler `GCE out of resources` in all of us-central1-a/b/c for an hour | multi-zone autoscaling pool, then Spot |
| Spot 4 x L4 stockout | failed in all of us-central1-a/b/c, twice each | `tools/schgen-serving/probe-capacity.sh` |
| probe | exhausted in us-east4-a/c, us-west1-a/b/c, us-east1-b/c/d, us-west4-a/c, northamerica-northeast1-b/c and northeast2-a/b, europe-west4-a/b/c; succeeded in europe-west1-b | cluster rebuilt in europe-west1-b; its autoscaler then got a Spot node |
| helm 4.3.1 hang on public ghcr.io charts | hung after the registry 401, at the macOS keychain credential helper | `install-kinference.sh` runs helm with the helper off PATH |

The Spot node can be reclaimed by Google at any time; that is accepted for this
phase and recorded in the spec's Decisions table.

## Left for the owner

The deferred items in the spec stand: the A/B comparison, which Kinference
features to exercise, and experience reports for `kinference-research`.
