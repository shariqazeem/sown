#!/usr/bin/env bash
# The stellar CLI with this project's own identities (.keys/stellar, never in git).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec stellar --config-dir "$ROOT/.keys/stellar" "$@"
