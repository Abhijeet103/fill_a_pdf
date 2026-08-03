#!/usr/bin/env bash
set -Eeuo pipefail

echo "ec2-update.sh now uses the same simple deployment process as ec2-deploy.sh."
exec "$(dirname "$0")/ec2-deploy.sh"
