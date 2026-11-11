Task 1 report

Status: DONE. Commit 78db360 "h7-platform port: byte-identical contract, results, licences and layout-B record; verify script", pushed.

Files created
- docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh (five checks: bytes, nocode, provenance, effective, stale-json; ALL_CHECKS list plus a case in run_check; add a check by adding a check_ function, a list entry and a case)
- circuits/h7-platform/module-interface.json, interface-analysis-results.json, LICENSE-OSCAR, LICENSE-APACHE-2.0 (git show from 5b926d0, redirected)
- docs/h7-platform/layout-B.svg (same)
- docs/h7-platform/open-items.md (Ported from: pinned links to the split spec and S1 rulings ledger, both verified at the pin with ls-tree; paragraph; header and separator row only; empty ## Conflicts)

RED (step 2), verbatim
FAIL bytes: [missing circuits/h7-platform/module-interface.json] [missing circuits/h7-platform/interface-analysis-results.json] [missing circuits/h7-platform/LICENSE-OSCAR] [missing circuits/h7-platform/LICENSE-APACHE-2.0] [missing docs/h7-platform/layout-B.svg]
PEDALS_REPO unset: verify.sh refuses to run: PEDALS_REPO is not set. Set it to the local pedals checkout, expected value: /Users/orion/work/pedals-work/digital-pedal-platform   (exit 2)
no-such-check: FAIL no-such-check: unknown check

GREEN (step 4), verbatim
PASS bytes
PASS nocode
PASS provenance
PASS effective

Extra checks
- effective negative test with a temp file (removed): a line with "9–12 V" (en dash) and a line with "179 Hz" were flagged; a line starting *Not in force:* with "9-12 V" was accepted. Pattern is alternation 9(–|-)12 V, byte-wise, so it needs no UTF-8 locale.
- stale-json: prints matching lines with numbers from module-interface.json (141, 345, 355, 405, 1349) and nothing from results.json; FAILs now because README.md lacks the "## Superseded statements in the records" section (expected until Task 12). No-argument run therefore exits 1 for now.

Notes / concerns
- effective exemptions implemented exactly as ruled: lines beginning *Superseded in the records:* anywhere; lines inside README.md's "## Superseded statements in the records" section (section ends at the next ## heading).
- Exit code 2 (not 1) for the unset PEDALS_REPO refusal.
- Commit message was written via a file at .superpowers/sdd/.../commitmsg-1.txt (gitignored scratch).
- No concerns beyond the above.

Fix round 1
- bytes: git show now writes to a temp file and its status is checked (temp file removed); failures print "cannot read <src> at 5b926d0 from <repo>" instead of "differs".
- nocode, provenance, effective: new require_trees FAILs if docs/h7-platform or circuits/h7-platform is missing; provenance and effective also FAIL when zero .md files are scanned; the find stderr suppression no longer hides a missing tree. effective failures print repo-relative paths.
- Negative tests in a throwaway copy under /private/tmp/claude-501/fixcopy (removed afterwards):
  PEDALS_REPO=/nonexistent bytes -> FAIL bytes: [cannot read ... from /nonexistent] x5
  trees deleted -> FAIL nocode/provenance/effective: [missing directory docs/h7-platform] [missing directory circuits/h7-platform]
  empty trees -> FAIL provenance: [no .md files found under docs/h7-platform to scan]; FAIL effective: [no .md files found to scan]
- Real worktree: PASS bytes, PASS nocode, PASS provenance, PASS effective.
