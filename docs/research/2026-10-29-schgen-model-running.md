# Getting Microsoft's SchGen model to run, and whether its fine-tune applies

**What this is.** A hands-on run of the `microsoft/SchGen` LoRA against its base
model `openai/gpt-oss-20b`, on CPU, on `tower.local`. The companion document
`2026-10-29-trial-microsoft-schgen.md` trialled SchGen's **emitter** with the
model out of scope. This document is the other half: the **model**.

**Governance.** Nothing here is a verdict on a drawing. No schematic was
rendered and none was reviewed — the programs the model emitted are reported
verbatim as **observations of model output**, and whether any of them draws is
a separate job that was deliberately not attempted.

**The headline, in four parts.**

1. The base model answers on this hardware at **~13-14 tok/s**, CPU-only.
2. The stock `convert_lora_to_gguf.py` **cannot** convert this adapter, and the
   reason matters: the adapter is **not** attention-only. It carries a per-expert
   LoRA on the MoE experts of layers 7, 15 and 23 through PEFT's
   `target_parameters`, and that is **73.5% of its parameters**.
3. A custom converter was written. The full adapter — all 210 tensors — now
   loads, and a negative control proves the expert tensors are really bound
   rather than silently skipped. **The fine-tune can be applied.**
4. **Whether it helps is not established.** On a four-part circuit it produced a
   terse program in SchGen's own idiom and fixed two of base's geometry errors.
   On a seven-part circuit **base was better**: base emitted a complete,
   topologically correct program, while the adapter emitted a prose tutorial
   with a wrong netlist — at a 3000-token cap and again at 6000, so truncation
   is not the explanation. Two prompts, pointing opposite ways.

---

## The machine, and what was installed

| | |
| --- | --- |
| host | `tower.local`, Linux 7.0.0-30-generic, Ubuntu, x86_64 |
| CPU | AMD Ryzen 3 3100, 4 cores / 8 threads |
| RAM | 15.0 GiB total, ~9.5 GiB available at the start; 4 GiB swap |
| GPU | AMD Radeon RX 5600 XT (Navi 10, gfx1010). **Not used** — see below |
| llama.cpp | `brew install llama.cpp` → **0.8.0, build b11960-8642541b2**, CPU backend only |
| Python | 3.14.7 (brew). venv at `~/work/venv` |
| torch | 2.15.0+cpu (cp314 wheels exist, so Python 3.14 was not a blocker) |
| transformers | **4.57.6**, the version `llama.cpp/requirements` pins |
| peft | 0.21.2 — installed **to read its source**, not to run it |

**`brew install llama.cpp` was the right call and took about two minutes of
pouring.** Nothing needed to be compiled; `cmake` was never installed. The
bottle pulls `vulkan-loader` and `vulkan-headers` as dependencies of `ggml`,
which is misleading: `/home/linuxbrew/.linuxbrew/Cellar/ggml/*/lib/` contains
only `libggml-base.so` and `libggml.so`, with **no `libggml-vulkan.so`**. The
bottle is CPU-only.

**Two flag changes in this build caught the first run out.** `-no-cnv` has been
removed from `llama-cli`, which is now conversational and takes `-st`
(`--single-turn`); the raw-completion binary is a separate `llama-completion`
which still accepts `-no-cnv`. The first attempt died instantly with
`error: invalid argument: -no-cnv`.

### Why Vulkan was not pursued

Deliberately not attempted, and this is a judgement rather than a measurement,
so it is stated as one. The model file is **12.1 GB** against roughly **4.3 GB
free VRAM**, so at most about a third of the layers could be offloaded; the brew
bottle has no Vulkan backend, so getting one means a cmake build of llama.cpp on
4 cores plus `libvulkan-dev` and `glslc` from apt. CPU-only cleared the bar the
task set, so the build was not spent. **No claim is made about what Vulkan would
have delivered** — it was not measured.

---

## Step 1 — the base model answers. PASSED.

```
llama-cli -m gpt-oss-20b-MXFP4.gguf -t 8 -c 4096 -n 160 --temp 0 --seed 1234 -st \
  -p "Give exactly three short reasons a 100nF capacitor is placed next to an IC power pin..."
```

