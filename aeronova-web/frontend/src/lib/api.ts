// In dev, Vite proxies /api → :8000 (see vite.config.ts).
// In prod, set VITE_API_URL to the deployed backend origin (e.g. https://aeronova-api.onrender.com).
const BASE = (import.meta.env.VITE_API_URL ?? "") + "/api";

async function post<T>(path: string, body: any): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

export type Params = Record<string, any>;

export interface Solution {
  x: Record<string, number>;
  carried: Record<string, number>;
  operate: Record<string, number>;
  profit: number;
  kpis: { spill_pct: number; load_factor: number; utilization: number; coverage: number };
  status: string;
  facts: Record<string, any>;
}

export interface RiskResult {
  mean_profit: number;
  p5: number;
  p10: number;
  worst: number;
  cvar5: number;
  cancel_rate: number;
  avg_spill_pct: number;
  avg_load_factor: number;
  avg_utilization: number;
  avg_coverage: number;
  disruption_loss: number;
  profit_distribution: number[];
  facts: Record<string, any>;
}

export interface RecoveryResult {
  revised_x: Record<string, number>;
  cancelled: [string, string][];
  protected_routes: string[];
  reserve_deployed: boolean;
  reserve_type: string | null;
  loss_without_reserve: number;
  loss_with_reserve: number;
  net_benefit: number;
  facts: Record<string, any>;
}

export const api = {
  health: () => get<{ status: string; guardrail: string }>("/health"),
  defaults: () => get<Params>("/defaults"),
  optimize: (params: Params) => post<Solution>("/optimize", { params }),
  simulate: (params: Params, schedule: Record<string, number>, trials = 2000) =>
    post<RiskResult>("/simulate", { params, schedule, trials }),
  recover: (params: Params, schedule: Record<string, number>, failed_tail: string) =>
    post<RecoveryResult>("/recover", { params, schedule, failed_tail }),
  breakeven: (params: Params) => post<any>("/breakeven", { params }),
  betaSweep: (params: Params) => post<any>("/beta_sweep", { params }),
  strategyCompare: (params: Params) => post<any>("/strategy_compare", { params }),
  chat: (params: Params, text: string) => post<any>("/chat", { params, text }),
};
