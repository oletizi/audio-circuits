# Execution record: the SchGen merge on GCP

**This is an audit trail, not findings.** The findings are
`docs/research/2026-11-09-schgen-merge.md`; the design and its deviations are
`docs/superpowers/specs/2026-11-09-schgen-merge-on-gcp-design.md`.

| file | what |
| --- | --- |
| `merge-report.json` | `merge_check.py`'s full report: versions, every check, every control, the untouched tensors, the verdict |
| `sources.json` | the Hugging Face commits downloaded |
| `pip-freeze.txt` | the VM's Python environment |
| `vm-run.log` | the VM's run log, apt package noise filtered out; it includes both failed launches |

## Sequence

1. Setup and download succeeded; the merge stage failed at once:
   `/usr/bin/time: No such file or directory` (Debian lacks GNU time). Fixed in
   setup, relaunched. The relaunch was first blocked by a wrong
   `pgrep -f vm-run.sh`, which matched the ssh command carrying its own text;
   the watcher had the same bug and so had not reported the stop. Both now
   match the process's argv from its start.
2. The merge stage refused: experts loaded as bf16. Upcast added (exact),
   relaunched.
3. Merge, check, save, manifest, upload: all passed.
4. VM deleted after the upload stage completed, per the spec. The bucket is
   kept until m1-mini verifies every sha256.
