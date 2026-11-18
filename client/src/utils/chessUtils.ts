import { Chess, Square } from 'chess.js';
import { MoveHistoryItem, PieceColor, PieceType } from '../types/chess';

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export interface CapturedSummary {
  whiteCaptured: PieceType[]; // pieces captured by white (black pieces lost)
  blackCaptured: PieceType[]; // pieces captured by black (white pieces lost)
  whiteMaterialAdvantage: number; // positive if white has more material
  blackMaterialAdvantage: number; // positive if black has more material
}

export function computeCapturedPieces(history: MoveHistoryItem[]): CapturedSummary {
  const whiteCaptured: PieceType[] = [];
  const blackCaptured: PieceType[] = [];

  for (const item of history) {
    if (item.captured) {
      if (item.color === 'w') {
        whiteCaptured.push(item.captured);
      } else {
        blackCaptured.push(item.captured);
      }
    }
  }

  // Sort pieces by standard order: Q, R, B, N, P
  const sortOrder: Record<PieceType, number> = { q: 1, r: 2, b: 3, n: 4, p: 5, k: 6 };
  whiteCaptured.sort((a, b) => sortOrder[a] - sortOrder[b]);
  blackCaptured.sort((a, b) => sortOrder[a] - sortOrder[b]);

  let whitePoints = 0;
  for (const p of whiteCaptured) whitePoints += PIECE_VALUES[p];

  let blackPoints = 0;
  for (const p of blackCaptured) blackPoints += PIECE_VALUES[p];

  const diff = whitePoints - blackPoints;

  return {
    whiteCaptured,
    blackCaptured,
    whiteMaterialAdvantage: diff > 0 ? diff : 0,
    blackMaterialAdvantage: diff < 0 ? -diff : 0,
  };
}

export function formatTimeRemaining(ms: number, isUnlimited: boolean = false): string {
  if (isUnlimited) return '∞';
  if (ms <= 0) return '00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (totalSeconds < 20) {
    // Show tenths of a second when critical
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getLegalMovesForSquare(fen: string, square: Square) {
  try {
    const chess = new Chess(fen);
    return chess.moves({ square, verbose: true });
  } catch (err) {
    return [];
  }
}
