# SchGen drawing trial: what the merged model draws for the approved Pultec boards

**Status:** draft, awaiting owner review. Nothing here is built.

## Intent

The owner wants to **see what Microsoft's SchGen model actually draws** -
the faithful, full-precision merge, not the local llama.cpp reconstruction that
left him unimpressed - and decide what to do with it afterwards:

> *"I want to see what it actually draws"*
> *"I want to compare the schgen's output to those blessed schematics"*
> *"I want to see how schgen performs. I'll decide what to do once I see what it
> can actually do"*

So the deliverable is **rendered pages put in front of him**, each beside the
approved page for the same board. It is not a score, not a ranking, and not a
recommendation. This settles nothing about adoption; it gives him what he needs
to decide.

## Goals

1. For each of the five approved Pultec boards, **three SchGen attempts**, each
   either a rendered page or a recorded reason there is no page.
2. Every page shown to the owner beside that board's approved page, carrying a
   question and nothing else (`EVALUATING-DRAWINGS.md` §4). His verdicts
   recorded verbatim.
3. Checkable observations for every attempt, delivered only after he has ruled
   or on request: netlist comparison against the board model, ERC, and
   whether the program ran.
4. Everything the run produced committed: prompts, raw responses, programs,
   sheets, renders, logs.

## Non-goals

- **No base gpt-oss arm.** Owner: *"just schgen. I don't care about base
  gpt-oss."* This also retires the precision confound recorded in the serving
  spec, which existed only for a base-versus-merged comparison.
- No repair of SchGen's pages. What it drew is what he sees.
- No Kinference feature exercise beyond serving through it.
- No decision about adopting SchGen.

## Anti-goals - what would make this a failure even if it ran

- **Any selection by the agent.** Every attempt is reported; no "best of
  three", no withholding a page because the agent thinks it is poor.
  `EVALUATING-DRAWINGS.md` §3 *permits* withholding a page whose connectivity
  disagrees with the circuit; this trial **does not use that permission**,
  because a wrong drawing is exactly what the owner asked to see. Such a page
  is shown, and the netlist mismatch is among the observations given after.
- **Any verdict vocabulary from the agent** about a page (§2).
- **Driving SchGen wrong and blaming the model.** Every place this trial
  departs from how SchGen's authors run it is named below, with why.
- **Hand-written or remembered circuit content.** Every prompt is generated
  from this repository's model.

## The boards

The five pages in `drafted/pultec/` whose sheet bytes match a verdict of
*"approved"* in `docs/schematic/verdicts.md` (checked 2026-11-09 by sha256):
`pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`,
`pultec-mid`.

