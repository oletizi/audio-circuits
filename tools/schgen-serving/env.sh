# Shared settings for serving the merged SchGen model behind Kinference. Sourced.
PROJECT=oletizi-docs-cli-20261028
# europe-west1-b: the first zone where probe-capacity.sh got a Spot
# g2-standard-48, 2026-11-09, after every us-central1 zone (on-demand and Spot)
# and every other US and Canadian zone offering it, plus europe-west4, stocked
# out. Owner decision in the serving spec's Decisions table.
ZONE=europe-west1-b
CLUSTER=schgen-kinf
GPU_POOL=l4x4-spot
GPU_MACHINE=g2-standard-48
# Zones of the region offering GPU_MACHINE (gcloud compute machine-types list, 2026-11-09).
GPU_ZONES=europe-west1-b,europe-west1-c
# The bucket stays in US-CENTRAL1; the vLLM pod copies the model across regions.
BUCKET=gs://oletizi-docs-cli-20261028-schgen-merge
NS=default
# gcloud from Homebrew installs gke-gcloud-auth-plugin here, off PATH.
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
KUBECTX="gke_${PROJECT}_${ZONE}_${CLUSTER}"
k() { kubectl --context "$KUBECTX" "$@"; }
