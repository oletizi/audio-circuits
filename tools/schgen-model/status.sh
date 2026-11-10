#!/usr/bin/env bash
# Runs on the laptop. Shows the VM run's finished stages and the log tail.
set -euo pipefail
source "$(dirname "$0")/env.sh"
gcloud compute ssh "$VM" --project "$PROJECT" --zone "$ZONE" --command \
  "ls ~/schgen/done 2>/dev/null; echo ---; tail -n ${1:-25} ~/schgen/run.log; echo ---; free -g | head -2; df -h / | tail -1"
