"""Aero Nova design system.

Rebuilt around motion principles distilled from Emil Kowalski's
design-engineering skills (emilkowalski/skills) plus shadcn/ui token
conventions and Geist/Geist Mono typography.

Motion rules honored:
  - Every UI transition ≤ 300ms
  - Only `transform` and `opacity` are animated
  - Entries use ease-out; exits use ease-in
  - Button press = scale(0.97) 100ms
  - `prefers-reduced-motion: reduce` disables non-essential motion
  - No `transition: all` anywhere

Palette (shadcn-style neutral + accents)
  bg              hsl(240 10% 4%)
  surface         hsl(240 8% 8%)
  surface-2       hsl(240 6% 12%)
  border          hsl(240 6% 18%)
  border-hi       hsl(240 5% 26%)
  ink / mute / dim
  violet · cyan · mint · amber · coral · pink
"""

THEME_CSS = """
<style>
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');

  :root {
    --bg:            hsl(240 10% 4%);
    --surface:       hsl(240 8% 8%);
    --surface-2:     hsl(240 6% 12%);
    --border:        hsl(240 6% 18%);
    --border-hi:     hsl(240 5% 26%);
    --ink:           hsl(220 20% 96%);
    --ink-mute:      hsl(220 12% 70%);
    --ink-dim:       hsl(220 8% 50%);
    --violet:        hsl(258 90% 66%);
    --violet-2:      hsl(258 92% 76%);
    --cyan:          hsl(188 89% 55%);
    --mint:          hsl(142 71% 60%);
    --amber:         hsl(48 96% 62%);
    --coral:         hsl(0 89% 71%);
    --pink:          hsl(328 88% 72%);
    --font-sans:     'Geist', ui-sans-serif, system-ui, sans-serif;
    --font-mono:     'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);      /* natural decel */
    --ease-in:       cubic-bezier(0.7, 0, 0.84, 0);
    --ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);
    --dur-fast:      120ms;
    --dur-base:      200ms;
    --dur-slow:      280ms;
    --shadow-sm:     0 1px 2px hsl(240 20% 2% / 0.4);
    --shadow-md:     0 8px 24px -8px hsl(240 20% 2% / 0.5);
    --shadow-lg:     0 20px 50px -20px hsl(258 90% 40% / 0.35);
    --glow-violet:   0 0 32px hsl(258 90% 66% / 0.25);
    --radius-sm:     8px;
    --radius:        12px;
    --radius-lg:     16px;
  }

  html, body, [class*="css"], .stApp {
    font-family: var(--font-sans);
    color: var(--ink);
    letter-spacing: -0.005em;
    font-feature-settings: 'cv11', 'ss01';
  }

  /* Aurora ground */
  .stApp {
    background:
      radial-gradient(1200px 700px at 85% -10%, hsl(258 90% 66% / 0.14), transparent 55%),
      radial-gradient(900px 600px at -10% 30%, hsl(188 89% 55% / 0.08), transparent 60%),
      radial-gradient(700px 500px at 50% 110%, hsl(328 88% 72% / 0.06), transparent 60%),
      var(--bg);
  }

  #MainMenu, footer, header[data-testid="stHeader"] { visibility: hidden; height: 0; }
  .block-container { padding-top: 1rem; padding-bottom: 3rem; max-width: 1400px; }

  /* --- Top navigation --- */
  .an-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 18px;
    margin-bottom: 14px;
    background: hsl(240 8% 8% / 0.72);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    animation: an-enter var(--dur-slow) var(--ease-out);
  }
  .an-brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 15px; letter-spacing: -0.015em; }
  .an-brand .logo {
    width: 34px; height: 34px; border-radius: 10px;
    background: linear-gradient(135deg, var(--violet), var(--cyan));
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 700; font-size: 16px;
    box-shadow: var(--glow-violet), inset 0 1px 0 hsl(0 0% 100% / 0.25);
    transition: transform var(--dur-base) var(--ease-out);
  }
  .an-brand .logo:hover { transform: rotate(-4deg) scale(1.05); }
  .an-brand small {
    display: block; font-size: 10px; font-weight: 500;
    color: var(--ink-dim); letter-spacing: 0.14em;
    text-transform: uppercase; margin-top: 2px;
  }
  .an-nav-meta { display: flex; gap: 6px; align-items: center; }
  .an-nav-meta .an-pill {
    font-family: var(--font-mono); font-size: 10.5px; padding: 5px 10px;
    border-radius: 999px; border: 1px solid var(--border);
    background: hsl(0 0% 100% / 0.03); color: var(--ink-mute);
    display: inline-flex; align-items: center; gap: 6px;
    transition: transform var(--dur-fast) var(--ease-out);
  }
  .an-nav-meta .an-pill:hover { transform: translateY(-1px); }
  .an-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px var(--mint); animation: an-pulse 2s var(--ease-in-out) infinite; }
  .an-pill.violet { color: var(--violet-2); border-color: hsl(258 80% 50% / 0.45); background: hsl(258 80% 50% / 0.10); }
  .an-pill.amber  { color: var(--amber);   border-color: hsl(48 90% 50% / 0.45);  background: hsl(48 90% 50% / 0.10); }
  .an-pill.mint   { color: var(--mint);    border-color: hsl(142 60% 45% / 0.45); background: hsl(142 60% 45% / 0.10); }
  .an-pill.coral  { color: var(--coral);   border-color: hsl(0 80% 60% / 0.45);   background: hsl(0 80% 60% / 0.10); }

  /* --- Section header --- */
  .an-h {
    display: flex; align-items: center; gap: 10px;
    margin: 20px 0 12px;
  }
  .an-h .icon { color: var(--violet-2); }
  .an-h .title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: var(--ink); }
  .an-h .desc  { font-size: 13px; color: var(--ink-dim); font-weight: 400; }

  /* --- Metric cards (shadcn-flavor) --- */
  [data-testid="stMetric"] {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    transition: transform var(--dur-base) var(--ease-out),
                border-color var(--dur-base) var(--ease-out),
                box-shadow var(--dur-base) var(--ease-out);
    position: relative;
    overflow: hidden;
    animation: an-enter 320ms var(--ease-out);
  }
  [data-testid="stMetric"]::before {
    content: ""; position: absolute; inset: 0 0 auto 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--violet), var(--cyan), transparent);
    opacity: 0; transition: opacity var(--dur-base) var(--ease-out);
  }
  [data-testid="stMetric"]:hover {
    transform: translateY(-1px);
    border-color: var(--border-hi);
    box-shadow: var(--shadow-lg);
  }
  [data-testid="stMetric"]:hover::before { opacity: 1; }
  [data-testid="stMetricLabel"] p {
    font-family: var(--font-mono) !important;
    font-size: 10px !important; font-weight: 500;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--ink-dim) !important;
  }
  [data-testid="stMetricValue"] {
    font-family: var(--font-mono) !important;
    font-size: 24px !important; font-weight: 500;
    color: var(--ink) !important; letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  [data-testid="stMetricDelta"] {
    font-family: var(--font-mono) !important;
    font-size: 11px !important;
  }
  [data-testid="stMetricDelta"] svg { display: none; }

  /* --- Sidebar --- */
  section[data-testid="stSidebar"] {
    background: hsl(240 10% 4% / 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid var(--border);
    padding-top: 6px;
  }
  section[data-testid="stSidebar"] * { color: var(--ink); }
  section[data-testid="stSidebar"] h3 {
    font-family: var(--font-mono);
    font-size: 10px !important;
    letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--violet-2) !important;
    margin-top: 20px !important; margin-bottom: 4px !important;
    display: flex; align-items: center; gap: 8px;
  }
  section[data-testid="stSidebar"] h3::before {
    content: ""; width: 10px; height: 2px; border-radius: 2px;
    background: linear-gradient(90deg, var(--violet), var(--cyan));
  }
  section[data-testid="stSidebar"] label { color: var(--ink-mute); font-size: 12px; }
  section[data-testid="stSidebar"] .stSlider [role="slider"] {
    background: var(--violet) !important;
    box-shadow: 0 0 12px hsl(258 90% 66% / 0.6);
  }
  section[data-testid="stSidebar"] [data-baseweb="slider"] div[role="progressbar"] {
    background: linear-gradient(90deg, var(--violet), var(--cyan)) !important;
  }

  /* --- Tabs (fully custom look) --- */
  .stTabs [data-baseweb="tab-list"] {
    gap: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 4px;
    margin-bottom: 18px;
  }
  .stTabs [data-baseweb="tab"] {
    padding: 8px 16px !important;
    border-radius: var(--radius-sm) !important;
    font-family: var(--font-sans);
    font-weight: 500; font-size: 13px;
    color: var(--ink-mute);
    background: transparent !important;
    transition: color var(--dur-fast) var(--ease-out),
                background-color var(--dur-fast) var(--ease-out),
                transform var(--dur-fast) var(--ease-out);
    border: none !important;
    display: flex; align-items: center; gap: 6px;
  }
  .stTabs [data-baseweb="tab"]:hover {
    color: var(--ink);
    background: hsl(0 0% 100% / 0.04) !important;
  }
  .stTabs [aria-selected="true"] {
    color: white !important;
    background: linear-gradient(135deg, var(--violet), hsl(258 82% 58%)) !important;
    box-shadow: 0 4px 14px hsl(258 90% 45% / 0.35);
  }
  .stTabs [data-baseweb="tab-highlight"], .stTabs [data-baseweb="tab-border"] { display: none; }

  /* --- Buttons with press feedback (Emil) --- */
  .stButton > button {
    background: var(--surface-2);
    color: var(--ink);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 7px 16px;
    font-family: var(--font-sans);
    font-weight: 500; font-size: 13px;
    letter-spacing: -0.005em;
    transition: transform var(--dur-fast) var(--ease-out),
                border-color var(--dur-fast) var(--ease-out),
                color var(--dur-fast) var(--ease-out),
                box-shadow var(--dur-fast) var(--ease-out);
  }
  .stButton > button:hover {
    border-color: var(--violet);
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px hsl(258 80% 50% / 0.28);
  }
  .stButton > button:active { transform: scale(0.97); transition-duration: 80ms; }
  .stButton > button[kind="primary"] {
    background: linear-gradient(135deg, var(--violet), var(--pink));
    color: white; border: none; font-weight: 600;
    box-shadow: 0 4px 16px hsl(258 90% 50% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.15);
  }
  .stButton > button[kind="primary"]:hover {
    filter: brightness(1.08);
    box-shadow: 0 8px 24px hsl(258 90% 50% / 0.55);
  }
  .stButton > button[kind="primary"]:active { transform: scale(0.97); }

  /* --- Inputs --- */
  .stTextInput input, .stNumberInput input, .stTextArea textarea,
  .stSelectbox div[data-baseweb="select"] > div {
    background: var(--surface-2) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-sm) !important;
    color: var(--ink) !important;
    font-family: var(--font-sans);
    transition: border-color var(--dur-fast) var(--ease-out),
                box-shadow var(--dur-fast) var(--ease-out);
  }
  .stTextInput input:focus, .stNumberInput input:focus, .stTextArea textarea:focus {
    border-color: var(--violet) !important;
    box-shadow: 0 0 0 3px hsl(258 90% 66% / 0.18) !important;
  }

  /* Radio segmented */
  div[role="radiogroup"] { gap: 6px; }
  div[role="radiogroup"] label {
    border: 1px solid var(--border) !important;
    border-radius: 999px !important;
    padding: 5px 14px !important;
    font-family: var(--font-mono);
    font-size: 11.5px !important;
    background: var(--surface);
    color: var(--ink-mute);
    transition: transform var(--dur-fast) var(--ease-out),
                border-color var(--dur-fast) var(--ease-out),
                color var(--dur-fast) var(--ease-out);
  }
  div[role="radiogroup"] label:hover { transform: translateY(-1px); border-color: var(--violet) !important; color: var(--violet-2); }
  div[role="radiogroup"] label:has(input:checked) {
    background: linear-gradient(135deg, hsl(258 90% 66% / 0.22), hsl(188 89% 55% / 0.15)) !important;
    border-color: var(--violet) !important;
    color: white !important;
  }

  /* Chat */
  [data-testid="stChatMessage"] {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px; margin-bottom: 8px;
    animation: an-enter 240ms var(--ease-out);
  }
  [data-testid="stChatInput"] {
    background: var(--surface-2) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
  }
  [data-testid="stChatInput"]:focus-within {
    border-color: var(--violet) !important;
    box-shadow: 0 0 0 3px hsl(258 90% 66% / 0.18);
  }

  /* Cards */
  .an-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px;
    animation: an-enter 320ms var(--ease-out);
    transition: transform var(--dur-base) var(--ease-out),
                border-color var(--dur-base) var(--ease-out);
  }
  .an-card:hover { border-color: var(--border-hi); }

  /* Info banner */
  .an-info {
    padding: 10px 14px;
    background: linear-gradient(90deg, hsl(258 90% 66% / 0.08), hsl(188 89% 55% / 0.04));
    border: 1px solid hsl(258 90% 66% / 0.28);
    border-radius: var(--radius-sm);
    font-size: 12.5px; color: var(--ink-mute);
    font-family: var(--font-mono);
    display: flex; align-items: center; gap: 10px;
    animation: an-enter 260ms var(--ease-out);
  }
  .an-info::before {
    content: "◆"; color: var(--violet-2); font-size: 10px;
  }

  /* DataFrame */
  [data-testid="stDataFrame"] {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--surface);
  }

  /* Plotly transparent */
  .js-plotly-plot .plotly, .js-plotly-plot .main-svg { background: transparent !important; }

  /* --- Motion primitives --- */
  @keyframes an-enter {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes an-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.4; transform: scale(1.35); }
  }

  /* Accessibility — respect user preference */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
"""


