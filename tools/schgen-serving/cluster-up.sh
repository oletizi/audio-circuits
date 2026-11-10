#!/usr/bin/env bash
# Laptop. Creates the cluster and the GPU pool, each only if absent, and fetches
# credentials. The GPU pool create is where a zero project-wide GPU quota
# (GPUS_ALL_REGIONS) would surface; it fails loudly with GCP's own message.
#
# The GPU pool is NOT pinned to one zone. Measured 2026-11-09: a fixed
# 1-node pool in us-central1-a sat in PROVISIONING for 20+ minutes while its
# instance group logged ZONE_RESOURCE_POOL_EXHAUSTED (STOCKOUT) every few
# minutes - and gcloud reports that only as "still running". So the pool spans
# every zone offering the machine, starts at 0 nodes, and the autoscaler
# (location policy ANY, total max 1) places the node wherever capacity exists
# when the vLLM pod asks for GPUs. A stockout then shows as the pod Pending
# with a FailedScaleUp event, not as a hung create.
#
# The pool is SPOT. Measured 2026-11-09: the on-demand pool above then failed
# scale-up in all three zones for an hour, every attempt "GCE out of
# resources". Spot draws on separate capacity; Google may reclaim the node at
# any time, which a routing smoke test tolerates. Owner decision, recorded in
# the serving spec's Decisions table.
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
    --machine-type "$GPU_MACHINE" --spot \
    --accelerator type=nvidia-l4,count=4,gpu-driver-version=latest \
    --node-locations "$GPU_ZONES" \
    --num-nodes 0 \
    --enable-autoscaling --total-min-nodes 0 --total-max-nodes 1 --location-policy ANY \
    --disk-type pd-balanced --disk-size 300 \
    --scopes cloud-platform
fi

gcloud container clusters get-credentials "$CLUSTER" --project "$PROJECT" --zone "$ZONE"
k get nodes -o wide
