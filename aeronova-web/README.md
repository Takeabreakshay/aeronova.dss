# Aero Nova Web (React + shadcn/ui rebuild)

Parallel React frontend to the Streamlit DSS. Same engine, same AI layer,
different shell.

```
aeronova-web/
  backend/    FastAPI wrapping ../aeronova-dss/engine + ai
  frontend/   Vite + React + Tailwind + shadcn/ui primitives
```

## Why two apps?

The Streamlit app in `../aeronova-dss/` is the demo build. This React version
is the polished product shell, sharing the engine code by import.

## Run it

Open two terminals from this directory.

**Backend** (imports `../aeronova-dss/engine` directly):

```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api/*` to the FastAPI on `:8000`
(configured in `vite.config.ts`).

## Design system

| Piece | Origin |
|---|---|
| Fonts | Geist + Geist Mono via Google Fonts |
| Components | Radix UI primitives wrapped in shadcn/ui-style Tailwind classes |
| Icons | lucide-react |
| Motion | Emil Kowalski's rules — every transition ≤ 300ms, animates only `transform`/`opacity`, ease-out on entry, `scale(0.97)` press feedback, respects `prefers-reduced-motion` |
| Palette | HSL tokens in `src/index.css` — violet primary, cyan/mint/amber/coral/pink accents on midnight background |
| Charts | Recharts (works with the same JSON shape the engine returns) |

## File map

```
backend/
  api.py                 8 endpoints wrapping the engine

frontend/
  index.html             Loads Geist from Google Fonts
  vite.config.ts         Proxies /api → :8000
  tailwind.config.js     HSL token bindings + Geist family
  src/
    index.css            :root tokens, aurora ground, scrollbars, reduced-motion
    main.tsx             ReactDOM.createRoot
    App.tsx              Shell: TopNav + Sidebar + Tabs (5)
    lib/
      utils.ts           cn(), formatRs(), pct()
      api.ts             Typed fetch client for every backend endpoint
    components/
      ui/                shadcn primitives: button, card, tabs, badge, input, slider
      TopNav.tsx         Product name + live status pills
      Sidebar.tsx        Strategy, demand sliders, fuel/LF, reserve
      DeployTab.tsx      KPI cards + route cards + cost strip
      RiskTab.tsx        Histogram + KPIs + route vulnerability
      RecoverTab.tsx     Kill-a-tail signature demo
      AnalysisTab.tsx    Strategy compare (CRN), reserve break-even, β sweep
      AskTab.tsx         Chat panel with the AI layer
```

## What still needs polish

Honest checklist before this is demo-ready:

- **Deps not yet installed.** Run `npm install` once — pulls Radix, Tailwind,
  Recharts, lucide.
- **Sidebar debounce.** Every slider change triggers `POST /api/optimize`.
  Wrap the setter in a 200 ms debounce, or move to React Query's stale-time.
- **Loading skeletons.** The tab bodies flash briefly while the first
  optimize resolves — add a skeleton per KPI card.
- **Recover-tab schedule freshness.** After the sidebar changes, the recover
  panel uses the last resolved schedule; that's usually right, but flag
  when the schedule is stale.
- **Chat scroll into view.** Auto-scroll to the newest assistant message.
- **AI layer key.** Backend picks up `NVIDIA_API_KEY` from the shell env or
  `~/.streamlit/secrets.toml` (through the shared `ai/` module). Set it
  in the shell you launch `uvicorn` from.

## Comparison to the Streamlit build

| | Streamlit (`aeronova-dss/`) | React (`aeronova-web/`) |
|---|---|---|
| First-paint feel | Dashboard | Product |
| CSS surface area | Injected via `st.html` | Tailwind + tokenized primitives |
| State model | `st.session_state` | React hooks (upgrade to React Query when needed) |
| Server | Streamlit runtime | FastAPI (same engine) |
| Offline chat fallback | Yes (template narrator) | Yes (same, via the shared `ai/` module) |
| Deployment | `streamlit run app.py` | `npm run build` → static + uvicorn |

Use whichever fits the moment: Streamlit for tomorrow's demo, React for the
portfolio / next term.
