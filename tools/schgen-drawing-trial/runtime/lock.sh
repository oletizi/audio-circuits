#!/usr/bin/env bash
# Regenerate requirements.lock from requirements.in with pip-compile
# --generate-hashes, inside a throwaway container of the image's own base, so
# the lock resolves for the platform the image runs on (linux/arm64 here).
# Run it only when requirements.in changes; commit the lock it writes.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
BASE="$(grep -E '^ARG PYTHON_IMAGE=' "$HERE/Dockerfile" | cut -d= -f2-)"
if [ -z "$BASE" ]; then
  echo "lock.sh: no 'ARG PYTHON_IMAGE=' line in $HERE/Dockerfile; the lock must resolve against the image's own base" >&2
  exit 2
fi

docker run --rm \
  --mount "type=bind,source=$HERE,target=/w" \
  "$BASE" \
  sh -c 'pip install --quiet --root-user-action=ignore pip-tools==7.5.3 \
    && cd /w \
    && pip-compile --quiet --generate-hashes --allow-unsafe --strip-extras \
         --output-file requirements.lock requirements.in'
echo "wrote $HERE/requirements.lock"
