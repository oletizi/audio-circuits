# Shared settings for serving the merged SchGen model behind Kinference. Sourced.
PROJECT=oletizi-docs-cli-20261028
# asia-east1-b: the first zone where probe-capacity.sh got a Spot
# g2-standard-48 on 2026-11-10 (drawing trial, Task 7). Every US, Canadian and
# European zone offering it, including europe-west1-b used on 2026-11-09, and
# asia-east1-a, returned ZONE_RESOURCE_POOL_EXHAUSTED first. Controller ruling
# under the approved trial plan ("set env.sh to the zone found"); the
# 2026-11-09 europe-west1 choice was an owner decision in the serving spec.
ZONE=asia-east1-b
CLUSTER=schgen-kinf
GPU_POOL=l4x4-spot
GPU_MACHINE=g2-standard-48
# Zones of the region offering GPU_MACHINE (gcloud compute machine-types list, 2026-11-10).
GPU_ZONES=asia-east1-a,asia-east1-b,asia-east1-c
# The bucket stays in US-CENTRAL1; the vLLM pod copies the model across regions.
BUCKET=gs://oletizi-docs-cli-20261028-schgen-merge
NS=default
# gcloud from Homebrew installs gke-gcloud-auth-plugin here, off PATH.
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
KUBECTX="gke_${PROJECT}_${ZONE}_${CLUSTER}"
k() { kubectl --context "$KUBECTX" "$@"; }
