#!/usr/bin/env bash
# Laptop. Applies the Kinference resources with a MEASURED KV block size.
set -euo pipefail
source "$(dirname "$0")/env.sh"
KV_BLOCK_SIZE="${1:?usage: apply-kinference.sh KV_BLOCK_SIZE  (measured from vLLM, never assumed)}"
[[ "$KV_BLOCK_SIZE" =~ ^[0-9]+$ ]] || { echo "KV_BLOCK_SIZE must be an integer" >&2; exit 1; }
export KV_BLOCK_SIZE
envsubst '${KV_BLOCK_SIZE}' < "$(dirname "$0")/manifests/kinference.yaml.tmpl" | k apply -f -
k get iws,infpool,gateway,httproute -n "$NS"
