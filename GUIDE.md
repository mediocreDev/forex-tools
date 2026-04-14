# ForexTools — Setup Guide

## CI/CD Architecture

The pipeline is split into two independent concerns:

| Concern | Tool | Trigger |
|---------|------|---------|
| **CI** | GitHub Actions | PR push / merge / semver tag |
| **CD** | Komodo or Dockge | New `:latest` image on GHCR |

**CI does:** build image → push to GHCR (tagged `:<sha>` + `:latest`) → cleanup old images.  
**CD does:** detect new `:latest` → `docker pull` → `docker compose up -d`. No SSH, no secrets in GitHub.

Each VPS stack directory (`forextools-dev`, `forextools-master`) holds a single `docker-compose.yml` + `.env`. Komodo and Dockge both read this layout natively — no `-f` flag juggling.

---

## Local Development (Ubuntu 24 VM)

The Express proxy (`proxy/index.js`) serves both the Vue SPA and `/api` from a single port — no Docker, Caddy, or real domain needed.

### Find the VM's IP (run on the VM)

```bash
ip a | grep "inet " | grep -v 127
# Look for the VMware adapter (usually 192.168.x.x or 172.x.x.x)
```

Use that IP everywhere below. All commands run **on the VM**; the browser is on your **host PC**.

### Prerequisites (one-time, run on the VM)

```bash
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
pnpm build          # builds Vue → dist/  (use pnpm build:dev for dev mode)
node proxy/index.js # serves SPA + proxies /api on port 5000
```

From your host PC, open `http://<VM_IP>:5000`.

### Option B — Docker Compose (mirrors production)

```bash
# Create a local .env in the project root
cat > .env <<'EOF'
IMAGE_TAG=forextools-local:dev
CONTAINER_NAME=forextools_local
PORT=9391
TWELVE_DATA_API_KEY=your_key_here
EOF

# Build the image — stage 1 compiles the Vue SPA internally
docker build --build-arg BUILD_MODE=dev -t forextools-local:dev .

# Start
docker compose up -d
```

From your host PC, open `http://<VM_IP>:9391`.

### Smoke tests (run on the VM)

```bash
VM_IP=$(hostname -I | awk '{print $1}')
PORT=9391   # Option A: 5000 | Option B: 9391

curl http://$VM_IP:$PORT/health          # → {"status":"ok"}
curl -s http://$VM_IP:$PORT/api/price/EURUSD
curl -s http://$VM_IP:$PORT/some/deep/route | grep -c "<title>"

# Docker health status (Option B — wait ~30s after start)
docker inspect --format='{{.State.Health.Status}}' forextools_local

# Docker logs (Option B)
docker compose logs -f
```

### Teardown

```bash
# Option A — just Ctrl-C the node process

# Option B
docker compose down
docker rmi forextools-local:dev
```

---

## VPS Setup (one-time, run as root)

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Install Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

### 3. Configure Caddy

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

### 4. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 5. Create project directories

```bash
mkdir -p /opt/projects/forextools-dev
mkdir -p /opt/projects/forextools-master
```

> Give write access to whatever user Komodo's periphery agent or Dockge runs as.  
> e.g. `chown -R $KOMODO_USER /opt/projects`

### 6. Copy compose file to each stack directory

```bash
# Grab the file from the repo (or copy manually)
curl -fsSL https://raw.githubusercontent.com/mediocreDev/forex-tools/dev/docker-compose.yml \
  -o /opt/projects/forextools-dev/docker-compose.yml

curl -fsSL https://raw.githubusercontent.com/mediocreDev/forex-tools/dev/docker-compose.yml \
  -o /opt/projects/forextools-master/docker-compose.yml
```

> **Note:** After this initial copy you don't need to keep it in sync manually —  
> Komodo manages the compose content through its UI, and Dockge reads the file directly.

### 7. Write .env for each stack