It loaded, produced harmony-channel reasoning and then a correct three-line
answer ("Filters high-frequency noise from the supply / Provides local
decoupling for transient current spikes / Stabil…" — truncated by `-n 160`,
not by an error).

| measurement | value |
| --- | --- |
| prompt eval | **14.5 tok/s** |
| generation | **13.9 tok/s** |
| peak RSS | **10,577,796 kB ≈ 10.1 GiB** |
| wall, incl. load | 44.3 s |
| major page faults | 24,089 |
| swap in use during the run | ~3.7 GiB of 4.0 GiB |

**The memory position is tight but workable.** 20B parameters at MXFP4 with 4 of
32 experts active per token is what makes ~14 tok/s possible on four cores. It
runs from page cache and swap rather than comfortably in RAM; across later runs
peak RSS was consistently 11.9-12.0 GB with longer contexts. Nothing was killed
by the OOM killer in any run.

Across all runs, **prompt eval on the long SchGen prompt measured 69-73 tok/s**,
far above the 14-16 tok/s seen on short prompts — batching works.

---

## Step 2 — the stock converter FAILS, and the briefing's premise was wrong

**This is the most consequential finding in the document.**

The task briefing said the adapter "only touches `q_proj/k_proj/v_proj/o_proj`,
which are ordinary attention projections, not the 32 experts," and that it "may
well be the easy case." That is not what is in the file.

`adapter_config.json` has, beside `target_modules`, a second and separate field:

```json
"target_parameters": [
  "7.mlp.experts.gate_up_proj",  "7.mlp.experts.down_proj",
  "15.mlp.experts.gate_up_proj", "15.mlp.experts.down_proj",
  "23.mlp.experts.gate_up_proj", "23.mlp.experts.down_proj"
]
```

`target_parameters` is PEFT's mechanism for putting a LoRA on a raw
`nn.Parameter` rather than on an `nn.Linear`, and it exists precisely so that
MoE expert stacks can be adapted. **The adapter does touch the experts.**

### What is actually in the safetensors

204 tensors, all F32, confirmed by reading the file's header directly:

| count | shape | generalised name |
| --- | --- | --- |
| 24 each | `[8,2880]` / `[4096,8]` | `…layers.N.self_attn.q_proj.lora_A/B.weight` |
| 24 each | `[8,2880]` / `[512,8]` | `…layers.N.self_attn.k_proj.lora_A/B.weight` |
| 24 each | `[8,2880]` / `[512,8]` | `…layers.N.self_attn.v_proj.lora_A/B.weight` |
| 24 each | `[8,4096]` / `[2880,8]` | `…layers.N.self_attn.o_proj.lora_A/B.weight` |
| 3 each | `[256,2880]` / `[5760,256]` | `…layers.N.mlp.experts.base_layer.lora_A/B.weight` |
| 3 each | `[256,2880]` / `[2880,256]` | `…layers.N.mlp.experts.lora_A/B.weight` |

Attention LoRA is on **all 24 layers**; expert LoRA is on **layers 7, 15, 23**
only. The `base_layer` pair is `gate_up_proj` (output 5760 = 2 × 2880) and the
bare pair is `down_proj` (output 2880) — read off the output dimensions.

**The prior verification was not wrong, it was partial.** The SVD of the
base-versus-merged delta that found exactly 8 significant singular values on
`q_proj` and `v_proj` was correct, and so was the zero delta on
`mlp.router.weight` — the router genuinely is not a target. But `q_proj`,
`v_proj` and the router are all it looked at, and the experts were never
sampled.

### The failure, verbatim

