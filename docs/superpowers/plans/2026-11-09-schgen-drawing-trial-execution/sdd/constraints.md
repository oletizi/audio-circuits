## Global Constraints

- Boards: `pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut`, `pultec-mid`; refuse any whose `drafted/pultec/<board>/<board>.generated-do-not-edit.kicad_sch` sha256 is absent from `docs/schematic/verdicts.md`.
- Three attempts per board; seeds 42, 43, 44 for attempts 1, 2, 3.
- Sampling sent explicitly: `temperature=1.0, top_k=50, top_p=1.0, max_tokens=13312`. Prompt sent as token IDs to `/v1/completions`, with `skip_special_tokens=false`.
- SchGen pinned at `0707520c587984651cd32908acfd9b117876e93b`; its user-message template and `get_final_python` are taken from its source, never retyped.
- Symbols: the model's intended symbol per component, plus `power:GND`; never `copperhead_power:*`, never `PWR_FLAG`.
- No request text is hand-written; the request generator opens no `.kicad_sch`.
- An attempt with a saved raw response is never regenerated.
- Model-written programs run only inside the container with `--network none`.
- Render, netlist and ERC use the host `kicad-cli` 10.0.5.
- No agent verdict vocabulary about any page (`EVALUATING-DRAWINGS.md` §2); every attempt shown, none withheld, none ranked.
- Failure cards read exactly `Attempt N: no schematic generated`.
- Repo rules: no git hooks, no `--no-verify`, no AI attribution in commits, no `sed` writes, no `#` inside multi-line quoted bash arguments, long work under `nohup`, commit and push after each task.

## Review Focus

1. **A response with no `final` channel** - SchGen's extractor silently falls back to the whole response; expect the attempt classified `no-final-channel` and the fallback's program still tried and recorded, not silently treated as a clean extraction. Test in Task 5.
2. **A response cut off at `max_tokens`** (`finish_reason: length`) - expect it recorded, extraction attempted, and the page (if any) shown like any other. Test in Task 5.
3. **A blank result.** There are two kinds. A program that places nothing is `symbol-free-sheet`. A sheet with symbols that renders or exports empty (the nil-UUID class) is `blank-render`. Either way, expect a neutral card for the owner and the sheet kept. Test in Task 5.
4. **A Spot node reclaimed mid-request** - expect the attempt to have no raw response, a relaunch to regenerate only that attempt, and all others untouched. Test in Task 5.
5. **A program that never terminates, floods its output, or exhausts memory** - expect `emit.sh` to stop it, remove the container, and classify the attempt `limit-exceeded` with the limit named. Test in Task 1.

---
