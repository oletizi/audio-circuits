#!/usr/bin/env bash
# Laptop. Keeps a port-forward to the Kinference gateway open for the length of
# the trial run, restarting it when kubectl drops it (a long-lived
# port-forward is closed by the API server on idle or on node changes).
# A dropped forward during a request shows up in the runner as a lost
# generation, which run_attempt.py records and bounds; this loop only shortens
# the gap before the next launch can connect.
#
#   nohup bash tools/schgen-drawing-trial/forward-gateway.sh LOCAL_PORT > forward.log 2>&1 &
#
# Stop it with kill on its pid when the run is done.
set -uo pipefail
source "$(dirname "$0")/../schgen-serving/env.sh"
LOCAL="${1:?usage: forward-gateway.sh LOCAL_PORT}"

while true; do
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) port-forward svc/kinference-gw-gatewayd $LOCAL:8080"
  k port-forward -n "$NS" svc/kinference-gw-gatewayd "$LOCAL:8080"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) port-forward exited with $?; restarting in 2 s"
  sleep 2
done
