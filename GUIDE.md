# ForexTools — Setup Guide

CI/CD does two things: (1) on PR merge to `dev`, deploy to dev. (2) On `vX.Y.Z` tag push, deploy to master. Preview images are built on every PR push. Everything else is one-time manual setup.

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

### Option B — Docker Compose (mirrors CI/CD workflow)

```bash
# Build the image — stage 1 compiles the Vue SPA internally
docker build --build-arg BUILD_MODE=dev -t forextools-local:dev .

# Start with the same compose files used by CI/CD
IMAGE_TAG=forextools-local:dev \
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

From your host PC, open `http://<VM_IP>:9391`.

### Smoke tests (run on the VM)

Set `PORT` to match the option you're testing — `5000` for Option A, `9391` for Option B:

```bash
VM_IP=$(hostname -I | awk '{print $1}')
PORT=9391   # Option A: 5000 | Option B: 9391

# Health check
curl http://$VM_IP:$PORT/health
# → {"status":"ok"}

# Price API
curl -s http://$VM_IP:$PORT/api/price/EURUSD

# SPA deep-route fallback (should return index.html)
curl -s http://$VM_IP:$PORT/some/deep/route | grep -c "<title>"

# Docker health status (Option B — wait ~30s after start)
docker inspect --format='{{.State.Health.Status}}' forextools_dev

# Docker logs (Option B)
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

### Teardown

```bash
# Option A — just Ctrl-C the node process

# Option B
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker rmi forextools-local:dev
```

---

## VPS setup (run as root, once)

### 1. Create deployBoiz user

> **Skip this section if `deployBoiz` already exists and is working. Jump to [Add a new SSH key](#add-a-new-ssh-key-to-existing-deployboiz) instead.**

```bash
groupadd boiz
useradd -m -s /bin/bash -G boiz deployBoiz

# Lock password — key-only SSH
# ⚠️  Do NOT use `passwd -l` — it sets a `!` prefix that blocks SSH entirely.
#     Use `usermod -p '*'` instead: it sets an unusable hash while keeping
#     the account unlocked so publickey auth works normally.
usermod -p '*' deployBoiz
```

Verify the account is in the correct state before continuing:

```bash
passwd -S deployBoiz
# Expected output contains 'P' (not 'L'):
# deployBoiz P ... (password set, account unlocked)
```

---

### 2. Install SSH public key for deployBoiz

Generate a key pair on your **local machine** (no passphrase):

```bash
ssh-keygen -t ed25519 -C "gh-action-forex-tools-deployBoiz" -f ~/.ssh/deployBoiz_ed25519
```

Install the public key on the VPS **(as root)**:

```bash
mkdir -p /home/deployBoiz/.ssh
chmod 700 /home/deployBoiz/.ssh
echo "ssh-ed25519 AAAA...your-public-key" > /home/deployBoiz/.ssh/authorized_keys
chmod 600 /home/deployBoiz/.ssh/authorized_keys
chown -R deployBoiz:deployBoiz /home/deployBoiz/.ssh
```

> ⚠️ Use `>` (overwrite) not `>>` (append) to avoid stale or conflicting keys.
> ⚠️ Do **not** prepend `no-pty` or other restriction options — they block CI/CD command execution.

Verify the file looks clean (no `no-pty` prefix, one key per line):

```bash
cat /home/deployBoiz/.ssh/authorized_keys
# Expected:
# ssh-ed25519 AAAA... gh-action-forex-tools-deployBoiz
```

---

### 3. Verify permissions

SSH is strict — wrong permissions silently reject the key even if the content is correct.

```bash
# Home dir: must not be world-writable
ls -ld /home/deployBoiz
# Expected: drwxr-x--- or drwxr-xr-x (not drwxrwxrwx)

# .ssh dir: must be 700
ls -la /home/deployBoiz/.ssh/
# Expected: drwx------

# authorized_keys: must be 600
ls -la /home/deployBoiz/.ssh/authorized_keys
# Expected: -rw-------

# Ownership: must be deployBoiz:deployBoiz
stat -c "%U:%G %n" /home/deployBoiz/.ssh /home/deployBoiz/.ssh/authorized_keys
# Expected: deployBoiz:deployBoiz for both
```

Fix anything that doesn't match:

```bash
chmod 700 /home/deployBoiz/.ssh
chmod 600 /home/deployBoiz/.ssh/authorized_keys
chown -R deployBoiz:deployBoiz /home/deployBoiz/.ssh
```

---

### 4. Test SSH connection before touching GitHub secrets

Always confirm the key works from your local machine **before** setting up GitHub secrets.

```bash
ssh -i ~/.ssh/deployBoiz_ed25519 \
    -p <VPS_SSH_PORT> \
    -o PasswordAuthentication=no \
    deployBoiz@<VPS_HOST> "echo ok"
