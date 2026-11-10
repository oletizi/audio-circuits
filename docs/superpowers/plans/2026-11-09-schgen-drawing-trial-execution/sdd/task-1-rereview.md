Re-review of fix round 1 (5a5134b..8961222). Commit message carries no AI attribution (checked). No fallbacks added. Suite not re-run; read the diff and the files at HEAD.

Findings

- Important 1 (LIMIT glued to unterminated line): **Fixed.** emit.sh:73-83 `log_line` appends a newline when the log is non-empty and its last byte is not `\n`, then writes the line; `limit_line` wraps it. wall-time (emit.sh:156), memory (:176) and output-bytes (:125) all use it, as do the diagnostics (:141, 147, 168, 180, 190). Tested: tests/test_emitter.py:235 `test_limit_line_survives_unterminated_output`, fed by the `runaway_unterminated` and `memory_unterminated` hostile programs; asserts the last line is `LIMIT: <name>` and the line before ends in `x`. The implementer reports both failed on the old emit.sh.
- M1 (failed USR1 send): **Fixed.** emit.sh:145-149 removes the sheet, logs a named line, exits 1. Tested: test_emitter.py:251 via a PATH shim on `docker`; it asserts the last log line, no sheet and no leftover container. It tests the handling of the failure, not a real daemon failure, which the implementer says.
- M3 (stream subshell outlives emit.sh): **Fixed in code, not proven by its test.** emit.sh:66-68 puts the status and pid files in a `mktemp -d` dir. :86-94 kills the container, kills the group pid, runs `wait`, then `rm -rf`s the dir. The test (test_emitter.py:244 `test_no_temp_files_left`) passed on the old code too, per the implementer, so it is a regression guard and shows nothing about the race. Nothing asserts that the subshell is dead after exit. I accept the code by reading it: the pid file is written by `sh -c 'echo $PPID'` inside the group, so it holds the group subshell's pid.
- M4 (pids check silent): **Fixed.** run_emitter.py:169 `pids_max_events` returns None when the file is absent. :181 `limit_name` prints `PIDS-CHECK: could not run: ...` (:194) and returns None. It blames pids only when the counter rose between the reading taken at :225 and the failure. Tested: test_emitter.py:299 (file missing: the line is printed and the result is None) and :309 (counter unchanged: None; counter rose: pids). The end-to-end path is covered by the existing fork-bomb test.
- M7 (stale lock comment): **Fixed.** requirements.in names lock.sh. lock.sh sets CUSTOM_COMPILE_COMMAND to the exact command it then runs (one variable feeds both), and the lock header matches it. The diff shows the header line as the only lock change. No test; none is needed.
- M9 (pin fix has no behavioural test): **Fixed.** test_emitter.py:323 places Connector_Generic:Conn_01x05 through emit.sh and asserts exactly one instance with pins {1..5}. The implementer reports 0 pins without the patch.

New issues

Critical: none.

Important: none.

Minor

1. **emit.sh:139, 145 and the log stream.** The `exec cat` failure and USR1 failure paths write `log_line` while the `cap_stream.py > "$LOG"` writer is still running, because no `wait` precedes them. That writer holds a truncating (non-append) file descriptor, so any later write from it lands at its own offset and could overwrite the diagnostic line. Nothing is written by the container at that point, so the new test passes. This race existed before the fix, and the exec path had it already. Cheap fix: kill the container and wait for the stream before writing, as the wall-time path does.
2. **emit.sh:88-91, trap before the pid file exists.** If emit.sh exits in the window before the subshell has written GROUP_PID_FILE, `-s` is false and the group is not killed. The bare `wait` on :91 then waits for the whole `docker run` pipeline. The container was probably not created when `docker kill` ran, so it could be held up. Only an early-exit window; unlikely, and the trap does not hang on any path the tests reach.
3. **emit.sh:73-78, empty and missing log.** This is correct. An empty log (`-s` false) gets no leading newline. A log ending in `\n` gets none, since `$(tail -c 1)` strips the newline and the test sees an empty string. LOG is created by `: > "$LOG"` before any caller. A log whose last byte is NUL reads as empty through `$(...)` and gets no newline; the program would have to print a trailing NUL, and nothing tests it.

Questions answered

- **Trap killing the subshell on every exit path:** the trap is installed (:95) before the subshell starts, and EXIT also fires on `set -e` exits and on the explicit `exit` paths. It kills the group by pid and waits for it. `rm -rf` runs last, so the trap's status does not replace the script's exit code. Covered apart from Minor 2. Signals (INT/TERM) are not trapped explicitly. No test kills emit.sh mid-run.
- **PIDS-CHECK mistaken for a final LIMIT line:** no. The line begins `PIDS-CHECK:` and the word `limit` appears only in lowercase inside it (`pids-limit`). It is printed only when no LIMIT line is, since `limit_name` then returns None. A matcher for `^LIMIT: ` is unaffected. A case-insensitive substring search for "limit" would match it. The new tests assert only the unit result and the `PIDS-CHECK` text, not the classification of the final line in a run. A hostile program could print its own `LIMIT:` line; that was already true.

Verdict: All addressed