```
INFO:lora-to-gguf:Loading base model: gpt-oss-20b-hf-config
INFO:lora-to-gguf:Using model architecture: GptOssForCausalLM
INFO:hf-to-gguf:blk.0.attn_k.weight.lora_a,        torch.float32 --> F32, shape = {2880, 8}
  … 119 more attention tensors convert cleanly, blk.0 through blk.14 …
Traceback (most recent call last):
  File "/home/orion/work/llama.cpp/convert_lora_to_gguf.py", line 548, in <module>
    model_instance.write()
  File "/home/orion/work/llama.cpp/conversion/base.py", line 1401, in write
    self.prepare_tensors()
  File "/home/orion/work/llama.cpp/conversion/base.py", line 1240, in prepare_tensors
    for new_name, data_torch in (self.modify_tensors(data_torch, name, bid)):
  File "/home/orion/work/llama.cpp/convert_lora_to_gguf.py", line 505, in modify_tensors
    dest = list(super().modify_tensors(data_torch, name, bid))
  File "/home/orion/work/llama.cpp/conversion/gpt_oss.py", line 123, in modify_tensors
    yield from super().modify_tensors(data_torch, name, bid)
  File "/home/orion/work/llama.cpp/conversion/base.py", line 846, in modify_tensors
    new_name = self.map_tensor_name(name)
  File "/home/orion/work/llama.cpp/conversion/base.py", line 625, in map_tensor_name
    raise ValueError(f"Can not map tensor {name!r}")
ValueError: Can not map tensor 'model.layers.15.mlp.experts.base_layer.weight'
```

### The cause, named precisely

**It is the MoE architecture — but by way of the converter's name table, not by
way of anything intrinsically unconvertible.** Three things compose:

1. `get_base_tensor_name` in `convert_lora_to_gguf.py` strips `base_model.model.`
   and `.lora_A.weight`, turning
   `base_model.model.model.layers.15.mlp.experts.base_layer.lora_A.weight` into
   `model.layers.15.mlp.experts.base_layer.weight`.
2. `conversion/gpt_oss.py::modify_tensors` keys on the literal substrings
   `down_proj` and `gate_up_proj`. Neither appears in that stripped name, because
   PEFT replaced the parameter name with `base_layer` / nothing.
3. So it falls through to the generic `map_tensor_name`, which has no entry for
   it and raises.

It is **not** a missing config field, **not** a version mismatch, and **not**
the quantization. It is that `convert_lora_to_gguf.py` has no handler for PEFT's
`target_parameters` naming on any architecture.

### Where it is NOT a blocker: llama.cpp's runtime already supports this

`llm_graph_context::build_lora_mm_id` in `src/llama-graph.cpp` — the path MoE
expert matmuls take — applies a LoRA like this:

```cpp
ggml_tensor * ab_cur = ggml_mul_mat_id(
        ctx0, lw->b,
        ggml_mul_mat_id(ctx0, lw->a, cur, ids),
        ids
        );
```

Both factors are indexed by `ids`, the selected-expert ids. **llama.cpp expects
per-expert 3-D LoRA stacks and already knows how to apply them.** The gap is
entirely in the Python converter.

---

## Step 2b — two adapters were built

### (a) attention-only, with the stock converter

Dropping the 12 expert tensors and nulling `target_parameters` lets the stock
converter run to completion: **192 tensors, 15.9 MB**,
`schgen-lora-attn-f32.gguf`.

**This is a partial adapter and the shortfall is large.** By parameter count:

| half | LoRA parameters | share |
| --- | --- | --- |
| attention (24 layers, q/k/v/o) | 3,981,312 | **26.5%** |
| experts (layers 7/15/23) | 11,059,200 | **73.5%** |
| total | 15,040,512 | |

And the expert half is not a rounding error that happens to be large. Measured
Frobenius norms:

| | `lora_A` | `lora_B` | `lora_B` all zero? |
| --- | --- | --- | --- |
| L0 `q_proj` | 2.40 | 1.53 | no |
| L0 `v_proj` | 2.19 | 0.45 | no |
| L7 `gate_up_proj` | 14.04 | **12.33** | no |
| L7 `down_proj` | 22.63 | **13.23** | no |
| L15 `gate_up_proj` | 14.89 | **13.45** | no |
| L15 `down_proj` | 24.42 | **14.32** | no |
| L23 `gate_up_proj` | 14.67 | **14.04** | no |
| L23 `down_proj` | 14.23 | 9.81 | no |

PEFT initialises `lora_B` to zero, so a zero `lora_B` would have meant the
expert half was never trained and could be dropped for free. **It is not zero**,
and its norms are roughly an order of magnitude above the attention half's.
Dropping it is not cheap.

### (b) full, with a custom converter

`make_full_lora.py` writes all 210 tensors: the 192 attention ones pass
through, and the 12 expert ones are unpacked into **18** per-expert 3-D stacks
(gate / up / down × 3 layers × a/b pair).

