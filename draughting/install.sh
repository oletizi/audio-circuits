#!/usr/bin/env bash
#
# draughting/install.sh - installs the pinned schematic-drawing toolchain
# (copperhead and akcli) into the two locations
# tools/draught/copperhead-install.ts's defaultCopperheadDir() and
# tools/draught/akcli-install.ts's defaultAkcli() resolve:
# draughting/copperhead and draughting/venv-akcli, siblings of this script
# and of draughting/tools.lock.json.
#
# THOSE TWO LOCATIONS ARE FIXED, NOT CHOSEN HERE. Controller ruling R1
# (.superpowers/sdd/2026-10-30-institutionalise-draughting/rulings.md) - a
# second way to say where a tool lives is two places for one fact to be
# wrong (docs/known-gaps.md G308). This script takes no environment
# override for either path; if the install location ever needs to change,
# it changes in defaultCopperheadDir()/defaultAkcli() and here, together.
#
# THE PINNED VALUES BELOW ARE A DELIBERATE COPY of
# draughting/tools.lock.json's copperhead.commit and of EVERY pypi field in
# it, not a re-read of that file at install time:
# tests/draught/install-script.test.ts asserts this script's own TEXT
# contains each of those literal strings, so an edit to the lock that is not
# carried here fails that test loudly instead of the two drifting apart
# silently - which is the whole reason a lockfile is worth having.
#
# "EVERY pypi field" RATHER THAN "akcli.pypi": that test iterated two
# hardcoded lock keys until the final review's I-3 added numpy and pillow,
# and a drift guard that names its subjects one by one is a guard that stops
# covering the next one.
#
# REFUSES BY NAME ON ANY INSTALL FAILURE, WITH NO FALLBACK TO A DIFFERENT
# VERSION. If the pinned commit cannot be checked out, or the pinned pypi
# package cannot be installed, this script stops there rather than silently
# accepting whatever happened to be available.
#
# SAFE TO RE-RUN, with each half deciding explicitly what an existing
# install means instead of leaving it to whatever the underlying tool does
# by default:
#   - copperhead: `git clone` refuses outright onto an existing directory,
#     so an existing checkout already AT the pinned commit is left alone
#     (this script re-runs `npm ci` either way - see below for why `ci` and
#     not `install`); one that exists but is NOT at the pinned commit is
#     refused by name rather than silently reset, moved or deleted.
#   - akcli: `python3 -m venv` run against an existing venv directory
#     repairs it in place rather than wiping it, and `pip install` of an
#     exact version is a no-op when that version is already satisfied -
#     both already idempotent on their own, so the venv half of this script
#     has no existence check of its own.
#
# TASK 3 FIX ROUND 2, I-2: `npm ci`, NOT `npm install`, FOR COPPERHEAD'S OWN
# DEPENDENCIES. Pinning the commit exactly and then letting copperhead's
# transitive dependency tree float on whatever `npm install` happens to
# resolve pins the half of this toolchain that is easy to see and leaves
# the other half - the ~22-vulnerability-deep tree underneath it - adrift
# from what the checkout's own `package-lock.json` names. `npm ci` installs
# exactly what that lock file names and refuses outright if the lock and
# `package.json` disagree, which is the same "refuse by name, no fallback
# to a different version" this script already holds `git` and `pip` to.
# `npm ci` also deletes `node_modules` first, which strengthens the
# re-run safety above rather than weakening it: a re-run cannot leave stray
# packages behind from a version this script no longer asks for.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

COPPERHEAD_DIR="${REPO_ROOT}/draughting/copperhead"
COPPERHEAD_UPSTREAM="https://github.com/copperheadhq/copperhead"
COPPERHEAD_COMMIT="476cc15965f0d1eeda70afb9e806936f6bb15c5c"

VENV_DIR="${REPO_ROOT}/draughting/venv-akcli"
AKCLI_PYPI="akcli-kicad==0.22.0"
NUMPY_PYPI="numpy==2.5.4"
PILLOW_PYPI="pillow==13.0.0"

refuse() {
  echo "draughting/install.sh: refusing - $1" >&2
  exit 1
}

