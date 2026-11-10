# syntax=docker/dockerfile:1.7
#
# schgen-runtime: Microsoft SchGen at a pinned commit, its emitter's Python
# dependencies installed from a hash-locked set, and the trial's four emitter
# fixes. Build it with build.sh, never directly: build.sh supplies the
# `kicad_symbols` build context (the host's KiCad 10.0.5 symbol libraries)
# that the component-repository step reads, and records the image digest.
#
# Model-written programs run in this image only through emit.sh, which adds
# the limits (--network none, --read-only, cpu, memory, pids, tmpfs sizes).

ARG PYTHON_IMAGE=python:3.12-slim-bookworm@sha256:935c3c5b12357a7e10caa9c1e6ca5692344d97cf229832ef584be2cec9fc03df

FROM ${PYTHON_IMAGE} AS fetch
ARG SCHGEN_COMMIT=0707520c587984651cd32908acfd9b117876e93b
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN git init -q /schgen \
 && git -C /schgen remote add origin https://github.com/microsoft/SchGen.git \
 && git -C /schgen fetch -q --depth 1 origin "${SCHGEN_COMMIT}" \
 && git -C /schgen checkout -q FETCH_HEAD \
 && test "$(git -C /schgen rev-parse HEAD)" = "${SCHGEN_COMMIT}" \
 && rm -rf /schgen/.git

FROM ${PYTHON_IMAGE}
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PROJECT_PATH=/schgen
COPY requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir --retries 10 --timeout 120 \
      --require-hashes --no-deps -r /tmp/requirements.lock \
 && rm /tmp/requirements.lock
COPY --from=fetch /schgen /schgen
COPY fixes /trial/fixes
COPY trial /trial/trial
COPY tests /trial/tests
# component_repository fix: SchGen neither ships nor generates this file.
RUN --mount=type=bind,from=kicad_symbols,target=/kicad-symbols \
    python /trial/fixes/build_repo.py /kicad-symbols /schgen/modules/component_repository.json
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin schgen
USER schgen
WORKDIR /schgen
