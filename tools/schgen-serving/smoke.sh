#!/usr/bin/env bash
# Laptop. The two pass layers of the serving spec.
#   smoke.sh direct   - vLLM alone, through its own Service
#   smoke.sh gateway  - through the Kinference gateway, and the request found
#                       in the vLLM log by a marker unique to this run
set -euo pipefail
source "$(dirname "$0")/env.sh"
MODE="${1:?usage: smoke.sh direct|gateway}"

case "$MODE" in
  direct)  SVC=svc/schgen-merged;         PORT=8000 ;;
  gateway) SVC=svc/kinference-gw-gatewayd; PORT=8080 ;;
  *) echo "unknown mode $MODE" >&2; exit 1 ;;
esac

LOCAL=18000
k port-forward -n "$NS" "$SVC" "$LOCAL:$PORT" >/dev/null 2>&1 &
PF=$!
trap 'kill $PF 2>/dev/null' EXIT
for _ in $(seq 1 20); do nc -z localhost "$LOCAL" 2>/dev/null && break; sleep 0.5; done

if [ "$MODE" = direct ]; then
  echo "--- /v1/models"
  curl -sS --fail "http://localhost:$LOCAL/v1/models"; echo
fi

MARKER="smoke-$(date +%s)-$RANDOM"
echo "--- chat completion via $SVC, marker $MARKER"
curl -sS --fail "http://localhost:$LOCAL/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -H "X-Request-Id: $MARKER" \
  -d "{\"model\":\"schgen-merged\",\"max_tokens\":200,\"user\":\"$MARKER\",
       \"messages\":[{\"role\":\"user\",\"content\":\"In one sentence: what does a 100nF capacitor next to an IC power pin do?\"}]}"
echo

echo "--- vLLM log lines naming the marker or a completion request"
sleep 2
k logs -n "$NS" deploy/schgen-merged -c vllm --since=2m | grep -E "$MARKER|chat/completions" | tail -5
