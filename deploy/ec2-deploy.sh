#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="localpdf-store"
APP_USER="localpdf"
APP_DIR="/opt/localpdf-store"
PREVIOUS_ASSETS_DIR="/opt/localpdf-store-previous-assets"
BRANCH="main"
NODE_BIN="/usr/bin/node"
NPM_BIN="/usr/bin/npm"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo: sudo bash deploy/ec2-deploy.sh"
  exit 1
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "Git repository not found at ${APP_DIR}. Complete the one-time EC2 setup first."
  exit 1
fi

if [[ ! -x "${NODE_BIN}" || ! -x "${NPM_BIN}" ]]; then
  echo "Node.js and npm must be installed before deployment."
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  echo "Linux user '${APP_USER}' does not exist. Complete the one-time EC2 setup first."
  exit 1
fi

restart_after_error() {
  local exit_code=$?
  echo
  echo "Deployment failed. Attempting to start the existing service again."
  systemctl start "${APP_NAME}" 2>/dev/null || true
  echo "View logs with: sudo journalctl -u ${APP_NAME} -n 100 --no-pager"
  exit "${exit_code}"
}

trap restart_after_error ERR

echo "Stopping ${APP_NAME}..."
systemctl stop "${APP_NAME}" 2>/dev/null || true

echo "Updating ${APP_DIR} to origin/${BRANCH}..."
runuser -u "${APP_USER}" -- git -C "${APP_DIR}" fetch origin "${BRANCH}"
runuser -u "${APP_USER}" -- git -C "${APP_DIR}" checkout -f "${BRANCH}"
runuser -u "${APP_USER}" -- git -C "${APP_DIR}" reset --hard "origin/${BRANCH}"

echo "Installing dependencies..."
runuser -u "${APP_USER}" -- env \
  NPM_CONFIG_AUDIT=false \
  NPM_CONFIG_FUND=false \
  NPM_CONFIG_PROGRESS=false \
  "${NPM_BIN}" --prefix "${APP_DIR}" ci

echo "Saving the current browser assets for open tabs..."
install -d -o "${APP_USER}" -g "${APP_USER}" "${PREVIOUS_ASSETS_DIR}"
find "${PREVIOUS_ASSETS_DIR}" -mindepth 1 -maxdepth 1 -type f -delete
if [[ -d "${APP_DIR}/dist/client/assets" ]]; then
  runuser -u "${APP_USER}" -- cp -a \
    "${APP_DIR}/dist/client/assets/." \
    "${PREVIOUS_ASSETS_DIR}/"
fi

echo "Building the application..."
runuser -u "${APP_USER}" -- "${NPM_BIN}" --prefix "${APP_DIR}" run build

# A tab opened before this deployment may still request its older hashed
# PDF engine and worker files. Keep one previous generation available so those
# private, in-browser operations continue instead of reporting a false PDF error.
if [[ -d "${PREVIOUS_ASSETS_DIR}" ]]; then
  runuser -u "${APP_USER}" -- cp -an \
    "${PREVIOUS_ASSETS_DIR}/." \
    "${APP_DIR}/dist/client/assets/"
fi

echo "Configuring the Linux service..."
cat > "/etc/systemd/system/${APP_NAME}.service" <<EOF
[Unit]
Description=localpdf.store web application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=VINEXT_TRUST_PROXY=1
ExecStart=${NPM_BIN} start
Restart=always
RestartSec=5
TimeoutStopSec=20
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${APP_NAME}" >/dev/null
systemctl restart "${APP_NAME}"

echo "Waiting for the application on port 3000..."
for attempt in {1..30}; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null; then
    trap - ERR
    echo
    echo "Deployment complete. ${APP_NAME} is running."
    echo "Follow live logs: sudo journalctl -u ${APP_NAME} -f"
    echo "Last 100 lines:  sudo journalctl -u ${APP_NAME} -n 100 --no-pager"
    echo "Service status:  sudo systemctl status ${APP_NAME} --no-pager"
    exit 0
  fi
  sleep 1
done

echo "The service started, but it did not answer on port 3000."
echo "View logs with: sudo journalctl -u ${APP_NAME} -n 100 --no-pager"
exit 1
