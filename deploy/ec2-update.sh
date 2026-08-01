#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="localpdf-store"
APP_USER="localpdf"
APP_DIR="/opt/localpdf-store"
BRANCH="${BRANCH:-main}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this updater with sudo: sudo bash deploy/ec2-update.sh"
  exit 1
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "localpdf.store is not installed in ${APP_DIR}. Run deploy/ec2-setup.sh first."
  exit 1
fi

restart_existing_service() {
  if systemctl cat "${APP_NAME}" >/dev/null 2>&1; then
    systemctl start "${APP_NAME}" || true
  fi
}
trap restart_existing_service ERR

# Do not build into dist while vinext is serving it: hashed assets are replaced
# during a build and an old process can otherwise keep serving a stale manifest.
systemctl stop "${APP_NAME}"
runuser -u "${APP_USER}" -- git -C "${APP_DIR}" fetch origin "${BRANCH}"
runuser -u "${APP_USER}" -- git -C "${APP_DIR}" checkout "${BRANCH}"
runuser -u "${APP_USER}" -- git -C "${APP_DIR}" merge --ff-only "origin/${BRANCH}"
runuser -u "${APP_USER}" -- /usr/bin/npm --prefix "${APP_DIR}" ci
runuser -u "${APP_USER}" -- /usr/bin/npm --prefix "${APP_DIR}" run build
systemctl start "${APP_NAME}"

for attempt in {1..15}; do
  if curl --fail --silent --show-error http://127.0.0.1/ >/dev/null; then
    trap - ERR
    echo "localpdf.store was updated successfully."
    exit 0
  fi
  sleep 1
done

echo "The update finished, but the health check failed."
echo "Inspect logs with: sudo journalctl -u ${APP_NAME} -n 100 --no-pager"
exit 1
