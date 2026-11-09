"""Build a FULL GGUF LoRA adapter for microsoft/SchGen, including the MoE
expert LoRA that convert_lora_to_gguf.py cannot map.

Why this is possible at all
---------------------------
llama.cpp's *runtime* already supports per-expert LoRA: `build_lora_mm_id`
(src/llama-graph.cpp) applies the delta with

    ggml_mul_mat_id(lw->b, ggml_mul_mat_id(lw->a, cur, ids), ids)

i.e. it indexes lora_a and lora_b by the selected-expert ids, so both are
expected to be 3-D per-expert stacks. Only the *converter* lacks a mapping for
PEFT's `target_parameters` tensor names.

The packing, read off PEFT's own source
---------------------------------------
adapter_config.json says r=8, but the expert lora_A is [256, 2880]. 256 = 32
experts x rank 8. The two factors are packed DIFFERENTLY, which is easy to get
wrong: peft/tuners/lora/layer.py::ParamWrapper.get_delta_weight does

    weight_A = weight_A.reshape(num_experts, -1, in)    # (e, r, i)
    weight_B = weight_B.reshape(out, -1, num_experts)   # (o, r, e)
    delta    = einsum("o r e, e r i -> e i o", B, A) * scaling

so lora_A is expert-major (row e*r + k) but lora_B is rank-major
(column k*num_experts + e). For expert e:

    A_e = lora_A.reshape(32, 8, 2880)[e]          [8, 2880]
    B_e = lora_B.reshape(out, 8, 32)[:, :, e]     [out, 8]

and delta_e in (out, in) orientation is B_e @ A_e.

That `-> e i o` (rather than `e o i`) branch is the one taken when
`_did_swap_in_out_features` is False, and it is the only one of the two whose
shapes are compatible with the factors actually in this file: lora_A's input dim
is 2880 (hidden) and lora_B's output dim is 5760 (2 x intermediate), matching
gate_up_proj's (experts, hidden, 2*intermediate).

Mapping to gpt-oss GGUF expert tensors
--------------------------------------
`base_layer` is gate_up_proj (out 5760), bare is down_proj (out 2880) -- read
off the lora_B output dims. conversion/gpt_oss.py splits gate_up_proj into
ffn_gate_exps / ffn_up_exps by de-interleaving the output axis
(`[:, ::2, :]` gate, `[:, 1::2, :]` up), so the same de-interleave applies to
B_e's rows. lora_A is shared between gate and up because both read the same
input.

GGUF LoRA layout (from the attention tensors the official converter emits, and
the validation in llama_adapter_lora_init_impl): lora_a has ne = [in, rank],
lora_b has ne = [rank, out]. numpy shape is reversed, so lora_a is
(rank, in) and lora_b is (out, rank). For a 3-D expert stack, numpy shape is
(n_expert, rank, in) and (n_expert, out, rank).

Scale: the runtime computes alpha / lw->b->ne[0] = 16 / 8 = 2.0, which is
PEFT's alpha/r = 16/8. The per-expert emission keeps rank at 8, so the scale
matches the attention tensors and PEFT both.
"""
import json
import struct
import sys

import numpy as np

sys.path.insert(0, "/home/orion/work/llama.cpp/gguf-py")
import gguf  # noqa: E402

SRC = "/home/orion/models/schgen-adapter/adapter_model.safetensors"
CFG = "/home/orion/models/schgen-adapter/adapter_config.json"
OUT = "/home/orion/models/schgen-lora-full-f32.gguf"
ATTN_GGUF = "/home/orion/models/schgen-lora-attn-f32.gguf"

N_EXPERT = 32
RANK = 8
EXPERT_LAYERS = (7, 15, 23)


