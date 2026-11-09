#!/usr/bin/env bash
# Laptop. Installs Kinference exactly as kinference.ai/docs/getting-started/
# does (read 2026-11-09), then records what was installed.
set -euo pipefail
source "$(dirname "$0")/env.sh"
OUT="${1:?usage: install-kinference.sh RECORD_DIR}"
mkdir -p "$OUT"
H() { helm --kube-context "$KUBECTX" "$@"; }

GWAPI_VERSION=1.5.1
k apply --server-side --force-conflicts -f \
  "https://github.com/kubernetes-sigs/gateway-api/releases/download/v$GWAPI_VERSION/standard-install.yaml"

H upgrade -i gateway-crds oci://ghcr.io/buoyantio/charts/gateway-crds --devel
H upgrade -i gateway oci://ghcr.io/buoyantio/charts/gateway --devel --wait

H upgrade -i kinference-crds oci://cr.kinference.ai/kinference-ai/charts/kinference-crds --devel
H upgrade -i kinference oci://cr.kinference.ai/kinference-ai/charts/kinference \
  --set extension.enabled=true --devel --wait

H list -o json > "$OUT/helm-releases.json"
k get pods -n "$NS" -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.image}{" "}{end}{"\n"}{end}' \
  > "$OUT/kinference-images.txt"
cat "$OUT/helm-releases.json"; echo; cat "$OUT/kinference-images.txt"
k get pods -n "$NS"