**The packing is asymmetric and getting it wrong is silent.** From
`peft/tuners/lora/layer.py::ParamWrapper.get_delta_weight`:

```python
weight_A = weight_A.reshape(self.num_experts, -1, weight_A.shape[-1])  # (e, r, in)
weight_B = weight_B.reshape(weight_B.shape[0], -1, self.num_experts)   # (out, r, e)
delta_weight = torch.einsum("o r e, e r i -> e i o", weight_B, weight_A) * scaling
```

`r=8` and `num_experts=32`, so 256 = 32 × 8 — but **`lora_A` is expert-major
(row `e*8 + k`) while `lora_B` is rank-major (column `k*32 + e`)**. The first
version of the converter written here sliced both expert-major. It produced a
file that converted, loaded, ran and generated fluent output — and was wrong.
The error is recorded rather than quietly fixed, because the artifact gave no
sign of it: see "what the mispacked run shows" below.

The converter now asserts its factoring against PEFT's own einsum, a check that
fails if the packing is wrong:

```
layer 7: per-expert factoring matches PEFT einsum exactly
layer 15: per-expert factoring matches PEFT einsum exactly
layer 23: per-expert factoring matches PEFT einsum exactly
```

Two further details the shapes settle:

- **Which einsum branch applies.** PEFT has `-> e i o` and `-> e o i` variants
  selected by `_did_swap_in_out_features`. Only `-> e i o` is shape-compatible
  with the factors in this file (`lora_A` input dim 2880 = hidden, `lora_B`
  output dim 5760 = 2 × intermediate, against `gate_up_proj`'s
  `(experts, hidden, 2*intermediate)`). Note that `GptOssExperts` in
  transformers 4.57.6 does **not** define `is_transposed`, which in peft 0.21.2
  would select the *other* branch — so the adapter was trained under a PEFT
  whose logic differed here. **The shapes, not the version, are what the
  reconstruction rests on.**
- **The gate/up de-interleave.** `conversion/gpt_oss.py` splits `gate_up_proj`
  into `ffn_gate_exps` / `ffn_up_exps` by even/odd output index
  (`[:, ::2, :]` and `[:, 1::2, :]`), so `lora_B`'s rows split the same way and
  `lora_A` is shared between the two (both read the same input).
- **Scale.** The runtime computes `alpha / lw->b->ne[0]` = 16 / 8 = 2.0, which
  equals PEFT's `alpha/r`. Emitting per-expert rank 8 keeps the attention and
  expert halves on the same scale, matching PEFT.

Result: `schgen-lora-full-f32.gguf`, **210 tensors, 69.0 MB** (larger than the
58 MB source because `lora_A` is duplicated across the gate and up splits).

---

## Step 3 — both adapters load, and the adapter changes the output

### Loading

Both load and generate with no error. `--lora` on `llama-cli` 0.8.0:

| adapter | loads | gen tok/s |
| --- | --- | --- |
| none (base) | — | 13.9 |
| attention-only, 192 tensors | yes | 13.1 |
| full, 210 tensors | yes | 13.5 |

### The clean load is meaningful, and here is the check that establishes it

A clean load would prove nothing if llama.cpp silently skipped tensors it could
not place. Two deliberately broken copies of the full adapter were built to find
out — **a check that could have failed**:

| control | mutation | result |
| --- | --- | --- |
| `badname` | `blk.7.ffn_down_exps` → `blk.7.ffn_nonexistent_exps` | **rejected**: `llama_adapter_lora_init_from_file_ptr: failed to apply lora adapter: LoRA tensor 'blk.7.ffn_nonexistent_exps.weight' does not exist in base model`, exit 1 |
| `badshape` | expert stack truncated to 16 experts instead of 32 | **core dumped**, exit 139 |
| real full adapter | none | loads, generates, exit 0 |

So llama.cpp does bind and name-check expert LoRA tensors. **The full adapter's
18 expert stacks found real homes** at `blk.{7,15,23}.ffn_{gate,up,down}_exps.weight`.

**An incidental llama.cpp defect, recorded because nobody asked for it and it
will bite someone.** The load-time validation in
`llama_adapter_lora_init_impl` compares only `ne[0]` and `ne[1]`:

