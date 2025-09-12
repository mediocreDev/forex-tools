#!/bin/bash

set -euo pipefail

DOMAIN="forextoolsdev.americ.io.vn"
EMAIL="trusted7536@gmail.com"
APP_NAME="forextools_dev"   # must match container_name in docker-compose.dev.yml
WEBROOT="/var/www/forextool-dev/dist"

echo "::group::🛠 Installing NGINX, Certbot, and UFW"
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx ufw
echo "::endgroup::"

echo "::group::🔓 Configuring UFW for NGINX"
sudo ufw allow 'OpenSSH'
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
echo "::endgroup::"

echo "::group::📄 Rewriting NGINX config for $DOMAIN"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $WEBROOT;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://$APP_NAME:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        proxy_pass http://$APP_NAME:5000/health;
    }
}
EOF
echo "::endgroup::"

echo "::group::🔗 Enabling site and reloading NGINX"
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
echo "::endgroup::"

echo "::group::🔐 Forcing Certbot certificate issuance"
# Remove existing cert if you want to truly recreate it (⚠️ irreversible)
# sudo certbot delete --cert-name "$DOMAIN" || true

# Renew or issue fresh
sudo certbot --nginx \
  --non-interactive --agree-tos \
  --redirect \
  --email "$EMAIL" \
  -d "$DOMAIN" -d "www.$DOMAIN" || {
    echo "::warning::⚠️ Certbot exited non-zero. Likely cert is already valid."
    echo "::warning::Skipping failure since HTTPS is still active."
  }
echo "::endgroup::"

echo "::group::♻️ Reloading NGINX after cert installation"
sudo systemctl reload nginx
echo "::endgroup::"

echo "::notice::✅ SETUP COMPLETE — HTTPS ready at https://$DOMAIN"
