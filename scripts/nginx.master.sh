#!/bin/bash
set -euo pipefail

DOMAIN="forextools.americ.io.vn"
EMAIL="trusted7536@gmail.com"
WEBROOT="/var/www/forextools-master/dist"
PORT="9193"

echo "::group::🛠 Installing NGINX, Certbot, and UFW"
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx ufw
echo "::endgroup::"

echo "::group::🔓 Configuring UFW for NGINX"
sudo ufw allow 'OpenSSH'
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
echo "::endgroup::"

echo "::group::📄 Writing NGINX config for $DOMAIN"
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

    location /api {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:$PORT/health;
    }
}
EOF
echo "::endgroup::"

echo "::group::🔗 Enabling site and reloading NGINX"
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
echo "::endgroup::"

echo "::group::🔐 Requesting/renewing Certbot certificate"
sudo certbot --nginx \
  --non-interactive --agree-tos \
  --redirect \
  --email "$EMAIL" \
  -d "$DOMAIN" -d "www.$DOMAIN"
echo "::endgroup::"

echo "::group::♻️ Reloading NGINX after cert installation"
sudo systemctl reload nginx
echo "::endgroup::"

echo "::notice::✅ HTTPS ready at https://$DOMAIN"
