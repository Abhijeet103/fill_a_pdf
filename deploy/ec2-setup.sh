#!/usr/bin/env bash
set -Eeuo pipefail

echo "ec2-setup.sh has been replaced by the complete HTTPS deployment script."
echo "Use: sudo bash deploy/ec2-deploy.sh YOUR_EMAIL_ADDRESS"
exec "$(dirname "$0")/ec2-deploy.sh" "$@"
