#!/usr/bin/env bash
# Build the Sown contract and copy the wasm and its sha256 to artifacts/, which is what every
# deploy uploads and what /proof compares against the bytes dumped back from the chain.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p artifacts
stellar contract build --manifest-path Cargo.toml --package sown --out-dir artifacts 2>&1 | grep -vE "^\s*$" | tail -4
shasum -a 256 artifacts/sown.wasm | awk '{print $1}' > artifacts/sown.wasm.sha256
echo "artifacts/sown.wasm  $(wc -c < artifacts/sown.wasm | tr -d ' ') bytes  sha256 $(cat artifacts/sown.wasm.sha256)"