```cpp
if (model_tensor->ne[0] != w.a->ne[0] || model_tensor->ne[1] != w.b->ne[1]) {
    throw std::runtime_error("tensor '" + name + "' has incorrect shape ...");
}
```

For a 3-D expert stack `ne[2]` is the expert count and is **never checked**, so
a LoRA with the wrong number of experts passes validation and then segfaults
during graph execution with no message. That is the `badshape` result above.

### Does the fine-tune have an effect?

**Yes, demonstrably — the weights are doing something.** All runs used
`--temp 0 --seed 1234` with an identical prompt, so decoding is greedy and
deterministic and sampling is excluded as an explanation. The prompt was built
from SchGen's **own** `config.py::prepare_context()` (so the real five-primitive
definition and the real `imu_L1.py` few-shot example) plus a user message copied
verbatim from `generate.py::run_raw_test()`, with the symbol context extracted
from the **installed KiCad 10 libraries** rather than written from memory.

The request: an RC low-pass — 10K series R1, 100nF C1 to ground, a 2-pin
connector J1, a GND symbol.

Four configurations produced **four different programs**. That alone settles
that the adapter is being applied and that the expert half contributes
numerically (the attention-only and full outputs differ from each other).

| | base | attention-only | full, mispacked | full, correct |
| --- | --- | --- | --- | --- |
| final answer fenced in ```` ```python ````? | yes | yes | yes | **no — raw Python** |
| `### Placing center symbol 1 : …###` (the example's idiom) | no | no | no | **yes** |
| `center_x_1, center_y_1` naming | yes | no | no | **yes** |
| `mirror="None"` as a string, as the example writes it | no | no | no | **yes** |
| trailing prose essay after the code | no | **yes** | no | no |
| uses `get_pin_location` / `add_label` | no | no | yes | no |
| GND placed below the node | no (**+30 mm, above**) | yes | yes | yes |
| `C1` grounded via its bottom pin (pin 2) | no (**pin 1**) | yes | yes | yes |

**The base model's two geometry errors are real.** `Device:C`'s pins are at
y = +3.81 (pin 1) and y = −3.81 (pin 2), measured from the library; base put the
GND symbol 30 mm *above* the node and then grounded the capacitor through its
*top* pin. The adapted runs put ground below and used pin 2.

**The corrected full adapter was the only run to emit the program as raw
Python.** Its two backtick fences are at lines 84 and 88, inside the thinking
block that ends at line 142; base, attention-only and mispacked all wrap their
final answer in a fence. This matters operationally: SchGen's `generate.py`
parses the response with `save_final_python`.

### What cannot be concluded

Set out plainly, because the temptation to over-read this is strong.

- **The idiom match is one prompt, and the second prompt reversed it.** See
  step 4: on a seven-part circuit the corrected full adapter produced a long
  prose answer that ran out of tokens with the wrong topology, while **base
  produced a complete and correct program**. One matching sample and one
  sample where the adapter was *worse* is not a demonstrated improvement — it
  is two data points that disagree.
- **"More SchGen-idiomatic" is this writer's judgement, not a criterion anyone
  else set.** The countable facts above (fence position, idiom strings present
  or absent, which pin was grounded) are measurements; calling the result better
  is not. No independent acceptance criterion for model output exists in this
  repository, and this document does not author one.
- **The idioms are in the prompt.** `### Placing center symbol 1 : …###`,
  `center_x_1, center_y_1 = 150.0, 110.0` and `mirror="None"` all appear in
  `imu_L1.py`, which the system prompt embeds. The corrected full adapter is
  **following the in-context example more closely** than the others — it is not
  recalling anything the prompt did not supply. That is consistent with a
  fine-tune on data in that format, and it is also consistent with any change
  that happens to increase example-copying.
- **Reconstruction fidelity is argued, not verified against ground truth.** The
  per-expert factoring provably matches PEFT's einsum, and the de-interleave
  matches llama.cpp's own splitter. What is *not* available is an independent
  reference — no pre-merged copy of SchGen is on this machine — so there is no
  end-to-end check that the assembled adapter reproduces the authors' merged
  weights. **The mispacked version also loaded, ran and sounded fine**, which is
  exactly why that absence matters.
