#!/usr/bin/env bash
# Runs ON m1-mini.local. Pulls the merged model and the run record from the
# bucket to Big Disk and verifies every file against MANIFEST.sha256.
# gcloud storage cp skips files already present with matching size, so a
# relaunch resumes.
set -euo pipefail
BUCKET="${1:?usage: pull-to-m1-mini.sh gs://bucket}"
DEST="/Volumes/Big Disk/models"
mkdir -p "$DEST/schgen-merged-record"
gcloud storage cp -r -n "$BUCKET/schgen-merged" "$DEST/"
gcloud storage cp -n "$BUCKET/record/*" "$DEST/schgen-merged-record/"
cd "$DEST/schgen-merged"
shasum -a 256 -c MANIFEST.sha256
echo "@@VERIFIED@@"
