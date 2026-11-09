"""Merge microsoft/SchGen into openai/gpt-oss-20b with PEFT, and check the
merge against the reference reconstruction before saving anything.

Spec: docs/superpowers/specs/2026-11-09-schgen-merge-on-gcp-design.md

Usage: python merge_check.py BASE_DIR ADAPTER_DIR OUT_DIR REPORT_JSON

Why fp32. The merge is done and checked in float32 and cast to bfloat16 only
when saved. In bf16 the rounding of a weight can be as large as the adapter's
delta to it, so a wrong delta could hide inside the rounding and the negative
control below could pass - which would void the check. In fp32 the rounding is
far below the delta, so a correct delta matches to within a few ulp and a
mispacked one does not.

The reference. tools/schgen-model/make_full_lora.py (copied unchanged from
tower) factors the expert LoRA per expert and asserts that its factoring equals
the einsum "ore,eri->eio" on A reshaped (e, r, in) and B reshaped (out, r, e).
That einsum is therefore what every tower result with the full adapter rests
on, and it is what PEFT's merge is compared against here, re-derived from the
adapter file rather than imported (the converter needs llama.cpp's gguf module
and tower's paths).

Which branch. For gate_up_proj, (e, in=2880, out=5760) is the only orientation
that fits the parameter's (32, 2880, 5760) shape. down_proj is square, so both
orientations fit it; the transposed orientation is therefore run as a second
control for down_proj, and it too must fail.

Nothing is saved unless every check passes and every control fails.
"""
import hashlib
import json
import os
import platform
import sys
import time

import peft
import torch
import transformers
from peft import PeftModel
from safetensors.torch import load_file
from transformers import AutoModelForCausalLM, AutoTokenizer, Mxfp4Config

EXPERT_LAYERS = (7, 15, 23)
N_LAYERS = 24
ATTN = ("q_proj", "k_proj", "v_proj", "o_proj")
EPS = torch.finfo(torch.float32).eps
PFX = "base_model.model.model.layers"


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def tolerance(base, merged, ref):
    """Elementwise bound on |actual_delta - ref| from fp32 rounding alone.

    merged = fl(base + delta) rounds by at most half an ulp of the result, and
    the reference einsum accumulates over rank 8 in fp32. The factor of 4 on the
    first term and 64 on the second are margin, not tuning: the controls below
    differ from the reference by the size of the delta itself.
    """
    return 4 * EPS * torch.maximum(base.abs(), merged.abs()) + 64 * EPS * ref.abs()


def compare(name, base, merged, ref):
    actual = merged - base
    res = actual - ref
    tol = tolerance(base, merged, ref)
    bad = int((res.abs() > tol).sum())
    ref_norm = float(ref.norm())
    return {
        "tensor": name,
        "shape": list(ref.shape),
        "max_abs_ref_delta": float(ref.abs().max()),
        "max_abs_residual": float(res.abs().max()),
        "rel_frobenius_residual": float(res.norm()) / ref_norm if ref_norm else None,
        "elements_over_tolerance": bad,
        "elements": ref.numel(),
        "within_rounding": bad == 0,
    }


