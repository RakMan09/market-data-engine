#!/usr/bin/env bash
set -euo pipefail

PERF_DATA="${1:-artifacts/perf.data}"
OUT="${2:-artifacts/flamegraph.svg}"

if [[ ! -f "${PERF_DATA}" ]]; then
  echo "missing ${PERF_DATA}" >&2
  exit 2
fi
if ! command -v flamegraph.pl >/dev/null 2>&1; then
  echo "flamegraph.pl not found in PATH" >&2
  exit 3
fi

perf script -i "${PERF_DATA}" | flamegraph.pl > "${OUT}"
echo "wrote ${OUT}"
