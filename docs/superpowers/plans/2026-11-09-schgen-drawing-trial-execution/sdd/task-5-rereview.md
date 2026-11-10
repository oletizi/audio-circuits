Task 5 fix round 1 re-review (c8f8348..b06a196). Read-only; suites not re-run.

## Findings

- I1: Fixed. token_identity.py:106-109 and 135-142 raise unless TRIAL_ACCEPT_COUNT_ONLY=1 (token_identity.py:47-51 refuses any other value). run_attempt.py:127-129 runs the check on every run, after ensure_response, on the saved response. No path continues without the flag: both IDs absent raises; one absent raises (:110-114); stray `*token_ids*` keys anywhere else raise by name (:95-103); the empty-list and mismatch cases raise. Tests test_stages.py (no-IDs-without-flag, IDs-at-another-path) can fail; the implementer's revert run showed 1 failure for each fix.
- I2: Partially. stages.py:204-208 closes the reported path: the netlist counts only when its stage is ok (test_fix_round1.py test_netlist_failure_does_not_hide_page can fail, per revert run). Residual in the same function: stages.py:209-211 returns a blank reason when page.svg is absent or unreadable, because svg_strings("") is empty. page_produced (stages.py:250-256) then goes false even if page.png exists. Whether a PNG can exist without page.svg depends on render.ts, which I did not read. No test covers it. See Minor N1.
- M1: Fixed. run_all.sh:56-59 assigns kicad_version on its own line under set -euo pipefail (run_all.sh:28). No test exists, but the construct is correct.
- M2: Fixed for recording; one residual, see N2. persist.py write_sent runs before the POST (run_attempt.py:99). quarantine_incomplete (persist.py:128-157) records generation-lost when only request.sent exists, with the old request_id. Non-conforming payloads are kept in rejected/<stamp>/ (generation.py:96-112, persist.write_rejected). Tests test_sent_request_without_response_is_lost, test_http_error_body_is_kept_and_next_run_records_loss and test_non_completion_200_is_kept can fail.
- M3: Fixed. board_request.py check_prompt_bound runs at the end of every prepare (board_request.py:98-101), so on every attempt. It compares the sha256 of the IDs and the render date against fidelity.json. fidelity.py now emits both from the same render() that it compares. An old fidelity.json without the fields gives (None, None) against actual values, which refuses. I found no bypass. The check binds two files on disk; it does not bind either to the tokenizer or the template digest, which fidelity already covers. Tests (parametrized for the digest and the date) can fail.
- M4: Fixed. Details at stages.py:184-194 now state only what emitter.log shows. The ambiguous case has a test (test_classify.py) and a no-cause-words assertion.
- M5: Fixed. stray_render_outputs (stages.py:127-134) is used by set_aside_downstream (run_attempt.py:136-137). test_rerun_moves_stray_render_outputs can fail.
- M6: Fixed. spaces_between_special_tokens is false in SAMPLING (generation.py:42), asserted in test_stages.py:68, and recorded in the module comment as a departure.

## Judgments asked for

- Is the regeneration after generation-lost bounded? Per run, yes: one POST per ensure_response, and run_all stops on any non-zero exit (run_all.sh:80-82), so no loop. Across relaunches, no.
- Is the missing cap on repeated rejections a defect? Yes. The spec's "regenerate once" for an attempt that never completed is not enforced. Each operator relaunch quarantines request.sent and resends seed N.
  - The record is not blurred. Every loss is a reruns.jsonl entry, and the payloads and markers are kept.
  - But a deterministic rejection (a 4xx for a bad body, or a persistently non-conforming 200) spends one generation per relaunch with nothing refusing it.
  - Rule: Important, small.
  - Bound: before sending, count entries in the attempt's reruns.jsonl whose reason is generation-lost or generation-interrupted. At one or more, refuse unless an explicit `--allow-regeneration REASON` is given and is recorded.
  - Also refuse to resend after a 4xx rejection at all. A 4xx is a request defect, not an interruption, so a resend with the same body cannot help.
  - Add a test: a second relaunch after a rejection raises without calling the client.

## New issues

Critical: none.

Important
- N2: Repeated resends are unbounded across relaunches, as ruled above (run_attempt.py:94-107, persist.py:128-157).

Minor
- N1: blank_reason's SVG branch (stages.py:209-211) can withhold a PNG when page.svg is missing. Guard it the same way as the netlist: apply it only when the render stage is ok and page.svg exists. Then add a test with a PNG present and the SVG absent.
- N3: persist._sent_request_id (persist.py:116-120) swallows an unparseable request.sent and omits request_id. It is loud enough because the entry is still recorded, but it is a silent drop. Say "request_id unreadable" in the entry.
- N4: manifest `count_only_acknowledged` records whether the env flag was set, not whether the count-only path was used. A verified attempt run with the flag set shows `true` beside `token_identity: verified`. This is harmless but ambiguous.

No new silent fallback beyond N3. The largest file touched is 274 lines (tests/test_stages.py); none is over 500. The one commit (b06a196) carries no AI attribution.

Verdict: Open findings remain. I2 is partial (N1) and the unbounded resend (N2) is a defect. Both are small and local.
