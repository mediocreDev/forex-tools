# ForexTools — Caddy + Docker Setup

All VPS setup is done once as root. CI/CD only does: rsync compose files → pull image → compose up → health check.

---

## VPS setup (run as root, once)

### Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### Install Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### Configure Caddy

```bash
echo 'import /etc/caddy/conf.d/*' | sudo tee /etc/caddy/Caddyfile
sudo mkdir -p /etc/caddy/conf.d

# Dev
sudo tee /etc/caddy/conf.d/forextoolsdev.americ.io.vn.caddy > /dev/null <<'EOF'
forextoolsdev.americ.io.vn {
    reverse_proxy localhost:9391
}
EOF

# Production
sudo tee /etc/caddy/conf.d/forextools.americ.io.vn.caddy > /dev/null <<'EOF'
forextools.americ.io.vn {
    reverse_proxy localhost:9193
}
EOF

sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl enable --now caddy
```

HTTPS is automatic — Caddy provisions Let's Encrypt certificates on first request.

### Configure deployBoiz

```bash
# Docker access (no sudo needed for docker commands)
usermod -aG docker deployBoiz

# Project directories
mkdir -p /opt/projects/forextools-dev
mkdir -p /opt/projects/forextools-master
chown -R deployBoiz:boiz /opt/projects/forextools-dev
chown -R deployBoiz:boiz /opt/projects/forextools-master
```

No sudoers entry needed — CI/CD only runs `docker` commands (via group membership) and writes to `/opt/projects/` (owned by deployBoiz).

### Verify as deployBoiz

```bash
su - deployBoiz
docker ps
docker compose version
touch /opt/projects/forextools-dev/test && rm /opt/projects/forextools-dev/test
```

---

## Verify after first deploy

```bash
curl -I https://forextoolsdev.americ.io.vn/
curl -I https://forextools.americ.io.vn/
curl https://forextools.americ.io.vn/health
curl -I https://forextools.americ.io.vn/some/deep/route
echo | openssl s_client -connect forextools.americ.io.vn:443 2>/dev/null | openssl x509 -noout -dates
```

## Useful commands

```bash
journalctl -u caddy -f                                                    # caddy logs
sudo systemctl reload caddy                                                # reload caddy config
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile      # test caddy config
ls /var/lib/caddy/.local/share/caddy/certificates/                         # cert storage
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f     # app logs (dev)
```

---

## Teardown: completely remove from VPS

### 1. Stop and remove containers

```bash
cd /opt/projects/forextools-dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml down --rmi all --volumes --remove-orphans

cd /opt/projects/forextools-master
docker compose -f docker-compose.yml -f docker-compose.master.yml down --rmi all --volumes --remove-orphans
```

### 2. Delete project files

```bash
sudo rm -rf /opt/projects/forextools-dev
sudo rm -rf /opt/projects/forextools-master
```

### 3. Remove leftover GHCR images from host

```bash
docker images --format '{{.Repository}}:{{.Tag}}' | grep 'ghcr.io.*forextools' | xargs -r docker rmi -f
docker image prune -f
```

### 4. Remove Caddy site configs

```bash
sudo rm -f /etc/caddy/conf.d/forextoolsdev.americ.io.vn.caddy
sudo rm -f /etc/caddy/conf.d/forextools.americ.io.vn.caddy
sudo systemctl reload caddy
```

If no other sites use Caddy, remove it entirely:

```bash
sudo systemctl stop caddy
sudo systemctl disable caddy
sudo apt-get remove --purge -y caddy
sudo rm -rf /etc/caddy /var/lib/caddy
sudo rm -f /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo rm -f /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
```

### 5. Close firewall ports

```bash
sudo ufw delete allow 80/tcp
sudo ufw delete allow 443/tcp
sudo ufw reload
```

### 6. Revoke Docker GHCR auth

```bash
docker logout ghcr.io
```

### 7. Remove docker group membership

```bash
# as root
sudo gpasswd -d deployBoiz docker
```

### 8. Delete GHCR packages (cannot be undone)

```bash
# Requires a PAT with delete:packages scope
gh api -X DELETE -H "Accept: application/vnd.github+json" \
  /user/packages/container/forextools-dev

gh api -X DELETE -H "Accept: application/vnd.github+json" \
  /user/packages/container/forextools-master
```

### 9. Remove GitHub secrets and variables

Delete from both `dev` and `master` environments:

- Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_PORT`
- Variables: `PORT`, `DEV_DOMAIN`, `PRD_DOMAIN`
- Repo variables: `LAST_GOOD_SHA_DEV`, `LAST_GOOD_SHA_MASTER`
