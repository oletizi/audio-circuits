# Serving base gpt-oss-20b and merged SchGen behind Kinference on GKE

**Status:** draft, awaiting the owner's review. No cluster exists.

**What this is.** The second phase after
`docs/superpowers/specs/2026-11-09-schgen-merge-on-gcp-design.md`. The merge
produced a plain gpt-oss checkpoint with SchGen baked in, checked faithful
(`docs/research/2026-11-09-schgen-merge.md`). This phase serves it, and the base
model beside it, through **Kinference** - Buoyant's inference control plane -
so the owner can test Kinference on a real workload for his Buoyant content
work.

**Two purposes, ranked.** First, **experience Kinference**: install it, route
real traffic through it, exercise what it is for, and write down what that was
like. Second, and only as far as the first allows, **the SchGen A/B** - open
question 2 of `docs/research/2026-10-29-schgen-model-running.md`. The A/B is
not the point of this phase and is not promised by it.

**Governance.** Model output is reported as **observations of model output**. No
program the model emits is run to draw a schematic, and no drawing is rendered
or judged here.

---

## What Kinference needs, from its documentation

Read 2026-11-09 from `kinference.ai/docs/getting-started/` and
`.../guides/basic-inference-serving/`:

- A Kubernetes cluster with `kubectl` and `helm`.
- Gateway API CRDs (v1.5.1), Buoyant's gateway (`oci://ghcr.io/buoyantio/charts/gateway-crds`,
  `.../gateway`), then Kinference (`oci://cr.kinference.ai/kinference-ai/charts/kinference-crds`,
  `.../kinference` with `extension.enabled=true`), all with `--devel`.
- **vLLM is the only engine it documents** (0.28.0 or later), started with
  `--kv-events-config=...` and `--enable-prompt-tokens-details`.
- Per vLLM deployment, an `InferenceWorkerSet` (KV block size, service ref,
  model names and aliases); an `InferencePool` over them; a `Gateway` of class
  `buoyant-gateway`; an `HTTPRoute` sending `/v1/chat/completions` to the pool.
- `kinfctl`, its CLI.

Neither page mentions GKE, GPU types, or LoRA. That is fine here: the merged
model needs no LoRA support, which was the merge's reason for existing.

## The cluster

