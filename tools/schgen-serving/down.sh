#!/usr/bin/env bash
# Laptop. Deletes the cluster. Pass --bucket to delete the merged model's
# bucket too - only when m1-mini holds a verified copy and nothing else will
# serve from GCP.
set -euo pipefail
source "$(dirname "$0")/env.sh"
gcloud container clusters delete "$CLUSTER" --project "$PROJECT" --zone "$ZONE" --quiet
if [ "${1:-}" = "--bucket" ]; then
  gcloud storage rm -r "$BUCKET"
fi