These files are managed by you (or by Komodo/Dockge's UI) — **never** committed to the repo.

```bash
# forextools-dev
cat > /opt/projects/forextools-dev/.env <<'EOF'
IMAGE_TAG=ghcr.io/mediocredev/forextools-dev:latest
CONTAINER_NAME=forextools_dev
PORT=9391
TWELVE_DATA_API_KEY=your_key_here
EOF

# forextools-master
cat > /opt/projects/forextools-master/.env <<'EOF'
IMAGE_TAG=ghcr.io/mediocredev/forextools-master:latest
CONTAINER_NAME=forextools_master
PORT=9193
TWELVE_DATA_API_KEY=your_key_here
EOF
```

### 8. Authenticate Docker with GHCR (for pulling private images)

Create a GitHub PAT with **`read:packages`** scope, then:

```bash
echo "<YOUR_PAT>" | docker login ghcr.io -u <github-username> --password-stdin
```

This writes credentials to `~/.docker/config.json` for the user running the containers.  
Run it as the same user that will run `docker compose` (your Komodo agent user, Dockge user, etc.).

---

## CD Setup — Komodo (recommended)

Komodo is a self-hosted infrastructure manager with a web UI. It runs its own agent on each server and drives Docker directly — no SSH keys needed by CI.

### Install Komodo

On your VPS, create `/opt/komodo/compose.yml`:

```yaml
# https://komo.do/docs/install
services:
  komodo-core:
    image: ghcr.io/mbecker20/komodo:latest
    restart: unless-stopped
    ports:
      - "9120:9120"
    volumes:
      - komodo-data:/data
    environment:
      KOMODO_HOST: http://localhost:9120   # change to public URL if needed
      KOMODO_TITLE: ForexTools Komodo

  komodo-periphery:
    image: ghcr.io/mbecker20/komodo-periphery:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/projects:/opt/projects       # bind your stack dirs
    environment:
      PERIPHERY_PASSKEY: change_me_strong_passkey

volumes:
  komodo-data:
```

```bash
docker compose -f /opt/komodo/compose.yml up -d
```

Then open `http://<VPS_IP>:9120` and create your admin account.

### Add the VPS as a Server

1. **Servers → Add Server**
2. Name: `vps-main`, Address: `http://komodo-periphery:8120` (internal compose network), Passkey: your passkey
3. Verify — status should turn green

### Create a Stack per environment

1. **Stacks → Add Stack**
2. Name: `forextools-dev`
3. **Compose file**: paste the contents of `docker-compose.yml` (or set **File path** to `/opt/projects/forextools-dev/docker-compose.yml`)
4. **Environment** tab: add all four variables:
   ```
   IMAGE_TAG=ghcr.io/mediocredev/forextools-dev:latest
   CONTAINER_NAME=forextools_dev
   PORT=9391
   TWELVE_DATA_API_KEY=your_key_here
   ```
5. **Server**: select `vps-main`
6. **Deploy** — Komodo runs `docker compose up -d`

Repeat for `forextools-master` (port `9193`, image `forextools-master:latest`).

### Auto-deploy on new image push (GHCR webhook → Komodo)

Every time CI pushes a new `:latest`, you want Komodo to pull and redeploy automatically.

#### 1 — Get the Komodo stack webhook URL

In Komodo: **Stack → forextools-dev → Webhooks** → copy the **Redeploy** webhook URL.  
It looks like: `https://<komodo-host>/webhook/stack/<stack-id>/redeploy?secret=<token>`

#### 2 — Register the webhook in GHCR

GitHub → your account → **Packages → forextools-dev → Webhooks** → Add webhook:
- Payload URL: your Komodo redeploy webhook URL
- Content type: `application/json`
- Events: **Package published**

Now every `docker push` that updates `:latest` fires the webhook → Komodo pulls the new image and runs `docker compose up -d --pull always`.

#### Alternative: scheduled pull (no public Komodo URL needed)

If Komodo isn't publicly reachable, use a Komodo **Procedure** on a cron:

1. **Procedures → Add Procedure**
2. Add two actions in order:
   - `Stack: Pull` → `forextools-dev`
   - `Stack: Deploy` → `forextools-dev`
3. **Schedule**: `*/10 * * * *` (every 10 minutes, or adjust to taste)

---

## CD Setup — Dockge + Watchtower (alternative)

Dockge is a lightweight Docker Compose web UI. It doesn't have native registry polling, so pair it with **Watchtower** which monitors containers and restarts them when their image is updated on the registry.

### Install Dockge

```bash
mkdir -p /opt/dockge /opt/stacks
curl -fsSL https://dockge.kuma.pet/compose.yaml -o /opt/dockge/compose.yml
```

Edit `/opt/dockge/compose.yml` — set `DOCKGE_STACKS_DIR` to `/opt/projects` to reuse the same stack directories:

```yaml
environment:
  - DOCKGE_STACKS_DIR=/opt/projects
volumes:
  - /opt/projects:/opt/projects
  - /var/run/docker.sock:/var/run/docker.sock
```

```bash
docker compose -f /opt/dockge/compose.yml up -d
```

Open `http://<VPS_IP>:5001`. Your `forextools-dev` and `forextools-master` stacks appear automatically.

### Install Watchtower

Add a Watchtower service to pull and redeploy when `:latest` changes. Create `/opt/watchtower/compose.yml`:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /root/.docker/config.json:/config.json:ro   # GHCR credentials
    environment:
      WATCHTOWER_CLEANUP: "true"           # remove old images after update
      WATCHTOWER_POLL_INTERVAL: 60         # check every 60 seconds
      WATCHTOWER_LABEL_ENABLE: "true"      # only watch labelled containers
```

```bash
docker compose -f /opt/watchtower/compose.yml up -d
```

### Label containers for Watchtower

Add the Watchtower label to `docker-compose.yml` so only ForexTools containers are monitored:

```yaml
services:
  app:
    # ... existing config ...
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

> **Important:** `/root/.docker/config.json` must contain your GHCR credentials  
> (from `docker login ghcr.io` in step 8 of VPS setup).  
> Adjust the path if Watchtower runs as a non-root user.

---

## GitHub Actions — CI only (no secrets needed)

After this refactor GitHub Actions only builds and pushes images. The only token needed is `GITHUB_TOKEN`, which is **automatically available** in every workflow — no secrets to configure.

| What changed | Before | After |
|---|---|---|
| Deploy step | SSH into VPS, `docker compose up` | Removed — handled by Komodo/Dockge |
| VPS secrets | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_PORT` | Not needed |
| API key in GHA | `TWELVE_DATA_API_KEY` secret in GitHub | Managed in VPS `.env` by you |
| GitHub secrets required | 5 secrets per environment | **0** |

---

## Releasing to master

Master deploys are triggered by pushing a strict semver tag. CI builds the image; Komodo/Dockge deploys it.

### Cut a release

```bash
git checkout master
git pull origin master
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

CI validates the tag, builds a fresh image tagged `:v1.0.0`, `:latest`, and `:<sha>`, and pushes to GHCR. Komodo/Dockge detects the new `:latest` and redeploys automatically.

### Roll back

Push a new, higher tag pointing at an older commit:

```bash
git tag -a v1.0.1 <older-good-commit-sha> -m "Rollback to <sha>"
git push origin v1.0.1
```

CI rebuilds from that commit and pushes `:latest` → Komodo/Dockge redeploys.

### Tag rules

- Strict semver only: `v1.2.3`. No `v1.2`, no `v1.2.3-rc1`, no leading zeros.
- Must be strictly greater than every existing `v*.*.*` tag.
- Annotated tags preferred (`git tag -a`) so `git show v1.2.3` carries a message.

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
# Caddy
journalctl -u caddy -f
sudo systemctl reload caddy
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
ls /var/lib/caddy/.local/share/caddy/certificates/

# App logs
docker compose -C /opt/projects/forextools-dev logs -f
docker compose -C /opt/projects/forextools-master logs -f

# Manual pull + restart (without Komodo/Watchtower)
cd /opt/projects/forextools-dev
docker compose pull && docker compose up -d --remove-orphans
```

---

## Teardown: completely remove from VPS

### 1. Stop and remove containers

```bash
cd /opt/projects/forextools-dev
docker compose down --rmi all --volumes --remove-orphans

cd /opt/projects/forextools-master
docker compose down --rmi all --volumes --remove-orphans
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
sudo systemctl stop caddy && sudo systemctl disable caddy
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

### 7. Stop Komodo / Dockge / Watchtower

```bash
docker compose -f /opt/komodo/compose.yml down --rmi all
# or
docker compose -f /opt/dockge/compose.yml down --rmi all
docker compose -f /opt/watchtower/compose.yml down --rmi all
```

### 8. Delete GHCR packages (cannot be undone)

```bash
# Requires a PAT with delete:packages scope
gh api -X DELETE -H "Accept: application/vnd.github+json" \
  /user/packages/container/forextools-dev

gh api -X DELETE -H "Accept: application/vnd.github+json" \
  /user/packages/container/forextools-master
```
