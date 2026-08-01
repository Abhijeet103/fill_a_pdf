#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="localpdf-store"
APP_USER="localpdf"
APP_DIR="/opt/localpdf-store"
DOMAIN="localpdf.store"
SITE_URL="https://${DOMAIN}"
TLS_EMAIL="${1:-}"
REPO_URL="${2:-https://github.com/Abhijeet103/fill_a_pdf.git}"
BRANCH="${3:-main}"

step() {
  printf '\n==> %s\n' "$1"
}

deployment_error() {
  local exit_code=$?
  echo
  echo "Deployment stopped at line ${BASH_LINENO[0]} with exit code ${exit_code}."
  echo "Copy the last 30 lines of output if you need help."
  exit "${exit_code}"
}

trap deployment_error ERR

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this deployment script with sudo."
  echo "Example: sudo bash deploy/ec2-deploy.sh you@example.com"
  exit 1
fi

if [[ ! "${TLS_EMAIL}" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "Provide a valid email address for Let's Encrypt notices."
  echo "Example: sudo bash deploy/ec2-deploy.sh you@example.com"
  exit 1
fi

install_base_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      ca-certificates curl dnsutils git gnupg nginx certbot python3-certbot-nginx
  elif command -v dnf >/dev/null 2>&1; then
    # Amazon Linux 2023 ships curl-minimal, which provides the curl command and
    # conflicts with the full curl RPM. Do not request the full package here.
    dnf install -y \
      ca-certificates bind-utils git nginx certbot python3-certbot-nginx
    if ! command -v curl >/dev/null 2>&1; then
      dnf install -y curl-minimal
    fi
  elif command -v yum >/dev/null 2>&1; then
    yum install -y \
      ca-certificates bind-utils git nginx certbot python3-certbot-nginx
    if ! command -v curl >/dev/null 2>&1; then
      yum install -y curl
    fi
  else
    echo "Unsupported Linux distribution."
    echo "Use Ubuntu, Debian, Amazon Linux 2023, or RHEL-compatible Linux."
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

  echo "Adding 2 GB of swap for the production build."
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile || \
      dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
    chmod 600 /swapfile
    mkswap /swapfile
  fi

  swapon /swapfile
  if ! grep -qF '/swapfile none swap sw 0 0' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
}

verify_dns() {
  local imds_token instance_public_ip resolved_address_lines resolved_addresses
  resolved_address_lines="$(getent ahostsv4 "${DOMAIN}" | awk '{ print $1 }' | sort -u)"
  resolved_addresses="$(printf '%s\n' "${resolved_address_lines}" | paste -sd ',' -)"

  if [[ -z "${resolved_addresses}" ]]; then
    echo "DNS is not ready for ${DOMAIN}."
    echo "Create an A record pointing ${DOMAIN} to this EC2 instance's public IP, then run the script again."
    exit 1
  fi

  imds_token="$(curl --fail --silent --show-error --max-time 3 \
    --request PUT \
    --header 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
    http://169.254.169.254/latest/api/token 2>/dev/null || true)"
  instance_public_ip="$(curl --fail --silent --show-error --max-time 3 \
    --header "X-aws-ec2-metadata-token: ${imds_token}" \
    http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"

  if [[ -z "${instance_public_ip}" ]]; then
    echo "The EC2 public IPv4 address could not be read from instance metadata."
    echo "Confirm that this instance has a public or Elastic IP and that IMDS is enabled."
    exit 1
  fi

  if ! grep -Fxq "${instance_public_ip}" <<< "${resolved_address_lines}"; then
    echo "DNS does not point to this EC2 instance, so Let's Encrypt cannot validate the domain."
    echo "Current ${DOMAIN} A record(s): ${resolved_addresses}"
    echo "Required ${DOMAIN} A record: ${instance_public_ip}"
    echo "Replace the existing A records, wait for DNS propagation, then run this script again."
    exit 1
  fi

  echo "DNS verified: ${DOMAIN} points to this EC2 instance (${instance_public_ip})."
}

step "1/9 Installing required system packages"
install_base_packages

step "2/9 Checking that DNS points to this EC2 instance"
verify_dns

step "3/9 Installing Node.js 22"
install_node
ensure_build_swap

if (( "$(node_major_version)" < 22 )); then
  echo "Node.js 22 or newer could not be installed."
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home \
    --home-dir "/var/lib/${APP_USER}" \
    --shell /usr/sbin/nologin \
    "${APP_USER}"
fi

step "4/9 Updating application source"
if [[ -d "${APP_DIR}/.git" ]]; then
  systemctl stop "${APP_NAME}" 2>/dev/null || true
  runuser -u "${APP_USER}" -- git -C "${APP_DIR}" fetch origin "${BRANCH}"
  runuser -u "${APP_USER}" -- git -C "${APP_DIR}" checkout "${BRANCH}"
  runuser -u "${APP_USER}" -- git -C "${APP_DIR}" merge --ff-only "origin/${BRANCH}"
else
  install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"
  runuser -u "${APP_USER}" -- git clone \
    --branch "${BRANCH}" \
    --single-branch \
    "${REPO_URL}" \
    "${APP_DIR}"
fi

# If this command was launched from an older checkout, continue with the newly
# pulled copy. This avoids running stale deployment logic after a git update.
if [[ "${LOCALPDF_DEPLOY_REEXECED:-0}" != "1" ]]; then
  step "Restarting with the latest deployment script"
  exec env LOCALPDF_DEPLOY_REEXECED=1 \
    "${APP_DIR}/deploy/ec2-deploy.sh" "${TLS_EMAIL}" "${REPO_URL}" "${BRANCH}"
fi

printf 'NEXT_PUBLIC_SITE_URL=%s\n' "${SITE_URL}" > "${APP_DIR}/.env.production"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env.production"
chmod 600 "${APP_DIR}/.env.production"

step "5/9 Installing Node dependencies (this can take several minutes on a micro instance)"
runuser -u "${APP_USER}" -- env \
  NPM_CONFIG_PROGRESS=false \
  NPM_CONFIG_AUDIT=false \
  NPM_CONFIG_FUND=false \
  timeout 15m /usr/bin/npm --prefix "${APP_DIR}" ci --loglevel=notice

step "6/9 Building the production application (this can also take several minutes)"
runuser -u "${APP_USER}" -- env \
  NPM_CONFIG_PROGRESS=false \
  timeout 20m /usr/bin/npm --prefix "${APP_DIR}" run build

step "7/9 Configuring and starting systemd and Nginx"
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

cat > "/etc/nginx/conf.d/${APP_NAME}.conf" <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${DOMAIN};

    client_max_body_size 1m;

    location ^~ /assets/ {
        root ${APP_DIR}/dist/client;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
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

for attempt in {1..20}; do
  if curl --fail --silent --show-error \
    --header "Host: ${DOMAIN}" \
    http://127.0.0.1/ >/dev/null; then
    break
  fi
  if [[ "${attempt}" -eq 20 ]]; then
    echo "The HTTP health check failed."
    echo "Inspect logs with: journalctl -u ${APP_NAME} -n 100 --no-pager"
    exit 1
  fi
  sleep 1
done

step "8/9 Requesting and installing the TLS certificate"
certbot --nginx \
  --non-interactive \
  --agree-tos \
  --redirect \
  --keep-until-expiring \
  --email "${TLS_EMAIL}" \
  --domains "${DOMAIN}"

cat > /etc/systemd/system/localpdf-certbot-renew.service <<'EOF'
[Unit]
Description=Renew Let's Encrypt certificates

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet
ExecStartPost=/usr/bin/systemctl reload nginx
EOF

cat > /etc/systemd/system/localpdf-certbot-renew.timer <<'EOF'
[Unit]
Description=Check Let's Encrypt certificates twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now localpdf-certbot-renew.timer

step "9/9 Testing automatic certificate renewal and public HTTPS"
certbot renew --dry-run

if ! curl --fail --silent --show-error "${SITE_URL}/" >/dev/null; then
  echo "HTTPS was configured, but the public HTTPS health check failed."
  echo "Confirm that the EC2 security group allows inbound TCP ports 80 and 443."
  exit 1
fi

echo "Deployment complete: ${SITE_URL}"
echo "Automatic certificate renewal is enabled."
echo "Allow inbound TCP ports 80 and 443 in the EC2 security group."
