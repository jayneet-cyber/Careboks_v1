# Hetzner Cloud Debian Deployment (Frontend + Local Supabase)

This guide documents the live deployment of Careboks on Debian VM with:
- Frontend served by Nginx (SPA with fallback routing)
- Local Supabase via Docker Compose (CLI-based)
- Supabase API & Studio proxied through Nginx
- HTTPS domain setup via Let's Encrypt certificate
- Live domain: `https://careboks.eu`

## ✅ Implementation Summary (What We Did)

### Completed Steps

**1) VM Baseline Installed ✅**
```bash
apt install -y curl git nginx certbot ca-certificates gnupg
```

**2) Docker Verified ✅**
- Docker version 28.2.2 already present
- Docker Compose v2 available

**3) Node.js 20 LTS Installed ✅**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

**4) App Cloned & Built ✅**
```bash
cd /opt
git clone <repo> careboks
cd /opt/careboks
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/careboks/
```

**5) Nginx Configured ✅**
- Frontend served from `/var/www/careboks` at `https://careboks.eu/`
- SPA fallback enabled for routes (`/app`, `/account`, `/document/:token`)
- Supabase API paths proxied to local Kong API gateway on port `54321`
- Studio paths proxied to port `54323`

**6) Local Supabase Running ✅**
```bash
cd /opt/careboks
npx supabase start
npx supabase functions serve --env-file ./.env
```

All Docker containers running (Kong, Auth, PostgREST, Realtime, Storage, Studio, DB, Edge Runtime, etc.)

**7) Edge Functions CORS Updated ✅**
All three functions now enforce `APP_ORIGIN` allowlisting instead of wildcard `*`:
- `supabase/functions/extract-text-from-document/index.ts`
- `supabase/functions/generate-patient-document-v2/index.ts`
- `supabase/functions/regenerate-section/index.ts`

**8) Frontend & Studio Accessible ✅**
- Frontend: `https://careboks.eu/`
- Studio: `https://careboks.eu/studio/` → redirects to `/project/default`

---

## 📋 Current Configuration

### Nginx Site Config
Location: `/etc/nginx/sites-available/careboks`

Serves frontend on `/`, redirects HTTP to HTTPS, proxies Supabase paths to local containers, and includes the `.mjs` worker MIME fix used for PDF extraction:

```nginx
server {
  listen 80;
  server_name careboks.eu www.careboks.eu;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name careboks.eu www.careboks.eu;

  ssl_certificate /etc/letsencrypt/live/careboks.eu/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/careboks.eu/privkey.pem;

  root /var/www/careboks;
  index index.html;
  client_max_body_size 25M;

  # Ensure PDF.js worker modules are served with JS MIME type
  location ~* \.mjs$ {
    types { application/javascript mjs; }
    default_type application/javascript;
  }

  # Static assets must not fall back to index.html
  location /assets/ {
    try_files $uri =404;
  }

  # Frontend SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Studio proxy
  location /studio/ {
    proxy_pass http://127.0.0.1:54323/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # Studio project pages
  location /project/ {
    proxy_pass http://127.0.0.1:54323;
    proxy_set_header Host 127.0.0.1:54323;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $server_name;
  }

  # Supabase API paths (all to Kong gateway 54321)
  location /auth/v1/ {
    proxy_pass http://127.0.0.1:54321;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /rest/v1/ {
    proxy_pass http://127.0.0.1:54321;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /storage/v1/ {
    proxy_pass http://127.0.0.1:54321;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /functions/v1/ {
    proxy_pass http://127.0.0.1:54321;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /realtime/v1/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://127.0.0.1:54321;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 3600;
  }
}
```

### Frontend Environment (Build-time)
File: `/opt/careboks/.env.production`

```env
VITE_SUPABASE_URL=https://careboks.eu
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from supabase status>
VITE_SUPABASE_PROJECT_ID=careboks-main
```

### Edge Functions Environment (Runtime)
File: `/opt/careboks/.env` (used by `npx supabase functions serve`)

```env
APP_ORIGIN=https://careboks.eu
MY_IBM_KEY=<your IBM Watson API key>
WATSONX_PROJECT_ID=<your WatsonX project ID>
```

---

## 🚀 Post-Cutover Notes

1. **DNS A record** should point to `89.167.108.70`

2. **HTTPS certificate (issued):**
   ```bash
  sudo certbot --nginx -d careboks.eu -d www.careboks.eu
   sudo systemctl status certbot.timer
   ```

3. **Keep all references aligned to HTTPS domain:**
  - `.env.production` uses `VITE_SUPABASE_URL=https://careboks.eu`
  - `.env` uses `APP_ORIGIN=https://careboks.eu`
  - `supabase/config.toml` uses `site_url=https://careboks.eu` and matching redirect URLs

