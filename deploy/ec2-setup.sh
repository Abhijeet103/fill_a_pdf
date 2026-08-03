#!/usr/bin/env bash
set -Eeuo pipefail

echo "This file is only a compatibility wrapper."
echo "The server must already have Git, Node.js, Nginx, TLS, and the localpdf user configured."
echo "Running the application deployment now..."
exec "$(dirname "$0")/ec2-deploy.sh"