- **No output was rendered.** Whether any emitted program draws a legible page,
  or draws at all, is untested here by design.

---

## Step 4 — one real task, and here the adapter made things WORSE

Same construction, a larger circuit: J1 in, 1 µF series C1, 10K series R1,
10 nF C2 to ground, 100K R2 load to ground, J2 out, GND symbol, plus global
labels `IN` and `OUT`. Seven placements, and it needs `add_label` and
`get_pin_location`.

**This is the result that most constrains what may be claimed, and it points the
opposite way from step 3.**

| | base | full adapter |
| --- | --- | --- |
| finished within 3000 tokens | **yes** | **no — cut off mid-statement at `x_R1_`** |
| final answer is a single coherent program | **yes** | no — prose, an ASCII sketch, a markdown table, a partial code block, more prose |
| `add_schematic_symbol` calls emitted | 7 | 10 (across fragments) |
| GND symbols | **1** (`#PWR_GND`) | **5** (`GND_J1`, `GND_R1`, `GND_R2`, `GND_J2`, …) |
| requested topology (R2 a shunt from the output node to ground) | **correct** | **wrong — its table puts R2 in series between C2 and J2-1** |
| both global labels placed via `get_pin_location` | **yes** | not reached before the cap |
| `write_out_all_wires()` present | **yes** | not reached |
| wall / peak RSS | 232.5 s / 12,005,988 kB | 298.4 s / 12,021,672 kB |

**The base model's step-4 program is complete and its topology is right.**
`J1.1→C1.1`, `C1.2→R1.1`, `R1.2→C2.1`, `C2.2→GND`, `R2.1→C2.1`, `R2.2→GND`,
`J2.1→R1.2`, plus both ground returns — which is exactly the network requested.
It also chose `rotation=270` for the resistors and capacitors, putting them
horizontal for a left-to-right signal path, and used one shared ground symbol.

Three further problems in what the adapter did emit:

- **Five separate GND symbols**, referenced `GND_J1`, `GND_R1`, `GND_R2`,
  `GND_J2`. The example and the convention use `#PWR1`, `#PWR2`, …; and per the
  companion trial document, SchGen resolves a reference designator by
  `re.fullmatch` **with the designator as the regex**, so unusual designators
  are a hazard.
- **The offsets table is not the requested topology** (R2 in series, not shunt).
- **It asserts that `mirror="Y"` makes the connector's "Pin_1 side face
  right-to-left"** — a geometry claim it never read back with
  `get_pin_location`.

Both answers are verbatim in `~/work/runs4/{base,full}.txt`.

### Truncation was not the cause — it was rerun with `-n 6000`

So that the token cap would not be confounded with the change in register, the
adapter's step-4 run was repeated at `-c 12288 -n 6000`
(`~/work/runs4/full-n6000.txt`, wall 318.2 s, peak RSS 12,021,944 kB). **It
finished, and it is not better.**

It produced a **seven-section numbered tutorial** — "1. What the user wants",
"2. Layout strategy", … "7. Summary" — with **four separate fenced code blocks**
rather than one program. Counted over the whole response: 12
`add_schematic_symbol` calls, 14 `connect_pins` calls and
`write_out_all_wires` appearing **4 times**. A single executable program is not
what came back; SchGen's `save_final_python` would have to stitch it together.

And the topology is wrong in a way finishing could not fix. Its own connection
list includes:

```
connect_pins("R1", "2", "GND_R1", "1")     # grounds the SERIES resistor
connect_pins("R1", "1", "C2",     "1")
connect_pins("C2", "2", "R2",     "1")     # C2 to R2, not C2 to ground
connect_pins("R2", "2", "GND_R2", "1")
connect_pins("R2", "1", "J2",     "1")     # R2 in SERIES to the output
```

R1 is the series element and this shorts it to ground; R2 was asked for as a
shunt load and is wired in series. Four ground symbols are still present
(`GND_J1`, `GND_R1`, `GND_R2`, `GND_J2`), none using the `#PWR` convention.

