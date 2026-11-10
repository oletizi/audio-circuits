#!/usr/bin/env bash
# Laptop. The two pass layers of the serving spec.
#   smoke.sh direct   - vLLM alone, through its own Service
#   smoke.sh gateway  - through the Kinference gateway, and the request found
#                       in the vLLM log by a marker unique to this run
#   smoke.sh completions - /v1/completions through the gateway with a token-ID
#                       prompt (smoke-prompt-ids.json): the returned prompt IDs
#                       must equal those sent, and a harmony marker must be
#                       literally in text. Exit 2, "return_token_ids
#                       unsupported", when the ID fields are absent.
set -euo pipefail
source "$(dirname "$0")/env.sh"
MODE="${1:?usage: smoke.sh direct|gateway|completions}"

case "$MODE" in
  direct)  SVC=svc/schgen-merged;         PORT=8000 ;;
  gateway|completions) SVC=svc/kinference-gw-gatewayd; PORT=8080 ;;
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

HERE="$(cd "$(dirname "$0")" && pwd)"
MARKER="smoke-$(date +%s)-$RANDOM"
if [ "$MODE" = completions ]; then
  # The generation body of tools/schgen-drawing-trial/generation.py, with a
  # small max_tokens: same three fields, same prompt-as-IDs.
  PY="$HERE/../schgen-drawing-trial/.venv/bin/python"
  [ -x "$PY" ] || { echo "host venv $PY missing; create it from tools/schgen-drawing-trial/host-requirements.txt" >&2; exit 1; }
  RESP="$(mktemp)"
  echo "--- /v1/completions via $SVC, marker $MARKER"
  jq -c --arg user "$MARKER" '{model:"schgen-merged", prompt:.prompt_token_ids, max_tokens:32,
      temperature:1.0, top_k:50, top_p:1.0, seed:42, skip_special_tokens:false,
      spaces_between_special_tokens:false, return_token_ids:true, user:$user}' \
      "$HERE/smoke-prompt-ids.json" |
  curl -sS --fail "http://localhost:$LOCAL/v1/completions" \
    -H 'Content-Type: application/json' -H "X-Request-Id: $MARKER" -d @- -o "$RESP"
  jq -c '{id, finish_reason: .choices[0].finish_reason, text: .choices[0].text, usage}' "$RESP"
  rc=0
  "$PY" -I "$HERE/check_completions.py" "$RESP" "$HERE/smoke-prompt-ids.json" || rc=$?
  echo "--- vLLM log lines naming the marker or a completion request"
  sleep 2
  k logs -n "$NS" deploy/schgen-merged -c vllm --since=2m | grep -E "$MARKER|v1/completions" | tail -5 || true
  exit "$rc"
fi

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