def main():
    base_dir, adapter_dir, out_dir, report_path = sys.argv[1:5]
    if os.path.exists(out_dir) and os.listdir(out_dir):
        raise SystemExit(f"refusing: {out_dir} is not empty; a previous merge is there. "
                         "Delete it deliberately to redo the merge.")

    cfg = json.load(open(os.path.join(adapter_dir, "adapter_config.json")))
    if cfg.get("use_rslora") or cfg.get("use_dora"):
        raise SystemExit("refusing: adapter uses rslora/dora; the reference scale alpha/r "
                         "does not describe it")
    r = int(cfg["r"])
    scale = float(cfg["lora_alpha"]) / r
    sd = load_file(os.path.join(adapter_dir, "adapter_model.safetensors"))

    report = {
        "versions": {
            "python": platform.python_version(),
            "torch": torch.__version__,
            "transformers": transformers.__version__,
            "peft": peft.__version__,
        },
        "scale": scale,
        "rank": r,
    }

    log("loading base, MXFP4 experts dequantized, float32")
    t0 = time.time()
    model = AutoModelForCausalLM.from_pretrained(
        base_dir,
        quantization_config=Mxfp4Config(dequantize=True),
        dtype=torch.float32,
        device_map="cpu",
    )
    # transformers dequantizes MXFP4 to bf16 on CPU whatever dtype is asked for
    # (measured on the first run: the experts came back bf16 and the check
    # below refused). The upcast is EXACT, not an approximation: an MXFP4 value
    # is an e2m1 element (0, 0.5, 1, 1.5, 2, 3, 4, 6, signed) times a power of
    # two, at most 2 significant bits, which bf16 holds exactly; and bf16 to
    # fp32 is exact for every bf16 value. The dtype check below now verifies
    # that this upcast happened.
    report["loaded_expert_dtype"] = str(model.model.layers[EXPERT_LAYERS[0]].mlp.experts.gate_up_proj.dtype)
    model = model.to(torch.float32)
    report["load_seconds"] = round(time.time() - t0)
    params = dict(model.named_parameters())

    targets = {}
    for L in range(N_LAYERS):
        for p in ATTN:
            targets[f"model.layers.{L}.self_attn.{p}.weight"] = None
    for L in EXPERT_LAYERS:
        targets[f"model.layers.{L}.mlp.experts.gate_up_proj"] = None
        targets[f"model.layers.{L}.mlp.experts.down_proj"] = None
    untouched = [
        "model.layers.0.mlp.experts.gate_up_proj",
        "model.layers.0.mlp.experts.down_proj",
        "model.layers.7.mlp.router.weight",
        "model.embed_tokens.weight",
    ]
    for n in list(targets) + untouched:
        if n not in params:
            raise SystemExit(f"refusing: base model has no parameter {n}; the names this "
                             "check assumes do not match this transformers version")
        if params[n].dtype != torch.float32:
            raise SystemExit(f"refusing: {n} loaded as {params[n].dtype}, not float32; "
                             "the check's tolerance assumes fp32")
    snap = {n: params[n].detach().clone() for n in list(targets) + untouched}
    log(f"snapshotted {len(snap)} tensors")

    log("applying adapter with PEFT")
    pm = PeftModel.from_pretrained(model, adapter_dir, torch_dtype=torch.float32)
    log("merge_and_unload")
    merged = pm.merge_and_unload()
    mparams = dict(merged.named_parameters())

    results, controls = [], []
    for L in range(N_LAYERS):
        for p in ATTN:
            n = f"model.layers.{L}.self_attn.{p}.weight"
            A = sd[f"{PFX}.{L}.self_attn.{p}.lora_A.weight"].float()
            B = sd[f"{PFX}.{L}.self_attn.{p}.lora_B.weight"].float()
            ref = (B @ A) * scale
            results.append(compare(n, snap[n], mparams[n].detach(), ref))

    for L in EXPERT_LAYERS:
        for which, key in (("gate_up_proj", "base_layer."), ("down_proj", "")):
            n = f"model.layers.{L}.mlp.experts.{which}"
            A = sd[f"{PFX}.{L}.mlp.experts.{key}lora_A.weight"].float()
            B = sd[f"{PFX}.{L}.mlp.experts.{key}lora_B.weight"].float()
            E = A.shape[0] // r
            out_dim, in_dim = B.shape[0], A.shape[1]
            A3 = A.reshape(E, r, in_dim)
            ref = torch.einsum("ore,eri->eio", B.reshape(out_dim, r, E), A3) * scale
            base_t, merged_t = snap[n], mparams[n].detach()
            if ref.shape != base_t.shape:
                raise SystemExit(f"refusing: reference delta {tuple(ref.shape)} does not fit "
                                 f"{n} {tuple(base_t.shape)}")
            results.append(compare(n, base_t, merged_t, ref))

            mis = torch.einsum("oer,eri->eio", B.reshape(out_dim, E, r), A3) * scale
            c = compare(n, base_t, merged_t, mis)
            c["control"] = "mispacked lora_B (expert-major), the tower converter's first error"
            controls.append(c)
            if which == "down_proj":
                tr = torch.einsum("ore,eri->eoi", B.reshape(out_dim, r, E), A3) * scale
                c = compare(n, base_t, merged_t, tr)
                c["control"] = "transposed orientation e o i (shape-compatible only because square)"
                controls.append(c)

    untouched_res = [{"tensor": n, "bit_identical": bool(torch.equal(snap[n], mparams[n].detach()))}
                     for n in untouched]

    report["checks"] = results
    report["controls"] = controls
    report["untouched"] = untouched_res
    checks_ok = all(x["within_rounding"] for x in results)
    controls_fail = all(not x["within_rounding"] for x in controls)
    untouched_ok = all(x["bit_identical"] for x in untouched_res)
    report["verdict"] = {
        "all_checks_within_rounding": checks_ok,
        "all_controls_fail": controls_fail,
        "untouched_bit_identical": untouched_ok,
    }
    os.makedirs(os.path.dirname(os.path.abspath(report_path)), exist_ok=True)
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    log(f"report written: {report_path}")
    log(json.dumps(report["verdict"]))
    if not (checks_ok and controls_fail and untouched_ok):
        raise SystemExit("refusing to save: the merge did not pass the faithfulness check, or a "
                         "control passed it (which voids the check). See the report.")

    log("casting to bfloat16 and saving")
    del snap, pm
    merged = merged.to(torch.bfloat16)
    if getattr(merged.config, "quantization_config", None) is not None:
        del merged.config.quantization_config
    merged.hf_quantizer = None
    merged.save_pretrained(out_dir, safe_serialization=True, max_shard_size="5GB")
    AutoTokenizer.from_pretrained(base_dir).save_pretrained(out_dir)

    saved_cfg = json.load(open(os.path.join(out_dir, "config.json")))
    if "quantization_config" in saved_cfg:
        raise SystemExit("refusing: saved config.json still declares quantization_config, so a "
                         "loader would read these bf16 weights as MXFP4")

    log("writing MANIFEST.sha256")
    lines = []
    for fn in sorted(os.listdir(out_dir)):
        h = hashlib.sha256()
        with open(os.path.join(out_dir, fn), "rb") as f:
            for chunk in iter(lambda: f.read(1 << 24), b""):
                h.update(chunk)
        lines.append(f"{h.hexdigest()}  {fn}")
    with open(os.path.join(out_dir, "MANIFEST.sha256"), "w") as f:
        f.write("\n".join(lines) + "\n")
    log("done")


if __name__ == "__main__":
    main()
