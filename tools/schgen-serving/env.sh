# Shared settings for serving the merged SchGen model behind Kinference. Sourced.
PROJECT=oletizi-docs-cli-20261028
ZONE=us-central1-a
CLUSTER=schgen-kinf
GPU_POOL=l4x4
GPU_MACHINE=g2-standard-48
BUCKET=gs://oletizi-docs-cli-20261028-schgen-merge
NS=default
# gcloud from Homebrew installs gke-gcloud-auth-plugin here, off PATH.
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
KUBECTX="gke_${PROJECT}_${ZONE}_${CLUSTER}"
k() { kubectl --context "$KUBECTX" "$@"; }
