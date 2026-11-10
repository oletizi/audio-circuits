"""Download the base model and the adapter at pinned revisions and record them.

Usage: python download.py MODELS_DIR SOURCES_JSON

Resolves each repository's current commit, downloads exactly that commit, and
writes the commit hashes to SOURCES_JSON so the merge is reproducible. Skips a
repository whose recorded commit is already fully downloaded.
"""
import json
import os
import sys

from huggingface_hub import HfApi, snapshot_download

REPOS = {
    "base": ("openai/gpt-oss-20b", ["original/*", "metal/*"]),
    "adapter": ("microsoft/SchGen", []),
}


def main():
    models_dir, sources_path = sys.argv[1:3]
    sources = json.load(open(sources_path)) if os.path.exists(sources_path) else {}
    api = HfApi()
    for key, (repo, exclude) in REPOS.items():
        rev = sources.get(key, {}).get("revision") or api.model_info(repo).sha
        local = os.path.join(models_dir, key)
        snapshot_download(repo, revision=rev, local_dir=local,
                          ignore_patterns=exclude or None)
        sources[key] = {"repo": repo, "revision": rev, "local_dir": local,
                        "excluded": exclude}
        with open(sources_path, "w") as f:
            json.dump(sources, f, indent=2)
        print(f"{key}: {repo} @ {rev}", flush=True)


if __name__ == "__main__":
    main()
