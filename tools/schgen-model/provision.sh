#!/usr/bin/env bash
# Runs on the laptop. Creates the bucket and the VM (each only if absent),
# copies the scripts up, and launches vm-run.sh detached on the VM.
set -euo pipefail

source "$(dirname "$0")/env.sh"
DIR="$(cd "$(dirname "$0")" && pwd)"

if ! gcloud storage buckets describe "$BUCKET" --project "$PROJECT" >/dev/null 2>&1; then
  gcloud storage buckets create "$BUCKET" --project "$PROJECT" \
    --location "$REGION" --uniform-bucket-level-access
fi

if ! gcloud compute instances describe "$VM" --project "$PROJECT" --zone "$ZONE" >/dev/null 2>&1; then
  gcloud compute instances create "$VM" --project "$PROJECT" --zone "$ZONE" \
    --machine-type "$MACHINE" \
    --image-family debian-12 --image-project debian-cloud \
    --boot-disk-size 300GB --boot-disk-type pd-balanced \
    --scopes storage-rw
fi

for i in $(seq 1 30); do
  if gcloud compute ssh "$VM" --project "$PROJECT" --zone "$ZONE" --command true >/dev/null 2>&1; then
    break
  fi
  [ "$i" = 30 ] && { echo "VM never accepted ssh" >&2; exit 1; }
  sleep 10
done

gcloud compute ssh "$VM" --project "$PROJECT" --zone "$ZONE" --command "mkdir -p ~/schgen"
gcloud compute scp --project "$PROJECT" --zone "$ZONE" \
  "$DIR/vm-run.sh" "$DIR/download.py" "$DIR/merge_check.py" "$VM:~/schgen/"
gcloud compute ssh "$VM" --project "$PROJECT" --zone "$ZONE" --command \
  "nohup bash ~/schgen/vm-run.sh $BUCKET >> ~/schgen/run.log 2>&1 < /dev/null & echo launched pid \$!"