def load_safetensors(path):
    with open(path, "rb") as f:
        hlen = struct.unpack("<Q", f.read(8))[0]
        hdr = json.loads(f.read(hlen))
        # blob now starts exactly at the data section, so a tensor's
        # data_offsets are already relative to it.
        blob = f.read()
    out = {}
    for name, e in hdr.items():
        if name == "__metadata__":
            continue
        assert e["dtype"] == "F32", (name, e["dtype"])
        a, b = e["data_offsets"]
        arr = np.frombuffer(blob, dtype=np.float32,
                            count=(b - a) // 4, offset=a).copy()
        out[name] = arr.reshape(e["shape"])
    return out


def main():
    sd = load_safetensors(SRC)
    cfg = json.load(open(CFG))
    alpha = float(cfg["lora_alpha"])

    writer = gguf.GGUFWriter(path=None, arch="gpt-oss")
    writer.add_string(gguf.Keys.General.TYPE, gguf.GGUFType.ADAPTER)
    writer.add_string(gguf.Keys.Adapter.TYPE, "lora")
    writer.add_string(gguf.Keys.General.NAME, "SchGen")
    writer.add_float32(gguf.Keys.Adapter.LORA_ALPHA, alpha)
    writer.add_quantization_version(gguf.GGMLQuantizationType.F32 and 2)

    n_attn = 0
    n_expert_t = 0

    # ---- attention: straight pass-through, same mapping the official script uses
    attn_map = {"q_proj": "attn_q", "k_proj": "attn_k",
                "v_proj": "attn_v", "o_proj": "attn_output"}
    for layer in range(24):
        for proj, ggml_name in attn_map.items():
            A = sd[f"base_model.model.model.layers.{layer}.self_attn.{proj}.lora_A.weight"]
            B = sd[f"base_model.model.model.layers.{layer}.self_attn.{proj}.lora_B.weight"]
            # A is (rank, in), B is (out, rank) already -- exactly the numpy
            # shapes GGUF wants.
            assert A.shape[0] == RANK and B.shape[1] == RANK, (A.shape, B.shape)
            stem = f"blk.{layer}.{ggml_name}.weight"
            writer.add_tensor(stem + ".lora_a", np.ascontiguousarray(A))
            writer.add_tensor(stem + ".lora_b", np.ascontiguousarray(B))
            n_attn += 2

    # ---- experts: unpack 32 x rank-8 and restack as 3-D
    for layer in EXPERT_LAYERS:
        pre = f"base_model.model.model.layers.{layer}.mlp.experts."
        gu_A = sd[pre + "base_layer.lora_A.weight"]   # (256, 2880)
        gu_B = sd[pre + "base_layer.lora_B.weight"]   # (5760, 256)
        dn_A = sd[pre + "lora_A.weight"]              # (256, 2880)
        dn_B = sd[pre + "lora_B.weight"]              # (2880, 256)
        assert gu_A.shape == (N_EXPERT * RANK, 2880), gu_A.shape
        assert gu_B.shape == (5760, N_EXPERT * RANK), gu_B.shape
        assert dn_B.shape == (2880, N_EXPERT * RANK), dn_B.shape

        gate_a = np.empty((N_EXPERT, RANK, 2880), np.float32)
        up_a = np.empty((N_EXPERT, RANK, 2880), np.float32)
        gate_b = np.empty((N_EXPERT, 2880, RANK), np.float32)
        up_b = np.empty((N_EXPERT, 2880, RANK), np.float32)
        down_a = np.empty((N_EXPERT, RANK, 2880), np.float32)
        down_b = np.empty((N_EXPERT, 2880, RANK), np.float32)

        # lora_A: expert-major  (e, r, in);  lora_B: rank-major  (out, r, e)
        gu_A3 = gu_A.reshape(N_EXPERT, RANK, 2880)
        dn_A3 = dn_A.reshape(N_EXPERT, RANK, 2880)
        gu_B3 = gu_B.reshape(5760, RANK, N_EXPERT)
        dn_B3 = dn_B.reshape(2880, RANK, N_EXPERT)

        for e in range(N_EXPERT):
            A_e = gu_A3[e]             # (8, 2880)
            B_e = gu_B3[:, :, e]       # (5760, 8)
            # de-interleave the output axis exactly as conversion/gpt_oss.py does
            gate_b[e] = B_e[0::2, :]   # (2880, 8)
            up_b[e] = B_e[1::2, :]
            gate_a[e] = A_e            # shared input projection
            up_a[e] = A_e
            down_a[e] = dn_A3[e]
            down_b[e] = dn_B3[:, :, e]

        # Self-check: the per-expert (out, in) delta we have just factored must
        # equal PEFT's own einsum for this layer. This is a check that can fail:
        # the wrong lora_B packing changes the result.
        ref = np.einsum("ore,eri->eio", dn_B3, dn_A3)          # PEFT's `-> e i o`
        got = np.einsum("eor,eri->eio", down_b, down_a)
        err = np.abs(ref - got).max()
        assert err == 0.0, f"layer {layer} down_proj factoring disagrees with PEFT: {err}"

        ref_gu = np.einsum("ore,eri->eio", gu_B3, gu_A3)       # (32, 2880, 5760)
        got_gate = np.einsum("eor,eri->eio", gate_b, gate_a)   # (32, 2880, 2880)
        got_up = np.einsum("eor,eri->eio", up_b, up_a)
        assert np.abs(ref_gu[:, :, 0::2] - got_gate).max() == 0.0, f"layer {layer} gate split"
        assert np.abs(ref_gu[:, :, 1::2] - got_up).max() == 0.0, f"layer {layer} up split"
        print(f"  layer {layer}: per-expert factoring matches PEFT einsum exactly")

        for nm, a, b in (("ffn_gate_exps", gate_a, gate_b),
                         ("ffn_up_exps", up_a, up_b),
                         ("ffn_down_exps", down_a, down_b)):
            stem = f"blk.{layer}.{nm}.weight"
            writer.add_tensor(stem + ".lora_a", np.ascontiguousarray(a))
            writer.add_tensor(stem + ".lora_b", np.ascontiguousarray(b))
            n_expert_t += 2

    writer.open_output_file(OUT)
    writer.write_header_to_file()
    writer.write_kv_data_to_file()
    writer.write_tensors_to_file(progress=True)
    writer.close()

    print(f"\nwrote {OUT}")
    print(f"  attention tensors : {n_attn}")
    print(f"  expert tensors    : {n_expert_t}")
    print(f"  total             : {n_attn + n_expert_t}")
    print(f"  alpha             : {alpha}  (runtime scale = alpha/rank = {alpha / RANK})")


if __name__ == "__main__":
    main()