**So the two samples disagree, and they disagree in opposite directions.** On
the four-part circuit the adapter produced a terse program in SchGen's own
format and corrected two of base's geometry errors. On the seven-part circuit
base produced a complete and topologically correct program and the adapter
produced a prose tutorial with a wrong netlist — at both token caps.

**The defensible summary is therefore narrow: the adapter is being applied and
changes the output; no reliable improvement has been demonstrated, and on the
larger of the two circuits tried the output was worse.** Two prompts is not an
evaluation, and this document does not pretend otherwise.

---

## What would settle the open questions

Each is a criterion. Where a mechanism is suggested it is a guess from someone
who has not tried it, and the criterion is what binds.

1. **Is the expert reconstruction faithful?**
   *Criterion:* the custom converter's per-expert delta equals the delta between
   `openai/gpt-oss-20b` and a trusted `merge_and_unload()` of
   `microsoft/SchGen`, on `blk.{7,15,23}.ffn_{gate,up,down}_exps`.
   *Suggested mechanism:* run PEFT's own `merge_and_unload` on a bf16
   dequantized base and diff. **This needs far more than 15 GB of RAM** for a
   bf16 20B merge, so it is not a job for this machine.

2. **Does the fine-tune help at all, and at what circuit size?**
   *Criterion:* over a set of circuits of increasing part count, base against
   base-plus-adapter, the share of responses that are (a) parseable
   five-primitive programs with no prose wrapper and (b) netlist-equivalent to
   the requested topology. **Two samples that disagree is not that set**, and
   the step-4 result means the adapter cannot be assumed beneficial.
   **The obvious confound has already been removed**: step 4 was rerun at
   `-n 6000`, it finished, and it was no better — so the token cap was not the
   explanation and need not be re-investigated.

3. **Does the stock converter want fixing upstream?**
   *Criterion:* a handler in `conversion/gpt_oss.py` for PEFT
   `target_parameters` names that produces a file byte-identical to this
   converter's output. The 3-D stack shape llama.cpp's runtime wants is now
   known, so this is a tractable upstream contribution rather than research.

4. **The unchecked `ne[2]` in llama.cpp's adapter validation** is a defect
   independent of SchGen. *Criterion:* an expert-count mismatch raises
   `incorrect shape` instead of segfaulting.

---

## Artifacts, on `tower.local`

Nothing below is in this repository; the model files are too large and the
scripts are reproduction material, listed so the work can be picked up.

| path | what |
| --- | --- |
| `~/models/gpt-oss-20b-gguf/gpt-oss-20b-MXFP4.gguf` | base, 12,109,566,624 bytes, as supplied |
| `~/models/schgen-adapter/` | the PEFT adapter, as supplied |
| `~/models/schgen-adapter-attn-only/` | filtered copy, 192 tensors |
| `~/models/schgen-lora-attn-f32.gguf` | attention-only GGUF adapter, 192 tensors |
| `~/models/schgen-lora-full-f32.gguf` | **full GGUF adapter, 210 tensors** |
| `~/models/schgen-lora-full-MISPACKED.gguf` | the wrong-packing version, kept as evidence |
| `~/models/schgen-lora-badname.gguf`, `…-badshape.gguf` | the negative controls |
| `~/work/make_full_lora.py` | the custom converter, with its reasoning and self-check |
| `~/work/measure_expert.py` | the norm / packing / parameter-share measurements |
| `~/work/build_prompt.py` | builds the prompt from SchGen's own `config.py` |
| `~/work/symbol_context.json` | symbol geometry extracted from installed KiCad libraries |
| `~/work/runs/{base,attn,full,full-MISPACKED}.txt` | step 3, verbatim |
| `~/work/runs4/{full,base}.txt` | step 4, verbatim |
| `~/work/runs4/full-n6000.txt` | step 4 rerun at `-n 6000`, verbatim |
| `~/work/{step1,step2,step3-compare,negcontrol,negcontrol2,step4,step4b}.log` | run logs |
| `~/work/{step1_base,step2_convert,step2b,step3_load,step3_compare,step3_negcontrol,step4,step4b}.sh` | the run scripts |
| `~/work/SchGen/`, `~/work/llama.cpp/` | clones |

The comparison scripts skip any run whose output file already carries a
`@@DONE@@` marker, so a relaunch continues rather than restarts.
