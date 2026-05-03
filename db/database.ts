import { SQLiteDatabase } from 'expo-sqlite';
import { GameType, Player, Score, Session, SessionPlayer, SessionSummary } from './types';

// ── INIT ──────────────────────────────────────────────────

export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS game_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      highest_wins INTEGER DEFAULT 1,
      allow_negative INTEGER DEFAULT 1,
      allow_decimal INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color_index INTEGER DEFAULT 1,
      last_played_at TEXT,
      play_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_type_id INTEGER REFERENCES game_types(id),
      game_name TEXT NOT NULL,
      label TEXT,
      status TEXT DEFAULT 'active',
      highest_wins INTEGER DEFAULT 1,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS session_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER REFERENCES players(id),
      player_name TEXT NOT NULL,
      color_index INTEGER DEFAULT 1,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER REFERENCES players(id),
      round_number INTEGER NOT NULL,
      value REAL,
      is_skipped INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(session_id, player_id, round_number)
    );
  `);

  await db.execAsync(`
    INSERT OR IGNORE INTO game_types (name, highest_wins) VALUES
      ('Rummy', 1),
      ('Phase 10', 1),
      ('Skull King', 1),
      ('Golf', 0),
      ('Bridge', 1),
      ('Catan', 1),
      ('Scrabble', 1),
      ('Uno', 0);
  `);
}

// ── GAME TYPES ─────────────────────────────────────────────

export function getGameTypes(db: SQLiteDatabase): Promise<GameType[]> {
  return db.getAllAsync<GameType>('SELECT * FROM game_types ORDER BY name');
}

export async function addGameType(
  db: SQLiteDatabase,
  name: string,
  highestWins: boolean
): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO game_types (name, highest_wins) VALUES (?, ?)',
    [name, highestWins ? 1 : 0]
  );
  return r.lastInsertRowId;
}

// ── PLAYERS ────────────────────────────────────────────────

export function getPlayers(db: SQLiteDatabase): Promise<Player[]> {
  return db.getAllAsync<Player>(
    `SELECT * FROM players ORDER BY
      CASE WHEN last_played_at IS NULL THEN 1 ELSE 0 END,
      last_played_at DESC,
      name`
  );
}

export async function addPlayer(
  db: SQLiteDatabase,
  name: string,
  colorIndex: number
): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO players (name, color_index) VALUES (?, ?)',
    [name, colorIndex]
  );
  return r.lastInsertRowId;
}

// ── SESSIONS ───────────────────────────────────────────────

export async function getSessions(db: SQLiteDatabase): Promise<SessionSummary[]> {
  const sessions = await db.getAllAsync<Session>(
    'SELECT * FROM sessions ORDER BY started_at DESC'
  );

  const summaries: SessionSummary[] = [];

  for (const s of sessions) {
    const players = await db.getAllAsync<{ name: string; color_index: number }>(
      'SELECT player_name as name, color_index FROM session_players WHERE session_id = ? ORDER BY position',
      [s.id]
    );

    const scores = await db.getAllAsync<{ player_id: number; value: number | null; is_skipped: number; round_number: number }>(
      'SELECT player_id, value, is_skipped, round_number FROM scores WHERE session_id = ?',
      [s.id]
    );

    const totals = new Map<number, number>();
    for (const sc of scores) {
      if (!sc.is_skipped && sc.value !== null) {
        totals.set(sc.player_id, (totals.get(sc.player_id) ?? 0) + sc.value);
      }
    }

    const sessionPlayers = await db.getAllAsync<SessionPlayer>(
      'SELECT * FROM session_players WHERE session_id = ? ORDER BY position',
      [s.id]
    );

    let leaderId: number | null = null;
    let leaderScore: number | null = null;
    let leaderName: string | null = null;

    if (totals.size > 0) {
      for (const [pid, total] of totals) {
        if (
          leaderScore === null ||
          (s.highest_wins ? total > leaderScore : total < leaderScore)
        ) {
          leaderId = pid;
          leaderScore = total;
        }
      }
      const lp = sessionPlayers.find(p => p.player_id === leaderId);
      leaderName = lp?.player_name ?? null;
    }

    const maxRound = scores.length > 0 ? Math.max(...scores.map(sc => sc.round_number)) : 0;

    summaries.push({
      ...s,
      players,
      leader_name: leaderName,
      leader_score: leaderScore,
      round_count: maxRound,
    });
  }

  return summaries;
}

export async function createSession(
  db: SQLiteDatabase,
  gameTypeId: number | null,
  gameName: string,
  highestWins: boolean,
  players: Array<{ id: number; name: string; color_index: number }>
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO sessions (game_type_id, game_name, highest_wins) VALUES (?, ?, ?)',
    [gameTypeId, gameName, highestWins ? 1 : 0]
  );
  const sessionId = result.lastInsertRowId;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    await db.runAsync(
      'INSERT INTO session_players (session_id, player_id, player_name, color_index, position) VALUES (?, ?, ?, ?, ?)',
      [sessionId, p.id, p.name, p.color_index, i]
    );
    await db.runAsync(
      `UPDATE players SET
        last_played_at = datetime('now'),
        play_count = play_count + 1
       WHERE id = ?`,
      [p.id]
    );
  }

  return sessionId;
}

export async function getSessionDetail(db: SQLiteDatabase, sessionId: number) {
  const session = await db.getFirstAsync<Session>(
    'SELECT * FROM sessions WHERE id = ?',
    [sessionId]
  );
  const players = await db.getAllAsync<SessionPlayer>(
    'SELECT * FROM session_players WHERE session_id = ? ORDER BY position',
    [sessionId]
  );
  const scores = await db.getAllAsync<Score>(
    'SELECT * FROM scores WHERE session_id = ? ORDER BY round_number, player_id',
    [sessionId]
  );
  return { session, players, scores };
}

export async function upsertScore(
  db: SQLiteDatabase,
  sessionId: number,
  playerId: number,
  roundNumber: number,
  value: number | null,
  isSkipped: boolean
) {
  await db.runAsync(
    `INSERT INTO scores (session_id, player_id, round_number, value, is_skipped)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(session_id, player_id, round_number) DO UPDATE SET
       value = excluded.value,
       is_skipped = excluded.is_skipped`,
    [sessionId, playerId, roundNumber, value, isSkipped ? 1 : 0]
  );
}

export async function endSession(db: SQLiteDatabase, sessionId: number) {
  await db.runAsync(
    `UPDATE sessions SET status = 'complete', ended_at = datetime('now') WHERE id = ?`,
    [sessionId]
  );
}

export async function deleteSession(db: SQLiteDatabase, sessionId: number) {
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
}
