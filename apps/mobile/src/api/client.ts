import type { DailyInfo, DayBoard, GuessResult, MonthBoard, PlayerSession, RoundView } from '@huli/shared';
import { API_BASE } from './base';

export class ApiError extends Error {
  constructor(public status: number, public code: string, public body?: unknown) {
    super(code);
  }
}

let token: string | null = null;
export function setToken(t: string | null) {
  token = t;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(method: string, path: string, body?: unknown, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/v1${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = res.status === 204 ? null : await res.json().catch(() => null);
      if (res.ok) return json as T;
      const code = (json as { error?: string } | null)?.error ?? `http_${res.status}`;
      if (res.status >= 500 && attempt < tries - 1) throw new ApiError(res.status, code, json);
      throw new ApiError(res.status, code, json);
    } catch (e) {
      lastErr = e;
      const retryable = !(e instanceof ApiError) || e.status >= 500;
      if (!retryable || attempt === tries - 1) break;
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastErr;
}

export const api = {
  createPlayer: (name: string) => request<PlayerSession>('POST', '/players', { name }),
  renamePlayer: (name: string) => request<{ name: string }>('PATCH', '/players/me', { name }),
  deletePlayer: () => request<unknown>('DELETE', '/players/me'),
  daily: () => request<DailyInfo>('GET', '/daily'),
  startRound: (i: number) => request<{ view: RoundView; startedAt: number; serverNow: number }>('POST', `/daily/rounds/${i}/start`),
  guess: async (i: number, body: { lat: number; lon: number } | { timeout: true }): Promise<GuessResult> => {
    try {
      return await request<GuessResult>('POST', `/daily/rounds/${i}/guess`, body);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'already_guessed') {
        const r = (e.body as { result?: GuessResult } | null)?.result;
        if (r) return r;
      }
      throw e;
    }
  },
  dayBoard: (date: string) => request<DayBoard>('GET', `/leaderboard/day?date=${date}`),
  monthBoard: (month: string) => request<MonthBoard>('GET', `/leaderboard/month?month=${month}`),
  report: (playerId: string) => request<unknown>('POST', `/players/${playerId}/report`),
};
