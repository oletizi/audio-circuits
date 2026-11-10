#!/usr/bin/env bash
# Laptop. The GPU pool autoscales 0..1 on demand, so the GPU node exists only
# while a pod asks for GPUs. gpu-scale.sh 0 scales the vLLM Deployment to zero
# between sessions, and the autoscaler then removes the idle node (GPU nodes
# bill while they exist); gpu-scale.sh 1 resumes. The model re-copies from the
# bucket on resume.
set -euo pipefail
source "$(dirname "$0")/env.sh"
N="${1:?usage: gpu-scale.sh 0|1}"
k scale -n "$NS" deploy/schgen-merged --replicas "$N"
