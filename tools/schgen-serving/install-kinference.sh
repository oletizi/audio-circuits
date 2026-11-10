#!/usr/bin/env bash
# Laptop. Installs Kinference exactly as kinference.ai/docs/getting-started/
# does (read 2026-11-09), then records what was installed.
set -euo pipefail
source "$(dirname "$0")/env.sh"
OUT="${1:?usage: install-kinference.sh RECORD_DIR}"
mkdir -p "$OUT"

# Helm runs with docker-credential-osxkeychain OFF its PATH and an empty
# DOCKER_CONFIG. Measured 2026-11-09 with helm 4.3.1: pulling a public chart
# from ghcr.io hung indefinitely right after the registry's 401, before any
# token request - the registry library consults the macOS keychain helper
# (it finds it on PATH even when the docker config names no credsStore), and
# that call never returned. With the helper off PATH the same pull completes
# at once. Every chart here is public, so no credentials are needed.
HELM_BIN="$(command -v helm)"
HELM_ENV="$(mktemp -d)"
trap 'rm -rf "$HELM_ENV"' EXIT
echo '{}' > "$HELM_ENV/config.json"
HELM_PATH="/opt/homebrew/share/google-cloud-sdk/bin:/usr/bin:/bin"
H() { env PATH="$HELM_PATH" DOCKER_CONFIG="$HELM_ENV" "$HELM_BIN" --kube-context "$KUBECTX" "$@"; }

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
