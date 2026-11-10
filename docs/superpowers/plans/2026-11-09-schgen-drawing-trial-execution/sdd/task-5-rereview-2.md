Task 5 fix round 2 re-review (b06a196..09dc205). Read-only; suites not re-run.

## Findings

- N2 (I2/unbounded resend): Fixed. run_attempt.py:104-123 check_regeneration_allowed, called at run_attempt.py:133 after the provenance check and before quarantine_incomplete. It refuses at one or more recorded generation-lost/interrupted entries (persist.py:134-138), or when the kept rejection for request.sent's request_id is 4xx (persist.py:120-131). Exit 4 (run_attempt.py:~213) stops run_all.sh. The first loss after a 5xx or a dropped connection is resent once without the flag. A 4xx is never resent automatically. Tests test_second_relaunch_after_rejection_refused, test_4xx_rejection_is_never_resent_automatically (client asserted uncalled, request.sent asserted untouched) and test_allow_regeneration_sends_once_and_records can fail: remove the check and the client is called.
- --allow-regeneration recorded: Yes. run_attempt.py:122 appends {reason: regeneration-allowed, operator_reason} to reruns.jsonl before the send. test_allow_regeneration_sends_once_and_records asserts the order and the text. Manifest downstream_reruns carries it. run_all.sh never passes the flag (header comment).
- N1: Fixed. stages.py:~414-418 applies the SVG branch only when the render stage is ok and page.svg exists. test_png_without_svg_is_still_a_page (FakeTools render_svg=False) fails on the old code, since the old code returned a blank reason for the empty SVG. No other path withholds an existing PNG: page_produced (stages.py:253-259) also returns false on a zero-byte PNG or a sheet with zero symbols, and both are true conditions, not tool absences. The netlist branch is gated on netlist ok (round 1).
- N3: Fixed. persist.py:107-117 sent_request_id returns "request_id unreadable" for unparseable JSON or a missing or empty id. test_unreadable_request_sent_is_said can fail.
- N4: Fixed. manifest.py: count_only_acknowledged is token_identity == COUNT_ONLY; accept_count_only_env records the flag. test_count_only_acknowledged_means_the_path_was_used covers both paths (verified plus flag gives False/True; count-only gives True) and can fail.

## Other checks

- Bounded to one automatic regeneration across relaunches: Yes. The earlier-count comes from the on-disk reruns.jsonl, so it survives relaunch. Sequence: first send lost (503), second send automatic and recorded, third refused. The test walks exactly that.
- Rejected-payload 200 (non-conforming, status 200) is treated as non-4xx: resent once automatically, then refused. Consistent with the brief.
- Unparseable rejection.json: pending_rejection_status (persist.py:127) raises a raw JSONDecodeError. Loud, so no silent fallback. Judged Minor, see M-a.
- No file over 500 lines (largest 274, tests/test_stages.py).
- Commit 09dc205 message carries no AI attribution.
- No new silent fallback found, with the two Minors below as the nearest cases.

## New issues

Critical: none.

Important: none.

Minor
- M-a: persist.py:127 gives a bare JSON error that names no file. Wrap it to say which rejection.json is unreadable and that the 4xx check cannot be made. Same class as the old N3, and it is loud.
- M-b: persist.py:130 returns None when a rejection's status is not an int. The guard then reads as "no 4xx" and allows an automatic resend. Raise instead.
- M-c: every 4xx is treated as non-retryable, including 429 and 408, which are transient. This is the stricter and safe direction, and the operator flag handles it. Noted only.

Verdict: All addressed