`transistor-preamp-staged` has a positive verdict (*"The repaired drawing looks
great"*) but not the word approved, and `verdicts.md` forbids inferring
approval, so it is **out unless the owner adds it**.

The builder re-runs the sha256 check before the run and refuses a board whose
sheet no longer matches.

## How SchGen is run, and where this departs from its authors

Read from `github.com/microsoft/SchGen` at `0707520c`, 2026-11-09.

**Their inference path is single-shot.** `schematic_generation/generate.py`
builds messages, calls `model.generate` once (`max_new_tokens=13312`, sampling
from the checkpoint's generation config), and extracts the program with
`get_final_python`. **There is no self-correction loop at inference** - the
agentic loop in the repository is in `dataset_construction/`, which builds
training data. (An earlier session's message called it a retry loop; that was
wrong.) So three attempts are three independent samples of one prompt.

**Their prompt** is `config.py::prepare_context()` (system message: the
five-primitive API and the `imu_L1.py` worked example) plus a user message whose
text is fixed in `generate.py::run_raw_test()`: the user request, then the
symbol context, then their instructions on rotation, mirror and pin locations,
and *"Limit your thinking process less than 1000 words."* This trial uses that
template verbatim.

**Their chat template, applied by us, not by the server.** `training/modified_chat_template.txt`
differs from `openai/gpt-oss-20b`'s `chat_template.jinja` at the pinned base
revision only by the `{% generation %}` training markers (diffed 2026-11-09).
But vLLM's chat endpoint for gpt-oss may build the prompt its own way (the
harmony renderer) rather than from that file, and it returns reasoning and
answer as parsed fields without the `<|channel|>final<|message|>` markers their
`get_final_python` looks for. So **the trial renders the prompt itself** with
their template via `tokenizer.apply_chat_template(..., add_generation_prompt=True)`,
sends the resulting text to **`/v1/completions`**, and asks for the output with
special tokens kept. The prompt bytes are then theirs, the committed raw
response is what their extractor parses, and extraction is their
`get_final_python` unchanged. *(Agent's call.)*

**Sampling matches theirs, sent explicitly.** Their `model.generate` takes the
base checkpoint's `generation_config.json` (`do_sample: true`, nothing else set)
and so transformers' defaults: temperature 1.0, top_k 50, top_p 1.0. vLLM does
not apply transformers' top_k default, so every request sends
`temperature=1.0, top_k=50, top_p=1.0, max_tokens=13312`. Reasoning effort is
whatever their template renders by default (medium); nothing overrides it.
Attempts 1, 2, 3 carry seeds 42, 43, 44 - theirs is `torch.manual_seed(42)` -
recorded, though vLLM's sampler will not reproduce transformers' draws.
*(Agent's call.)*

| departure | why | effect, as far as known |
| --- | --- | --- |
| **Symbol selection.** Theirs asks a second model (`gpt-5.2` on Azure) to pick symbols from the library for the request, then formats them with `describe_symbol_info`. This trial **supplies the exact symbols the approved page uses**, formatted by the same `describe_symbol_info`. | no Azure GPT-5.2 here; and the parts are known exactly from the board, so a selector could only add error | favours SchGen: it cannot pick a wrong symbol. Stated so nobody reads a page as including symbol choice |
| **Inference engine.** vLLM 0.32 serving the merged bf16 weights, not transformers `generate` on MXFP4-dequantized base plus PEFT merged at load | this is the serving stack already proven (`docs/research/2026-11-09-schgen-kinference-serving.md`); the merge is verified faithful (`docs/research/2026-11-09-schgen-merge.md`) | same weights to bf16; sampling implementation differs, so samples are not bit-reproducible against theirs |
| **Context length.** `max_model_len` raised from 16384 to fit the longest prompt plus 13312 output tokens | a Pultec board's symbol context may be long; a truncated prompt or cap below theirs would handicap the model | none on content |
| **Emitter fixes - all four from the 2026-10-29 trial.** (a) rebuilt `component_repository.json`; (b) the four-line pin-extraction fix - there a monkey-patch inside the hand-written program, here **injected by the harness** before the model's program runs, never written into it; (c) replacing the nil root-sheet UUID, without which every page renders blank while export and ERC report success; (d) skipping `get_fp()`, which always raises, so `init_project.py` does not always exit non-zero | without them their emitter cannot draw these boards, and without (c) all fifteen pages would come out blank (`docs/research/2026-10-29-trial-microsoft-schgen.md` §2, §3, §4) | none on placement or connectivity |
| **Power symbols.** The approved pages use `copperhead_power:GND` and `copperhead_power:PWR_FLAG`, which are not stock libraries and which `describe_symbol_info` cannot describe. SchGen is given **stock `power:GND`**, and **no `PWR_FLAG`** | `GND` is the same symbol in the stock library SchGen resolves to anyway; `PWR_FLAG` is a page convention, not part of the circuit, so supplying it would hint at the approved page | expect an ERC `power_pin_not_driven` on every attempt, reported as an expected consequence; a ground net named differently on the page than in the model (`0` against `GND`) must not count as a difference: the comparison is of which pins share a net. The builder confirms how the existing comparator in `tests/circuits/` treats net names before reusing it (not checked while writing this) |

## The user request - the one piece of text not taken from SchGen

SchGen's user request is free text written by a person. Here it is **generated
mechanically from the board's model** - the same netlist the round-trip test
compares the approved page against: each part with its reference designator,
value and symbol, and each net with its pins, plus the board's ports as labels.
No layout hint is given that the approved page's placement could leak through.

The exact generator and the generated text for each board are committed and
shown to the owner with the first page, so he can see what SchGen was asked.

## Where it runs

The serving stack from the serving spec, unchanged except `max_model_len`:
GKE Standard, one Spot g2-standard-48 (4 x L4), vLLM v0.32.0 by digest behind
Kinference, model from the bucket. Requests go **through the Kinference
gateway**. Capacity is found first with `tools/schgen-serving/probe-capacity.sh`;
the cluster exists only for the run and is torn down after. Fifteen requests is
a short run.

**Requests go through the gateway on `/v1/completions`.** The serving phase
routed only `/v1/chat/completions`; the HTTPRoute gains a `/v1/completions`
rule and the builder proves it with the same marker smoke before the run. If
Kinference will not route `/v1/completions`, that is a finding, recorded, and
the run goes direct to vLLM's service, named as a departure - fidelity to
SchGen's prompt outranks the gateway. *(Agent's call.)*

**Model-written programs run in a locked-down Docker container on the
laptop** - not on the laptop's own Python: no network, a read-only SchGen tree
and KiCad symbol libraries, a writable output directory, CPU and time limits.
The container's only job is SchGen's emitter, writing a `.kicad_sch`. **The
sheet is data, so rendering, netlist export and ERC run on the host** with the
same macOS `kicad-cli` 10.0.5 that rendered the approved pages and runs the
round-trip test, so both sides of every comparison come from one renderer.
*(Agent's call.)*

## What the owner is shown, and in what order

Per board, in a fixed order: the approved page, then attempts 1, 2, 3 by
attempt number. An attempt with no page appears as a text card saying which
stage stopped it (no program extracted / program raised / blank page) with the
error verbatim. **Renders go first**, before any summary (§4). One question per
board: what he makes of SchGen's attempts against the approved page.

Then, after he rules or on request, per attempt: program ran or not; netlist
equal to the board model or the differences; ERC counts; output tokens;
`finish_reason`.

## Recorded where

- Run tooling: `tools/schgen-drawing-trial/`.
- Execution record: `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/`,
  one directory per board and attempt: prompt, raw response, extracted
  program, sheet, renders, netlist, ERC, logs.
- Verdicts: `docs/schematic/verdicts.md`, verbatim, bound to each sheet's sha256.
- Findings: `docs/research/` - observations only.

## Left to the builder

Container mechanics; the request generator's code; the `max_model_len`
value (measured from the longest prompt); how pages are laid side by side for
the owner; the order boards run in.

## Decisions

| decision | who | why |
| --- | --- | --- |
| Test SchGen on drawing, not on prose or programs alone | owner, 2026-11-09 | *"I want to see what it actually draws"* |
| Compare against the approved schematics | owner, 2026-11-09 | *"I want to compare the schgen's output to those blessed schematics"* |
| No base gpt-oss arm | owner, 2026-11-09 | *"just schgen. I don't care about base gpt-oss."* |
| Purpose: see what it can do, decide later | owner, 2026-11-09 | *"I'll decide what to do once I see what it can actually do"* |
| Three attempts per board, all shown | owner, 2026-11-09 (*"yes"*) | one sample says little about a model; more is a heavier review |
| Boards: the five sha-matched approved Pultec pages; `transistor-preamp-staged` out unless added | agent | `verdicts.md` records approval only for these; it forbids inferring approval from other words |
| Show wrong-netlist pages rather than withhold them | agent | the owner asked to see what it draws; §3 permits withholding, does not require it |
| Supply exact symbols instead of the Azure GPT-5.2 selector | agent | no access to it; the parts are known; stated as favouring SchGen |
| User request generated from the model, no layout hints | agent | transcription is evidence, not memory; no leak of the approved placement |
| Serve through the Kinference gateway on the existing stack | agent | proven in the serving phase; keeps the Kinference content thread alive at no extra cost |
| Render SchGen's template ourselves and use `/v1/completions`; direct to vLLM only if the gateway will not route it | agent | the prompt bytes and the raw response must be theirs; fidelity to SchGen outranks the gateway |
| Send transformers' sampling defaults explicitly; seeds 42, 43, 44 | agent | vLLM's defaults differ from what their `generate` used |
| Stock `power:GND`, no `PWR_FLAG` | agent | `copperhead_power` is not describable; `PWR_FLAG` is a page convention that would hint at the approved page |
| All four emitter fixes from the 2026-10-29 trial, pin fix injected by the harness | agent | without them nothing draws, or every page is blank |
| Emitter in laptop Docker; render, netlist and ERC on the host's `kicad-cli` 10.0.5 | agent | isolates model-written code; one renderer for both sides of the comparison |
| Builder check run 2026-11-09; its four questions settled as the rows above | agent | none needed the owner |
