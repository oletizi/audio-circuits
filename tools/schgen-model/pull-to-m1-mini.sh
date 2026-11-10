#!/usr/bin/env bash
# Runs ON m1-mini.local. Pulls the merged model and the run record from the
# bucket to Big Disk and verifies every file against MANIFEST.sha256.
# gcloud storage cp skips files already present with matching size, so a
# relaunch resumes.
#
# Measured 2026-11-09 on m1-mini: macOS Gatekeeper blocked the SDK's
# gcloud-crc32c helper (Homebrew cask left it quarantined), so every chunk
# checksum came back empty - "destination hash AAAAAA==" - a download failed,
# and the rest slowed to pure-Python hashing. Fix on the machine, once:
#   xattr -d com.apple.quarantine <sdk>/bin/gcloud-crc32c
# A non-interactive ssh shell does not have Homebrew on PATH, hence the export.
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
BUCKET="${1:?usage: pull-to-m1-mini.sh gs://bucket}"
DEST="/Volumes/Big Disk/models"
mkdir -p "$DEST/schgen-merged-record"
gcloud storage cp -r -n "$BUCKET/schgen-merged" "$DEST/"
gcloud storage cp -n "$BUCKET/record/*" "$DEST/schgen-merged-record/"
cd "$DEST/schgen-merged"
shasum -a 256 -c MANIFEST.sha256
echo "@@VERIFIED@@"
