#!/usr/bin/env bash
# Runs ON the GCP VM. Launched detached by provision.sh:
#   nohup bash ~/schgen/vm-run.sh BUCKET > ~/schgen/run.log 2>&1 &
# Each stage writes a marker when it finishes, so a relaunch resumes rather
# than restarts. Every stage fails loudly (set -euo pipefail).
set -euo pipefail

BUCKET="${1:?usage: vm-run.sh gs://bucket}"
HERE="$HOME/schgen"
MODELS="$HOME/models"
OUT="$MODELS/schgen-merged"
REPORT="$HERE/merge-report.json"
SOURCES="$HERE/sources.json"
VENV="$HOME/venv"
mkdir -p "$HERE/done" "$MODELS"

stage() { [ -e "$HERE/done/$1" ]; }
mark() { touch "$HERE/done/$1"; echo "=== stage $1 done $(date -u +%FT%TZ)"; }

if ! stage setup; then
  sudo apt-get update -q
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q python3-venv python3-pip
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q --upgrade pip
  "$VENV/bin/pip" install -q torch --index-url https://download.pytorch.org/whl/cpu
  "$VENV/bin/pip" install -q transformers peft accelerate safetensors huggingface_hub
  "$VENV/bin/pip" freeze > "$HERE/pip-freeze.txt"
  mark setup
fi

if ! stage download; then
  "$VENV/bin/python" "$HERE/download.py" "$MODELS" "$SOURCES"
  mark download
fi

if ! stage merge; then
  /usr/bin/time -v "$VENV/bin/python" "$HERE/merge_check.py" \
    "$MODELS/base" "$MODELS/adapter" "$OUT" "$REPORT"
  mark merge
fi

if ! stage upload; then
  gcloud storage cp -r "$OUT" "$BUCKET/"
  gcloud storage cp "$REPORT" "$SOURCES" "$HERE/pip-freeze.txt" "$BUCKET/record/"
  mark upload
fi

echo "@@DONE@@"
