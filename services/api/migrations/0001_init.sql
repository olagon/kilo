CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  hidden INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE locations (
  id INTEGER PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('sky','ground')),
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  island TEXT NOT NULL,
  place_name TEXT NOT NULL,
  near TEXT,
  zoom REAL, pitch REAL, bearing REAL,
  image_id TEXT,
  credit TEXT,
  fun_fact TEXT,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'candidate',
  last_used TEXT,
  notes TEXT
);
CREATE INDEX locations_pick ON locations (status, mode, last_used);

CREATE TABLE daily (
  date TEXT NOT NULL,
  round INTEGER NOT NULL,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  PRIMARY KEY (date, round)
);

CREATE TABLE plays (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  round INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  guessed_at INTEGER,
  guess_lat REAL, guess_lon REAL,
  distance_m INTEGER,
  points INTEGER,
  PRIMARY KEY (player_id, date, round)
);

CREATE TABLE day_totals (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  total INTEGER NOT NULL,
  total_ms INTEGER NOT NULL,
  finished_at INTEGER NOT NULL,
  flagged INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, date)
);
CREATE INDEX day_rank ON day_totals (date, total DESC, total_ms ASC);
CREATE INDEX month_rank ON day_totals (month, total DESC);

CREATE TABLE reports (
  reporter_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (reporter_id, player_id)
);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