| | |
| --- | --- |
| project | `oletizi-docs-cli-20261028` (owner's choice, as for the merge) |
| cluster | GKE **Standard** (GPU node pools and driver install are explicit; Autopilot hides the shapes this test is about), zonal, `us-central1-a` |
| system pool | one small CPU node for the gateway and the Kinference control plane |
| **base** pool | `g2-standard-8`, **1 x L4** (24 GB). gpt-oss-20b as published, MXFP4, about 13 GB of weights |
| **merged** pool | `g2-standard-48`, **4 x L4** (96 GB), tensor-parallel 4. The merged model in **bf16**, about 42 GB of weights - the exact weights the merge check passed, unquantized |
| GPUs | 5 of the 8 L4 regional quota |

**Why not one A100.** Quota has one 40 GB A100 and no 80 GB A100s; 40 GB does
not hold the 42 GB merged model. Re-quantizing the merged model to fit smaller
hardware would serve weights nobody has checked; the merge spec put
re-quantization out of scope for that reason.

**The project-wide GPU quota is unknown.** The regional quota allows 8 L4, but
`GPUS_ALL_REGIONS` could not be read through the API, and new projects often
have it at 0. The first node-pool create is where this is found out; if it is
0, an increase request is the owner's to file.

## Getting the weights to the pods

- **base**: vLLM pulls `openai/gpt-oss-20b` from Hugging Face at the revision the
  merge used (`6cee5e81...`), so both arms start from the same base.
- **merged**: an init container copies `gs://oletizi-docs-cli-20261028-schgen-merge/schgen-merged`
  to the node's disk and **verifies `MANIFEST.sha256` before vLLM starts**; a
  mismatch fails the pod. The merged pool's nodes get the `storage-ro` scope so
  this needs no service-account key.

**So the bucket is kept through this phase.** The merge spec deletes it once
m1-mini has verified its copy; this spec defers that, because re-uploading 42 GB
from m1-mini to serve it would be slower than keeping it. Its storage cost is
the price. Deleted at this phase's teardown.

## What is run

1. **Bring-up.** Cluster, pools, GPU drivers; vLLM per arm with the flags
   Kinference requires, served model names `gpt-oss-20b` and `schgen-merged`.
   Each arm answers directly before Kinference is involved - so a failure is
   located in one layer, not two.
2. **Kinference in front.** Gateway API, Buoyant gateway, Kinference; one
   `InferenceWorkerSet` per arm, one `InferencePool` holding both, the gateway
   and route. **Pass**: a request naming each model, sent to the gateway,
   reaches the right arm, shown by that arm's vLLM log, not inferred from the
   answer.
3. **Exercise Kinference.** Which features to exercise is the owner's call - see
   *Open for the owner*. At minimum: what `kinfctl` and the metrics show for
   the traffic in step 4.
4. **The SchGen prompts as workload.** The tower run's prompts (built by
   `build_prompt.py` from SchGen's own `config.py`, on tower) through the
   gateway to both models. Outputs are committed verbatim as observations.
   **Not an evaluation**: a set of circuits and a scoring rule would be, and
   that is its own spec.

## The A/B has a confound, stated before anyone reads a result

The two arms differ in **precision** as well as adapter: base runs MXFP4
kernels, merged runs bf16. A difference between them cannot be attributed to
the adapter alone. The fair version serves base in bf16 too, which needs a bf16
export of the base (another merge-VM run, writing the upcast base instead of
the merge) and 8 L4 - the whole regional quota. Not proposed for this phase,
because the A/B is not its point; recorded so nobody reads the comparison as
cleaner than it is.

## Recorded where

- **Here**: this spec; tooling and manifests in `tools/schgen-serving/`;
  findings about the model in `docs/research/`; the execution record in
  `docs/superpowers/plans/2026-11-09-schgen-kinference-serving-execution/`,
  including every chart and image version actually installed.
- **`kinference-research`**: reports on the experience of using Kinference,
  written for that repository's content work, linking back here for the
  record.

## Cost control and teardown

GPU nodes bill while they exist, whether or not they serve. Between working
sessions the two GPU pools are **scaled to zero** (the cluster and its
configuration survive); at the end the cluster is deleted, and the bucket with
it. No figure is given for the cost; GCP's pricing page is the authority and
the owner has his own read of it.

## Decisions

| decision | who | why |
| --- | --- | --- |
| This spec lives in this repository | owner, 2026-11-09 | *"put the spec here. We can write reports about our experience to kinference-research"* |
| Purpose: test Kinference for Buoyant content work | owner, 2026-11-09 | *"I'm doing this work to test kinference as part of my content development effort for buoyant"* |
| Project `oletizi-docs-cli-20261028` | owner, 2026-11-09 | as for the merge |
| Serve the merged model in bf16 on 4 x L4, not re-quantized | agent, proposed | the bf16 weights are the ones checked faithful; nothing smaller is |
| Keep the bucket through this phase | agent, proposed | the merged pool loads from it; deviates from the merge spec's teardown |
| GKE Standard, not Autopilot | agent, proposed | GPU pool shapes and drivers are explicit, and they are part of what is being tried |

## Open for the owner

1. **Which Kinference features to exercise in step 3.** Its documentation names
   KV-cache-aware routing, inference policies, and tenant tracking. Which of
   those matter to the content you are developing decides what the workload
   has to look like - for example, cache-aware routing only shows anything with
   more than one replica of the same model, which this design does not have.
2. **Whether the A/B confound matters to you now**, or whether the A/B waits for
   its own spec.
