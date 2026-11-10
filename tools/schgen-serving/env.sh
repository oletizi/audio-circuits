# Shared settings for serving the merged SchGen model behind Kinference. Sourced.
PROJECT=oletizi-docs-cli-20261028
ZONE=us-central1-a
CLUSTER=schgen-kinf
GPU_POOL=l4x4-spot
GPU_MACHINE=g2-standard-48
# Zones of the region offering GPU_MACHINE (gcloud compute machine-types list, 2026-11-09).
GPU_ZONES=us-central1-a,us-central1-b,us-central1-c
BUCKET=gs://oletizi-docs-cli-20261028-schgen-merge
NS=default
# gcloud from Homebrew installs gke-gcloud-auth-plugin here, off PATH.
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
KUBECTX="gke_${PROJECT}_${ZONE}_${CLUSTER}"
k() { kubectl --context "$KUBECTX" "$@"; }