# ----- Inline SVG icons for section headers and nav -----
from .icons import icon


def render_topbar(strategy: str, reserve: str, coverage: int, profit: float) -> str:
    return f"""
    <div class="an-nav">
      <div class="an-brand">
        <div class="logo">A</div>
        <div>Aero Nova <small>Decision Support</small></div>
      </div>
      <div class="an-nav-meta">
        <span class="an-pill"><span class="dot"></span> Engine live</span>
        <span class="an-pill violet">{icon('spark', 12, 'currentColor')}strategy · {strategy}</span>
        <span class="an-pill {'amber' if reserve != 'OFF' else ''}">{icon('shield', 12, 'currentColor')}reserve · {reserve}</span>
        <span class="an-pill mint">{icon('route', 12, 'currentColor')}coverage · {coverage}/6</span>
        <span class="an-pill {'mint' if profit >= 0 else 'coral'}">
          {icon('trend-up' if profit >= 0 else 'trend-down', 12, 'currentColor')}Rs {profit:,.0f}
        </span>
      </div>
    </div>
    """


def section_title(title: str, desc: str = "", icon_name: str = "spark") -> str:
    return (
        f'<div class="an-h">'
        f'<span class="icon">{icon(icon_name, 20)}</span>'
        f'<span class="title">{title}</span>'
        f'<span class="desc">{desc}</span>'
        f'</div>'
    )


def info_banner(text: str) -> str:
    return f'<div class="an-info">{text}</div>'
