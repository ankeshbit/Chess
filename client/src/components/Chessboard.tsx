import React, { useState, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { PieceColor, PieceType } from '../types/chess';
import { ChessPiece } from './ChessPiece';
import { getLegalMovesForSquare } from '../utils/chessUtils';

interface ChessboardProps {
  fen: string;
  playerColor: PieceColor | 'spectator';
  orientation: PieceColor;
  turn: PieceColor;
  isCheck: boolean;
  lastMove: { from: string; to: string } | null;
  interactive: boolean;
  isOffline?: boolean;
  onMove: (from: string, to: string, promotion?: PieceType) => void;
  onIllegalMoveAttempt?: () => void;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  fen,
  playerColor,
  orientation,
  turn,
  isCheck,
  lastMove,
  interactive,
  isOffline = false,
  onMove,
  onIllegalMoveAttempt,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  // Parse FEN into board grid using chess.js
  const chess = useMemo(() => new Chess(fen), [fen]);
  const board = useMemo(() => chess.board(), [chess]);

  // Find king in check
  const checkedKingSquare = useMemo<Square | null>(() => {
    if (!isCheck) return null;
    const currentTurn = chess.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === currentTurn) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
          return `${files[c]}${ranks[r]}` as Square;
        }
      }
    }
    return null;
  }, [isCheck, chess, board]);

  // Legal moves for currently selected square
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getLegalMovesForSquare(fen, selectedSquare);
  }, [fen, selectedSquare]);

  const legalTargetSquares = useMemo(() => {
    const map = new Map<string, { isCapture: boolean; isPromotion: boolean }>();
    legalMoves.forEach((m) => {
      map.set(m.to, {
        isCapture: !!m.captured,
        isPromotion: !!m.promotion,
      });
    });
    return map;
  }, [legalMoves]);

  // Determine ranks and files order based on orientation
  const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  // In offline mode, the active mover is whichever player's turn it is
  const activeMoverColor = isOffline ? turn : playerColor;
  const isMyTurn = interactive && (isOffline ? true : (playerColor === 'spectator' ? false : playerColor === turn));

  // Check if a move is a pawn promotion
  const checkIsPawnPromotion = (from: Square, to: Square): boolean => {
    const piece = chess.get(from);
    if (!piece || piece.type !== 'p') return false;
    const toRank = to[1];
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1');
  };

  const handleSquareClick = (square: Square) => {
    if (!interactive || !isMyTurn) return;

    // If already selected, check if clicking a legal move destination
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      if (legalTargetSquares.has(square)) {
        if (checkIsPawnPromotion(selectedSquare, square)) {
          setPendingPromotion({ from: selectedSquare, to: square });
        } else {
          onMove(selectedSquare, square);
          setSelectedSquare(null);
        }
        return;
      }

      // If clicking another piece of our color, select that instead
      const piece = chess.get(square);
      if (piece && piece.color === activeMoverColor) {
        setSelectedSquare(square);
        return;
      }

      // Invalid click
      setSelectedSquare(null);
      if (onIllegalMoveAttempt) onIllegalMoveAttempt();
      return;
    }

    // No square selected: select if piece belongs to current player
    const piece = chess.get(square);
    if (piece && piece.color === activeMoverColor) {
      setSelectedSquare(square);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (!interactive || !isMyTurn) {
      e.preventDefault();
      return;
    }
    const piece = chess.get(square);
    if (!piece || piece.color !== activeMoverColor) {
      e.preventDefault();
      return;
    }

    setDraggedSquare(square);
    setSelectedSquare(square);
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, toSquare: Square) => {
    e.preventDefault();
    const fromSquare = (e.dataTransfer.getData('text/plain') || draggedSquare) as Square;
    setDraggedSquare(null);

    if (!fromSquare || fromSquare === toSquare) return;

    const moves = getLegalMovesForSquare(fen, fromSquare);
    const isLegal = moves.some((m) => m.to === toSquare);

    if (isLegal) {
      if (checkIsPawnPromotion(fromSquare, toSquare)) {
        setPendingPromotion({ from: fromSquare, to: toSquare });
      } else {
        onMove(fromSquare, toSquare);
        setSelectedSquare(null);
      }
    } else {
      if (onIllegalMoveAttempt) onIllegalMoveAttempt();
      setSelectedSquare(null);
    }
  };

  const handleConfirmPromotion = (pieceType: PieceType) => {
    if (pendingPromotion) {
      onMove(pendingPromotion.from, pendingPromotion.to, pieceType);
      setPendingPromotion(null);
      setSelectedSquare(null);
    }
  };

  return (
    <div className="relative select-none flex flex-col items-center justify-center">
      {/* Promotion Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center rounded-xl animate-fade-in p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl shadow-2xl max-w-xs w-full text-center">
            <h4 className="text-lg font-bold text-zinc-100 mb-1">Promote Pawn</h4>
            <p className="text-xs text-zinc-400 mb-4">Select your promotion piece</p>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as PieceType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handleConfirmPromotion(p)}
                  className="group relative p-2 bg-zinc-800 hover:bg-amber-600/30 border border-zinc-700 hover:border-amber-500 rounded-xl transition-all duration-150 transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12">
                    <ChessPiece type={p} color={activeMoverColor === 'b' ? 'b' : 'w'} />
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-300 mt-1">
                    {p === 'q' ? 'Queen' : p === 'r' ? 'Rook' : p === 'b' ? 'Bishop' : 'Knight'}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingPromotion(null)}
              className="mt-4 text-xs text-zinc-400 hover:text-zinc-200 transition underline underline-offset-4"
            >
              Cancel move
            </button>
          </div>
        </div>
      )}

      {/* Board Outer Container */}
      <div className="relative p-2 md:p-3 rounded-2xl bg-zinc-900/90 shadow-2xl border border-zinc-800">
        <div
          className="grid grid-cols-8 grid-rows-8 w-[min(88vw,480px)] h-[min(88vw,480px)] sm:w-[500px] sm:h-[500px] md:w-[560px] md:h-[560px] lg:w-[600px] lg:h-[600px] rounded-lg overflow-hidden shadow-inner border border-amber-950/40"
          style={{ aspectRatio: '1 / 1' }}
        >
          {ranks.map((rank, rankIdx) =>
            files.map((file, fileIdx) => {
              const square = `${file}${rank}` as Square;
              const isLight = (fileIdx + rankIdx) % 2 === 0;

              // Piece on this square
              const piece = chess.get(square);

              // Highlights
              const isSelected = selectedSquare === square;
              const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
              const isCheckedKing = checkedKingSquare === square;
              const legalTarget = legalTargetSquares.get(square);

              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, square)}
                  className={`relative flex items-center justify-center chess-square transition-colors duration-100 ${
                    isLight ? 'board-light' : 'board-dark'
                  } ${
                    isLastMoveSquare ? (isLight ? 'square-last-move-light' : 'square-last-move-dark') : ''
                  } ${isSelected ? 'square-selected' : ''} ${isCheckedKing ? 'square-check' : ''}`}
                >
                  {/* Coordinate labels on outer edge */}
                  {fileIdx === 0 && (
                    <span
                      className={`absolute top-0.5 left-1 text-[10px] md:text-xs font-bold leading-none pointer-events-none ${
                        isLight ? 'text-[#90673d]' : 'text-[#eedca5]'
                      }`}
                    >
                      {rank}
                    </span>
                  )}
                  {rankIdx === 7 && (
                    <span
                      className={`absolute bottom-0.5 right-1 text-[10px] md:text-xs font-bold leading-none pointer-events-none ${
                        isLight ? 'text-[#90673d]' : 'text-[#eedca5]'
                      }`}
                    >
                      {file}
                    </span>
                  )}

                  {/* Piece */}
                  {piece && (
                    <div
                      draggable={interactive && isMyTurn && piece.color === activeMoverColor}
                      onDragStart={(e) => handleDragStart(e, square)}
                      className={`w-[84%] h-[84%] transition-transform duration-100 ${
                        interactive && isMyTurn && piece.color === activeMoverColor
                          ? 'cursor-grab active:cursor-grabbing hover:scale-105'
                          : 'cursor-default'
                      } ${draggedSquare === square ? 'opacity-40' : 'opacity-100'}`}
                    >
                      <ChessPiece type={piece.type} color={piece.color} />
                    </div>
                  )}

                  {/* Legal move indicator (Empty square = dot, Enemy piece = capture ring) */}
                  {legalTarget && !piece && (
                    <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-black/25 rounded-full pointer-events-none transition-transform duration-150 animate-scale-in" />
                  )}

                  {legalTarget && piece && (
                    <div className="absolute inset-0 rounded-none border-[4px] md:border-[5px] border-black/30 pointer-events-none" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
