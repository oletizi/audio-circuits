#!/usr/bin/env bash
# Laptop. Finds a zone that will actually hand out a Spot g2-standard-48
# (4 x L4) right now, by creating one bare VM and deleting it at once.
# Stops at the first success and prints "@@CAPACITY <zone>@@".
#
# Why: measured 2026-11-09, both on-demand and Spot 4 x L4 failed scale-up in
# every us-central1 zone for over an hour ("GCE out of resources"). Neither
# GKE nor gcloud reports capacity in advance; creating a VM is the only check.
# A failed create bills nothing; a successful one bills seconds.
#
# Usage: probe-capacity.sh zone [zone ...]
set -uo pipefail
source "$(dirname "$0")/env.sh"
[ $# -gt 0 ] || { echo "usage: probe-capacity.sh zone [zone ...]" >&2; exit 2; }

for z in "$@"; do
  name="schgen-probe-$z"
  echo "=== $z $(date +%H:%M:%S)"
  if out=$(gcloud compute instances create "$name" --project "$PROJECT" --zone "$z" \
      --machine-type "$GPU_MACHINE" --provisioning-model SPOT \
      --instance-termination-action DELETE --maintenance-policy TERMINATE \
      --image-family debian-12 --image-project debian-cloud \
      --boot-disk-size 20GB --no-address --quiet 2>&1); then
    echo "created in $z; deleting"
    gcloud compute instances delete "$name" --project "$PROJECT" --zone "$z" --quiet
    echo "@@CAPACITY $z@@"
    exit 0
  fi
  echo "$out" | grep -E "ERROR|code|message" | head -3
  gcloud compute instances delete "$name" --project "$PROJECT" --zone "$z" --quiet >/dev/null 2>&1
done
echo "@@NO-CAPACITY@@"
exit 1
