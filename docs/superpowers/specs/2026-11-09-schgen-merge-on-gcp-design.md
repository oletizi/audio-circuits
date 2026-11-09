# Merging the SchGen adapter into gpt-oss-20b on a GCP machine

**Status:** approved by the owner, 2026-11-09 (*"spec is approved"*). Tooling
in `tools/schgen-model/`. One deviation, recorded under **Deviations** below.

**What this is.** `docs/research/2026-10-29-schgen-model-running.md` ran
Microsoft's SchGen LoRA on `tower.local` and left two questions it could not
settle on 15 GB of RAM. This spec does the operation tower could not: PEFT's own
`merge_and_unload()`, which bakes the adapter into the base weights and produces
one ordinary model. It is the first phase of serving SchGen behind Kinference;
the serving phase gets its own spec.

**Why the owner is doing this.** The goal is to test Kinference as part of his
content work for Buoyant, using a real model this repository cares about; the
merge is the prerequisite that gives Kinference a SchGen model it can serve
through vLLM. It is also useful here on its own, for the reasons below.

**Governance.** Nothing here renders or judges a drawing. Model output, if any is
produced, is an observation of model output.

---

## Why

1. **The merged model needs no adapter support from whatever serves it.** The
   adapter puts 73.5% of its parameters on the mixture-of-experts weights of
   layers 7, 15 and 23 through PEFT's `target_parameters`. llama.cpp's stock
   converter crashed on that, and whether vLLM applies it has not been checked.
   A merged model sidesteps the question for vLLM, transformers, and llama.cpp
   (via the stock converter, which handles plain gpt-oss).
2. **It settles open question 1 of the tower document**: whether the custom
   converter's per-expert reconstruction equals what PEFT itself does. Every
   tower result with the full adapter rests on that reconstruction, and its
   first version was silently wrong.
3. **The result is portable.** gpt-oss-20b is Apache 2.0 and the SchGen adapter
   is MIT (checked on its Hugging Face page, 2026-11-09). The merged model may
   be copied and used anywhere.

## What is done

| step | where | what |
| --- | --- | --- |
| 1 | m1-mini / laptop | bring `make_full_lora.py` from tower into `tools/schgen-model/`, unchanged, as the reference reconstruction |
| 2 | GCP | one high-memory CPU VM; no GPU (the merge is weight arithmetic, bound by RAM) |
| 3 | VM | download `openai/gpt-oss-20b` and `microsoft/SchGen` from Hugging Face; record their revisions and file sha256s |
| 4 | VM | load the base with its MXFP4 experts dequantized to bf16; apply the adapter with PEFT; `merge_and_unload()`; save as safetensors |
| 5 | VM | the faithfulness check below |
| 6 | VM → GCS | upload the merged model, a sha256 manifest, and the check's report to a bucket |
| 7 | GCS → m1-mini | download to `/Volumes/Big Disk/models/schgen-merged/`; verify every sha256 |
| 8 | GCP | delete the VM and its disk once step 6 is verified; delete the bucket once step 7 is verified |

**The machine.** `n2-highmem-16` (16 vCPU, 128 GB) in `us-central1`, with a
300 GB balanced persistent disk. The bf16 model is about 42 GB, so 128 GB holds
the base, the merge, and the comparison's working copies with room to spare.
That size is estimated from the parameter count, not measured; if the load runs
out of memory, the next step up is `n2-highmem-32` (256 GB), which is a resize
and not a redesign. Quota checked 2026-11-09: 200 N2 CPUs, 0 in use.

## The faithfulness check

**Criterion.** For each adapted tensor (attention q/k/v/o on all 24 layers;
expert `gate_up_proj` and `down_proj` on layers 7, 15, 23), the delta
`merged - base_bf16` computed by PEFT equals the delta the reference converter's
factors produce (`scale × B·A`, scale = alpha/r = 2.0, mapped back to the
Hugging Face layout including the gate/up interleave), **within bf16 rounding
of the merged weight**, element by element.

