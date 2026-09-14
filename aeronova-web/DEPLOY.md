# Deploying Aero Nova DSS

The app is two services:

| Piece | Where it goes | Why |
|---|---|---|
| **Frontend** (Vite + React) | **Vercel** | Static build, edge CDN, one-click deploy |
| **Backend** (FastAPI + PuLP + CBC solver) | **Render** (or Fly.io / Railway) | CBC solver is a compiled binary; Vercel's Python serverless runtime can't host it reliably. A real container fixes that. |

## Backend on Render (recommended — free tier available)

### Step 1 — push the repo to GitHub

Push the whole `aeronova-web/` directory. The backend deploy watches `aeronova-web/backend/`.

### Step 2 — create the service on Render

1. https://dashboard.render.com → **New +** → **Web Service**
2. Connect the GitHub repo
3. Root directory: `aeronova-web/backend`
4. Environment: **Docker** (Render will detect the `Dockerfile`)
5. Plan: Free (spins down after 15 min of no traffic; first request wakes it in ~30 s)
6. Region: pick the one closest to your users

### Step 3 — environment variables

In the Render dashboard for this service, add:

| Key | Value | Notes |
|---|---|---|
| `NVIDIA_API_KEY` | `nvapi-…` | Your Nemotron key. Without it the AI layer falls back to the template narrator (engine still runs) |
| `CORS_ORIGINS` | `https://aeronova.vercel.app` | Your Vercel URL — include after Vercel deploy |

The `Dockerfile` already installs `coinor-cbc` via apt, so PuLP finds the solver immediately.

### Step 4 — verify

Once deployed, hit `https://<your-service>.onrender.com/api/health` — should return:

```json
{"status":"ok","guardrail":"RULE: reference ONLY numbers present in the facts object..."}
```

Also `https://<your-service>.onrender.com/docs` for the FastAPI Swagger UI.

## Frontend on Vercel

### Step 1 — import the repo

1. https://vercel.com/new → import the GitHub repo
2. **Root directory:** `aeronova-web/frontend`
3. Framework preset should auto-detect **Vite** (verify)
4. Build command: `npm run build` (default)
5. Output directory: `dist` (default)

### Step 2 — environment variable

Add one env var in the Vercel dashboard:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://<your-render-service>.onrender.com` |

**No trailing slash** — the frontend appends `/api` internally.

### Step 3 — deploy

Click Deploy. First build takes ~90 s. Vercel gives you a URL like `https://aeronova.vercel.app`.

### Step 4 — wire CORS

Copy the Vercel URL back to Render → your service → Environment → `CORS_ORIGINS`. Render will redeploy the backend and CORS will accept the frontend.

The backend also allows any `*.vercel.app` origin via regex, so Vercel preview URLs (per-branch, per-PR) work out of the box.

## Local dev after these changes

Nothing changes for local development.

```bash
# Terminal 1 — backend
cd aeronova-web/backend
pip install -r requirements.txt
NVIDIA_API_KEY='nvapi-...' python -m uvicorn api:app --reload --port 8000

# Terminal 2 — frontend
cd aeronova-web/frontend
npm install
npm run dev
```

Vite proxies `/api/*` to `:8000` in dev (see `vite.config.ts`). No need to set `VITE_API_URL` locally — it defaults to empty and the proxy handles routing.

## Alternative backend hosts

Anywhere that runs a container works. The `Dockerfile` is portable.

| Host | How to deploy |
|---|---|
| **Fly.io** | `cd backend && fly launch` (accept defaults, add `NVIDIA_API_KEY` via `fly secrets set`) |
| **Railway** | Import repo, set root to `aeronova-web/backend`, Railway detects Dockerfile |
| **Google Cloud Run** | `gcloud run deploy aeronova-api --source .` from `backend/` |
| **AWS App Runner** | Point at the repo + Dockerfile |
| **Your own server** | `docker build -t aeronova-api . && docker run -p 8000:8000 -e NVIDIA_API_KEY=... aeronova-api` |

## What you can NOT easily do

**Deploy both to Vercel.** Vercel's Python runtime is serverless and doesn't ship `coinor-cbc`. You'd have to bundle a static CBC binary as a Vercel function asset, which is fragile and slow to cold-start. If you insist on all-Vercel, better to swap PuLP+CBC for a pure-Python solver like `mip` — but the model's tiny (18 int vars), so switching solver isn't worth the risk of numerical differences before the demo.

**Free-tier caveats.**
- Render free web services spin down after 15 min idle → first request after quiet wakes them (30-45 s cold start). Fine for demos, annoying for a live product.
- Vercel free is generous but has function-execution limits — not a concern for us since we don't use Vercel functions (backend lives on Render).

## Checklist before you demo

- [ ] Backend deployed, `/api/health` returns 200
- [ ] Frontend deployed, opens without console errors
- [ ] `VITE_API_URL` points at the Render backend
- [ ] `CORS_ORIGINS` on Render includes the Vercel URL
- [ ] `NVIDIA_API_KEY` set on Render (otherwise the Ask AI tab uses the template narrator — still works, just less good)
- [ ] Warm the Render service 2 min before the demo (visit any URL) so it's not cold
