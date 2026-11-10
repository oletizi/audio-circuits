#!/usr/bin/env bash
# Laptop. Captures the serving state that the spec's pass layers are judged
# on, into RECORD_DIR, so the record can be committed rather than only told.
set -euo pipefail
source "$(dirname "$0")/env.sh"
OUT="${1:?usage: capture-record.sh RECORD_DIR}"
mkdir -p "$OUT"
k get iws schgen-merged -o yaml > "$OUT/iws-schgen-merged.yaml"
k get inferencepool inference-pool -o yaml > "$OUT/inferencepool.yaml"
k get gateway kinference-gw -o yaml > "$OUT/gateway.yaml"
k get httproute kinference-route -o yaml > "$OUT/httproute.yaml"
k get nodes -o wide > "$OUT/nodes.txt"
k get pods -o wide > "$OUT/pods.txt"
k logs deploy/schgen-merged -c vllm > "$OUT/vllm.log"
k logs deploy/schgen-merged -c fetch-model > "$OUT/fetch-model.log"
k logs deploy/kinference > "$OUT/kinference.log"
k logs deploy/kinference-gw-gatewayd > "$OUT/gatewayd.log"
ls -la "$OUT"
