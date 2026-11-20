#!/usr/bin/env bash
# Cron invokes the installed receiver; production never installs or builds.
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export GIT_TERMINAL_PROMPT=0
SCRIPT_DIR="$(cd -- "$(dirname -- "$(readlink -f -- "$0")")" && pwd)"
exec python3 -B "$SCRIPT_DIR/tangsong-glory-artifact-deploy.py" deploy "$@"
