# SchGen merge tooling

Merges Microsoft's SchGen LoRA into `openai/gpt-oss-20b` with PEFT on a GCP VM,
checks the merge against the reference reconstruction, and brings the merged
model to m1-mini. The design is
`docs/superpowers/specs/2026-11-09-schgen-merge-on-gcp-design.md`.

| file | runs on | what |
| --- | --- | --- |
| `env.sh` | - | project, zone, VM, machine type, bucket |
| `provision.sh` | laptop | creates the bucket and VM if absent, copies scripts, launches `vm-run.sh` detached |
| `status.sh` | laptop | finished stages and log tail on the VM |
| `vm-run.sh` | VM | setup, download, merge and check, upload; resumable by stage markers |
| `download.py` | VM | downloads both repositories at pinned commits, records them |
| `merge_check.py` | VM | the merge and the faithfulness check; saves nothing unless it passes |
| `pull-to-m1-mini.sh` | m1-mini | pulls to `/Volumes/Big Disk/models/` and verifies sha256s |
| `teardown.sh` | laptop | deletes the VM; with `--bucket`, the bucket too, only after the pull verified |
| `make_full_lora.py` | (tower) | the custom GGUF converter from the tower run, copied **unchanged**; its tower paths are hard-coded. It is here as the reference whose formula `merge_check.py` re-derives, and so that the work behind the tower results is in git |
