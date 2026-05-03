export interface GameType {
  id: number;
  name: string;
  highest_wins: number; // 1 = highest, 0 = lowest
  allow_negative: number;
  allow_decimal: number;
  created_at: string;
}

export interface Player {
  id: number;
  name: string;
  color_index: number;
  last_played_at: string | null;
  play_count: number;
  created_at: string;
}

export interface Session {
  id: number;
  game_type_id: number | null;
  game_name: string;
  label: string | null;
  status: 'active' | 'complete';
  highest_wins: number;
  started_at: string;
  ended_at: string | null;
}

export interface SessionPlayer {
  id: number;
  session_id: number;
  player_id: number;
  player_name: string;
  color_index: number;
  position: number;
}

export interface Score {
  id: number;
  session_id: number;
  player_id: number;
  round_number: number;
  value: number | null;
  is_skipped: number; // 0 | 1
  created_at: string;
}

// Derived types for UI use
export interface SessionSummary extends Session {
  players: Array<{ name: string; color_index: number }>;
  leader_name: string | null;
  leader_score: number | null;
  round_count: number;
}
