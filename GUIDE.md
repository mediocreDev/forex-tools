# ForexTools — Setup Guide

CI/CD only does: rsync compose files → pull image → compose up → health check. Everything else is one-time manual setup.

---

## Local testing (Ubuntu 24 VM)

The Express proxy (`proxy/index.js`) serves both the Vue SPA and `/api` from a single port — no Docker, Caddy, or real domain needed.

### Find the VM's IP (run on the VM)

```bash
ip a | grep "inet " | grep -v 127
# Look for the VMware adapter (usually 192.168.x.x or 172.x.x.x)
# Example: inet 192.168.182.128/24 ...
```

Use that IP everywhere below instead of `localhost`. All commands run **on the VM**; the browser is on your **host PC**.

### Prerequisites (one-time, run on the VM)

```bash
# Clone the repo
git clone https://github.com/mediocreDev/forex-tools
cd forex-tools

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
corepack enable && corepack prepare pnpm@latest --activate

# Docker (only needed for Option B)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Open firewall ports so the host PC can reach the VM
sudo ufw allow 5000/tcp   # Option A
sudo ufw allow 9391/tcp   # Option B
sudo ufw --force enable
```

### Option A — Direct Node (recommended)

```bash
pnpm install
pnpm build              # builds Vue → dist/  (use pnpm build:dev for dev mode)
node proxy/index.js     # serves SPA + proxies /api on port 5000
```

From your host PC, open `http://<VM_IP>:5000`.

### Option B — Docker (validates the container image)

```bash
pnpm build              # must build dist/ first

docker build -t forextools-local:latest .

docker run -d \
  --name forextools_local \
  -p 9391:5000 \
  -v "$(pwd)/dist:/app/dist:ro" \
  forextools-local:latest
```

From your host PC, open `http://<VM_IP>:9391`.

### Smoke tests (run on the VM)

```bash
VM_IP=$(hostname -I | awk '{print $1}')

# Health check
curl http://$VM_IP:5000/health
# → {"status":"ok"}

# API proxy (live call to babypips)
curl -s -X POST http://$VM_IP:5000/api \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' | head -c 200

# SPA deep-route fallback (should return index.html)
curl -s http://$VM_IP:5000/some/deep/route | grep -c "<title>"

# Docker health status (Option B — wait ~30s after start)
docker inspect --format='{{.State.Health.Status}}' forextools_local

# Docker logs (Option B)
docker logs -f forextools_local
```

### Teardown

```bash
# Option A — just Ctrl-C the node process

# Option B
docker rm -f forextools_local
docker rmi forextools-local:latest
```

---

## VPS setup (run as root, once)

### 1. Create group and deployBoiz user

```bash
groupadd boiz
useradd -m -s /bin/bash -G boiz deployBoiz
passwd -l deployBoiz   # lock password — key-only SSH
```

### 2. Install SSH public key for deployBoiz

Generate a key pair locally (no passphrase):

```bash
ssh-keygen -t ed25519 -C "deployBoiz@forextools" -f ~/.ssh/deployBoiz_ed25519
```

Install the public key on the VPS (as root):

```bash
mkdir -p /home/deployBoiz/.ssh
chmod 700 /home/deployBoiz/.ssh
echo "ssh-ed25519 AAAA...your-public-key" >> /home/deployBoiz/.ssh/authorized_keys
chmod 600 /home/deployBoiz/.ssh/authorized_keys
chown -R deployBoiz:deployBoiz /home/deployBoiz/.ssh
```

The **private key** (`deployBoiz_ed25519`) goes into the `VPS_SSH_KEY` GitHub secret.

### 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deployBoiz
```

### 4. Install Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

### 5. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 6. Configure Caddy

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

### 7. Create project directories

```bash
mkdir -p /opt/projects/forextools-dev
mkdir -p /opt/projects/forextools-master
chown -R deployBoiz:boiz /opt/projects/forextools-dev
chown -R deployBoiz:boiz /opt/projects/forextools-master
chmod 775 /opt/projects/forextools-dev
chmod 775 /opt/projects/forextools-master
```

No sudoers entry needed — CI/CD only runs `docker` commands (via group membership) and writes to `/opt/projects/` (owned by deployBoiz).

### 8. Verify as deployBoiz

```bash
su - deployBoiz
docker ps
docker compose version
touch /opt/projects/forextools-dev/test && rm /opt/projects/forextools-dev/test
```

---

## GitHub secrets and variables

Set these in **both** the `dev` and `master` environments (repo → Settings → Environments):

| Key | Type | `dev` value | `master` value |
|-----|------|-------------|----------------|
| `VPS_HOST` | Secret | VPS IP or hostname | same |
| `VPS_USER` | Secret | `deployBoiz` | same |
| `VPS_SSH_KEY` | Secret | private key contents | same |
| `VPS_SSH_PORT` | Secret | `22` | same |
| `PORT` | Variable | `9391` | `9193` |
| `DEV_DOMAIN` | Variable | `forextoolsdev.americ.io.vn` | same |
| `PRD_DOMAIN` | Variable | `forextools.americ.io.vn` | same |

Also set these at the **repository** level (auto-updated by CI/CD after each successful deploy):

- `LAST_GOOD_SHA_DEV`
- `LAST_GOOD_SHA_MASTER`

---

## Verify after first deploy

```bash
curl -I https://forextoolsdev.americ.io.vn/
curl -I https://forextools.americ.io.vn/
curl https://forextools.americ.io.vn/health
curl -I https://forextools.americ.io.vn/some/deep/route
echo | openssl s_client -connect forextools.americ.io.vn:443 2>/dev/null | openssl x509 -noout -dates
```

---

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

### 7. Remove deployBoiz user and group

```bash
# as root
gpasswd -d deployBoiz docker
userdel -r deployBoiz
groupdel boiz
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