4. **Rebuild & restart:**
   ```bash
   cd /opt/careboks
   npm run build
   sudo rsync -a dist/ /var/www/careboks/
   npx supabase functions serve --env-file ./.env
   sudo systemctl reload nginx
   ```

---

## 🛠️ Common Operations

**Stop Supabase:**
```bash
cd /opt/careboks
npx supabase stop
docker stop $(docker ps -q)
```

**Start Supabase:**
```bash
cd /opt/careboks
npx supabase start
npx supabase functions serve --env-file ./.env &
```

## ▶ Server Steps to Run Careboks

Use this sequence whenever you want to bring the full stack up on the server.

1) Go to project directory
```bash
cd /opt/careboks
```

2) Pull latest code
```bash
git pull --ff-only
```

3) Install/update dependencies
```bash
npm ci
```

4) Start local Supabase
```bash
npx supabase start
```

5) Start edge functions with env (APP_ORIGIN + IBM secrets)
```bash
pkill -f "supabase functions serve" || true
nohup npx supabase functions serve --env-file ./.env > /var/log/supabase-functions.log 2>&1 &
```

6) Build frontend
```bash
npm run build
```

7) Publish frontend static files
```bash
sudo rsync -a --delete dist/ /var/www/careboks/
```

8) Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

9) Quick health checks
```bash
curl -I http://127.0.0.1/
curl -I http://127.0.0.1/auth/v1/health
curl -I http://127.0.0.1/assets/
tail -n 50 /var/log/supabase-functions.log
```

10) Open in browser
- App: `https://careboks.eu/`
- Studio: `https://careboks.eu/studio/`

**Restart Nginx:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

**View Nginx logs:**
```bash
sudo tail -50 /var/log/nginx/error.log
sudo tail -50 /var/log/nginx/access.log
```

**Check Supabase status:**
```bash
cd /opt/careboks
npx supabase status
docker ps --filter label=com.docker.compose.project=supabase
```

---

## ✅ Current Validation Status

- [x] Frontend loads at `https://careboks.eu/`
- [x] SPA routes functional (`/`) with fallback
- [x] Studio accessible at `https://careboks.eu/studio/` → `/project/default`
- [x] Nginx proxying all Supabase API paths correctly
- [x] Edge functions running with CORS allowlist enforcement
- [x] User login/signup working
- [x] OCR and AI generation working
- [x] PDF extraction working (worker + MIME configuration fixed)
- [x] Copy patient link working in Print Preview (HTTP fallback implemented)
- [x] Print Preview and final print formatting aligned (markdown normalization + print typography)

---

## 📁 Important Paths

| Component | Path |
|-----------|------|
| App code | `/opt/careboks/` |
| Frontend static build | `/var/www/careboks/` |
| Nginx config | `/etc/nginx/sites-available/careboks` |
| Nginx enabled | `/etc/nginx/sites-enabled/careboks` |
| Frontend env (build) | `/opt/careboks/.env.production` |
| Functions env (runtime) | `/opt/careboks/.env` |
| Supabase config | `/opt/careboks/supabase/config.toml` |
| Migrations | `/opt/careboks/supabase/migrations/` |
| Edge functions | `/opt/careboks/supabase/functions/` |

---

## 🔧 Troubleshooting

**Studio returns 404:**
- Verify Nginx config includes `/studio/` and `/project/` locations
- Check: `sudo nginx -t && sudo systemctl reload nginx`
- Confirm Docker containers running: `docker ps | grep studio`

**CORS errors on function calls:**
- Verify `APP_ORIGIN=https://careboks.eu` in `/opt/careboks/.env`
- Restart functions: `npx supabase functions serve --env-file ./.env`
- Check browser console for exact error

**Frontend loads but can't reach Supabase:**
- Verify env build time vars are set in `.env.production`
- Rebuild: `npm run build && sudo rsync -a dist/ /var/www/careboks/`
- Check: `curl -I http://127.0.0.1/auth/v1/health` from VM

**PDF extraction fails with "fake worker" error:**
- Verify `.mjs` MIME header:
  - `curl -I https://careboks.eu/assets/<pdf-worker-file>.mjs`
  - Must return `Content-Type: application/javascript`
- Ensure Nginx has the `location ~* \.mjs$` block and reload Nginx

**Copy Link button does not copy on HTTP/IP setup:**
- This is expected on some browsers when Clipboard API is restricted
- Current app includes fallback copy logic and also displays the patient link in Print Preview for manual copy/open

**Auth workflow fails:**
- Update `supabase/config.toml` → `site_url` and `additional_redirect_urls`
- Ensure they match your actual origin (currently `https://careboks.eu`)
- Restart Supabase: `npx supabase stop && npx supabase start`
