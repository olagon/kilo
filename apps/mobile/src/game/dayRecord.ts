import type { DayRecord, IslandId } from '@huli/shared';
import { load, save } from '../storage';

/** Partial results for today, kept so a killed app still has every round for stats. */
export interface PartialDay {
  date: string;
  rounds: Record<number, { points: number; distanceM: number; island: IslandId }>;
}

export const loadPartial = (date: string) => load<PartialDay>(`day.${date}`, { date, rounds: {} });
export const savePartial = (p: PartialDay) => save(`day.${p.date}`, p);

export function toDayRecord(p: PartialDay, total: number): DayRecord {
  return { date: p.date, total, rounds: [1, 2, 3, 4, 5].map((i) => p.rounds[i] ?? { points: 0, distanceM: 0, island: 'oahu' }) };
}
