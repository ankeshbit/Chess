export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type TimeControlId = 'unlimited' | '3m' | '5m' | '10m' | '15m10s';

export interface TimeControlConfig {
  id: TimeControlId;
  name: string;
  category: 'Bullet' | 'Blitz' | 'Rapid' | 'Classic';
  initialSeconds: number;
  incrementSeconds: number;
}

export const TIME_CONTROLS: Record<TimeControlId, TimeControlConfig> = {
  'unlimited': {
    id: 'unlimited',
    name: 'Unlimited',
    category: 'Classic',
    initialSeconds: 0,
    incrementSeconds: 0,
  },
  '3m': {
    id: '3m',
    name: '3 min (Blitz)',
    category: 'Blitz',
    initialSeconds: 180,
    incrementSeconds: 0,
  },
  '5m': {
    id: '5m',
    name: '5 min (Blitz)',
    category: 'Blitz',
    initialSeconds: 300,
    incrementSeconds: 0,
  },
  '10m': {
    id: '10m',
    name: '10 min (Rapid)',
    category: 'Rapid',
    initialSeconds: 600,
    incrementSeconds: 0,
  },
  '15m10s': {
    id: '15m10s',
    name: '15 min + 10s (Rapid)',
    category: 'Rapid',
    initialSeconds: 900,
    incrementSeconds: 10,
  },
};

export type GameStatus =
  | 'waiting'
  | 'active'
  | 'checkmate'
  | 'stalemate'
  | 'draw_agreed'
  | 'draw_repetition'
  | 'draw_50move'
  | 'draw_insufficient'
  | 'resigned'
  | 'timeout'
  | 'abandoned';

export interface MoveHistoryItem {
  san: string;
  from: string;
  to: string;
  color: PieceColor;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  fen: string;
  clockRemainingWhite?: number;
  clockRemainingBlack?: number;
}

export interface Player {
  id: string; // persistent client-generated or server-assigned UUID
  socketId: string;
  username: string;
  color: 'w' | 'b' | 'spectator';
  connected: boolean;
  disconnectedAt?: number;
}

export interface Room {
  id: string; // 6-character code
  white: Player | null;
  black: Player | null;
  spectators: Player[];
  fen: string;
  pgn: string;
  turn: PieceColor;
  isCheck: boolean;
  history: MoveHistoryItem[];
  status: GameStatus;
  winner: 'w' | 'b' | 'draw' | null;
  winnerReason: string | null;
  timeControl: TimeControlConfig;
  clocks: {
    w: number; // remaining in ms
    b: number; // remaining in ms
  };
  lastMoveTimestamp: number | null;
  lastMove: { from: string; to: string } | null;
  drawOfferFrom: PieceColor | null;
  rematchOfferFrom: PieceColor | null;
  createdAt: number;
  isPublic: boolean;
  timerInterval?: NodeJS.Timeout;
}

export interface GameRecord {
  id: string;
  roomId: string;
  date: string;
  whiteName: string;
  blackName: string;
  winner: 'w' | 'b' | 'draw';
  reason: string;
  movesCount: number;
  timeControlName: string;
  pgn: string;
  fen: string;
}
