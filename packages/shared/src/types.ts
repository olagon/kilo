import type { IslandId } from './islands';

export type ViewMode = 'sky' | 'ground';

export interface SkyView {
  mode: 'sky';
  lat: number;
  lon: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface GroundView {
  mode: 'ground';
  imageId: string;
}

export type RoundView = SkyView | GroundView;

export interface Answer {
  lat: number;
  lon: number;
  placeName: string;
  /** Nearest town or village, for "Near Waimānalo, Oʻahu". */
  near?: string | null;
  island: IslandId;
  funFact?: string | null;
  credit?: string | null;
}

/** A spot as stored in the pool, the practice pack, and D1. */
export interface Spot {
  id: number;
  mode: ViewMode;
  lat: number;
  lon: number;
  island: IslandId;
  placeName: string;
  near?: string | null;
  zoom?: number | null;
  pitch?: number | null;
  bearing?: number | null;
  imageId?: string | null;
  credit?: string | null;
  funFact?: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** approved: eligible for the daily. practice: bundled in the app only. */
  status?: 'approved' | 'practice' | 'candidate' | 'rejected' | 'retired';
}

export interface PlayerSession {
  playerId: string;
  token: string;
  name: string;
}

export interface RoundProgress {
  index: number;
  mode: ViewMode;
  startedAt?: number | null;
  points?: number | null;
  distanceM?: number | null;
}

export interface DailyInfo {
  date: string;
  timerSeconds: number;
  rounds: RoundProgress[];
  /** Server time in epoch ms so the app can correct its clock. */
  serverNow: number;
  finished: boolean;
  total?: number | null;
}

export interface GuessResult {
  points: number;
  distanceM: number;
  answer: Answer;
  guess?: { lat: number; lon: number } | null;
  dayTotal: number;
  finished: boolean;
}

export interface BoardRow {
  rank: number;
  playerId: string;
  name: string;
  total: number;
  totalMs: number;
  isMe?: boolean;
}

export interface DayBoard {
  date: string;
  rows: BoardRow[];
  me: BoardRow | null;
  players: number;
}

export interface MonthBoard {
  month: string;
  mode: 'best_day' | 'best5_sum';
  rows: BoardRow[];
  me: BoardRow | null;
  players: number;
}

export interface DayRecord {
  date: string;
  total: number;
  rounds: { points: number; distanceM: number; island: IslandId }[];
}
