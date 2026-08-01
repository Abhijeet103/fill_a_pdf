#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="localpdf-store"
APP_USER="localpdf"
APP_DIR="/opt/localpdf-store"
REPO_URL="${1:-https://github.com/Abhijeet103/fill_a_pdf.git}"
SITE_URL="${2:-}"
BRANCH="${BRANCH:-main}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer with sudo."
  echo "Example: sudo bash deploy/ec2-setup.sh '${REPO_URL}' 'http://localpdf.store'"
  exit 1
fi

if [[ -z "${SITE_URL}" || ! "${SITE_URL}" =~ ^https?://[^/]+/?$ ]]; then
  echo "A public site URL is required for canonical links and SEO."
  echo "Use your domain, or temporarily use the EC2 public IP."
  echo "Example: sudo bash deploy/ec2-setup.sh '${REPO_URL}' 'http://203.0.113.10'"
  exit 1
fi

install_base_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg git nginx
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y ca-certificates curl git nginx
  elif command -v yum >/dev/null 2>&1; then
    yum install -y ca-certificates curl git nginx
  else
    echo "Unsupported Linux distribution. Use Ubuntu, Debian, Amazon Linux 2023, or RHEL-compatible Linux."
    exit 1
  fi
}

node_major_version() {
  if [[ ! -x /usr/bin/node || ! -x /usr/bin/npm ]]; then
    echo 0
    return
  fi
  /usr/bin/node --version | sed -E 's/^v([0-9]+).*/\1/'
}

install_node() {
  if (( "$(node_major_version)" >= 22 )); then
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    if command -v dnf >/dev/null 2>&1; then
      dnf install -y nodejs
    else
      yum install -y nodejs
    fi
  fi
}

ensure_build_swap() {
  local memory_kb swap_kb
  memory_kb="$(awk '/MemTotal:/ { print $2 }' /proc/meminfo)"
  swap_kb="$(awk '/SwapTotal:/ { print $2 }' /proc/meminfo)"

  if (( memory_kb >= 1800000 || swap_kb >= 1000000 )); then
    return
  fi

  echo "Adding 2 GB of swap so the production build can complete on a micro instance."
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  if ! grep -qF '/swapfile none swap sw 0 0' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
}

install_base_packages
install_node
ensure_build_swap

if (( "$(node_major_version)" < 22 )); then
  echo "Node.js 22 or newer could not be installed."
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/var/lib/${APP_USER}" --shell /usr/sbin/nologin "${APP_USER}"
fi

if [[ -d "${APP_DIR}/.git" ]]; then
  echo "${APP_DIR} already contains localpdf.store. Run deploy/ec2-update.sh for future releases."
else
  install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"
  runuser -u "${APP_USER}" -- git clone --branch "${BRANCH}" --single-branch "${REPO_URL}" "${APP_DIR}"
fi

printf 'NEXT_PUBLIC_SITE_URL=%s\n' "${SITE_URL%/}" > "${APP_DIR}/.env.production"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env.production"
chmod 600 "${APP_DIR}/.env.production"

runuser -u "${APP_USER}" -- /usr/bin/npm --prefix "${APP_DIR}" ci
runuser -u "${APP_USER}" -- /usr/bin/npm --prefix "${APP_DIR}" run build

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
ExecStart=/usr/bin/npm start -- --hostname 127.0.0.1 --port 3000
Restart=on-failure
RestartSec=5
TimeoutStopSec=20
KillSignal=SIGTERM
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

cat > "/etc/nginx/conf.d/${APP_NAME}.conf" <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 1m;

    location ^~ /assets/ {
        root /opt/localpdf-store/dist/client;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/conf.d/default.conf
nginx -t
systemctl daemon-reload
systemctl enable --now "${APP_NAME}"
systemctl enable --now nginx
systemctl reload nginx

for attempt in {1..15}; do
  if curl --fail --silent --show-error http://127.0.0.1/ >/dev/null; then
    echo "localpdf.store is running at ${SITE_URL%/}"
    echo "Ensure the EC2 security group allows inbound TCP port 80 from 0.0.0.0/0 and ::/0."
    exit 0
  fi
  sleep 1
done

echo "Installation completed, but the health check failed."
echo "Inspect logs with: sudo journalctl -u ${APP_NAME} -n 100 --no-pager"
exit 1
