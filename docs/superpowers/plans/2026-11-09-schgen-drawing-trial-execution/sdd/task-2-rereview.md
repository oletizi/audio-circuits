Task 2 re-review (fff418f..d0d79ff)

Findings
- Important 1 (pin numbers from the rule): Fixed. tools/schgen-drawing-trial/request.ts:149 `requestPinNumbers` returns `pinNumbersFor(component)`; used at request.ts:~166 in `netlistFor`. `model.pinNumbers` is no longer read there. Tests compare against the same rule map: tests/schgen-trial/request.test.ts `rulePinNumbers` (used in `modelPins` and `disagreements`). A test asserts `buildRequest("pultec-low-boost").netlist.nets["out"]` contains "R1.1" (test file, last tests). It fails if the declared R2 a/b swap returns. I did not mutation-test it.
- Minor 5 (symbol token without colon): Fixed. request.ts `symbolToken` throws unless exactly `lib:sym`. `token()` no longer has the symbol special case. `netlistFor` calls `symbolToken(intendedLibId(component))`. Test refuses "R" and "Device:R:x" and accepts "Device:R".

Checks
- Page-declared pins: grep of request.ts finds DECLARED_PIN_NUMBERS and pinNumbers only in comments (request.ts:16-20, 149, 166, 179). boards.ts has none. No path feeds them into request text, symbols or netlist.
- Leak, control and known-disagreement tests: the diff touches only `modelPins` and `disagreements` (swapping the pin map to the rule map). No assertion was removed or loosened. Ran tests/schgen-trial/request.test.ts: 35 pass, 0 fail.
- Attribution: the d0d79ff message carries no Co-Authored-By, Claude-Session or generated-by line.

New issues
- Critical: none.
- Important: none.
- Minor: `requestPinNumbers` is a one-line wrapper over `pinNumbersFor`. It exists so the tests share the map, which is acceptable.

Verdict: All addressed