# Expected output: ok
```

If it still fails, check the live sshd log on the VPS:

```bash
sudo tail -f /var/log/auth.log
# Then retry the ssh command above in another terminal.
# The log will show the exact rejection reason.
```

---

### 5. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deployBoiz
```

---

### 6. Install Caddy

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

---

### 7. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

### 8. Configure Caddy

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

---

### 9. Create project directories

```bash
mkdir -p /opt/projects/forextools-dev
chown -R deployBoiz:boiz /opt/projects/forextools-dev
chmod 775 /opt/projects/forextools-dev
mkdir -p /opt/projects/forextools-master
chown -R deployBoiz:boiz /opt/projects/forextools-master
chmod 775 /opt/projects/forextools-master
```

No sudoers entry needed — CI/CD only runs `docker` commands (via group membership) and writes to `/opt/projects/` (owned by deployBoiz).

---

### 10. Verify as deployBoiz

```bash
su - deployBoiz
docker ps
docker compose version
touch /opt/projects/forextools-dev/test && rm /opt/projects/forextools-dev/test
```

---

## Add a new SSH key to existing deployBoiz

Use this when rotating keys or when the account already exists and is working.

**On your local machine** — generate a new key pair:

```bash
ssh-keygen -t ed25519 -C "gh-action-forex-tools-dev-deployBoiz" -f ~/.ssh/forex-tools-dev-deployBoiz
```

**On the VPS (as root)** — replace the old key:

```bash
# Overwrite with the new public key only (remove old keys)
echo "$(ssh-keygen -yf /path/to/new/private/key)" > /home/deployBoiz/.ssh/authorized_keys
chmod 600 /home/deployBoiz/.ssh/authorized_keys
chown deployBoiz:deployBoiz /home/deployBoiz/.ssh/authorized_keys

# Verify — no no-pty prefix, correct key content
cat /home/deployBoiz/.ssh/authorized_keys
```

**Test before updating GitHub secret:**

```bash
ssh -i ~/.ssh/forex-tools-dev-deployBoiz \
    -p <VPS_SSH_PORT> \
    -o PasswordAuthentication=no \
    deployBoiz@<VPS_HOST> "echo ok"
# Expected: ok
```

Only update `VPS_SSH_KEY` in GitHub secrets after the test passes.

---

## GitHub secrets and variables

Set these in **both** the `dev` and `master` environments (repo → Settings → Environments):

| Key | Type | `dev` value | `master` value |
|-----|------|-------------|----------------|
| `VPS_HOST` | Secret | VPS IP or hostname | same |
| `VPS_USER` | Secret | `deployBoiz` | same |
| `VPS_SSH_KEY` | Secret | private key contents | same |
| `VPS_SSH_PORT` | Secret | SSH port (e.g. `1993`) | same |
| `PORT` | Variable | `9391` | `9193` |
| `DEV_DOMAIN` | Variable | `forextoolsdev.americ.io.vn` | same |
| `PRD_DOMAIN` | Variable | `forextools.americ.io.vn` | same |

> ⚠️ When pasting `VPS_SSH_KEY` into GitHub: paste the **entire private key** including header and footer, with real newlines — do not collapse into a single line.

---

## Releasing to master

Master deploys are triggered by pushing a strict semver tag.

### Cut a release

```bash
git checkout master
git pull origin master
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

CI validates the tag (`vX.Y.Z`, strictly greater than the highest existing tag), builds a fresh image tagged `:v1.0.0`, `:latest`, and `:<sha>`, then deploys to the master VPS.

### Roll back

There is no "redeploy old image" button. To roll back, push a new, higher tag pointing at an older commit:

```bash
git tag -a v1.0.1 <older-good-commit-sha> -m "Rollback to <sha>"
git push origin v1.0.1
```

CI will rebuild from that commit and redeploy. This guarantees the rollback artifact is reproducible from source.

### Tag rules

- Strict semver only: `v1.2.3`. No `v1.2`, no `v1.2.3-rc1`, no leading zeros.
- Must be strictly greater than every existing `v*.*.*` tag in the repo.
- The very first tag is accepted regardless (no monotonic baseline yet).
- Annotated tags preferred (`git tag -a`) so `git show v1.2.3` carries a message.

### Dev flow (unchanged)

PR → merge to `dev` → CI deploys to dev.

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
