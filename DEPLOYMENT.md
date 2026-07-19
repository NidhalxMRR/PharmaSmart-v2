# Deployment — PharmaSmart v3 (VPS / systemd)

This documents how PharmaSmart v3's backend is kept alive in production on the
Contabo VPS (`161.97.134.3`), using `systemd` instead of `nohup`/`screen`.
Follow this once per server; after that, deploys are a one-line restart.

## Why systemd instead of `nohup` / `screen`

`nohup &` only survives a *terminal* closing — it does **not** survive the
whole SSH login session ending, because `systemd-logind` kills all of a
user's processes on logout by default (`KillUserProcesses=yes`). A
`systemd --user` service (or a lingering user + system service, see below)
avoids that entirely, and adds automatic restart if the process crashes —
which `nohup` never gave us.

## One-time server setup

### 1. Enable linger for the deploy user

Lets the user's processes (and their systemd services) keep running with no
active login session.

```bash
sudo loginctl enable-linger nidhal
```

Verify:

```bash
loginctl show-user nidhal | grep Linger
# expect: Linger=yes
```

### 2. Create the systemd service

```bash
sudo tee /etc/systemd/system/pharmasmart.service > /dev/null << 'EOF'
[Unit]
Description=PharmaSmart v3 backend
After=network.target

[Service]
Type=simple
User=nidhal
WorkingDirectory=/home/nidhal/pharmasmart-v3
ExecStart=/usr/bin/node dist/server.cjs
Restart=on-failure
RestartSec=3
EnvironmentFile=/home/nidhal/pharmasmart-v3/.env

[Install]
WantedBy=multi-user.target
EOF
```

`EnvironmentFile` loads `.env` (GEMINI_API_KEY, etc.) the same way `npm start`
did — nothing to duplicate or hardcode here.

### 3. Enable and start it

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pharmasmart
```

### 4. Kill any manually-started process so there's only one owner of port 3000

```bash
pkill -f 'node dist/server.cjs' || true   # only needed the first time
sudo systemctl restart pharmasmart
```

## Day-to-day use

| Task                      | Command                                  |
|---------------------------|-------------------------------------------|
| Check it's running        | `systemctl status pharmasmart`             |
| Live logs                 | `journalctl -u pharmasmart -f`             |
| Restart after a deploy    | `sudo systemctl restart pharmasmart`       |
| Stop it                   | `sudo systemctl stop pharmasmart`          |

## Deploying new code

```bash
cd /home/nidhal/pharmasmart-v3
git pull
npm install        # only if package.json changed
npm run build       # produces dist/server.cjs + built frontend
sudo systemctl restart pharmasmart
```

## Health check

```bash
curl http://161.97.134.3:3000/api/health
# expect: {"status":"ok","time":"..."}
```