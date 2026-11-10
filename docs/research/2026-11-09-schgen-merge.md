# Merging SchGen into gpt-oss-20b, and whether the tower reconstruction was faithful

**What this is.** The run the spec
`docs/superpowers/specs/2026-11-09-schgen-merge-on-gcp-design.md` describes:
PEFT's own `merge_and_unload()` of `microsoft/SchGen` into `openai/gpt-oss-20b`
on a GCP machine, checked tensor by tensor against the reconstruction the tower
run rested on (`docs/research/2026-10-29-schgen-model-running.md`). Tooling in
`tools/schgen-model/`; the report, run log, source revisions and pip freeze in
`docs/superpowers/plans/2026-11-09-schgen-merge-execution/`.

**Governance.** No drawing was rendered or judged. No model output was produced;
this is a statement about weights.

## The headline

**Open question 1 of the tower document is settled: the reconstruction is
faithful.** For every adapted tensor - attention q/k/v/o on all 24 layers, and
the expert `gate_up_proj` and `down_proj` on layers 7, 15 and 23 - the delta
PEFT's merge applied equals `scale x B.A` under the einsum
`"ore,eri->eio"` that `make_full_lora.py` asserts its factoring against, with
**zero elements outside fp32 rounding**. The three deliberately wrong
reconstructions fail on essentially every element. So every tower result with
the full adapter was a result about the real SchGen fine-tune; what those
results lack is breadth (two prompts), not fidelity.

## The measurement

| | relative Frobenius residual | elements outside fp32 rounding |
| --- | --- | --- |
| checks, 96 attention + 6 expert tensors | worst **7.43e-5** (L23 `down_proj`); attention ~1e-6, `gate_up_proj` ~3e-7 | **0** in every tensor |
| control: `lora_B` sliced expert-major (the tower converter's first error) | **1.85 - 2.56** | 264,820,448 to 530,838,554 of 265M / 531M |
| control: transposed orientation `e o i` on square `down_proj` | **1.40 - 1.41** | 261,783,328 to 265,320,515 of 265,420,800 |
| untouched: L0 experts, L7 router, embeddings | - | **bit-identical** |

Tolerance, elementwise: `4 eps |w| + 64 eps |ref|` with `eps` the fp32 machine
epsilon - margin over the half-ulp rounding of `fl(base + delta)` and an
eight-term fp32 accumulation. The controls are separated from the checks by more
than four orders of magnitude in residual, so the result does not depend on the
tolerance's margins.

## What was run

| | |
| --- | --- |
| machine | GCP `n2-highmem-32` (32 vCPU, 251 GiB usable), Debian 12, `us-central1-a` |
| base | `openai/gpt-oss-20b` @ `6cee5e81ee83917806bbde320786a8fb61efebee` (`original/`, `metal/` not downloaded) |
| adapter | `microsoft/SchGen` @ `97ac53055570568e125510237e06fdb340a38558` |
| versions | Python 3.11.2, torch 2.15.0+cpu, **transformers 5.22.2**, **peft 0.21.2** |
| precision | base dequantized MXFP4 -> bf16 by transformers, upcast to fp32 (exact), merged and checked in fp32, saved bf16 |
| output | bf16 safetensors in 9 shards plus config, tokenizer, `MANIFEST.sha256`; 41,857,528,257 bytes in the bucket including the record |

## Three things measured on the way

1. **transformers dequantizes MXFP4 to bf16 on CPU whatever dtype is
   requested.** It says so (`We will dequantize the model to bf16`), and the
   check's dtype guard refused on the first merge run. Upcasting to fp32 is
   exact - an MXFP4 value has at most two significant bits - so the fix costs
   nothing; the guard now verifies it happened. Peak RSS of the bf16-only load:
   61,821,972 kB.
2. **The tower document's version risk did not materialise with this pair.**
   It had found that transformers 4.57.6's `GptOssExperts` lacks
   `is_transposed`, which in peft 0.21.2 selects the branch whose shapes do not
   fit this adapter. With transformers 5.22.2 and the same peft 0.21.2, PEFT
   took the shape-compatible branch, as the checks show. **Which branch a
   given version pair takes is a property of that pair**, so a re-run with
   different versions must re-run the check, not assume this result.
3. **The merge itself is quick once loaded**: adapter applied and merged in
   under a second of logged time, the check in 22 s, the save and manifest
   about 2 minutes. The work was the load and the memory, as the spec expected.

## What this does NOT settle

**Whether SchGen helps** - open question 2 of the tower document - is untouched.
The merged model makes it testable on any server that loads a plain gpt-oss
checkpoint, which is the serving phase's job.
