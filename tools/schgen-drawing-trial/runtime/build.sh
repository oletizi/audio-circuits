#!/usr/bin/env bash
# Build schgen-runtime:0707520c and write its digest to IMAGE_DIGEST.
#
#   bash tools/schgen-drawing-trial/runtime/build.sh
#
# The KiCad symbol libraries are passed to the build as the named context
# `kicad_symbols`, so build_repo.py makes SchGen's component_repository.json
# from them at build time; emit.sh mounts the same directory read-only at run
# time. KICAD_SYMBOL_DIR overrides the host path; whatever it names must be
# KiCad 10.0.5's libraries, the version the trial renders with.
#
# IMAGE_DIGEST holds the built image's ID (sha256 of its config). The run
# records it, and Task 7 refuses to start when the image tagged
# schgen-runtime:0707520c no longer has this ID.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
IMAGE="schgen-runtime:0707520c"
KICAD_SYMBOL_DIR="${KICAD_SYMBOL_DIR:-/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols}"

if [ ! -d "$KICAD_SYMBOL_DIR" ]; then
  echo "build.sh: KiCad symbol directory $KICAD_SYMBOL_DIR does not exist; the image's" \
    "component repository is built from KiCad 10.0.5's *.kicad_sym libraries and has" \
    "no other source (set KICAD_SYMBOL_DIR)" >&2
  exit 2
fi
if [ ! -f "$HERE/requirements.lock" ]; then
  echo "build.sh: $HERE/requirements.lock is missing; the image installs only from the" \
    "hash-locked set - run lock.sh to make it" >&2
  exit 2
fi

docker buildx build \
  --load \
  --platform linux/arm64 \
  --build-context "kicad_symbols=$KICAD_SYMBOL_DIR" \
  --tag "$IMAGE" \
  "$HERE"

docker image inspect --format '{{.Id}}' "$IMAGE" > "$HERE/IMAGE_DIGEST"
echo "built $IMAGE $(cat "$HERE/IMAGE_DIGEST")"
