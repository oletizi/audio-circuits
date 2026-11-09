#!/usr/bin/env bash
# Runs on the laptop. Deletes the VM (and its boot disk). Pass --bucket as well
# ONLY after pull-to-m1-mini.sh has printed @@VERIFIED@@.
set -euo pipefail
source "$(dirname "$0")/env.sh"
gcloud compute instances delete "$VM" --project "$PROJECT" --zone "$ZONE" --quiet
if [ "${1:-}" = "--bucket" ]; then
  gcloud storage rm -r "$BUCKET"
fi
