export interface Env {
  DB: D1Database;
  MONTH_RANK_MODE: 'best_day' | 'best5_sum';
  DAILY_ROUND_SECONDS: string;
  DAILY_MODES: string;
  ADMIN_TOKEN?: string;
  DAILY_SEED_SECRET?: string;
}

export function roundSeconds(env: Env): number {
  const n = Number(env.DAILY_ROUND_SECONDS);
  return Number.isFinite(n) && n >= 0 ? n : 120;
}
