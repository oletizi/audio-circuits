#!/usr/bin/env bash
# Laptop. gpu-scale.sh 0 between sessions (GPU nodes bill while they exist);
# gpu-scale.sh 1 to resume. The model re-copies from the bucket on resume.
set -euo pipefail
source "$(dirname "$0")/env.sh"
N="${1:?usage: gpu-scale.sh 0|1}"
gcloud container clusters resize "$CLUSTER" --node-pool "$GPU_POOL" --num-nodes "$N" \
  --project "$PROJECT" --zone "$ZONE" --quiet