**Negative control, so the check can fail.** The same comparison is run against
a deliberately mispacked reconstruction (both factors sliced expert-major, the
mistake the tower converter's first version made). **The check is only evidence
if the control fails it.** If the control passes, the tolerance is too loose and
the result is void.

**The known risk, stated before it bites.** The tower document found that
transformers 4.57.6's `GptOssExperts` does not define `is_transposed`, which in
peft 0.21.2 selects the einsum branch whose shapes do **not** fit this adapter.
So a stock PEFT merge may raise a shape error, or a different version pair may
pick a different branch. **The shapes, not a version, decide which branch is
right**: only `"o r e, e r i -> e i o"` is shape-compatible with the factors in
the file. If the stock merge refuses, the versions tried and the error are
recorded verbatim, and a version pair whose branch is shape-compatible is
found and pinned; the merge is never forced through by editing PEFT. If PEFT and
the reference disagree beyond rounding, that is a finding, it is recorded, and
**neither side is assumed right** - the merged model is not used for an
evaluation until it is resolved.

## What comes back, and where it is recorded

- `/Volumes/Big Disk/models/schgen-merged/` on m1-mini: the merged safetensors,
  config, tokenizer, and `MANIFEST.sha256`. Too large for git, by design.
- `tools/schgen-model/`: the reference converter, the merge script, the check
  script, and the VM provisioning and teardown commands. Each script fails
  loudly; none reads a stale output.
- `docs/research/2026-11-09-schgen-merge.md`: what was run, the versions, the
  sha256s, the check's result and the control's, verbatim.
- `docs/superpowers/plans/2026-11-09-schgen-merge-execution/`: the execution
  record, per this repository's rule that a plan's record is committed beside
  it.

## Out of scope

- **Serving and Kinference.** The next spec: a GKE cluster with an L4 node
  (quota: 8 L4, 0 in use), vLLM serving base and merged as two model names
  behind one Kinference gateway.
- **Whether SchGen helps** (open question 2 of the tower document). That needs
  the serving phase and a set of circuits, and is not answered by a merge.
- **Re-quantizing to MXFP4 or GGUF** for tower. Possible once the merged bf16
  model exists and has passed the check; not part of this phase.

## Decisions

| decision | who | why |
| --- | --- | --- |
| Merge on a GCP machine rather than tower | owner, 2026-11-09 | tower's 15 GB cannot hold a bf16 20B model |
| Store the large outputs on m1-mini's Big Disk | owner, 2026-11-09 | multi-terabyte volume; 7.7 TB free when checked |
| Download cost is acceptable for ~40 GB | owner, 2026-11-09 | he checked GCP's egress pricing |
| Project `oletizi-docs-cli-20261028`, billing account `013BD2-F2034F-3AED1A` | owner, 2026-11-09 | the project he named and linked billing to; asked about sharing it with the Docs CLI: *"The docs cli project is fine"* |
| m1-mini pulls from GCS itself with `gcloud storage cp` (option 1a below) | owner, 2026-11-09 | he installed `gcloud` on m1-mini |
| Purpose: test Kinference for Buoyant content work | owner, 2026-11-09 | *"I'm doing this work to test kinference as part of my content development effort for buoyant"* |
| CPU VM, no GPU, for the merge | agent, proposed | the merge is bound by memory, not compute; avoids GPU quota |
| Never edit PEFT to make the merge pass | agent, proposed | a merge forced through by editing the library is the converter's mispacking risk again, with nothing to check it against |

## Deviations

**fp32 merge on `n2-highmem-32`, not bf16 on `n2-highmem-16`.** Found while
writing the check, after approval. The criterion says "within bf16 rounding of
the merged weight", but bf16 rounding of a weight can be as large as the
adapter's delta to it, so a wrong delta - including the mispacked control -
could hide inside the tolerance and the check would be void. The merge and the
check are therefore done in fp32 (about 84 GB for the model alone), where
rounding is far below the delta, and the model is cast to bf16 only when saved.
The criterion is unchanged in kind: PEFT's delta equals the reference's within
the rounding of the precision the merge is done in. The machine is the step-up
this spec already named.

**The base loads as bf16 and is upcast to fp32.** Measured on the first merge
run: transformers dequantizes MXFP4 to bf16 on CPU whatever dtype is
requested, and the check's dtype guard refused (`model.layers.7.mlp.experts.gate_up_proj
loaded as torch.bfloat16`). The model is upcast to fp32 after loading. This is
exact: an MXFP4 value is an e2m1 element times a power of two, at most two
significant bits, which bf16 represents exactly, and bf16 to fp32 is exact.
Peak RSS of the refused run, which loaded bf16 only: 61,821,972 kB.

A second control was added: `down_proj` is square, so
the transposed einsum orientation fits its shape too, and it must also fail.

## Open for the owner

1. **How the model reaches m1-mini.** m1-mini has no `gcloud`. Options:
   (a) `brew install --cask gcloud-cli` on m1-mini and one interactive
   `gcloud auth login` there, then a resumable `gcloud storage cp` (recommended:
   the pull is resumable and verifiable on the machine that keeps the files);
   (b) pull to the laptop and copy over the LAN, which needs ~42 GB free on the
   laptop and doubles the transfer.
2. **Where the Kinference half is recorded.** This merge belongs here: it is
   about the SchGen model. The serving phase is Kinference work for Buoyant
   content, so its spec and findings may belong in `kinference-research`
   instead, linking back to this document.
