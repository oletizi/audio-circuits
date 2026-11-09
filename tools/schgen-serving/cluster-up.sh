#!/usr/bin/env bash
# Laptop. Creates the cluster and the GPU pool, each only if absent, and fetches
# credentials. The GPU pool create is where a zero project-wide GPU quota
# (GPUS_ALL_REGIONS) would surface; it fails loudly with GCP's own message.
set -euo pipefail
source "$(dirname "$0")/env.sh"

if ! gcloud container clusters describe "$CLUSTER" --project "$PROJECT" --zone "$ZONE" >/dev/null 2>&1; then
  gcloud container clusters create "$CLUSTER" --project "$PROJECT" --zone "$ZONE" \
    --release-channel regular \
    --machine-type e2-standard-4 --num-nodes 1
  # No --gateway-api: GKE would then manage the Gateway API CRDs, and
  # Kinference's install applies its own pinned v1.5.1 set.
fi

if ! gcloud container node-pools describe "$GPU_POOL" --cluster "$CLUSTER" --project "$PROJECT" --zone "$ZONE" >/dev/null 2>&1; then
  gcloud container node-pools create "$GPU_POOL" --cluster "$CLUSTER" --project "$PROJECT" --zone "$ZONE" \
    --machine-type "$GPU_MACHINE" \
    --accelerator type=nvidia-l4,count=4,gpu-driver-version=latest \
    --num-nodes 1 \
    --disk-type pd-balanced --disk-size 300 \
    --scopes cloud-platform
fi

gcloud container clusters get-credentials "$CLUSTER" --project "$PROJECT" --zone "$ZONE"
k get nodes -o wide