echo "draughting/install.sh: installing copperhead at ${COPPERHEAD_COMMIT} into ${COPPERHEAD_DIR}"

if [ -d "${COPPERHEAD_DIR}" ]; then
  if [ ! -d "${COPPERHEAD_DIR}/.git" ]; then
    refuse "${COPPERHEAD_DIR} already exists and is not a git checkout at all - remove it or move it aside before re-running; this script does not overwrite an unrecognised directory."
  fi
  EXISTING_COMMIT="$(git -C "${COPPERHEAD_DIR}" rev-parse HEAD 2>/dev/null || true)"
  if [ "${EXISTING_COMMIT}" != "${COPPERHEAD_COMMIT}" ]; then
    refuse "${COPPERHEAD_DIR} is checked out at ${EXISTING_COMMIT:-an unreadable commit}, not the pinned ${COPPERHEAD_COMMIT} - remove it or move it aside before re-running; this script does not reset an existing checkout for you."
  fi
  echo "draughting/install.sh: ${COPPERHEAD_DIR} is already at the pinned commit - skipping clone."
else
  git clone "${COPPERHEAD_UPSTREAM}" "${COPPERHEAD_DIR}" || refuse "git clone ${COPPERHEAD_UPSTREAM} into ${COPPERHEAD_DIR} failed."
  git -C "${COPPERHEAD_DIR}" checkout "${COPPERHEAD_COMMIT}" || refuse "git checkout ${COPPERHEAD_COMMIT} in ${COPPERHEAD_DIR} failed."
fi

( cd "${COPPERHEAD_DIR}" && npm ci ) || refuse "npm ci in ${COPPERHEAD_DIR} failed - its package-lock.json and package.json disagree, or the lock is missing, at commit ${COPPERHEAD_COMMIT}. This is a finding about the copperhead checkout upstream, not something to silently work around by falling back to 'npm install' - report it rather than patching around it here."

echo "draughting/install.sh: creating the akcli venv at ${VENV_DIR}"
python3 -m venv "${VENV_DIR}" || refuse "python3 -m venv ${VENV_DIR} failed."

"${VENV_DIR}/bin/pip" install "${AKCLI_PYPI}" || refuse "${VENV_DIR}/bin/pip install '${AKCLI_PYPI}' failed - no fallback to a different version is attempted."

# FINAL REVIEW I-3: numpy AND pillow GO INTO THIS SAME VENV, PINNED, AND THIS
# SCRIPT DID NOT INSTALL THEM. TOOLING.md's reproduction - which this script
# now claims to run for you - installs both here and says in bold why: every
# pixel measurement runs under this venv's python. Measured when the review was
# written: neither this venv nor the system python3 had numpy, so
# draughting/measure/framegeom.py raised ModuleNotFoundError on the machine
# that promoted it, and nothing checked. They are PINNED rather than floated
# for the same reason npm ci replaced npm install above, and they are separate
# pip invocations rather than one so that a refusal names which package failed.
# draughting/tools.lock.json carries both as entries with their own probes,
# so make draught-doctor now reports a disagreement about either.
"${VENV_DIR}/bin/pip" install "${NUMPY_PYPI}" || refuse "${VENV_DIR}/bin/pip install '${NUMPY_PYPI}' failed - no fallback to a different version is attempted. draughting/measure/framegeom.py cannot run without it."
"${VENV_DIR}/bin/pip" install "${PILLOW_PYPI}" || refuse "${VENV_DIR}/bin/pip install '${PILLOW_PYPI}' failed - no fallback to a different version is attempted. draughting/measure/framegeom.py cannot run without it."

echo "draughting/install.sh: install complete."
echo "draughting/install.sh: running akcli doctor as a sanity check. This is ADVISORY, the same way tools/cli/draught.ts treats it: akcli doctor additionally checks python, kicad-cli, ngspice, symbols, config and network, and a machine being offline or missing one of those must not read as this install script having failed when the two pinned versions above installed correctly."
"${VENV_DIR}/bin/akcli" doctor || echo "draughting/install.sh: akcli doctor reported a problem above (advisory) - the pinned install itself still succeeded."

echo "draughting/install.sh: done."
